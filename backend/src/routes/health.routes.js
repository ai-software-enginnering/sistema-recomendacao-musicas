import { Router } from 'express';
import { validateChromaConnection } from '../chromaClient.js';

const router = Router();

/**
 * GET /health
 * Verifica a integridade da API e das conexões externas
 */
router.get('/', async (req, res) => {
  const healthInfo = {
    status: 'ok',
    service: 'songs-recommendation-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      chroma: { ok: false, message: 'Verificando...' }
    }
  };

  try {
    // ✅ Valida a conexão real com o ChromaDB
    const chromaStatus = await validateChromaConnection();
    
    healthInfo.dependencies.chroma = {
      ok: chromaStatus.ok,
      message: chromaStatus.message
    };

    // Se o Chroma estiver fora, retornamos 503 (Service Unavailable) 
    // ou 200 com o status detalhado, dependendo da sua estratégia de monitoramento.
    const httpStatus = chromaStatus.ok ? 200 : 503;

    return res.status(httpStatus).json(healthInfo);
  } catch (error) {
    healthInfo.status = 'error';
    healthInfo.dependencies.chroma = {
      ok: false,
      message: error?.message || 'Erro inesperado na verificação'
    };

    return res.status(500).json(healthInfo);
  }
});

export default router;