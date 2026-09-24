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
  **## Dia 3 — Autenticação**

- 2026-09-22 — Implementado o registro de usuários com validação de entrada, verificação de e-mail duplicado e hash de senha com `bcrypt`.

- 2026-09-22 — Implementado o login com validação de credenciais e geração de token JWT.

- 2026-09-22 — Definido o payload do JWT contendo apenas o `sub` com o ID do usuário, sem senha ou `password_hash`.

- 2026-09-22 — Definida a expiração do token JWT em `1h` e configurado o `JWT_SECRET` por variável de ambiente.

- 2026-09-22 — Implementado o middleware `requireAuth` para validação do token Bearer e identificação do usuário autenticado.

- 2026-09-22 — Adicionado o usuário autenticado à requisição através de `req.user`.

- 2026-09-22 — Implementado tratamento distinto para token ausente, inválido e expirado utilizando o formato de erro padronizado.

- 2026-09-22 — Implementada a rota protegida `/auth/me` para retornar os dados do usuário autenticado sem expor o `password_hash`.

- 2026-09-22 — Testados manualmente registro, duplicidade de e-mail, login, autenticação da rota `/me` e ausência de dados sensíveis nas respostas.
