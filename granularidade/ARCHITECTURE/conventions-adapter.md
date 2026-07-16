# Conventions — Adapter (`implementing-adapter`)

> Adapters técnicos vivem em `src/adapters/<categoria>/`. Categorias atuais: `crypto/`, `email/`, `logger/`, `rate-limit/`, `slug/`. Cada arquivo é um adapter — encapsula uma lib externa (jose, resend, pino, argon2) ou uma capability técnica (slug generator, rate limiter, OTP generator). **Não** existe interface "Port" declarada em `domain/` ou `shared/` pra adapter — a interface vive **no próprio arquivo do adapter**.
>
> Esta convention é deliberadamente curta — adapters são leaf nodes e propositalmente sem cerimônia. Quando uma 6ª categoria ou um padrão divergente aparecer, atualizar aqui antes de codar.

## §1 Forma

- **Localização**: `src/adapters/<categoria>/<provider>.ts`
  - `<categoria>`: domínio técnico (ex: `crypto`, `email`, `slug`).
  - `<provider>`: tecnologia ou variante (ex: `jose-jwt-provider`, `resend-email-provider`, `argon2-otp-hasher`). Sufixo `-provider`/`-generator`/`-hasher`/`-limiter` indica natureza.
- **Interface inline**: declarar `export interface <Name>` no topo do arquivo (ex: `EmailProvider`, `JwtProvider`, `Logger`, `SlugGen`). É **a** interface pública do adapter — services importam o tipo daqui.
- **Implementação concreta**: `export class <Concrete> implements <Name>` ou função pura `export function create<Name>(opts): <Name>` (logger usa factory functional; demais usam class).
- **Construtor**: recebe `opts` (config + deps técnicos). Adapter pode pedir `Clock` quando precisa de tempo (JwtProvider) ou um `fetch` injetável (ResendEmailProvider) pra testabilidade. **Não recebe repository, service, ou outro adapter de outra categoria.**

**Skeleton (class)**:
```ts
// src/adapters/email/resend-email-provider.ts
import { ProviderError } from '@shared/errors/provider-error';

export interface EmailProvider {
  sendMagicLink(input: { to: string; link: string; otp: string }): Promise<void>;
}

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly opts: {
      apiKey: string;
      from: string;
      fetch?: typeof globalThis.fetch;
    },
  ) {}

  async sendMagicLink(input: { to: string; link: string; otp: string }): Promise<void> {
    const fetchFn = this.opts.fetch ?? globalThis.fetch;
    try {
      const res = await fetchFn('https://api.resend.com/emails', { /* ... */ });
      if (!res.ok) throw new ProviderError(`Resend returned ${res.status}`);
    } catch (err) {
      throw new ProviderError('Resend send failed', { cause: err });
    }
  }
}
```

**Skeleton (factory functional, sem state interno mutável)**:
```ts
// src/adapters/logger/pino-logger.ts
import pino, { type Logger as PinoLogger } from 'pino';

export interface Logger {
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
}

export function createPinoLogger(opts?: { level?: string }): Logger {
  const p: PinoLogger = pino({ level: opts?.level ?? 'info' });
  return {
    info: (obj, msg) => p.info(obj, msg),
    warn: (obj, msg) => p.warn(obj, msg),
    error: (obj, msg) => p.error(obj, msg),
  };
}
```

Class vs factory functional:
- **Class** quando há state interno (key crypto, contadores, conexão), ou quando faz sentido `implements <Name>` explícito.
- **Factory functional** (`createX(): X`) quando é wrapper fino sem state próprio (logger).

## §2 Errors

- **Falha de provider externo** (Resend down, Argon2 panic, JWT inválido por chave errada) → `throw new ProviderError(msg, { cause })` (de `@shared/errors/provider-error`). `ProviderError extends ApplicationError` com `status: 502`.
- **Indisponibilidade temporária** com retry esgotado → `ServiceUnavailableError` (status `503`).
- **Erro de input estrutural** (ex: secret < 32 bytes no construtor) → `throw new Error(...)` no boot. Falha-rápida; não envolve `ApplicationError` porque é bug de configuração.
- **Nunca lança `DomainError`** — domain mora em `src/domain/`, adapter não conhece domain.
- Exceção: `SlugGenerator` lança `InvariantViolation` quando esgota tentativas. Isso é deliberado — slug-generation toca regra de domínio (formato, comprimento, reservados) e o domain importa o adapter via DI. Esta exceção fica documentada aqui; novas categorias de adapter não devem replicar — preferir `ProviderError`.

## §3 Composition root (`src/main.ts`)

Adapters são instanciados em `main.ts` e injetados em services. Ordem fixa:

```ts
const clock = new SystemClock();
const logger = createPinoLogger();

// Adapters técnicos
const emailProvider = new ResendEmailProvider({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM });
const otpHasher = new Argon2OtpHasher();
const jwtProvider = new JoseJwtProvider({ secret: env.JWT_SECRET, clock });
const slugGen = new SlugGenerator();
const rateLimiter = new InMemoryRateLimiter({ windowMs, max });

// Services consomem (junto com repositories)
const requestAuth = new RequestAuthService({ userRepo, emailProvider, /* ... */, logger, clock });
```

## §4 Testabilidade

- Adapters têm **integration test** (DB real, provider real ou stubbed via `fetch`) em `tests/unit/adapters/` quando contêm lógica não-trivial (OTP, Argon2, slug-generation).
- Wrappers triviais (logger, pure passthrough) **não** precisam de teste próprio — são exercitados pelos integration de service.
- Para testar adapter que faz HTTP (ResendEmailProvider), injetar `fetch` mock via opts.

## §5 Regras de import (gates ESLint)

| Em `src/adapters/**` PODE importar | NÃO PODE importar |
|---|---|
| `@shared/*` (Clock, Result, errors) | `@domain/*` (adapter não conhece domain) |
| libs externas (`pino`, `jose`, `argon2`, `pg` quando for adapter de DB) | `@services/*`, `@routes/*`, `@middleware/*`, `@repositories/*` |
| `node:crypto`, `node:fs` (rare — preferir libs) | `process.env` (gate global; config via opts) |

Gates ativos em `src/adapters/**/*.ts`:
- `layered/no-process-env-outside-config` (global)
- `layered/no-utils-file` (global)
- `layered/no-permissive-stub-in-src` (adapter-scoped)
- `layered/no-adapter-importing-upstream` (adapter-scoped) — bloqueia import de `@services/*`, `@repositories/*`, `@routes/*`, `@middleware/*`. Exceção: `@services/<ctx>/ports/<name>.port` (tipo de port pré-existente) é permitido.

(Sem gate explícito barrando `@domain/*` em `adapters/` ainda — slug-generator usa `InvariantViolation` do domain deliberadamente. Se essa exceção crescer pra mais de 1 adapter, criar gate `layered/no-domain-importing-adapter` na direção inversa OU revisar a decisão.)

## §6 Anti-padrões

- ❌ Declarar interface do adapter em `src/shared/contracts/ports/` — interface mora junto da implementação concreta (forma "Port + impl em arquivos separados" é overhead injustificado pra adapter técnico)
- ❌ Adapter importando outro adapter por categoria diferente (Email importa Crypto) — composition root junta; cada adapter é leaf
- ❌ Adapter importando service ou repository — direção inversa quebra a camada
- ❌ Acessar `process.env` dentro do adapter — config vem via construtor (opts)
- ❌ `new` de cliente HTTP dentro do método (`new ResendClient()` em cada `send`) — cliente vai no construtor ou via `opts.fetch`
- ❌ Estouro de `DomainError` sem motivo de domain (slug é exceção explícita; documentar antes de replicar)
- ❌ Lógica de domínio dentro do adapter — adapter é transporte/wrapping, não decisão de negócio
