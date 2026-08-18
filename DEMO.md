# QiFlow Demo Guide

A step-by-step guide to running and demonstrating **QiFlow** — the payment gateway for Quai Network.

---

## Prerequisites & Infrastructure

Ensure Docker is installed and running, then start PostgreSQL and Redis containers and run the database seed script:

```bash
# 1. Start Postgres & Redis containers
docker start qiflow_postgres qiflow_redis

# 2. Push database schema & seed demo data
npm --prefix backend run db:push
npm --prefix backend run db:seed
```

---

## Launching Development Servers

Start the frontend, backend API, and shared package watcher in development mode:

```bash
npm run dev
```

* **Frontend Web Dashboard:** [http://localhost:3000](http://localhost:3000)
* **Backend REST API:** [http://localhost:3001](http://localhost:3001)
* **Swagger API Docs:** [http://localhost:3001/docs](http://localhost:3001/docs)

---

## 1. Merchant Dashboard Demo

Navigate to **[http://localhost:3000/auth/login](http://localhost:3000/auth/login)** in your browser and log in using the demo merchant credentials:

* **Email:** `demo@qiflow.xyz`
* **Password:** `password123`

### Key Demo Features:
1. **Overview Dashboard ([`/dashboard`](http://localhost:3000/dashboard)):** Highlights volume metrics, recent activity, and quick setup options.
2. **Payments Management ([`/dashboard/payments`](http://localhost:3000/dashboard/payments)):** Filter transactions by status (`COMPLETED`, `PENDING`, `EXPIRED`), view payment details, and search payments.
3. **Payment Links ([`/dashboard/payment-links`](http://localhost:3000/dashboard/payment-links)):** Create fixed-amount or open-amount shareable links for social commerce and invoices.
4. **Webhooks ([`/dashboard/webhooks`](http://localhost:3000/dashboard/webhooks)):** Configure webhook delivery URLs and copy HMAC signing secrets.
5. **API Keys & Settings ([`/dashboard/settings`](http://localhost:3000/dashboard/settings)):** Manage merchant API keys for backend integrations.

---

## 2. Hosted Checkout Pages Demo

Test customer checkout flows using pre-seeded payment links:

* **Completed Payment Checkout:** [http://localhost:3000/pay/pay_demo0001](http://localhost:3000/pay/pay_demo0001) *(50 Qi - QiFlow T-Shirt)*
* **Pending Payment Checkout:** [http://localhost:3000/pay/pay_demo0002](http://localhost:3000/pay/pay_demo0002) *(15.5 Qi - Coffee)*
* **Expired Payment Checkout:** [http://localhost:3000/pay/pay_demo0003](http://localhost:3000/pay/pay_demo0003) *(120 Qi - Conference Ticket)*

---

## 3. Developer REST API Demo

Demonstrate API requests using the seeded test key (`qiflow_test_demo1234567890abcdef12345678`):

### Health Check
```bash
curl -s http://localhost:3001/health
```

### Fetch Merchant Payments
```bash
curl -s -H "x-api-key: qiflow_test_demo1234567890abcdef12345678" \
     http://localhost:3001/v1/payments
```

### Create a New Payment Request via API
```bash
curl -s -X POST http://localhost:3001/v1/payments \
  -H "x-api-key: qiflow_test_demo1234567890abcdef12345678" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "25.00",
    "description": "Demo Service Subscription",
    "receivingAddress": "0x00473a216f2b1d382759e612bf6029fa037e95b2"
  }'
```

---

## Official Brand Palette

| Token Name | Hex Code | Role |
| :--- | :--- | :--- |
| **Ink** | `#13102B` | Darkest background (slides/hero) |
| **Primary / Deep Indigo** | `#1E1B4B` | Main dark background & cards |
| **Violet (secondary)** | `#6C4AB6` | Icons, accents & logo ring |
| **Lilac** | `#C9BCF0` | Muted body text on dark |
| **Off-White** | `#F7F6FB` | Light slide / page background |
| **White** | `#FFFFFF` | Headlines on dark, cards on light |
| **Mint (accent)** | `#00E6A8` | Highlights, CTAs & logo arrow |
