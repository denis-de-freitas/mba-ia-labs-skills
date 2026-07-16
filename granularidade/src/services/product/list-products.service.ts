import type { ProductRepository } from '../../domain/product/product.repository';
import { type Result, ok } from '../../shared/result';
import { toProductView, type ProductView } from './product.view';

export class ListProductsService {
  constructor(private readonly productRepo: ProductRepository) {}

  async execute(): Promise<Result<ProductView[], never>> {
    const products = await this.productRepo.listAll();
    return ok(products.map(toProductView));
  }
}
