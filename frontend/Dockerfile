FROM nginx:stable-alpine

# Remove configuração padrão
RUN rm /etc/nginx/conf.d/default.conf

# Copia configuração otimizada
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# ✅ Copia apenas os arquivos estáticos, ignorando arquivos de config do Docker/Node
WORKDIR /usr/share/nginx/html
COPY frontend/ . 

# Garante que a pasta de SSL existe (será preenchida pelo volume)
RUN mkdir -p /etc/nginx/ssl

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]