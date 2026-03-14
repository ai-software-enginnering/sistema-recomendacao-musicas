importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');

let model = null;

const FEATURE_SIZE = 10;
const EPOCHS = 20;

function clamp(value, min = 0, max = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeLoudness(value) {
  const loudness = Number(value);
  if (!Number.isFinite(loudness)) return 0.5;
  return clamp((loudness + 60) / 60);
}

function normalizeTempo(value) {
  const tempo = Number(value);
  if (!Number.isFinite(tempo)) return 0.5;
  return clamp((tempo - 50) / 150);
}

function normalizePopularity(value) {
  const popularity = Number(value);
  if (!Number.isFinite(popularity)) return 0.5;
  return clamp(popularity / 100);
}

function prepareFeatures(metadata = {}) {
  return [
    clamp(metadata.danceability ?? 0.5),
    clamp(metadata.energy ?? 0.5),
    metadata.normalized_loudness != null
      ? clamp(metadata.normalized_loudness)
      : normalizeLoudness(metadata.loudness),
    clamp(metadata.speechiness ?? 0.1),
    clamp(metadata.acousticness ?? 0.1),
    clamp(metadata.instrumentalness ?? 0.1),
    clamp(metadata.liveness ?? 0.1),
    clamp(metadata.valence ?? 0.5),
    metadata.normalized_tempo != null
      ? clamp(metadata.normalized_tempo)
      : normalizeTempo(metadata.tempo),
    metadata.normalized_popularity != null
      ? clamp(metadata.normalized_popularity)
      : normalizePopularity(metadata.popularity)
  ];
}

function getSelectedUser(users = [], user = null) {
  if (user?.id != null) {
    const found = users.find(u => Number(u.id) === Number(user.id));
    return found || user;
  }

  return users.find(u => Array.isArray(u.history) && u.history.length > 0) || null;
}

function buildNegativeSamples(positiveInputs) {
  return positiveInputs.map((base) =>
    base.map((value) => {
      const inverted = 1 - value;
      const noise = (Math.random() - 0.5) * 0.30;
      return clamp(inverted + noise);
    })
  );
}

async function trainModel(users = [], user = null) {
  const selectedUser = getSelectedUser(users, user);

  if (!selectedUser) {
    self.postMessage({
      type: 'TRAINING_ERROR',
      message: 'Nenhum usuário válido encontrado para treinamento.'
    });
    return;
  }

  if (!Array.isArray(selectedUser.history) || selectedUser.history.length === 0) {
    self.postMessage({
      type: 'TRAINING_ERROR',
      message: 'Histórico vazio.'
    });
    return;
  }

  const positiveInputs = selectedUser.history.map(track =>
    prepareFeatures(track.features || track.metadata || track)
  );
  const positiveLabels = positiveInputs.map(() => [1]);

  const negativeInputs = buildNegativeSamples(positiveInputs);
  const negativeLabels = negativeInputs.map(() => [0]);

  const datasetInputs = [...positiveInputs, ...negativeInputs];
  const datasetLabels = [...positiveLabels, ...negativeLabels];

  let inputTensor = null;
  let labelTensor = null;

  try {
    if (model) {
      model.dispose();
      model = null;
    }

    inputTensor = tf.tensor2d(datasetInputs, [datasetInputs.length, FEATURE_SIZE]);
    labelTensor = tf.tensor2d(datasetLabels, [datasetLabels.length, 1]);

    model = tf.sequential();
    model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [FEATURE_SIZE] }));
    model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    await model.fit(inputTensor, labelTensor, {
      epochs: EPOCHS,
      shuffle: true,
      batchSize: Math.min(8, datasetInputs.length),
      callbacks: {
        onEpochEnd: (epoch, logs = {}) => {
          self.postMessage({
            type: 'TRAINING_LOG',
            epoch: epoch + 1,
            loss: Number(logs.loss ?? 0),
            accuracy: Number(logs.acc ?? logs.accuracy ?? 0)
          });

          self.postMessage({
            type: 'PROGRESS_UPDATE',
            progress: Math.round(((epoch + 1) / EPOCHS) * 100)
          });
        }
      }
    });

    self.postMessage({
      type: 'TRAINING_COMPLETE',
      userId: selectedUser.id
    });
  } catch (err) {
    self.postMessage({
      type: 'TRAINING_ERROR',
      message: err?.message || 'Erro inesperado durante o treinamento.'
    });
  } finally {
    inputTensor?.dispose();
    labelTensor?.dispose();
  }
}

function rerankCandidates(candidates = [], requestId) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    self.postMessage({
      type: 'RECOMMEND',
      recommendations: [],
      requestId
    });
    return;
  }

  if (!model) {
    self.postMessage({
      type: 'RECOMMEND',
      recommendations: candidates,
      requestId
    });
    return;
  }

  try {
    const ranked = tf.tidy(() => {
      const featArray = candidates.map(candidate =>
        prepareFeatures(candidate.metadata || candidate.features || candidate)
      );

      const inputTensor = tf.tensor2d(featArray, [featArray.length, FEATURE_SIZE]);
      const prediction = model.predict(inputTensor);
      const predictionTensor = Array.isArray(prediction) ? prediction[0] : prediction;
      const scores = Array.from(predictionTensor.dataSync());

      return candidates
        .map((candidate, index) => ({
          ...candidate,
          relevanceScore: Number(scores[index] ?? 0)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
    });

    self.postMessage({
      type: 'RECOMMEND',
      recommendations: ranked,
      requestId
    });
  } catch (err) {
    self.postMessage({
      type: 'RECOMMEND_ERROR',
      message: err?.message || 'Erro ao reranquear recomendações.',
      requestId
    });
  }
}

self.onmessage = async (e) => {
  const { type, users, user, candidates, requestId } = e.data || {};

  if (type === 'TRAIN_MODEL') {
    await trainModel(users, user);
    return;
  }

  if (type === 'RECOMMEND') {
    rerankCandidates(candidates, requestId);
  }
};