import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type Success<T> = { data: T };
export type Failure = { error: { code: string; message: string; details?: unknown } };
export type Envelope<T> = Success<T> | Failure;

export function respond<T>(c: Context, status: number, body: Envelope<T>): Response {
  return c.json(body, status as ContentfulStatusCode);
}
