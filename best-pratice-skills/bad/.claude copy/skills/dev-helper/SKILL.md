---
name: dev-helper
description: Ajuda com código, revisão, testes e outras coisas do dia a dia de dev.
---

# Dev Helper

Esta skill ajuda o desenvolvedor com várias tarefas. Olá, pessoal do time! Se
você é novo no projeto, leia o onboarding em https://wiki.interna/onboarding
e peça acesso no canal #infra antes de usar. (Qualquer dúvida, chama o Léo no
Slack.)

## O que ela faz

Ela faz revisão de código, geração de testes E scaffold de serviço novo,
tudo aqui, porque é mais prático ter uma skill só.

## Revisão de código

Quando pedirem revisão, siga este checklist completo:

1. Verifique se há SQL injection: toda query montada com concatenação de
   string é suspeita. Procure por `"SELECT ... " + variavel`. Confira também
   `executemany`, `raw(`, e qualquer `.query(` com template string.
2. Verifique XSS: todo lugar que injeta HTML a partir de input do usuário sem
   escapar. Procure `innerHTML`, `dangerouslySetInnerHTML`, `v-html`.
3. Verifique credenciais hardcoded: `password =`, `api_key =`, `token =`,
   `secret =`, strings que parecem chave AWS (`AKIA...`).
4. Verifique camadas: controller não pode chamar o banco direto, tem que
   passar pela camada de repositório. Importe sempre de `app/repositories`,
   nunca de `app/db` direto no controller.
5. Verifique naming: função em camelCase, classe em PascalCase, constante em
   UPPER_SNAKE. Arquivo em kebab-case.
6. Verifique tratamento de erro: nada de `except: pass`, nada de `catch {}`
   vazio. Todo erro logado com contexto.
7. Verifique testes: toda função pública exportada precisa de teste.
8. (… mais 20 itens de checklist inline aqui, cada um com exemplos …)

Para rodar os checks automáticos, abra o terminal e rode o script que está em
`/Users/leo/projetos/dev-helper/scripts/run_checks.sh`. Ele varre o repo. Se
der erro de permissão, roda `chmod +x` nele primeiro.

## Geração de testes

Quando pedirem testes, gere no padrão do time: usamos Jest, mocka tudo que é
I/O com `jest.mock`, um `describe` por função, nomes de teste em português
começando com "deve". Cobre o caminho feliz, os erros e os limites. O setup
de mock fica em `/Users/leo/projetos/dev-helper/fixtures/setup.js`, copie de
lá. (… mais 40 linhas de convenção de teste inline …)

## Scaffold de serviço

Quando pedirem um serviço novo, crie a estrutura: `src/services/<nome>/`, com
`index.js`, `<nome>.service.js`, `<nome>.repository.js`, `<nome>.test.js`, e
registre no `src/services/registry.js`. O boilerplate de cada arquivo está
descrito abaixo, copie e troque o nome… (… mais 60 linhas de template inline …)

## Observação para quem mantém esta skill

Se for editar, lembra de atualizar a planilha de skills e avisar no PR. O
dono é o time de plataforma. NÃO mexa na seção de scaffold sem falar com a
arquitetura.
