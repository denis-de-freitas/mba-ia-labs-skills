-- Banco: PostgreSQL 14
-- Tabela clientes: ~2 milhões de linhas
-- Tabela pedidos:  ~30 milhões de linhas
-- Índices existentes:
--   clientes_pkey (id)
--   pedidos_pkey  (id)
--   idx_pedidos_cliente (cliente_id)
-- Tela de CRM lista clientes ativos com a data do último pedido.
-- Roda em request e demora ~9s para 2M de clientes.

SELECT c.id,
       c.nome,
       (SELECT MAX(p.criado_em)
          FROM pedidos p
         WHERE p.cliente_id = c.id) AS ultimo_pedido
FROM clientes c
WHERE c.ativo = true
ORDER BY c.nome;

-- EXPLAIN ANALYZE (resumido):
-- -> Sort (actual time=8900..9050 rows=1850000)
--     Sort Key: c.nome
--     -> Seq Scan on clientes c (actual time=0.2..120 rows=1850000)
--          Filter: ativo
--     SubPlan 1
--       -> Aggregate (actual time=0.004..0.004 rows=1 loops=1850000)
--            -> Index Scan using idx_pedidos_cliente on pedidos p
--                 Index Cond: (cliente_id = c.id)
-- Execution Time: 9120 ms
--
-- Obs: o SubPlan roda 1.850.000 vezes (uma vez por cliente).
