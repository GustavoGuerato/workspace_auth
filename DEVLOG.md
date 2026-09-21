# Development Log

## Dia 1 — Fundação do projeto

- 2026-09-20 — Inicializado o projeto AccessForge com Node.js, TypeScript, Express e Git.
- 2026-09-20 — Configurado o ambiente TypeScript, scripts do projeto, variáveis de ambiente e `.gitignore`.
- 2026-09-20 — Configurado o PostgreSQL com `pg`, `Pool` centralizado e validação da conexão.
- 2026-09-20 — Definida a modelagem inicial do banco, incluindo `users`, `workspaces`, `roles`, `permissions`, `memberships` e `role_permissions`.
- 2026-09-20 — Criada e executada a migration inicial respeitando a ordem das chaves estrangeiras.
- 2026-09-20 — Validada a estrutura do banco e a rota inicial `/health`.
- 2026-09-20 — Organizado o histórico do projeto em commits pequenos e coerentes.

## Dia 2 — Esqueleto da API

- 2026-09-21 — Criado o migration runner para executar e registrar migrations.
- 2026-09-21 — Criado o seed inicial de RBAC com roles, permissions e `role_permissions`.
- 2026-09-21 — Tornado o seed idempotente para permitir reexecução sem duplicar registros.
- 2026-09-21 — Estruturado o esqueleto da API com `/health`, rotas stub de `auth` e `workspaces`.
- 2026-09-21 — Adicionado handler global para rotas não encontradas (`404`).
- 2026-09-21 — Adicionado error handler com resposta padronizada e sem exposição de stack trace ao cliente.
- 2026-09-21 — Testadas manualmente as rotas stub, `/health`, `404` e error handler.
