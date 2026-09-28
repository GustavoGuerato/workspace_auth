**# Development Log**

**## Dia 1 — Fundação do projeto**

- 2026-09-20 — Inicializado o projeto AccessForge com Node.js, TypeScript, Express e Git.

- 2026-09-20 — Configurado o ambiente TypeScript, scripts do projeto, variáveis de ambiente e `.gitignore`.

- 2026-09-20 — Configurado o PostgreSQL com `pg`, `Pool` centralizado e validação da conexão.

- 2026-09-20 — Definida a modelagem inicial do banco, incluindo `users`, `workspaces`, `roles`, `permissions`, `memberships` e `role_permissions`.

- 2026-09-20 — Criada e executada a migration inicial respeitando a ordem das chaves estrangeiras.

- 2026-09-20 — Validada a estrutura do banco e a rota inicial `/health`.

- 2026-09-20 — Organizado o histórico do projeto em commits pequenos e coerentes.

**## Dia 2 — Esqueleto da API**

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

- 2026-09-24 — Configurado o Jest com `ts-jest`, Supertest e suporte a testes em TypeScript.

- 2026-09-24 — Criados testes unitários para o middleware `requireAuth`, cobrindo os principais fluxos de autenticação.

- 2026-09-24 — Criado teste unitário para login com credenciais corretas, validando o retorno do usuário e a geração de um token JWT.

- 2026-09-24 — Definida a estratégia de isolamento dos testes de login utilizando mocks para o acesso ao PostgreSQL, mantendo `bcrypt` e `jsonwebtoken` reais para validar o comportamento de autenticação.

- 2026-09-24 — Validado que os testes de login não dependem de dados persistidos no banco de desenvolvimento.
  2026-09-27 — Implementado o endpoint protegido para criação de workspaces utilizando o usuário autenticado como criador.
  2026-09-27 — Implementada a criação do workspace e do membership inicial do criador dentro de uma única transação PostgreSQL.
  2026-09-27 — Definido o uso de um cliente dedicado via pool.connect() para garantir que todas as operações da transação utilizem a mesma conexão.
  2026-09-27 — Implementado BEGIN, COMMIT, ROLLBACK e liberação do cliente com finally.
  2026-09-27 — Implementada a busca da role owner pelo nome, evitando dependência de IDs fixos.
  2026-09-27 — Tornada a seed das roles idempotente utilizando ON CONFLICT (name) DO NOTHING.
  2026-09-27 — Implementado tratamento para ausência da role owner, interrompendo a operação e acionando o rollback da transação.
  2026-09-27 — Implementado tratamento de violação de unicidade do PostgreSQL (23505) no error handler, retornando 409 Conflict.
  2026-09-27 — Validada manualmente a criação de um workspace e do membership do usuário autenticado com a role owner.
  2026-09-27 — Validada a associação correta entre users, workspaces, memberships e roles.
  2026-09-27 — Definida a regra de unicidade do workspace através das constraints existentes no banco, especialmente para o slug.
