import type { Context, Next } from 'hono';
import { ApplicationError } from '../shared/errors/application-error';
import { respond } from '../shared/http/response';
import type { Logger } from '../shared/logger';

/**
 * Middleware central de erros (conventions-route.md §5/§6).
 * ApplicationError → status próprio; qualquer outro (incl. DomainError) → 500.
 */
export function errorHandler(deps: { logger: Logger }) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    try {
      await next();
    } catch (e) {
      if (e instanceof ApplicationError) {
        return respond(c, e.status, { error: { code: e.code, message: e.message } });
      }
      deps.logger.error(
        { event: 'unhandled_error', err: e instanceof Error ? e.message : String(e) },
        'unhandled error',
      );
      return respond(c, 500, { error: { code: 'INTERNAL_ERROR', message: 'internal server error' } });
    }
  };
}
