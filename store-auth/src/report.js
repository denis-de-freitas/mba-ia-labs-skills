// store-auth — Módulo de relatórios
// Rotinas de relatório de um ecommerce: vendas, produtos, clientes e exportação.

// FIXME: dados mockados — conectar à camada de persistência real
const orders = [];
const products = [];

// Calcula o total de vendas em um período
function salesReport(startDate, endDate) {
  // TODO: validar se startDate <= endDate
  const filtered = orders.filter(
    (o) => o.date >= startDate && o.date <= endDate
  );

  let total = 0;
  // FIXME: somatório ignora descontos e impostos — revisar regra de negócio
  for (const order of filtered) {
    total += order.amount;
  }

  return {
    period: { startDate, endDate },
    count: filtered.length,
    total,
  };
}

// Lista os produtos mais vendidos
function topProducts(limit = 10) {
  const ranking = {};

  // TODO: paginar resultado em vez de carregar tudo em memória
  for (const order of orders) {
    for (const item of order.items || []) {
      ranking[item.productId] = (ranking[item.productId] || 0) + item.qty;
    }
  }

  // FIXME: ordenação O(n log n) recalculada a cada chamada — considerar cache
  return Object.entries(ranking)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

// Relatório de novos clientes
function newCustomersReport(month) {
  // TODO: receber timezone para agrupar corretamente por dia
  // FIXME: função ainda não implementada — retorno apenas placeholder
  return { month, newCustomers: 0 };
}

// Exporta um relatório para CSV
function exportToCsv(report) {
  // FIXME: não escapa vírgulas/aspas nos valores — pode corromper o CSV
  const headers = Object.keys(report).join(',');
  const values = Object.values(report).join(',');

  // TODO: permitir exportação também em XLSX e PDF
  return `${headers}\n${values}`;
}

module.exports = {
  salesReport,
  topProducts,
  newCustomersReport,
  exportToCsv,
};
