---
name: test-generation
description: >
  Sub-skill de testes, invocada pelo orquestrador implement-feature para reforçar
  ou preencher a cobertura que faltou — cada camada já entrega o teste do seu
  arquivo; esta entra para fechar lacunas. Também serve quando o usuário pede só
  testes de um arquivo/módulo existente. Dispara em "gera testes pra X",
  "completa a cobertura de Y". ANTES de escrever qualquer teste, faz pré-checkout
  e carrega architecture/ARCHITECTURE/convention-test.md como fonte da verdade.
  Entrega testes verdes sem alterar código de produção. NÃO implementa as camadas
  (use implement-domain/adapter/service/repository/route) nem revisa diff pronto.
allowed-tools: Read, Grep, Glob, Write, Edit, Bash, AskUserQuestion
---

# Test Generation

Fecha lacunas de cobertura. Cada sub-skill de camada já entrega o teste do seu
arquivo; esta reforça o que ficou fraco ou descoberto. Uma responsabilidade:
**escrever testes** — nunca alterar o código de produção para "fazer passar".

## Passo 0 — Pré-checkout e carga da convenção (obrigatório, antes de qualquer teste)

Não escreva um teste antes de:

1. **Pré-checkout** — localize `architecture/ARCHITECTURE/` no estado atual do
   repo (`Glob`/`Bash`) e confirme que existe.
2. **Carregar a convenção de testes** — leia
   `architecture/ARCHITECTURE/convention-test.md`. **Fonte da verdade** para
   framework/runner, onde moram os testes, naming, padrão de fake/mock, fixtures
   e meta de cobertura. Se a camada-alvo tiver convenção própria
   (`convention-<camada>.md`), leia-a também para o estilo de teste daquela camada.
3. Se a convenção de testes não existir ou estiver vazia → **PARE** com
   `AskUserQuestion`.

## Passo 1 — A convenção manda

`convention-test.md` decide runner, estrutura (arrange/act/assert, given/when/then),
estilo de dublê e o que conta como cobertura suficiente. Siga-a; onde omissa, use
o idiomático e **registre a suposição**.

## Passo 2 — Mapear a lacuna e gerar

- Rode a suíte/cobertura existente (`Bash`) para ver o que já está coberto e o
  que falta — não duplique o que a camada já entregou.
- Priorize caminhos de erro, bordas e invariantes não exercitados.
- Respeite a fronteira da camada: domínio = unitário puro; service = domínio real
  + portas fakes; adapter/repository = externo/store isolado; route = request→response.
- **Não toque no código de produção.** Se um teste só passa mudando produção,
  isso é um portão de decisão.

## Passo 3 — Verde antes de entregar

- Rode os testes novos (`Bash`); todos verdes.
- Confirme que não houve alteração em arquivos de produção.

## Portões de decisão (PARE e pergunte)

- O comportamento esperado é ambíguo (decisão de produto) e muda o assert.
- Cobrir exige mudar produção (bug aparente ou contrato incompleto).
- A convenção de testes não cobre o caso e há mais de um padrão plausível.

## Retorno ao orquestrador

Reporte: arquivos de teste criados/estendidos, lacunas fechadas, o que ficou
descoberto de propósito (e por quê), e status da suíte.
