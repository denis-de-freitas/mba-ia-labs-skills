import { describe, it, expect } from 'vitest';
import { ProductPrice } from './product-price';
import { InvalidProductPrice } from '../errors';

describe('ProductPrice', () => {
  it('cria com um preço positivo', () => {
    const price = ProductPrice.create(99.9);
    expect(price.value).toBe(99.9);
  });

  it('rejeita preço zero', () => {
    expect(() => ProductPrice.create(0)).toThrow(InvalidProductPrice);
  });

  it('rejeita preço negativo', () => {
    expect(() => ProductPrice.create(-1)).toThrow(InvalidProductPrice);
  });

  it('rejeita NaN', () => {
    expect(() => ProductPrice.create(Number.NaN)).toThrow(InvalidProductPrice);
  });

  it('rejeita Infinity', () => {
    expect(() => ProductPrice.create(Number.POSITIVE_INFINITY)).toThrow(InvalidProductPrice);
  });

  it('fromTrusted não valida', () => {
    const price = ProductPrice.fromTrusted(0);
    expect(price.value).toBe(0);
  });
});
