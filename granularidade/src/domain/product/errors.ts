import { DomainError } from '../errors';

export class InvalidProductName extends DomainError {
  constructor(reason: string) {
    super(`invalid product name: ${reason}`, 'INVALID_PRODUCT_NAME');
  }
}

export class InvalidProductPrice extends DomainError {
  constructor(reason: string) {
    super(`invalid product price: ${reason}`, 'INVALID_PRODUCT_PRICE');
  }
}
