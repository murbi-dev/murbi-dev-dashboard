# Frontend, Dashboard, Métricas E UI

## Dashboard

- `/` usa `DashboardShell mode="standard"`;
- `/tv` usa `DashboardShell mode="tv"`;
- `/metrics` usa `MetricsPageShell` com abas (cada aba independente);
- `OverviewTab` reutiliza `/api/dashboard` e exibe cards de resumo operacional (Cards Ativos, Concluídos, Responsáveis, HOTFIX);
- `DevsTab` reutiliza `/api/dashboard` e calcula distribuição por responsável client-side;
- `QualityTab` usa `/api/metrics/quality` com filtro de período (data inicial e final) e opção `Apenas HOTFIX`;
- `FlowTab` usa `/api/metrics/flow` com filtro de período (data inicial e final) e opção `Apenas HOTFIX`;
- as duas abas terminam com `MetricsTrendSection`, a seção compartilhada de evolução no tempo (ver «Evolução No Período»);
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
- `Quality` e `Flow` fecham com a seção de evolução no tempo dos próprios indicadores;
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

## Evolução No Período

Seção no fim das abas `Quality` e `Flow`, montada por `MetricsTrendSection`
(`src/app/metrics/components/MetricsTrendSection`). Cada aba só declara seus
indicadores, num arquivo `*TrendSection` dentro da própria aba.

- **granularidade** diária, semanal ou mensal, escolhida no gráfico e só ali. Não
  refaz a busca no Jira: a API já devolve as três séries prontas em `series`,
  porque um P50 semanal não sai da média dos P50 diários;
- granularidade inicial pelo tamanho do período — até 45 dias diária, até 180
  semanal, acima disso mensal;
- **um gráfico por unidade**. `%`, `dias` e `cards` vão em gráficos separados;
  dois eixos Y no mesmo desenho inventariam uma correlação que não existe nos
  dados;
- os chips de indicador são também a legenda: linha na cor da série, ícone
  `Sparkles` nos indicadores de IA, e a cor acompanha o indicador — tirar uma
  série do gráfico não repinta as que ficaram;
- bucket sem dado **nunca vira zero**: a linha liga as duas medições vizinhas e
  cada medição de verdade ganha um marcador (até 40 pontos por série; acima
  disso só a linha, senão vira corrente de bolinhas). Quebrar o traço em cada
  lacuna — a primeira versão — picotava o gráfico diário em cacos ilegíveis,
  porque a maioria dos dias não tem entrega nenhuma. No tooltip e na tabela o
  bucket vazio continua aparecendo como `—`;
- botão `Tabela` mostra os mesmos números em tabela — nenhum valor existe só no
  tooltip;
- leitura por mouse (mira vertical + tooltip com todas as séries do gráfico) e
  por teclado (foco no gráfico e setas ← →).

O gráfico em si é `src/components/ui/LineChart`: SVG próprio, sem biblioteca de
charts. Linha de 2px, marcador de 4px de raio com anel de 2px na cor da
superfície, grade em hairline sólido e rótulo do último valor de cada série
(descartado quando colidiria com outro).

A paleta categórica são os tokens `--chart-1` a `--chart-7` em `globals.css`,
com passo próprio no tema escuro. **A ordem dos slots é o mecanismo de segurança
para daltonismo**, validada par a par contra as superfícies clara e escura de
`--card`; reordenar ou trocar uma cor exige revalidar.

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
