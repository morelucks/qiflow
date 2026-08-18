# Contributing to QiFlow

Thank you for your interest in contributing to QiFlow.

## Codebase Architecture

QiFlow is structured as an enterprise monorepo containing:
- `backend/`: REST API server built with Express.js, TypeScript, and Prisma ORM.
- `frontend/`: Merchant dashboard and hosted checkout UI built with Next.js 14.
- `contracts/`: Smart contract workspace for Quai Network payments.
- `circuits/`: Zero-Knowledge circuits for private payment proofs.
- `packages/shared/`: Shared domain models and formatting utilities.
- `packages/config/`: Shared ESLint and TypeScript configurations.

## Development Workflow

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Infrastructure Services**:
   ```bash
   docker-compose up -d postgres redis
   ```

3. **Prisma Setup**:
   ```bash
   npm run db:push --workspace=@qiflow/backend
   npm run db:seed --workspace=@qiflow/backend
   ```

4. **Run Development Servers**:
   ```bash
   npm run dev
   ```

## Code Quality Standards

Prior to submitting pull requests, run the verification suite:
```bash
npm run lint
npm run type-check
npm run build
```

Ensure all commit messages and pull request descriptions follow conventional commit guidelines without emojis.
