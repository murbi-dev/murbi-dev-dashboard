# Integração Jira, Status, Cards E HOTFIX

## Integração Jira

Frontend nunca chama Jira diretamente. O fluxo é:

```text
UI -> /api/dashboard -> JiraDashboardService -> Jira REST API -> JiraIssueNormalizerService -> UI
UI -> /api/issues/search -> JiraIssueSearchService -> Jira REST API -> normalize search results -> UI
```

O client HTTP do Jira fica em `src/clients/jira/jira.client.ts`. Services não devem conter client externo.

Envs Jira:

```env
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_BOARD_ID=
```

Fluxo real:

1. Buscar dados do board:

```text
/rest/agile/1.0/board/{boardId}
```

2. Buscar cards principais do board fora do backlog:

```text
/rest/agile/1.0/board/{boardId}/issue
```

JQL obrigatório:

```text
status != Backlog AND issuetype != Epic AND issuetype not in subTaskIssueTypes() AND (statusCategory != Done OR status CHANGED TO Done AFTER -14d)
```

3. Usar paginação (`startAt`, `maxResults=100`).
4. Usar `expand=changelog` para calcular idade no status e reprovações QA.
5. Buscar metadados de campos para detectar o campo real de complexidade e campos reais de épico.
6. Normalizar em `src/services/jira/jira-issue-normalizer.service.ts`.

Não voltar para fluxo baseado em sprint ativa. O dashboard é Kanban contínuo e deve excluir backlog via JQL.

## Busca Global De Issues

- endpoint separado: `GET /api/issues/search?q=`;
- não substitui o dashboard do Kanban;
- busca sob demanda, com debounce no frontend (~300ms);
- não carrega backlog inteiro no frontend;
- se `q` parecer issue key, prioriza JQL `issueKey = KEY`;
- para texto, usa JQL `summary ~ "termo"`;
- retorna no máximo 15 resultados;
- usa campos mínimos: `summary`, `status`, `assignee`, `updated`;
- resultados mostram status atual, responsável, última atualização e link para o Jira; não mostram sprint.

## Sem Mock Runtime

Dados simulados não devem entrar no fluxo de produção.

- se as credenciais Jira faltarem, `getDashboardData` e `searchIssues` devem falhar;
- se o Jira falhar, a falha deve subir para a API route;
- a UI deve mostrar estado de erro real, não cards simulados;
- fixtures simuladas ficam apenas em `__tests__/fixtures` junto do escopo testado.

Ao mudar tipos de `DashboardIssue` ou payload, atualize também as fixtures e testes relacionados.

## Status E Regras De Negócio

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
| `Waiting` | Pendente | `Tarefas pendentes` |
| `Planning` | Planejamento | `10224` (Planejamento) |
| `In Development` | Em Desenvolvimento | `Em andamento`, `Pull request`, `Pronto para QA` |
| `Validation` | Em Teste | `Teste QA` |
| `Finalizing` | Aguardando Deploy | `Pronto para PROD` |
| `Done` | Em Produção | `Concluído`, `Concluido` |

A coluna **Planejamento** é onde o card fica no fluxo de IA (`Fluxo Dev = Dev IA`) enquanto a IA planeja: lê o card, escreve o `spec.md` e, quando o tamanho pede, o design e as tarefas. **Não é gate de aprovação** — o gate acabou em 11/08/2026, junto com o status `PRD Reprovado`.

⚠️ **O mapa casa por `id` de status, nunca por nome** (`JIRA_STATUS_ID` em `src/lib/status-mapper.ts`). O nome não serve de chave por dois motivos, e os dois já quebraram este board: ele é **traduzido conforme o idioma da conta** que consulta (uma conta em inglês recebe `In Progress`, uma em português recebe `Em andamento`) e **muda quando alguém renomeia** o status no workflow. O nome continua vindo no card, mas só para exibir.

Vale para o **JQL também**: as buscas usam `status = 10012`, não `status = Done`. E vale para o **changelog**: o helper de fluxo lê `from`/`to` (ids), não `fromString`/`toString`.

Ids confirmados em `/rest/api/3/project/MURBI/statuses`. Como transição e status têm nomes diferentes, conferir pelo id evita confundir os dois.

> ⚠️ **Os nomes de status são configuração do Jira, e o mapa casa pelo nome exibido.** Renomear um status lá esvazia a coluna aqui, sem erro. Por isso status não mapeado passou a **aparecer com aviso** em vez de ser descartado, e por isso o gate aceita mais de uma grafia.

Regras:

- Status desconhecido **entra** no dashboard, cai em `Waiting`, é marcado com `isUnknownStatus` e gera uma faixa de aviso no topo do painel mais um `console.warn` no servidor. Antes ele era descartado em silêncio, o que escondia mudança de configuração no Jira. Agora só dispara para status **novo**, já que renomear não afeta mais nada.
- `Backlog`, épicos e subtarefas ficam fora do dashboard por JQL.
- `JiraDashboardService` também descarta épicos e subtarefas antes de normalizar, como defesa contra mudanças na configuração do board.
- Ao investigar cards em coluna errada, agrupe `jiraStatus -> businessStatus` da `/api/dashboard`.
- Labels visíveis ficam em `src/lib/display.ts`.
- Cards mostram explicitamente o `jiraStatus` real, além da coluna de negócio.
- Colunas com múltiplos status técnicos mostram no topo o total da coluna e a contagem por `jiraStatus`; no modo standard, essa lista também filtra a própria coluna.

## Trilha do card (Projeto × Sustentação)

A trilha diz de onde o card veio, e é o que define quais artefatos a `dev-issue` produz para ele.

- Sai do campo **`Divisão`** do **épico pai** (`Projeto` | `Sustentação`), não do card.
- Regra: `Projeto` → `project`. **Qualquer outra coisa** — `Sustentação`, campo vazio, ou card **sem épico** → `sustaining`. É a mesma regra da skill `dev-issue`, e precisa continuar sendo, senão o board contradiz o processo.
- O id do campo é resolvido por **nome** (`divisão`) pelo `JiraFieldMetadataMapper`, como os demais.
- Custo zero de requisição: o `Divisão` entra na busca de épicos que o `JiraDashboardService` já fazia em lote para pegar nome e cor.
- Aparece como badge no card (`Projeto` com ícone de pasta, `Sustentação` com boia) e como filtro no modo standard.

## HOTFIX

Regra atual:

- prioridade Jira `HOTFIX` vira `isHotfix = true` (`isHotfixIssue` em `src/lib/jira/jira-metrics.helper.ts`);
- a mesma regra de prioridade é compartilhada pelas métricas Quality e Flow quando `hotfixOnly=true`;
- toda chamada ao Jira que precisa dessa regra deve pedir o campo `priority`;
- HOTFIX fica pinado no topo da coluna;
- recebe badge e estilo vermelho, no lugar do badge de prioridade;
- indicador de resumo HOTFIX mostra `pendentes/total`;
- HOTFIX pendente é `isHotfix` com `businessStatus !== "Done"`;
- HOTFIX concluído é `isHotfix` na coluna final atual (`Done` / Em Produção).
- HOTFIX não calcula mais previsão por complexidade nem fila por responsável.

Não tornar case-insensitive sem validar títulos reais do Jira.

## Fluxo Dev (Dev IA)

Regra atual:

- o campo Jira `Fluxo Dev` (`customfield_10414`) é um select com os valores `Dev Humano` e `Dev IA`;
- o id do campo é resolvido por nome em `JiraFieldMetadataMapper` (`devFlowFieldId`), nunca hardcoded no serviço;
- `JiraDashboardService` inclui `devFlowFieldId` nos campos pedidos ao Jira;
- `JiraIssueNormalizerService` transforma o valor `Dev IA` (comparação sem case) em `isAiDev = true`; `Dev Humano`, campo vazio ou campo ausente resultam em `isAiDev = false`;
- o card exibe badge roxo com ícone `Sparkles` e texto `IA` quando `isAiDev = true`;
- o modo standard tem o filtro `Dev IA`, que mostra apenas cards com `isAiDev = true`;
- a exportação para Excel inclui a coluna `Dev IA` (`Sim`/`Não`).

## Dados Do Card

O card mostra:

- tempo no status atual;
- quantidade de reprovações em QA;
- data de criação da issue no Jira;
- última atualização;
- complexidade quando o campo Jira `Complexidade` (`customfield_10345`) vier preenchido com `PP`, `P`, `M`, `G` ou `GG`;
- badge `IA` quando o campo Jira `Fluxo Dev` (`customfield_10414`) vier com `Dev IA`;
- data limite quando o campo Jira `Data limite` (`duedate`) vier preenchido;
- ícone real do tipo da issue vindo de `issuetype.iconUrl`, com tooltip usando `issuetype.name`;
- épico quando vier via `parent` épico ou campos de épico detectados nos metadados do Jira, com cor quando o campo real `Issue color` estiver disponível.

Não mostra idade total desde criação.

`qaRejectionCount` conta transições do changelog em que o card saiu de `Teste QA` para fila de retrabalho (`Tarefas pendentes`, `Em andamento`, `To Do` ou `In Progress`). `qaRejections` guarda cada evento com origem, destino e data. O card exibe `Reprovações QA: N` apenas quando `N > 0`; ao clicar, abre um modal com o histórico de retornos.

A lógica de detecção de rejeição QA está centralizada em `src/lib/jira/jira-metrics.helper.ts`. Esse helper é usado tanto pelo `JiraIssueNormalizerService` (dashboard) quanto pelo `JiraQualityService` (métricas), evitando duplicação de regras.

`createdAt` vem de `issue.fields.created`, é normalizado em `src/services/jira/jira-issue-normalizer.service.ts` e aparece no footer do card como idade relativa pt-BR compacta (`Criado há 2 semanas`).

Complexidade, tipo e épico:

- `complexity` vem do campo Jira `Complexidade` (`customfield_10345`), que retorna um objeto de seleção em cascata como `{ value: "M", id: "10165" }`; se o campo não existir, vier vazio ou retornar valor fora de `PP`, `P`, `M`, `G` e `GG`, o badge `Complexidade: valor` não aparece.
- `dueDate` vem do campo Jira `Data limite` (`duedate`), que retorna uma data sem hora em formato `YYYY-MM-DD`; o card mostra `Data limite: DD/MM/AAAA (distância relativa)`, como `hoje`, `amanhã`, `em 3 dias` ou `há 2 dias`, fica amarelo quando vence hoje ou amanhã e vermelho quando a data já passou.
- `issueType` vem de `fields.issuetype`; a UI renderiza somente o `iconUrl` real do Jira e usa `name` apenas no tooltip.
- `epic` vem primeiro de `fields.parent` quando o parent é épico; para projetos clássicos, usa campos de épico detectados em `/rest/api/3/field`.
- A cor do épico vem do campo real `Issue color` (`com.pyxis.greenhopper.jira:jsw-issue-color`) buscado nos épicos pais e é aplicada diretamente no marcador do badge; sem cor retornada, usa badge neutro.
- Não criar ícones, tipos, pontuações ou labels de épico manuais para dados reais.

`statusChangedAt` é calculado em `JiraIssueNormalizerService` como a maior data entre:

- entrada no status atual via changelog;
- `statuscategorychangedate`;
- criação do card.

Motivo: o contador deve representar há quanto tempo o card está no status atual do fluxo Kanban, não idade total desde criação.

Não remover `expand=changelog` sem substituir esse cálculo.

## Qualidade (Quality Metrics)

Endpoint: `GET /api/metrics/quality?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&hotfixOnly=true`

Service: `src/services/jira/quality.service.ts` (`JiraQualityService`)

Métrica principal: **Delivery Quality Rate**.

### Fluxo

```
frontend -> /api/metrics/quality -> JiraQualityService -> Jira REST API (via JiraClient) -> shared helper -> resposta
```

### JQL

Usa o board do Jira configurado para buscar tickets que entraram em `Concluído` no período:

```text
issuetype != Epic AND issuetype not in subTaskIssueTypes() AND status = Done AND status CHANGED TO Done AFTER "{start}" AND status CHANGED TO Done BEFORE "{end+1d}"
```

> Nota: O JQL usa o nome de sistema do status ("Done"), não o nome exibido na interface ("Concluído"). O nome de sistema do status "Concluído" pode variar entre instâncias Jira.

### Cálculo

- `totalDeliveries`: total de tickets entregues no período.
- `deliveriesWithRework`: tickets entregues que possuem ao menos uma rejeição QA no changelog (via `src/lib/jira/jira-metrics.helper.ts`).
- `qualityRate`: `((totalDeliveries - deliveriesWithRework) / totalDeliveries) * 100`.
- `hotfixOnly=true`: filtra as entregas consideradas para issues com prioridade `HOTFIX`.

### Limitações

- Tickets que foram concluídos e depois reabertos dentro do mesmo período não são contabilizados (o JQL exige `status = Concluído`).
- O changelog pode ser truncado pelo Jira (>100 entradas), subestimando rejeições QA.

### Extensibilidade

Novas métricas de qualidade (Rework Rate, Defect Rate, Hotfix Rate etc.) devem ser adicionadas em `JiraQualityService` e expostas no mesmo payload ou em novos campos do payload existente.

## Séries Temporais Das Métricas

Os payloads de `/api/metrics/quality` e `/api/metrics/flow` trazem um campo `series` com a evolução dos mesmos indicadores dentro do período filtrado. É o que alimenta a seção «Evolução no período» das duas abas.

Helper: `src/lib/jira/jira-series.helper.ts`, sobre o bucketing puro de `src/lib/date-buckets.ts`.

### Decisões

- **As três granularidades vêm na mesma resposta** (`series.daily`, `series.weekly`, `series.monthly`). Não existe parâmetro de granularidade na API: trocar a granularidade na tela não pode custar outra ida ao Jira, e um P50 semanal não se reagrega a partir dos P50 diários — precisa dos valores crus, que só existem no servidor.
- **Custo zero de rede.** A série é montada a partir das issues que o service já buscou para os números principais.
- **Cada indicador é datado pelo evento que o produz**, sempre sobre o mesmo conjunto de issues do card principal, para o gráfico decompor o número acima dele:

  | Indicador | Datado por |
  |---|---|
  | Entregas, retrabalho, QA rejections, Delivery Quality Rate | transição para `Concluído` |
  | Lead Time (total, P50, IA, Humano) e entregas concluídas | transição para `Concluído` |
  | Tempo de Planejamento (IA) | **primeira** entrada no gate de aprovação |
  | Aging | primeira entrada em `Em andamento` |

- Card reaberto e reentregue é datado pela transição para `Concluído` **dentro do período**, com fallback para a primeira de todas.
- Bucket sem dado é `null`, nunca zero — a diferença entre "não entregamos nada" e "entregamos com 0% de qualidade" importa. Na tela o `null` não vira ponto no eixo: a linha liga as medições vizinhas e marca cada medição real (ver `docs/frontend.md`).
- Semanas começam na segunda-feira (ISO) e são recortadas pelo período: a primeira e a última podem ser parciais. Meses são meses de calendário, também recortados. Tudo em UTC, porque ancorar no fuso do servidor mudaria a entrega de bucket conforme onde a app roda.

### Limitações

- Issue com changelog truncado pelo Jira não tem transição datada: entra no número principal e fica de fora da série.
- Aging é medido contra *agora*, como no card principal. O bucket diz "que idade têm hoje os cards iniciados naquele período", não a idade do WIP na época.

## Fluxo (Flow Metrics)

Endpoint: `GET /api/metrics/flow?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&hotfixOnly=true`

Service: `src/services/jira/flow.service.ts` (`JiraFlowService`)

Métricas principais: **Lead Time**, **Aging** e **Tempo de Planejamento (IA)**.

### Fluxo

```
frontend -> /api/metrics/flow -> JiraFlowService -> Jira REST API (via JiraClient) -> helper de fluxo -> resposta
```

O service resolve dinamicamente o `devFlowFieldId` (campo `Fluxo Dev`) via `JiraFieldMetadataCacheService` e o inclui na busca, para conseguir separar cards de IA (`Fluxo Dev = Dev IA`) dos humanos.

### Cálculo

- Lead Time considera tickets concluídos no período.
- Aging considera tickets ativos no período.
- **Tempo de Planejamento (IA)** mede quanto tempo o card esperou **por uma pessoa** no gate. Soma **todas** as estadas no status de aprovação (não só a primeira), porque hoje o card passa pelo gate mais de uma vez por desenho: sustentação aprova PRD e depois Spec, e uma reprovação manda o card para `PRD/Spec Reprovado` e de volta. O tempo no status de reprovação **não conta** — ali quem está trabalhando é a IA. Se o card ainda está no gate, a estada aberta conta até agora. É inerentemente **IA-only**, pois só o fluxo `Dev IA` passa por esse status (`calculateApprovalWait` em `src/lib/jira/jira-flow.helper.ts`).
- **Segmentação IA × Humano:** Lead Time e Aging também são calculados separadamente para o fluxo de IA e o humano (`leadTimeByFlow` / `agingByFlow`, cada um com `ai` e `human`), usando `isAiDevIssue`. A UI mostra os dois lado a lado (IA com cor violeta + ícone `Sparkles`) e marca cada item crítico de IA com o badge `Sparkles` (`isAiDev` em `AgingIssue`).
- `hotfixOnly=true` filtra tanto tickets concluídos quanto ativos para issues com prioridade `HOTFIX`. Como HOTFIX é fluxo humano, o Tempo de Aprovação tende a ficar vazio nesse filtro.

Estatísticas de fluxo (média, P50, P75, P90, `totalIssues`) são padronizadas por `buildFlowStats`; `null` quando não há dados no período.

### Limitações

- O filtro HOTFIX segue a mesma regra de prioridade do dashboard.
- O cálculo depende do changelog para identificar entrada em andamento, idade dos cards ativos e passagem pelo gate de aprovação.
- A segmentação IA × Humano depende de o campo `Fluxo Dev` estar preenchido; cards sem o campo (ou quando o `devFlowFieldId` não é resolvido) caem no lado **Humano**.
