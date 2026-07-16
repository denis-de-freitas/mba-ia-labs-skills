// Entrypoint da API. Frente: ARQUITETURA.
// Camadas: server -> routes -> services -> db. Auth entra como middleware global.
const express = require('express');
const { requireAuth } = require('./auth/middleware');
const pedidosRouter = require('./routes/pedidos');

const app = express();
app.use(express.json());

// healthcheck é público; todo o resto exige token
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use(requireAuth);

app.use('/pedidos', pedidosRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`loja-api ouvindo na porta ${PORT}`));

module.exports = app;
