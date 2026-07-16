# Pipeline bottom-up — contrato por camada

A feature é construída de baixo para cima. Cada camada só inicia quando a
anterior terminou com testes verdes. `adapter` é opcional.

```
domain → adapter (se existir) → services → repository → route
```

## O que cada camada entrega

| Ordem | Camada     | Entrega                                                            | Entra quando                                  |
|-------|------------|-------------------------------------------------------------------|-----------------------------------------------|
| 1     | domain     | Entidades, value objects, regras de negócio puras (sem I/O)       | Sempre que a feature tem regra de negócio     |
| 2     | adapter    | Tradução de/para serviço externo (SDK, API, fila)                 | **Só** se integra algo externo               |
| 3     | services   | Casos de uso, orquestração das regras de domínio                  | Sempre que há fluxo de aplicação              |
| 4     | repository | Persistência / acesso a dados por trás de uma interface           | Sempre que a feature lê ou grava dados        |
| 5     | route      | Entrada HTTP/handler: validação de input, chamada do service      | Sempre que a feature é exposta externamente   |

## Regras do fluxo

- **Uma camada por vez.** Não comece `services` com `domain` em vermelho.
- **Cada arquivo carrega seus testes.** A sub-skill entrega fonte + teste do
  arquivo; o teste tem que passar antes de avançar.
- **Pular é válido.** Camada que a feature não toca não vira arquivo vazio.
- **Dependência aponta pra dentro.** `route` depende de `services`, que depende
  de `domain`. Nunca o contrário.

## Portões de decisão (PARE e pergunte)

Quando bater em um destes, use `AskUserQuestion` antes de continuar — não
assuma o caminho:

- Contrato ambíguo: nome/forma do input ou output não está definido.
- Dependência ausente: a camada precisa de algo (lib, interface, env) que não
  existe no repo.
- Escolha de arquitetura: mais de um padrão plausível e as references não
  decidem (ex.: qual storage, síncrono vs. fila).
- Teste travado por decisão de produto: o teste só passa depois de uma regra de
  negócio que o usuário precisa confirmar.
- Conflito com reference: o que a feature pede contradiz uma reference do
  projeto.
