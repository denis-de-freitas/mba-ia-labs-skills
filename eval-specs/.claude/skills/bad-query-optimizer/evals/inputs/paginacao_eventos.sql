-- Banco: MySQL 8.0
-- Tabela eventos: ~50 milhões de linhas
-- Índices existentes:
--   PRIMARY KEY (id)
-- A API lista eventos paginados de 20 em 20. As primeiras páginas voam,
-- mas a partir da página ~100 mil a resposta passa de 6 segundos.
-- Esta é a query que a API monta para a página N (offset = (N-1)*20):

SELECT id, usuario_id, tipo, payload, criado_em
FROM eventos
ORDER BY id
LIMIT 20 OFFSET 2000000;

-- EXPLAIN ANALYZE (resumido):
-- -> Limit: 20 row(s)  (actual time=5980..5980 rows=20)
--     -> Index scan on eventos using PRIMARY  (actual time=0.05..5210 rows=2000020)
--
-- O banco varre 2.000.020 linhas pela PK e joga fora 2.000.000 antes de
-- devolver as 20 da página. Quanto mais fundo a página, pior fica.
