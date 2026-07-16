---
name: test-generation
description: >
  Use quando o usuário quiser gerar testes automatizados para código deste
  repositório, no padrão de teste do time (Jest, mock de I/O, nomes em
  "deve..."). Dispara em "gera testes pra esse arquivo", "cobre essa função
  com teste", "faltou teste aqui", "escreve os testes do service". Roda um
  script que lista os exports sem teste e devolve os arquivos de teste
  preenchidos. NÃO use para revisar qualidade/segurança (isso é
  team-code-review), para criar serviço novo, nem para rodar a suíte existente.
allowed-tools: Read, Grep, Bash, Write
---

# Test Generation

Escreve testes no padrão do time para código **já existente**. Uma
responsabilidade só: gerar teste. Revisão é outra skill; scaffold é outra.

## Passo 1 — Achar o que está sem teste

O passo mecânico (descobrir exports sem arquivo de teste correspondente) é
script, não prosa:

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/exports_sem_teste.sh "${1:-./src}"
```

## Passo 2 — Convenção do time (curta, fica no corpo)

- Framework: **Jest**. Um `describe` por função/método.
- Mocka **todo I/O** (rede, fs, banco) com `jest.mock`.
- Nome do teste em português, começando com **"deve"** (`deve retornar 0
  quando o carrinho está vazio`).
- Cobrir **caminho feliz + erros + limites** (vazio, nulo, máximo).

## Passo 3 — Escrever

Para cada export sem teste, crie `<arquivo>.test.js` ao lado do fonte,
seguindo a convenção. Não teste o que você não consegue ver no código — se
faltar informação, deixe um `it.todo('...')` explícito em vez de inventar.
