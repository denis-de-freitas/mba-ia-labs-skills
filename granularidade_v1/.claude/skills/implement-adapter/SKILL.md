---
name: implement-adapter
description: >
  Sub-skill da camada adapter, invocada pelo orquestrador implement-feature.
  Implementa a tradução de/para um serviço externo (SDK, API HTTP, fila,
  provedor) atrás de uma interface/porta. Dispara em "cria o adapter de X",
  "integra o SDK/serviço Y". Só entra quando a feature integra algo externo.
  ANTES de escrever qualquer código, faz pré-checkout e carrega
  architecture/ARCHITECTURE/convention-adapter.md como fonte da verdade. Entrega
  o adapter + testes (com o serviço externo isolado/fake) verdes. NÃO contém
  regra de negócio (implement-domain), caso de uso (implement-service) nem
  persistência de dados próprios (implement-repository).
allowed-tools: Read, Grep, Glob, Write, Edit, Bash, AskUserQuestion
---

# Implement Adapter

Fronteira com o mundo externo. Traduz entre o vocabulário do domínio e o
formato de um serviço externo (SDK/API/fila), implementando uma porta definida
por dentro. Uma responsabilidade: isolar o externo para o resto do sistema não
saber que ele existe.

## Passo 0 — Pré-checkout e carga da convenção (obrigatório, antes de qualquer código)

Não escreva uma linha antes de:

1. **Pré-checkout** — localize `architecture/ARCHITECTURE/` no estado atual do
   repo (`Glob`/`Bash`) e confirme que existe.
2. **Carregar a convenção da camada** — leia
   `architecture/ARCHITECTURE/convention-adapter.md`. **Fonte da verdade** para
   nomenclatura, onde mora o adapter, como configurar credenciais/clientes,
   tratamento de erro/timeout/retry e como o externo é mockado nos testes.
3. Se não existir ou estiver vazio → **PARE** com `AskUserQuestion` (criar a
   convenção, apontar caminho, ou seguir com default explícito).

## Passo 1 — A convenção manda

`convention-adapter.md` decide o padrão de resiliência (retry/timeout/circuit),
o formato do erro traduzido e o estilo de configuração. Siga-a; onde for omissa,
use o idiomático e **registre a suposição** no retorno.

## Passo 2 — Implementar o adapter

- Implemente a **porta/interface** já definida pelo domínio/service. Se a porta
  ainda não existe, isso é um portão de decisão — pergunte, não invente o
  contrato.
- Mantenha o SDK/cliente externo **encapsulado**: nada do tipo do SDK vaza para
  cima; converta para tipos de domínio na borda.
- Traduza falhas externas para erros do contrato (não deixe exceção bruta do SDK
  subir).

## Passo 3 — Testes do arquivo (verdes antes de entregar)

- Teste **junto** do adapter, com o serviço externo **isolado** (fake/stub/mock
  conforme a convenção) — sem chamada de rede real no teste.
- Cubra o caminho feliz, erro do externo, timeout e mapeamento de tipos.
- Rode os testes (`Bash`); não entregue com vermelho.

## Portões de decisão (PARE e pergunte)

- A porta/contrato que o adapter implementa não está definida.
- Falta credencial/env/lib do SDK no repo.
- Mais de um provedor/estratégia plausível e a convenção não decide.
- O comportamento pedido contraria `convention-adapter.md`.

## Retorno ao orquestrador

Reporte: arquivo(s), a porta implementada, dependências externas exigidas
(envs/libs), suposições, e status dos testes.
