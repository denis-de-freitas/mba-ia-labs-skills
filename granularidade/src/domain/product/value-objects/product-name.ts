import { z } from 'zod';
import { InvalidProductName } from '../errors';

const Schema = z.string().trim().min(1, 'product name is required').max(120);

export class ProductName {
  value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): ProductName {
    const result = Schema.safeParse(raw);
    if (!result.success) {
      throw new InvalidProductName(result.error.issues[0]?.message ?? 'invalid');
    }
    return new ProductName(result.data);
  }

  static fromTrusted(raw: string): ProductName {
    return new ProductName(raw);
  }
}
