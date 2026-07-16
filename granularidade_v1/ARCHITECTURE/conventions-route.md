# Conventions — Route (`implementing-route`)

> Skill `implementing-route` lê **apenas este arquivo**. Não ler ARCHITECTURE.md exceto §9 (errors), §11 (envelope) quando relevante.
>
> Para padrões operacionais ver [`docs/conventions/hono.md`](../docs/conventions/hono.md) (factory, cookies, error boundary) e [`docs/conventions/zod.md`](../docs/conventions/zod.md) (parsing de DTO).

## §1 Forma

- **Localização**:
  - `src/routes/api/<context>.routes.ts` — rotas JSON em `/api/v1/<resource>`
  - `src/routes/web/<context>.routes.ts` — rotas server-rendered em `/*` (devolvem `c.html(<Page/>)`)
- **Forma de handler**: factory pattern — função que recebe deps tipadas e retorna `Hono` montado:
  ```ts
  export function buildAuthRoutes(deps: AuthRoutesDeps): Hono { /* ... */ }
  ```
- **DI**: services chegam via `deps` do factory. Handler **nunca** instancia repository nem service nem adapter

## §2 DTO Zod

- Schemas em `src/routes/api/dtos/<context>.dto.ts` (compartilhado entre rotas do mesmo contexto)
- Schema **no mesmo arquivo do handler** quando não é reaproveitado
- Tipo derivado via `z.infer<typeof X>`. Sem `any`

**Parsing**:
```ts
const body = await c.req.json().catch(() => ({}));
const parsed = CreateWorkspaceSchema.safeParse(body);
if (!parsed.success) {
  return respond(c, 400, {
    error: {
      code: 'VALIDATION_FAILED',
      message: 'invalid input',
      details: parsed.error.issues,
    },
  });
}
const input = parsed.data;
```

## §3 Envelope padronizado (rotas /api/v1/*)

`src/shared/http/response.ts`:
```ts
export type Success<T> = { data: T };
export type Failure   = { error: { code: string; message: string; details?: unknown } };
export type Envelope<T> = Success<T> | Failure;

export function respond<T>(c: Context, status: number, body: Envelope<T>): Response {
  return c.json(body, status);
}
```

**Sucesso**: `respond(c, 200, { data: toDto(result.value) })`
**Erro de validação**: `respond(c, 400, { error: { code: 'VALIDATION_FAILED', ... } })`
**Falha de service**: `propaga` (error-handler middleware mapeia automaticamente)

`correlation_id` vai como header `X-Correlation-Id` (não no envelope).

## §4 Rotas /web/* (server-rendered)

- Devolvem `c.html(<Page/>)` direto — não usam envelope JSON
- Importam componentes/layouts de `src/web/` (gate `layered/no-adapter-import-in-views`)
- Consomem service via deps no factory — mesmo padrão de DI das routes API

```ts
import { buildAppLayout } from '@web/layouts/app-layout';
import { WorkspaceListPage } from '@web/pages/workspaces/list';

export function buildWorkspaceWebRoutes(deps: { listWorkspaces: ListWorkspacesService }): Hono {
  const app = new Hono();
  app.get('/workspaces', async (c) => {
    const result = await deps.listWorkspaces.execute({ userId: c.get('userId') });
    if (!result.ok) return c.redirect('/login');
    return c.html(buildAppLayout({ children: <WorkspaceListPage workspaces={result.value} /> }));
  });
  return app;
}
```

### §4.1 i18n em routes web

`localeMiddleware()` está montado **globalmente** em `src/routes/web/index.ts` com `app.use('*', localeMiddleware())`. Ele resolve locale via cookie `__locale` → negociação `Accept-Language` → fallback `DEFAULT_LOCALE` (= `en-US`), e injeta no contexto Hono:

- `c.var.locale: Locale` — o locale ativo
- `c.var.t: Translator` — função `t('key')` já configurada

**Sempre consumir `c.var.t` em handlers de `src/routes/web/**`.** Não importar `translator` nem `Locale` direto, não criar helper local que force um locale específico.

```ts
// ✅ Correto — usa o middleware global
app.get('/products', async (c) => {
  const t = c.var.t;
  return c.html(<ProductsIndexPage t={t} ... />);
});

// ❌ Errado — hard-coda pt-BR ignorando o middleware
function getLocale(_c: Context): Locale {
  return 'pt-BR';
}
app.get('/products', async (c) => {
  const t = translator(getLocale(c)); // bug histórico — não fazer
  ...
});
```

Type augmentation (`c.var.locale` + `c.var.t`) vem de `src/web/i18n/middleware.ts` via `declare module 'hono'`. Para garantir que o TS enxergue, o factory de routes web pode fazer `import '@web/i18n/middleware'` no topo (side-effect import) — outros arquivos do projeto já ativam o augmentation, então isso normalmente não é necessário, mas é o fallback seguro quando o factory é o único entry point.

Para forçar locale específico (e.g. relatório que deve sair em pt-BR independente do user), trocar o cookie via response **antes** do render, não bypassar o middleware.

## §5 Service consumption — pattern

Handler **lê Result**, decide HTTP status:
```ts
app.post('/workspaces', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = CreateWorkspaceSchema.safeParse(body);
  if (!parsed.success) return respond(c, 400, { error: { code: 'VALIDATION_FAILED', message: '...', details: parsed.error.issues } });

  const userId = c.get('userId');
  if (!userId) return respond(c, 401, { error: { code: 'NO_SESSION', message: 'authentication required' } });

  const result = await deps.createWorkspace.execute({
    ownerId: userId,
    name: parsed.data.name,
    correlationId: c.get('correlationId'),
  });

  if (!result.ok) {
    // error-handler middleware vai pegar
    throw result.error;
  }

  return respond(c, 201, { data: result.value });
});
```

**Alternativa** (sem throw, manual):
```ts
if (!result.ok) {
  return respond(c, result.error.status, {
    error: { code: result.error.code, message: result.error.message },
  });
}
```

Preferido: **throw**, deixar `error-handler` middleware central mapear. Reduz `if/else` por route.

## §6 Composition root

`src/main.ts`:
```ts
const apiAuth = buildAuthApiRoutes({ requestAuth, verifyOtp, verifyMagicLink, logout, me });
const apiWorkspace = buildWorkspaceApiRoutes({ createWorkspace, listWorkspaces, ... });
const webAuth = buildAuthWebRoutes({ ... });
const webWorkspace = buildWorkspaceWebRoutes({ ... });

const app = new Hono();
app.use('*', correlationIdMiddleware());
app.use('*', errorHandler({ logger }));
app.route('/api/v1', apiAuth);
app.route('/api/v1', apiWorkspace);
app.route('/', webAuth);
app.route('/', webWorkspace);
```

## §7 Cookies

- Via `hono/cookie` helpers — nunca header manual
- Cookie de sessão setado em `auth-verify-otp.routes.ts` / `auth-verify-magic-link.routes.ts`
- Cookie de flash (web) setado em `middleware/web/` quando necessário

## §8 Proibições absolutas

- ❌ `import` de repository (`src/repositories/`) ou interface de repo (`src/domain/<entity>/<entity>.repository.ts`) (gate `layered/no-route-importing-repository`)
- ❌ `import` de outra route (gate `layered/no-route-importing-route`)
- ❌ `import` de driver de DB
- ❌ `process.env` (gate global)
- ❌ Lógica de domínio inline (validação Zod do DTO ≠ regra de negócio — regra fica no service/domain)
- ❌ `if/else` mapeando código de erro pra HTTP status — usar throw + error-handler central
- ❌ `c.json({ data: ..., otherKey: ... })` fora do envelope `{ data }` / `{ error }`
- ❌ Em `src/routes/web/**`: criar helper local que devolva `Locale` fixo (e.g. `function getLocale() { return 'pt-BR' }`) — usar **`c.var.t`** do `localeMiddleware()` global (§4.1)

## §9 ESLint rules ativas em `src/routes/**/*.ts`

- `layered/no-route-importing-route`
- `layered/no-route-importing-repository`
- `layered/no-adapter-import-in-views` (apenas em `src/routes/web/**`)
- `layered/no-db-driver-in-web` (apenas em `src/routes/web/**`)
- `layered/no-process-env-outside-config` (global)
- `layered/no-utils-file` (global)

Rodadas pelo Stop hook via `npm run lint:route`.
