import { randomUUID } from 'node:crypto';
import { ProductName } from './value-objects/product-name';
import { ProductPrice } from './value-objects/product-price';

export class Product {
  id: string;
  name: ProductName;
  description: string | null;
  price: ProductPrice;

  private constructor(props: {
    id: string;
    name: ProductName;
    description: string | null;
    price: ProductPrice;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.price = props.price;
  }

  static create(input: {
    name: ProductName;
    price: ProductPrice;
    description?: string | null;
  }): Product {
    return new Product({
      id: randomUUID(),
      name: input.name,
      price: input.price,
      description: input.description ?? null,
    });
  }

  static fromRow(row: {
    id: string;
    name: string;
    description: string | null;
    price: number;
  }): Product {
    return new Product({
      id: row.id,
      name: ProductName.fromTrusted(row.name),
      description: row.description,
      price: ProductPrice.fromTrusted(row.price),
    });
  }
}
