---
name: bad-query-optimizer
description: Otimize queries SQL lentas — acelere uma consulta que já existe e roda devagar no banco. Use sempre que o usuário pedir para otimizar, acelerar, "destravar" ou melhorar a performance de uma query, mesmo num pedido curto tipo "essa query tá lenta, otimiza". Sinais de que é o caso: consulta que demora segundos/minutos, timeout, dashboard ou relatório lento por causa de uma query, seq scan em tabela grande, SELECT com vários JOINs ou GROUP BY pesado, índice faltando, ou análise de EXPLAIN/EXPLAIN ANALYZE e plano de execução (Postgres, MySQL e afins). NÃO use para escrever query nova do zero, explicar/traduzir SQL, corrigir resultado errado/bug de lógica, modelar tabelas, ou fazer profiling de CPU/memória da aplicação — a não ser que o objetivo central seja deixar a consulta mais rápida.
---

# Query optimizer

Esta skill conduz a otimização de performance de uma query SQL **já existente** que está lenta. O objetivo não é "olhar e palpitar", e sim seguir um método baseado em evidência: medir o plano de execução, identificar o gargalo real, aplicar a correção certa para aquele gargalo, e confirmar o ganho medindo de novo.

A regra de ouro: **nunca otimize no escuro.** Lentidão tem causas específicas (full scan, índice ausente, JOIN explodindo linhas, função quebrando índice). Cada causa tem uma correção diferente — chutar índice sem ler o plano costuma não resolver e às vezes piora.

## Fluxo de trabalho

Siga estes passos em ordem. Pule um passo só se a informação já estiver disponível.

### 1. Entenda a query e o contexto
Antes de tocar em qualquer coisa, levante:
- **A query completa** e quais parâmetros/filtros são usados na prática.
- **Banco e versão** (Postgres, MySQL, etc.) — a sintaxe de diagnóstico e os recursos mudam.
- **Tamanho das tabelas** envolvidas (milhares? milhões de linhas?) e quais índices já existem.
- **O sintoma**: demora quanto? É sempre lento ou só com certos filtros/volume? Roda em request, em cron, em relatório?

Se algo essencial faltar (ex: o usuário não colou a query ou o plano), peça — é mais rápido que adivinhar.

### 2. Leia o plano de execução
O plano é a fonte de verdade. Peça ao usuário para rodar, ou monte o comando:
- **Postgres:** `EXPLAIN (ANALYZE, BUFFERS) <query>;`
- **MySQL:** `EXPLAIN ANALYZE <query>;` (ou `EXPLAIN FORMAT=JSON` em versões mais antigas)

No plano, procure os sinais de gargalo:
- **Seq Scan / Full Table Scan** numa tabela grande → provável índice ausente ou índice não utilizável.
- **Nested Loop** com muitas iterações, ou estimativa de linhas muito diferente do real (`rows` estimado vs `actual`) → estatísticas desatualizadas ou JOIN mal indexado.
- **Sort / Hash** caro em disco → `work_mem` insuficiente ou ordenação evitável com índice.
- **Rows Removed by Filter** alto → o índice não está cobrindo o filtro; muita linha lida e jogada fora.
- O **nó mais caro** (maior `actual time` acumulado) é onde focar — otimizar o resto é desperdício.

### 3. Diagnostique contra o checklist de antipadrões
Compare a query com as causas comuns abaixo (`references/antipatterns.md` tem a lista completa com exemplos e correções). Os mais frequentes:

| Sintoma no plano / query | Causa provável | Correção típica |
|---|---|---|
| Seq scan filtrando por coluna | Falta índice no filtro | Índice na(s) coluna(s) do `WHERE`/`JOIN` |
| Índice existe mas não é usado | Função/cast na coluna (`WHERE date(col) = ...`), `LIKE '%x'`, tipo divergente | Reescrever o predicado p/ ser *sargable*; índice de expressão |
| JOIN multiplicando linhas | Falta condição de join ou granularidade errada | Corrigir join; agregar antes de juntar |
| `SELECT *` em tabela larga | Lê colunas/TOAST desnecessárias | Selecionar só as colunas usadas; índice *covering* |
| Paginação com `OFFSET` grande | Banco varre e descarta N linhas | Keyset pagination (`WHERE id > :ultimo`) |
| `COUNT(*)` exato em tabela enorme | Varredura completa | Estimativa via catálogo, ou contagem incremental |
| Subquery correlacionada por linha | Reexecuta por linha do outer | Reescrever como JOIN ou usar `LATERAL`/CTE |

### 4. Proponha a correção e estime o impacto
Para cada gargalo encontrado, entregue:
- **O que mudar** e por quê — conectado ao que o plano mostrou, não a um palpite genérico.
- A **mudança concreta**: o `CREATE INDEX` exato (colunas na ordem certa, parcial/composto se fizer sentido) ou a query reescrita.
- **Trade-offs**: índice acelera leitura mas pesa em escrita e ocupa espaço; um índice por filtro pontual raramente vale a pena. Diga isso.
- Se houver mais de uma causa, **priorize** pela que domina o `actual time` no plano.

### 5. Confirme medindo de novo
Otimização só "vale" se o plano confirmar. Oriente o usuário a rodar o mesmo `EXPLAIN ANALYZE` depois da mudança e comparar: o seq scan virou index scan? O tempo do nó caro caiu? Se não melhorou, volte ao passo 2 — o gargalo era outro.

## Princípios

- **Meça, não adivinhe.** O plano de execução manda; intuição sobre "essa query parece lenta" engana.
- **Ataque o nó dominante.** 90% do tempo costuma estar num único passo. Otimizar o resto é cosmético.
- **Sargabilidade acima de tudo.** Um índice só serve se o predicado conseguir usá-lo. Função na coluna, cast implícito e `LIKE` com curinga à esquerda matam o índice.
- **Índice tem custo.** Não saia criando índice para todo filtro — cada um desacelera `INSERT`/`UPDATE`. Justifique cada um.
- **Não mude o resultado.** Otimização preserva exatamente o conjunto de linhas retornado. Se o objetivo é corrigir resultado errado, isso é outra tarefa (debug de lógica), não esta skill.

## Referências

- `references/antipatterns.md` — catálogo completo de antipadrões de performance com exemplo de query lenta, o que aparece no plano, e a reescrita corrigida. Leia quando o gargalo não for óbvio pelo checklist resumido acima.
