// Frente: ARQUITETURA (camada de rota). Liga HTTP -> service.
const { Router } = require('express');
const { criarPedido, listarPorCliente } = require('../services/pedido');

const router = Router();

router.get('/', async (req, res) => {
  const pedidos = await listarPorCliente(req.query.cliente_id);
  res.json(pedidos);
});

router.post('/', async (req, res) => {
  const pedido = await criarPedido(req.body);
  res.status(201).json(pedido);
});

module.exports = router;
