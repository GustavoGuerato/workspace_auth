# AccessForge

Motor de autorização multi-tenant: workspaces, roles, memberships e permissões — a base de "quem pode ver e fazer o quê" que todo SaaS precisa resolver.

## Stack

- Node.js + TypeScript
- Express
- PostgreSQL (`pg`, SQL puro, sem ORM)
- JWT (access token) + refresh token com rotação
- Zod (validação de entrada)
- Jest + Supertest (testes)

## Estrutura do projeto

```
accessforge/
├── src/
│   ├── db/         # Pool do PostgreSQL, migration runner
│   ├── routes/     # Definição de rotas (sem lógica de negócio)
│   ├── errors.ts   # Classes de erro (AppError, UnauthorizedError, ForbiddenError...)
│   └── index.ts    # Configuração da aplicação Express (exportada para testes)
│   └── server.ts   # Inicialização do servidor HTTP (app.listen)
├── migrations/     # Arquivos .sql versionados
├── .env.example
└── DEVLOG.md
```

## Como rodar

```bash
npm install
cp .env.example .env    # preencher com os valores locais
npm run migrate         # aplica as migrations pendentes
npm run seed             # popula roles e permissions (RBAC base)
npm run dev
```

### Testes

```bash
npm test
```

## Variáveis de ambiente

A aplicação **falha rapidamente na inicialização** (fail-fast) se alguma variável obrigatória estiver ausente, em vez de falhar de forma obscura em tempo de execução.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | Sim | Porta em que o servidor HTTP escuta |
| `DATABASE_URL` | Sim | String de conexão do PostgreSQL |
| `JWT_SECRET` | Sim | Segredo usado para assinar o access token |
| `FRONTEND_ORIGIN` | Sim | Origem permitida pelo CORS |

Veja `.env.example` para o contrato completo (nomes das variáveis, sem valores reais).

## Segurança

Esta seção documenta as medidas de segurança aplicadas até o momento, mapeadas ao OWASP Top 10. Ela é atualizada conforme o projeto evolui — para o detalhamento completo de ameaça/mecanismo/decisão de cada item, veja `DIA-9-API-HARDENING.md`.

### Autenticação e sessão

- **Senhas:** hash com `bcrypt` (lento por design, adequado para segredos de baixa entropia escolhidos por humanos).
- **Access token:** JWT assinado com `JWT_SECRET`, payload mínimo (apenas o `id` do usuário no `sub`), expiração de 1 hora.
- **Refresh token:** string aleatória de alta entropia (`crypto.randomBytes`), nunca armazenada em texto puro — apenas o hash SHA-256 fica no banco. Implementa **rotação**: cada uso invalida o token atual e emite um novo. Implementa **detecção de reuso**: se um token já rotacionado (revogado) for reapresentado, toda a cadeia de tokens daquele usuário é revogada, tratando o evento como possível roubo de token.
- **Cookies do refresh token:** `HttpOnly` (inacessível via JavaScript no cliente), `Secure` (somente HTTPS em produção), `SameSite` configurado considerando que o frontend roda em origem distinta da API.

### Autorização

- **RBAC por workspace:** a role de um usuário não é uma propriedade global (não existe em `users`); é uma propriedade da relação `membership` (usuário × workspace × role). O mesmo usuário pode ser `owner` em um workspace e `viewer` em outro.
- **Middleware `requireRole`:** verifica a membership do usuário autenticado especificamente no `workspace_id` da rota, antes de checar se a role tem permissão suficiente. Ausência de membership e role insuficiente são tratados como casos distintos (ambos retornam 403, mas com mensagens diferentes, preservando a semântica).
- **Proteção contra IDOR:** nenhuma rota confia em `workspace_id` vindo do corpo da requisição para decisões de permissão — o acesso é sempre derivado da membership validada.

### Validação de entrada

- **Zod** valida forma e tipo de todo payload de entrada (register, login, criação de workspace) antes de qualquer lógica de negócio rodar.
- Campos como `username`, `email`, `name` e `slug` são normalizados antes da validação; a senha é preservada sem normalização, para não alterar seu valor exato na autenticação.

### Cabeçalhos HTTP e CORS

- **Helmet** aplicado globalmente, configurando os cabeçalhos de segurança padrão (proteção contra sniffing de MIME, clickjacking, entre outros).
- **CORS restrito** à origem definida em `FRONTEND_ORIGIN` — nunca `*`, especialmente com credentials habilitado.

### Tratamento de erros

- Error handler central padronizado: todo erro (validação do Zod, violação de unicidade do PostgreSQL — código `23505`, falhas de autenticação/autorização) é convertido para um único formato de resposta.
- Stack traces e detalhes internos **nunca** chegam ao cliente — são registrados apenas no log do servidor.

### Mapeamento OWASP Top 10 (estado atual)

| Risco OWASP | Tratamento |
|---|---|
| Broken Access Control | RBAC por workspace + ownership check (proteção contra IDOR) |
| Cryptographic Failures | `bcrypt` para senha; SHA-256 para refresh token (alta entropia); segredos via variáveis de ambiente |
| Injection | Queries parametrizadas (`pg` com `$1, $2...`), nunca concatenação de SQL |
| Insecure Design | Modelagem explícita de roles como relação (membership), não atributo global do usuário |
| Security Misconfiguration | `Helmet`, CORS restrito, fail-fast em variáveis de ambiente ausentes |
| Identification and Authentication Failures | JWT + refresh token com rotação e detecção de reuso |
| Software and Data Integrity Failures | Dependências mínimas, sem bibliotecas extras sem justificativa |

### Próximos passos (fora do escopo atual)

- Rate limiting
- Token CSRF
- Redis (cache / blocklist de tokens)

## Desenvolvimento

Decisões técnicas, problemas encontrados e seu histórico de resolução são registrados em [`DEVLOG.md`](./DEVLOG.md), uma linha por sessão de trabalho.