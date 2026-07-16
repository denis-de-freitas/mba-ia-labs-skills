---
name: implement-route
description: >
  Sub-skill da camada route, invocada pelo orquestrador implement-feature.
  Implementa o handler de entrada (HTTP/endpoint): valida e desserializa input,
  chama o service e mapeia resultado/erros para a resposta. Dispara em "cria a
  rota/endpoint de X", "expõe a feature Y por HTTP". ANTES de escrever qualquer
  código, faz pré-checkout e carrega architecture/ARCHITECTURE/convention-route.md
  como fonte da verdade. Entrega o handler + testes verdes (request → response).
  NÃO contém regra de negócio (implement-domain), orquestração de caso de uso
  (implement-service), persistência (implement-repository) nem integração externa
  (implement-adapter).
allowed-tools: Read, Grep, Glob, Write, Edit, Bash, AskUserQuestion
---

# Implement Route

Borda de entrada do sistema. Recebe a requisição, valida/desserializa o input,
chama o service e traduz o resultado (ou erro) para a resposta HTTP. Uma
responsabilidade: adaptar o transporte ao caso de uso — **sem regra de negócio**.

## Passo 0 — Pré-checkout e carga da convenção (obrigatório, antes de qualquer código)

Não escreva uma linha antes de:

1. **Pré-checkout** — localize `architecture/ARCHITECTURE/` no estado atual do
   repo (`Glob`/`Bash`) e confirme que existe.
2. **Carregar a convenção da camada** — leia
   `architecture/ARCHITECTURE/convention-route.md`. **Fonte da verdade** para
   framework web, padrão de rota/controller, validação de input, formato de
   resposta de sucesso/erro, status codes, auth e onde mora o handler.
3. Se não existir ou estiver vazio → **PARE** com `AskUserQuestion`.

## Passo 1 — A convenção manda

`convention-route.md` define o framework, o esquema de validação, o envelope de
resposta e o mapa erro→status. Siga-a; onde omissa, use o idiomático e
**registre a suposição**.

## Passo 2 — Implementar a rota

- Valide e desserialize o input conforme a convenção; rejeite cedo o inválido.
- Chame o **service** (caso de uso) já entregue — não acesse repository/adapter
  direto, não coloque regra de negócio no handler.
- Mapeie o resultado do service para a resposta e os erros para os status codes
  da convenção.
- A dependência aponta para dentro: a rota conhece o service, nunca o contrário.

## Passo 3 — Testes do arquivo (verdes antes de entregar)

- Teste **junto** do handler no nível request → response, com o service fake/stub
  conforme a convenção.
- Cubra input válido, input inválido (400/validação), e o mapa de erros do
  service para status.
- Rode os testes (`Bash`); não entregue com vermelho.

## Portões de decisão (PARE e pergunte)

- Forma do input/output da rota (path, payload, contrato) indefinida.
- O service que a rota deve chamar ainda não existe.
- Política de auth/erro/status ambígua e não decidida pela convenção.
- O contrato pedido contraria `convention-route.md`.

## Retorno ao orquestrador

Reporte: arquivo(s), o endpoint exposto (método/path/contrato), o service
consumido, suposições, e status dos testes.
