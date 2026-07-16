import { describe, it, expect } from 'vitest';
import { buildApp } from '../../main';

const jsonHeaders = { 'content-type': 'application/json' };

function post(app: ReturnType<typeof buildApp>, body: unknown) {
  return app.request('/api/v1/products', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

describe('product routes', () => {
  it('POST /api/v1/products cria um produto (201)', async () => {
    const app = buildApp();
    const res = await post(app, { name: 'Teclado', description: 'RGB', price: 250 });

    expect(res.status).toBe(201);
    const json = (await res.json()) as { data: { id: string; name: string; price: number } };
    expect(json.data.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(json.data.name).toBe('Teclado');
    expect(json.data.price).toBe(250);
  });

  it('GET /api/v1/products lista os produtos criados', async () => {
    const app = buildApp();
    await post(app, { name: 'A', price: 10 });
    await post(app, { name: 'B', price: 20 });

    const res = await app.request('/api/v1/products');
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: Array<{ name: string }> };
    expect(json.data).toHaveLength(2);
    expect(json.data.map((p) => p.name)).toEqual(['A', 'B']);
  });

  it('POST sem name → 400 VALIDATION_FAILED', async () => {
    const app = buildApp();
    const res = await post(app, { price: 10 });

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe('VALIDATION_FAILED');
  });

  it('POST com price 0 → 400 (invariante price > 0 barrado na borda)', async () => {
    const app = buildApp();
    const res = await post(app, { name: 'X', price: 0 });

    expect(res.status).toBe(400);
  });
});
