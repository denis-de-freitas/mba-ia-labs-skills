Aqui está a documentação completa sobre subagentes em Markdown:

# Criar subagentes personalizados

Crie e use subagentes de IA especializados no Claude Code para fluxos de trabalho específicos de tarefas e melhor gerenciamento de contexto.

Subagentes são assistentes de IA especializados que lidam com tipos específicos de tarefas. Use um quando uma tarefa secundária fosse inundar sua conversa principal com resultados de busca, logs ou conteúdos de arquivos que você não vai consultar novamente: o subagente faz esse trabalho em seu próprio contexto e retorna apenas o resumo. Defina um subagente personalizado quando você continuar criando o mesmo tipo de trabalhador com as mesmas instruções.

Cada subagente é executado em sua própria janela de contexto com um prompt de sistema personalizado, acesso específico a ferramentas e permissões independentes. Quando o Claude encontra uma tarefa que corresponde à descrição de um subagente, ele delega para esse subagente, que trabalha de forma independente e retorna os resultados.

## Subagentes integrados

O Claude Code inclui subagentes integrados que o Claude usa automaticamente quando apropriado:

### Explore
Um agente rápido e somente leitura, otimizado para buscar e analisar bases de código.

- **Modelo**: Haiku (rápido e de baixa latência)
- **Ferramentas**: ferramentas somente leitura; Write e Edit são negadas
- **Propósito**: descoberta de arquivos, busca de código, exploração da base de código

### Plan
Um agente de pesquisa usado durante o modo de planejamento para reunir contexto antes de apresentar um plano.

- **Modelo**: herda da conversa principal
- **Ferramentas**: ferramentas somente leitura; Write e Edit são negadas
- **Propósito**: pesquisa na base de código para planejamento

### General-purpose
Um agente capaz para tarefas complexas e de múltiplas etapas que exigem tanto exploração quanto ação.

- **Modelo**: herda da conversa principal
- **Ferramentas**: todas as ferramentas
- **Propósito**: pesquisa complexa, operações de múltiplas etapas, modificações de código

### Outros agentes auxiliares

| Agente            | Modelo | Quando o Claude o usa                                       |
| :---------------- | :----- | :--------------------------------------------------------- |
| statusline-setup  | Sonnet | Quando você executa `/statusline` para configurar sua barra de status |
| claude-code-guide | Haiku  | Quando você faz perguntas sobre recursos do Claude Code    |

## Invocando subagentes

Você pode invocar subagentes explicitamente usando a sintaxe `Agent(tipo)`:

```
Agent(Explore)
Agent(Plan)
Agent(general-purpose)
Agent(nome-do-agente-personalizado)
```

Ao invocar o Explore, o Claude especifica um nível de profundidade:
- **quick** (rápido): consultas direcionadas
- **medium** (médio): exploração equilibrada
- **very thorough** (muito minucioso): análise abrangente

## Criando subagentes personalizados

Os arquivos de subagente usam frontmatter YAML para configuração, seguido pelo prompt de sistema em Markdown:

```markdown
---
name: code-reviewer
description: Revisa código quanto à qualidade e melhores práticas
tools: Read, Glob, Grep
model: sonnet
---

Você é um revisor de código. Quando invocado, analise o código e forneça
feedback específico e acionável sobre qualidade, segurança e melhores práticas.
```

### Campos de frontmatter suportados

| Campo             | Obrigatório | Descrição                                                                                                                                                                                                                                                                                                                                |
| :---------------- | :---------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | Sim         | Identificador único usando letras minúsculas e hifens                                                                                                                                                                                                                                                                                   |
| `description`     | Sim         | Quando o Claude deve delegar para este subagente                                                                                                                                                                                                                                                                                        |
| `tools`           | Não         | Ferramentas que o subagente pode usar. Herda todas as ferramentas se omitido                                                                                                                                                                                                                                                            |
| `disallowedTools` | Não         | Ferramentas a negar, removidas da lista herdada ou especificada                                                                                                                                                                                                                                                                         |
| `model`           | Não         | Modelo a usar: `sonnet`, `opus`, `haiku`, `fable`, um ID de modelo completo ou `inherit`. Padrão é `inherit`                                                                                                                                                                                                                            |
| `permissionMode`  | Não         | Modo de permissão: `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions` ou `plan`                                                                                                                                                                                                                                           |
| `maxTurns`        | Não         | Número máximo de turnos do agente antes do subagente parar                                                                                                                                                                                                                                                                              |
| `skills`          | Não         | Skills a pré-carregar no contexto do subagente na inicialização                                                                                                                                                                                                                                                                         |
| `mcpServers`      | Não         | Servidores MCP disponíveis para este subagente                                                                                                                                                                                                                                                                                          |
| `hooks`           | Não         | Hooks de ciclo de vida com escopo neste subagente                                                                                                                                                                                                                                                                                       |
| `memory`          | Não         | Escopo de memória persistente: `user`, `project` ou `local`. Habilita aprendizado entre sessões                                                                                                                                                                                                                                         |
| `background`      | Não         | Defina como `true` para sempre executar este subagente como uma tarefa em segundo plano. Padrão: `false`                                                                                                                                                                                                                                |
| `effort`          | Não         | Nível de esforço quando este subagente está ativo. Sobrescreve o nível de esforço da sessão                                                                                                                                                                                                                                             |
| `isolation`       | Não         | Defina como `worktree` para executar o subagente em um git worktree temporário                                                                                                                                                                                                                                                          |
| `color`           | Não         | Cor de exibição do subagente. Aceita `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink` ou `cyan`                                                                                                                                                                                                                             |
| `initialPrompt`   | Não         | Enviado automaticamente como o primeiro turno do usuário quando este agente é executado como o agente da sessão principal                                                                                                                                                                                                               |

### Escopos de subagentes

Armazene subagentes em diferentes locais dependendo do escopo:

| Local                          | Escopo                       | Prioridade   |
| :----------------------------- | :--------------------------- | :----------- |
| Configurações gerenciadas      | Toda a organização           | 1 (mais alta)|
| Flag de CLI `--agents`         | Sessão atual                 | 2            |
| `.claude/agents/`              | Projeto atual                | 3            |
| `~/.claude/agents/`            | Todos os seus projetos       | 4            |
| Diretório `agents/` do plugin  | Onde o plugin está habilitado| 5 (mais baixa)|

**Subagentes de projeto** (`.claude/agents/`) são ideais para subagentes específicos de uma base de código. Faça commit deles no controle de versão para que sua equipe possa usá-los e melhorá-los de forma colaborativa.

**Subagentes de usuário** (`~/.claude/agents/`) são subagentes pessoais disponíveis em todos os seus projetos.

## Usando o comando /agents

O comando `/agents` abre uma interface com abas para gerenciar subagentes:

- **Aba Running** (Em execução): lista subagentes ativos e recém-finalizados
- **Aba Library** (Biblioteca): visualizar, criar, editar e excluir subagentes

Esta é a forma recomendada de criar e gerenciar subagentes.

## Controlando as capacidades dos subagentes

### Ferramentas disponíveis

Por padrão, os subagentes herdam as ferramentas internas e as ferramentas MCP disponíveis na conversa principal. Você pode restringir ferramentas usando:

- Campo `tools` (allowlist): permitir exclusivamente ferramentas específicas
- Campo `disallowedTools` (denylist): negar ferramentas específicas

Exemplo de allowlist:
```yaml
---
name: safe-researcher
description: Agente de pesquisa com capacidades restritas
tools: Read, Grep, Glob, Bash
---
```

Exemplo de denylist:
```yaml
---
name: no-writes
description: Herda todas as ferramentas, exceto escritas em arquivos
disallowedTools: Write, Edit
---
```

### Restringir quais subagentes podem ser criados

Quando um agente é executado como thread principal, ele pode criar subagentes usando a ferramenta Agent. Para restringir quais tipos de subagentes ele pode criar:

```yaml
---
name: coordinator
description: Coordena o trabalho entre agentes especializados
tools: Agent(worker, researcher), Read, Bash
---
```

Esta é uma allowlist: apenas os subagentes `worker` e `researcher` podem ser criados.

Para permitir a criação de qualquer subagente sem restrições:
```yaml
tools: Agent, Read, Bash
```

## Memória persistente

Habilite a memória persistente para que os subagentes acumulem insights entre conversas:

```yaml
---
name: code-reviewer
description: Revisa código quanto à qualidade e melhores práticas
memory: user
---
```

Escopos de memória:
- `user`: compartilhado entre todos os projetos
- `project`: com escopo no projeto atual
- `local`: com escopo na sessão atual

## Servidores MCP para subagentes

Use o campo `mcpServers` para dar a um subagente acesso a servidores MCP:

```yaml
---
name: browser-tester
description: Testa recursos em um navegador real usando o Playwright
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  - github
---

Use as ferramentas do Playwright para navegar, tirar capturas de tela e interagir com páginas.
```

## Hooks para subagentes

Defina hooks de ciclo de vida com escopo em um subagente:

```yaml
---
name: code-reviewer
description: Revisa código quanto à qualidade e melhores práticas
hooks:
  subagent:start: |
    echo "Iniciando revisão de código..."
  subagent:end: |
    echo "Revisão de código concluída"
---
```

## Subagentes em segundo plano

Configure um subagente para sempre ser executado como uma tarefa em segundo plano:

```yaml
---
name: continuous-monitor
description: Monitora a base de código em busca de problemas
background: true
---
```

## Isolamento com worktrees

Execute um subagente em um git worktree temporário para isolamento:

```yaml
---
name: experimental-changes
description: Testa mudanças experimentais de forma isolada
isolation: worktree
---
```

O worktree é limpo automaticamente se o subagente não fizer nenhuma alteração.
```

Veja a página completa em [Sub-agents](/en/sub-agents).
