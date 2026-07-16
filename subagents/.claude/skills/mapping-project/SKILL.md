---
name: mapping-project
description: Mapeia um repositório/projeto desconhecido lançando subagentes Explore em paralelo, uma por frente independente (arquitetura, dados, testes, build & CI, segurança). Use quando o usuário quiser entender, mapear, explorar ou onboard num projeto/repo, ou disser "mapear projeto", "mapeie o repo", "como esse projeto funciona", "me dá um mapa do projeto", "explore essa base de código".
---

# mapping-project

Mapeie um projeto/repositório quebrando-o em **frentes independentes** e explorando cada
uma com um subagente `Explore` rodando em paralelo. No final, sintetize todos os resumos
num único mapa do projeto.

A raiz do projeto a ser mapeado é o diretório de trabalho atual, salvo se o usuário indicar
outro caminho. NÃO modifique nenhum arquivo — esta skill é somente de leitura/análise.

## Passo 1 — Quebrar o projeto em frentes independentes

Primeiro, faça um reconhecimento raso da raiz (liste diretórios de topo, arquivos de
manifesto como `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Makefile`,
`docker-compose.yml`, `.github/`, etc.) **apenas** para descobrir quais frentes existem de
fato. Não mergulhe fundo aqui — isso é trabalho dos subagentes.

Quebre o projeto em frentes **independentes** (a quebra é obrigatória, pois cada frente vira
um subagente concorrente). Use as frentes abaixo como guia, mas **adapte à realidade do
projeto** — pule frentes que não existem, divida ou combine quando fizer sentido, e mapeie
cada frente a um ou mais diretórios/raízes concretos:

- **Arquitetura**: entrypoint, camadas, módulos, como o fluxo dos dados funciona.
- **Dados**: camada específica de dados, models/schemas, conexão de banco, onde o estado mora.
- **Testes**: framework, onde se localizam, cobertura atual, o que está coberto ou não.
- **Build & CI**: scripts de build, pipeline, deploys, env vars (se existir).
- **Segurança**: autenticação, autorização, segredos, middlewares de permissão/segurança.

Liste brevemente ao usuário as frentes que você identificou e o diretório-raiz de cada uma
antes de lançar os subagentes.

## Passo 2 — Lançar um subagente Explore por frente (em paralelo)

Lance **um `Agent(type=Explore)` por frente**, **todas as chamadas numa única mensagem**
para que rodem de forma concorrente. Capture a conclusão de cada subagente.

Para cada subagente, use este prompt (substituindo `<raiz>` pelo diretório da frente e
`<frente>` pelo nome/escopo da frente):

> Explore o diretório `<raiz>` e mapeie a frente **<frente>**. Liste os arquivos relevantes
> como `caminho:linha`, descreva de forma enxuta o que cada um faz e como funciona, e aponte
> 1–2 riscos ou pontos de atenção. Fique **somente** nessa frente de análise — não saia do
> escopo. Devolva apenas o resumo.

Notas:
- Não lance os subagentes em sequência nem espere um terminar para lançar o próximo — todas
  as chamadas `Agent` devem sair juntas, num único bloco de tool use.
- Se uma frente cobre diretórios espalhados, passe os caminhos relevantes na `<raiz>` do
  prompt daquele subagente.

## Passo 3 — Sintetizar o mapa do projeto

Junte os resumos de todas as frentes e produza um único **mapa do projeto** com estas seções,
nesta ordem:

1. **Visão geral** — o que é o projeto, stack principal, e como as peças se encaixam (2–5 frases).
2. **Por frente** — uma subseção por frente analisada, com os arquivos-chave (`caminho:linha`),
   o que fazem e como funcionam, de forma enxuta.
3. **Por onde começar** — a sequência recomendada de arquivos/módulos para alguém que está
   chegando agora entender o projeto.
4. **Riscos / prioridades** — os riscos e pontos de atenção levantados pelos subagentes,
   consolidados e priorizados.

Mantenha o mapa enxuto e acionável; não cole os resumos crus — sintetize-os.
