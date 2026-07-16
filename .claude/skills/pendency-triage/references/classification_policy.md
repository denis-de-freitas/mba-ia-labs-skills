# Política de Classificação de Pendências

Esta é a política que a skill `pendency-triage` aplica para classificar cada
marcador `TODO`/`FIXME`. Mantida em nível 3 (reference file) para que o corpo
do SKILL.md fique leve — só é carregada quando uma triagem está realmente em
andamento.

Para cada ocorrência, atribua os três eixos abaixo: **Tipo**, **Categoria** e
**Prioridade**.

## Tipo

- `TODO` — trabalho futuro ou melhoria planejada. O código funciona, mas há
  algo a evoluir.
- `FIXME` — algo quebrado, incorreto ou incompleto. Sinaliza um defeito real
  ou uma lacuna que afeta o comportamento atual.

## Categoria

Escolha a que melhor descreve a natureza da pendência:

- `bug` — comportamento incorreto ou defeito observável.
- `segurança` — risco de exposição, injeção, escape ausente, dados sensíveis.
- `correção` — ajuste necessário para deixar algo correto/consistente.
- `performance` — custo de tempo/memória que escala mal com o uso.
- `refactor` — reorganização interna sem mudar comportamento.
- `incompleto` — função/fluxo não terminado (ex.: stub, `not implemented`).
- `dados/mock` — dados fixos, fixtures ou mocks que deveriam ser reais.
- `feature` — funcionalidade nova ou opcional ainda não construída.
- `docs` — documentação, comentários ou exemplos a escrever/atualizar.

## Critério de prioridade

- 🔴 **Alta** — corrige comportamento incorreto, risco de segurança, perda
  ou corrupção de dados, ou bloqueia uma funcionalidade (ex.: função não
  implementada, cálculo errado, CSV/SQL sem escape). Geralmente `FIXME`.
- 🟡 **Média** — melhorias relevantes de robustez ou performance, validações
  ausentes, e pendências que escalam com o uso (ex.: paginação, cache,
  validação de entrada).
- ⚪ **Baixa** — nice-to-have, polimento, formatos extras, docs (ex.:
  "permitir exportar também em PDF").

Quando o texto do marcador for vago, baseie a prioridade no que o código ao
redor realmente faz, não apenas na palavra-chave.
