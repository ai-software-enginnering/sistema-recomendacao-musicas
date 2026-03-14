import express from 'express';
import { getChromaClient, getChromaConfig } from '../chromaClient.js';
import { extractUserFeatures } from './featureBuilder.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();

class LRUCache {
  #cache = new Map();
  #maxSize = 1000;

  get(key) {
    if (!this.#cache.has(key)) return null;

    const value = this.#cache.get(key);
    this.#cache.delete(key);
    this.#cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.#cache.has(key)) {
      this.#cache.delete(key);
    }

    this.#cache.set(key, value);

    if (this.#cache.size > this.#maxSize) {
      const firstKey = this.#cache.keys().next().value;
      this.#cache.delete(firstKey);
    }
  }

  invalidate(predicate) {
    let count = 0;

    for (const key of this.#cache.keys()) {
      if (predicate(key)) {
        this.#cache.delete(key);
        count++;
      }
    }

    return count;
  }

  clear() {
    this.#cache.clear();
  }

  size() {
    return this.#cache.size;
  }
}

const recommendationCache = new LRUCache();

function toPositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function toNonNegativeInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function buildLikedTrackSet(user) {
  const history = Array.isArray(user?.history) ? user.history : [];
  return new Set(
    history
      .map(track => track?.track_uri || track?.id || track?.uri)
      .filter(Boolean)
  );
}

function mapSongRecord(id, metadata = {}, document = null, distance = null) {
  return {
    id,
    metadata,
    document,
    distance
  };
}

/**
 * Busca músicas paginadas com indicador de continuidade
 */
export async function getAllSongs(limit = 50, offset = 0) {
  try {
    const safeLimit = toPositiveInt(limit, 50, 500);
    const safeOffset = toNonNegativeInt(offset, 0);

    const client = getChromaClient();
    const { collection: collectionName } = getChromaConfig();

    if (!collectionName) {
      throw new Error('CHROMA_COLLECTION não configurada.');
    }

    const collection = await client.getCollection({ name: collectionName });

    if (!collection) {
      throw new Error(`Coleção '${collectionName}' não encontrada no ChromaDB.`);
    }

    const response = await collection.get({
      limit: safeLimit + 1,
      offset: safeOffset,
      include: ['metadatas', 'documents']
    });

    const ids = Array.isArray(response?.ids) ? response.ids : [];
    const metadatas = Array.isArray(response?.metadatas) ? response.metadatas : [];
    const documents = Array.isArray(response?.documents) ? response.documents : [];

    const hasMore = ids.length > safeLimit;
    const pageIds = ids.slice(0, safeLimit);

    const songs = pageIds.map((id, index) =>
      mapSongRecord(id, metadatas[index] || {}, documents[index] || null)
    );

    return {
      songs,
      hasMore,
      total: songs.length,
      limit: safeLimit,
      offset: safeOffset
    };
  } catch (err) {
    Logger.error('recommend', 'Erro em getAllSongs', err);
    throw err;
  }
}

/**
 * Gera recomendações personalizadas
 */
export async function recommend({ user, topK = 50 }) {
  try {
    if (!user || typeof user !== 'object') {
      throw new Error('recommend: user deve ser um objeto válido');
    }

    if (!user.id) {
      throw new Error('recommend: user.id é obrigatório');
    }

    const safeTopK = toPositiveInt(topK, 50, 200);
    const cacheKey = `${user.id}:${safeTopK}`;

    const cached = recommendationCache.get(cacheKey);
    if (cached) {
      return { candidates: cached, fromCache: true };
    }

    const client = getChromaClient();
    const { collection: collectionName } = getChromaConfig();

    if (!collectionName) {
      throw new Error('CHROMA_COLLECTION não configurada.');
    }

    const collection = await client.getCollection({ name: collectionName });

    if (!collection) {
      throw new Error(`Coleção '${collectionName}' não encontrada no ChromaDB.`);
    }

    const likedTrackIds = buildLikedTrackSet(user);

    let candidates = [];

    // ✅ Cold start: usuário sem histórico
    if (!Array.isArray(user.history) || user.history.length === 0) {
      candidates = await getColdStartRecommendations(safeTopK);
      recommendationCache.set(cacheKey, candidates);
      return { candidates, fromCache: false, coldStart: true };
    }

    // ✅ Extrai features do usuário
    let userFeatures;
    try {
      userFeatures = extractUserFeatures(user);
    } catch (err) {
      Logger.warn('recommend', 'Erro ao extrair features do usuário, usando cold start', err);
      candidates = await getColdStartRecommendations(safeTopK);
      recommendationCache.set(cacheKey, candidates);
      return { candidates, fromCache: false, coldStart: true };
    }

    // ✅ Valida o vetor de features
    if (!Array.isArray(userFeatures) || userFeatures.length === 0) {
      Logger.warn('recommend', 'Features do usuário inválidas, usando cold start');
      candidates = await getColdStartRecommendations(safeTopK);
      recommendationCache.set(cacheKey, candidates);
      return { candidates, fromCache: false, coldStart: true };
    }

    const querySize = Math.min(Math.max(safeTopK * 2, safeTopK), 400);

    const results = await collection.query({
      queryEmbeddings: [userFeatures],
      nResults: querySize,
      include: ['metadatas', 'documents', 'distances']
    });

    const ids = Array.isArray(results?.ids?.[0]) ? results.ids[0] : [];
    const metadatas = Array.isArray(results?.metadatas?.[0]) ? results.metadatas[0] : [];
    const documents = Array.isArray(results?.documents?.[0]) ? results.documents[0] : [];
    const distances = Array.isArray(results?.distances?.[0]) ? results.distances[0] : [];

    candidates = ids
      .map((id, idx) =>
        mapSongRecord(id, metadatas[idx] || {}, documents[idx] || null, distances[idx] ?? null)
      )
      .filter(candidate => {
        const trackId =
          candidate.metadata?.track_uri ||
          candidate.id ||
          candidate.metadata?.id;

        return !likedTrackIds.has(trackId);
      })
      .slice(0, safeTopK);

    // ✅ Se nenhuma recomendação foi encontrada, usa cold start
    if (candidates.length === 0) {
      Logger.warn('recommend', 'Nenhuma recomendação encontrada, usando cold start');
      candidates = await getColdStartRecommendations(safeTopK);
    }

    recommendationCache.set(cacheKey, candidates);

    return {
      candidates,
      fromCache: false,
      coldStart: false
    };
  } catch (err) {
    Logger.error('recommend', 'Erro ao gerar recomendações', err);
    throw err;
  }
}

/**
 * Recomendações para cold start
 */
export async function getColdStartRecommendations(topK = 50) {
  try {
    const safeTopK = toPositiveInt(topK, 50, 200);

    const client = getChromaClient();
    const { collection: collectionName } = getChromaConfig();

    if (!collectionName) {
      throw new Error('CHROMA_COLLECTION não configurada.');
    }

    const collection = await client.getCollection({ name: collectionName });

    if (!collection) {
      throw new Error(`Coleção '${collectionName}' não encontrada no ChromaDB.`);
    }

    const balancedVector = Array(10).fill(0.5);

    const results = await collection.query({
      queryEmbeddings: [balancedVector],
      nResults: safeTopK,
      include: ['metadatas', 'documents', 'distances']
    });

    const ids = Array.isArray(results?.ids?.[0]) ? results.ids[0] : [];
    const metadatas = Array.isArray(results?.metadatas?.[0]) ? results.metadatas[0] : [];
    const documents = Array.isArray(results?.documents?.[0]) ? results.documents[0] : [];
    const distances = Array.isArray(results?.distances?.[0]) ? results.distances[0] : [];

    return ids.map((id, idx) =>
      mapSongRecord(id, metadatas[idx] || {}, documents[idx] || null, distances[idx] ?? null)
    );
  } catch (err) {
    Logger.error('recommend', 'Erro no cold start', err);
    throw err;
  }
}

/**
 * GET /songs
 */
router.get('/songs', async (req, res) => {
  try {
    const limit = toPositiveInt(req.query.limit, 50, 500);
    const offset = toNonNegativeInt(req.query.offset, 0);

    const result = await getAllSongs(limit, offset);
    res.status(200).json(result);
  } catch (error) {
    Logger.error('recommend', 'Erro na rota /songs', error);
    res.status(500).json({
      error: error?.message || 'Erro interno ao listar músicas.'
    });
  }
});

/**
 * POST /
 */
router.post('/', async (req, res) => {
  try {
    const { user, topK = 50 } = req.body || {};

    if (!user) {
      return res.status(400).json({
        error: 'Campo "user" é obrigatório.'
      });
    }

    const result = await recommend({ user, topK });
    res.status(200).json(result);
  } catch (error) {
    Logger.error('recommend', 'Erro na rota POST /', error);
    res.status(500).json({
      error: error?.message || 'Erro interno ao gerar recomendações.'
    });
  }
});

/**
 * POST /cache/invalidate
 */
router.post('/cache/invalidate', async (req, res) => {
  try {
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({
        error: 'Campo "userId" é obrigatório.'
      });
    }

    const removed = recommendationCache.invalidate((key) =>
      key.startsWith(`${userId}:`)
    );

    res.status(200).json({
      success: true,
      invalidated: removed,
      cacheSize: recommendationCache.size()
    });
  } catch (error) {
    Logger.error('recommend', 'Erro na rota /cache/invalidate', error);
    res.status(500).json({
      error: error?.message || 'Erro interno ao invalidar cache.'
    });
  }
});

export { router as recommendRouter, recommendationCache };