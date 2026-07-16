-- Banco: PostgreSQL 15 (produção)
-- Tabela pedidos: ~25 milhões de linhas, cresce uns 80k/dia
-- Índices existentes:
--   pedidos_pkey (id)
--   idx_pedidos_criado_em (criado_em)
-- A query alimenta o relatório de faturamento do mês e demora ~12s.

SELECT cliente_id, COUNT(*) AS qtd, SUM(total) AS faturamento
FROM pedidos
WHERE date(criado_em) >= '2026-06-01'
  AND date(criado_em) <= '2026-06-30'
  AND status = 'pago'
GROUP BY cliente_id
ORDER BY faturamento DESC;

-- Saída do EXPLAIN (ANALYZE, BUFFERS):
--
-- Sort  (cost=1.2M..1.2M rows=120000 width=20) (actual time=11980..11990 rows=98412)
--   Sort Key: (sum(total)) DESC
--   Sort Method: external merge  Disk: 4200kB
--   ->  HashAggregate  (actual time=11200..11500 rows=98412)
--         Group Key: cliente_id
--         ->  Seq Scan on pedidos  (actual time=0.3..9800 rows=812334)
--               Filter: ((status = 'pago') AND (date(criado_em) >= '2026-06-01') AND (date(criado_em) <= '2026-06-30'))
--               Rows Removed by Filter: 24187666
-- Planning Time: 0.4 ms
-- Execution Time: 12010 ms
