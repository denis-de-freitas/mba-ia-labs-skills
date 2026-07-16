# CLAUDE.md

Guia para agentes trabalhando neste projeto.

## Comandos

```bash
npm start            # sobe o servidor (tsx src/server.ts)
npm test             # roda a suíte de testes (vitest run)
npm run test:watch   # testes em watch mode
npm run typecheck    # checagem de tipos (tsc --noEmit)
npm run lint         # ESLint (inclui o gate de camadas como regra)
npm run check:layers # gate determinístico de arquitetura (ver abaixo)
```

## Arquitetura

Aplicação **HTTP em camadas** (Hono + Zod, testes em Vitest). A regra de ouro é:
**as dependências apontam pra dentro**.

```
routes ─▶ services ─▶ domain          (infra: repository/adapter ─▶ domain/shared)
```

Camadas em `src/`:

| Camada           | Pasta                | Responsabilidade                                                   |
|------------------|----------------------|-------------------------------------------------------------------|
| **routes**       | `src/routes/**`       | Borda HTTP: valida input (DTO Zod), chama service, traduz Result→HTTP. Não toca domain nem repository. |
| **services**     | `src/services/**`     | Casos de uso: orquestra domínio e repository. Devolve `Result`.    |
| **domain**       | `src/domain/**`       | Núcleo de negócio puro (entidades, value objects, regras). Não importa nada pra fora além de `zod` e builtins `node:*`. |
| **repository**   | `src/repositories/**` | Persistência atrás de interface declarada no domínio.             |
| **adapter**      | `src/adapters/**`     | Wrappers de libs/serviços externos (quando existir).              |
| **shared**       | `src/shared/**`       | Utilitários transversais (Result, errors, http helpers). Folha — não importa camada nenhuma. |
| composition root | `src/main.ts`, `src/server.ts`, `src/middleware/**` | Wiring/injeção de dependências. Isento das fronteiras. |

As fronteiras proibidas são definidas e enforçadas em
`scripts/check-layers.mjs` (e espelhadas na regra ESLint `layered/*`).

## Gate de arquitetura — obrigatório antes de declarar a tarefa concluída

Ao **concluir qualquer feature** ou ao **terminar de editar qualquer arquivo
dentro de `src/**`**, o **último passo obrigatório** — antes de dizer se a tarefa
foi realmente finalizada ou não — é rodar o gate determinístico via Bash:

```bash
npm run check:layers
```

Regras:

- **`exit 0`** (gate verde): só então a tarefa pode ser declarada concluída.
- **`exit 2`** (gate vermelho): a tarefa **NÃO está concluída**. Cada violação
  sai no stderr num bloco com a regra, `arquivo:linha`, o import ofensor, o
  porquê e o como consertar, além da camada/sub-skill responsável. Corrija todas
  as violações e rode o gate de novo até ficar verde.
- **Nunca** afirme que a tarefa terminou sem ter rodado o gate e obtido `exit 0`.
  Editou algo em `src/**`? Rode o gate antes de fechar.

O gate valida que as dependências apontam pra dentro
(`routes → services → domain`) e que nenhuma fronteira de camada foi furada. A
definição das fronteiras vive em `scripts/check-layers.mjs`.
