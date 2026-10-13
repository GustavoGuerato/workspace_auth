# AccessForge

**API de autenticação, autorização e workspaces multi-tenant**, construída com Node.js, TypeScript, Express e PostgreSQL (SQL puro).

`Node.js` · `TypeScript (strict)` · `Express` · `PostgreSQL` · `Zod` · `JWT` · `Jest + Supertest`

O projeto responde a duas perguntas centrais de qualquer backend multi-tenant:

> **Quem é o usuário e o que ele pode ver ou fazer dentro de determinado workspace?**

O foco não é a quantidade de endpoints, e sim decisões explícitas e justificadas: autenticação com refresh token rotativo, autorização por membership, validação na fronteira, isolamento entre tenants e proteção contra falhas comuns em APIs REST.

## Destaques

- **Papel por workspace, não por conta:** o mesmo usuário pode ser `admin` em um workspace e `viewer` em outro.
- **Refresh token rotativo:** opaco, com apenas o hash SHA-256 no banco e revogação no logout.
- **SQL puro e transações:** sem ORM, com constraints e atomicidade tratadas de forma explícita.
- **Validação na fronteira:** Zod para payloads e para as variáveis de ambiente, com falha rápida no boot.
- **Decisões documentadas:** cada escolha tem alternativa, motivo e trade-off, além de uma seção de limitações.

<details>
<summary><b>English summary</b></summary>

AccessForge is a multi-tenant authentication and authorization API built with Node.js, TypeScript, Express and raw SQL on PostgreSQL. It features JWT access tokens, opaque rotating refresh tokens (stored as SHA-256 hashes), membership-based RBAC, Zod validation, centralized error handling, and an integration test suite (Jest + Supertest). It is a portfolio project focused on explicit, defensible security and data-modeling decisions.

</details>

## Sumário

- [Destaques](#destaques)
- [Status do projeto](#status-do-projeto)
- [Como funciona](#como-funciona)
- [Stack](#stack)
- [Decisões técnicas](#decisões-técnicas)
- [Segurança](#segurança)
- [Rodando localmente](#rodando-localmente)
- [Endpoints](#endpoints)
- [Testes](#testes)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Limitações conhecidas](#limitações-conhecidas)
- [Roadmap](#roadmap)
- [Fluxo de desenvolvimento](#fluxo-de-desenvolvimento)
- [Autor](#autor)

## Status do projeto

| Área | Status |
| --- | --- |
| Registro e login com hash de senha (bcrypt) | Implementado |
| Access token JWT e rota protegida `/me` | Implementado |
| Refresh token opaco, rotação e logout (revogação) | Implementado |
| Workspaces e memberships (criação transacional) | Implementado |
| RBAC com papéis `owner`, `admin`, `member`, `viewer` | Implementado |
| Validação de entrada com Zod | Implementado |
| Configuração de ambiente validada no boot, CORS restrito, Helmet, cookies seguros | Implementado |
| Tratamento centralizado de erros | Em andamento |
| Autorização contextual por workspace e testes de isolamento entre tenants | Em andamento |
| Logging estruturado | Planejado |
| Seed com volume de dados e análise de índices (`EXPLAIN ANALYZE`) | Planejado |
| Docker, CI, frontend e deploy | Planejado |

## Como funciona

Em aplicações multi-tenant, várias organizações compartilham a mesma aplicação sem poder acessar os dados umas das outras. No AccessForge, cada contexto de isolamento é um **workspace**, e um mesmo usuário pode ter papéis diferentes em workspaces diferentes (por exemplo, `admin` em um e `viewer` em outro).

O papel **não** é uma propriedade global da conta. Ele vem da associação do usuário ao workspace:

```
User → Membership → Workspace + Role → Permissions
```

### Modelo de dados

```mermaid
erDiagram
    USERS ||--o{ MEMBERSHIPS : possui
    WORKSPACES ||--o{ MEMBERSHIPS : contem
    ROLES ||--o{ MEMBERSHIPS : define
    ROLES ||--o{ ROLE_PERMISSIONS : concede
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : compoe
    WORKSPACES ||--o{ RESOURCES : isola
```

### Ciclo de vida dos tokens

O access token tem vida curta. O refresh token é opaco, gerado com aleatoriedade criptográfica, e **só o hash SHA-256 fica no banco**. A cada renovação o token usado é revogado e um novo é emitido (rotação).

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente
    participant A as API
    participant DB as PostgreSQL

    C->>A: POST /auth/login (email, senha)
    A->>DB: busca usuário e valida senha (bcrypt)
    A->>DB: grava hash SHA-256 do refresh token
    A-->>C: access token (JWT) + refresh token (cookie)

    Note over C,A: o access token expira

    C->>A: POST /auth/refresh (refresh token)
    A->>DB: busca pelo hash, valida expiração e revogação
    alt token válido
        A->>DB: revoga o token usado e grava o novo hash
        A-->>C: novo access token + novo refresh token
    else inexistente, expirado, revogado ou já usado
        A-->>C: 401
    end
```

### Modelo de decisão de acesso

Estar autenticado não basta. Cada operação protegida verifica o vínculo do usuário com o workspace solicitado e o papel dele **naquele** workspace.

```mermaid
flowchart LR
    R[Requisição] --> A[requireAuth: valida o JWT]
    A --> M[Membership do usuário no workspace?]
    M -->|não| N[Acesso negado]
    M -->|sim| P[requireRole: o papel permite a ação?]
    P -->|não| N
    P -->|sim| H[Handler / service]
```

## Stack

| Tecnologia | Responsabilidade |
| --- | --- |
| Node.js + TypeScript (strict) | Runtime e tipagem estática |
| Express | API REST e composição de middlewares |
| PostgreSQL + `pg` | Persistência relacional, constraints e transações, com SQL puro |
| Zod | Validação de entradas e das variáveis de ambiente |
| JWT | Emissão e verificação de access tokens |
| bcrypt | Hash de senhas |
| `crypto` (Node) | Refresh tokens aleatórios e hashes SHA-256 |
| Helmet + CORS | Cabeçalhos de segurança e origem permitida |
| Jest + Supertest | Testes unitários e de integração |

## Decisões técnicas

| Decisão | Alternativa descartada | Motivo | Trade-off |
| --- | --- | --- | --- |
| SQL puro com `pg` | ORM (Prisma) | Enxergar queries, constraints e transações sem abstração | Mais código manual, menos tipagem automática |
| Papel por **membership** | Coluna `role` em `users` | Um usuário participa de vários workspaces com papéis distintos | Uma consulta a mais para resolver o papel |
| Refresh token **opaco** com hash no banco | Refresh token em JWT | Revogável no servidor; vazamento do banco não expõe o token | Consulta ao banco a cada renovação |
| **Rotação** de refresh tokens | Token fixo até expirar | Reduz a janela de uso de um token roubado | Fluxo de renovação mais complexo |
| **Transação** ao criar workspace | Inserts separados | Workspace e vínculo do `owner` são confirmados juntos ou revertidos | Exige controle explícito de conexão |
| Validação com **Zod** na fronteira | Validação manual nos serviços | Uma fonte de verdade para validar e inferir tipos | Dependência adicional |
| **Runner de migrations próprio** (`migrate.ts`) | Ferramenta pronta | Entender como migrations funcionam por dentro | Sem rollback automático nem controle de concorrência |

## Segurança

Referências: OWASP Top 10 e **OWASP API Security Top 10 (2023)**.

| Risco | Mitigação | Referência |
| --- | --- | --- |
| Quebra de autenticação | bcrypt, JWT com expiração, refresh token aleatório com hash no banco, rotação e revogação | API2:2023 |
| BOLA / IDOR | Autorização por recurso e workspace, nunca só por ID | API1:2023 |
| Escalada de privilégios | RBAC por membership e verificação de papel por rota | API5:2023 |
| Configuração insegura | Variáveis validadas no boot, CORS com origem explícita, Helmet, cookies `HttpOnly`/`Secure`/`SameSite` | API8:2023 |
| Entradas malformadas | Schemas Zod antes da lógica de negócio | n/a |
| Vazamento de informação | Error handler central: sem stack traces, segredos ou hashes nas respostas | n/a |

Essas medidas não constituem certificação de conformidade com o OWASP. A eficácia depende da implementação de cada endpoint e da cobertura de testes, e as lacunas atuais estão em [Limitações conhecidas](#limitações-conhecidas).

## Rodando localmente

**Pré-requisitos:** Node.js (LTS), npm, PostgreSQL e Git.

```bash
# 1. Clonar e instalar
git clone <URL_DO_REPOSITORIO>
cd workspace_auth
npm install

# 2. Configurar o ambiente
cp .env.example .env        # no Windows (PowerShell): Copy-Item .env.example .env

# 3. Criar o banco (no psql)
#    CREATE DATABASE workspace_auth;

# 4. Aplicar as migrations
npm run migrate

# 5. Iniciar a API
npm run dev
```

Confira se está no ar: `GET http://localhost:3000/health`.

### Variáveis de ambiente

| Variável | Descrição | Exemplo |
| --- | --- | --- |
| `PORT` | Porta HTTP | `3000` |
| `DATABASE_URL` | String de conexão do PostgreSQL | `postgresql://postgres:senha@localhost:5432/workspace_auth` |
| `JWT_SECRET` | Segredo de assinatura dos JWTs | gerado (veja abaixo) |
| `FRONTEND_ORIGIN` | Origem permitida pelo CORS | `http://localhost:5173` |

A aplicação **falha na inicialização** se alguma variável obrigatória estiver ausente ou inválida. Para gerar um `JWT_SECRET` forte:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

> Nunca versione o `.env`. O repositório mantém apenas o `.env.example`, sem segredos reais.

## Endpoints

| Método | Rota | Auth | Descrição |
| --- | --- | :---: | --- |
| `GET` | `/health` | não | Estado da aplicação e conectividade com o banco |
| `POST` | `/auth/register` | não | Cria um usuário |
| `POST` | `/auth/login` | não | Autentica e emite access token e refresh token |
| `POST` | `/auth/refresh` | cookie | Renova a sessão com rotação do refresh token |
| `POST` | `/auth/logout` | cookie | Revoga o refresh token |
| `GET` | `/me` | JWT | Retorna o usuário autenticado |
| `POST` | `/workspaces` | JWT | Cria um workspace e registra o criador como `owner` |

Exemplo rápido:

```bash
# registrar
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@exemplo.com","password":"SenhaForte123!"}'

# login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@exemplo.com","password":"SenhaForte123!"}'

# rota protegida (use o access token retornado no login)
curl http://localhost:3000/me -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Testes

```bash
npm test
```

A suíte usa **Jest + Supertest**, com testes de integração rodando contra PostgreSQL. Ela cobre:

- registro, login e validação de credenciais;
- verificação de access tokens e rotas protegidas;
- criação, rotação, expiração e revogação de refresh tokens;
- respostas de erro padronizadas;
- regras de autorização por papel.

Em sistemas multi-tenant, o teste mais importante é o **acesso cruzado**: um usuário de um workspace não pode ler nem alterar recursos de outro. Ampliar essa cobertura é prioridade (veja o [Roadmap](#roadmap)).

## Estrutura do projeto

```
.
├── migrations/          # arquivos .sql versionados
├── src/
│   ├── config/          # variáveis de ambiente validadas
│   ├── db/              # Pool do pg e runner de migrations (migrate.ts)
│   ├── middlewares/     # requireAuth, requireRole, validação, error handler
│   ├── routes/          # definição dos endpoints
│   ├── schemas/         # schemas Zod
│   ├── services/        # regras de negócio
│   └── index.ts         # entrada da aplicação
├── .env.example
└── README.md
```

## Limitações conhecidas

Documentar o que **não** está coberto faz parte do projeto:

- **Sem rate limiting** no login ou na renovação de tokens, o que deixa a API exposta a força bruta (API4:2023). Está planejado.
- **Sem token CSRF dedicado.** A proteção do cookie de refresh depende de `SameSite` e de CORS restrito.
- **Access tokens não são revogáveis** antes de expirar (JWT sem estado). Por isso a vida curta.
- **Sem frontend, CI, Docker e deploy** por enquanto. A configuração de CORS já está preparada para o frontend.

## Roadmap

- [ ] Consolidar a autorização contextual por workspace
- [ ] Ampliar os testes de isolamento multi-tenant
- [ ] Concluir o tratamento centralizado de erros
- [ ] Adicionar logging estruturado
- [ ] Medir o PostgreSQL com dados em volume e criar índices guiados por `EXPLAIN ANALYZE`
- [ ] Containerizar com Docker e automatizar testes com CI
- [ ] Documentar os contratos HTTP (OpenAPI)
- [ ] Frontend e deploy

## Fluxo de desenvolvimento

- **Commits pequenos e descritivos**, um por etapa lógica (por exemplo: emissão do refresh token, rotação, logout, testes).
- **`DEVLOG.md`** com uma linha por sessão de trabalho, registrando o que foi feito e as decisões tomadas.
- **Evolução incremental:** cada etapa só avança quando a anterior está coberta por testes.

## Autor

**Gustavo Guerato** · [LinkedIn](https://linkedin.com/in/gustavo-guerato-6b8403259)

Projeto de portfólio para estudo prático de engenharia de backend: autenticação, autorização, modelagem relacional, segurança de APIs e consistência de dados.
