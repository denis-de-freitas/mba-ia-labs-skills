import { describe, it, expect } from 'vitest';
import { Product } from './product';
import { ProductName } from './value-objects/product-name';
import { ProductPrice } from './value-objects/product-price';

describe('Product', () => {
  it('cria um produto com id gerado e campos preenchidos', () => {
    const product = Product.create({
      name: ProductName.create('Notebook'),
      price: ProductPrice.create(4500),
      description: 'Ultrafino',
    });

    expect(product.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(product.name.value).toBe('Notebook');
    expect(product.price.value).toBe(4500);
    expect(product.description).toBe('Ultrafino');
  });

  it('description é opcional → vira null quando ausente', () => {
    const product = Product.create({
      name: ProductName.create('Cadeira'),
      price: ProductPrice.create(800),
    });

    expect(product.description).toBeNull();
  });

  it('gera ids distintos para produtos diferentes', () => {
    const a = Product.create({ name: ProductName.create('A'), price: ProductPrice.create(1) });
    const b = Product.create({ name: ProductName.create('B'), price: ProductPrice.create(1) });
    expect(a.id).not.toBe(b.id);
  });

  it('fromRow reidrata sem validar', () => {
    const product = Product.fromRow({
      id: 'fixed-id',
      name: 'Monitor',
      description: null,
      price: 1200,
    });

    expect(product.id).toBe('fixed-id');
    expect(product.name.value).toBe('Monitor');
    expect(product.price.value).toBe(1200);
    expect(product.description).toBeNull();
  });
});
