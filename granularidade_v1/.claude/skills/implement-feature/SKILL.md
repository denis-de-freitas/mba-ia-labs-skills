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

## Passo 4 — Fechamento

Só dê a feature por pronta quando todas as camadas tocadas passaram, cada
arquivo com seus testes. Reporte, por camada, o que foi gerado e quais portões
exigiram decisão do usuário.
