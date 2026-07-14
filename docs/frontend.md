# Frontend, Dashboard, Métricas E UI

## Dashboard

- `/` usa `DashboardShell mode="standard"`;
- `/tv` usa `DashboardShell mode="tv"`;
- `/metrics` usa `MetricsPageShell` com abas (cada aba independente);
- `OverviewTab` reutiliza `/api/dashboard` e exibe cards de resumo operacional (Cards Ativos, Concluídos, Responsáveis, HOTFIX);
- `DevsTab` reutiliza `/api/dashboard` e calcula distribuição por responsável client-side;
- `QualityTab` usa `/api/metrics/quality` com filtro de período (data inicial e final) e opção `Apenas HOTFIX`;
- `FlowTab` usa `/api/metrics/flow` com filtro de período (data inicial e final) e opção `Apenas HOTFIX`;
- O helper de rejeição QA (`src/lib/jira/jira-metrics.helper.ts`) é compartilhado entre o normalizador do dashboard e o service de qualidade;
- `DashboardShell` faz fetch, filtros, stats, agrupamento e layout;
- `GlobalIssueSearch` renderiza command palette de busca global;
- `StatusColumn` renderiza coluna;
- `IssueCard` renderiza card;
- `SummaryCard` renderiza cards de resumo;
- o submenu de exportação no modo standard baixa os cards visíveis como `.xls` compatível com Excel;


Organização de componentes:

- componentes específicos de rota ficam em `src/app/{rota}/components`;
- rotas compartilhadas por um mesmo fluxo podem usar route group, como `src/app/(dashboard)/components`;
- cada componente fica em uma pasta própria com `index.tsx`;
- subcomponentes ficam em `components` dentro da pasta do componente pai;
- componentes genéricos da aplicação ficam em `src/components`, também em pasta própria com `index.tsx`.

Ordenação dos cards nas colunas:

- HOTFIX sempre primeiro;
- depois prioridade Jira da mais alta para a mais baixa (`Highest`, `High`, `Medium`, `Low`, `Lowest`, `Unknown`);
- depois maior tempo parado no status atual primeiro, usando `statusChangedAt` mais antigo.

Estado:

- React Query para `/api/dashboard`;
- polling a cada 30s;
- filtros em `useState`;
- busca global usa React Query sob demanda e não participa do polling do dashboard;
- sem Redux ou estado global pesado.

## Tela De Métricas

- rota: `/metrics`;
- abas disponíveis: `Overview` (resumo operacional em tempo real), `Devs` (distribuição por desenvolvedor), `Quality` (Delivery Quality Rate) e `Flow` (Lead Time e Aging);
- `DevsTab` considera apenas cards principais fora do backlog, vindos do mesmo payload do dashboard;
- `QualityTab` busca dados diretamente do Jira via `/api/metrics/quality`, respeitando filtro de período e `hotfixOnly`;
- `FlowTab` busca dados diretamente do Jira via `/api/metrics/flow`, respeitando filtro de período e `hotfixOnly`;
- agrupa por `assignee.name`;
- cards sem responsável ficam em `Sem responsável`;
- mostra total, ativos, concluídos e distribuição por status técnico real do Jira, sem agrupar `Em andamento`, `Pull request` e `Pronto para QA` no mesmo contador;
- HOTFIX impacta contadores normalmente e aparece como contador pequeno por responsável;
- cards ativos que retornaram de QA aparecem como contador pequeno por responsável, usando `issue.qaRejectionCount > 0` e ignorando cards concluídos;
- usa barras empilhadas por status técnico real do Jira;
- ordena por maior quantidade de cards ativos e depois total, sem numeração de ranking;
- complexidade aparece apenas no card da issue, não como agregação individual;
- não adicionar ranking, score, velocity complexa, SLA individual, DORA ou métricas de produtividade individual.

## Filtros No Modo Standard

- busca por chave, título, responsável ou status real do Jira;
- HOTFIX only;
- Dev IA only (cards com `Fluxo Dev = Dev IA`);
- responsável;
- prioridade;
- status técnico por coluna, quando a coluna tiver mais de um `jiraStatus`.
- `Exportar para Excel` considera somente os cards visíveis após filtros gerais e filtros técnicos por coluna.

## Modo TV

- sem filtros;
- mantém botão/atalho de busca global;
- tipografia maior;
- grid fixo de 5 colunas;
- colunas com overflow escondido.

## UI E Estilo

Padrões reais:

- TailwindCSS;
- temas claro e escuro via classe `dark` no `<html>`, tokens em `globals.css` e `ThemeProvider`;
- tokens em `src/app/globals.css`;
- `cn` em `src/lib/utils.ts`;
- ícones com lucide-react;
- componentes locais compartilhados em `src/components/ui`.

Ao criar UI:

- preferir componentes existentes;
- manter textos em pt-BR;
- preservar modo TV;
- evitar visual de CRUD/admin;
- manter dashboard denso, claro e operacional.
