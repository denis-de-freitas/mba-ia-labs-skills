## DESCRIPTION

PROMPT GERADOR DE DESCRIPTION

Você escreve a `description` de uma skill — é um CLASSIFICADOR que decide se a
skill dispara, não documentação.

Entrada:
- O que a skill faz:
Gera uma mensagem de commit descritiva analisando o git diff. É acionada quando o usuário pede ajuda para escrever mensagens de commit, revisar mensagens de commit ou revisar mudanças no stage (staged changes).

- O que ela produz:
Uma mensagem de commit no formato Conventional Commits — tipo(escopo): descrição. Por exemplo:
- Added user authentication with JWT tokens → feat(auth): add JWT token-based user authentication
- Fixed bug in payment processing → fix(payment): resolve bug in payment processing
- Updated README with installation instructions → docs(readme): update installation instructions in README


Gere a description na fórmula de 4 partes, em frase corrida (folded scalar),
≤ 1536 caracteres:
1. Quando usar
2. Gatilhos concretos entre aspas — 4 a 6 frases que um usuário REALMENTE
   digitaria
3. Quando NÃO usar → cite a skill vizinha pelo nome
4. O que produz

Regras: verbos de ação; nada de "helps with"/marketing; não repita o nome da
skill; gatilhos realistas. Devolva só o bloco YAML da description.


----

Objetivo: melhorar uma description MEDINDO, não opinando.

PASSO 1 — Conjunto de teste (monte uma vez):
- 8 pedidos que DEVEM disparar (positivos, fraseados de formas variadas)
- 8 que NÃO devem: 4 da skill vizinha, 2 "quase-mas-não", 2 triviais
Separe 60% para treino e 40% para teste (held-out).

PASSO 2 — Pontue a description ATUAL no conjunto de TREINO:
para cada pedido, decida SÓ pela description se a skill dispararia (SIM/NÃO).
Compare com o gabarito. Liste os ERROS: falso-positivo (disparou e não devia)
e falso-negativo (não disparou e devia).

PASSO 3 — Reestruture mirando os erros:
- falso-negativo → adicione gatilho / clareza no "quando usar"
- falso-positivo → aperte a fronteira / reforce o "NÃO use"
Mude só o necessário.

PASSO 4 — Repontue a nova versão nos MESMOS itens de treino.
Subiu → adota. Não subiu → descarta e tenta outro ajuste.
Repita até 3 iterações sem ganho, ou acerto total.

PASSO 5 — Só no fim, pontue a melhor versão no conjunto de TESTE (held-out).
Esse é o número honesto — evita "decorar" os 16 do treino.

Devolva: tabela iteração × score, a melhor description, e os casos ainda
errados no teste.