# Zod v3

**Última revisão**: 2026-06-08
**Versão**: `^3.23.0`

## Setup no projeto

- **Env**: schema único em `src/config/env.ts` validado por `loadEnv(process.env)` no boot — única porta de entrada de `process.env`
- **DTOs HTTP**: schemas inline no arquivo do handler (`src/routes/api/<context>.routes.ts`) quando únicos; movem pra `src/routes/api/dtos/<context>.dto.ts` quando reutilizados
- **Value objects**: schemas internos em entities/VOs do `src/domain/<entity>/value-objects/` quando a validação é estrutural (ex: `Email` usa Zod refine para regras de formato)
- **Tipos derivados**: sempre via `z.infer<typeof schema>` — nunca duplicar declaração de tipo

## Padrões adotados

- **`safeParse` em produção, sempre**: handlers HTTP usam `schema.safeParse(input)` + `if (!result.success) return respond(c, 400, { error: { code: 'VALIDATION_ERROR', details: result.error.issues } })`. `parse()` permitido só em testes e scripts internos
- **Mensagens estruturadas**: erros de Zod entram no envelope `{error}` com `details: ZodIssue[]` — error-handler central (`src/middleware/error-handler.ts`) não é envolvido para `VALIDATION_ERROR` (handler já decide); só pra erros de service
- **Mensagens em PT-BR só quando voltam ao usuário**: schema interno pode ter mensagens em EN; quando exposto ao client, formattar via `t()` na borda
- **Validação de env é falha-rápida**: `loadEnv` joga `Error` no boot listando todos os campos inválidos numa única mensagem — app não sobe com env quebrada
- **Refine para business rules estruturais**: regras tipo "email tem formato válido" via `.refine()` direto no schema. Regras de negócio (`email existe no DB?`) ficam no service, não em refine
- **Schemas pequenos, declarados perto do uso**: handler com 1 DTO → declarar no próprio arquivo de route. Schema reutilizado por 2+ handlers do mesmo contexto → mover pra `src/routes/api/dtos/<context>.dto.ts`
- **Cross-context permitido com cautela**: reuse via composição (`baseUserSchema.extend({...})`); evitar import direto entre DTOs de contextos diferentes

## Anti-padrões

- ❌ `schema.parse(input)` em handler — throw vira 500 não-mapeado (use `safeParse`)
- ❌ `z.any()` / `z.unknown()` em DTO de produção — se aceita qualquer coisa, falta decisão de schema
- ❌ Schema duplicado em `dto.ts` e em entity (`UserSchema` HTTP ≠ `User` domain) — entity tem schema próprio se precisar, DTO HTTP é separado
- ❌ Mensagens de erro hardcoded em EN no schema interno e re-traduzir no formatter — i18n decide na borda, não no schema
- ❌ `transform()` que muda formato de tipo de saída em DTO HTTP — DTO de entrada vira tipo limpo via `z.infer`, transformação de domínio vai no factory da entity
- ❌ Schema "wrapper" só pra ter `.optional()` em tudo — modelar o opcional explicitamente

## Snippets canônicos

### Env schema com falha-rápida

```ts
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
```

### DTO HTTP com `safeParse` + envelope

```ts
// src/routes/api/dtos/auth.dto.ts
import { z } from 'zod';

export const requestMagicLinkBody = z.object({
  email: z.string(),
});

export type RequestMagicLinkBody = z.infer<typeof requestMagicLinkBody>;
```

```ts
// no handler de src/routes/api/auth.routes.ts
import { respond } from '@shared/http/response';
import { requestMagicLinkBody } from '@routes/api/dtos/auth.dto';

const json = await c.req.json().catch(() => ({}));
const parsed = requestMagicLinkBody.safeParse(json);
if (!parsed.success) {
  return respond(c, 400, {
    error: { code: 'VALIDATION_ERROR', message: 'invalid body', details: parsed.error.issues },
  });
}
// parsed.data tipado como RequestMagicLinkBody
```

## Doc oficial

https://zod.dev/ (v3 — não usamos v4 ainda)
