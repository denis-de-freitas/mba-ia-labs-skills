import { z } from 'zod';
import { InvalidProductPrice } from '../errors';

// price não pode ser 0 nem negativo → estritamente positivo
const Schema = z.number().finite().positive('product price must be greater than zero');

export class ProductPrice {
  value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(raw: number): ProductPrice {
    const result = Schema.safeParse(raw);
    if (!result.success) {
      throw new InvalidProductPrice(result.error.issues[0]?.message ?? 'invalid');
    }
    return new ProductPrice(result.data);
  }

  static fromTrusted(raw: number): ProductPrice {
    return new ProductPrice(raw);
  }
}
