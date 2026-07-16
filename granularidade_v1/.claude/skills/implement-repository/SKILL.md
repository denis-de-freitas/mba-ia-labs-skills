---
name: implement-repository
description: >
  Sub-skill da camada repository, invocada pelo orquestrador implement-feature.
  Implementa persistência/acesso a dados ATRÁS de uma interface (porta), mapeando
  entidade de domínio ↔ formato de armazenamento. Dispara em "cria o repositório
  de X", "persiste/lê Y do banco". ANTES de escrever qualquer código, faz
  pré-checkout e carrega architecture/ARCHITECTURE/convention-repository.md como
  fonte da verdade. Entrega a implementação do repositório + testes verdes
  (store em memória ou integração, conforme a convenção). NÃO contém regra de
  negócio (implement-domain), caso de uso (implement-service), integração com
  serviço de terceiros (implement-adapter) nem HTTP (implement-route).
allowed-tools: Read, Grep, Glob, Write, Edit, Bash, AskUserQuestion
---

# Implement Repository

Detalhe de persistência escondido atrás de uma interface. Lê e grava dados,
mapeando entre a entidade de domínio e o modelo de armazenamento. Uma
responsabilidade: guardar/recuperar — sem regra de negócio, sem decidir o caso
de uso.

## Passo 0 — Pré-checkout e carga da convenção (obrigatório, antes de qualquer código)

Não escreva uma linha antes de:

1. **Pré-checkout** — localize `architecture/ARCHITECTURE/` no estado atual do
   repo (`Glob`/`Bash`) e confirme que existe.
2. **Carregar a convenção da camada** — leia
   `architecture/ARCHITECTURE/convention-repository.md`. **Fonte da verdade**
   para tecnologia de persistência, nomenclatura, mapeamento entidade↔tabela/doc,
   migrations, padrão de query e estratégia de teste (memória vs. integração).
3. Se não existir ou estiver vazio → **PARE** com `AskUserQuestion`.

## Passo 1 — A convenção manda

`convention-repository.md` decide o store (SQL/NoSQL/memória), o ORM/driver, o
estilo de mapeamento e como erros de persistência são traduzidos. Siga-a; onde
omissa, use o idiomático e **registre a suposição**.

## Passo 2 — Implementar o repositório

- Implemente a **interface/porta** definida pelo domínio/service. Se a porta não
  existe, é portão de decisão — pergunte, não invente o contrato.
- Mantenha o detalhe de persistência **encapsulado**: o tipo do ORM/driver não
  vaza para cima; converta para entidade de domínio na borda.
- Traduza falhas do store para os erros do contrato.

## Passo 3 — Testes do arquivo (verdes antes de entregar)

- Teste **junto** do repositório, na estratégia que a convenção manda (store em
  memória, container/integração, fixture).
- Cubra escrita, leitura, ausência (not found) e conflito/erro do store.
- Rode os testes (`Bash`); não entregue com vermelho.

## Portões de decisão (PARE e pergunte)

- A interface/porta a implementar não está definida.
- Falta dependência de infra (driver, conexão, migration, env) no repo.
- Mais de um store/estratégia plausível e a convenção não decide.
- O esquema pedido contraria `convention-repository.md`.

## Retorno ao orquestrador

Reporte: arquivo(s), a porta implementada, infra/migrations exigidas, suposições,
e status dos testes.
