# AGENTS.md

Guia operacional para IAs trabalharem no **Murbi Dev Dashboard** sem depender do contexto do chat.

Este arquivo deve ficar sincronizado com a codebase. Se uma mudança alterar arquitetura, autenticação, Jira, status, scripts, envs, fluxo de dados ou padrões relevantes, atualize este arquivo e o documento temático correspondente no mesmo PR/commit.

## Contexto Rápido

- Dashboard operacional sobre Jira para suporte, negócio, operações e gestão.
- Não é substituto do Jira. Mostra uma visão simplificada do Kanban contínuo, sem backlog.
- Foco: leitura rápida, modo TV, cards principais fora do backlog, HOTFIX, status de negócio e atualização automática.
- Campo Jira `Fluxo Dev` (`customfield_10414`, valores `Dev Humano` e `Dev IA`) vira `isAiDev` no card, com badge roxo `IA` e filtro `Dev IA` no modo standard.
- **Planejamento** é coluna própria do board, entre Pendente e Em Desenvolvimento, e recebe o status `10224`. É onde o card fica enquanto a IA planeja (spec, design, tarefas); não é gate de aprovação.
- **Status é sempre comparado por `id`, nunca por nome** — em código, em JQL e no changelog. O nome é traduzido conforme o idioma da conta que consulta e muda em renomeação; serve só para exibir. Constantes em `JIRA_STATUS_ID` (`src/lib/status-mapper.ts`).
- **Trilha** (`Projeto` × `Sustentação`) vem do campo `Divisão` do **épico pai**; sem épico conta como sustentação. Vira badge no card e filtro no modo standard.
- Status do Jira **sem mapeamento não é mais descartado**: cai em `Waiting`, marca `isUnknownStatus` e gera faixa de aviso no painel. Renomear status no Jira sem atualizar `STATUS_MAPPING` esvaziava a coluna em silêncio.
- Tela `/metrics` possui abas `Overview` (resumo operacional em tempo real com cards de Cards Ativos, Concluídos, Responsáveis e HOTFIX), `Devs` (distribuição por desenvolvedor), `Quality` (Delivery Quality Rate com filtro de período e opção Apenas HOTFIX) e `Flow` (Lead Time, Aging e Tempo de Planejamento (IA), com filtro de período e opção Apenas HOTFIX).
- `Quality` e `Flow` terminam com a seção **Evolução no período**: gráfico de linhas com seleção de indicadores e granularidade (diária, semanal ou mensal). A granularidade é só do gráfico e **não refaz a busca no Jira** — a API manda as três séries prontas na mesma resposta, porque P50 não se reagrega a partir de P50 diário. Série é montada em `src/lib/jira/jira-series.helper.ts` a partir das issues já buscadas, sem chamada extra.
- **Um gráfico por unidade.** Indicadores em `%`, `dias` e `cards` nunca dividem o mesmo desenho: dois eixos Y no mesmo plot inventam correlação que não existe. Bucket sem dado é `null` e nunca vira zero — no gráfico a linha liga as medições vizinhas e marca cada medição real, porque quebrar o traço em cada lacuna picotava o diário em cacos.
- A paleta categórica dos gráficos vive em `globals.css` (`--chart-1` a `--chart-7`, com passo próprio no tema escuro). **A ordem dos slots é o mecanismo de segurança para daltonismo** e foi validada par a par contra as superfícies clara e escura — reordenar ou trocar cor exige revalidar.
- Métricas de fluxo distinguem IA × Humano: Lead Time e Aging têm versão segmentada (`leadTimeByFlow`/`agingByFlow`) e há a métrica dedicada **Tempo de Planejamento (IA)** (espera no gate `Aprovação` do PRD, exclusiva do fluxo `Dev IA`). Tudo o que é de IA usa cor violeta + ícone `Sparkles`.
- Lógica de rejeição QA centralizada em `src/lib/jira/jira-metrics.helper.ts` — usada tanto pelo dashboard quanto pelas métricas de qualidade.
- Lógica de fluxo (Lead Time, Aging, Tempo de Aprovação, segmentação IA × Humano) centralizada em `src/lib/jira/jira-flow.helper.ts` — usada pelo serviço de flow e, pelo `getStatusHistory` exportado dali, também pelas séries temporais.
- Séries temporais das duas abas centralizadas em `src/lib/jira/jira-series.helper.ts`, sobre o bucketing puro de `src/lib/date-buckets.ts` (UTC, semana começando na segunda).
- Interface visível deve ficar em **português do Brasil**.
- Código, tipos, funções, arquivos e valores internos ficam em **inglês**.

## Referências

- [Arquitetura, stack e estrutura](docs/architecture.md)
- [Autenticação, API e segurança](docs/auth-api-security.md)
- [Integração Jira, status, cards e HOTFIX](docs/jira-flow.md)
- [Frontend, dashboard, métricas e UI](docs/frontend.md)
- [Validação, debug, checklists e melhorias futuras](docs/validation.md)

## Scripts Principais

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run auth:hash -- sua-senha
npm run auth:secret
```

Sempre rode antes de finalizar mudanças de código:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Regras Críticas Para IAs

Obrigatório:

- atualizar este arquivo e os documentos em `docs/` ao mudar arquitetura, envs, auth, Jira, status ou padrões relevantes;
- manter código interno em inglês e UI em pt-BR;
- manter Jira server-side;
- manter `/api/dashboard` como contrato do frontend;
- manter `/api/metrics/quality` como contrato da aba Quality, incluindo o campo `series`;
- manter `/api/metrics/flow` como contrato da aba Flow, incluindo o campo `series`;
- manter as três granularidades na mesma resposta, sem parâmetro de granularidade na API;
- revalidar a paleta dos gráficos ao mexer em `--chart-*`;
- manter services como classes em arquivos `*.service.ts`;
- manter clients externos em `src/clients`, não em `src/services`;
- manter componentes específicos dentro de `src/app/**/components` e componentes genéricos em `src/components`;
- manter testes e fixtures em `__tests__` junto do escopo testado;
- criar ou atualizar testes para toda mudança nova de comportamento, regra de negócio, integração ou contrato;
- sempre rodar `npm run test` junto de typecheck, lint e build antes de finalizar;
- usar Conventional Commits em todo commit feito por IA;
- atualizar `package.json` em toda mudança: patch para ajustes/fixes, minor para features e major para mudança incompatível/versão maior;
- manter query do board sem backlog, épicos e subtarefas;
- manter paginação;
- manter dados simulados apenas como fixtures de teste;
- preservar HOTFIX pinado;
- preservar cálculo de idade no status atual.

Evitar:

- refatoração ampla sem necessidade;
- criar camadas inexistentes sem motivo;
- duplicar labels de status fora de `display.ts`;
- mudar status mapping sem consultar dados reais;
- adicionar dependência pesada para problema simples (os gráficos são SVG próprio em `src/components/ui/LineChart`, sem biblioteca de charts);
- colocar indicadores de unidades diferentes no mesmo gráfico ou criar segundo eixo Y;
- transformar dashboard em sistema CRUD.
