# AccessForge

**API de autenticação, autorização e gerenciamento de workspaces multi-tenant.**

O AccessForge é um projeto de backend desenvolvido com Node.js, TypeScript, Express e PostgreSQL para explorar a construção de APIs seguras com autenticação, autorização e isolamento de recursos entre diferentes workspaces.

O objetivo é implementar um sistema capaz de responder a duas perguntas fundamentais: **quem é o usuário e o que ele pode visualizar ou executar dentro de determinado contexto?**

O projeto prioriza decisões arquiteturais explícitas, validação de entradas, controle de acesso e proteção contra vulnerabilidades comuns em APIs REST.

## Sumário

- [Visão geral](#visão-geral)
- [Principais funcionalidades](#principais-funcionalidades)
- [Stack tecnológica](#stack-tecnológica)
- [Arquitetura e decisões técnicas](#arquitetura-e-decisões-técnicas)
- [Segurança e OWASP](#segurança-e-owasp)
- [Requisitos](#requisitos)
- [Como executar localmente](#como-executar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Testes](#testes)
- [Próximos passos](#próximos-passos)

## Visão geral

Em aplicações multi-tenant, diferentes organizações ou equipes compartilham a mesma aplicação e infraestrutura, mas não devem ter acesso irrestrito aos dados umas das outras.

O AccessForge utiliza o conceito de **workspaces** para representar esses contextos de isolamento.

Um usuário pode pertencer a diferentes workspaces e possuir papéis distintos em cada um. Por exemplo, pode ser administrador em um workspace e apenas visualizador em outro.

Essa abordagem permite separar três responsabilidades:

- **Autenticação:** identificar quem está realizando a requisição.
- **Autorização:** determinar quais ações esse usuário pode executar.
- **Isolamento de dados:** garantir que o acesso aos recursos respeite o workspace e as permissões aplicáveis.

O foco do projeto é demonstrar como esses mecanismos podem ser organizados em um backend com regras de acesso explícitas.

## Principais funcionalidades

### Autenticação

- Registro de usuários.
- Login com verificação de senha.
- Hash de senhas utilizando bcrypt.
- Autenticação por access token JWT.
- Endpoint protegido para consultar o usuário autenticado.
- Refresh tokens opacos com armazenamento de hashes.
- Renovação de tokens com rotação.
- Revogação de refresh tokens no logout.

### Workspaces e autorização

- Criação de workspaces.
- Associação de usuários a workspaces por meio de memberships.
- Papéis de acesso, incluindo `owner`, `admin`, `member` e `viewer`.
- Middleware de autenticação.
- Middleware de autorização por papel.
- Validação dos dados recebidos pela API.

A implementação do controle de acesso deve considerar a associação do usuário ao workspace solicitado, e não apenas a identidade global do usuário.

### Qualidade e confiabilidade

- TypeScript em modo estrito.
- Validação de entradas com Zod.
- Persistência relacional com PostgreSQL.
- Migrations para evolução do esquema do banco.
- Testes automatizados com Jest e Supertest.
- Tratamento centralizado de erros.
- Configuração de ambiente validada na inicialização.

## Stack tecnológica

| Tecnologia   | Responsabilidade                                                      |
| ------------ | --------------------------------------------------------------------- |
| Node.js      | Ambiente de execução JavaScript no servidor.                          |
| TypeScript   | Tipagem estática e maior previsibilidade durante o desenvolvimento.   |
| Express      | Construção da API REST e composição de middlewares.                   |
| PostgreSQL   | Persistência relacional, integridade referencial e transações.        |
| Zod          | Validação de entradas e variáveis de ambiente.                        |
| JWT          | Emissão e verificação de access tokens.                               |
| bcrypt       | Hash de senhas.                                                       |
| `crypto`     | Geração criptograficamente segura de refresh tokens e hashes SHA-256. |
| Jest         | Execução dos testes automatizados.                                    |
| Supertest    | Testes de integração dos endpoints HTTP.                              |
| Docker       | Ambiente reproduzível, quando configurado.                            |
| Git e GitHub | Versionamento e histórico de alterações.                              |

A escolha dessas tecnologias permite estudar os fundamentos de backend sem esconder decisões importantes atrás de abstrações excessivas. O uso de SQL e PostgreSQL também favorece o entendimento de relacionamentos, constraints, transações e integridade dos dados.

## Arquitetura e decisões técnicas

### 1. RBAC baseado em membership

O controle de acesso utiliza RBAC (_Role-Based Access Control_), no qual as permissões são associadas a papéis.

O papel de um usuário não deve ser tratado como uma propriedade global de sua conta. Ele deve ser determinado pela sua associação ao workspace relevante.

Conceitualmente:

`User → Membership → Workspace + Role → Permissions`

Essa modelagem permite que o mesmo usuário possua diferentes níveis de acesso em workspaces distintos.

**Justificativa:** associar o papel diretamente à tabela `users` não representa adequadamente usuários que participam de várias organizações com responsabilidades diferentes.

### 2. Access tokens e refresh tokens

O access token JWT é utilizado para autenticar requisições protegidas e possui duração limitada.

O refresh token segue uma estratégia diferente: é um token opaco, gerado com aleatoriedade criptograficamente segura. Seu hash SHA-256 é armazenado no banco de dados, em vez do valor original.

Essa separação permite renovar a sessão sem exigir um novo login a cada expiração do access token.

A rotação dos refresh tokens substitui o token utilizado por outro. A detecção de reutilização de um token previamente consumido ou revogado pode indicar comprometimento da sessão e deve ser tratada conforme a política de segurança implementada.

**Justificativa:** armazenar somente o hash reduz a exposição do segredo caso os registros do banco sejam acessados indevidamente. A rotação também permite detectar determinados padrões de reutilização suspeita.

### 3. Transações em operações compostas

Operações que dependem de múltiplas alterações relacionadas no banco de dados devem utilizar transações quando a consistência exigir atomicidade.

Por exemplo, criar um workspace e registrar seu criador como proprietário envolve mais de uma alteração lógica. Se uma etapa falhar, o sistema não deve deixar um workspace criado sem a associação necessária.

**Justificativa:** transações garantem que as alterações participantes sejam confirmadas em conjunto ou revertidas em caso de falha.

### 4. Validação na fronteira da API

Os dados recebidos dos clientes são tratados como entradas não confiáveis.

Schemas Zod definem as regras de validação antes que os dados sejam utilizados pelos serviços ou pelas operações de persistência.

A configuração de ambiente também é validada durante a inicialização, evitando que o servidor continue executando com parâmetros obrigatórios ausentes ou inválidos.

**Justificativa:** concentrar a validação nas fronteiras reduz inconsistências e torna o comportamento da API mais previsível.

### 5. Separação de responsabilidades

A aplicação organiza responsabilidades em componentes distintos, como rotas, middlewares, serviços e acesso ao banco de dados.

- **Rotas:** definem os endpoints e a sequência de middlewares.
- **Middlewares:** tratam preocupações transversais, como autenticação e validação.
- **Serviços:** concentram regras de negócio.
- **Acesso a dados:** executa operações de persistência.
- **Tratamento de erros:** converte falhas conhecidas em respostas HTTP consistentes.

**Justificativa:** essa separação facilita testes, manutenção e evolução das regras de negócio.

## Segurança e OWASP

A segurança é um dos principais objetivos do AccessForge. O projeto aborda riscos comuns em APIs, utilizando como referência o OWASP Top 10 e o OWASP API Security Top 10.

### Autenticação e gerenciamento de sessão

- Hash de senhas com bcrypt.
- Verificação de access tokens JWT.
- Expiração de tokens.
- Refresh tokens com entropia criptográfica.
- Armazenamento de hashes dos refresh tokens.
- Rotação e revogação de tokens.
- Tratamento de tentativas de renovação com tokens inválidos.

### Autorização e isolamento multi-tenant

- Verificação de identidade por middleware.
- Autorização baseada em papéis e memberships.
- Separação entre autenticação e autorização.
- Necessidade de validar o acesso ao workspace correspondente em cada operação protegida.

Um usuário autenticado não deve ser considerado automaticamente autorizado a acessar qualquer recurso identificado por um ID.

Esse princípio é especialmente importante para prevenir **Broken Object Level Authorization (BOLA)**, anteriormente conhecido como IDOR em muitos contextos de desenvolvimento.

### Validação e tratamento de erros

- Validação de payloads com Zod.
- Respostas de erro consistentes.
- Tratamento de conflitos de unicidade do PostgreSQL.
- Separação entre erros esperados e falhas internas.
- Evitar a exposição de segredos, hashes de senha e detalhes internos em respostas HTTP.

### Configuração HTTP

- CORS com origem explicitamente configurada.
- Helmet para aplicação de cabeçalhos de segurança HTTP.
- Configuração de cookies para sessões de renovação, quando utilizada.
- Segredos mantidos em variáveis de ambiente, fora do código versionado.

### Principais riscos considerados

| Risco                             | Estratégia de mitigação                                      |
| --------------------------------- | ------------------------------------------------------------ |
| Quebra de autenticação            | Verificação de credenciais, JWT e expiração de tokens.       |
| BOLA / IDOR                       | Autorização contextual por recurso e workspace.              |
| Escalada de privilégios           | RBAC e validação das memberships.                            |
| Vazamento de credenciais          | Hash de senhas e armazenamento de hashes dos refresh tokens. |
| Entradas malformadas              | Schemas de validação com Zod.                                |
| Exposição de informações internas | Tratamento centralizado de erros.                            |
| Configuração insegura             | Validação de ambiente e configuração de cabeçalhos HTTP.     |

Essas medidas reduzem riscos específicos, mas não representam uma certificação de conformidade com OWASP. A eficácia depende da implementação de cada endpoint e da cobertura dos testes de segurança.

## Requisitos

Para executar o projeto localmente, são necessários:

- Node.js em versão compatível com as dependências instaladas.
- npm.
- PostgreSQL.
- Git.

Docker pode ser utilizado caso exista uma configuração de ambiente correspondente no repositório.

## Como executar localmente

### 1. Clonar o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd workspace_auth
```

Substitua `<URL_DO_REPOSITORIO>` pela URL real do repositório.

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto utilizando a seção de variáveis de ambiente deste README como referência.

Não versione esse arquivo. Mantenha um `.env.example` sem segredos reais para documentar a configuração necessária.

### 4. Criar o banco de dados

No PostgreSQL, crie um banco chamado `workspace_auth`, ou utilize outro nome e atualize a variável `DATABASE_URL`.

Exemplo:

```sql
CREATE DATABASE workspace_auth;
```

### 5. Executar migrations

Execute o script de migrations definido no `package.json`.

Caso o script ainda não exista, confira o comando utilizado pelo projeto para executar `src/db/migrate.ts` antes de adicioná-lo à documentação.

As migrations devem criar e atualizar o esquema do banco de dados de forma controlada.

### 6. Executar seed

Se o projeto possuir um script de seed, execute-o após as migrations para criar os dados iniciais necessários.

Não presuma a existência de um seed: confirme os scripts disponíveis no `package.json` antes de documentar um comando específico.

### 7. Iniciar o servidor

```bash
npm run dev
```

Quando a configuração estiver correta, o servidor deverá iniciar na porta definida pela variável `PORT`.

### 8. Verificar a API

Com o servidor em execução, consulte o endpoint de saúde:

```http
GET /health
```

O endpoint deve indicar se a aplicação está respondendo e se a verificação de conectividade com o banco de dados está funcionando conforme a implementação atual.

## Variáveis de ambiente

Exemplo ilustrativo de configuração local:

```dotenv
PORT=3000
JWT_SECRET=SUBSTITUA_POR_UM_SEGREDO_FORTE
DATABASE_URL=postgresql://postgres:senha@localhost:5432/workspace_auth
FRONTEND_ORIGIN=http://localhost:5173
```

| Variável          | Finalidade                                       |
| ----------------- | ------------------------------------------------ |
| `PORT`            | Porta HTTP da aplicação.                         |
| `JWT_SECRET`      | Segredo utilizado para assinar e verificar JWTs. |
| `DATABASE_URL`    | String de conexão com PostgreSQL.                |
| `FRONTEND_ORIGIN` | Origem permitida pela configuração de CORS.      |

Os nomes e requisitos devem corresponder ao schema de ambiente efetivamente utilizado pelo projeto.

**Importante:** o valor de exemplo de `JWT_SECRET` não deve ser utilizado em produção. Gere um segredo forte e mantenha-o fora do controle de versão.

## Testes

Os testes automatizados utilizam Jest e Supertest para verificar regras de negócio, autenticação e comportamento dos endpoints.

Execute a suíte de testes com:

```bash
npm test
```

A cobertura deve contemplar, conforme a implementação:

- Registro e autenticação.
- Validação de credenciais.
- Verificação de access tokens.
- Criação, expiração, rotação e revogação de refresh tokens.
- Requisições protegidas.
- Respostas de erro.
- Regras de autorização.

Para um sistema multi-tenant, também é importante testar acessos cruzados: um usuário pertencente a um workspace não deve conseguir consultar ou modificar recursos de outro workspace sem autorização explícita.

## Próximos passos

O desenvolvimento pode evoluir nas seguintes frentes:

- Consolidar a autorização contextual por workspace.
- Ampliar os testes de isolamento multi-tenant.
- Concluir o tratamento centralizado de erros.
- Adicionar logging estruturado.
- Medir o comportamento do PostgreSQL com dados representativos.
- Automatizar testes e verificações com CI.
- Documentar os contratos HTTP e os fluxos de autenticação.

## Objetivo de aprendizado

O AccessForge é um projeto prático de engenharia de backend orientado ao estudo de autenticação, autorização, modelagem relacional, segurança de APIs e consistência de dados.

Mais do que implementar endpoints funcionais, o objetivo é compreender e justificar as decisões que tornam uma API previsível, testável e resistente a acessos indevidos.
