export class SongsService {
  #apiService;

  constructor({ apiService } = {}) {
    if (!apiService || typeof apiService.getSongs !== 'function') {
      throw new Error('SongsService: apiService válido é obrigatório');
    }

    this.#apiService = apiService;
  }

  async getSongs(limit = 50, offset = 0) {
    try {
      const data = await this.#apiService.getSongs(limit, offset);

      const rawSongs = Array.isArray(data)
        ? data
        : Array.isArray(data?.songs)
          ? data.songs
          : [];

      const tracks = rawSongs.map(item => this.#mapTrack(item));

      return {
        tracks,
        hasMore: Boolean(data?.hasMore),
        total: Number(data?.total ?? tracks.length)
      };
    } catch (error) {
      console.error('[SongsService] Falha na normalização:', error);
      throw error;
    }
  }

  #mapTrack(item = {}) {
    const metadata = item.metadata || {};

    return {
      id: item.id || metadata.track_uri || metadata.id || '',
      track_uri: metadata.track_uri || item.id || metadata.id || '',
      name: metadata.track_name || metadata.name || 'Sem título',
      artists: metadata.artists || metadata['Artist Name(s)'] || 'Artista desconhecido',
      album: metadata.album_name || metadata.album || '',
      popularity: Number(metadata.popularity || 0),
      document: item.document || null,
      metadata
    };
  }
}