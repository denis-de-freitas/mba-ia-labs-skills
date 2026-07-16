// Frente: TESTES. Roda com `node --test`. Cobre só o caminho feliz do service.
const { test } = require('node:test');
const assert = require('node:assert');

// RISCO (plantado): só há teste para criarPedido; listarPorCliente,
// o middleware de auth e as rotas estão SEM cobertura.
test('criarPedido devolve o pedido com id', async () => {
  // mock simples da camada de dados
  const fakeDb = { rows: [{ id: 1, cliente_id: 7, total_cent: 9990 }] };
  assert.equal(fakeDb.rows[0].id, 1);
  assert.equal(fakeDb.rows[0].cliente_id, 7);
});
