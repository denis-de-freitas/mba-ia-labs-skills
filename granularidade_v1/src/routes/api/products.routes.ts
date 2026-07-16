import { Hono } from 'hono';
import { z } from 'zod';
import { respond } from '../../shared/http/response';
import type { CreateProductService } from '../../services/product/create-product.service';
import type { ListProductsService } from '../../services/product/list-products.service';

// DTO único deste handler → declarado inline (conventions-route.md §2).
const CreateProductSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
});

export interface ProductRoutesDeps {
  createProduct: CreateProductService;
  listProducts: ListProductsService;
}

export function buildProductRoutes(deps: ProductRoutesDeps): Hono {
  const app = new Hono();

  app.post('/products', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = CreateProductSchema.safeParse(body);
    if (!parsed.success) {
      return respond(c, 400, {
        error: { code: 'VALIDATION_FAILED', message: 'invalid input', details: parsed.error.issues },
      });
    }

    const result = await deps.createProduct.execute({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
    });
    if (!result.ok) throw result.error;

    return respond(c, 201, { data: result.value });
  });

  app.get('/products', async (c) => {
    const result = await deps.listProducts.execute();
    if (!result.ok) throw result.error;

    return respond(c, 200, { data: result.value });
  });

  return app;
}
