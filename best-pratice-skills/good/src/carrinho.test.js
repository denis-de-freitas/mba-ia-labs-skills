import { totalCarrinho, aplicarCupom } from './carrinho';

describe('totalCarrinho', () => {
  it('deve retornar 0 quando o carrinho está vazio', () => {
    expect(totalCarrinho([])).toBe(0);
  });

  it('deve retornar 0 quando os itens são nulos', () => {
    expect(totalCarrinho(null)).toBe(0);
    expect(totalCarrinho(undefined)).toBe(0);
  });

  it('deve somar preço por quantidade de um único item', () => {
    expect(totalCarrinho([{ preco: 10, qtd: 2 }])).toBe(20);
  });

  it('deve somar preço por quantidade de múltiplos itens', () => {
    const itens = [
      { preco: 10, qtd: 2 },
      { preco: 5, qtd: 3 },
    ];
    expect(totalCarrinho(itens)).toBe(35);
  });
});

describe('aplicarCupom', () => {
  it('deve retornar o total sem alteração quando não há cupom', () => {
    expect(aplicarCupom(100, null)).toBe(100);
    expect(aplicarCupom(100, undefined)).toBe(100);
  });

  it('deve retornar o total sem alteração quando o cupom não tem percentual', () => {
    expect(aplicarCupom(100, {})).toBe(100);
  });

  it('deve aplicar o desconto percentual do cupom', () => {
    expect(aplicarCupom(100, { percentual: 10 })).toBe(90);
  });

  it('deve zerar o total quando o cupom é de 100 por cento', () => {
    expect(aplicarCupom(100, { percentual: 100 })).toBe(0);
  });
});
