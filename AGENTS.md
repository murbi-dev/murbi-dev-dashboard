# AGENTS.md

Guia operacional para IAs trabalharem no **Murbi Dev Dashboard** sem depender do contexto do chat.

Este arquivo deve ficar sincronizado com a codebase. Se uma mudança alterar arquitetura, autenticação, Jira, status, scripts, envs, fluxo de dados ou padrões relevantes, atualize este documento no mesmo PR/commit.

## 1. Contexto Do Produto

- Dashboard operacional sobre Jira para suporte, negócio, operações e gestão.
- Não é substituto do Jira. Mostra uma visão simplificada da sprint ativa.
- Foco: leitura rápida, modo TV, cards da sprint atual, HOTFIX, status de negócio e atualização automática.
- Tela `/metrics` mostra distribuição operacional da sprint por desenvolvedor, sem ranking ou score individual.
- Interface visível deve ficar em **português do Brasil**.
- Código, tipos, funções, arquivos e valores internos ficam em **inglês**.

## 2. Stack E Scripts

Stack real:

- Next.js App Router
- TypeScript strict
- TailwindCSS
- React 19
- TanStack React Query
- lucide-react
- componentes locais estilo shadcn/ui

Scripts:

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run auth:hash -- sua-senha
npm run auth:secret
```

Sempre rode antes de finalizar mudanças de código:

```bash
npm run typecheck
npm run lint
npm run build
```

## 3. Estrutura Principal

```text
src/app                  rotas App Router e API routes
src/components/auth      tela/form de login
src/components/cards     card de issue
src/components/dashboard dashboard, colunas, resumo, skeleton
src/components/metrics   métricas operacionais por desenvolvedor
src/components/layout    providers globais
src/components/ui        primitivos visuais locais
src/hooks                hooks client-side
src/lib                  regras/utilitários compartilhados
src/services/jira        integração Jira
src/types                tipos de domínio compartilhados
scripts                  utilitários npm
```

Arquivos críticos:

| Arquivo | Papel |
| --- | --- |
| `src/middleware.ts` | protege rotas com sessão assinada |
| `src/lib/auth.ts` | hash, cookie e assinatura da sessão |
| `src/services/jira/dashboard.ts` | fluxo principal da integração Jira |
| `src/services/jira/normalize.ts` | Jira issue -> `DashboardIssue` |
| `src/lib/status-mapper.ts` | status Jira -> status de negócio |
| `src/lib/display.ts` | labels pt-BR para UI |
| `src/components/dashboard/dashboard-shell.tsx` | estado, filtros, agrupamento e layout do dashboard |
| `src/components/metrics/developer-metrics-shell.tsx` | métricas da sprint por responsável |

## 4. Autenticação

Auth atual:

- tela própria em `/login`;
- login via `POST /api/auth/login`;
- sessão em cookie HttpOnly assinado;
- logout via `POST /api/auth/logout`;
- middleware protege páginas e APIs internas.

Envs obrigatórias em produção:

```env
DASHBOARD_AUTH_USER=
DASHBOARD_AUTH_PASSWORD_SHA256=
DASHBOARD_AUTH_SECRET=
```

Gerar valores:

```bash
npm run auth:hash -- senha-forte
npm run auth:secret
```

Regras importantes:

- `src/middleware.ts` deve ficar dentro de `src/`, não na raiz.
- Build precisa mostrar `ƒ Middleware`.
- Sem auth configurada em produção, rotas protegidas retornam 503.
- Não commitar usuário real, hash real, segredo real ou `.env`.

## 5. Integração Jira

Frontend nunca chama Jira diretamente. O fluxo é:

```text
UI -> /api/dashboard -> getDashboardData -> Jira REST API -> normalize -> UI
UI -> /api/issues/search -> searchIssues -> Jira REST API -> normalize search results -> UI
```

Envs Jira:

```env
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_BOARD_ID=
```

Fluxo real:

1. Buscar sprint ativa do board:

```text
/rest/agile/1.0/board/{boardId}/sprint?state=active
```

2. Buscar cards principais do board nessa sprint:

```text
/rest/agile/1.0/board/{boardId}/issue
```

JQL obrigatório:

```text
Sprint = {sprintId} AND issuetype not in subTaskIssueTypes()
```

3. Usar paginação (`startAt`, `maxResults=100`).
4. Usar `expand=changelog` para calcular idade no status.
5. Buscar configuração do board e metadados de campos para detectar campos reais de pontuação e épico.
6. Normalizar em `src/services/jira/normalize.ts`.

Não voltar para:

```text
/rest/agile/1.0/sprint/{sprintId}/issue
```

Esse endpoint já causou divergência de contagem com o Jira porque traz issues associadas à sprint que não aparecem como cards principais do board.

Busca global de issues:

- endpoint separado: `GET /api/issues/search?q=`;
- não substitui o dashboard da sprint atual;
- busca sob demanda, com debounce no frontend (~300ms);
- não carrega backlog inteiro no frontend;
- se `q` parecer issue key, prioriza JQL `issueKey = KEY`;
- para texto, usa JQL `summary ~ "termo"`;
- retorna no máximo 15 resultados;
- usa campos mínimos: `summary`, `status`, `assignee`, `updated` e campo real `Sprint`;
- o campo `Sprint` é detectado via `/rest/api/3/field`;
- localização operacional diferencia sprint atual, próxima sprint, sprint encerrada, concluído e backlog/sem sprint.

## 6. Mock Mode

Se as credenciais Jira faltarem ou Jira falhar:

- `getDashboardData` retorna `getMockDashboard(...)`;
- `searchIssues` retorna `searchMockIssues(...)`;
- UI mostra badge `Modo simulado` e warning;
- o app continua utilizável.

Ao mudar tipos de `DashboardIssue` ou payload, atualize também `src/services/jira/mock-data.ts`.

## 7. Status E Regras De Negócio

Status internos oficiais:

```ts
"Waiting" | "In Development" | "Validation" | "Finalizing" | "Done"
```

Ordem das colunas vem de `BUSINESS_STATUSES`:

```ts
["Waiting", "In Development", "Validation", "Finalizing", "Done"]
```

Mapeamento atual:

| Interno | Label UI | Jira |
| --- | --- | --- |
| `Waiting` | Pendente | `To Do`, `Tarefas pendentes` |
| `In Development` | Em Desenvolvimento | `In Progress`, `Em andamento`, `Pull Request`, `Pull request`, `Pronto para QA` |
| `Validation` | Em Teste | `QA`, `GQ` |
| `Finalizing` | Aguardando Deploy | `PRONTO PARA PROD` |
| `Done` | Em Produção | `Done`, `Concluído`, `Concluido`, `Rejeitado` |

Regras:

- Status desconhecido cai em `Waiting`; isso pode esconder status novo do Jira.
- Ao investigar cards em coluna errada, agrupe `jiraStatus -> businessStatus` da `/api/dashboard`.
- Labels visíveis ficam em `src/lib/display.ts`.
- Cards mostram explicitamente o `jiraStatus` real, além da coluna de negócio.
- A coluna `Em Desenvolvimento` agrupa múltiplos status técnicos e mostra no topo o total da coluna e a contagem por `jiraStatus`.

## 8. HOTFIX

Regra atual:

- título contendo exatamente `[HOTFIX]` vira `isHotfix = true`;
- HOTFIX fica pinado no topo da coluna;
- recebe badge e estilo vermelho;
- texto `[HOTFIX]` é removido só da exibição do título.
- indicador de resumo HOTFIX mostra `pendentes/total`;
- HOTFIX pendente é `isHotfix` com `businessStatus !== "Done"`;
- HOTFIX concluído é `isHotfix` na coluna final atual (`Done` / Em Produção).

Não tornar case-insensitive sem validar títulos reais do Jira.

## 9. Idade No Status

O card mostra:

- tempo no status atual;
- data de criação da issue no Jira;
- última atualização.
- pontuação/story points quando o campo de estimativa do board existir e vier preenchido;
- ícone real do tipo da issue vindo de `issuetype.iconUrl`, com tooltip usando `issuetype.name`;
- épico quando vier via `parent` épico ou campos de épico detectados nos metadados do Jira, com cor quando o campo real `Issue color` estiver disponível.

Não mostra idade total desde criação.

`createdAt` vem de `issue.fields.created`, é normalizado em `src/services/jira/normalize.ts` e aparece no footer do card como idade relativa pt-BR compacta (`Criado há 2 semanas`).

Pontuação, tipo e épico:

- `storyPoints` vem do campo configurado em `/rest/agile/1.0/board/{boardId}/configuration`; se o board não expuser o campo ou a issue não tiver valor, o badge `SP: n` não aparece.
- `issueType` vem de `fields.issuetype`; a UI renderiza somente o `iconUrl` real do Jira e usa `name` apenas no tooltip.
- `epic` vem primeiro de `fields.parent` quando o parent é épico; para projetos clássicos, usa campos de épico detectados em `/rest/api/3/field`.
- A cor do épico vem do campo real `Issue color` (`com.pyxis.greenhopper.jira:jsw-issue-color`) buscado nos épicos pais e é aplicada diretamente no marcador do badge; sem cor retornada, usa badge neutro.
- Não criar ícones, tipos, pontuações ou labels de épico manuais para dados reais.

`statusChangedAt` é calculado em `normalize.ts` como a maior data entre:

- entrada no status atual via changelog;
- entrada na sprint ativa via changelog;
- início da sprint;
- `statuscategorychangedate`;
- criação do card.

Motivo: se um card veio do backlog já em `Pendente`, o contador deve começar na entrada da sprint, não na criação antiga.

Não remover `expand=changelog` sem substituir esse cálculo.

## 10. Frontend

Dashboard:

- `/` usa `DashboardShell mode="standard"`;
- `/tv` usa `DashboardShell mode="tv"`;
- `/metrics` usa `DeveloperMetricsShell`;
- `DashboardShell` faz fetch, filtros, stats, agrupamento e layout;
- `GlobalIssueSearch` renderiza command palette de busca global;
- `StatusColumn` renderiza coluna;
- `IssueCard` renderiza card;
- `SummaryCard` renderiza cards de resumo.
- `DeveloperMetricsShell` reutiliza `/api/dashboard` e calcula distribuição por responsável client-side.

Estado:

- React Query para `/api/dashboard`;
- polling a cada 30s;
- filtros em `useState`;
- busca global usa React Query sob demanda e não participa do polling do dashboard;
- sem Redux ou estado global pesado.

Tela de métricas:

- rota: `/metrics`;
- considera apenas cards principais da sprint ativa, vindos do mesmo payload do dashboard;
- agrupa por `assignee.name`;
- cards sem responsável ficam em `Sem responsável`;
- mostra total, ativos, concluídos, pendentes, em desenvolvimento, em teste e aguardando deploy;
- HOTFIX impacta contadores normalmente e aparece como contador pequeno por responsável;
- usa barras empilhadas com as mesmas cores/status do dashboard;
- ordena por maior quantidade de cards ativos e depois total, sem numeração de ranking;
- SP aparece apenas como métrica secundária (`SP concluídos`, `SP ativos`) quando existir;
- não adicionar ranking, score, velocity complexa, SLA individual, DORA ou métricas de produtividade individual.

Filtros atuais no modo standard:

- busca por chave, título, responsável ou status real do Jira;
- HOTFIX only;
- responsável;
- prioridade.

Modo TV:

- sem filtros;
- mantém botão/atalho de busca global;
- tipografia maior;
- grid fixo de 5 colunas;
- colunas com overflow escondido.

## 11. UI E Estilo

Padrões reais:

- TailwindCSS;
- light mode;
- tokens em `src/app/globals.css`;
- `cn` em `src/lib/utils.ts`;
- ícones com lucide-react;
- componentes locais em `src/components/ui`.

Ao criar UI:

- preferir componentes existentes;
- manter textos em pt-BR;
- preservar modo TV;
- evitar visual de CRUD/admin;
- manter dashboard denso, claro e operacional.

## 12. API Routes

Rotas atuais:

| Rota | Método | Uso |
| --- | --- | --- |
| `/api/dashboard` | GET | payload do dashboard |
| `/api/issues/search` | GET | busca global de issues |
| `/api/auth/login` | POST | login e cookie |
| `/api/auth/logout` | POST | remove cookie |

Regras:

- API deve retornar JSON via `NextResponse`.
- `/api/dashboard` usa `Cache-Control: no-store`.
- `/api/issues/search` usa `Cache-Control: no-store`.
- Jira deve permanecer em `src/services/jira`.
- Não expor credenciais ao browser.

## 13. Segurança

Nunca:

- commitar `.env` ou segredos reais;
- expor `JIRA_API_TOKEN`;
- logar header Authorization;
- chamar Jira no frontend;
- remover middleware sem substituto;
- deixar produção aberta por falta de auth.

Arquivos ignorados pelo Git incluem `.env`, `.env.local`, `.env*.local`, `.next`, `node_modules`, `tsconfig.tsbuildinfo`.

Limitações atuais:

- login não tem rate limit;
- senha usa SHA-256 simples no env, então precisa ser forte;
- sessão é stateless via cookie assinado.

## 14. Performance E Cache

Atual:

- React Query refetch a cada 30s;
- `staleTime: 20_000`;
- `/api/dashboard` sem cache;
- Jira fetch com `next: { revalidate: 0 }`;
- paginação Jira obrigatória.

Pontos frágeis:

- `expand=changelog` aumenta payload;
- toda atualização reconsulta Jira;
- filtros são client-side.

## 15. Validação E Debug

Comandos principais:

```bash
npm run typecheck
npm run lint
npm run build
```

Debug rápido de status:

```bash
curl -s http://localhost:3000/api/dashboard \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const p=JSON.parse(d);const m={};for(const i of p.issues||[]){const k=i.jiraStatus+' -> '+i.businessStatus;m[k]=(m[k]||0)+1;}console.log(m);})"
```

Debug de auth:

- confirmar envs de auth;
- confirmar cookie `murbi_dashboard_session`;
- confirmar redirecionamento para `/login`;
- confirmar `ƒ Middleware` no build.

## 16. Testes

Não há testes automatizados configurados atualmente.

Validação mínima para mudanças:

- TypeScript;
- ESLint;
- build de produção.

Se testes forem adicionados, documentar neste arquivo:

- framework;
- estrutura;
- comandos;
- padrões de mock.

## 17. Regras Críticas Para IAs

Obrigatório:

- atualizar este arquivo ao mudar arquitetura, envs, auth, Jira, status ou padrões relevantes;
- manter código interno em inglês e UI em pt-BR;
- manter Jira server-side;
- manter `/api/dashboard` como contrato do frontend;
- manter query do board com sprint e sem subtarefas;
- manter paginação;
- manter mock data compatível com tipos reais;
- preservar HOTFIX pinado;
- preservar cálculo de idade no status dentro da sprint.

Evitar:

- refatoração ampla sem necessidade;
- criar camadas inexistentes sem motivo;
- duplicar labels de status fora de `display.ts`;
- mudar status mapping sem consultar dados reais;
- adicionar dependência pesada para problema simples;
- transformar dashboard em sistema CRUD.

## 18. Checklist Para Mudanças

Antes de alterar Jira:

- [ ] validar endpoint e JQL;
- [ ] manter paginação;
- [ ] verificar contagem com Jira;
- [ ] atualizar tipos/mock se payload mudar.

Antes de alterar status:

- [ ] listar status reais da API;
- [ ] atualizar `status-mapper.ts`;
- [ ] atualizar labels se necessário;
- [ ] validar colunas e estatísticas.

Antes de alterar auth:

- [ ] preservar middleware;
- [ ] validar cookie e redirects;
- [ ] atualizar `.env.example`;
- [ ] atualizar README e este arquivo.

Antes de finalizar:

- [ ] `npm run typecheck`;
- [ ] `npm run lint`;
- [ ] `npm run build`;
- [ ] sem segredos no Git;
- [ ] `AGENTS.md` atualizado se aplicável.

## 19. Melhorias Futuras Úteis

Sugestões práticas, não estado atual:

- adicionar testes unitários para `status-mapper`, `auth` e `normalize`;
- adicionar teste E2E mínimo para login + dashboard;
- adicionar CI com typecheck/lint/build;
- avisar explicitamente quando aparecer status Jira desconhecido;
- adicionar rate limit no login;
- medir custo do `expand=changelog`;
- criar script de diagnóstico Jira para listar status e contagens da sprint ativa.
