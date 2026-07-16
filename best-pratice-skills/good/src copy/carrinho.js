// Fonte limpo, mas SEM teste — alvo da skill gerar-testes na demo.
export function totalCarrinho(itens) {
  if (!itens || itens.length === 0) return 0;
  return itens.reduce((soma, i) => soma + i.preco * i.qtd, 0);
}

export function aplicarCupom(total, cupom) {
  if (cupom && cupom.percentual) return total * (1 - cupom.percentual / 100);
  return total;
}
