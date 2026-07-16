import type { Product } from './product';

export interface ProductRepository {
  save(product: Product): Promise<void>;
  listAll(): Promise<Product[]>;
}
