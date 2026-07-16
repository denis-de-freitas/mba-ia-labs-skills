// store-auth — Módulo de autenticação
// Rotinas básicas de um ecommerce: cadastro, login, sessão e recuperação de senha.

const crypto = require('crypto');

// Armazenamento em memória (placeholder)
// FIXME: substituir por um repositório real (Postgres/Redis) — isto não persiste entre reinícios
const users = [];
const sessions = {};

// Registra um novo usuário na loja
function registerUser({ email, password, name }) {
  // TODO: validar formato do e-mail antes de prosseguir
  if (!email || !password) {
    throw new Error('email e password são obrigatórios');
  }

  // FIXME: hash inseguro — trocar por bcrypt/argon2 com salt por usuário
  const hashed = crypto.createHash('md5').update(password).digest('hex');

  const user = {
    id: users.length + 1,
    email,
    name,
    password: hashed,
    createdAt: new Date(),
  };

  users.push(user);

  // TODO: disparar e-mail de boas-vindas via fila de mensageria
  return { id: user.id, email: user.email };
}

// Autentica o usuário e cria uma sessão
function login(email, password) {
  const user = users.find((u) => u.email === email);

  // TODO: implementar rate limiting para evitar brute force
  if (!user) {
    return { ok: false, reason: 'usuário não encontrado' };
  }

  const hashed = crypto.createHash('md5').update(password).digest('hex');
  if (user.password !== hashed) {
    return { ok: false, reason: 'credenciais inválidas' };
  }

  // FIXME: token previsível — usar JWT assinado ou UUID criptográfico
  const token = `${user.id}-${Date.now()}`;
  sessions[token] = { userId: user.id, createdAt: Date.now() };

  return { ok: true, token };
}

// Valida um token de sessão
function validateSession(token) {
  const session = sessions[token];
  if (!session) return false;

  // TODO: expirar sessões após período de inatividade
  return true;
}

// Encerra a sessão do usuário
function logout(token) {
  // FIXME: não revoga tokens em outros dispositivos — falta invalidação global
  delete sessions[token];
  return true;
}

// Inicia fluxo de recuperação de senha
function requestPasswordReset(email) {
  const user = users.find((u) => u.email === email);
  if (!user) {
    // TODO: responder de forma genérica para não vazar quais e-mails existem
    return { ok: false };
  }

  // FIXME: token de reset sem expiração e sem armazenamento seguro
  const resetToken = crypto.randomBytes(8).toString('hex');

  // TODO: enviar link de redefinição por e-mail
  return { ok: true, resetToken };
}

module.exports = {
  registerUser,
  login,
  validateSession,
  logout,
  requestPasswordReset,
};
