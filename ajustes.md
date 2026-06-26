# Fix do Webhook da Lastlink — Documento de Referência

## Contexto

Compras realizadas via Lastlink (PIX/cartão aprovadas) **não estavam sendo cadastradas**
na collection `subscriptions` do MongoDB. Como consequência, usuários pagavam mas
ficavam sem acesso ao app — e os administradores precisavam liberar manualmente.

Esse problema afetou tanto o app **Rainha** quanto o app **Irmandade**, e qualquer outro
app que use o mesmo padrão de webhook Lastlink.

## Diagnóstico

Os logs do painel da Lastlink mostraram que as chamadas estavam sendo enviadas
corretamente, mas o endpoint respondia com **HTTP 400** e a mensagem
`"Email não encontrado no payload"`.

Exemplo de log da Lastlink:

```
https://app.rainhaclub.com/api/webhook/lastlink?token=...   400   {"error": true, ...}
Product_Access_Started {"Product":{"Id":"eddf3e9b-...","Name":...}}
```

## Causa raiz

A Lastlink envia o webhook com payload em **PascalCase** (campos com inicial maiúscula),
no seguinte formato aproximado:

```json
{
  "Event": "Product_Access_Started",
  "Buyer": {
    "Email": "comprador@email.com",
    "Name": "Nome do Comprador"
  },
  "Data": {
    "PurchaseId": "abc-123",
    "Products": [
      { "Id": "eddf3e9b-...", "Name": "Plano X" }
    ]
  }
}
```

Mas o handler antigo procurava o email apenas em **camelCase**:

```ts
const email = body?.customer?.email || body?.email
```

Como `body.customer` e `body.email` não existem nesse payload, `email` virava
`undefined`, e o handler lançava 400.

Além disso, mesmo se o email fosse encontrado, o handler só ativava o usuário se
`status` fosse `paid | active | approved | completed`. Mas o evento real que a Lastlink
dispara na confirmação de compra é **`Product_Access_Started`**, que não estava na lista.
Resultado: o usuário ficaria marcado como `inactive` mesmo se o email tivesse sido lido.

## Por que parecia "às vezes funcionar"

A análise do banco mostrou que, das 15 subscriptions ativas do Rainha, **apenas 1**
tinha o campo `lastlink_status` preenchido — ou seja, só 1 chegou via webhook real.
As outras 14 foram cadastradas manualmente pelo painel admin ou via CLI.

A única que funcionou (`lucasgabrielpro614@gmail.com`) provavelmente caiu em um
caso específico em que o payload veio com a estrutura legada (camelCase) por algum
motivo — talvez um evento diferente ou um teste manual. Não era o caminho padrão.

## Fix aplicado

O handler foi reescrito em três arquivos:

- [server/api/webhook/lastlink.post.ts](../server/api/webhook/lastlink.post.ts) (Rainha)
- [server/api/webhook/lastlink-sem-gale.post.ts](../server/api/webhook/lastlink-sem-gale.post.ts) (Rainha — produto sem gale)
- `app_irmandade/irmandade-club-hypegaming/server/api/webhook/lastlink.post.ts` (Irmandade)

Principais mudanças:

1. **Extração tolerante de email** — tenta `Buyer.Email`, `Data.Buyer.Email`,
   `customer.email`, `Customer.Email`, `email`, `Email`, etc.
2. **Extração tolerante de evento** — tenta `Event`, `EventType`, `event_type`,
   `status`, etc.
3. **Lista de eventos ATIVOS expandida** — inclui `product_access_started`,
   `purchase_approved`, `purchase_completed`, `subscription_started`,
   `subscription_renewed`.
4. **Lista de eventos INATIVOS** — `product_access_ended`, `purchase_refunded`,
   `chargeback`, `subscription_canceled`, etc., que marcam o usuário como inativo.
5. **Eventos desconhecidos retornam 200 com `ignored: true`** — para evitar que a
   Lastlink fique retentando indefinidamente.
6. **Log completo do payload** em toda chamada — facilita debugar novas variações.

## Prompt reutilizável para outros apps

Quando precisar corrigir o mesmo bug em outro projeto similar, cole este prompt
no assistente:

---

```
# Tarefa: Corrigir webhook da Lastlink que não está cadastrando compras no banco

## Sintoma
Compras finalizadas na Lastlink (PIX/cartão aprovadas) NÃO criam registro na collection
`subscriptions` do MongoDB. Os logs do painel da Lastlink mostram que a chamada está sendo
feita, mas o endpoint retorna HTTP 400 com `{"error": true, "message": "Email não
encontrado no payload"}`.

## Root cause
A Lastlink envia o webhook em PascalCase, com estrutura tipo:

{
  "Event": "Product_Access_Started",
  "Buyer": { "Email": "comprador@email.com", "Name": "..." },
  "Data": {
    "PurchaseId": "...",
    "Products": [{ "Id": "...", "Name": "..." }]
  }
}

Mas o handler antigo lê apenas `body.customer.email` / `body.email` (camelCase),
e considera ativo só se `status` for `paid|active|approved|completed`. Resultado:
- `email` fica undefined → 400.
- Mesmo se chegasse, o evento real `Product_Access_Started` não está na lista de
  status ativos, então o usuário ficaria como `inactive`.

## O que fazer

1. Localize o arquivo do webhook (geralmente `server/api/webhook/lastlink.post.ts`
   ou similar). Mantenha o token atual (env var ou hardcoded).

2. Reescreva o handler para:
   - Extrair email tentando, nesta ordem: Buyer.Email, buyer.email,
     Data.Buyer.Email, data.buyer.email, customer.email, Customer.Email,
     email, Email.
   - Extrair evento de: Event, event, EventType, event_type, status, Status.
   - Considerar ATIVO se o evento (case-insensitive) for um destes:
     paid, active, approved, completed, product_access_started,
     purchase_approved, purchase_completed, subscription_started,
     subscription_renewed.
   - Considerar INATIVO se for: product_access_ended, purchase_refused,
     purchase_canceled, purchase_refunded, subscription_canceled,
     subscription_expired, chargeback.
   - Eventos desconhecidos: retornar 200 {received:true, ignored:true} (NÃO 4xx,
     pra Lastlink não retentar à toa).
   - Extrair produto de Data.Products[0].Name / Products[0].Name /
     Product.Name / product.name.
   - Extrair order id de Data.PurchaseId / PurchaseId / purchase_id /
     order_id / id.
   - Persistir com updateOne({ email: email.toLowerCase() }, { $set: {...},
     $setOnInsert: { created_at: new Date() }}, { upsert: true }) na collection
     subscriptions, marcando status: 'active'|'inactive' e role: 'paid'|'free'.
   - Sempre fazer console.log do payload completo (ajuda a debugar variações
     futuras).

3. Aplique o mesmo fix em QUALQUER outro endpoint de webhook Lastlink no projeto
   (procure por: grep -r "lastlink" server/).

4. Não mude a URL/token configurados no painel da Lastlink — só conserte o código.

5. Após deployar, valide com curl simulando o payload real:

   curl -X POST 'https://<dominio>/api/webhook/lastlink?token=<token>' \
     -H 'Content-Type: application/json' \
     -d '{"Event":"Product_Access_Started","Buyer":{"Email":"teste@x.com"},
          "Data":{"PurchaseId":"abc","Products":[{"Name":"Plano X"}]}}'

   Esperado: 200 {"received":true,"email":"teste@x.com","status":"active"}
   e doc criado na collection subscriptions.

## Referência
O fix completo já foi aplicado no projeto Rainha em
server/api/webhook/lastlink.post.ts. Copie a mesma lógica (helpers
pickEmail, pickEvent, pickProductName, pickOrderId + sets
ACTIVE_EVENTS / INACTIVE_EVENTS).
```
