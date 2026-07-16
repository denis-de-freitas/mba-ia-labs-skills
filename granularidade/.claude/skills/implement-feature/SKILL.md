---
name: implement-feature
description: >
  Use quando o usuário quiser implementar uma feature inteira de ponta a ponta
  neste repositório, atravessando várias camadas. Dispara em "implementa a
  feature de X", "cria o fluxo completo de Y", "monta domínio, service e rota
  pra Z", "implementa essa feature toda". NÃO escreve código direto: orquestra,
  delegando cada camada à sub-skill dela na ordem bottom-up (domain → adapter →
  services → repository → route) e parando em pontos de decisão. NÃO use para
  gerar só testes de um arquivo (test-generation), para fazer scaffold de pasta
  vazia, nem para revisar um diff pronto (team-code-review). Produz a feature
  implementada camada a camada, cada arquivo com seus testes, seguindo as
  references do projeto.
allowed-tools: Read, Grep, Glob, Skill, AskUserQuestion, Bash
---

# Implement Feature

Orquestrador. **Não escreve o código** — decide a ordem, delega cada camada à
sub-skill dela, aplica as references do projeto e para quando uma decisão é do
usuário. Uma responsabilidade só: coordenar o fluxo bottom-up.

## Passo 1 — Mapear a feature em camadas

Antes de delegar nada, descubra quais camadas a feature toca. A ordem de
execução é **bottom-up**, fixa:

```
domain → adapter (se existir) → services → repository → route
```

- `adapter` é **condicional**: só entra se a feature integra serviço/SDK externo.
- Cada camada só começa depois que a anterior terminou e passou (testes verdes).
- Se a feature não tocar uma camada, pule-a — não invente arquivo.

## Passo 2 — Carregar o contrato de cada camada

Para a ordem detalhada, o que cada camada entrega e os portões de decisão, leia
`references/pipeline.md`. Para o mapa de qual sub-skill atende cada camada, leia
`references/camadas.md`.

## Passo 3 — Ciclo por arquivo (planejar → executar)

Para **cada arquivo** de **cada camada**, na ordem do Passo 1:

1. **Invocar a sub-skill** da camada (ver `references/camadas.md`) via Skill.
2. **A sub-skill produz o arquivo + os testes daquele arquivo.** Não avance
   enquanto os testes do arquivo não estiverem verdes.
3. **Aplicar as references disponíveis** em `references/` que valem para a
   camada (convenções, contrato, padrões). Se a reference existir, ela manda.
4. **Portão de decisão** — se um item de decisão falhar (ambiguidade de
   contrato, dependência ausente, escolha de arquitetura, teste que não passa
   sem decisão de produto), **PARE** com `AskUserQuestion` e pergunte ao
   usuário como prosseguir. Não chute o caminho.

## Passo 4 — Todas as camadas verdes

Quando todas as camadas tocadas foram implementadas e cada arquivo está com seus
testes verdes, a feature está **funcionalmente** completa — mas ainda **não está
pronta**. Antes do fechamento, ela precisa passar no gate de arquitetura
(Passo 5). Guarde, por camada, o que foi gerado e quais portões exigiram decisão
do usuário, para reportar no fim.

## Passo 5 — Gate de arquitetura (sempre ao final, com auto-correção)

Rodado **sempre** ao final da pipeline, depois que todas as camadas foram
implementadas e passaram nos testes (Passo 4). O gate valida que as
dependências apontam pra dentro e que nenhuma fronteira de camada foi furada.

Loop de auto-correção:

1. **Rode o gate** via Bash: `npm run check:layers`.
2. **Se `exit 0`** (gate verde): a feature passou na arquitetura — vá ao
   fechamento (passo 6 abaixo).
3. **Se houver erro** (`exit 2`): **leia o stderr**. Cada violação vem num bloco
   com a regra, `arquivo:linha`, o import ofensor, o **porquê** e o **como
   consertar**, além da **sub-skill responsável** (camada ofensora).
4. **Auto-corrija cada violação** delegando à sub-skill correta referente à
   **camada ofensora** indicada no bloco (via `Skill` — ver `references/camadas.md`):
   `routes → implement-route`, `services → implement-service`,
   `domain → implement-domain`, `repository → implement-repository`,
   `adapter → implement-adapter`. Passe à sub-skill o bloco do gate (arquivo,
   import, porquê, como consertar) como contexto. **Não conserte à mão** — o
   orquestrador não escreve código.
5. **Rode o gate de novo** e repita o ciclo a partir do passo 1.
6. **Limite de tentativas**: se o número de iterações do loop passar de **10**
   sem chegar a `exit 0`, **PARE**: informe o usuário do impasse (quais
   violações persistem) e use `AskUserQuestion` para decidir como prosseguir
   (ex.: revisar a fronteira, ajustar a feature, intervir manualmente).

**Fechamento.** A feature só está **pronta com o gate verde** (`npm run
check:layers` em `exit 0`). Só então reporte, por camada, o que foi gerado,
quais portões exigiram decisão do usuário, e confirme o gate de arquitetura
verde. Camadas verdes nos testes mas com o gate vermelho **não** contam como
feature pronta.
