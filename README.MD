# AccessForge

**API de autenticação, autorização e workspaces multi-tenant**, construída com Node.js, TypeScript, Express e PostgreSQL usando SQL puro.

`Node.js` · `TypeScript (strict)` · `Express` · `PostgreSQL` · `Zod` · `JWT` · `bcrypt` · `Jest + Supertest`

O projeto responde a duas perguntas centrais de qualquer backend multi-tenant:

> **Quem é o usuário e o que ele pode ver ou fazer dentro de determinado workspace?**

O foco não é a quantidade de endpoints, mas decisões explícitas e justificadas: autenticação com refresh token rotativo, autorização por membership, validação de entrada, persistência relacional e tratamento de falhas em uma API REST.

## Sumário

- [AccessForge](#accessforge)
  - [Sumário](#sumário)
  - [Destaques](#destaques)
  - [Status](#status)
  - [Como funciona](#como-funciona)
    - [Modelo de dados](#modelo-de-dados)
    - [Ciclo de vida dos tokens](#ciclo-de-vida-dos-tokens)
    - [Decisão de acesso](#decisão-de-acesso)
  - [Stack](#stack)
  - [Decisões técnicas](#decisões-técnicas)
  - [Segurança](#segurança)
  - [Rodando localmente](#rodando-localmente)
    - [Pré-requisitos](#pré-requisitos)
    - [Instalação](#instalação)
    - [Variáveis de ambiente](#variáveis-de-ambiente)
    - [Migrations e execução](#migrations-e-execução)
    - [Verificação de saúde](#verificação-de-saúde)
  - [API](#api)
  - [Testes](#testes)
  - [Estrutura do projeto](#estrutura-do-projeto)
  - [Limitações conhecidas](#limitações-conhecidas)
  - [Roadmap](#roadmap)
  - [Autor](#autor)

## Destaques

- **Papel por workspace, não por conta:** o mesmo usuário pode ter papéis diferentes em workspaces distintos.
- **Refresh token rotativo:** token opaco gerado com `crypto.randomBytes(32)`; só o hash SHA-256 é armazenado no banco.
- **SQL puro e transações:** queries, constraints e operações transacionais explícitas, sem ORM.
- **Validação com Zod:** schemas para payloads e para variáveis de ambiente.
- **Configuração validada na inicialização:** variáveis obrigatórias ausentes ou inválidas impedem a aplicação de subir.

## Status

| Área                                                      | Implementado                                              | Testado                               |
| --------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------- |
| Registro com hash de senha (bcrypt)                       | Sim                                                       | —                                     |
| Login e access token JWT                                  | Sim                                                       | —                                     |
| Refresh token opaco, rotação e revogação no logout        | Sim                                                       | —                                     |
| Consulta do usuário autenticado (`/auth/me`)              | Sim                                                       | —                                     |
| Criação transacional de workspace e membership do criador | Sim                                                       | —                                     |
| Listagem de workspaces do usuário autenticado             | Sim                                                       | — (isolamento multi-tenant sem teste) |
| Validação de payloads com Zod                             | Parcial: dados transformados não são propagados           | —                                     |
| Configuração de ambiente, CORS, Helmet e cookies          | Sim                                                       | —                                     |
| Tratamento centralizado de erros                          | Parcial                                                   | —                                     |
| Autorização por papel (`requireRole`)                     | Somente no `PATCH /workspaces/:workspaceId`               | —                                     |
| Leitura, atualização e exclusão de workspace por id       | Não: `GET` e `DELETE` retornam `501`; `PATCH` só autoriza | —                                     |
| Logging estruturado                                       | Configurado                                               | —                                     |
| Seed de volume e análise de índices                       | Scripts com erro conhecido                                | —                                     |
| Docker, CI, frontend e deploy                             | Pendente                                                  | —                                     |

`—` indica que a área ainda não tem teste automatizado registrado neste README.

## Como funciona

Em uma aplicação multi-tenant, várias organizações compartilham a mesma aplicação sem que uma possa acessar os dados da outra. No AccessForge, o **workspace** é o contexto organizacional. A associação entre usuário e workspace é registrada em `memberships`, que também referencia o papel do usuário naquele workspace.

```text
User → Membership → Workspace
                   └→ Role → Permissions
```

O papel não é uma propriedade global da conta.

### Modelo de dados

```mermaid
erDiagram
    USERS ||--o{ MEMBERSHIPS : possui
    WORKSPACES ||--o{ MEMBERSHIPS : contem
    ROLES ||--o{ MEMBERSHIPS : define
    ROLES ||--o{ ROLE_PERMISSIONS : concede
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : compoe
```

A migration inicial define usuários, workspaces, papéis, permissões, memberships e a associação entre papéis e permissões.

### Ciclo de vida dos tokens

O access token é um JWT com validade de uma hora. O refresh token é opaco, enviado em cookie `HttpOnly` e armazenado no banco apenas como hash SHA-256.

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente
    participant A as API
    participant DB as PostgreSQL

    C->>A: POST /auth/login
    A->>DB: Busca usuário
    A->>A: Verifica senha com bcrypt
    A->>DB: Armazena hash do refresh token
    A-->>C: Access token no JSON + refresh token em cookie

    Note over C,A: Access token expira

    C->>A: POST /auth/refresh com cookie
    A->>DB: Localiza e bloqueia registro do refresh token
    A->>DB: Verifica revogação e expiração
    alt Token válido
        A->>DB: Revoga token antigo e grava o novo hash
        A-->>C: Novo access token + novo cookie
    else Token inválido, expirado ou revogado
        A-->>C: 401 Unauthorized
    end
```

O logout revoga o refresh token apresentado no cookie e limpa o cookie. Ele não invalida os access tokens já emitidos: `requireAuth` valida apenas assinatura e expiração do JWT.

### Decisão de acesso

Rotas protegidas passam por `requireAuth`. O `PATCH /workspaces/:workspaceId` também executa `requireRole("owner", "admin")`, que consulta a membership do usuário naquele workspace.

```mermaid
flowchart TD
    R[Requisição PATCH] --> A[requireAuth]
    A -->|Token inválido| U[401 Unauthorized]
    A -->|Token válido| M[Consulta membership]
    M -->|Sem membership| F[403 Access denied]
    M -->|Membership encontrada| P[Verifica papel]
    P -->|Papel não permitido| I[403 Insufficient permissions]
    P -->|owner ou admin| H[Segue para o handler]
```

Essa autorização contextual existe hoje só nessa rota. As demais rotas de workspace por id ainda não a aplicam (ver [Limitações conhecidas](#limitações-conhecidas)).

## Stack

| Tecnologia           | Responsabilidade                                  |
| -------------------- | ------------------------------------------------- |
| Node.js + TypeScript | Runtime e tipagem estática                        |
| Express              | API HTTP e composição de middlewares              |
| PostgreSQL + `pg`    | Persistência relacional, constraints e transações |
| Zod                  | Schemas de validação                              |
| JWT                  | Emissão e verificação de access tokens            |
| bcrypt               | Hash e comparação de senhas                       |
| `crypto`             | Geração de refresh tokens e hash SHA-256          |
| Helmet               | Cabeçalhos HTTP de segurança                      |
| CORS                 | Controle das origens permitidas                   |
| Cookie Parser        | Leitura dos cookies das requisições               |
| Jest + Supertest     | Testes                                            |

## Decisões técnicas

| Decisão                               | Alternativa               | Motivo                                          | Trade-off                                                                     |
| ------------------------------------- | ------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| SQL puro com `pg`                     | ORM, como Prisma          | Queries, constraints e transações explícitas    | Mais código manual e menos tipagem automática das consultas                   |
| Papel por membership                  | Coluna `role` em `users`  | Papéis distintos por workspace                  | Consulta adicional para resolver o papel                                      |
| Refresh token opaco com hash no banco | Refresh token em JWT      | Revogação no servidor sem guardar o token bruto | Consulta ao banco a cada renovação                                            |
| Rotação de refresh tokens             | Token fixo até expirar    | Reduz a reutilização de tokens antigos          | Fluxo de renovação mais complexo                                              |
| Transação ao criar workspace          | Inserts independentes     | Workspace e membership criados atomicamente     | Controle explícito de conexão e rollback                                      |
| Zod para validação                    | Validação manual dispersa | Regras de entrada centralizadas                 | Dependência extra; transformações precisam ser propagadas                     |
| Runner próprio de migrations          | Ferramenta pronta         | Controle do processo de aplicação               | Mais responsabilidade por versionamento, concorrência e recuperação de falhas |

## Segurança

Referências: OWASP Top 10 e OWASP API Security Top 10 (2023). A tabela descreve mecanismos do projeto, não certificação de conformidade.

| Risco                   | Mecanismo                                         | Observação                                           |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Quebra de autenticação  | bcrypt, JWT com expiração, refresh token rotativo | O logout não invalida access tokens já emitidos      |
| BOLA / IDOR             | Membership e autorização contextual               | Cobertura incompleta nas rotas de workspace          |
| Escalada de privilégios | Middleware `requireRole`                          | Aplicado hoje só ao `PATCH`                          |
| Configuração insegura   | Validação de ambiente, CORS, Helmet, cookies      | Depende da configuração do ambiente e do cliente     |
| Entradas inválidas      | Schemas Zod                                       | O middleware não propaga `result.data` ao `req.body` |
| Vazamento de informação | Resposta genérica para erros não tratados         | Alguns erros diretos têm mensagens específicas       |
| Força bruta             | Não há rate limiting                              | Limitação conhecida                                  |

## Rodando localmente

### Pré-requisitos

Node.js compatível com as dependências do projeto, npm, PostgreSQL e Git.

### Instalação

```bash
git clone <URL_DO_REPOSITORIO>
cd workspace_auth
npm install
cp .env.example .env
```

No PowerShell: `Copy-Item .env.example .env`.

Crie o banco e configure o `.env`:

```sql
CREATE DATABASE workspace_auth;
```

### Variáveis de ambiente

| Variável          | Descrição                                    | Exemplo                                                     |
| ----------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `PORT`            | Porta HTTP (obrigatória)                     | `3000`                                                      |
| `DATABASE_URL`    | String de conexão PostgreSQL (obrigatória)   | `postgresql://postgres:senha@localhost:5432/workspace_auth` |
| `JWT_SECRET`      | Segredo de assinatura dos JWTs (obrigatória) | valor aleatório forte                                       |
| `FRONTEND_ORIGIN` | Origem permitida pelo CORS (obrigatória)     | `http://localhost:5173`                                     |
| `NODE_ENV`        | Ambiente                                     | `development`, `test` ou `production`; padrão `development` |

Para gerar um segredo:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Nunca versione o `.env` nem credenciais reais.

### Migrations e execução

```bash
npm run migrate
npm run dev
```

A aplicação imprime a porta em que subiu. Com `PORT=3000`, a URL local é `http://localhost:3000`.

> **Atenção:** a migration de índice referencia `users.username`, mas a migration inicial define `users.name`. Enquanto isso não for corrigido, `npm run migrate` falha em um banco novo. Ver [Limitações conhecidas](#limitações-conhecidas).

### Verificação de saúde

```bash
curl http://localhost:3000/health
```

Com o banco acessível: `200` e `{"status":"ok","database":"ok"}`. Se a consulta falhar: `503` e `{"status":"error","database":"unavailable"}`.

## API

Contratos completos (payloads, respostas, cookies, formatos de erro e exemplos `curl`) em **[docs/API.md](docs/API.md)**.

| Método | Rota             | Autenticação          | Descrição                                          |
| ------ | ---------------- | --------------------- | -------------------------------------------------- |
| `GET`  | `/health`        | Pública               | Verifica a conectividade com o PostgreSQL          |
| `POST` | `/auth/register` | Pública               | Registra um usuário                                |
| `POST` | `/auth/login`    | Pública               | Autentica e emite os tokens                        |
| `GET`  | `/auth/me`       | Bearer JWT            | Retorna o usuário autenticado                      |
| `POST` | `/auth/refresh`  | Cookie `refreshToken` | Renova o access token e rotaciona o refresh token  |
| `POST` | `/auth/logout`   | Cookie opcional       | Revoga o refresh token e limpa o cookie            |
| `GET`  | `/workspaces`    | Bearer JWT            | Lista os workspaces do usuário                     |
| `POST` | `/workspaces`    | Bearer JWT            | Cria um workspace e associa o criador como `owner` |

As rotas `GET`, `PATCH` e `DELETE /workspaces/:id` ainda não estão concluídas e fazem parte do [Roadmap](#roadmap).

## Testes

```bash
npm test
```

O projeto usa Jest e Supertest.

**Resultado da última execução:** `<colar aqui a saída de npm test: suítes, testes passando e falhando>`

Cenários prioritários para a suíte:

- Registro, login e credenciais inválidas.
- Token ausente, inválido e expirado.
- Rotação, expiração e revogação de refresh tokens.
- Criação transacional de workspace e membership.
- Autorização por papel.
- Isolamento entre tenants: com dois usuários e workspaces diferentes, a listagem de um não retorna dados do outro.
- Comportamento do access token depois do logout.

## Estrutura do projeto

```text
workspace_auth/
├── migrations/
│   ├── 001_init.sql
│   └── ...
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   └── logger.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   └── workspace.Controller.ts
│   ├── db/
│   │   ├── pool.ts
│   │   └── migrate.ts
│   ├── middlewares/
│   │   ├── errorHandler.ts
│   │   ├── requireAuth.ts
│   │   ├── requireRole.ts
│   │   └── validate.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── health.routes.ts
│   │   └── workspaces.routes.ts
│   ├── schemas/
│   │   ├── auth.schemas.ts
│   │   ├── env.schema.ts
│   │   └── workspaces.schemas.ts
│   ├── services/
│   │   ├── auth.services.ts
│   │   ├── refresh-token.service.ts
│   │   ├── user.services.ts
│   │   └── workspace.services.ts
│   ├── errors.ts
│   ├── index.ts
│   └── server.ts
├── docs/
│   └── API.md
├── package.json
├── tsconfig.json
└── README.md
```

## Limitações conhecidas

- **Validação Zod:** o middleware valida o body, mas não atribui `result.data` a `req.body`. Transformações como `trim()` e `toLowerCase()` não chegam aos serviços.
- **Migration de índice:** usa `users.username`, mas a tabela inicial define `users.name`. A migration falha em um banco novo.
- **Seed de volume:** referencia `users.username` e usa um placeholder literal no lugar do hash de senha.
- **Script `start`:** aponta para `dist/index.js`, enquanto o desenvolvimento inicia `src/server.ts`. O caminho de saída do build precisa ser alinhado ao `tsconfig.json`.
- **`GET /auth/me`:** se o usuário do token não existe mais, o serviço lança um erro genérico e a resposta é `500`.
- **Rotas de workspace por id:** `GET` e `DELETE /workspaces/:id` retornam `501` e estão registradas sem autenticação. `PATCH /workspaces/:workspaceId` só verifica a autorização e retorna uma mensagem fixa, sem atualizar dados.
- **Revogação de access token:** o logout revoga o refresh token, mas os JWTs já emitidos valem até expirar.
- **Rate limiting:** não há limitação de tentativas em login ou refresh.
- **CSRF:** não há token CSRF dedicado. A proteção depende de `SameSite=Lax` no cookie e da configuração de CORS.
- **Tratamento de erros:** parte das respostas sai direto dos middlewares e controllers, fora do handler central.
- **Isolamento multi-tenant:** a listagem filtra por `m.user_id`, mas ainda não existe teste ponta a ponta com dois usuários.

## Roadmap

- [ ] Propagar os dados transformados pelo Zod ao controller.
- [ ] Corrigir as referências a `users.username` nas migrations e no seed.
- [ ] Alinhar `start`, build e `tsconfig.json`.
- [ ] Implementar leitura, atualização e exclusão de workspaces com autorização contextual.
- [ ] Testes de isolamento multi-tenant.
- [ ] Testes de rotação, revogação e expiração de tokens.
- [ ] Uniformizar o tratamento de erros.
- [ ] Seed de volume e análise de índices com `EXPLAIN ANALYZE`.
- [ ] Rate limiting nas operações sensíveis.
- [ ] Avaliar proteção CSRF conforme o modelo de cliente.
- [ ] Docker e CI.
- [ ] Especificação OpenAPI.
- [ ] Frontend e deploy.

## Autor

**Gustavo Guerato** · [LinkedIn](https://linkedin.com/in/gustavo-guerato-6b8403259)

Projeto de portfólio para estudo prático de engenharia de backend: autenticação, autorização, modelagem relacional, segurança de APIs e consistência de dados.