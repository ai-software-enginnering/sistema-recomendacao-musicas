# Sistema de Recomendação de Músicas com Machine Learning

Sistema de recomendação musical com arquitetura híbrida que combina **busca vetorial no backend** com **reranqueamento neural no frontend**.

O projeto foi desenvolvido para demonstrar, de forma prática, como aplicar **machine learning na web** com foco em **modularidade**, **performance**, **personalização local** e **separação de responsabilidades**.

## Visão geral

A aplicação busca músicas candidatas no backend por meio de uma base vetorial e, em seguida, personaliza a ordem dessas recomendações no navegador com um modelo treinado em **TensorFlow.js**.

A arquitetura divide o problema em duas etapas:

- **geração de candidatos (músicas)** no backend
- **classificação personalizada** no frontend

Esse desenho reduz acoplamento, facilita evolução da solução e deixa mais claro o papel de cada camada do sistema.

## Como funciona

1. O usuário seleciona um perfil local na interface
2. O sistema exibe o catálogo de músicas ou carrega o histórico de músicas já curtidas
3. O backend retorna músicas candidatas usando busca vetorial
4. O frontend treina um modelo neural com base nesse histórico
5. Um **Web Worker** calcula a relevância de cada música candidata
6. A interface exibe as recomendações reranqueadas por afinidade prevista

## Stack utilizada

### Backend
- **Node.js**
- **Express**
- **ChromaDB**

### Frontend
- **JavaScript modular (ES Modules)**
- **TensorFlow.js**
- **Web Workers**
- **Bootstrap 5**

## Modelo de machine learning

O reranqueamento usa uma rede neural densa, pequena e eficiente, projetada para rodar no navegador.

### Parâmetros de entrada

O modelo utiliza 10 atributos musicais:

- `danceability`
- `energy`
- `loudness`
- `speechiness`
- `acousticness`
- `instrumentalness`
- `liveness`
- `valence`
- `tempo`
- `popularity`

### Arquitetura da rede

- **Camada de entrada:** 10 features
- **Camada oculta 1:** 16 neurônios com ReLU
- **Camada oculta 2:** 8 neurônios com ReLU
- **Camada de saída:** 1 neurônio com Sigmoid

A saída do modelo é usada como **pontuação de relevância**, que define a ordem final das músicas recomendadas.

## Diferenciais do projeto

- **Arquitetura híbrida**: busca vetorial + reranqueamento neural
- **Personalização no cliente**: o treino ocorre no navegador
- **Execução não bloqueante**: o modelo roda em Web Worker
- **Separação clara de camadas**: services, controllers, views e worker
- **Aplicação prática de IA na web**

## Estrutura do projeto
```bash
SongsRecomendation/
├── backend/
│   ├── data/
│   ├── src/
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── data/
│   ├── src/
│   │   ├── controller/
│   │   ├── events/
│   │   ├── service/
│   │   ├── view/
│   │   │   ├── templates/
│   │   └── workers/
│   ├── ssl/
│   └── index.html
├── docker-compose.yml
├── docker-compose.dev.yml
└── package.json
```

## Decisões arquiteturais principais

### Busca vetorial para recuperação inicial
O backend usa ChromaDB para recuperar rapidamente músicas candidatas com base em similaridade.

### Reranqueamento neural no frontend
O frontend refina a ordem final das recomendações com base no histórico do usuário selecionado.

### Uso de Web Worker
O treinamento e a predição acontecem fora da thread principal, evitando travamentos da interface.

### Transparência dos parâmetros
A aplicação exibe os parâmetros usados pelo modelo e pode apresentar o peso relativo aprendido após o treinamento.

## Características do Projeto
- arquitetura full stack
- integração entre backend e frontend
- machine learning aplicado no navegador
- uso de TensorFlow.js em cenário real
- recomendação personalizada
- organização modular de código
- decisões de performance e UX

## Como executar
### Requisitos
- **Node.js 18+**
- **npm**
- **Docker** e **Docker Compose** para ambiente containerizado
- Uma instância do **ChromaDB** disponível

### Execução local
```bash
npm install
npm run dev
```

### Execução com Docker
```bash
docker compose up --build
```

### Variáveis de ambiente
Exemplo no backend:
**.env**
```bash
PORT=3001
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=songsPORT=3001
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=songs
```
Ajuste os valores conforme o seu ambiente.

