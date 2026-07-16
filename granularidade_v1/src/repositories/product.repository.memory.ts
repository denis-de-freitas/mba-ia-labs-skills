import { Product } from '../domain/product/product';
import type { ProductRepository } from '../domain/product/product.repository';

/**
 * Implementação em memória da porta ProductRepository.
 *
 * Desvio autorizado de conventions-repository.md §1 (pg/Drizzle): store em
 * memória (array), conforme decisão de produto. Mantém o contrato da porta
 * (`implements` explícito) e não vaza estrutura interna — `listAll` devolve
 * cópia. Sem `toEntity`/row mapping porque a store guarda a própria entity.
 */
export class ProductMemoryRepository implements ProductRepository {
  private readonly products: Product[] = [];

  async save(product: Product): Promise<void> {
    const index = this.products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      this.products[index] = product;
    } else {
      this.products.push(product);
    }
  }

  async listAll(): Promise<Product[]> {
    return [...this.products];
  }
}
