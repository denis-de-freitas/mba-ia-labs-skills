import { Hono } from 'hono';
import { ProductMemoryRepository } from './repositories/product.repository.memory';
import { CreateProductService } from './services/product/create-product.service';
import { ListProductsService } from './services/product/list-products.service';
import { buildProductRoutes } from './routes/api/products.routes';
import { errorHandler } from './middleware/error-handler';
import { consoleLogger } from './shared/logger';

// Composition root (conventions-route.md §6): instancia repos/services e monta as rotas.
export function buildApp(): Hono {
  const logger = consoleLogger;
  const productRepo = new ProductMemoryRepository();

  const createProduct = new CreateProductService(productRepo, logger);
  const listProducts = new ListProductsService(productRepo);

  const app = new Hono();
  app.use('*', errorHandler({ logger }));
  app.route('/api/v1', buildProductRoutes({ createProduct, listProducts }));
  return app;
}

export const app = buildApp();
