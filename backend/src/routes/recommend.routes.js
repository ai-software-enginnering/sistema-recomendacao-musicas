import { Router } from 'express';
import { z } from 'zod';
import { getAllSongs, recommend, recommendationCache } from '../recommend/recommend.js';

const router = Router();

// ✅ Esquemas de Validação mais rigorosos
const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

const recommendSchema = z.object({
  user: z.object({
    id: z.union([z.string(), z.number()]),
    // Garante que o histórico seja um array, mesmo que venha null/undefined
    history: z.array(z.any()).nullish().transform(val => val ?? [])
  }),
  topK: z.coerce.number().int().min(1).max(100).default(50)
});

const cacheSchema = z.object({
  userId: z.union([z.string(), z.number()])
});

/**
 * 🟢 GET /api/recommend/songs
 * Lista o catálogo de músicas do ChromaDB
 */
router.get('/songs', async (req, res, next) => {
  try {
    const { limit, offset } = paginationSchema.parse(req.query);
    
    // ✅ Chama o service que já retorna { songs, hasMore, total }
    const result = await getAllSongs(limit, offset);
    
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Parâmetros de paginação inválidos.', 
        details: error.issues 
      });
    }
    next(error);
  }
});

/**
 * 🟢 POST /api/recommend
 * Gera recomendações personalizadas
 */
router.post('/', async (req, res, next) => {
  try {
    const { user, topK } = recommendSchema.parse(req.body);
    const result = await recommend({ user, topK });
    
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Dados de entrada inválidos para recomendação.', 
        details: error.issues 
      });
    }
    next(error);
  }
});

/**
 * 🟢 POST /api/recommend/cache/invalidate
 */
router.post('/cache/invalidate', async (req, res, next) => {
  try {
    const { userId } = cacheSchema.parse(req.body);
    
    const removedCount = recommendationCache.invalidate((key) => 
      key.startsWith(`${userId}:`)
    );

    return res.status(200).json({ 
      success: true, 
      invalidated: removedCount 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'userId inválido ou ausente.' });
    }
    next(error);
  }
});

export default router;