import type { Product } from '../../domain/product/product';

export interface ProductView {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

export function toProductView(product: Product): ProductView {
  return {
    id: product.id,
    name: product.name.value,
    description: product.description,
    price: product.price.value,
  };
}
