# Catálogo de antipadrões de performance em SQL

Cada entrada traz: o **sintoma** (no plano ou na query), a **causa**, e a **correção** com exemplo. Use para diagnosticar quando o checklist resumido da SKILL.md não bastar. Exemplos em Postgres; a ideia vale para MySQL com pequenas diferenças de sintaxe.

## Índice

1. [Índice ausente no filtro/join](#1-indice-ausente)
2. [Predicado não-sargable (índice ignorado)](#2-nao-sargable)
3. [SELECT * desnecessário](#3-select-estrela)
4. [Paginação com OFFSET grande](#4-offset)
5. [JOIN que multiplica linhas](#5-join-explode)
6. [Subquery correlacionada](#6-subquery-correlacionada)
7. [COUNT(*) exato em tabela enorme](#7-count)
8. [Ordenação sem índice de apoio](#8-sort)
9. [Estatísticas desatualizadas](#9-estatisticas)
10. [Índice composto na ordem errada](#10-ordem-composto)

---

## 1. Índice ausente no filtro/join <a id="1-indice-ausente"></a>
**Sintoma:** `Seq Scan` numa tabela grande com `Rows Removed by Filter` alto.
**Causa:** não há índice na coluna do `WHERE`/`JOIN`, então o banco lê a tabela inteira.
**Correção:** índice na coluna filtrada. Se o filtro combina colunas, índice composto.
```sql
-- lento: seq scan em pedidos (10M linhas)
SELECT * FROM pedidos WHERE status = 'pendente' AND criado_em > '2026-01-01';
-- correção:
CREATE INDEX idx_pedidos_status_criado ON pedidos (status, criado_em);
```

## 2. Predicado não-sargable (índice existe mas é ignorado) <a id="2-nao-sargable"></a>
**Sintoma:** existe índice na coluna, mas o plano ainda faz seq scan.
**Causa:** função, cast ou curinga à esquerda impedem o uso do índice.
**Correção:** reescrever para que a coluna apareça "limpa" de um lado do operador, ou criar índice de expressão.
```sql
-- mata o índice em criado_em:
WHERE date(criado_em) = '2026-06-26'
-- sargable:
WHERE criado_em >= '2026-06-26' AND criado_em < '2026-06-27'

-- mata o índice (curinga à esquerda):
WHERE nome LIKE '%silva'
-- alternativas: índice trigram (pg_trgm) ou repensar a busca

-- cast implícito por tipo divergente (coluna bigint, parâmetro texto):
WHERE id = '123'   -- force o tipo correto: WHERE id = 123
```

## 3. SELECT * desnecessário <a id="3-select-estrela"></a>
**Sintoma:** tabela com colunas grandes (texto/JSON/TOAST) e só algumas são usadas.
**Causa:** ler todas as colunas traz I/O e impede *index-only scan*.
**Correção:** selecionar apenas as colunas necessárias; considerar índice *covering* (`INCLUDE`).
```sql
SELECT id, total FROM pedidos WHERE cliente_id = 42;
CREATE INDEX idx_pedidos_cliente ON pedidos (cliente_id) INCLUDE (total);
```

## 4. Paginação com OFFSET grande <a id="4-offset"></a>
**Sintoma:** `LIMIT n OFFSET grande` fica mais lento quanto mais avança nas páginas.
**Causa:** o banco gera e descarta todas as linhas até o offset.
**Correção:** keyset pagination — filtrar pelo último valor visto.
```sql
-- lento na página 5000:
SELECT * FROM pedidos ORDER BY id LIMIT 20 OFFSET 100000;
-- keyset:
SELECT * FROM pedidos WHERE id > :ultimo_id_visto ORDER BY id LIMIT 20;
```

## 5. JOIN que multiplica linhas <a id="5-join-explode"></a>
**Sintoma:** resultado tem muito mais linhas que o esperado; agregações inflam.
**Causa:** join numa granularidade que duplica o lado "um" para cada linha do lado "muitos".
**Correção:** agregar antes de juntar, ou corrigir a condição de join.
```sql
-- soma inflada: cada item duplica a linha do pedido
SELECT p.id, SUM(i.valor)
FROM pedidos p JOIN itens i ON i.pedido_id = p.id
GROUP BY p.id;   -- ok aqui, mas cuidado ao juntar 2+ tabelas "muitos"
-- com 2 tabelas de detalhe, pré-agregue cada uma em subquery/CTE antes do join.
```

## 6. Subquery correlacionada <a id="6-subquery-correlacionada"></a>
**Sintoma:** plano mostra subplano reexecutado por linha (`SubPlan`/loops altos).
**Causa:** a subquery referencia a linha externa, rodando uma vez por linha do outer.
**Correção:** reescrever como JOIN, `LATERAL`, ou window function.
```sql
-- correlacionada (roda por cliente):
SELECT c.id, (SELECT MAX(p.criado_em) FROM pedidos p WHERE p.cliente_id = c.id)
FROM clientes c;
-- como join agregado:
SELECT c.id, x.ultimo
FROM clientes c
LEFT JOIN (SELECT cliente_id, MAX(criado_em) ultimo FROM pedidos GROUP BY cliente_id) x
  ON x.cliente_id = c.id;
```

## 7. COUNT(*) exato em tabela enorme <a id="7-count"></a>
**Sintoma:** `COUNT(*)` sem filtro seletivo varre a tabela toda.
**Causa:** contagem exata exige visitar todas as linhas (MVCC no Postgres).
**Correção:** se estimativa basta, usar o catálogo; se precisa exato e frequente, manter contador incremental.
```sql
-- estimativa rápida (Postgres):
SELECT reltuples::bigint FROM pg_class WHERE relname = 'pedidos';
```

## 8. Ordenação sem índice de apoio <a id="8-sort"></a>
**Sintoma:** nó `Sort` caro, às vezes `Sort Method: external merge Disk`.
**Causa:** `ORDER BY` sem índice na ordem pedida; ou `work_mem` baixo forçando disco.
**Correção:** índice que já entregue a ordem (inclui direção), reduzindo/eliminando o sort.
```sql
SELECT * FROM pedidos WHERE cliente_id = 42 ORDER BY criado_em DESC LIMIT 10;
CREATE INDEX idx_pedidos_cliente_criado ON pedidos (cliente_id, criado_em DESC);
```

## 9. Estatísticas desatualizadas <a id="9-estatisticas"></a>
**Sintoma:** no plano, `rows` estimado muito diferente do `actual`; o otimizador escolhe um plano ruim (ex: nested loop onde hash seria melhor).
**Causa:** `ANALYZE` não roda há tempo após muitas mudanças; planner decide com dados velhos.
**Correção:** atualizar estatísticas (e revisar autovacuum/autoanalyze).
```sql
ANALYZE pedidos;
```

## 10. Índice composto na ordem errada <a id="10-ordem-composto"></a>
**Sintoma:** existe índice composto mas o plano não o usa para o filtro.
**Causa:** a ordem das colunas não casa com o uso. Um índice `(a, b)` serve para filtrar por `a` ou `a+b`, mas **não** para filtrar só por `b`.
**Correção:** ordenar as colunas do índice pela seletividade e pelo padrão de acesso (igualdade antes de range).
```sql
-- consultas filtram por status (igualdade) e faixa de data:
CREATE INDEX idx ON pedidos (status, criado_em);  -- igualdade primeiro, range depois
```

---

**Lembrete:** depois de qualquer mudança, rode `EXPLAIN (ANALYZE, BUFFERS)` de novo e confirme que o nó dominante mudou (seq scan → index scan, sort eliminado, etc.). Sem essa confirmação, a "otimização" é só hipótese.
