# Mapa camada → sub-skill

Cada camada é delegada à sua sub-skill via `Skill`. Este orquestrador **não**
escreve o código; ele invoca a sub-skill, passa o contexto da camada (o que o
arquivo precisa fazer + as references aplicáveis) e espera o arquivo + testes.

| Camada     | Sub-skill                | Observação                                              |
|------------|--------------------------|--------------------------------------------------------|
| domain     | `implement-domain`       | Regras puras, sem I/O.                                  |
| adapter    | `implement-adapter`      | Só quando há integração externa.                        |
| services   | `implement-service`      | Caso de uso; orquestra domínio + repository.            |
| repository | `implement-repository`   | Persistência atrás de interface.                        |
| route      | `implement-route`        | Handler de entrada; valida input e chama o service.     |
| testes     | `test-generation`        | Cada sub-skill já entrega o teste do arquivo; use esta para reforçar/preencher cobertura faltante. |

## Convenção da camada é a fonte da verdade

Toda sub-skill, **antes de escrever qualquer código**, faz um pré-checkout e
carrega a convenção da sua camada em
`architecture/ARCHITECTURE/convention-<camada>.md`:

| Camada     | Arquivo de convenção                |
|------------|-------------------------------------|
| domain     | `convention-domain.md`              |
| adapter    | `convention-adapter.md`             |
| services   | `convention-service.md`             |
| repository | `convention-repository.md`          |
| route      | `convention-route.md`               |
| testes     | `convention-test.md`                |

Onde a convenção definir algo, ela manda — mesmo contra o default da sub-skill.
Se o arquivo da camada não existir/estiver vazio, a sub-skill **PARA** e pergunta
(é um portão de decisão). O orquestrador não precisa ler essas convenções: ele
delega e confia que a sub-skill aplicou a sua.

## Quando a sub-skill da camada não existir

Se a sub-skill mapeada acima ainda não estiver instalada no projeto, isto é um
**portão de decisão** (`pipeline.md`): PARE e pergunte ao usuário via
`AskUserQuestion` se ele quer:

1. criar/instalar a sub-skill antes de seguir, ou
2. delegar a camada a uma sub-skill alternativa, ou
3. pular a camada.

Não implemente a camada à mão para "destravar" — isso quebra a regra de que o
orquestrador não escreve código.

## Passagem de contexto para a sub-skill

Ao invocar cada sub-skill, inclua nos `args`:

- o nome e o objetivo da feature;
- o que **esta** camada precisa entregar (a partir de `pipeline.md`);
- as references de `references/` que a sub-skill deve aplicar;
- o que as camadas inferiores já entregaram (assinaturas/contratos), para a
  camada atual depender do que existe — não do que ela imagina.

A sub-skill cuida sozinha de carregar `convention-<camada>.md`; o orquestrador só
não pode supor a convenção no lugar dela.
