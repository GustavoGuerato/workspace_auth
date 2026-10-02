# Development Log


- 2026-09-20 — Inicializado o projeto AccessForge com Node.js, TypeScript, Express e Git.
- 2026-09-20 — Configurado o ambiente TypeScript, scripts do projeto, variáveis de ambiente e `.gitignore`.
- 2026-09-20 — Configurado o PostgreSQL com `pg`, `Pool` centralizado e validação da conexão.
- 2026-09-20 — Definida a modelagem inicial do banco, incluindo `users`, `workspaces`, `roles`, `permissions`, `memberships` e `role_permissions`.
- 2026-09-20 — Criada e executada a migration inicial respeitando a ordem das chaves estrangeiras.
- 2026-09-20 — Validada a estrutura do banco e a rota inicial `/health`.
- 2026-09-20 — Organizado o histórico do projeto em commits pequenos e coerentes.


- 2026-09-21 — Criado o migration runner para executar e registrar migrations.
- 2026-09-21 — Criado o seed inicial de RBAC com roles, permissions e `role_permissions`.
- 2026-09-21 — Tornado o seed idempotente para permitir reexecução sem duplicar registros.
- 2026-09-21 — Estruturado o esqueleto da API com `/health`, rotas stub de `auth` e `workspaces`.
- 2026-09-21 — Adicionado handler global para rotas não encontradas (`404`).
- 2026-09-21 — Adicionado error handler com resposta padronizada e sem exposição de stack trace ao cliente.
- 2026-09-21 — Testadas manualmente as rotas stub, `/health`, `404` e error handler.


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


- 2026-09-27 — Implementado o endpoint protegido para criação de workspaces utilizando o usuário autenticado como criador.
- 2026-09-27 — Implementada a criação do workspace e do membership inicial do criador dentro de uma única transação PostgreSQL.
- 2026-09-27 — Definido o uso de um cliente dedicado via `pool.connect()` para garantir que todas as operações da transação utilizem a mesma conexão.
- 2026-09-27 — Implementado `BEGIN`, `COMMIT`, `ROLLBACK` e liberação do cliente com `finally`.
- 2026-09-27 — Implementada a busca da role `owner` pelo nome, evitando dependência de IDs fixos.
- 2026-09-27 — Tornada a seed das roles idempotente utilizando `ON CONFLICT (name) DO NOTHING`.
- 2026-09-27 — Implementado tratamento para ausência da role `owner`, interrompendo a operação e acionando o rollback da transação.
- 2026-09-27 — Implementado tratamento de violação de unicidade do PostgreSQL (`23505`) no error handler, retornando `409 Conflict`.
- 2026-09-27 — Validada manualmente a criação de um workspace e do membership do usuário autenticado com a role `owner`.
- 2026-09-27 — Validada a associação correta entre `users`, `workspaces`, `memberships` e `roles`.
- 2026-09-27 — Definida a regra de unicidade do workspace através das constraints existentes no banco, especialmente para o `slug`.


- 2026-09-29 — Estudado e aplicado Zod 4 para validação das entradas da API.
- 2026-09-29 — Criados schemas de validação para register, login e criação de workspace.
- 2026-09-29 — Implementada normalização de `username`, `email`, `name` e `slug` antes das validações correspondentes.
- 2026-09-29 — Mantida a senha sem normalização para preservar seu valor exato durante a autenticação.
- 2026-09-29 — Implementado middleware genérico `validate` utilizando `safeParse` do Zod.
- 2026-09-29 — Integrada a validação Zod às rotas de registro, login e criação de workspace antes da execução da lógica de negócio.
- 2026-09-29 — Integrado `ZodError` ao error handler central, retornando `400 Bad Request` com os detalhes das falhas de validação.
- 2026-09-29 — Validado manualmente o fluxo de registro com dados inválidos e confirmada a resposta padronizada de validação.
- 2026-09-29 — Validado manualmente o fluxo de registro e login com dados válidos após a integração do Zod.
- 2026-09-29 — Validada manualmente a criação de workspace com dados válidos após a integração do Zod.
- 2026-09-29 — Validada a rejeição de workspace com `slug` inválido, confirmando que o erro é interceptado pelo Zod antes da lógica de negócio.
- 2026-09-29 — Separada a configuração da aplicação Express da inicialização do servidor HTTP, permitindo que o app seja importado diretamente pelos testes com Supertest.
- 2026-09-29 — Mantido `index.ts` como módulo responsável pela configuração e exportação da aplicação Express.
- 2026-09-29 — Criado `server.ts` como ponto responsável pela inicialização do servidor com `app.listen()`.
- 2026-09-29 — Preparada a arquitetura da aplicação para o primeiro teste real de integração utilizando Supertest e PostgreSQL.


- 2026-10-02 — Estudada a separação de responsabilidades entre Access Token e Refresh Token no fluxo de autenticação.
- 2026-10-02 — Definido o Access Token como JWT de curta duração, com expiração de `1h`, utilizado para autenticar requisições protegidas.
- 2026-10-02 — Definido o Refresh Token como token opaco de longa duração, sem payload JWT e sem necessidade de ser interpretado pelo cliente.
- 2026-10-02 — Definido o armazenamento do Refresh Token bruto em cookie `httpOnly`, reduzindo sua exposição ao JavaScript do navegador.
- 2026-10-02 — Definido o uso de `Secure` para o cookie em ambiente de produção e `SameSite` como mecanismo adicional de proteção relacionado a CSRF.
- 2026-10-02 — Criada a tabela `refresh_tokens` para representar sessões persistentes de autenticação associadas aos usuários.
- 2026-10-02 — Definido o armazenamento apenas do hash SHA-256 do Refresh Token no PostgreSQL, evitando persistir o token bruto no banco.
- 2026-10-02 — Implementada a geração criptograficamente segura de Refresh Tokens utilizando `crypto.randomBytes()`.
- 2026-10-02 — Implementada a persistência do Refresh Token com associação ao usuário, data de expiração, data de criação e estado de revogação.
- 2026-10-02 — Implementada a validação server-side do Refresh Token verificando existência, revogação e expiração.
- 2026-10-02 — Integrada a emissão do Refresh Token ao fluxo de login sem expor o token no corpo da resposta HTTP.
- 2026-10-02 — Implementado o endpoint `POST /auth/refresh` para emissão de um novo Access Token utilizando o Refresh Token armazenado no cookie.
- 2026-10-02 — Implementada a rotação de Refresh Tokens, criando um novo token e revogando o token utilizado anteriormente.
- 2026-10-02 — Implementada a substituição do cookie após uma rotação bem-sucedida.
- 2026-10-02 — Implementada a rejeição de reutilização de Refresh Tokens já revogados, retornando `401 Unauthorized`.
- 2026-10-02 — Implementado o endpoint `POST /auth/logout` para revogar server-side o Refresh Token da sessão atual.
- 2026-10-02 — Implementada a limpeza do cookie `refreshToken` durante o logout.
- 2026-10-02 — Definido o logout como operação idempotente quando não existe Refresh Token no cookie, retornando `204 No Content`.
- 2026-10-02 — Criados testes de integração para login, emissão do cookie, refresh, rotação, reutilização de token revogado e logout.
- 2026-10-02 — Validado que o Refresh Token não é retornado no JSON das respostas de login e refresh.
- 2026-10-02 — Validado que o cookie do Refresh Token possui a flag `HttpOnly`.
- 2026-10-02 — Validado que o Refresh Token antigo deixa de funcionar após a rotação.
- 2026-10-02 — Validado que o Refresh Token deixa de funcionar após o logout.
- 2026-10-02 — Validado que o logout sem cookie não gera erro e retorna `204`.
- 2026-10-02 — Identificado e corrigido um erro no fluxo de logout que impedia o controller de finalizar corretamente a resposta HTTP.
- 2026-10-02 — Executada a suíte completa de testes após as alterações, totalizando 20 testes aprovados em 6 suítes.
- 2026-10-02 — Executado o Jest com `--detectOpenHandles` para diagnosticar operações assíncronas pendentes.
- 2026-10-02 — Confirmado o encerramento correto do Jest após a finalização do pool PostgreSQL nos testes.
- 2026-10-02 — Consolidado o fluxo de sessão renovável do AccessForge: login → Access Token + Refresh Token → refresh com rotação → revogação → logout.
