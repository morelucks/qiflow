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
RUN npm ci

FROM dependencies AS backend-builder
COPY . .
RUN npm run db:generate --workspace=@qiflow/backend
RUN npm run build --workspace=@qiflow/backend

FROM base AS backend
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/prisma ./backend/prisma
EXPOSE 4000
CMD ["npm", "start", "--workspace=@qiflow/backend"]

FROM dependencies AS frontend-builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build --workspace=@qiflow/frontend

FROM base AS frontend
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY --from=dependencies /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start", "--workspace=@qiflow/frontend"]
