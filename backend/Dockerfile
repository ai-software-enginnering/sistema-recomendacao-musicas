# Estágio de Build
FROM node:22-alpine AS builder
WORKDIR /app
# Copia arquivos de definição de pacotes para aproveitar o cache das camadas
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm install
# Copia o restante do código
COPY . .

# Estágio de Execução
FROM node:22-alpine
WORKDIR /app/backend
ENV NODE_ENV=production

# ✅ Instala wget para o Healthcheck do Docker Compose funcionar
RUN apk add --no-cache wget

# Copia apenas o necessário do estágio de build
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/backend /app/backend

EXPOSE 3001
CMD ["node", "src/server.js"]