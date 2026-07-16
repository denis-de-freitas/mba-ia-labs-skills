---
name: implement-service
description: >
  Sub-skill da camada services, invocada pelo orquestrador implement-feature.
  Implementa o caso de uso: orquestra regras de domínio e dependências
  (repository/adapter) atrás de interfaces. Dispara em "cria o service/caso de
  uso de X", "monta o fluxo de aplicação de Y". ANTES de escrever qualquer
  código, faz pré-checkout e carrega
  architecture/ARCHITECTURE/convention-service.md como fonte da verdade. Entrega
  o service + testes (com domínio real e dependências fakes) verdes. NÃO contém
  regra de negócio pura (implement-domain), detalhe de persistência
  (implement-repository), integração externa (implement-adapter) nem
  parsing/HTTP (implement-route).
allowed-tools: Read, Grep, Glob, Write, Edit, Bash, AskUserQuestion
---

# Implement Service

Camada de aplicação. Coordena o caso de uso: chama o domínio para decidir e as
portas (repository/adapter) para efeito colateral, sempre por **abstração**.
Uma responsabilidade: orquestrar — não calcular regra nem falar I/O direto.

## Passo 0 — Pré-checkout e carga da convenção (obrigatório, antes de qualquer código)

Não escreva uma linha antes de:

1. **Pré-checkout** — localize `architecture/ARCHITECTURE/` no estado atual do
   repo (`Glob`/`Bash`) e confirme que existe.
2. **Carregar a convenção da camada** — leia
   `architecture/ARCHITECTURE/convention-service.md`. **Fonte da verdade** para
   nomenclatura do caso de uso, forma de input/output (DTO/command), injeção de
   dependências, fronteira de transação e tratamento de erro.
3. Se não existir ou estiver vazio → **PARE** com `AskUserQuestion`.

## Passo 1 — A convenção manda

`convention-service.md` define o estilo (command/handler, classe com método,
função), como dependências chegam e o formato de erro/resultado. Siga-a; onde
omissa, use o idiomático e **registre a suposição**.

## Passo 2 — Implementar o service

- Dependa de **interfaces/portas**, não de implementações concretas de
  repository/adapter. Recebe-as por injeção.
- Use as entidades/VOs já entregues pelo domínio; não duplique regra de negócio
  aqui — delegue ao domínio.
- Orquestre o fluxo: validar pré-condições de aplicação, chamar domínio, persistir
  via repository, integrar via adapter, devolver o resultado no formato da convenção.
- A dependência aponta para dentro: o service não conhece HTTP nem o framework web.

## Passo 3 — Testes do arquivo (verdes antes de entregar)

- Teste **junto** do service, com **domínio real** e repository/adapter como
  fakes/stubs conforme a convenção.
- Cubra caminho feliz, erros de regra propagados do domínio e falhas das portas.
- Rode os testes (`Bash`); não entregue com vermelho.

## Portões de decisão (PARE e pergunte)

- Forma do input/output do caso de uso indefinida.
- Porta (repository/adapter) que o service precisa ainda não existe.
- Fronteira de transação ou ordem de efeitos ambígua.
- O fluxo pedido contraria `convention-service.md` ou o domínio entregue.

## Retorno ao orquestrador

Reporte: arquivo(s), assinatura do caso de uso (input/output), portas exigidas
das camadas vizinhas, suposições, e status dos testes.
