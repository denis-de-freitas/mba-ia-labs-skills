import { describe, it, expect } from 'vitest';
import { CreateProductService } from './create-product.service';
import type { ProductRepository } from '../../domain/product/product.repository';
import type { Product } from '../../domain/product/product';
import type { Logger } from '../../shared/logger';

class FakeProductRepository implements ProductRepository {
  saved: Product[] = [];
  async save(product: Product): Promise<void> {
    this.saved.push(product);
  }
  async listAll(): Promise<Product[]> {
    return [...this.saved];
  }
}

const silentLogger: Logger = { info() {}, warn() {}, error() {} };

describe('CreateProductService', () => {
  it('cria e persiste um produto, retornando a view', async () => {
    const repo = new FakeProductRepository();
    const service = new CreateProductService(repo, silentLogger);

    const result = await service.execute({ name: 'Teclado', description: 'RGB', price: 250 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.value.name).toBe('Teclado');
      expect(result.value.description).toBe('RGB');
      expect(result.value.price).toBe(250);
    }
    expect(repo.saved).toHaveLength(1);
  });

  it('description ausente vira null', async () => {
    const repo = new FakeProductRepository();
    const service = new CreateProductService(repo, silentLogger);

    const result = await service.execute({ name: 'Mouse', price: 100 });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.description).toBeNull();
  });

  it('loga o evento product_created', async () => {
    const repo = new FakeProductRepository();
    const events: unknown[] = [];
    const logger: Logger = { info: (o) => events.push(o.event), warn() {}, error() {} };
    const service = new CreateProductService(repo, logger);

    await service.execute({ name: 'Webcam', price: 300 });

    expect(events).toContain('product_created');
  });
});
