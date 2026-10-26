# API do AccessForge (`workspace_auth`)

Referência dos endpoints existentes hoje. Descreve o que o código faz, não o que deveria fazer. Visão geral, setup e decisões do projeto ficam no [README](../README.md).

**Base URL nos exemplos:** `http://localhost:3000` (`PORT=3000`).
**Última verificação contra o código:** 2026-10-26, commit `<HASH_DO_COMMIT>`.

Legenda de evidência usada neste documento:

- **[exec]** comportamento observado ao executar a requisição contra o servidor rodando.
- **[código]** comportamento lido no código, não executado.

## Sumário

- [Convenções gerais](#convenções-gerais)
- [Índice de endpoints](#índice-de-endpoints)
- [Fluxo de autenticação](#fluxo-de-autenticação)
- [Endpoints](#endpoints)
- [Limitações conhecidas](#limitações-conhecidas)

## Convenções gerais

### Formato

Requisições com corpo usam JSON (`Content-Type: application/json`). O parser é `express.json()`; outros tipos de corpo chegam como `req.body` indefinido e falham na validação com `400` [exec].

Respostas são JSON, exceto `204` (sem corpo).

### Autenticação

Rotas protegidas esperam:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

- O esquema `Bearer` é case-sensitive: `bearer <token>` retorna `401 Authentication token is required` [exec].
- O access token é um JWT HS256 com os claims `sub` (id do usuário), `iat` e `exp`; validade de 1 hora [exec].
- O refresh token **não** vai no JSON nem no header: viaja só no cookie `refreshToken`.

### Cookie `refreshToken`

Exemplo real de `Set-Cookie` no login [exec]:

```http
Set-Cookie: refreshToken=<refresh_token>; Max-Age=604800; Path=/; Expires=<data +7 dias>; HttpOnly; SameSite=Lax
```

| Atributo | Valor |
|---|---|
| `HttpOnly` | sim |
| `SameSite` | `Lax` |
| `Max-Age` | `604800` segundos (7 dias) [exec] |
| `Path` | `/` |
| `Secure` | só quando `NODE_ENV=production` [código]; ausente em desenvolvimento [exec] |

O valor é um token opaco (32 bytes aleatórios em hexadecimal). O banco guarda apenas o hash SHA-256 [código]. Clientes de linha de comando precisam guardar e reenviar o cookie (`curl -c` / `-b`).

### Formatos de erro

| Situação | Status | Corpo |
|---|---:|---|
| Validação Zod | 400 | `{"error":"Validation error","details":[...]}` [exec] |
| Violação de unicidade (código PostgreSQL `23505`) | 409 | `{"error":"Resource already exists"}` [exec] |
| `AppError` / `UnauthorizedError` / `ForbiddenError` | o do erro | `{"error":"<mensagem>"}` |
| Erro não previsto | 500 | `{"error":"Internal server error"}` [exec] |
| Rota ou método não registrado | 404 | `{"error":"Route not found"}` [exec] |
| Sem header `Authorization: Bearer` | 401 | `{"error":"Authentication token is required"}` [exec] |
| JWT expirado | 401 | `{"error":"Authentication token expired"}` [exec] |
| JWT inválido (malformado, outra assinatura, `alg=none`, sem `sub`) | 401 | `{"error":"Invalid authentication token"}` [exec] |
| Sem membership no workspace | 403 | `{"error":"Access denied"}` [exec] |
| Papel sem permissão | 403 | `{"error":"Insufficient permissions"}` [exec] |

Observações:

- `details` é a lista de `issues` do Zod, repassada sem tratamento; o formato interno depende da versão do Zod (4.x).
- Os `401` não enviam o header `WWW-Authenticate` [exec]. Ver [Limitações](#limitações-conhecidas).
- `/health` e as rotas `501` não retornam o formato `{"error":...}`; seguem formato próprio (ver cada endpoint).

### Precedência quando mais de uma condição falha

Nas rotas protegidas a ordem é: **autenticação → (autorização por papel, quando existe) → validação do corpo → controller**. Confirmado em `POST /workspaces`: sem token e com corpo inválido responde `401`, não `400` [exec]. Em `PATCH /workspaces/:workspaceId`, sem token e com id inválido responde `401` [exec].

### Validação e normalização

Os schemas Zod fazem `trim` e `toLowerCase`, mas o middleware `validate` só valida: não substitui `req.body` pelo resultado. Consequência observada [exec]:

- Registro com `"  Mixed.x@Example.COM "` grava e devolve o e-mail **exatamente assim**, com espaços e maiúsculas.
- Login com o e-mail normalizado desse usuário retorna `401`; login com o texto exato do registro retorna `200`.
- `POST /workspaces` com slug `Mixed-Slug-x` cria o workspace com o slug em maiúsculas, e `name` com espaços nas pontas é gravado com os espaços.

Campos extras no corpo são ignorados [exec].

### CORS

Origem permitida: apenas `FRONTEND_ORIGIN`, mais requisições sem header `Origin` (curl, servidor a servidor). Com `credentials: true`.

- `Origin` permitida: responde com `Access-Control-Allow-Origin` igual à origem e `Access-Control-Allow-Credentials: true` [exec].
- `Origin` não permitida (inclusive preflight `OPTIONS`): responde **`500 {"error":"Internal server error"}`**, sem header de CORS [exec]. Ver [Limitações](#limitações-conhecidas).

### Limites e outros comportamentos globais

- Corpo JSON malformado: `500 Internal server error` [exec].
- Corpo acima do limite padrão do `express.json()` (100 kB): `500 Internal server error` [exec, testado com ~200 kB].
- Header `X-Powered-By` ausente (Helmet) [exec].
- Não há rate limiting [código].

## Índice de endpoints

| # | Método e rota | Auth | Estado |
|---|---|---|---|
| 1 | `GET /health` | pública | estável |
| 2 | `POST /auth/register` | pública | estável |
| 3 | `POST /auth/login` | pública | estável |
| 4 | `GET /auth/me` | Bearer | estável |
| 5 | `POST /auth/refresh` | cookie | estável |
| 6 | `POST /auth/logout` | cookie (opcional) | estável |
| 7 | `GET /workspaces` | Bearer | estável |
| 8 | `POST /workspaces` | Bearer | estável |
| 9 | `PATCH /workspaces/:workspaceId` | Bearer + papel `owner`/`admin` | **incompleto**: só autoriza, não altera dados |
| 10 | `GET /workspaces/:id` | nenhuma | **incompleto**: `501` |
| 11 | `DELETE /workspaces/:id` | nenhuma | **incompleto**: `501` |

São 11 rotas registradas; 8 são o contrato estável, 3 são rotas incompletas descritas ao final desta seção.

## Fluxo de autenticação

```text
register ─► login ─► (access token + cookie refreshToken)
                │
                ├─► chamadas protegidas com Authorization: Bearer <access>
                │        (access expira em 1 h → 401 "Authentication token expired")
                │
                ├─► refresh (cookie) ─► novo access + novo cookie; o cookie anterior é revogado
                │
                └─► logout (cookie) ─► revoga o refresh token apresentado e limpa o cookie
```

Regras observadas [exec]:

1. Cada `login` cria um refresh token novo **sem revogar os anteriores**: três logins deixam três tokens ativos.
2. `refresh` faz rotação: o cookie antigo é revogado e passa a retornar `401 Invalid refresh token`.
3. Reusar um cookie já rotacionado retorna `401`, mas **não** revoga o token novo emitido a partir dele (não há detecção de reuso).
4. Duas renovações simultâneas com o mesmo cookie: uma retorna `200`, a outra `401`.
5. `logout` revoga apenas o refresh token apresentado; outras sessões do mesmo usuário continuam renovando.
6. `logout` não invalida access tokens já emitidos: o JWT continua aceito até expirar (até 1 h).
7. `requireAuth` valida apenas assinatura e expiração do JWT; não consulta o banco.

## Endpoints

Os exemplos usam dados fictícios. `<ACCESS_TOKEN>` é o campo `token` devolvido por login ou refresh. Não versione nem compartilhe o `cookies.txt`.

### 1. `GET /health`

Verifica a conectividade com o banco (`SELECT 1`).

- **Autenticação:** nenhuma.
- **Sucesso:** `200 {"status":"ok","database":"ok"}` [exec]
- **Erro:** `503 {"status":"error","database":"unavailable"}` quando a consulta falha [código; não executado].

```bash
curl -i http://localhost:3000/health
```

### 2. `POST /auth/register`

Cria um usuário. A senha é armazenada com bcrypt (10 rounds) [código].

- **Autenticação:** nenhuma.
- **Corpo:**

| Campo | Tipo | Regras |
|---|---|---|
| `username` | string | 3 a 16 caracteres após `trim` |
| `email` | string | formato de e-mail válido (ver [normalização](#validação-e-normalização)) |
| `password` | string | 8 a 50 caracteres |

- **Sucesso:** `201` com `{"id":"<uuid>","username":"ana","email":"ana@example.com"}`. Sem `password_hash` [exec].
- **Erros:**

| Status | Quando | Corpo |
|---|---|---|
| 400 | campo ausente, tipo errado, tamanho fora da faixa, e-mail inválido, corpo ausente ou não-JSON | `Validation error` + `details` [exec] |
| 409 | e-mail já cadastrado | `Resource already exists` [exec] |

- **Repetição:** não idempotente. Repetir a mesma requisição retorna `409` [exec].
- **Notas:** `username` não é único (dois usuários com `reg` coexistem) [exec]. Campos extras (`role`, `id`) são ignorados [exec]. O e-mail só é único pelo texto exato gravado.

```bash
curl -i -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"ana","email":"ana@example.com","password":"SenhaForte123!"}'
```

### 3. `POST /auth/login`

Autentica por e-mail e senha.

- **Autenticação:** nenhuma.
- **Corpo:** `email` (string, formato de e-mail) e `password` (string, 8 a 50 caracteres).
- **Sucesso:** `200` com `{"user":{"id","username","email"},"token":"<jwt>"}` e `Set-Cookie: refreshToken=...` (ver [cookie](#cookie-refreshtoken)). O refresh token não aparece no JSON [exec].
- **Erros:**

| Status | Quando | Corpo |
|---|---|---|
| 400 | campo ausente, `password` fora de 8–50 | `Validation error` + `details` [exec] |
| 401 | e-mail inexistente **ou** senha errada | `{"error":"Invalid credentials"}` (mesma resposta nos dois casos) [exec] |

- **Repetição:** cada chamada válida cria um novo refresh token e não revoga os anteriores [exec].
- **Notas:** a comparação do e-mail é exata (case-sensitive): `ANA@EXAMPLE.COM` de um usuário cadastrado como `ana@example.com` retorna `401` [exec].

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"SenhaForte123!"}'
```

### 4. `GET /auth/me`

Retorna o usuário dono do access token.

- **Autenticação:** `Authorization: Bearer <ACCESS_TOKEN>`.
- **Sucesso:** `200 {"id","username","email"}` [exec].
- **Erros:**

| Status | Quando | Corpo |
|---|---|---|
| 401 | header ausente, esquema diferente de `Bearer`, `Bearer ` vazio | `Authentication token is required` [exec] |
| 401 | token malformado, assinatura de outro segredo, `alg=none`, assinatura válida sem `sub` | `Invalid authentication token` [exec] |
| 401 | token expirado | `Authentication token expired` [exec] |
| 500 | token válido de usuário que não existe mais | `Internal server error` [exec] |

- **Repetição:** leitura, idempotente.

```bash
curl -i http://localhost:3000/auth/me -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 5. `POST /auth/refresh`

Troca o refresh token por um novo access token e um novo refresh token.

- **Autenticação:** cookie `refreshToken`. Corpo e `Authorization` são ignorados [exec].
- **Sucesso:** `200 {"token":"<novo jwt>"}` e novo `Set-Cookie: refreshToken=...` diferente do anterior [exec].
- **Erros:**

| Status | Quando | Corpo |
|---|---|---|
| 401 | cookie ausente | `Refresh token not provided` [exec] |
| 401 | token inexistente, já usado, revogado (logout) ou expirado | `Invalid refresh token` [exec] |

- **Repetição:** não idempotente. O cookie usado é revogado; reenviá-lo retorna `401` [exec]. Em chamadas simultâneas com o mesmo cookie, uma vence (`200`) e a outra recebe `401` [exec]; a rotação roda em transação com `SELECT ... FOR UPDATE` [código].
- **Notas:** não há detecção de reuso: depois de um reuso rejeitado, o token novo continua funcionando [exec].

```bash
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/auth/refresh
```

### 6. `POST /auth/logout`

Revoga o refresh token apresentado e limpa o cookie.

- **Autenticação:** nenhuma exigida (`requireAuth` não é aplicado). Usa o cookie, se houver.
- **Sucesso:** `204` sem corpo, com `Set-Cookie: refreshToken=; Expires=Thu, 01 Jan 1970 ...` [exec]. Retorna `204` também sem cookie, com cookie inventado e ao repetir com o mesmo cookie [exec].
- **Erros:** nenhum caminho de erro previsto; falhas inesperadas viram `500` [código].
- **Repetição:** idempotente do ponto de vista do cliente (sempre `204`).
- **Notas:** o access token emitido antes continua válido até expirar; `GET /auth/me` com ele retorna `200` após o logout [exec]. Outras sessões do usuário não são afetadas [exec].

```bash
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/auth/logout
```

### 7. `GET /workspaces`

Lista os workspaces dos quais o usuário autenticado é membro, com o papel dele em cada um.

- **Autenticação:** Bearer.
- **Sucesso:** `200` com array:

```json
[
  { "id": "<uuid>", "name": "Workspace da Ana", "slug": "ws-a", "role": "owner" }
]
```

  Sem memberships: `200 []` [exec].
- **Erros:** `401` (ver `GET /auth/me`).
- **Isolamento:** a consulta filtra por `memberships.user_id` do usuário do token. Um usuário B não vê workspaces criados por A [exec e teste de integração do projeto].
- **Notas:** um token válido de usuário já apagado retorna `200 []`, não erro [exec].

```bash
curl -i http://localhost:3000/workspaces -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 8. `POST /workspaces`

Cria um workspace e registra o criador como `owner`, na mesma transação [exec: membership `owner` conferida no banco].

- **Autenticação:** Bearer.
- **Corpo:**

| Campo | Tipo | Regras |
|---|---|---|
| `name` | string | 3 a 50 caracteres após `trim` |
| `slug` | string | 3 a 50 caracteres, `^[a-z0-9-]+$` (ver [normalização](#validação-e-normalização)) |

- **Sucesso:** `201 {"id","name","slug"}`; não inclui `role` [exec].
- **Erros:**

| Status | Quando | Corpo |
|---|---|---|
| 400 | nome ou slug fora das regras, slug com espaço ou `_`, corpo vazio | `Validation error` + `details` [exec] |
| 401 | sem token ou token inválido/expirado | ver convenções [exec] |
| 409 | slug já usado, **mesmo por outro usuário** | `Resource already exists` [exec] |

- **Repetição:** não idempotente: repetir com o mesmo slug retorna `409` [exec].
- **Notas:** o slug é único globalmente, não por usuário, então o `409` revela que o slug existe em algum tenant.

```bash
curl -i -X POST http://localhost:3000/workspaces \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Workspace de exemplo","slug":"workspace-exemplo"}'
```

### 9. `PATCH /workspaces/:workspaceId` (incompleto)

Hoje só executa a autorização; **não altera nenhum dado**.

- **Autenticação:** Bearer + papel `owner` ou `admin` no workspace do parâmetro.
- **Sucesso:** `200 {"message":"Access granted"}` para `owner` e `admin`; o nome do workspace permanece o mesmo depois da chamada [exec].
- **Erros:**

| Status | Quando | Corpo |
|---|---|---|
| 401 | sem token ou inválido | ver convenções [exec] |
| 403 | usuário sem membership (inclui UUID que não existe, sem revelar se o workspace existe) | `Access denied` [exec] |
| 403 | membro com papel `member` | `Insufficient permissions` [exec] |
| 500 | `workspaceId` que não é UUID (erro do PostgreSQL não tratado) | `Internal server error` [exec] |

- **Notas:** corpo não é validado nem usado. `viewer` não foi executado; pela leitura de `requireRole` recebe `Insufficient permissions` [código].

```bash
curl -i -X PATCH http://localhost:3000/workspaces/<WORKSPACE_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 10. `GET /workspaces/:id` e 11. `DELETE /workspaces/:id` (incompletos)

Placeholders. Sem autenticação e sem efeito: respondem `501 {"message":"not implemented"}` (formato diferente do padrão `{"error":...}`) [exec]. Depois do `DELETE`, o workspace continua existindo [exec].

## Limitações conhecidas

Cada item é um fato observado; nenhum é corrigido neste documento. Classificação: **segurança**, **consistência de contrato**, **incompleto**, **operacional**.

| # | Limitação | Classe | Evidência |
|---|---|---|---|
| 1 | `validate` não propaga o resultado do Zod: e-mail e slug gravados crus (espaços, maiúsculas); login com e-mail normalizado falha | consistência de contrato | exec |
| 2 | Falhas de infraestrutura e entrada comum viram `500`: JSON malformado, corpo acima de 100 kB, `Origin` não permitida (CORS), `workspaceId` não-UUID, `/auth/me` de usuário apagado. O esperado seria `400`/`413`/`403`/`404` | consistência de contrato | exec |
| 3 | `401` sem `WWW-Authenticate`. A especificação HTTP pede esse header em respostas `401`; a leitura do RFC 9110 não foi verificada diretamente (só o draft antecessor `draft-ietf-httpbis-p7-auth`) | consistência de contrato | exec (ausência); norma não verificada |
| 4 | Sem detecção de reuso de refresh token: o token novo segue válido depois de um reuso do antigo | segurança | exec |
| 5 | Cada login cria um refresh token sem revogar os anteriores; não há limite de sessões ativas | segurança | exec |
| 6 | Logout não invalida o access token (válido até 1 h); `requireAuth` não consulta o banco | segurança | exec |
| 7 | Sem rate limiting em `/auth/login`, `/auth/register` e `/auth/refresh` | segurança | código |
| 8 | `POST /auth/register` com e-mail repetido retorna `409`, o que confirma que o e-mail está cadastrado (enumeração de usuários), embora o login trate e-mail inexistente e senha errada de forma idêntica | segurança | exec |
| 9 | Slug de workspace é único globalmente; `409` revela slugs de outros tenants | segurança | exec |
| 10 | `PATCH /workspaces/:workspaceId` não atualiza dados; `GET` e `DELETE /workspaces/:id` retornam `501` sem autenticação | incompleto | exec |
| 11 | `username` não é único: dois usuários com o mesmo `username` coexistem | consistência de contrato | exec |
| 12 | Ordem de middlewares muda a mensagem de erro (autenticação antes da validação); documentado em Convenções | consistência de contrato | exec |
| 13 | Migration `005_add_users_username_index.sql` referencia a coluna `username`, que não existe em `users` (a coluna é `name`): `npm run migrate` falha em banco novo | operacional | exec (banco descartável) |
| 14 | `volume.seed.ts` usa `username` e hash placeholder, e `seedVolume()` nunca é chamada | operacional | código |
| 15 | Script `npm start` aponta para `dist/index.js`, mas o servidor sobe em `server.ts` | operacional | código |
| 16 | `.env.example` lista só `PORT` e `DATABASE_URL`; o ambiente exige também `JWT_SECRET` e `FRONTEND_ORIGIN` | operacional | código |
| 17 | `npm test` passa (10 suítes, 31 testes) mas o Jest avisa que não encerra sozinho (handles abertos) | operacional | exec |

## Como reproduzir

A matriz de casos citada como **[exec]** está no script `api-matrix.cjs` (um caso por linha, com a resposta esperada pela leitura do código e marcação `!!` quando divergir). Rode contra um banco de desenvolvimento descartável com o servidor ligado; o script cria e remove os próprios dados.
