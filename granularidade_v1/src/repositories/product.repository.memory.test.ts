import { describe, it, expect } from 'vitest';
import { ProductMemoryRepository } from './product.repository.memory';
import { Product } from '../domain/product/product';
import { ProductName } from '../domain/product/value-objects/product-name';
import { ProductPrice } from '../domain/product/value-objects/product-price';

function makeProduct(name: string, price: number): Product {
  return Product.create({
    name: ProductName.create(name),
    price: ProductPrice.create(price),
  });
}

describe('ProductMemoryRepository', () => {
  it('começa vazio', async () => {
    const repo = new ProductMemoryRepository();
    expect(await repo.listAll()).toEqual([]);
  });

  it('persiste e lista produtos', async () => {
    const repo = new ProductMemoryRepository();
    const a = makeProduct('A', 10);
    const b = makeProduct('B', 20);

    await repo.save(a);
    await repo.save(b);

    const all = await repo.listAll();
    expect(all).toHaveLength(2);
    expect(all.map((p) => p.id)).toEqual([a.id, b.id]);
  });

  it('save faz upsert por id (não duplica)', async () => {
    const repo = new ProductMemoryRepository();
    const product = makeProduct('Original', 10);
    await repo.save(product);
    await repo.save(product);

    expect(await repo.listAll()).toHaveLength(1);
  });

  it('listAll devolve cópia — mutar o retorno não afeta a store', async () => {
    const repo = new ProductMemoryRepository();
    await repo.save(makeProduct('A', 10));

    const snapshot = await repo.listAll();
    snapshot.pop();

    expect(await repo.listAll()).toHaveLength(1);
  });
});
