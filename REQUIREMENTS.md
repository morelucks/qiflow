# QiFlow — Complete Requirements Document

> **Project**: QiFlow — Payment Gateway for Quai Network  
> **Last Updated**: August 12, 2026  
> **Status**: Pre-Development

---

# Part 1: Technical Requirements

## 1.1 Infrastructure & Environment

| Requirement | Details | Priority |
|---|---|---|
| **Node.js runtime** | v18+ (team is on v23) | Must |
| **Package manager** | npm with workspaces (Turborepo monorepo) | Must |
| **PostgreSQL database** | v15+ for payments, merchants, webhooks data | Must |
| **Redis** | For BullMQ job queues (webhook delivery, payment monitoring) | Should |
| **Quai Network RPC access** | Testnet initially, mainnet for production | Must |
| **Domain & SSL** | `qiflow.xyz` with HTTPS | Must |
| **Hosting platform** | Vercel (frontend), Railway/Render (API) | Should |
| **Version control** | Git + GitHub/GitLab (already initialized) | Must |
| **CI/CD pipeline** | GitHub Actions or similar for automated deploys | Nice |

---

## 1.2 Frontend Requirements

### Framework & Tooling
- **Next.js 14+** (App Router) for SSR, routing, and API proxying
- **TypeScript** across the entire codebase
- **Tailwind CSS** or vanilla CSS for styling
- **Zustand** or React Context for state management

### Pages Required

| Page | Route | Description | Auth |
|---|---|---|---|
| Landing Page | `/` | Marketing page with hero, features, CTA | Public |
| Login | `/auth/login` | Merchant login | Public |
| Register | `/auth/register` | Merchant signup | Public |
| Dashboard Overview | `/dashboard` | Stats, recent payments, quick actions | Protected |
| Payments List | `/dashboard/payments` | All payments with filters/search | Protected |
| Payment Detail | `/dashboard/payments/:id` | Single payment detail view | Protected |
| Create Payment | `/dashboard/payments/new` | Form to create payment request | Protected |
| Payment Links | `/dashboard/payment-links` | Manage shareable links | Protected |
| Webhook Config | `/dashboard/webhooks` | Configure webhook endpoints | Protected |
| Settings | `/dashboard/settings` | API keys, wallet address, profile | Protected |
| **Hosted Checkout** | `/pay/:paymentCode` | Customer-facing payment page | **Public** |

### Checkout Page (Critical Path)
- Display payment details (amount, description, merchant name)
- Pelagus wallet connection (`window.pelagus` / EIP-1193)
- Qi UTXO transaction construction and signing via `quais` SDK
- Real-time payment status updates (polling or WebSocket)
- Success/failure/expired states
- Mobile-responsive design
- QR code for wallet-to-wallet payments (stretch)

### Design Requirements
- Dark mode support
- Responsive (mobile-first for checkout)
- Loading skeletons, error states, empty states
- Micro-animations and transitions
- Accessible (WCAG 2.1 AA minimum)

---

## 1.3 Backend / API Requirements

### Authentication
- JWT-based authentication for merchant dashboard
- API key + secret authentication for programmatic API access
- Password hashing with bcrypt (cost factor ≥ 12)
- Token refresh mechanism
- Rate limiting on auth endpoints (brute force protection)

### API Endpoints

#### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create merchant account |
| `POST` | `/auth/login` | Get JWT token |
| `POST` | `/auth/refresh` | Refresh JWT token |

#### Payments (API Key Auth)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/payments` | Create a payment |
| `GET` | `/v1/payments/:id` | Get payment by ID |
| `GET` | `/v1/payments` | List payments (paginated, filterable) |

#### Webhooks (JWT Auth)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/webhooks` | Register webhook endpoint |
| `GET` | `/v1/webhooks` | List merchant's webhooks |
| `PUT` | `/v1/webhooks/:id` | Update webhook |
| `DELETE` | `/v1/webhooks/:id` | Delete webhook |

#### Merchants (JWT Auth)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/merchants/me` | Get merchant profile |
| `PUT` | `/merchants/me` | Update profile |
| `POST` | `/merchants/me/api-keys` | Regenerate API key |
| `GET` | `/merchants/me/stats` | Dashboard statistics |

### Database
- PostgreSQL with Prisma ORM
- Tables: `merchants`, `payments`, `webhooks`, `webhook_deliveries`
- Proper indexing on `payment_code`, `merchant_id`, `status`
- UUID primary keys
- Timestamps on all tables

### Background Workers
- **Payment Monitor**: Polls Quai Network for transaction confirmations
- **Webhook Sender**: Delivers webhook payloads with exponential backoff retry (up to 5 attempts)
- **Payment Expiry**: Cron job to expire stale payments (default: 30 minutes)

### Input Validation
- Zod schemas for all API inputs
- Sanitize all user inputs
- Validate wallet addresses (shard-aware)
- Amount validation (positive numbers, reasonable limits)

---

## 1.4 Blockchain / Qi Integration Requirements
 

### Quai SDK (`quais`)
- Install via `npm install quais`
- Fork of ethers.js v6 — adapted for Quai's multi-chain architecture
- Handles protobuf-encoded transactions (not RLP like Ethereum)

### Qi UTXO Specifics
| Aspect | Requirement |
|---|---|
| **Transaction model** | UTXO (not account-based) — requires `txInputs[]` and `txOutputs[]` |
| **Signing** | MuSig signatures (not standard ECDSA) |
| **Address reuse** | **Prohibited** — generate fresh address per payment for privacy |
| **Payment codes** | Qi uses BIP-47 style payment codes for privacy |
| **Shard awareness** | Addresses map to specific shards based on prefix; RPC must match |

### Wallet Integration
- **Pelagus Wallet** — the official Quai browser wallet
- Injected at `window.pelagus` (EIP-1193 compatible)
- Connection via `quai_requestAccounts` RPC method
- Must handle `accountsChanged` events
- Reference: [quai-next-dapp](https://github.com/dominant-strategies/quai-next-dapp) boilerplate

### Payment Verification
- Monitor correct shard for incoming Qi transactions
- Verify transaction amount matches payment request
- Verify transaction is sent to the correct receiving address
- Wait for sufficient confirmations before marking as `COMPLETED`
- Handle reorgs gracefully

### Network Configuration
- Testnet RPC: `https://rpc.sandbox.quai.network`
- Mainnet RPC: `https://rpc.quai.network`
- Must support RPC failover/fallback

---

## 1.5 Smart Contract Requirements (Solidity / Quai EVM)

> [!IMPORTANT]
> Smart contracts run on Quai Network's EVM shard to provide on-chain payment routing, fee distribution, and optional escrow settlement.

### Smart Contract Specification (`QiFlowPaymentRouter.sol` / `QiFlowEscrow.sol`)
- **Language**: Solidity `^0.8.20`
- **Deployment**: Quai Network Testnet (Cyprus1 / EVM shard)
- **Tooling**: Hardhat / Foundry with Quai EVM plugin

### Core Functions & Features
| Function / Component | Description | Access Control |
|---|---|---|
| `createPaymentSession` | Registers a payment session on-chain with payment ID, merchant wallet, amount, and fee rate | Merchant / Backend Relayer |
| `pay` | Allows customer to pay for a registered payment session; automatically splits platform fee and routes funds | Public (Customer) |
| `depositEscrow` | Holds payment in smart contract escrow until completion signal or release trigger | Public (Customer) |
| `releaseEscrow` | Releases escrowed funds to merchant upon order fulfillment confirmation | Merchant / Authorized Relayer |
| `refund` | Refunds customer if an escrowed payment expires without release | Customer / Backend Relayer |

### On-Chain Events & Indexing
- `PaymentCreated(bytes32 indexed paymentId, address indexed merchant, uint256 amount)`
- `PaymentCompleted(bytes32 indexed paymentId, address indexed customer, uint256 merchantAmount, uint256 feeAmount)`
- `EscrowDeposited(bytes32 indexed paymentId, address indexed customer, uint256 amount)`
- `EscrowReleased(bytes32 indexed paymentId, address indexed merchant)`

---

## 1.6 Security Requirements

| Category | Requirement | Priority |
|---|---|---|
| **Transport** | HTTPS everywhere (TLS 1.2+) | Must |
| **Auth** | JWT with short expiry + refresh tokens | Must |
| **Passwords** | bcrypt hash, min 8 chars, complexity rules | Must |
| **API keys** | Cryptographically random, revocable | Must |
| **Webhooks** | HMAC-SHA256 signature on every delivery | Must |
| **Input validation** | Zod schemas, SQL injection prevention (Prisma) | Must |
| **Rate limiting** | Per-IP and per-API-key rate limits | Should |
| **CORS** | Whitelist allowed origins | Must |
| **Secrets** | Environment variables, never in code | Must |
| **Private keys** | Never stored server-side (non-custodial model) | Must |
| **Helmet.js** | Security headers (XSS, clickjacking, etc.) | Should |
| **Dependency audit** | `npm audit` in CI pipeline | Nice |
| **Logging** | Structured logs, no PII in logs | Should |

---

## 1.7 DevOps & Deployment Requirements

| Requirement | Details |
|---|---|
| **Staging environment** | Testnet-connected staging for QA before mainnet |
| **Environment config** | `.env` files per environment, no secrets in repo |
| **Database migrations** | Prisma Migrate for schema versioning |
| **Monitoring** | Uptime monitoring on health endpoint |
| **Error tracking** | Sentry or similar for production error capture |
| **Logging** | Structured JSON logging for production |
| **Backups** | Automated PostgreSQL backups |
| **Zero-downtime deploys** | Rolling deploys via Vercel/Railway |

---

## 1.8 Performance Requirements

| Metric | Target |
|---|---|
| API response time (p95) | < 200ms |
| Checkout page load | < 2 seconds |
| Payment confirmation latency | < 30 seconds after on-chain confirmation |
| Webhook delivery | < 5 seconds after payment status change |
| Concurrent payments | Support 100+ simultaneous payment sessions |
| Dashboard page load | < 1.5 seconds |

---

# Part 2: Non-Technical Requirements

## 2.1 Business Requirements

| Requirement | Details |
|---|---|
| **Value proposition** | Simplest way to accept Qi payments — "Stripe for Qi" |
| **Target users** | Merchants, freelancers, e-commerce, event organizers |
| **Revenue model** | Transaction fees (e.g., 1% per payment) — decide before production |
| **Custodial model** | **Non-custodial recommended** — payments go directly to merchant wallets. No custody = no money transmitter classification risk |
| **Supported currency** | Qi (UTXO) — potentially Quai (account-based) in v2 |
| **Payment limits** | Define min/max payment amounts |
| **Settlement** | Instant (non-custodial, direct to merchant wallet) |

---

## 2.2 UX & Design Requirements

| Requirement | Details |
|---|---|
| **Brand identity** | Logo, color palette, typography for QiFlow |
| **Design system** | Consistent components (buttons, inputs, cards, modals) |
| **Checkout UX** | ≤ 3 steps: Open link → Connect wallet → Confirm payment |
| **Dashboard UX** | Clean, data-rich, fast. Inspired by Stripe Dashboard |
| **Onboarding flow** | Guided setup: register → set wallet → get API key → create first payment |
| **Error messages** | Human-readable, actionable error messages |
| **Empty states** | Helpful empty states with CTAs (e.g., "No payments yet — create your first") |
| **Mobile support** | Checkout MUST work on mobile; dashboard should be responsive |
| **Accessibility** | WCAG 2.1 AA: keyboard nav, screen reader support, contrast ratios |

---

## 2.3 Team & Operations Requirements

| Requirement | Details |
|---|---|
| **Team communication** | Daily standups or async check-ins (Slack/Discord) |
| **Task tracking** | GitHub Issues, Linear, or Notion board |
| **Code review** | All PRs reviewed by at least 1 team member |
| **Branch strategy** | `main` → `develop` → feature branches |
| **Coding standards** | ESLint + Prettier, consistent naming conventions |
| **Documentation** | API docs (OpenAPI/Swagger), README per app, inline code comments |
| **Knowledge sharing** | Blockchain dev documents Qi/Quai patterns for the team |

---

## 2.4 Documentation Requirements

| Document | Description | Owner |
|---|---|---|
| **API Documentation** | OpenAPI/Swagger spec for all endpoints | Backend |
| **Integration Guide** | Step-by-step for merchants to integrate QiFlow | Backend |
| **SDK Documentation** | If you build a JS SDK wrapper | Backend |
| **Architecture Diagram** | System diagram with all components | Team lead |
| **Database Schema** | ER diagram and table descriptions | Backend |
| **Deployment Guide** | How to deploy all services | DevOps |
| **Contributing Guide** | How to set up dev environment, submit PRs | Team lead |

---

## 2.5 Go-to-Market Requirements (Post-Hackathon)

| Requirement | Details |
|---|---|
| **Landing page** | Production-quality marketing page at `qiflow.xyz` |
| **Demo video** | 2-3 minute walkthrough of the full flow |
| **Pitch deck** | Problem → Solution → Demo → Market → Team |
| **Social presence** | X/Twitter account, Discord/Telegram for community |
| **Beta testers** | 5-10 merchants willing to test on testnet |
| **Quai community** | Engage with Quai Discord, present at community calls |

---

# Part 3: Legal & Compliance Requirements

> [!CAUTION]
> **This section is informational, not legal advice.** Consult a fintech/crypto attorney before launching to production. The regulatory landscape is actively evolving and varies by jurisdiction.

## 3.1 Regulatory Classification

The first critical question: **What is QiFlow legally?**

| Model | Classification | Implication |
|---|---|---|
| **Non-custodial** (recommended) | Payment facilitator / software provider | Lower regulatory burden — you never hold or control user funds |
| **Custodial** | Money Services Business (MSB) / Virtual Asset Service Provider (VASP) | Requires licensing, KYC/AML programs, capital requirements |

> [!IMPORTANT]
> **The non-custodial model is strongly recommended for MVP.** If QiFlow never takes custody of Qi (payments go directly from customer wallet to merchant wallet), it significantly reduces regulatory exposure. You act as a software platform, not a financial institution.

---

## 3.2 KYC / AML Requirements

Even for non-custodial platforms, some level of compliance is expected depending on jurisdiction and volume:

### Minimum (Non-Custodial, Hackathon/Early Stage)
- [ ] Merchant email verification
- [ ] Merchant wallet address ownership verification
- [ ] Basic fraud monitoring (unusual payment patterns)
- [ ] Transaction record keeping (audit trail)

### Production-Grade (If Required)
- [ ] KYC for merchants (identity verification, business verification)
- [ ] Continuous transaction monitoring
- [ ] Sanctions screening (OFAC, EU, UN lists)
- [ ] Suspicious Activity Reports (SARs) if required by jurisdiction
- [ ] FATF Travel Rule compliance for transfers above threshold

### When KYC Becomes Mandatory
KYC is generally required when:
- You operate as a custodial service
- You facilitate fiat-to-crypto conversion
- You exceed volume thresholds set by local regulators
- You serve customers in jurisdictions that mandate it (EU under MiCA)

---

## 3.3 Jurisdiction-Specific Frameworks

### United States
| Requirement | Details |
|---|---|
| **FinCEN MSB Registration** | Required if classified as money transmitter. Non-custodial models may qualify for payment processor exemption |
| **State Money Transmitter Licenses (MTLs)** | State-by-state licensing, costs $100K+, takes 6-18 months |
| **Bank Secrecy Act (BSA)** | AML program, recordkeeping, SAR filing |
| **GENIUS Act (2025)** | Federal stablecoin framework — applies if dealing with stablecoins |

### European Union
| Requirement | Details |
|---|---|
| **MiCA (Markets in Crypto-Assets)** | Full authorization required for Crypto-Asset Service Providers (CASPs) as of July 2026 |
| **Transfer of Funds Regulation (TFR)** | Travel Rule for ALL crypto transfers (zero threshold in EU) |
| **GDPR** | Strict data protection (see Section 3.4) |

### Nigeria
| Requirement | Details |
|---|---|
| **ISA 2025** | Digital assets integrated into capital markets framework |
| **SEC Registration** | VASPs (including payment processors) must register with SEC |
| **CBN Guidelines** | Central Bank guidelines on virtual asset transactions |

> [!NOTE]
> If the team is based in Nigeria, pay particular attention to the **ISA 2025** framework and SEC VASP registration requirements.

---

## 3.4 Data Protection & Privacy (GDPR & Beyond)

### Data You Will Collect
| Data Type | Examples | Sensitivity |
|---|---|---|
| Merchant identity | Email, business name, password | High |
| Wallet addresses | Qi receiving addresses | Medium |
| Payment data | Amounts, descriptions, timestamps | Medium |
| Transaction data | Tx hashes, on-chain confirmations | Low (public blockchain) |
| Usage data | IP addresses, user agents, access logs | Medium |

### GDPR Compliance Checklist
- [ ] **Privacy Policy** — plain-language document explaining what data you collect and why
- [ ] **Data minimization** — only collect what's necessary
- [ ] **No PII on-chain** — never store personal data on the blockchain
- [ ] **Encryption** — data at rest (database) and in transit (HTTPS)
- [ ] **Right to erasure** — process for users to request data deletion
- [ ] **Right to access** — users can request a copy of their data
- [ ] **Data Processing Agreement (DPA)** — with all third-party processors (hosting, analytics)
- [ ] **Cookie consent** — if using tracking cookies on the website
- [ ] **Data Protection Impact Assessment (DPIA)** — for high-risk processing
- [ ] **Data breach notification** — 72-hour notification process

---

## 3.5 Required Legal Documents

| Document | Purpose | When Needed |
|---|---|---|
| **Terms of Service (ToS)** | Defines the contractual relationship with merchants and users | Before launch |
| **Privacy Policy** | Explains data collection, processing, and user rights | Before launch |
| **Cookie Policy** | Discloses cookie usage on website | Before launch |
| **Acceptable Use Policy** | Defines prohibited activities (money laundering, fraud) | Before launch |
| **API Terms of Use** | Governs developer API access and usage limits | Before API goes public |
| **Merchant Agreement** | Contract between QiFlow and onboarded merchants | Before production |
| **Data Processing Agreement** | Agreement with third-party data processors | Before using third-party services |
| **Refund/Dispute Policy** | How chargebacks and disputes are handled (if applicable) | Before production |

### Terms of Service — Must Include
- Service scope and limitations
- User/merchant eligibility requirements
- Prohibited activities (fraud, money laundering, sanctions violations)
- Intellectual property rights
- Limitation of liability (blockchain volatility, network issues)
- Right to suspend/terminate accounts
- Dispute resolution mechanism (arbitration or jurisdiction)
- Governing law and jurisdiction

### Privacy Policy — Must Include
- What personal data is collected
- Legal basis for processing (consent, legitimate interest, legal obligation)
- How data is used and stored
- Third-party data sharing
- Data retention periods
- User rights (access, correction, deletion, portability)
- Contact info for data protection inquiries
- Cookie policy

---

## 3.6 Smart Contract & Blockchain Risk Disclaimers

If any smart contracts are used (escrow, settlement):

- [ ] **Smart contract audit** — professional audit before mainnet deployment
- [ ] **Bug bounty program** — incentivize security researchers
- [ ] **Disclaimer of liability** — clear language that blockchain transactions are irreversible
- [ ] **Network risk disclosure** — inform users about potential network congestion, forks, or downtime
- [ ] **No financial advice disclaimer** — QiFlow is a payment tool, not a financial service

---

## 3.7 Intellectual Property

| Item | Action |
|---|---|
| **Brand name "QiFlow"** | Consider trademark registration |
| **Domain `qiflow.xyz`** | Secure domain and variants (.com, .io if available) |
| **Logo and branding** | Document ownership |
| **Open source license** | README says MIT — confirm this is intentional (MIT means anyone can fork and use) |
| **Third-party licenses** | Audit all dependencies for license compatibility |

---

# Part 4: Risk Matrix

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Quai testnet instability | High | Medium | Use local devnet as fallback, cache RPC responses |
| Pelagus wallet bugs | High | Medium | Build fallback manual payment flow (address + amount copy) |
| Regulatory action | Critical | Low (if non-custodial) | Stay non-custodial, consult lawyer before scaling |
| UTXO complexity | High | High | Dedicated blockchain dev, extensive testing |
| Team coordination (5 devs, 2 weeks) | Medium | Medium | Clear task ownership, daily syncs, PR reviews |
| Payment verification failures | High | Medium | Extensive edge case testing, manual override for stuck payments |
| Data breach | Critical | Low | Encryption, access controls, security headers, dependency auditing |
| Domain/brand conflict | Medium | Low | Trademark search before major investment |

---

# Part 5: MVP vs Production Scope

| Feature | MVP (Hackathon) | Production |
|---|---|---|
| Auth | Email + password | + OAuth, 2FA |
| KYC | Email verification only | Full identity verification |
| Payments | Create, track, confirm | + Refunds, disputes, recurring |
| Smart Contracts | `QiFlowPaymentRouter` (Quai EVM testnet deployment, fee routing & escrow) | + Multi-token router, automated DEX swaps, multi-sig escrow |
| Currencies | Qi (UTXO) & Quai (EVM) | + Stablecoins (QUSD / ERC-20) |
| Webhooks | Basic delivery | + Retry, logs, testing tools |
| Dashboard | Overview + payments list | + Analytics, export, team roles |
| Checkout | Pelagus wallet integration | + QR code, multiple wallets |
| API | Core endpoints | + SDK, rate tiers, usage analytics |
| Legal docs | Basic ToS + Privacy Policy | Full legal suite, lawyer-reviewed |
| Compliance | Non-custodial, minimal | KYC/AML if scaling commercially |
| Infra | Single region | Multi-region, CDN, monitoring |

---

# Compliance Checklist Summary

## Before Hackathon Demo
- [ ] Basic Terms of Service
- [ ] Basic Privacy Policy
- [ ] Non-custodial architecture confirmed
- [ ] No PII stored on-chain
- [ ] HTTPS on all endpoints

## Before Production Launch
- [ ] Lawyer-reviewed Terms of Service
- [ ] Lawyer-reviewed Privacy Policy
- [ ] Cookie consent implementation
- [ ] Regulatory classification confirmed with counsel
- [ ] KYC/AML program (if required by jurisdiction)
- [ ] Data Protection Impact Assessment
- [ ] Third-party DPAs signed
- [ ] Trademark search completed
- [ ] Smart contract audit (if applicable)
- [ ] Security penetration testing
- [ ] Incident response plan

---

> [!CAUTION]
> **Disclaimer**: This document provides a general overview of potential requirements. It does not constitute legal, financial, or regulatory advice. The regulatory landscape for cryptocurrency services varies significantly by jurisdiction and is evolving rapidly. **Consult with qualified legal counsel specializing in fintech, cryptocurrency, and data protection law** before launching any commercial payment processing service.
