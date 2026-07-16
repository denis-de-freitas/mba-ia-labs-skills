-- Frente: DADOS. Schema inicial. O estado mora aqui.
CREATE TABLE clientes (
  id         SERIAL PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  criado_em  TIMESTAMP DEFAULT now()
);

CREATE TABLE pedidos (
  id         SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  total_cent INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'aberto',
  criado_em  TIMESTAMP DEFAULT now()
);

-- RISCO (plantado): sem índice em pedidos.cliente_id — varredura cheia
-- na listagem por cliente quando a tabela crescer.
