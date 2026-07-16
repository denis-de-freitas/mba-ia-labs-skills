// Frente: ARQUITETURA (camada de serviço) + toca DADOS.
const { query } = require('../db/connection');

async function criarPedido({ cliente_id, total_cent }) {
  const { rows } = await query(
    'INSERT INTO pedidos (cliente_id, total_cent) VALUES ($1, $2) RETURNING *',
    [cliente_id, total_cent],
  );
  return rows[0];
}

async function listarPorCliente(clienteId) {
  // usa query parametrizada (bom) — mas sem índice no banco (ver migration)
  const { rows } = await query(
    'SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY criado_em DESC',
    [clienteId],
  );
  return rows;
}

module.exports = { criarPedido, listarPorCliente };
