import { describe, it, expect } from 'vitest';
import { ListProductsService } from './list-products.service';
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

describe('ListProductsService', () => {
  it('retorna lista vazia quando não há produtos', async () => {
    const result = await new ListProductsService(new FakeProductRepository()).execute();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it('lista os produtos criados como views, na ordem de inserção', async () => {
    const repo = new FakeProductRepository();
    const create = new CreateProductService(repo, silentLogger);
    await create.execute({ name: 'A', price: 1 });
    await create.execute({ name: 'B', price: 2 });

    const result = await new ListProductsService(repo).execute();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value.map((p) => p.name)).toEqual(['A', 'B']);
    }
  });
});
