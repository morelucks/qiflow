#  QiFlow

### The payment gateway for Quai.

**Integrate once. Accept Qi everywhere.**

QiFlow is a developer-first payment infrastructure built on the Quai Network that allows businesses and applications to accept **Qi payments** through a simple API and shareable payment links.

Instead of asking merchants to understand wallets, blockchain transactions, RPCs, or Quai's sharded architecture, QiFlow provides a familiar payment experience inspired by platforms like **Flutterwave and Stripe**.

---

## The Problem

Crypto payments are powerful, but accepting them can still be complicated for businesses.

A merchant who wants to accept onchain payments may need to deal with:

- Wallet addresses
- Blockchain transactions
- Payment state tracking
- Transaction confirmations
- Checkout UX
- Webhooks
- RPC infrastructure
- Different blockchain environments

For developers, integrating payments can require significant blockchain-specific work.

For merchants, it is even worse.

They simply want:

> **"Give my customer a way to pay, and tell me when I've been paid."**

---

##  The Solution

**QiFlow turns Qi payments into a simple payment gateway.**

Businesses can:

###  Create Payment Links

Generate a checkout link for any payment:

```text
https://qiflow.xyz/pay/pay_82hd91

```

### Share it anywhere:

- WhatsApp
- Telegram
- X
- Email
- SMS
- Websites

Customers open the link, connect their wallet, and pay with Qi.

##  How It Works

```text
                   MERCHANT
                       │
             ┌─────────┴─────────┐
             │                   │
       QiFlow Dashboard      QiFlow API
             │                   │
             └─────────┬─────────┘
                       │
                 Payment Session
                       │
                       ↓
                Hosted Checkout
                       │
                       ↓
                  CUSTOMER
                       │
                  Pay with Qi
                       │
                       ↓
                QUAI NETWORK
                       │
                       ↓
              Payment Confirmed
                       │
                       ↓
                   QiFlow
                       │
                ┌──────┴──────┐
                ↓             ↓
            Dashboard      Webhook
                │             │
                └──────┬──────┘
                       ↓
                  MERCHANT
```

---

#  Core Features

##  Payment Links

Create a payment in seconds and receive a shareable checkout URL.

```text
Product:       Nike Air Force 1
Amount:        50 Qi
Payment ID:    pay_82hd91

Checkout:
https://qiflow.xyz/pay/pay_82hd91
```

No website or custom frontend required.

---

##  Qi Checkout

Customers get a simple checkout experience:

```text
┌─────────────────────────────┐
│          QiFlow             │
│                             │
│       NIKE STORE            │
│                             │
│     Nike Air Force 1        │
│                             │
│          50 Qi              │
│                             │
│      [ Pay with Qi ]        │
│                             │
└─────────────────────────────┘
```

Connect wallet → Confirm → Payment complete.

---

##  Developer API

Integrate Qi payments directly into existing applications.

Example:

```javascript
const payment = await qiflow.createPayment({
    amount: "100",
    currency: "QI",
    description: "Order #1024"
});
```

The application receives a checkout URL that can be used to complete the payment.

---

##  Webhooks

QiFlow notifies merchants when payment states change.

Example:

```json
{
  "event": "payment.success",
  "paymentId": "pay_82hd91",
  "amount": "100",
  "currency": "QI",
  "status": "completed"
}
```

Merchants can use webhooks to:

* Confirm orders
* Release products
* Send receipts
* Update databases
* Trigger subscriptions
* Start fulfillment

---

## Merchant Dashboard

Businesses can manage their payments from one place.

```text
┌──────────────────────────────────┐
│              QiFlow              │
├──────────────────────────────────┤
│                                  │
│  Total Received                  │
│                                  │
│          12,450 Qi               │
│                                  │
│  Today        Transactions       │
│  520 Qi       124                │
│                                  │
│  Recent Payments                 │
│  ─────────────────────────────   │
│  +50 Qi     Order #1024     ✓    │
│  +20 Qi     Order #1023     ✓    │
│  +5 Qi      Coffee          ✓    │
│                                  │
│  [Create Payment]                │
│  [Payment Links]                 │
│  [API]                           │
│                                  │
└──────────────────────────────────┘
```

---

#  Architecture

QiFlow consists of four main components:

### 1. Merchant Dashboard

Used by businesses to:

* Create payment requests
* Generate payment links
* View transactions
* Manage API keys
* Configure webhooks

### 2. Payment API

Provides programmatic access to QiFlow.

```text
POST /v1/payments
GET  /v1/payments/:id
GET  /v1/payments
```

### 3. Hosted Checkout

A simple customer-facing payment page.

```text
/pay/:paymentId
```

The checkout handles wallet connection and payment submission.

### 4. Quai Payment Engine

Responsible for:

* Creating payment requests
* Monitoring Quai transactions
* Verifying payments
* Updating payment status
* Triggering webhooks

---

#  Payment Lifecycle

A payment follows a simple lifecycle:

```text
CREATED
   │
   ↓
PENDING
   │
   ↓
PROCESSING
   │
   ↓
COMPLETED
```

If something goes wrong:

```text
PENDING
   │
   └────→ FAILED
```

QiFlow maintains a consistent payment state regardless of the underlying blockchain transaction.

---

#  Why Quai?

QiFlow is built specifically for the **Quai Network**.

Quai provides the underlying blockchain infrastructure while QiFlow focuses on making that infrastructure usable by merchants and developers.

The combination provides:

**Quai**

* High-throughput architecture
* EVM compatibility
* Qi as a medium of exchange
* Low-cost transactions
* Programmable smart contracts

**QiFlow**

* Merchant-friendly checkout
* Payment links
* Developer APIs
* Webhooks
* Payment tracking
* Simple integration

Together:

> **Quai provides the payment rails. QiFlow provides the payment experience.**

---

# Use Cases

QiFlow can power payments for:

###  E-commerce

```text
Product → Checkout → Qi → Merchant
```

###  Freelancers

```text
Client → Payment Link → Qi → Freelancer
```

### Cross-border commerce

```text
Customer → Qi → Merchant
```

### Events

```text
Event Ticket → Payment Link → Qi → Organizer
```

###  Social Commerce

Merchants can share payment links directly through social platforms.

###  APIs & Digital Services

Applications can request payments programmatically.

---
 
### Infrastructure

* Quai RPC
* Webhooks
* Payment monitoring

---
 
> **Any business should be able to accept Qi with the same simplicity that businesses accept traditional digital payments today.**

A merchant shouldn't need to know what a shard is.

They shouldn't need to understand RPCs.

They shouldn't need to manually monitor blockchain transactions.

They should simply be able to:

```text
Create Payment
      ↓
Share Link
      ↓
Customer Pays
      ↓
Payment Confirmed
      ↓
Business Gets Notified
```

### **Integrate once. Accept Qi everywhere.**

---

# 📄 License

MIT

``` 
