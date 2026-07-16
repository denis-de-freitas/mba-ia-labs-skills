# Conventions — Repository (`implementing-repository`)

> Skill `implementing-repository` lê **apenas este arquivo**. Não ler ARCHITECTURE.md exceto §9 (errors) quando relevante.
>
> Para padrões operacionais de Drizzle (instanciação, transações, query builder, snippets), ver [`docs/conventions/drizzle.md`](../docs/conventions/drizzle.md). Esta seção registra apenas a forma da camada.

## §1 Forma

- **Localização**: `src/repositories/<entity>.repository.pg.ts`
  - Sufixo `.pg.ts` indica driver (`pg`/Drizzle). Permite ter `.mock.ts` em tests no futuro
- **Forma**: `class <Entity>PgRepository implements <Entity>Repository`
  - `<Entity>Repository` é a **interface declarada no domain** (`src/domain/<entity>/<entity>.repository.ts`)
  - `implements` explícito obrigatório — typecheck garante contrato
- **Construtor**: recebe `pool: Pool` (pg) + `clock?: Clock` quando precisa. Instancia Drizzle handler:
  ```ts
  constructor(pool: Pool) {
    this.db = drizzle(pool, { schema });
  }
  ```
- **Sem `new Pool()` próprio** — pool sempre injetado de fora

## §2 Mapeamento Row ↔ Entity

- **Método `private toEntity(row): Entity`** em cada repository — nunca expor row pra fora
- Reidratação via `Entity.fromRow(row)` (factory que pula validação — já validou ao salvar)
- Nunca expor type `Row = typeof schema.x.$inferSelect` pra camadas acima

**Skeleton**:
```ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '@shared/db/schema';
import { Workspace } from '@domain/workspace/workspace';
import type { WorkspaceRepository } from '@domain/workspace/workspace.repository';
import { RepositoryError } from '@shared/errors/repository-error';

type Row = typeof schema.workspaces.$inferSelect;

export class WorkspacePgRepository implements WorkspaceRepository {
  private readonly db;

  constructor(pool: Pool) {
    this.db = drizzle(pool, { schema });
  }

  async save(ws: Workspace): Promise<void> {
    try {
      await this.db.insert(schema.workspaces).values({
        id: ws.id,
        ownerId: ws.ownerId,
        name: ws.name.value,
        slug: ws.slug.value,
        createdAt: ws.createdAt,
      });
    } catch (err) {
      throw new RepositoryError('WorkspacePgRepository.save failed', { cause: err });
    }
  }

  async findById(id: string): Promise<Workspace | null> {
    try {
      const rows = await this.db.select().from(schema.workspaces).where(eq(schema.workspaces.id, id)).limit(1);
      return rows[0] ? this.toEntity(rows[0]) : null;
    } catch (err) {
      throw new RepositoryError('WorkspacePgRepository.findById failed', { cause: err });
    }
  }

  private toEntity(row: Row): Workspace {
    return Workspace.fromRow({
      id: row.id,
      ownerId: row.ownerId,
      name: row.name,
      slug: row.slug,
      createdAt: row.createdAt,
    });
  }
}
```

## §3 Errors

- Falha de driver (constraint, connection lost) → `throw new RepositoryError(msg, { cause })` (vem de `src/shared/errors/repository-error.ts`)
- Not-found → retornar `null` (não estourar erro). Service decide se traduz pra `ApplicationError`
- `RepositoryError extends ApplicationError` com `status: 503` — error-handler global devolve 503 automaticamente
- Nunca estoura `DomainError` em repository (DomainError vem do domain layer, não da persistência)

## §4 Transações

- Repository expõe métodos atômicos por padrão. Quando precisar cross-repo:
  ```ts
  await pool.transaction(async (tx) => {
    await workspaceRepo.save(ws, tx);
    await membershipRepo.save(membership, tx);
  });
  ```
- Métodos do repository aceitam `tx?: DbOrTx` opcional. Alias em `src/shared/db/types.ts`
- Service orquestra a transação — repository não conhece `service` nem outro `repository`

## §5 Cross-repository: PROIBIDO

- Gate ESLint `layered/no-cross-repository-import` — `workspace.repository.pg.ts` não importa `user.repository.pg.ts`
- Cross-entity ao nível de leitura → service chama 2 repositories e compõe
- Cross-entity ao nível de cleanup → FK cascade no `src/shared/db/schema.ts` (ver ARCHITECTURE.md §8.1)

## §6 SQL

- Via Drizzle query builder tipado (`db.select().from(schema.x).where(eq(...))`)
- Sem string SQL concatenada com input do usuário (SQL injection)
- `sql\`...\`` parametrizado permitido pra queries que Drizzle não cobre — sempre com placeholder, nunca interpolação

## §7 Wrappers de provider externo: NÃO ficam em `repositories/`

- Resend, Argon2, JWT → vão pra `src/adapters/<categoria>/` (ver [`conventions-adapter.md`](conventions-adapter.md))
- Repository é apenas **persistência de entity do domain** via DB

## §8 Proibições absolutas

- ❌ `import` de outro repository (`src/repositories/<other>...`) (gate `layered/no-cross-repository-import`)
- ❌ `import` de service, route, middleware (gate `layered/no-repository-importing-service`)
- ❌ `new Pool()` — pool sempre via construtor
- ❌ `process.env` (gate global)
- ❌ Lógica de domínio (`if user.role === 'admin'`) — service interpreta
- ❌ SQL concat com input

## §9 ESLint rules ativas em `src/repositories/**/*.ts`

- `layered/no-cross-repository-import`
- `layered/no-repository-importing-service`
- `layered/no-process-env-outside-config` (global)
- `layered/no-utils-file` (global)

Rodadas pelo Stop hook via `npm run lint:repository`.
