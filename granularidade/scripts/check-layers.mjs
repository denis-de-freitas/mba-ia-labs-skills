#!/usr/bin/env node
// @ts-check
/**
 * check-layers — Gate de arquitetura em camadas.
 *
 * Resolve a camada de cada arquivo pelo path (routes/services/domain/
 * repository/adapter/shared), resolve os imports (relativos e aliases) e barra
 * as fronteiras proibidas. Princípio único: **as dependências apontam pra
 * dentro**. Uma camada de fora pode depender de uma de dentro; nunca o inverso,
 * e nunca atravessando uma camada que deveria encapsular a de baixo.
 *
 * Uso:
 *   node scripts/check-layers.mjs                # varre src/**\/*.ts
 *   node scripts/check-layers.mjs src/a.ts ...   # checa arquivos específicos
 *
 * Saída em violação: bloco por violação no stderr + `exit 2`. Cada bloco traz a
 * regra, arquivo:linha, o import ofensor, POR QUE viola e como CONSERTAR — feito
 * pra um agente se auto-corrigir delegando à sub-skill da camada ofensora.
 *
 * O núcleo (layerOfPath/classifyImport/evaluateImport) é exportado e reusado
 * pela regra ESLint local em `eslint.config.mjs`.
 */

import { readdirSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ════════════════════════════════════════════════════════════════════════════
// CONFIG — as fronteiras vivem aqui dentro (fonte da verdade).
// ════════════════════════════════════════════════════════════════════════════

/** Pasta dentro de `src/` → nome canônico da camada. */
const DIR_TO_LAYER = {
  routes: 'routes',
  services: 'services',
  domain: 'domain',
  repositories: 'repository',
  repository: 'repository',
  adapters: 'adapter',
  adapter: 'adapter',
  shared: 'shared',
  middleware: 'middleware',
};

/** Prefixo de alias (`@domain/...`) → camada. Espelha DIR_TO_LAYER. */
const ALIAS_TO_LAYER = {
  routes: 'routes',
  services: 'services',
  domain: 'domain',
  repositories: 'repository',
  repository: 'repository',
  adapters: 'adapter',
  adapter: 'adapter',
  shared: 'shared',
  middleware: 'middleware',
};

/** Arquivos soltos em `src/` que são composition root — isentos de checagem. */
const COMPOSITION_ROOT_FILES = new Set(['main.ts', 'server.ts']);

/** Camadas com fronteira de import de verdade (as únicas que enforçamos). */
const REAL_LAYERS = new Set([
  'routes',
  'services',
  'domain',
  'repository',
  'adapter',
  'shared',
]);

/**
 * Matriz inward: para cada camada, quais camadas ela PODE importar (a própria
 * sempre incluída). Qualquer alvo fora da lista é violação.
 *
 *   routes ─▶ services ─▶ domain         (rota nunca toca domain nem repository)
 *   repository/adapter ─▶ domain/shared  (infra aponta pra dentro)
 *   domain                               (núcleo: não importa nada pra fora)
 *   shared                               (folha: não importa nenhuma camada)
 */
const ALLOWED_INTERNAL = {
  routes: ['routes', 'services', 'shared'],
  services: ['services', 'domain', 'shared', 'adapter'],
  domain: ['domain'],
  repository: ['repository', 'domain', 'shared', 'adapter'],
  adapter: ['adapter', 'shared'],
  shared: ['shared'],
};

/**
 * Dependências externas (node_modules) que o DOMÍNIO pode importar. zod faz
 * parte do domínio (validação interna). Builtins `node:*` (ex.: `node:crypto`
 * pra UUID) são primitivas da plataforma e ficam liberadas — qualquer outra lib
 * externa no domínio é violação.
 */
const DOMAIN_EXTERNAL_ALLOW = new Set(['zod']);
const DOMAIN_ALLOWS_NODE_BUILTINS = true;

/** Camada ofensora → sub-skill que deve consertar (pra auto-correção). */
const SUBSKILL = {
  routes: 'implement-route',
  services: 'implement-service',
  domain: 'implement-domain',
  repository: 'implement-repository',
  adapter: 'implement-adapter',
  shared: '(camada manual — sem sub-skill dedicada)',
};

const PRINCIPLE =
  'Princípio: as dependências apontam pra dentro (routes → services → domain). ' +
  'Infra (repository/adapter) aponta pra dentro também; domínio e shared não apontam pra fora.';

// ════════════════════════════════════════════════════════════════════════════
// NÚCLEO — resolução de camada e classificação de import (puro, reusável).
// ════════════════════════════════════════════════════════════════════════════

/**
 * Resolve a camada de um path absoluto pelo primeiro segmento depois de `src/`.
 * @param {string} absPath
 * @returns {string|null} camada canônica, 'composition-root', ou null (fora de src)
 */
export function layerOfPath(absPath) {
  const segments = absPath.split(path.sep);
  const srcIdx = segments.lastIndexOf('src');
  if (srcIdx === -1 || srcIdx === segments.length - 1) return null;
  const next = segments[srcIdx + 1];
  if (COMPOSITION_ROOT_FILES.has(next)) return 'composition-root';
  return DIR_TO_LAYER[next] ?? null;
}

/**
 * Classifica um import: interno (resolve a camada-alvo) ou externo (lib).
 * @param {string} spec  o specifier do import ('../x', '@domain/y', 'zod')
 * @param {string} fromAbsFile  arquivo que faz o import
 * @returns {{kind:'internal', layer:string|null, resolved:string}
 *          | {kind:'external', pkg:string, isNodeBuiltin:boolean}}
 */
export function classifyImport(spec, fromAbsFile) {
  // Relativo → resolve textualmente contra a pasta do arquivo.
  if (spec.startsWith('.')) {
    const resolved = path.resolve(path.dirname(fromAbsFile), spec);
    return { kind: 'internal', layer: layerOfPath(resolved), resolved };
  }

  // Alias de projeto (`@domain/...`) vs pacote escopado npm (`@hono/...`).
  if (spec.startsWith('@')) {
    const aliasRoot = spec.slice(1).split('/')[0];
    if (aliasRoot in ALIAS_TO_LAYER) {
      return { kind: 'internal', layer: ALIAS_TO_LAYER[aliasRoot], resolved: spec };
    }
  }

  // Externo: builtin do node, ou pacote (escopado ou não).
  const isNodeBuiltin = spec.startsWith('node:');
  const pkg = spec.startsWith('@')
    ? spec.split('/').slice(0, 2).join('/')
    : isNodeBuiltin
      ? spec
      : spec.split('/')[0];
  return { kind: 'external', pkg, isNodeBuiltin };
}

/**
 * Avalia UM import e devolve a violação (ou null se está ok). Puro — é o ponto
 * único de decisão, reusado pelo CLI e pela regra ESLint.
 * @param {string} absFile
 * @param {string} spec
 * @returns {{ruleId:string, rule:string, why:string, fix:string,
 *           source:string, target:string, subskill:string} | null}
 */
export function evaluateImport(absFile, spec) {
  const source = layerOfPath(absFile);
  // Só enforçamos arquivos que estão numa camada real (middleware,
  // composition-root e fora-de-src são isentos como origem).
  if (!source || !REAL_LAYERS.has(source)) return null;

  const imp = classifyImport(spec, absFile);

  if (imp.kind === 'internal') {
    const target = imp.layer;
    // Alvo desconhecido, composition-root ou middleware → fora de escopo.
    if (!target || !REAL_LAYERS.has(target)) return null;
    if (ALLOWED_INTERNAL[source].includes(target)) return null;
    return describeInternal(source, target);
  }

  // Externo: só o domínio é restrito (não importa nada pra fora além de zod).
  if (source === 'domain') {
    if (imp.isNodeBuiltin && DOMAIN_ALLOWS_NODE_BUILTINS) return null;
    if (DOMAIN_EXTERNAL_ALLOW.has(imp.pkg)) return null;
    return describeDomainOutward(imp.pkg);
  }
  return null;
}

/**
 * @param {string} source @param {string} target
 */
function describeInternal(source, target) {
  const subskill = SUBSKILL[source];

  // Regras-título com mensagem dedicada.
  if (source === 'routes' && target === 'domain') {
    return {
      ruleId: 'layered/no-route-importing-domain',
      rule: 'Uma rota não pode importar da camada domain (src/domain/**).',
      why:
        'Rotas conversam apenas com services; o domínio é encapsulado pelo ' +
        'service. Importar domain na borda HTTP acopla o núcleo de negócio ao ' +
        'transporte e fura a direção inward (routes deveria parar em services).',
      fix:
        'Remova o import de domain na rota. Chame um service em src/services/** ' +
        'que use o domínio e devolva DTO/Result; mova qualquer regra de negócio ' +
        'pra esse service. A rota só valida input (Zod do DTO) e traduz Result→HTTP.',
      source,
      target,
      subskill,
    };
  }

  if (source === 'routes' && target === 'repository') {
    return {
      ruleId: 'layered/no-route-importing-repository',
      rule: 'Uma rota não pode importar repository (src/repositories/**).',
      why:
        'Persistência é detalhe de infra que o service orquestra. Rota acessando ' +
        'repository pula a camada de aplicação e vaza acesso a dados pra borda HTTP.',
      fix:
        'Remova o import de repository na rota. Exponha a operação como um method ' +
        'de service (src/services/**) que recebe o repository por injeção e chame ' +
        'esse service a partir da rota.',
      source,
      target,
      subskill,
    };
  }

  // Genérica: qualquer outra fronteira inward violada.
  return {
    ruleId: `layered/no-${source}-importing-${target}`,
    rule: `A camada ${source} não pode importar da camada ${target}.`,
    why:
      `O import vai de ${source} para ${target}, contra a direção permitida. ` +
      `${source} só pode depender de [${ALLOWED_INTERNAL[source].join(', ')}]. ` +
      'Essa dependência inverte ou atravessa a hierarquia de camadas.',
    fix:
      `Em vez de ${source} importar ${target} diretamente, inverta a dependência: ` +
      `passe o que precisa via injeção/parâmetro, ou mova o código pra uma camada ` +
      `que ${source} já possa importar ([${ALLOWED_INTERNAL[source].join(', ')}]). ` +
      `Se ${target} precisa acionar ${source}, é a camada de cima que orquestra.`,
    source,
    target,
    subskill,
  };
}

/**
 * @param {string} pkg
 */
function describeDomainOutward(pkg) {
  return {
    ruleId: 'layered/no-domain-importing-outward',
    rule: 'O domínio não importa nada de fora da própria camada (exceto zod).',
    why:
      `O domínio importou a lib externa "${pkg}". O núcleo de negócio precisa ` +
      'ficar isolado de infra/libs pra ser testável e estável; só zod (validação) ' +
      'e primitivas node:* são permitidos.',
    fix:
      `Tire "${pkg}" do domínio. Se é I/O ou integração, embrulhe num adapter ` +
      '(src/adapters/**) ou repository (src/repositories/**) e injete o resultado ' +
      'no domínio via parâmetro. Se é só validação, use zod.',
    source: 'domain',
    target: pkg,
    subskill: SUBSKILL.domain,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// SCANNER + RELATÓRIO (CLI).
// ════════════════════════════════════════════════════════════════════════════

const STATIC_FROM = /\b(?:import|export)\b[\s\S]*?\bfrom\s*['"]([^'"]+)['"]/g;
const SIDE_EFFECT = /\bimport\s*['"]([^'"]+)['"]/g;
const DYNAMIC = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const REQUIRE = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Conta a linha (1-based) de um índice no texto. */
function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

/**
 * Extrai imports do texto com a linha de cada um.
 * @param {string} text
 * @returns {Array<{spec:string, line:number, raw:string}>}
 */
function extractImports(text) {
  const lines = text.split('\n');
  const seen = new Set();
  const out = [];
  for (const re of [STATIC_FROM, SIDE_EFFECT, DYNAMIC, REQUIRE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const spec = m[1];
      const specPos = m.index + m[0].lastIndexOf(spec);
      const line = lineAt(text, specPos);
      const key = `${spec}@${line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ spec, line, raw: (lines[line - 1] ?? '').trim() });
    }
  }
  return out;
}

/** Coleta recursiva de arquivos .ts não-teste sob `dir`. */
function collectTsFiles(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectTsFiles(full, acc);
    } else if (
      name.endsWith('.ts') &&
      !name.endsWith('.d.ts') &&
      !name.endsWith('.test.ts') &&
      !name.endsWith('.spec.ts')
    ) {
      acc.push(full);
    }
  }
  return acc;
}

/** Formata um bloco de violação pro stderr. */
function formatBlock(v, relFile) {
  const bar = '─'.repeat(78);
  return [
    bar,
    `✖  [${v.ruleId}]  fronteira de camada proibida`,
    `   Regra      ${v.rule}`,
    `   Arquivo    ${relFile}:${v.line}`,
    `   Import     ${v.raw}`,
    `   Direção    ${v.source} ─▶ ${v.target}   (deveria apontar pra dentro)`,
    `   Por quê    ${wrap(v.why, '              ')}`,
    `   Conserte   ${wrap(v.fix, '              ')}`,
    `   Sub-skill  ${v.subskill}   (camada ofensora = ${v.source})`,
  ].join('\n');
}

/** Quebra texto longo mantendo indentação de continuação. */
function wrap(text, indent, width = 76) {
  const words = text.split(/\s+/);
  const out = [];
  let line = '';
  for (const w of words) {
    if (line && (line.length + 1 + w.length) > width) {
      out.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) out.push(line);
  return out.join('\n' + indent);
}

function main() {
  const cwd = process.cwd();
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));

  let files;
  if (args.length > 0) {
    files = args.map((a) => path.resolve(cwd, a));
  } else {
    files = collectTsFiles(path.join(cwd, 'src'));
  }

  const violations = [];
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const imp of extractImports(text)) {
      const v = evaluateImport(file, imp.spec);
      if (v) violations.push({ ...v, file, line: imp.line, raw: imp.raw });
    }
  }

  if (violations.length === 0) {
    process.stdout.write(
      `check-layers: OK — ${files.length} arquivo(s) checado(s), nenhuma violação de camada.\n`,
    );
    process.exit(0);
  }

  // Ordena por arquivo/linha pra saída estável.
  violations.sort((a, b) =>
    a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1,
  );

  const blocks = violations.map((v) =>
    formatBlock(v, path.relative(cwd, v.file)),
  );

  process.stderr.write('\n' + PRINCIPLE + '\n\n');
  process.stderr.write(blocks.join('\n') + '\n');
  process.stderr.write('─'.repeat(78) + '\n');
  process.stderr.write(
    `check-layers: ${violations.length} violação(ões) de arquitetura. ` +
      'Conserte cada bloco acima (delegue à sub-skill da camada ofensora) e rode de novo.\n',
  );
  process.exit(2);
}

// Roda como CLI só quando invocado direto (não quando importado pela regra ESLint).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { fileURLToPath as _fileURLToPath };
