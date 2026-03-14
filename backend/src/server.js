import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';

import healthRoutes from './routes/health.routes.js';
import recommendRoutes from './routes/recommend.routes.js';
import { validateChromaConnection } from './chromaClient.js';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

function parseEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[server] Erro ao validar variáveis de ambiente:');
      for (const issue of error.issues) {
        console.error(`- ${issue.path.join('.')}: ${issue.message}`);
      }
    } else {
      console.error('[server] Erro inesperado ao carregar ambiente:', error);
    }

    process.exit(1);
  }
}

const env = parseEnv();

function parseCorsOrigins(value) {
  return String(value)
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = [
  ...new Set([
    ...parseCorsOrigins(env.CORS_ORIGIN),
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ])
];

const corsOptions = {
  origin(origin, callback) {
    if (env.NODE_ENV === 'production') {
      return callback(null, true);
    }

    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS bloqueado para origem: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/', async (req, res) => {
    let chroma = { ok: false, message: 'Não verificado' };

    try {
      chroma = await validateChromaConnection();
    } catch {
      chroma = { ok: false, message: 'Falha ao verificar ChromaDB' };
    }

    return res.status(200).json({
      status: 'ok',
      service: 'songs-recommendation-backend',
      environment: env.NODE_ENV,
      chroma
    });
  });

  app.use('/health', healthRoutes);
  app.use('/api/recommend', recommendRoutes);

  app.use((req, res) => {
    return res.status(404).json({
      error: 'Not found',
      path: req.originalUrl,
      method: req.method
    });
  });

  app.use((err, req, res, next) => {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: err.issues
      });
    }

    if (err?.message?.startsWith('CORS bloqueado')) {
      return res.status(403).json({
        error: err.message
      });
    }

    console.error('[Server Error]', err);

    return res.status(500).json({
      error: 'Internal Server Error',
      message: env.NODE_ENV !== 'production' ? err?.message : undefined
    });
  });

  return app;
}

async function bootstrap() {
  const app = createApp();

  app.listen(env.PORT, async () => {
    let chromaStatus = { ok: false, message: 'Não verificado' };

    try {
      chromaStatus = await validateChromaConnection();
    } catch (error) {
      chromaStatus = {
        ok: false,
        message: error?.message || 'Falha ao validar ChromaDB'
      };
    }

    console.log(`[backend] mode=${env.NODE_ENV}`);
    console.log(`[backend] port=${env.PORT}`);
    console.log(
      `[backend] cors=${
        env.NODE_ENV === 'production'
          ? 'dynamic'
          : allowedOrigins.join(', ')
      }`
    );
    console.log('[backend] routes:');
    console.log('- GET /');
    console.log('- GET /health');
    console.log('- GET /api/recommend/songs');
    console.log('- POST /api/recommend');
    console.log('- POST /api/recommend/cache/invalidate');
    console.log(
      `[backend] chroma=${chromaStatus.ok ? 'ok' : 'fail'} - ${chromaStatus.message}`
    );
  });
}

bootstrap();