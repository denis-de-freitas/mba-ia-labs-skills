import { describe, it, expect } from 'vitest';
import { ProductName } from './product-name';
import { InvalidProductName } from '../errors';

describe('ProductName', () => {
  it('cria com um nome válido', () => {
    const name = ProductName.create('Teclado Mecânico');
    expect(name.value).toBe('Teclado Mecânico');
  });

  it('faz trim do nome', () => {
    const name = ProductName.create('  Mouse  ');
    expect(name.value).toBe('Mouse');
  });

  it('rejeita nome vazio', () => {
    expect(() => ProductName.create('')).toThrow(InvalidProductName);
  });

  it('rejeita nome só com espaços', () => {
    expect(() => ProductName.create('   ')).toThrow(InvalidProductName);
  });

  it('fromTrusted não valida', () => {
    const name = ProductName.fromTrusted('');
    expect(name.value).toBe('');
  });
});
