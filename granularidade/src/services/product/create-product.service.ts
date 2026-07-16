import type { ProductRepository } from '../../domain/product/product.repository';
import { Product } from '../../domain/product/product';
import { ProductName } from '../../domain/product/value-objects/product-name';
import { ProductPrice } from '../../domain/product/value-objects/product-price';
import type { Logger } from '../../shared/logger';
import { type Result, ok } from '../../shared/result';
import { toProductView, type ProductView } from './product.view';

export class CreateProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: {
    name: string;
    description?: string | null;
    price: number;
  }): Promise<Result<ProductView, never>> {
    // input já chega validado na borda (Zod da route); VOs garantem a invariante.
    const product = Product.create({
      name: ProductName.create(input.name),
      price: ProductPrice.create(input.price),
      description: input.description ?? null,
    });

    await this.productRepo.save(product);

    this.logger.info({ event: 'product_created', productId: product.id }, 'product created');

    return ok(toProductView(product));
  }
}
