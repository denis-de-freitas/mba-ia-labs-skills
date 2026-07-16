# Conventions — Domain (`implementing-domain`)

> Skill `implementing-domain` lê **apenas este arquivo**. Não ler ARCHITECTURE.md exceto §9 (errors) e §10 (logging) quando relevante.
>
> Domínio pode importar Zod pra validação interna. Ver [`docs/conventions/zod.md`](../docs/conventions/zod.md) pra patterns operacionais.

## §1 Forma e estrutura

**Modelo**: domínio rico — entity/VO conhece suas regras, valida a si mesma, e expõe operações que mantêm invariantes. **Sem imutabilidade obrigatória** (este projeto não usa CQRS/event-sourcing).

**Estrutura obrigatória de `src/domain/<entity>/`**:

| Arquivo / pasta | Conteúdo | Regras ESLint que disparam |
|---|---|---|
| `<entity>.ts` | Classe com identidade própria: construtor privado + `static create(props)` (factory com invariantes) + métodos que mantêm invariantes. Uma entity por arquivo. | `layered/require-domain-factory`, `layered/require-domain-invariant-throw` |
| `value-objects/<name>.ts` | Classe com `static create(raw)` que valida via Zod **ou** invariante manual. Campos podem ser mutáveis. Uma VO por arquivo. | `layered/require-domain-factory`, `layered/require-domain-invariant-throw` |
| `<entity>.repository.ts` | **Interface** do contrato de persistência — domínio é dono. Implementação fica em `src/repositories/`. Apenas tipos/interfaces; sem class. | (path skippado pelas duas anteriores) |
| `errors.ts` | Hierarquia de erros do domínio: base `DomainError` herda da global em `src/domain/errors.ts`; subclasses por business rule (`InvalidWorkspaceName`, `OwnerInactive`, `InvitationExpired`, etc.). | (path skippado) |

**Arquivo global `src/domain/errors.ts`**: base `class DomainError extends Error { code }` + `InvariantViolation`. Demais erros vivem em `src/domain/<entity>/errors.ts`.

**Pasta `value-objects/`** é opcional — só existe quando a entity tem VOs com comportamento ou validação própria.

## §2 Entity — forma

- `class <Entity>` com **construtor privado** + **factory estática `static create(props)`** que valida invariantes antes de instanciar
- Campos **mutáveis permitidos** — `Workspace.rename(name)` muta `this.name` em vez de retornar nova instância (sem CQRS = sem custo de imutabilidade)
- `static create()` valida invariantes; lança `DomainError` apropriado (subclasse feature-specific ou `InvariantViolation` genérico)
- `static fromRow(row): Entity` opcional pra reidratação a partir do DB (pula validação — já validou ao salvar). Usado por repositories
- Métodos de negócio vivem como métodos da entity (`token.consume(now)`, `session.isExpired(now)`) — não como funções soltas
- IDs (UUID) gerados **dentro da factory** via `crypto.randomUUID()`, nunca recebidos como input externo
- Tipos de retorno explícitos em todos os métodos públicos

**Skeleton**:
```ts
import { randomUUID } from 'node:crypto';
import { WorkspaceName } from './value-objects/workspace-name';
import { InvariantViolation } from './errors';

export class Workspace {
  id: string;
  ownerId: string;
  name: WorkspaceName;
  createdAt: Date;

  private constructor(props: { id: string; ownerId: string; name: WorkspaceName; createdAt: Date }) {
    this.id = props.id;
    this.ownerId = props.ownerId;
    this.name = props.name;
    this.createdAt = props.createdAt;
  }

  static create(input: { ownerId: string; name: WorkspaceName; createdAt: Date }): Workspace {
    if (!input.ownerId) throw new InvariantViolation('workspace must have an owner');
    return new Workspace({ id: randomUUID(), ...input });
  }

  static fromRow(row: { id: string; ownerId: string; name: string; createdAt: Date }): Workspace {
    return new Workspace({
      id: row.id,
      ownerId: row.ownerId,
      name: WorkspaceName.fromTrusted(row.name),
      createdAt: row.createdAt,
    });
  }

  rename(newName: WorkspaceName): void {
    this.name = newName;
  }
}
```

## §3 Value Object — forma

- `class <VO>` com construtor privado + `static create(raw)`
- `static create()` valida via Zod (preferido) ou check manual. Throw `DomainError` específico em violação
- `static fromTrusted(raw)` opcional pra reidratação (pula validação)
- Mutabilidade permitida — sem `Object.freeze`, sem `readonly`, sem `equals()` obrigatório
- Quando comparação por valor for necessária, fazer inline (`vo1.value === vo2.value`)

**Skeleton com Zod**:
```ts
import { z } from 'zod';
import { InvalidWorkspaceName } from '../errors';

const Schema = z.string().trim().min(2).max(80);

export class WorkspaceName {
  value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): WorkspaceName {
    const result = Schema.safeParse(raw);
    if (!result.success) {
      throw new InvalidWorkspaceName(result.error.issues[0]?.message ?? 'invalid');
    }
    return new WorkspaceName(result.data);
  }

  static fromTrusted(raw: string): WorkspaceName {
    return new WorkspaceName(raw);
  }
}
```

**Skeleton sem Zod** (invariante composta):
```ts
import { InvariantViolation } from '../errors';

export class InvitationToken {
  raw: string;
  expiresAt: Date;

  private constructor(raw: string, expiresAt: Date) {
    this.raw = raw;
    this.expiresAt = expiresAt;
  }

  static create(raw: string, expiresAt: Date): InvitationToken {
    if (raw.length !== 32) throw new InvariantViolation('token must be 32 chars');
    if (expiresAt.getTime() <= Date.now()) throw new InvariantViolation('expiry in past');
    return new InvitationToken(raw, expiresAt);
  }

  isExpired(now: Date): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }
}
```

## §4 Repository interface (port no domain)

- Interface declarada em `src/domain/<entity>/<entity>.repository.ts`
- Exporta **apenas a interface**, nunca class concreta
- Implementação vive em `src/repositories/<entity>.repository.pg.ts` (`implements <Entity>Repository`)
- Domínio importa só **tipos** (`import type { Workspace } from './workspace'`) — sem ciclo

**Skeleton**:
```ts
import type { Workspace } from './workspace';

export interface WorkspaceRepository {
  save(ws: Workspace): Promise<void>;
  update(ws: Workspace): Promise<void>;
  findById(id: string): Promise<Workspace | null>;
  findBySlug(slug: string): Promise<Workspace | null>;
  listByUserId(userId: string): Promise<Workspace[]>;
  deleteById(id: string): Promise<void>;
}
```

## §5 Errors — duas classes

**Global**: `src/domain/errors.ts`
```ts
export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvariantViolation extends DomainError {
  constructor(reason: string) {
    super(`invariant violated: ${reason}`, 'INVARIANT_VIOLATION');
  }
}
```

**Por entity**: `src/domain/<entity>/errors.ts` — subclasses nomeadas por **invariante de VO/factory violada**:

✅ Permitido (puramente invariantes de domínio que indicam BUG se atingirem o HTTP — devem ser filtrados ANTES via Zod no DTO):
- `InvalidWorkspaceName`, `InvalidEmailFormat`, `InvariantViolation`

❌ Proibido em `src/domain/<entity>/errors.ts` (são **business rules** → ficam em `src/services/<ctx>/errors.ts` como `ApplicationError` com `{code, status}`):
- `WorkspaceNotFound`, `OwnerInactive`, `OwnerCannotLeave`, `NotAMember`, `NotTheOwner`, `AlreadyMember`, `CannotInviteSelf`, `InvitationExpired`, `InvitationNotPending`, `InviteEmailMismatch`, `WorkspaceReadOnly`, `MembershipNotFound`, `MissingWorkspaceContext`, `InvalidWorkspaceId`, etc.

❌ Proibido sempre (semântica HTTP/infra crua):
- `NotFoundError`, `ConflictError`, `RateLimitExceeded`, `UnauthorizedError`

**Heurística**: se o cliente HTTP pode legitimamente ver isso como 4xx (business rule violada), é `ApplicationError` em `src/services/`. Se é "estado impossível atingido" (factory inválida, VO mal-formado), é `DomainError` em `src/domain/`.

**"Não encontrado" geralmente NÃO é DomainError**: repository devolve `null`, service traduz pra `ApplicationError` (`WorkspaceNotFound` em `src/services/workspaces/errors.ts`) ou segue caminho normal.

**DomainError no error-handler global → 500** (bug interno). Validação de input do usuário fica no Zod do DTO em `routes/api/dtos/`. Se DomainError lança em produção, é porque a route deixou input ruim passar.

## §6 Proibições absolutas

- ❌ `import` de `src/adapters/`, `src/services/`, `src/repositories/`, `src/routes/`, `src/middleware/` em `src/domain/` (gate ESLint)
- ❌ `import` de driver de DB (`pg`, `drizzle-orm`), framework HTTP (`hono`), provider externo (`resend`, `argon2`) em `src/domain/`
- ❌ `process.env` em qualquer arquivo de `src/domain/`
- ❌ `node:fs`, `node:net`, `node:http`, `node:dns` em `src/domain/`
- ❌ `Object.freeze`, `readonly` nos campos (decisão: mutabilidade permitida — sem CQRS)
- ❌ `equals(other): boolean` obrigatório nos VOs (decisão: compara inline quando precisar)
- ❌ Erro com nome de status HTTP (`NotFoundError`, `ConflictError`)
- ❌ `events.ts` / `event-builders.ts` — eventos foram removidos do projeto (ver ARCHITECTURE.md §8.2)

