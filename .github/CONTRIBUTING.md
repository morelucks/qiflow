# QiFlow Team Development Guidelines

Welcome to the QiFlow monorepo! Follow these workflow guidelines to keep our codebase clean, stable, and fast.

## 🌿 Branch Naming Strategy

Always name your working branch using your assigned issue number:
- Format: `feat/<issue-number>-<short-description>`
- Examples:
  - `feat/22-landing-page`
  - `feat/20-dashboard-ui`
  - `feat/25-api-docs`

## 💬 Commit Message Format

Use Conventional Commits:
- `feat(component): short description (#issue)`
- `fix(component): fix issue description (#issue)`
- `docs(scope): update documentation (#issue)`

## 🚀 Pull Request Process

1. Pull the latest code from `main`:
   ```bash
   git checkout main && git pull origin main
   ```
2. Create your feature branch:
   ```bash
   git checkout -b feat/22-landing-page
   ```
3. Run verification before committing:
   ```bash
   npm run lint && npm run type-check && npm run build
   ```
4. Push your branch and open a Pull Request on GitHub:
   ```bash
   git push -u origin feat/22-landing-page
   gh pr create
   ```
5. Ensure all automated GitHub Actions CI checks pass!
