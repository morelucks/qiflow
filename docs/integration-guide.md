# QiFlow Integration Guide

Accept Qi payments in your application in minutes.

---

## Table of Contents

1. [Sign up for a QiFlow account](#1-sign-up-for-a-qiflow-account)
2. [Set your receiving wallet address](#2-set-your-receiving-wallet-address)
3. [Generate an API key](#3-generate-an-api-key)
4. [Create your first payment](#4-create-your-first-payment)
5. [Handle the webhook callback](#5-handle-the-webhook-callback)
6. [Verify webhook signatures](#6-verify-webhook-signatures)
7. [Common use cases](#7-common-use-cases)

---

## 1. Sign up for a QiFlow account

Register a merchant account via the API:

```bash
curl -X POST https://api.qiflow.xyz/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@yourstore.com",
    "password": "StrongPassword1",
    "businessName": "Your Store Name"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "merchant": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "you@yourstore.com",
      "businessName": "Your Store Name"
    },
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "eyJhbGci..."
    },
    "apiKey": {
      "rawKey": "qf_test_abcdef1234567890a3f2",
      "warning": "Store this secret key securely. It will not be shown again."
    }
  }
}
```

> **Important:** Save `data.apiKey.rawKey` immediately — it is only shown once.

---

## 2. Set your receiving wallet address

Before you can create payments, set the Quai wallet address where you want to receive funds.

```bash
curl -X PUT https://api.qiflow.xyz/merchants/me \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x00473a216f2b1d382759e612bf6029fa037e95b2"
  }'
```

---

## 3. Generate an API key

You received an API key on registration. To create additional keys:

```bash
curl -X POST https://api.qiflow.xyz/merchants/me/api-keys \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Production Key" }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "name": "Production Key",
    "keyPrefix": "qf_test_",
    "lastFour": "a3f2",
    "rawKey": "qf_test_abcdef1234567890a3f2",
    "warning": "Save this API key now. You will not be able to see it again."
  }
}
```

Store the `rawKey` in an environment variable:

```bash
export QIFLOW_API_KEY="qf_test_abcdef1234567890a3f2"
```

---

## 4. Create your first payment

Use your API key to create a payment session. QiFlow returns a hosted checkout URL you can share with your customer.

```bash
curl -X POST https://api.qiflow.xyz/v1/payments \
  -H "X-API-Key: $QIFLOW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "100",
    "currency": "QI",
    "description": "Order #1024",
    "metadata": {
      "orderId": "1024",
      "customer": "alice@example.com"
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "paymentCode": "pay_82hd91",
    "amount": "100.00000000",
    "currency": "QI",
    "description": "Order #1024",
    "status": "CREATED",
    "checkoutUrl": "https://qiflow.xyz/pay/pay_82hd91",
    "expiresAt": "2026-01-01T01:00:00.000Z"
  }
}
```

Redirect your customer to `data.checkoutUrl`. They can connect their wallet and pay with Qi directly from that page.

### Check payment status

```bash
curl https://api.qiflow.xyz/v1/payments/pay_82hd91 \
  -H "X-API-Key: $QIFLOW_API_KEY"
```

### Payment status lifecycle

```
CREATED → PENDING → PROCESSING → COMPLETED
                 ↘
                  FAILED / EXPIRED
```

---

## 5. Handle the webhook callback

QiFlow sends a signed `POST` request to your webhook URL whenever a payment status changes. Register your endpoint:

```bash
curl -X POST https://api.qiflow.xyz/v1/webhooks \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourstore.com/webhooks/qiflow",
    "events": ["payment.completed", "payment.failed"]
  }'
```

### Webhook payload

```json
{
  "event": "payment.completed",
  "paymentId": "pay_82hd91",
  "amount": "100",
  "currency": "QI",
  "status": "COMPLETED",
  "metadata": {
    "orderId": "1024"
  },
  "timestamp": "2026-01-01T00:05:00.000Z"
}
```

### Available events

| Event | Triggered when |
|---|---|
| `payment.created` | A new payment session is created |
| `payment.pending` | Customer initiates payment on-chain |
| `payment.completed` | Payment confirmed on the Quai network |
| `payment.failed` | Payment failed or was rejected |
| `payment.expired` | Payment session timed out |

### Simple webhook handler (Node.js / Express)

```js
import express from 'express';
import crypto from 'crypto';

const app = express();

// IMPORTANT: Use raw body buffer for signature verification
app.post('/webhooks/qiflow', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-qiflow-signature'];
  const secret = process.env.QIFLOW_WEBHOOK_SECRET;

  if (!verifySignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(req.body.toString());

  if (event.event === 'payment.completed') {
    const orderId = event.metadata?.orderId;
    // Fulfill order, send receipt, update database, etc.
    console.log(`Order ${orderId} paid — ${event.amount} ${event.currency}`);
  }

  res.json({ received: true });
});
```

---

## 6. Verify webhook signatures

Every webhook request includes an `X-QiFlow-Signature` header containing an HMAC-SHA256 signature. Always verify this before processing.

The signature is computed as:

```
HMAC-SHA256(webhookSecret, rawRequestBody)
```

> **Security note:** Use a timing-safe comparison (`crypto.timingSafeEqual`) to prevent timing attacks.

### Node.js

```js
import crypto from 'crypto';

function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody) // rawBody must be a Buffer, not a parsed object
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) return false;

  // Timing-safe comparison prevents timing attacks
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
```

### Python

```python
import hmac
import hashlib

def verify_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    if not signature or not secret:
        return False

    expected = hmac.new(
        secret.encode('utf-8'),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    # hmac.compare_digest is timing-safe
    return hmac.compare_digest(expected, signature)


# Flask example
from flask import Flask, request, abort
import json

app = Flask(__name__)

@app.route('/webhooks/qiflow', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-QiFlow-Signature', '')
    secret = os.environ['QIFLOW_WEBHOOK_SECRET']

    if not verify_signature(request.data, signature, secret):
        abort(401)

    event = json.loads(request.data)

    if event['event'] == 'payment.completed':
        order_id = event.get('metadata', {}).get('orderId')
        print(f"Order {order_id} paid — {event['amount']} {event['currency']}")

    return {'received': True}
```

### Go

```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "io"
    "net/http"
    "os"
)

func verifySignature(body []byte, signature string, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(body)
    expected := hex.EncodeToString(mac.Sum(nil))

    sigBytes, err := hex.DecodeString(signature)
    if err != nil {
        return false
    }
    expectedBytes, _ := hex.DecodeString(expected)

    // hmac.Equal is timing-safe
    return hmac.Equal(sigBytes, expectedBytes)
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    body, _ := io.ReadAll(r.Body)
    signature := r.Header.Get("X-QiFlow-Signature")
    secret := os.Getenv("QIFLOW_WEBHOOK_SECRET")

    if !verifySignature(body, signature, secret) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // Process event...
    w.WriteHeader(http.StatusOK)
}
```

---

## 7. Common use cases

### E-commerce checkout

```js
// 1. Customer clicks "Pay with Qi"
const payment = await fetch('https://api.qiflow.xyz/v1/payments', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.QIFLOW_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: cart.total.toString(),
    description: `Order #${order.id}`,
    metadata: { orderId: order.id },
  }),
}).then(r => r.json());

// 2. Redirect customer to hosted checkout
res.redirect(payment.data.checkoutUrl);

// 3. QiFlow calls your webhook when payment completes
```

### Polling payment status (fallback)

If webhooks are not available, poll the payment status:

```js
async function waitForPayment(paymentCode, timeoutMs = 300_000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`https://api.qiflow.xyz/v1/payments/${paymentCode}`, {
      headers: { 'X-API-Key': process.env.QIFLOW_API_KEY },
    }).then(r => r.json());

    if (res.data.status === 'COMPLETED') return res.data;
    if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(res.data.status)) {
      throw new Error(`Payment ${res.data.status}`);
    }

    await new Promise(resolve => setTimeout(resolve, 3000)); // poll every 3s
  }

  throw new Error('Payment polling timed out');
}
```

### Freelancer payment link

```js
// Generate a reusable payment link for a project invoice
const payment = await fetch('https://api.qiflow.xyz/v1/payments', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.QIFLOW_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: '500',
    description: 'Website redesign — Invoice #42',
    metadata: { invoiceId: '42', client: 'Acme Corp' },
  }),
}).then(r => r.json());

// Share this URL via email, WhatsApp, Telegram, etc.
console.log(payment.data.checkoutUrl);
// → https://qiflow.xyz/pay/pay_xk29ms
```

---

## Further reading

- **Interactive API Reference:** `GET /docs` on the API server
- **OpenAPI spec (YAML):** `GET /docs/openapi.yaml`
- **Postman collection:** `qiflow-postman-collection.json` in the repository root
