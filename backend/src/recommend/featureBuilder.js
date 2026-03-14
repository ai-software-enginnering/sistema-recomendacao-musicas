/**
 * Normaliza um vetor para magnitude 1 (L2 norm)
 * @param {Array<number>} vector - Vetor a normalizar
 * @returns {Array<number>} Vetor normalizado
 */
function normalizeVector(vector) {
  if (!Array.isArray(vector) || vector.length === 0) return vector;

  const magnitude = Math.sqrt(vector.reduce((acc, x) => acc + x * x, 0));
  return magnitude > 0 ? vector.map(x => x / magnitude) : vector;
}

/**
 * Normaliza loudness de -60..0 dB para 0..1
 * @param {number} loudness - Valor em dB
 * @returns {number} Valor normalizado [0, 1]
 */
function normalizeLoudness(loudness) {
  const min = -60;
  const max = 0;
  const value = Number(loudness) || 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Normaliza tempo de 50..200 BPM para 0..1
 * @param {number} tempo - Valor em BPM
 * @returns {number} Valor normalizado [0, 1]
 */
function normalizeTempo(tempo) {
  const min = 50;
  const max = 200;
  const value = Number(tempo) || 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Normaliza popularidade de 0..100 para 0..1
 * @param {number} popularity - Valor de 0 a 100
 * @returns {number} Valor normalizado [0, 1]
 */
function normalizePopularity(popularity) {
  const value = Number(popularity) || 0;
  return Math.max(0, Math.min(1, value / 100));
}

/**
 * Extrai e normaliza features de uma música
 * @param {Object} features - Objeto com features da música
 * @returns {Array<number>} Vetor de 10 dimensões normalizado
 */
function buildFeatureVector(features = {}) {
  return [
    Math.max(0, Math.min(1, Number(features.danceability) || 0.5)),
    Math.max(0, Math.min(1, Number(features.energy) || 0.5)),
    normalizeLoudness(features.loudness),
    Math.max(0, Math.min(1, Number(features.speechiness) || 0.1)),
    Math.max(0, Math.min(1, Number(features.acousticness) || 0.1)),
    Math.max(0, Math.min(1, Number(features.instrumentalness) || 0.1)),
    Math.max(0, Math.min(1, Number(features.liveness) || 0.1)),
    Math.max(0, Math.min(1, Number(features.valence) || 0.5)),
    normalizeTempo(features.tempo),
    normalizePopularity(features.popularity)
  ];
}

/**
 * Extrai features de um usuário baseado no histórico
 * @param {Object} user - Usuário com histórico de curtidas
 * @returns {Array<number>} Vetor de features normalizado (magnitude = 1)
 * @throws {Error} Se user não for um objeto válido
 */
export function extractUserFeatures(user) {
  if (!user || typeof user !== 'object') {
    throw new Error('extractUserFeatures: user deve ser um objeto válido');
  }

  if (!user.history || !Array.isArray(user.history) || user.history.length === 0) {
    // ✅ Retorna vetor neutro (não zero) para evitar problemas de similaridade
    return new Array(10).fill(0.5);
  }

  const dim = 10;
  const sum = new Array(dim).fill(0);

  // ✅ Acumula features de todas as músicas do histórico
  for (const track of user.history) {
    const features = track.features || track.metadata || {};
    const vector = buildFeatureVector(features);

    for (let i = 0; i < dim; i++) {
      sum[i] += vector[i];
    }
  }

  // ✅ Calcula a média e normaliza
  const avg = sum.map(x => x / user.history.length);
  return normalizeVector(avg);
}

/**
 * Extrai features de uma música
 * @param {Object} track - Track com metadata
 * @returns {Array<number>} Vetor de 10 dimensões normalizado
 */
export function extractTrackFeatures(track) {
  if (!track || typeof track !== 'object') {
    throw new Error('extractTrackFeatures: track deve ser um objeto válido');
  }

  const meta = track.metadata || track.features || {};
  return buildFeatureVector(meta);
}

/**
 * Calcula similaridade coseno entre dois vetores
 * @param {Array<number>} a - Vetor A
 * @param {Array<number>} b - Vetor B
 * @param {boolean} isNormalized - Se vetores já estão normalizados (magnitude = 1)
 * @returns {number} Similaridade (0..1 se normalizados, -1..1 caso contrário)
 */
export function cosineSimilarity(a, b, isNormalized = false) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    throw new Error('cosineSimilarity: a e b devem ser arrays');
  }

  if (a.length !== b.length) {
    throw new Error(`cosineSimilarity: vetores com dimensões diferentes (${a.length} vs ${b.length})`);
  }

  if (a.length === 0) return 0;

  // ✅ Otimização: se vetores já estão normalizados, similaridade = dot product
  if (isNormalized) {
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }
    return Math.max(-1, Math.min(1, dotProduct));
  }

  // Caso geral: vetores não normalizados
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

/**
 * Calcula distância euclidiana entre dois vetores
 * @param {Array<number>} a - Vetor A
 * @param {Array<number>} b - Vetor B
 * @returns {number} Distância (sempre >= 0)
 */
export function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    throw new Error('euclideanDistance: a e b devem ser arrays');
  }

  if (a.length !== b.length) {
    throw new Error(`euclideanDistance: vetores com dimensões diferentes (${a.length} vs ${b.length})`);
  }

  if (a.length === 0) return 0;

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Calcula similaridade entre um usuário e uma música
 * @param {Object} user - Usuário com histórico
 * @param {Object} track - Track com metadata
 * @returns {number} Similaridade (0..1)
 */
export function userTrackSimilarity(user, track) {
  const userVector = extractUserFeatures(user);
  const trackVector = extractTrackFeatures(track);
  return cosineSimilarity(userVector, trackVector, true); // Ambos normalizados
}