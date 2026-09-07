# Music Recommendation System with Machine Learning

Music recommendation system with a hybrid architecture that combines **vector search on the backend** with **neural reranking on the frontend**.

The project was developed to demonstrate, in a practical way, how to apply machine learning on the web with a focus on modularity, performance, local personalization and separation of responsibilities.

## Overview

The application searches for candidate songs on the backend through a vector database and then personalizes the order of these recommendations in the browser with a model trained in **TensorFlow.js**.

The architecture divides the problem into two stages:

- **candidate generation (songs)** on the backend
- **personalized ranking** on the frontend

This design reduces coupling, makes solution evolution easier and makes the role of each system layer clearer.

## How it works

1. The user selects a local profile in the interface
2. The system displays the song catalog or loads the history of already liked songs
3. The backend returns candidate songs using vector search
4. The frontend trains a neural model based on this history
5. A **Web Worker** calculates the relevance of each candidate song
6. The interface displays the recommendations reranked by predicted affinity

## Stack used

### Backend
- **Node.js**
- **Express**
- **ChromaDB**

### Frontend
- **JavaScript modular (ES Modules)**
- **TensorFlow.js**
- **Web Workers**
- **Bootstrap 5**

## Machine learning model

The reranking uses a small, efficient dense neural network, designed to run in the browser.

### Input parameters

The model uses 10 musical attributes:

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

### Network architecture

- **Input layer**: 10 features
- **Hidden layer 1**: 16 neurons with ReLU
- **Hidden layer 2**: 8 neurons with ReLU
- **Output layer**: 1 neuron with Sigmoid

The model output is used as a relevance score, which defines the final order of the recommended songs.

## Project highlights

- **Hybrid architecture**: vector search + neural reranking
- **Client-side personalization**: training happens in the browser
- **Non-blocking execution**: the model runs in a Web Worker
- **Clear separation of layers**: services, controllers, views and worker
- **Practical application of AI on the web**

## Project structure
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

## Main architectural decisions

### Vector search for initial retrieval
The backend uses ChromaDB to quickly retrieve candidate songs based on similarity.

### Neural reranking on the frontend
The frontend refines the final order of the recommendations based on the history of the selected user.

### Web Worker usage
Training and prediction happen outside the main thread, preventing interface freezes.

### Parameter transparency
The application displays the parameters used by the model and can present the relative weight learned after training.

## Project features
- full stack architecture
- backend and frontend integration
- machine learning applied in the browser
- TensorFlow.js usage in a real-world scenario
- personalized recommendation
- modular code organization
- performance and UX decisions

## How to run
### Requirements
- **Node.js 18+**
- **npm**
- **Docker** and **Docker Compose** for a containerized environment
- A **ChromaDB** instance available

### Local execution
```bash
npm install
npm run dev
```

### Execution with Docker
```bash
docker compose up --build
```

### Environment variables
Example in the backend:
**.env**
```bash
PORT=3001
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=songsPORT=3001
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=songs
```
Adjust the values according to your environment.
