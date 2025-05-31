# Build stage
FROM node:24-alpine AS build

WORKDIR /app

# Instalar dependências necessárias para compilação
RUN apk add --no-cache python3 make g++

# Copiar apenas os arquivos necessários para instalar dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar o resto dos arquivos
COPY . .

# Construir a aplicação
RUN npm run build

# Production stage
FROM node:24-alpine AS production

WORKDIR /app

# Instalar cliente PostgreSQL e ferramentas necessárias
RUN apk add --no-cache postgresql-client

# Instalar apenas dependências de produção
COPY package*.json ./
RUN npm ci --only=production

# Copiar os arquivos compilados
COPY --from=build /app/dist ./dist
COPY --from=build /app/nest-cli.json .

# Expor a porta
EXPOSE 4000

# Criar um script de entrada diretamente no Dockerfile
# CMD echo "Waiting for PostgreSQL to start..." && \
#     until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do \
#       echo "PostgreSQL is unavailable - sleeping"; \
#       sleep 2; \
#     done && \
#     echo "Running migrations..." && \
#     npx typeorm migration:run -d ./dist/typeorm.config.js && \
#     echo "Running seeds..." && \
#     node ./dist/src/seeds/seed.js && \
#     echo "Starting application..." && \
#     node ./dist/src/main.js