#!/usr/bin/env bash

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "------------------------------------------------"
echo "🎵 Iniciando Deploy: Music Recommendation System"
echo "------------------------------------------------"

# 1. Validação de Dependências
echo "🔍 Verificando arquivos..."
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ Erro: backend/.env não encontrado!${NC}"
    exit 1
fi

if [ ! -f "frontend/ssl/fullchain.pem" ]; then
    echo -e "${YELLOW}⚠️  Aviso: SSL não detectado. O Nginx pode falhar.${NC}"
fi

# 2. Atualização do Ambiente
echo "🧹 Limpando containers antigos..."
docker compose down --remove-orphans

# 3. Build e Start
echo "🏗️  Construindo e subindo serviços..."
docker compose up -d --build

# 4. 🩺 Health Check via Docker
echo "⏳ Aguardando estabilização (Health Check)..."

MAX_RETRIES=15
COUNT=0

while [ $COUNT -lt $MAX_RETRIES ]; do
    # Verifica o status de saúde definido no docker-compose
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' music-api 2>/dev/null || echo "starting")
    
    if [ "$STATUS" == "healthy" ]; then
        echo -e "${GREEN}✅ Backend está saudável!${NC}"
        break
    fi
    
    echo -e "Aguardando... Status atual: ${YELLOW}$STATUS${NC} ($((COUNT+1))/$MAX_RETRIES)"
    sleep 4
    ((COUNT++))
    
    if [ $COUNT -eq $MAX_RETRIES ]; then
        echo -e "${RED}❌ Erro: O serviço não ficou saudável a tempo.${NC}"
        docker compose logs backend
        exit 1
    fi
done

echo "------------------------------------------------"
echo -e "${GREEN}🚀 Deploy finalizado com sucesso!${NC}"
echo "------------------------------------------------"
docker compose ps