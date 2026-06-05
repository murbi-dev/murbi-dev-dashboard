# AGENTS.md

Guia operacional para IAs trabalharem no **Murbi Dev Dashboard** sem depender do contexto do chat.

Este arquivo deve ficar sincronizado com a codebase. Se uma mudança alterar arquitetura, autenticação, Jira, status, scripts, envs, fluxo de dados ou padrões relevantes, atualize este arquivo e o documento temático correspondente no mesmo PR/commit.

## Contexto Rápido

- Dashboard operacional sobre Jira para suporte, negócio, operações e gestão.
- Não é substituto do Jira. Mostra uma visão simplificada do Kanban contínuo, sem backlog.
- Foco: leitura rápida, modo TV, cards principais fora do backlog, HOTFIX, status de negócio e atualização automática.
- Tela `/metrics` mostra distribuição operacional do fluxo por desenvolvedor, sem ranking ou score individual.
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
- manter services como classes em arquivos `*.service.ts`;
- manter clients externos em `src/clients`, não em `src/services`;
- manter componentes específicos dentro de `src/app/**/components` e componentes genéricos em `src/components`;
- manter testes e fixtures em `__tests__` junto do escopo testado;
- criar ou atualizar testes para toda mudança nova de comportamento, regra de negócio, integração ou contrato;
- sempre rodar `npm run test` junto de typecheck, lint e build antes de finalizar;
- atualizar `package.json` em toda mudança: patch para ajustes/fixes, minor para features e major para mudança incompatível/versão maior;
- manter query do board sem backlog e sem subtarefas;
- manter paginação;
- manter dados simulados apenas como fixtures de teste;
- preservar HOTFIX pinado;
- preservar cálculo de idade no status atual.

Evitar:

- refatoração ampla sem necessidade;
- criar camadas inexistentes sem motivo;
- duplicar labels de status fora de `display.ts`;
- mudar status mapping sem consultar dados reais;
- adicionar dependência pesada para problema simples;
- transformar dashboard em sistema CRUD.
