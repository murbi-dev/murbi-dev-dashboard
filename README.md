# Painel Dev Murbi

O Painel Dev Murbi é uma camada de visibilidade operacional em tempo real sobre a sprint do Jira. Ele foi criado para times de suporte, negócio, operações e gestão acompanharem o andamento da sprint atual sem expor toda a complexidade técnica do fluxo do Jira.

O app não substitui o Jira. Ele mostra apenas cards da sprint ativa atual e traduz os status técnicos para colunas simples, orientadas ao negócio.

## Funcionalidades

- Apenas sprint ativa atual
- Atualização automática a cada 30 segundos
- Autenticação HTTP Basic sem banco de dados
- Credenciais do Jira mantidas no servidor por trás de `/api/dashboard`
- Modo simulado quando credenciais do Jira estão ausentes ou o Jira está indisponível
- Cards HOTFIX pinados primeiro com destaque visual
- Alertas para cards parados há muito tempo no mesmo status
- Busca por chave, título ou responsável
- Filtros por HOTFIX, responsável e prioridade
- Modo TV em `/tv`

## Stack Técnica

- Next.js App Router
- TypeScript
- TailwindCSS
- Componentes locais no estilo shadcn/ui
- TanStack React Query

## Configuração

Instale as dependências:

```bash
npm install
```

Crie o arquivo de ambiente:

```bash
cp .env.example .env.local
```

Rode o app:

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Variáveis de Ambiente

```bash
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your_api_token
JIRA_BOARD_ID=123

DASHBOARD_AUTH_USER=admin
DASHBOARD_AUTH_PASSWORD_SHA256=hash_sha256_da_senha
```

Se alguma variável do Jira estiver ausente, o app usa automaticamente dados simulados.

Em produção, `DASHBOARD_AUTH_USER` e `DASHBOARD_AUTH_PASSWORD_SHA256` são obrigatórios. Se não forem configurados, a aplicação bloqueia o acesso em vez de ficar pública.

## Autenticação

O painel usa HTTP Basic Auth no `middleware.ts`, protegendo páginas e rotas internas antes de qualquer dado do Jira ser entregue ao navegador.

A senha não deve ser salva em texto puro. Gere o hash SHA-256 da senha:

```bash
npm run auth:hash -- sua-senha-forte-aqui
```

Configure na Vercel:

```bash
DASHBOARD_AUTH_USER=admin
DASHBOARD_AUTH_PASSWORD_SHA256=resultado_do_comando_acima
```

Use HTTPS, que é o padrão da Vercel. O Basic Auth depende do TLS para proteger usuário e senha em trânsito.

## Integração com Jira

A integração fica em `src/services/jira`.

Fluxo da API:

1. Busca a sprint ativa em `GET /rest/agile/1.0/board/{boardId}/sprint?state=active`
2. Busca os cards do board nessa sprint em `GET /rest/agile/1.0/board/{boardId}/issue`
3. Usa JQL `Sprint = {sprintId} AND issuetype not in subTaskIssueTypes()` para refletir os cards principais exibidos no board
4. Normaliza as respostas do Jira para tipos seguros do dashboard
5. Mapeia os status do Jira para status de negócio

O frontend chama apenas a rota interna do Next.js:

```text
/api/dashboard
```

As credenciais do Jira nunca são expostas ao navegador.

## Mapeamento de Status

O mapeamento centralizado fica em `src/lib/status-mapper.ts`.

| Status no painel | Status do Jira |
| --- | --- |
| Pendente | To Do, Tarefas pendentes |
| Em desenvolvimento | In Progress, Em andamento |
| Validação | Pull Request, Pull request, Pronto para QA, QA, GQ |
| Finalizando | PRONTO PARA PROD |
| Concluído | Done, Concluído, Concluido, Rejeitado |

## Regra de HOTFIX

Qualquer card com `[HOTFIX]` no título é tratado como crítico operacional:

- Fica pinado no topo da coluna
- Recebe destaque em vermelho
- Exibe o badge HOTFIX

## Modo TV

Abra:

```text
http://localhost:3000/tv
```

O modo TV usa tipografia maior, resumos operacionais mais visíveis, sem filtros, e cinco colunas fixas para telas de monitoramento.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run auth:hash -- sua-senha
```

## Estrutura do Projeto

```text
src/app
src/components
src/components/dashboard
src/components/cards
src/components/layout
src/components/ui
src/hooks
src/lib
src/services/jira
src/types
```
