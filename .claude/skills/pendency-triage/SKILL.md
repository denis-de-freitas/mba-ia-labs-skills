---
name: pendency-triage
description: >
  Use quando o usuário quiser triar, levantar ou organizar os marcadores de
  pendência (TODO/FIXME) de um projeto. Triggers: "triagem de pendências",
  "listar TODOs", "FIXMEs do projeto", "dívida técnica", "o que falta no
  código", "pendências marcadas". Varre o código, classifica cada marcador
  por prioridade e categoria e sugere um próximo passo. Ao final, registra o
  resultado como uma issue no GitHub (cria ou atualiza, de forma idempotente).
  NÃO altera o código do projeto e NÃO revisa correção geral do diff (use
  team-code-review para isso).
allowed-tools: Read, Bash(gh:*), Bash
---

# Pendency Triage

Faz a triagem dos marcadores `TODO` e `FIXME` de um projeto: coleta cada
ocorrência, classifica por prioridade e categoria, e sugere o próximo passo.
Esta skill **não modifica o código do projeto**. O resultado é um relatório
no chat e, ao final, uma issue no GitHub (criada ou atualizada).

## Passo 1 — Coletar as pendências

Rode o script de varredura. Se o usuário indicou um caminho/pasta, passe-o
como argumento; caso contrário, varra o projeto inteiro.

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/scan.sh [caminho]
```

Cada linha da saída vem como `arquivo:linha:texto`. Se o script não
encontrar nenhum marcador, informe isso ao usuário e **pare** — não invente
pendências.

Para entender o contexto de uma pendência ambígua, use `Read` no arquivo em
volta da linha indicada antes de classificá-la.

## Passo 2 — Classificar cada marcador

Leia `references/classification_policy.md` e aplique-a a cada ocorrência.
A política define os três eixos de classificação — **Tipo** (`TODO`/`FIXME`),
**Categoria** e **Prioridade** (🔴 Alta / 🟡 Média / ⚪ Baixa) — com os
critérios para escolher cada um.

Quando o texto do marcador for vago, baseie a classificação no que o código
ao redor realmente faz, não apenas na palavra-chave.

## Passo 3 — Relatório

Apresente um resumo no topo e depois os itens agrupados por prioridade
(🔴 → 🟡 → ⚪). Para cada item: `arquivo:linha`, o tipo, a categoria, a
pendência em uma frase e o próximo passo sugerido.

```
## Triagem de Pendências — <caminho ou projeto>

Total: N (X TODO · Y FIXME) — 🔴 N · 🟡 N · ⚪ N

### 🔴 Alta (N)
- src/report.js:54 — [FIXME · segurança] CSV não escapa vírgulas/aspas,
  pode corromper o arquivo. → Escapar valores e envolver em aspas (RFC 4180).

### 🟡 Média (N)
- src/report.js:32 — [TODO · performance] Carrega tudo em memória ao
  ranquear produtos. → Paginar a consulta na origem dos dados.

### ⚪ Baixa (N)
- src/report.js:58 — [TODO · feature] Exportação só em CSV. → Avaliar
  XLSX/PDF quando houver demanda.

### Recomendação
Aponte por onde começar (os 🔴) e agrupe pendências relacionadas que
valham ser resolvidas juntas.
```

Se não houver pendências, diga isso explicitamente. Nunca encerre sem o
resumo de contagem e, havendo itens, sem a recomendação de por onde começar.

## Passo 4 — Registrar a issue no GitHub

Com o relatório pronto, publique-o como uma issue usando o `gh`. Esta etapa é
**idempotente**: se já existe uma issue para o mesmo escopo, ela é
**atualizada**; caso contrário, é **criada**. Não duplique issues.

Só execute este passo quando houver pendências. Se não houver nenhuma, pule a
publicação e apenas informe o resultado no chat.

### 4.1 — Pré-checagens

Antes de qualquer coisa, garanta que o ambiente está pronto.

Primeiro, a autenticação. Se ela falhar, **não pare a skill**: mostre o
relatório no chat (Passo 3) e avise o usuário que a issue não pôde ser
publicada, explicando o motivo.

```bash
gh auth status        # precisa estar autenticado
```

Em seguida, **garanta que existe um repositório remoto no GitHub**. Esta
checagem é obrigatória — não tente criar a issue sem um remote válido.

```bash
git remote -v                                          # há alguma origem remota?
gh repo view --json nameWithOwner -q .nameWithOwner    # o remote aponta para um repo GitHub?
```

Se **não houver remote** (saída vazia) ou o `gh repo view` falhar com algo
como `no git remotes found`, **não publique às cegas**: use a ferramenta
**`AskUserQuestion`** para perguntar ao usuário como proceder, oferecendo
opções como:

- **Informar a URL/`owner/repo`** de um repositório GitHub já existente →
  configure o remote e siga: `git remote add origin <URL>` (ou
  `git remote set-url origin <URL>` se `origin` já existir).
- **Criar um repositório novo** no GitHub →
  `gh repo create <owner>/<repo> --private --source=. --remote=origin`.
- **Pular a publicação** → apenas o relatório do Passo 3 fica no chat.

Depois de configurar/criar, **revalide** antes de prosseguir:

```bash
gh repo view --json nameWithOwner -q .nameWithOwner    # deve retornar owner/repo
```

Só avance para 4.2 quando este comando retornar um `owner/repo` válido. Se o
usuário optar por pular, encerre o Passo 4 informando que a issue não foi
publicada.

### 4.2 — Procurar uma issue existente (dedup)

A deduplicação usa um **marcador estável** embutido no corpo da issue, não o
título (o título pode variar). Defina o escopo como o caminho varrido no
Passo 1 (ou o nome do repositório, se a varredura foi no projeto inteiro) e
monte o marcador:

```bash
ESCOPO="store-auth/src"                       # caminho varrido ou nome do repo
MARKER="<!-- pendency-triage:${ESCOPO} -->"   # chave de dedup, fica oculta no corpo

# Retorna o número da issue existente (ou vazio, se não houver)
NUM=$(gh issue list --state all --search "${MARKER} in:body" \
  --json number,state --jq '.[0].number // empty')
echo "${NUM}"
```

### 4.3 — Montar o corpo

O corpo é **o mesmo conteúdo do relatório do Passo 3** (resumo, itens por
prioridade e recomendação), com o marcador oculto na primeira linha. Mantenha
os caminhos como `arquivo:linha` para virarem links no GitHub.

```text
<!-- pendency-triage:store-auth/src -->
## Triagem de Pendências — store-auth/src

Total: N (X TODO · Y FIXME) — 🔴 N · 🟡 N · ⚪ N

### 🔴 Alta (N)
- ...

### Recomendação
...
```

### 4.4 — Criar ou atualizar

Passe o corpo via stdin (`--body-file -`) para não gravar arquivos no projeto.
Use o `NUM` obtido em 4.2 para decidir:

```bash
TITLE="Triagem de Pendências — ${ESCOPO}"

if [ -n "${NUM}" ]; then
  # Já existe → atualiza o corpo (e reabre se estiver fechada)
  gh issue edit "${NUM}" --body-file - <<'BODY'
<!-- pendency-triage:store-auth/src -->
...corpo completo...
BODY
  gh issue reopen "${NUM}" 2>/dev/null || true
  gh issue view "${NUM}" --json url --jq .url
else
  # Não existe → cria (a label ajuda a agrupar; crie-a se faltar)
  gh issue create --title "${TITLE}" --label pendency-triage --body-file - <<'BODY'
<!-- pendency-triage:store-auth/src -->
...corpo completo...
BODY
fi
```

Se a label `pendency-triage` não existir no repo, crie-a uma vez com
`gh label create pendency-triage --color BFD4F2 || true` antes do
`issue create`, ou omita o `--label`.

### 4.5 — Confirmar no chat

Ao terminar, informe ao usuário se a issue foi **criada** ou **atualizada** e
mostre a URL retornada pelo `gh`.
