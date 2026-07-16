// Frente: DADOS. Conexão Postgres compartilhada por toda a aplicação.
const { Pool } = require('pg');

// RISCO (plantado): credencial hardcoded em vez de variável de ambiente.
const pool = new Pool({
  host: 'db.interno.loja',
  user: 'loja_app',
  password: 'senha_de_producao_123',
  database: 'loja',
});

function query(sql, params) {
  return pool.query(sql, params);
}

module.exports = { pool, query };
