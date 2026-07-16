### DECIDE SKILLS


TRIAGEM = Isso é conhecimento procedural? reutilizavel? é estável o bastante para valer um arquivo versionado? 


--- 

Vale 3 "sim"

Reutilização: é repetivo? (dias/prompts/projetos)
Procedimento não obvio: tem como um especifico? (Como: ordem, padrão, convenção)
Estabilidade: regra dura dias/semanas/meses?

---

SEGURANÇA: segredo, credencial, token, algo que dependa de estado em tempo real? 

ZONA CINZENTA:
Quando o procedimento/execução é repetítivel e não óbvio: Skill

---

DECISÃO: Vai virar uma skill -> Qual nivel? N2/N3? 


PROMPT DE TRIAGEM:

Você é um revisor de skills. Classifique o candidato abaixo.

Candidato: "Sempre responder em portugues do Brasil"
 
Responda EXATAMENTE neste formato:
1. Reutilização (repete em vários prompts/dias?):  SIM/NÃO + 1 linha
2. Procedimento não óbvio (tem um "como" específico?): SIM/NÃO + 1 linha
3. Estabilidade (dura semanas/meses?):              SIM/NÃO + 1 linha
4. Veto de segurança/estado vivo (secret? dado em tempo real?): SIM/NÃO + 1 linha

Veredito:
- Se 1–3 = SIM e 4 = NÃO → "VIRA SKILL" e diga o nível sugerido:
  corpo (julgamento curto) / references (material longo) / scripts (passo
  determinístico).
- Caso contrário → "NÃO VIRA" e aponte o destino certo:
  CLAUDE.md / linter / MCP-ou-tool / web / prompt único / secrets manager.

Seja decisivo. Uma linha por item. Sem rodeios.

Deve dar "VIRA SKILL":
1. "Aplicar o checklist de code review do meu time (OWASP, naming, camadas) num diff" → vira · nível references (checklist longo)
2. "Gerar mensagem de commit no padrão Conventional Commits a partir do diff staged" → vira · nível corpo (é o nosso mensagem-commit)
3. "Varrer o repo atrás de TODO/FIXME e devolver priorizado por arquivo" → vira · nível scripts (é o todo-triage)
4. "Fazer scaffold de um serviço novo no padrão de pastas e boilerplate do time" → vira · nível scripts

Deve dar "NÃO VIRA":
5. "Qual a versão atual do Next.js?" → não · web (fato volátil)
6. "Guardar o token de deploy da AWS pra reusar" → não · secrets manager (veto de segurança)
7. "Usar 2 espaços de indentação no projeto" → não · linter / CLAUDE.md (trivial)
8. "Mostrar o status do último deploy em produção agora" → não · MCP/tool (estado vivo)
9. "Arrumar esse bug específico no parser de datas" → não · prompt único (one-off)

Zona cinzenta (o teste de verdade — veja se ele raciocina, não decora):
10. "Sempre responder em português" → deve cair em CLAUDE.md, não skill (preferência global, não procedimento)
11. "Como autenticar na API do Stripe?" → não vira disfarçado: a API muda → web/MCP (pega o "fato volátil vestido de procedimento")
12. "Template de descrição de PR do time" → vira · references (é o descricao-pr) — contraste interessante com o item 10, ambos parecem "padrão"
