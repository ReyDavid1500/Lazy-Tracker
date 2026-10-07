---
description: Rules and patterns for creating NestJS middleware. Apply when adding or modifying middleware in any app or shared library.
globs: apps/**/middleware/**,libs/**/middleware/**
alwaysApply: false
---

## Middleware Pattern

NestJS middleware handles cross-cutting concerns (request ID, audit context, auth headers). They live in `/src/modules/[module]/middleware/`.

### Structure

```typescript
@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  constructor(
    private readonly auditContextService: AuditContextService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction) {
    this.auditContextService.setContext({
      userId: req.headers['x-user-id'] as string,
      endpoint: `${req.method} ${req.path}`,
    });
    next();
  }
}
```

### Registration

Register in a module via `configure(consumer: MiddlewareConsumer)`. Apply to specific routes or globally:

```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuditContextMiddleware, RequestCacheMiddleware)
      .forRoutes('*');
  }
}
```

### Context storage

Store cross-cutting state in a dedicated context service using AsyncLocalStorage — **never** attach it to the request object:

```typescript
@Injectable()
export class AuditContextService {
  readonly #storage = new AsyncLocalStorage<AuditContext>();

  setContext(context: AuditContext): void {
    this.#storage.enterWith(context);
  }

  getContext(): AuditContext | undefined {
    return this.#storage.getStore();
  }
}
```

### Shared middlewares

| Library | Middleware | Purpose |
|---|---|---|
| `@lib/audit` | `AuditContextMiddleware` | userId, email, requestOrigin, traceability chain |
| `@lib/request-cache` | `RequestCacheMiddleware` | requestId, cache-skip header |

Import the lib module and register its middleware — do not re-implement it per app.

### Rules

- Always call `next()` — never leave a request hanging.
- Use `_res` (underscore prefix) when the response parameter is unused.
- Never put business logic in middleware — only context extraction and storage.
- Shared middlewares belong in `libs/` — never copy them into an app.
- Order matters: register `RequestCacheMiddleware` before `AuditContextMiddleware`.
