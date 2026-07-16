// Flat config (ESLint 10). Configurado pra hospedar regras customizadas de
// arquitetura via o plugin local `layered`, que reusa o MESMO núcleo do gate
// `scripts/check-layers.mjs` (fonte única da verdade das fronteiras de camada).
import tseslint from 'typescript-eslint';
import { evaluateImport } from './scripts/check-layers.mjs';

/** Regra: barra imports que furam a fronteira de camadas. */
const noForbiddenLayerImport = {
  meta: {
    type: 'problem',
    docs: { description: 'Barra imports que violam a direção das camadas (inward).' },
    schema: [],
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    const check = (node, spec) => {
      if (typeof spec !== 'string') return;
      const v = evaluateImport(filename, spec);
      if (!v) return;
      context.report({
        node,
        message: `[${v.ruleId}] ${v.rule} ${v.why} CONSERTE: ${v.fix} (sub-skill: ${v.subskill})`,
      });
    };
    return {
      ImportDeclaration: (n) => check(n, n.source?.value),
      ExportNamedDeclaration: (n) => n.source && check(n, n.source.value),
      ExportAllDeclaration: (n) => n.source && check(n, n.source.value),
      ImportExpression: (n) => n.source?.type === 'Literal' && check(n, n.source.value),
    };
  },
};

/** Plugin local — adicione novas regras de arquitetura aqui. */
const layered = {
  meta: { name: 'layered', version: '1.0.0' },
  rules: { 'no-forbidden-layer-import': noForbiddenLayerImport },
};

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'scripts/**', 'eslint.config.mjs'] },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/*.d.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { sourceType: 'module', ecmaVersion: 'latest' },
    },
    plugins: { layered },
    rules: {
      'layered/no-forbidden-layer-import': 'error',
    },
  },
);
