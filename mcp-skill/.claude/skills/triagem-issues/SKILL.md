---
name: triagem-issues
description: >
  Use quando o usuário pedir uma triagem das issues abertas de um repositório do
  GitHub — priorizar, classificar por tipo, agrupar prováveis duplicatas e
  apontar o que está parado esperando resposta. Dispara em "faz a triagem das
  issues abertas do repo X", "quais issues são P0?", "agrupa as issues
  duplicadas do repo", "o que tá travado esperando resposta?". Busca as issues
  AO VIVO pelo GitHub MCP (nunca inventa número, título ou autor — só usa o que a
  ferramenta retornou), classifica cada uma e entrega um relatório de triagem em
  Markdown. NÃO use para escrever a descrição de um PR, para gerar
  changelog/release notes, para responder ou fechar issues, nem para mexer em
  código — esta skill só LÊ e organiza issues abertas.
allowed-tools: mcp__github__list_issues, mcp__github__get_issue, mcp__github__search_issues
---

# Triagem de Issues

Transforma a lista crua de issues abertas de um repositório em um **relatório de
triagem** acionável e consistente. O dado vem do **GitHub MCP** (servidor
`github`); esta skill é só o **procedimento + o formato**. Se o servidor MCP
`github` não estiver conectado, **pare e avise** — não invente issues.

## Princípio inegociável

Toda issue citada no relatório precisa ter vindo de uma chamada de ferramenta
(`list_issues` / `search_issues` / `get_issue`). **Nunca** cite um `#número`,
título ou autor que você não recebeu da ferramenta. Sem dado da ferramenta, não
há linha no relatório.

## Passo 1 — Buscar as issues abertas (read-only)

Use o GitHub MCP. Peça o `owner` e o `repo` ao usuário se ele não os deu.

- `list_issues` com `state: "open"` para o inventário.
- Se houver muitas, pagine ou use `search_issues` (ex.: `is:open is:issue`).
- Para uma issue que entra no relatório e precisa de corpo/labels, `get_issue`.

Nunca chame ferramenta de escrita — o servidor está em `--read-only`, e a skill
também não deve tentar (criar comentário, label, fechar, etc.).

## Passo 2 — Classificar cada issue

Para cada issue aberta, atribua **prioridade** e **tipo** com base no título, no
corpo e nas labels existentes.

**Prioridade** (use a regra, não o achismo):

| Nível | Critério |
|---|---|
| **P0** | Quebra em produção, perda de dados, falha de segurança, ninguém consegue usar. |
| **P1** | Bug sério com workaround, ou bloqueia muita gente / uma feature prometida. |
| **P2** | Bug de impacto limitado, melhoria pedida por vários. |
| **P3** | Cosmético, "nice to have", dúvida, ideia solta. |

**Tipo**: `bug` · `feature` · `docs` · `question` · `chore`.

**Estado de atenção**: marque `aguardando-resposta` se a última atividade foi do
mantenedor pedindo informação; `sem-label` se não tem nenhuma label; `parada` se
está aberta há muito tempo sem movimento.

## Passo 3 — Detectar prováveis duplicatas

Agrupe issues com título/tema muito próximos. **Sugira** o agrupamento, sempre
como hipótese ("possível duplicata de #N"), nunca como afirmação — quem decide é
o mantenedor.

## Passo 4 — Escrever o relatório

Saída **sempre** neste formato (é o que o eval cobra):

```markdown
## Triagem de issues — {owner}/{repo}

**Issues abertas analisadas:** {n}   ·   gerado a partir do GitHub MCP (read-only)

### Fila por prioridade

| # | Título | Prioridade | Tipo | Atenção |
|---|--------|-----------|------|---------|
| #NN | ... | P0 | bug | aguardando-resposta |
| ... |

### Prováveis duplicatas
- Possível duplicata: #NN e #MM (ambas sobre "...").
- (ou) Nenhuma duplicata aparente.

### Recomendações de próximo passo
- **Atacar primeiro:** #NN (P0) — {motivo de 1 linha}.
- **Precisa de label:** #..., #...
- **Esperando o autor:** #...
```

Regras de saída:

- Comece a tabela pela maior prioridade (P0 no topo).
- Uma linha por issue aberta. Não some, não omita, não invente.
- Se o repo não tem nenhuma issue aberta, diga isso explicitamente e pare.
