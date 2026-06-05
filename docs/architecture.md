# Arquitetura, Stack E Estrutura

## Stack

- Next.js App Router
- TypeScript strict
- TailwindCSS
- React 19
- TanStack React Query
- lucide-react
- componentes locais estilo shadcn/ui

## Estrutura Principal

```text
src/app                  rotas App Router e API routes
src/app/**/components    componentes específicos de cada rota
src/clients              clients externos, como Jira HTTP client
src/components/shared    componentes globais compartilhados
src/components/ui        primitivos visuais locais compartilhados
src/hooks                hooks client-side
src/lib                  regras/utilitários, providers e mappers compartilhados
src/lib/jira             config provider e mappers de Jira que não são services
src/services/jira        services/classes da integração Jira
src/types                tipos de domínio compartilhados
scripts                  utilitários npm
docs                     documentação operacional para IAs
__tests__                testes unitários colocalizados por escopo
```

## Arquivos Críticos

| Arquivo | Papel |
| --- | --- |
| `src/middleware.ts` | protege rotas com sessão assinada |
| `src/lib/auth.ts` | hash, cookie e assinatura da sessão |
| `src/services/jira/dashboard.service.ts` | fluxo principal da integração Jira |
| `src/services/jira/jira-issue-normalizer.service.ts` | Jira issue -> `DashboardIssue` |
| `src/clients/jira/jira.client.ts` | client HTTP do Jira |
| `src/lib/status-mapper.ts` | status Jira -> status de negócio |
| `src/lib/display.ts` | labels pt-BR para UI |
| `src/app/(dashboard)/components/DashboardShell/index.tsx` | estado, filtros, agrupamento e layout do dashboard |
| `src/app/metrics/components/DeveloperMetricsShell/index.tsx` | métricas do Kanban por responsável |
