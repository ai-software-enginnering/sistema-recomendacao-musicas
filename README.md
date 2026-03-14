# 🎵 Sistema de Recomendação de Músicas
Este projeto é um sistema de recomendação de músicas avançado que utiliza uma arquitetura híbrida: busca vetorial no backend com ChromaDB e re-ranking neural no frontend com TensorFlow.js. O foco principal é performance, privacidade (treinamento no cliente) e precisão.

# 🚀 Principais Funcionalidades
- Busca Vetorial: Recuperação de candidatos de alta relevância utilizando embeddings no ChromaDB.
- Re-ranking Neural: Refinamento das recomendações diretamente no navegador com TensorFlow.js.
- Processamento em Background: Uso de Web Workers para garantir que o treinamento da IA não trave a interface.
- Visualização em Tempo Real: Integração com TFVisor para monitorar as métricas de treinamento do modelo.
- Persistência Local: Histórico de curtidas e preferências armazenados de forma segura.

# 🏗️ Arquitetura Técnica
O sistema opera em um fluxo de duas etapas para garantir escalabilidade e personalização:
- Backend (Recuperação): O Node.js consulta o ChromaDB para encontrar as 50 músicas mais similares aos gostos do usuário com base em distância vetorial.
- Frontend (Classificação): O navegador recebe os candidatos e utiliza um modelo de rede neural (MLP) treinado localmente para ordenar essas músicas de acordo com o comportamento específico do usuário.

# 🛠️ Stack Tecnológica
## Backend
- Node.js & Express: Servidor de API robusto.
- ChromaDB: Banco de dados vetorial para busca de similaridade.
- Zod: Validação rigorosa de esquemas e dados.
## Frontend
- TensorFlow.js: Motor de inferência e treinamento de redes neurais.
- Web Workers: Execução de tarefas pesadas em threads separadas.
- Bootstrap 5: Interface responsiva e moderna.
- Vanilla JS (ES6+): Arquitetura baseada em módulos e componentes.

# 🔧 Configuração e Instalação
## Pré-requisitos
- Node.js 18 ou superior.
- Instância do ChromaDB (Local ou Cloud).
- Arquivo CSV de músicas (exportado do Spotify).

## Instalação
1. Clone o repositório.
2. Instale as dependências na raiz, no /backend e no /frontend:
```bash
npm install
```
3. Configure as variáveis de ambiente no arquivo .env dentro da pasta /backend.

## Ingestão de Dados
Para carregar seu catálogo de músicas no banco vetorial:
```bash
npm run ingest
```

## Execução
Para iniciar o ambiente de desenvolvimento (Backend + Frontend):
```bash
npm run dev
```

# 📂 Estrutura do Projeto
- backend/src/ingest: Scripts para processamento de CSV e carga no ChromaDB.
- backend/src/recommend: Lógica de busca vetorial e extração de features.
- frontend/src/worker: Lógica da rede neural executada via Web Worker.
- frontend/src/controller: Controladores para gerenciamento de estado e eventos.



