import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readCsv } from './csv.js';
import { buildVectorFromRow, buildMetadata, normalizeVector } from './vectorize.js';
import { getChromaClient, getChromaConfig } from '../chromaClient.js';
import { Logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FEATURE_NAMES = [
  'Danceability',
  'Energy',
  'Loudness',
  'Speechiness',
  'Acousticness',
  'Instrumentalness',
  'Liveness',
  'Valence',
  'Tempo',
  'Popularity'
];

function validateRow(row, lineNumber) {
  const errors = [];

  // ✅ Validação de campos obrigatórios
  const trackUri = String(row['Track URI'] || '').trim();
  const trackName = String(row['Track Name'] || '').trim();
  const artists = String(row['Artist Name(s)'] || '').trim();

  if (!trackUri) errors.push('Track URI vazio');
  if (!trackName) errors.push('Track Name vazio');
  if (!artists) errors.push('Artist Name vazio');

  // ✅ Validação de features numéricas
  for (const feature of FEATURE_NAMES) {
    const raw = String(row[feature] ?? '').trim();
    const value = Number(raw);

    if (!Number.isFinite(value)) {
      errors.push(`Feature ${feature} inválida: "${row[feature]}"`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Linha ${lineNumber}: ${errors.join('; ')}`);
  }
}

function buildDocument(meta) {
  const parts = [
    meta.track_name,
    meta.artists,
    meta.album_name
  ].filter(Boolean);

  return parts.join(' | ');
}

async function sendBatch(col, batch, stats) {
  if (!batch || batch.length === 0) return;

  try {
    await col.upsert({
      ids: batch.map(item => item.id),
      embeddings: batch.map(item => item.embedding),
      metadatas: batch.map(item => item.metadata),
      documents: batch.map(item => item.document)
    });

    stats.inserted += batch.length;
  } catch (error) {
    Logger.error('ingest', 'Erro ao enviar batch para ChromaDB', error);
    throw error;
  }
}

async function main() {
  try {
    const client = getChromaClient();
    const { collection } = getChromaConfig();

    // ✅ Resolve o caminho do CSV com fallback
    const csvPath = process.env.LIKED_SONGS_CSV_PATH
      ? path.resolve(process.env.LIKED_SONGS_CSV_PATH)
      : path.resolve(__dirname, '../../data/liked_songs.csv');

    Logger.info('ingest', 'Iniciando ingestão', { csvPath, collection });

    // ✅ Lê o CSV
    const rows = await readCsv(csvPath);

    if (!Array.isArray(rows) || rows.length === 0) {
      Logger.warn('ingest', 'CSV vazio ou inválido', { rowCount: rows?.length || 0 });
      return;
    }

    Logger.info('ingest', 'CSV carregado com sucesso', { rowCount: rows.length });

    // ✅ Cria ou obtém a coleção
    const col = await client.getOrCreateCollection({
      name: collection,
      metadata: { source: path.basename(csvPath), timestamp: new Date().toISOString() }
    });

    Logger.info('ingest', 'Collection pronta', { collection });

    const batchSize = 100;
    let batch = [];
    const seenIds = new Set();

    const stats = {
      inserted: 0,
      skipped: 0,
      duplicates: 0,
      processed: 0,
      errors: 0
    };

    // ✅ Processa cada linha do CSV
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNumber = i + 2; // +2 porque linha 1 é header

      try {
        validateRow(row, lineNumber);

        const metadata = buildMetadata(row);
        const id = metadata.track_uri?.trim();

        // ✅ Detecta duplicatas
        if (!id) {
          stats.skipped++;
          Logger.warn('ingest', 'Track URI vazio após buildMetadata', { lineNumber });
          continue;
        }

        if (seenIds.has(id)) {
          stats.duplicates++;
          Logger.warn('ingest', 'Duplicata ignorada', { lineNumber, track_uri: id });
          continue;
        }

        seenIds.add(id);

        // ✅ Constrói o embedding normalizado
        const embedding = normalizeVector(buildVectorFromRow(row));

        if (!Array.isArray(embedding) || embedding.length === 0) {
          stats.skipped++;
          Logger.warn('ingest', 'Embedding inválido', { lineNumber, id });
          continue;
        }

        batch.push({
          id,
          embedding,
          metadata,
          document: buildDocument(metadata)
        });

        stats.processed++;

        // ✅ Envia batch quando atinge o tamanho
        if (batch.length >= batchSize) {
          await sendBatch(col, batch, stats);
          batch = [];

          Logger.info('ingest', 'Batch enviado', {
            processed: stats.processed,
            inserted: stats.inserted,
            skipped: stats.skipped,
            duplicates: stats.duplicates,
            progress: `${Math.round((stats.processed / rows.length) * 100)}%`
          });
        }
      } catch (err) {
        stats.errors++;
        stats.skipped++;
        Logger.warn('ingest', 'Linha pulada', {
          lineNumber,
          reason: err?.message || String(err)
        });
      }
    }

    // ✅ Envia o último batch
    if (batch.length > 0) {
      await sendBatch(col, batch, stats);

      Logger.info('ingest', 'Último batch enviado', {
        processed: stats.processed,
        inserted: stats.inserted,
        skipped: stats.skipped,
        duplicates: stats.duplicates
      });
    }

    // ✅ Resumo final
    Logger.info('ingest', 'Ingestão concluída com sucesso', {
      totalRows: rows.length,
      processed: stats.processed,
      inserted: stats.inserted,
      skipped: stats.skipped,
      duplicates: stats.duplicates,
      errors: stats.errors,
      successRate: `${Math.round((stats.inserted / rows.length) * 100)}%`
    });
  } catch (error) {
    Logger.error('ingest', 'Erro fatal na ingestão', error);
    process.exit(1);
  }
}

main();