---
name: analizador-de-chamado
description: Refina o texto bruto de um chamado/ocorrência e o converte em um JSON padronizado (id de atendimento, origem e ID do chamado, data da ocorrência, data de cadastro, canal, tipo e MCI do cliente, CPF/CNPJ, descrição, indicador de evidência e dados da análise no Holmes, como CorrelationID, ocorrência, operação e versões do app/SO) para uso como fonte de pesquisa e base de conhecimento do time. Use sempre que o usuário colar ou descrever um chamado, ticket, relato do suporte de 1º nível, SAC ou erro reportado por funcionário (mesmo sem chamado formal), ou pedir para "analisar", "padronizar", "estruturar", "refinar" ou "cadastrar" um chamado/ocorrência, mesmo que não mencione JSON. Se faltarem dados, a skill pergunta no chat antes de gerar a saída e, ao final, oferece registrar o atendimento como issue no Linear.
---

# Analisador de Chamado

Transforma um relato de erro, vindo de qualquer origem (sistema de tickets, suporte N1, SAC, funcionário sem chamado aberto), em um JSON padronizado. O time usa esse JSON como base de conhecimento, então cada campo precisa ser confiável: é melhor perguntar do que inventar.

## Fluxo

1. **Extrair** do texto recebido o que for possível para cada campo abaixo.
2. **Identificar lacunas**: campos obrigatórios que o texto não informa nem permite inferir com segurança.
3. **Perguntar no chat** somente o que falta, numa única mensagem com lista numerada curta. Não pergunte o que já está no texto nem o que tem regra de preenchimento automático (`id-atendimento`, `data-cadastro`, `codigo-receita-federal` ausente).
4. **Reavaliar após cada resposta**: confira de novo quais campos faltam, inclusive os opcionais do Holmes que passaram a se aplicar com as respostas dadas (ver "Objeto `holmes`"). Se houver, volte ao passo 3 com uma nova rodada de perguntas.
5. **Gerar o JSON** só quando nenhuma pergunta aplicável estiver pendente. Entregue o bloco JSON (em ```json), seguido de, no máximo, uma linha avisando o que foi inferido, se algo foi.

## Campos

| Campo | Regra |
|---|---|
| `id-atendimento` | Identificador único desta saída, no padrão `ATD-xxxxx` (5 dígitos). Gere sempre um novo, sem perguntar: `printf 'ATD-%05d\n' "$(shuf -i 0-99999 -n 1)"`. Nunca reaproveite o de um JSON anterior, nem mesmo ao refazer o mesmo chamado. |
| `origem` | De onde veio o chamado: `"INTERNO-SEM-CHAMADO"` (funcionário relatando o problema, sem chamado aberto), `"INC"` (sistema de incidentes da empresa), `"RESOLVE"` (sistema de chamados do cliente), `"ATENDE"` (ouvidoria) ou `"UR"` (chamados de funcionário de rua). Deduza quando o texto citar o sistema ou trouxer um ticket claramente de um deles; se não estiver claro, pergunte listando as cinco opções. |
| `id-chamado` | Número/código do ticket na origem. Presente para `INC`, `RESOLVE`, `ATENDE` e `UR`; se a origem for um desses e o ID não veio, pergunte. Para `INTERNO-SEM-CHAMADO` **omita a chave**, pois não existe ticket. |
| `data-ocorrencia` | Quando o erro aconteceu, `DD-MM-YYYY HH:MM` (24h). Datas relativas ("ontem às 8h") são resolvidas a partir da data atual. Se faltar data ou hora, pergunte. |
| `data-cadastro` | Data e hora **atuais** no mesmo formato. Obtenha com `date '+%d-%m-%Y %H:%M'`; nunca pergunte nem estime. |
| `canal` | `"WEB"` ou `"MOBILE"`: meio em que o cliente estava quando o erro ocorreu. App, celular, Android/iOS => MOBILE; navegador, site, internet banking => WEB. Se ambíguo, pergunte. |
| `tipo-cliente` | `"PF"` ou `"PJ"`. Pode ser deduzido de CPF (11 dígitos) ou CNPJ (14 dígitos); caso contrário, pergunte. |
| `mci-cliente` | Código numérico do cliente, como **número** JSON (sem aspas). Se não vier no texto, pergunte. |
| `codigo-receita-federal` | CPF ou CNPJ, só dígitos, como string. Use `"NAO-INFORMADO"` quando não houver na abertura do chamado; não pergunte por ele insistentemente: uma única menção ao perguntar o MCI basta, e se o usuário disser que não tem, use `NAO-INFORMADO`. |
| `descricao` | Resumo objetivo do ocorrido: o que o cliente tentava fazer, o que aconteceu e a mensagem de erro literal entre aspas simples, se houver. Remova saudações, ruído, opiniões e dados pessoais desnecessários (senhas, números de cartão completos). Uma ou duas frases, pensadas para quem vai pesquisar depois. |
| `tem-evidencia` | `true` se há ou haverá arquivos anexos (print, log, vídeo, PDF) como evidência; `false` caso contrário. Se o texto não deixa claro, pergunte. |
| `tem-analise-holmes` | Indica se há evidência na ferramenta Holmes. String `"TRUE"`, `"FALSE"` ou `"NAO-INFORMADO"` (use este último quando o relator não sabe dizer). Se o texto traz link ou dados do Holmes, é `"TRUE"` sem perguntar; senão, pergunte. |
| `holmes` | Objeto presente **somente** quando `tem-analise-holmes` é `"TRUE"`; nos demais casos omita a chave. Campos na tabela abaixo. |

### Objeto `holmes`

Só `url-holmes` é obrigatório quando há Holmes; os demais são opcionais, mas devem ser **perguntados** (ver abaixo) e entram no JSON apenas quando o valor for conhecido. Não use `NAO-INFORMADO` nem `null` neles: omita a chave.

| Campo | Regra |
|---|---|
| `url-holmes` | URL de visita do Holmes. Se `TRUE` e a URL não veio, pergunte. |
| `correlation-id` | CorrelationID obtido no Holmes (string). |
| `ocorrencia-id` | ID da ocorrência no sistema de cadastro de erros (número). |
| `ocorrencia-url` | URL com os detalhes da ocorrência. Só existe se houver `ocorrencia-id`. |
| `operacao-codigo` | Código da operação no formato `NNNNNNN.N` (ex.: `12854.1`), string. Só existe se houver `ocorrencia-id`. |
| `operacao-sigla` | Sigla da área responsável pela operação: 3 letras maiúsculas (ex.: `PGT`, `PGO`, `DCX`). Só existe se houver `operacao-codigo`. |
| `version-app` | Versão do app da empresa (ex.: `"12.5.0"`). Somente se `canal` for `MOBILE`. |
| `version-bundle` | Versão do bundle/módulo onde ocorreu o problema (ex.: `"8.99"`). Somente se `canal` for `MOBILE`. |
| `device-so` | `"ANDROID"` ou `"IOS"`. Somente se `canal` for `MOBILE`. |
| `device-so-version` | Versão do Android/iOS (string, ex.: `"15"`). Somente se `canal` for `MOBILE`. |

Quando houver Holmes, extraia tudo que o texto trouxer e, antes de gerar o JSON, **liste os campos opcionais ainda não informados e pergunte por eles**. O usuário só informa o que foi pedido, então um campo que você não perguntou nunca será preenchido. Monte a lista pelas dependências:

- Sempre: `correlation-id` e `ocorrencia-id`, se ainda não vieram.
- Se há `ocorrencia-id`: `ocorrencia-url` e `operacao-codigo` (formato `NNNNNNN.N`).
- Se há `operacao-codigo`: `operacao-sigla`.
- Se `canal` é `MOBILE`: `version-app`, `version-bundle`, `device-so` e `device-so-version`.

Esse é um segundo ciclo de perguntas, feito depois que o usuário respondeu o primeiro. Respostas novas podem liberar novos campos (um `ocorrencia-id` informado agora exige perguntar URL e operação), então repita o ciclo até não restar nenhum campo aplicável sem resposta. Aceite "não tenho" para cada item e, nesse caso, omita a chave e não pergunte de novo.

## Regras

- Nunca invente MCI, datas, canal ou documento. Valor ausente e não inferível => pergunta.
- Nunca invente dados do Holmes (URLs, IDs, versões). Os campos de dispositivo e versão só existem se o relato ou o Holmes os trouxeram.
- Ao validar CPF/CNPJ, só confira a quantidade de dígitos; se o tamanho for inconsistente com o tipo de cliente informado, aponte a divergência e peça confirmação.
- Mantenha exatamente as chaves e a ordem do exemplo, em minúsculas e com hífen.
- Responda no idioma do usuário (português por padrão).

## Exemplo

Entrada: "Cliente 1238564 ligou hoje, por volta das 8h05, dizendo que no app tomou 'PAGAMENTO INVÁLIDO' ao tentar pagar um boleto. Mandou print."

(Hoje = 24-10-2026, 15:40; CPF não informado; tipo-cliente não informado => perguntar "O cliente é PF ou PJ?")

Após a resposta "PF":

(Origem: ligação de cliente ao SAC sem ticket citado => perguntar "Qual a origem e o ID do chamado?"; resposta: RESOLVE, ticket 778812.)

```json
{
    "id-atendimento": "ATD-40817",
    "origem": "RESOLVE",
    "id-chamado": "778812",
    "data-ocorrencia": "24-10-2026 08:05",
    "data-cadastro": "24-10-2026 15:40",
    "canal": "MOBILE",
    "tipo-cliente": "PF",
    "mci-cliente": 1238564,
    "codigo-receita-federal": "NAO-INFORMADO",
    "descricao": "Cliente ao tentar pagar um boleto pelo app tomou o erro 'PAGAMENTO INVÁLIDO'",
    "tem-evidencia": true,
    "tem-analise-holmes": "FALSE"
}
```

Exemplo com Holmes (canal MOBILE) e origem sem chamado (note que `id-chamado` fica de fora):

```json
{
    "id-atendimento": "ATD-09356",
    "origem": "INTERNO-SEM-CHAMADO",
    "data-ocorrencia": "24-10-2026 08:05",
    "data-cadastro": "24-10-2026 15:40",
    "canal": "MOBILE",
    "tipo-cliente": "PF",
    "mci-cliente": 1238564,
    "codigo-receita-federal": "NAO-INFORMADO",
    "descricao": "Cliente ao tentar fazer um pagamento tomou o erro 'PAGAMENTO INVÁLIDO'",
    "tem-evidencia": true,
    "tem-analise-holmes": "TRUE",
    "holmes": {
        "url-holmes": "http://holmes.intranet.abc.com.br/qrcysdkfuhaf",
        "correlation-id": "XGDIHYSX87",
        "ocorrencia-id": 45878974,
        "ocorrencia-url": "http://ocorrencia.intranet.abc.com.br/45878974/dasikdhjfj",
        "operacao-codigo": "1548787.1",
        "operacao-sigla": "PGO",
        "version-app": "12.5.0",
        "version-bundle": "8.99",
        "device-so": "ANDROID",
        "device-so-version": "15"
    }
}
```
