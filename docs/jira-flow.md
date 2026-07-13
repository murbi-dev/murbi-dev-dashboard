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
| `In Development` | Em Desenvolvimento | `Em andamento`, `Pull request`, `Pronto para QA` |
| `Validation` | Em Teste | `Teste QA` |
| `Finalizing` | Aguardando Deploy | `Pronto para PROD` |
| `Done` | Em Produção | `Concluído`, `Concluido` |

Regras:

- Status desconhecido não entra no dashboard principal; isso evita exibir status não mapeado como coluna errada.
- `Backlog`, épicos e subtarefas ficam fora do dashboard por JQL.
- `JiraDashboardService` também descarta épicos e subtarefas antes de normalizar, como defesa contra mudanças na configuração do board.
- Ao investigar cards em coluna errada, agrupe `jiraStatus -> businessStatus` da `/api/dashboard`.
- Labels visíveis ficam em `src/lib/display.ts`.
- Cards mostram explicitamente o `jiraStatus` real, além da coluna de negócio.
- Colunas com múltiplos status técnicos mostram no topo o total da coluna e a contagem por `jiraStatus`; no modo standard, essa lista também filtra a própria coluna.

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

## Dados Do Card

O card mostra:

- tempo no status atual;
- quantidade de reprovações em QA;
- data de criação da issue no Jira;
- última atualização;
- complexidade quando o campo Jira `Complexidade` (`customfield_10345`) vier preenchido com `PP`, `P`, `M`, `G` ou `GG`;
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

## Fluxo (Flow Metrics)

Endpoint: `GET /api/metrics/flow?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&hotfixOnly=true`

Service: `src/services/jira/flow.service.ts` (`JiraFlowService`)

Métricas principais: **Lead Time** e **Aging**.

### Fluxo

```
frontend -> /api/metrics/flow -> JiraFlowService -> Jira REST API (via JiraClient) -> helper de fluxo -> resposta
```

### Cálculo

- Lead Time considera tickets concluídos no período.
- Aging considera tickets ativos no período.
- `hotfixOnly=true` filtra tanto tickets concluídos quanto ativos para issues com prioridade `HOTFIX`.

### Limitações

- O filtro HOTFIX segue a mesma regra de prioridade do dashboard.
- O cálculo depende do changelog para identificar entrada em andamento e idade dos cards ativos.
