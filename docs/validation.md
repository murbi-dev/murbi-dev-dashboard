# Validação, Debug, Checklists E Melhorias Futuras

## Performance E Cache

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

## Validação E Debug

Comandos principais:

```bash
npm run typecheck
npm run lint
npm run test
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

## Testes

Testes unitários usam Vitest.

Estrutura atual:

- testes ficam em `__tests__` junto do escopo da implementação;
- fixtures ficam em `__tests__/fixtures` junto do escopo que as usa.

Validação mínima para mudanças:

- TypeScript;
- ESLint;
- testes unitários;
- build de produção.

Regra de testes:

- toda mudança nova de comportamento, regra de negócio, integração ou contrato deve criar ou atualizar testes no mesmo escopo da implementação;
- testes ficam em `__tests__` junto do código testado;
- fixtures ficam em `__tests__/fixtures`;
- `npm run test` precisa passar antes de finalizar qualquer mudança de código.

Se testes forem adicionados, documentar neste arquivo:

- framework;
- estrutura;
- comandos;
- padrões de fixtures.

## Checklist Para Mudanças

Antes de alterar Jira:

- [ ] validar endpoint e JQL;
- [ ] manter paginação;
- [ ] verificar contagem com Jira;
- [ ] atualizar tipos/fixtures/testes se payload mudar.

Antes de alterar status:

- [ ] listar status reais da API;
- [ ] atualizar `status-mapper.ts`;
- [ ] atualizar labels se necessário;
- [ ] validar colunas e estatísticas.

Antes de alterar auth:

- [ ] preservar middleware;
- [ ] validar cookie e redirects;
- [ ] atualizar `.env.example`;
- [ ] atualizar README, `AGENTS.md` e docs relevantes.

Antes de finalizar:

- [ ] `npm run typecheck`;
- [ ] `npm run lint`;
- [ ] `npm run test`;
- [ ] `npm run build`;
- [ ] versão em `package.json` atualizada: patch para ajustes/fixes, minor para features e major para mudança incompatível/versão maior;
- [ ] sem segredos no Git;
- [ ] `AGENTS.md` e docs relevantes atualizados se aplicável.

## Melhorias Futuras Úteis

Sugestões práticas, não estado atual:

- adicionar testes unitários para `status-mapper`, `auth` e `normalize`;
- adicionar teste E2E mínimo para login + dashboard;
- adicionar CI com typecheck/lint/build;
- avisar explicitamente quando aparecer status Jira desconhecido;
- adicionar rate limit no login;
- medir custo do `expand=changelog`;
- criar script de diagnóstico Jira para listar status e contagens do Kanban sem backlog.
