# Conventions — Service (`implementing-service`)

> Skill `implementing-service` lê **apenas este arquivo**. Não ler ARCHITECTURE.md exceto §8 (cross-service adapter), §9 (errors), §10 (logging) quando relevante.
>
> Service não usa lib HTTP nem driver de DB. Toda persistência via repository (interface declarada no domain).

## §1 Forma

- **Localização**: `src/services/<context>/<verb>.service.ts`
  - `<context>`: agrupamento físico (auth, workspace, invitation, member) — pasta sem barreira de import
  - `<verb>`: ação imperativa (`create-workspace`, `invite-member`, `verify-otp`)
- **Forma de classe**: `class <Verb><Entity>Service` com **método público único `execute(input)`**
- **Construtor**: recebe interfaces de repository (do domain) + adapters técnicos (concretos, de `src/adapters/`) + adapters cross-service (de `services/<self>/adapters/`) + `Clock` + `Logger` via parâmetros posicionais com modificador `private readonly`

**Skeleton mínimo**:
```ts
import type { WorkspaceRepository } from '@domain/workspace/workspace.repository';
import type { MembershipRepository } from '@domain/membership/membership.repository';
import { Workspace } from '@domain/workspace/workspace';
import { Membership } from '@domain/membership/membership';
import { WorkspaceName } from '@domain/workspace/value-objects/workspace-name';
import type { SlugGenerator } from '@adapters/slug/slug-generator';
import type { Clock } from '@shared/clock';
import type { Logger } from '@adapters/logger/pino-logger';
import { type Result, ok, err } from '@shared/result';
import { UserReaderAdapter } from './adapters/user-reader.adapter';
import { OwnerInactive } from './errors';

export class CreateWorkspaceService {
  constructor(
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly membershipRepo: MembershipRepository,
    private readonly userReader: UserReaderAdapter,
    private readonly slugGen: SlugGenerator,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  async execute(input: { ownerId: string; name: string; correlationId: string }):
    Promise<Result<{ id: string; name: string; slug: string }, OwnerInactive>>
  {
    if (!(await this.userReader.isActive(input.ownerId))) {
      return err(new OwnerInactive());
    }
    const name = WorkspaceName.create(input.name);
    const slug = await this.slugGen.generate(name.value, (c) => this.workspaceRepo.isSlugAvailable(c));
    const ws = Workspace.create({ ownerId: input.ownerId, name, slug, createdAt: this.clock.now() });
    await this.workspaceRepo.save(ws);

    const membership = Membership.createOwner({ workspaceId: ws.id, userId: input.ownerId, createdAt: this.clock.now() });
    await this.membershipRepo.save(membership);

    this.logger.info(
      { event: 'workspace_created', workspaceId: ws.id, ownerId: input.ownerId, correlationId: input.correlationId },
      'workspace created'
    );

    return ok({ id: ws.id, name: ws.name.value, slug: ws.slug.value });
  }
}
```

## §2 Retorno: Result<T, E>

- **Sucesso**: `Result.ok(value)`
- **Falha previsível** (regra de negócio violada): `Result.err(new ApplicationError(...))`
- **Throw apenas pra**:
  - Erro de infra inesperado que escapa (DB caiu, adapter externo 500 sem código)
  - `DomainError` vindo de `static create(...)` — propaga pro error-handler (vira 500)

```ts
async execute(input): Promise<Result<Output, EmailUnknown | RateLimited>> {
  const user = await this.userRepo.findByEmail(input.email);
  if (!user) return err(new EmailUnknown());
  if (this.rateLimiter.exceeded(input.email)) return err(new RateLimited(60));
  // ... sucesso
  return ok({ tokenId: token.id });
}
```

## §3 Cross-service via adapter

> Service A **não importa** Service B. Gate ESLint `layered/no-service-importing-service`.

Quando A precisa de dado de outro contexto:
- Cria `src/services/<A>/adapters/<other>.adapter.ts`
- Adapter consome `<Other>Repository` (interface do domain) e expõe shape mínimo
- Service A recebe o adapter via construtor

**Skeleton**:
```ts
// src/services/workspace/adapters/user-reader.adapter.ts
import type { UserRepository } from '@domain/user/user.repository';

export class UserReaderAdapter {
  constructor(private readonly userRepo: UserRepository) {}

  async isActive(userId: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    return user?.isActive ?? false;
  }
}
```

**Princípio**: interface segregation — adapter expõe apenas o que o consumidor precisa. Se 3 services precisam da mesma view de user, cada um cria seu adapter (não vira componente compartilhado prematuramente).

**Composition root**: instancia o adapter passando o repository concreto, e injeta no service consumidor.

## §4 Errors — ApplicationError por contexto

**Base** em `src/shared/errors/application-error.ts`:
```ts
export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
```

**Por contexto** em `src/services/<ctx>/errors.ts`:
```ts
import { ApplicationError } from '@shared/errors/application-error';

export class WorkspaceNotFound extends ApplicationError {
  constructor() {
    super('workspace not found', 'WORKSPACE_NOT_FOUND', 404);
  }
}
export class NotTheOwner extends ApplicationError {
  constructor() {
    super('operation restricted to workspace owner', 'NOT_THE_OWNER', 403);
  }
}
export class NotAMember extends ApplicationError {
  constructor() {
    super('not a workspace member', 'NOT_A_MEMBER', 403);
  }
}
```

**Mapeamento HTTP**: o `status` já carrega — error-handler middleware lê `instanceof ApplicationError → c.json(envelope, err.status)`.

## §5 Logging

- Logger pino injetado via construtor (de `src/adapters/logger/`)
- Eventos estruturados: `this.logger.info({ event: '...', correlationId, ... }, 'human-readable')`
- Chave `event:` é searchable em log aggregator (substitui event-bus removido)
- `logger.info` pra side-effect bem-sucedido
- `logger.warn` pra falha esperada (rate limit, invalid otp)
- `logger.error` pra falha de infra (DB op, provider externo)

## §6 Ordem de side effects

DB primeiro → providers externos depois → log/event no fim.

```ts
async execute(input) {
  // 1. validações + leitura
  const user = await this.userRepo.findById(input.userId);
  if (!user) return err(new UserNotFound());

  // 2. domain
  const token = MagicToken.create({ userId: user.id, now: this.clock.now() });

  // 3. persistência
  await this.tokenRepo.save(token);

  // 4. provider externo
  try {
    await this.email.sendMagicLink({ to: user.email, token: token.raw });
  } catch (err) {
    this.logger.error({ err, event: 'email_send_failed' }, 'magic link email failed');
    // decide: reverter? retry? Default: log e segue, próximo request resolve
  }

  // 5. log estruturado
  this.logger.info({ event: 'magic_link_requested', userId: user.id }, 'magic link issued');

  return ok({ tokenId: token.id });
}
```

## §7 Proibições absolutas

- ❌ `import` de outro service (`src/services/<other>/...`) fora de `services/<self>/adapters/` (gate `layered/no-service-importing-service`)
- ❌ `import` de driver de DB (`pg`, `drizzle-orm`) (gate `layered/no-db-driver-in-services`)
- ❌ `import` de framework HTTP (`hono`) (gate `layered/no-http-framework-in-services`)
- ❌ `process.env` (gate global)
- ❌ Lógica de domínio inline (estado válido vira invariante na entity) — service orquestra
- ❌ Throw `DomainError` (vem do domain) — service só estoura `ApplicationError` ou propaga

## §8 ESLint rules ativas em `src/services/**/*.ts`

- `layered/no-service-importing-service`
- `layered/no-db-driver-in-services`
- `layered/no-http-framework-in-services`
- `layered/no-process-env-outside-config` (global)
- `layered/no-utils-file` (global)

Rodadas pelo Stop hook via `npm run lint:service`.
