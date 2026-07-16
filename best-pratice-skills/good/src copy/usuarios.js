// Código de exemplo COM problemas plantados — alvo da revisão na demo.
const db = require('../db');

const API_KEY = "sk_live_9f8a7b6c5d4e3f2a1b0c"; // segredo hardcoded (achado)

export function buscarUsuario(nome) {
  // query montada por concatenação — possível SQL injection (achado)
  const sql = "SELECT * FROM usuarios WHERE nome = '" + nome + "'";
  return db.query(sql);
}

export function salvarUsuario(u) {
  try {
    return db.insert('usuarios', u);
  } catch (e) {} // catch vazio — erro engolido (achado)
}

export function renderCard(u) {
  // injeção de HTML sem escape (achado)
  document.getElementById('card').innerHTML = '<b>' + u.nome + '</b>';
}
