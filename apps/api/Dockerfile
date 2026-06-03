FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages/

RUN npm ci

COPY apps/api ./apps/api

RUN npm run build -w @mneme/api

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages ./packages/

RUN npm ci -w @mneme/api --omit=dev

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/migrations ./apps/api/migrations

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/index.js"]
