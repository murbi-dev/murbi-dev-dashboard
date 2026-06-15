# Autenticação, API E Segurança

## Autenticação

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

## API Routes

| Rota | Método | Uso |
| --- | --- | --- |
| `/api/dashboard` | GET | payload do dashboard |
| `/api/issues/search` | GET | busca global de issues |
| `/api/metrics/quality` | GET | métricas de qualidade por período, com `hotfixOnly=true` opcional |
| `/api/metrics/flow` | GET | métricas de fluxo por período, com `hotfixOnly=true` opcional |
| `/api/auth/login` | POST | login e cookie |
| `/api/auth/logout` | POST | remove cookie |

Regras:

- API deve retornar JSON via `NextResponse`.
- `/api/dashboard` usa `Cache-Control: no-store`.
- `/api/issues/search` usa `Cache-Control: no-store`.
- Jira deve permanecer em `src/services/jira`.
- Não expor credenciais ao browser.

## Segurança

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
