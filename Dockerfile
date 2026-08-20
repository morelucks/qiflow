# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY contracts/package*.json ./contracts/
COPY circuits/package*.json ./circuits/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/config/package*.json ./packages/config/
# Persist the npm cache across builds so a lockfile change doesn't re-download every tarball.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

FROM dependencies AS backend-builder
COPY . .
# @qiflow/shared resolves to ./dist — must be compiled before any workspace that imports it
RUN npm run build --workspace=@qiflow/shared
RUN npm run db:generate --workspace=@qiflow/backend
RUN npm run build --workspace=@qiflow/backend

FROM base AS backend
# root package.json carries the workspaces field that `npm start --workspace` needs
COPY --from=backend-builder /app/package.json ./
# node_modules from the builder includes the generated Prisma client
COPY --from=backend-builder /app/node_modules ./node_modules
# node_modules/@qiflow/shared is a workspace symlink -> ../../packages/shared
COPY --from=backend-builder /app/packages/shared/package.json ./packages/shared/
COPY --from=backend-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/prisma ./backend/prisma
EXPOSE 4000
CMD ["npm", "start", "--workspace=@qiflow/backend"]

FROM dependencies AS frontend-builder
COPY . .
RUN npm run build --workspace=@qiflow/shared
# NEXT_PUBLIC_* vars are inlined into the browser bundle at build time, so they must be
# supplied here (runtime env is too late). Override via `docker build --build-arg` / compose `args`.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build --workspace=@qiflow/frontend

FROM base AS frontend
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
COPY --from=frontend-builder /app/package.json ./
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY --from=frontend-builder /app/packages/shared/package.json ./packages/shared/
COPY --from=frontend-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=dependencies /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start", "--workspace=@qiflow/frontend"]
