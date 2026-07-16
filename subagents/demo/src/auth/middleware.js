// Frente: AUTH & SEGURANÇA. Middleware global aplicado em server.js.
// Valida um Bearer token estático vindo do header Authorization.

// RISCO (plantado): token comparado em texto puro e lido de um default
// inseguro quando a env não está setada.
const API_TOKEN = process.env.API_TOKEN || 'dev-token';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (token !== API_TOKEN) {
    return res.status(401).json({ erro: 'não autorizado' });
  }
  // RISCO (plantado): não há diferenciação de papéis/escopos — token único
  // dá acesso total a todas as rotas.
  req.cliente = { autenticado: true };
  next();
}

module.exports = { requireAuth };
