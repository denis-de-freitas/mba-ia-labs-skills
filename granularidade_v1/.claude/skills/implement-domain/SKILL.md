---
name: implement-domain
description: >
  Sub-skill da camada domain, invocada pelo orquestrador implement-feature (ou
  diretamente quando só a regra de negócio é pedida). Implementa entidades,
  value objects e regras de negócio PURAS — sem I/O, sem framework, sem rede ou
  banco. Dispara em "implementa o domínio de X", "cria a entidade/regra de Y".
  ANTES de escrever qualquer código, faz pré-checkout e carrega
  architecture/ARCHITECTURE/convention-domain.md como fonte da verdade. Entrega
  o arquivo de domínio + seus testes unitários verdes. NÃO faz persistência
  (implement-repository), orquestração de caso de uso (implement-service),
  integração externa (implement-adapter) nem rota (implement-route).
allowed-tools: Read, Grep, Glob, Write, Edit, Bash, AskUserQuestion
---

# Implement Domain

Camada mais interna. Só regra de negócio pura: entidades, value objects,
invariantes, cálculos. **Zero I/O** — nada de rede, banco, arquivo, relógio
global, SDK ou framework. Uma responsabilidade: traduzir a regra em código
testável de forma isolada.

## Passo 0 — Pré-checkout e carga da convenção (obrigatório, antes de qualquer código)

Não escreva uma linha antes de:

1. **Pré-checkout** — localize a pasta de arquitetura do projeto no estado atual
   do repo: `architecture/ARCHITECTURE/` (use `Glob`/`Bash`). Confirme que
   existe e está acessível.
2. **Carregar a convenção da camada** — leia
   `architecture/ARCHITECTURE/convention-domain.md`. Este arquivo é a **fonte da
   verdade** para nomenclatura, estrutura de pastas, formato de erros de
   domínio, padrão de value object/entidade e organização dos testes.
3. Se o arquivo **não existir** ou estiver vazio → **PARE** e use
   `AskUserQuestion`: criar a convenção primeiro, apontar outro caminho, ou
   seguir com um default idiomático explícito. Não invente convenção em silêncio.

## Passo 1 — A convenção manda

Onde `convention-domain.md` definir algo (sufixo de classe, formato de erro,
imutabilidade de VO, onde fica o teste), siga à risca — mesmo contra seu
default. Onde for omissa, use o padrão idiomático da linguagem/repo e **registre
a suposição** no retorno ao orquestrador.

## Passo 2 — Implementar o domínio

- Modele a regra como entidade/VO conforme a convenção. Invariantes validadas na
  construção; estado inválido não deve ser representável.
- **Sem dependências para fora**: não importe repositório, service, adapter,
  HTTP, ORM ou relógio/UUID global. Se precisar de tempo/identidade, receba por
  parâmetro.
- A dependência aponta **para dentro**: domínio não conhece ninguém.

## Passo 3 — Testes do arquivo (verdes antes de entregar)

- Entregue o teste **junto** do arquivo de domínio, no local que a convenção
  manda. Testes unitários puros, sem mocks de I/O (não há I/O).
- Cubra invariantes, casos de borda e caminhos de erro.
- Rode os testes (`Bash`). Não devolva a camada com teste vermelho.

## Portões de decisão (PARE e pergunte via AskUserQuestion)

- Regra de negócio ambígua que muda o resultado do teste.
- A feature pede algo que contraria `convention-domain.md`.
- Falta uma definição de produto (limite, arredondamento, estado válido).

## Retorno ao orquestrador

Reporte: arquivo(s) criado(s), contratos/assinaturas expostos (para as camadas
de cima dependerem do que existe), suposições feitas onde a convenção foi
omissa, e status dos testes.
