const toNum = (v) => {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
};

const normTempo = (tempo) => {
  const min = 50;
  const max = 200;
  return Math.max(0, Math.min(1, (tempo - min) / (max - min)));
};

const normPop = (p) => Math.max(0, Math.min(1, p / 100));

const normLoud = (l) => {
  const min = -60;
  const max = 0;
  return Math.max(0, Math.min(1, (l - min) / (max - min)));
};

export function buildVectorFromRow(row) {
  return [
    toNum(row['Danceability']),
    toNum(row['Energy']),
    normLoud(toNum(row['Loudness'])),
    toNum(row['Speechiness']),
    toNum(row['Acousticness']),
    toNum(row['Instrumentalness']),
    toNum(row['Liveness']),
    toNum(row['Valence']),
    normTempo(toNum(row['Tempo'])),
    normPop(toNum(row['Popularity']))
  ];
}

export function buildMetadata(row) {
  const loudness = toNum(row['Loudness']);
  const tempo = toNum(row['Tempo']);
  const popularity = toNum(row['Popularity']);

  return {
    track_uri: row['Track URI'] || '',
    track_name: row['Track Name'] || '',
    album_name: row['Album Name'] || '',
    artists: row['Artist Name(s)'] || '',
    release_date: row['Release Date'] || '',
    explicit: String(row['Explicit']).toLowerCase() === 'true',
    genres: row['Genres'] || '',
    record_label: row['Record Label'] || '',
    added_at: row['Added At'] || '',
    duration_ms: Number(row['Duration (ms)']) || 0,
    popularity,

    // Necessário para o frontend e para debug
    danceability: toNum(row['Danceability']),
    energy: toNum(row['Energy']),
    loudness,
    speechiness: toNum(row['Speechiness']),
    acousticness: toNum(row['Acousticness']),
    instrumentalness: toNum(row['Instrumentalness']),
    liveness: toNum(row['Liveness']),
    valence: toNum(row['Valence']),
    tempo,

    // Opcional, mas útil para consistência/debug
    normalized_loudness: normLoud(loudness),
    normalized_tempo: normTempo(tempo),
    normalized_popularity: normPop(popularity)
  };
}

export function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((acc, x) => acc + x * x, 0));
  return magnitude > 0 ? vector.map(x => x / magnitude) : vector;
}