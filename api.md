

# Cactus API - Documentação Completa

API Proxy para integração com plataformas de apostas Cactus.

## 🚀 Características

- ✅ Autenticação via JWT
- ✅ Login com Email ou CPF
- ✅ Sistema de Cookies persistente
- ✅ Integração com MongoDB (opcional)
- ✅ Suporte multi-brand (esportiva, geralbet, bullsbet, sortenabet)
- ✅ Depósitos via PIX
- ✅ Iniciar jogos
- ✅ Registro de usuários

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Servidor
PORT=8076
HOST=0.0.0.0

# MongoDB (Opcional)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=cactus_api

# Sessão
SESSION_SECRET=sua-chave-secreta

# CORS
CACTUS_CORS_ORIGINS=*
```

## 🔐 Autenticação

A maioria das rotas requer autenticação via token Bearer. O token pode ser obtido através do login e passado no header `Authorization: Bearer <token>`.
z
**Headers comuns:**
- `Authorization: Bearer <token>` - Token JWT obtido no login
- `X-Brand-Slug: <brand>` - Slug da marca (esportiva, geralbet, etc)
- `X-Cactus-Cookie-Key: <key>` - Chave dos cookies salvos
- `X-Base-Domain: <domain>` - Domínio base (opcional)

## Configuração do MongoDB

O sistema inclui funcionalidade opcional para salvar dados de usuários no MongoDB. Configure as seguintes variáveis de ambiente:

```bash
# URI de conexão do MongoDB (opcional, padrão: mongodb://localhost:27017)
MONGODB_URI=mongodb://localhost:27017

# Nome do banco de dados (opcional, padrão: cactus_api)
MONGODB_DATABASE=cactus_api
```

**Características do MongoDB:**
- ✅ **Prevenção de duplicatas**: Verifica se usuário já existe antes de salvar
- ✅ **Identificação múltipla**: Usa email, ID ou identificador personalizado
- ✅ **Metadados automáticos**: Adiciona timestamps e informações da collection
- ✅ **Tratamento de erros**: API funciona normalmente mesmo se MongoDB falhar
- ✅ **Collections dinâmicas**: Permite salvar em diferentes collections por brand/contexto

## Endpoints da API

### 1. Login
**POST** `/api/auth/login`

Realiza login na plataforma com email ou CPF.

**Parâmetros (Body JSON):**
- `email` (string): E-mail do usuário
- `cpf` (string): CPF do usuário
- `document` (string): Documento do usuário
- `password` (string, obrigatório): Senha
- `app_source` (string, opcional): Origem do app (padrão: 'web')
- `save_cookies` (boolean, opcional): Salvar cookies (padrão: true)
- `cookie_key` (string, opcional): Chave para cookies
- `brand_slug` (string, obrigatório): Slug da marca (esportiva, geralbet, bullsbet, sortenabet)
- `base_domain` (string, opcional): Domínio base

**Headers opcionais:**
- `X-Brand-Slug`: Slug da marca
- `X-Base-Domain`: Domínio base

**Exemplo com Email:**
```bash
curl -X POST https://routes-eb.grupoautoma.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "sua-senha",
    "brand_slug": "esportiva"
  }'
```

**Exemplo com CPF:**
```bash
curl -X POST https://routes-eb.grupoautoma.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "12345678900",
    "password": "sua-senha",
    "brand_slug": "esportiva"
  }'
```

**Resposta de Sucesso:**
```json
{
  "access_token": "SEU_ACCESS_TOKEN",
  "token_type": "bearer",
  "expires_in": 604800,
  "user": {
    "id": 28313810,
    "name": "Usuario Exemplo",
    "email": "usuario@example.com",
    "phone": "11999999999",
    "created_at": "2025-04-21T19:26:17.000000Z",
    "is_active": 1,
    "country": "BRA",
    "currency": "BRL"
  },
  "cookie_key": 28313810,
  "cookies_path": "/path/cookies/cookies_xxx.json",
  "brand_slug": "esportiva",
  "base_domain": "bet.br",
  "need_change_password": false
}
```

### 2. Logout
**POST** `/api/auth/logout`

Realiza logout e remove cookies se especificado.

**Parâmetros (Body JSON):**
- `cookie_key` (string, opcional): Chave dos cookies a remover

**Exemplo de Requisição:**
```bash
curl -X POST http://localhost:8075/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"cookie_key": "usuario@example.com"}'
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso.",
  "cookies_removed": true
}
```

### 3. Perfil do Usuário
**GET** `/api/auth/user`

Obtém o perfil do usuário autenticado.

**Headers obrigatórios:**
- `Authorization: Bearer <token>`

**Headers opcionais:**
- `X-Cactus-Cookie-Key`: Chave dos cookies
- `X-Brand-Slug`: Slug da marca
- `X-Base-Domain`: Domínio base

**Query Parameters opcionais:**
- `collection` (string): Nome da coleção MongoDB para salvar o usuário

**Exemplo de Requisição:**
```bash
curl -X GET "http://localhost:8075/api/auth/user?collection=users_eb" \
  -H "Authorization: Bearer seu-token-aqui" \
  -H "X-Brand-Slug: esportiva"
```

**Resposta de Sucesso (sem MongoDB):**
```json
{
  "id": 123,
  "name": "Nome do Usuário",
  "email": "usuario@example.com",
  "phone": "11999999999",
  "status": "ativo",
  "document": { "number": "123456789" },
  "appInstall": true
}
```

**Resposta de Sucesso (com MongoDB):**
```json
{
  "id": 123,
  "name": "Nome do Usuário",
  "email": "usuario@example.com",
  "phone": "11999999999",
  "status": "ativo",
  "document": { "number": "123456789" },
  "appInstall": true,
  "mongodb": {
    "saved": true,
    "action": "created",
    "message": "Usuário salvo com sucesso",
    "collection": "users_eb",
    "userId": "674d8e123456789abcdef012"
  }
}
```

### 4. Listar Usuários Salvos
**GET** `/api/users/:collection`

Lista os usuários salvos em uma collection MongoDB.

**Parâmetros de URL:**
- `collection` (string, obrigatório): Nome da collection MongoDB

**Query Parameters opcionais:**
- `limit` (number): Limite de resultados (padrão: 50)
- `skip` (number): Número de registros a pular (padrão: 0)
- `sort` (string): JSON com critério de ordenação (padrão: {"createdAt": -1})

**Exemplo de Requisição:**
```bash
curl -X GET "http://localhost:8075/api/users/users_eb?limit=10&skip=0" \
  -H "Content-Type: application/json"
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "users": [
    {
      "_id": "674d8e123456789abcdef012",
      "id": 123,
      "name": "Nome do Usuário",
      "email": "usuario@example.com",
      "userIdentifier": "usuario@example.com",
      "createdAt": "2024-11-20T15:30:45.123Z",
      "updatedAt": "2024-11-20T15:30:45.123Z",
      "collection_name": "users_eb"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 10,
    "skip": 0,
    "hasMore": false
  }
}
```

### 5. Buscar Usuário Específico
**GET** `/api/users/:collection/:identifier`

Busca um usuário específico em uma collection MongoDB.

**Parâmetros de URL:**
- `collection` (string, obrigatório): Nome da collection MongoDB
- `identifier` (string, obrigatório): ID, email ou identificador do usuário

**Exemplo de Requisição:**
```bash
curl -X GET "http://localhost:8075/api/users/users_eb/usuario@example.com" \
  -H "Content-Type: application/json"
```

**Resposta de Sucesso:**
```json
{
  "_id": "674d8e123456789abcdef012",
  "id": 123,
  "name": "Nome do Usuário",
  "email": "usuario@example.com",
  "userIdentifier": "usuario@example.com",
  "createdAt": "2024-11-20T15:30:45.123Z",
  "updatedAt": "2024-11-20T15:30:45.123Z",
  "collection_name": "users_eb"
}
```

### 6. Registro de Usuário
**POST** `/api/register`

Registra um novo usuário na plataforma.

**Parâmetros (Body JSON):**
- `email` (string, obrigatório): E-mail do usuário
- `password` (string, obrigatório): Senha
- `number` (string, obrigatório): CPF do usuário
- `phone` (string, obrigatório): Telefone com DDD
- `affiliation_code` (string, obrigatório): Código de afiliação
- `src` (string, obrigatório): Source/origem
- `utm_source` (string, obrigatório): UTM source
- `brand_slug` (string, opcional): Slug da marca
- `base_domain` (string, opcional): Domínio base

**Headers opcionais:**
- `X-Brand-Slug`: Slug da marca
- `X-Base-Domain`: Domínio base

**Campos automáticos:**
- `country`: "BRA" (automático)
- `ddi`: "+55" (automático)
- `nationalities`: JSON com nacionalidade brasileira (automático)
- `optIn`: true (automático)

**Exemplo de Requisição:**
```bash
curl -X POST https://routes-eb.grupoautoma.com/api/register \
  -H "Content-Type: application/json" \
  -H "X-Brand-Slug: esportiva" \
  -d '{
    "number": "03276799561",
    "phone": "11999999999",
    "email": "usuario@example.com",
    "password": "Senha@123456",
    "affiliation_code": "esportiva",
    "src": "syhweqaeokfxoxssftctxozmhv",
    "utm_source": "399485"
  }'
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "access_token": "SEU_ACCESS_TOKEN",
  "message": "User successfully registered",
  "user": {
    "id": 28986958,
    "phone": "11999999999",
    "email": "usuario@example.com",
    "affiliation_code": "7b5ec3f4a67f",
    "country": "BRA",
    "ddi": "+55",
    "timezone": "America/Bahia",
    "name": "Jose Roberto Da Silva",
    "first_name": "Jose",
    "last_name": "Silva",
    "birth_date": "1986-04-23",
    "currency": "BRL",
    "language": "pt-br",
    "created_at": "2025-11-24T13:44:54.000000Z"
  },
  "brand_slug": "esportiva"
}
```

### 7. Depósito via PIX
**POST** `/api/deposit`

Cria um depósito via PIX e retorna QR Code e código copia e cola.

**Headers obrigatórios:**
- `Authorization: Bearer <token>`
- `X-Brand-Slug: <brand>`
- `X-Cactus-Cookie-Key: <key>`

**Parâmetros (Body JSON):**
- `amount` ou `value` (number, obrigatório): Valor do depósito em reais
- `user_id` ou `userId` (string, opcional): ID do usuário (busca automaticamente se não fornecido)

**Exemplo de Requisição:**
```bash
curl -X POST https://routes-eb.grupoautoma.com/api/deposit \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Brand-Slug: esportiva" \
  -H "X-Cactus-Cookie-Key: 28313810" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "transaction_id": "esportivabetbr_11361812",
  "payment_link": "00020101021226710014br.gov.bcb.pix...",
  "qr_code": "https://quickchart.io/qr?size=400&text=00020101021226710014...",
  "value": 10000,
  "br_code": "00020101021226710014br.gov.bcb.pix...",
  "amount": 100,
  "amount_cents": 10000,
  "user_id": 28313810
}
```

**Campos da Resposta:**
- `transaction_id`: ID único da transação
- `qr_code`: URL da imagem do QR Code PIX
- `br_code`: Código PIX copia e cola
- `payment_link`: Link de pagamento PIX
- `amount`: Valor em reais
- `amount_cents`: Valor em centavos
- `user_id`: ID do usuário

### 8. Status do Depósito
**GET** `/api/deposit/:transactionId/status`

Verifica o status de um depósito.

**Headers obrigatórios:**
- `Authorization: Bearer <token>`

**Parâmetros de URL:**
- `transactionId` (string, obrigatório): ID da transação

**Query Parameters opcionais:**
- `transaction_id` (string): ID alternativo da transação

**Exemplo de Requisição:**
```bash
curl -X GET http://localhost:8075/api/deposit/tx-123/status \
  -H "Authorization: Bearer seu-token-aqui"
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "transaction_id": "tx-123",
  "status": "completed",
  "amount": 100.50
}
```

### 9. Iniciar Jogo
**GET** `/api/start-game/:gameId` ou `/api/start-game`

Inicia um jogo e retorna a URL para jogar.

**Headers obrigatórios:**
- `Authorization: Bearer <token>`
- `X-Brand-Slug: <brand>`
- `X-Cactus-Cookie-Key: <key>`

**Parâmetros de URL:**
- `gameId` (string, opcional): Slug do jogo

**Query Parameters:**
- `slug` (string, obrigatório se não passado na URL): Slug do jogo
- `platform` (string, opcional): Plataforma (WEB, MOBILE, etc., padrão: WEB)
- `use_demo` ou `useDemo` (string, opcional): Usar modo demo (1 para sim, padrão: 0)
- Outros parâmetros extras são passados para a API

**Exemplo de Requisição:**
```bash
curl -X GET "https://routes-eb.grupoautoma.com/api/start-game?slug=evolution/bac-bo&platform=WEB" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "X-Brand-Slug: esportiva" \
  -H "X-Cactus-Cookie-Key: 28313810"
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "slug": "evolution/bac-bo",
  "platform": "WEB",
  "game_url": "https://s3.eu-central-1.amazonaws.com/ignition.button/round-2/index.html?options=...",
  "payload": {
    "error": false,
    "description": "OK",
    "gameURL": "https://s3.eu-central-1.amazonaws.com/ignition.button/round-2/index.html?options=..."
  }
}
```

**Slugs de Jogos Comuns:**
- `evolution/bac-bo` - Bac Bo (Evolution)
- `fortune-tiger` - Fortune Tiger
- `aviator` - Aviator
- `spaceman` - Spaceman

## 🎯 Fluxo Completo de Uso

### 1. Registro de Novo Usuário
```bash
# 1. Registrar usuário
curl -X POST https://routes-eb.grupoautoma.com/api/register \
  -H "Content-Type: application/json" \
  -H "X-Brand-Slug: esportiva" \
  -d '{
    "number": "12345678900",
    "phone": "11999999999",
    "email": "usuario@example.com",
    "password": "Senha@123",
    "affiliation_code": "esportiva",
    "src": "seu_src_code",
    "utm_source": "123456"
  }'
```

### 2. Login e Obtenção de Token
```bash
# 2. Fazer login (com email ou CPF)
curl -X POST https://routes-eb.grupoautoma.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "12345678900",
    "password": "Senha@123",
    "brand_slug": "esportiva"
  }'

# Resposta contém: access_token e cookie_key
```

### 3. Consultar Perfil
```bash
# 3. Obter perfil do usuário
curl -X GET "https://routes-eb.grupoautoma.com/api/auth/user?collection=users_eb" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Brand-Slug: esportiva" \
  -H "X-Cactus-Cookie-Key: SEU_COOKIE_KEY"
```

### 4. Fazer Depósito
```bash
# 4. Criar depósito PIX
curl -X POST https://routes-eb.grupoautoma.com/api/deposit \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Brand-Slug: esportiva" \
  -H "X-Cactus-Cookie-Key: SEU_COOKIE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'

# Resposta contém: qr_code, br_code, transaction_id
```

### 5. Iniciar Jogo
```bash
# 5. Iniciar um jogo
curl -X GET "https://routes-eb.grupoautoma.com/api/start-game?slug=evolution/bac-bo&platform=WEB" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "X-Brand-Slug: esportiva" \
  -H "X-Cactus-Cookie-Key: SEU_COOKIE_KEY"

# Resposta contém: game_url (URL para abrir o jogo)
```

## ⚠️ Tratamento de Erros

Todos os erros seguem o formato:
```json
{
  "message": "Descrição do erro",
  "endpoint": "GET /api/rota",
  "timestamp": "2025-11-24T13:00:00.000Z",
  "detail": { ... }
}
```

**Códigos de status comuns:**
- `400`: Parâmetros inválidos ou ausentes
- `401`: Não autorizado (token inválido, ausente ou expirado)
- `404`: Recurso não encontrado
- `500`: Erro interno do servidor
- `502`: Erro de comunicação com provedor Cactus

**Erros Comuns:**

1. **Token Expirado:**
```json
{
  "message": "Erro recebido do provedor Cactus.",
  "detail": {
    "status": "Wrong auth validation",
    "reason": "wrong_token"
  }
}
```
**Solução:** Fazer login novamente

2. **Brand Slug Ausente:**
```json
{
  "message": "Brand slug é obrigatório"
}
```
**Solução:** Adicionar header `X-Brand-Slug` ou parâmetro `brand_slug`

3. **Método de Pagamento Inativo:**
```json
{
  "message": "Erro recebido do provedor Cactus.",
  "detail": {
    "success": false,
    "message": "Payment method is not available or inactive"
  }
}
```
**Solução:** Verificar configuração da conta ou aguardar ativação

## 📝 Notas Importantes

1. **Tokens JWT:** Expiram após 7 dias (604800 segundos)
2. **Cookies:** Salvos automaticamente no diretório `cookies/`
3. **MongoDB:** Opcional, usado para cache/histórico de usuários
4. **Brands Suportadas:** esportiva, geralbet, bullsbet, sortenabet
5. **Valores:** Depósitos são convertidos automaticamente para centavos
6. **Plataformas de Jogo:** WEB, MOBILE, ANDROID, IOS

## 🔗 Links Úteis

- **Porta padrão:** 8076
- **Base URL:** `https://routes-eb.grupoautoma.com`
- **Logs:** Salvos em `logs/access.log`
- **Cookies:** Salvos em `cookies/`
