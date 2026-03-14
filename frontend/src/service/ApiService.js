export class ApiService {
  #baseUrl;

  constructor({ baseUrl = '' } = {}) {
    // ✅ Remove barras duplicadas e garante consistência na URL base
    this.#baseUrl = String(baseUrl).trim().replace(/\/+$/, '');
  }

  /**
   * Trata a resposta do servidor e extrai mensagens de erro detalhadas
   */
  async #handleResponse(response) {
    if (response.ok) {
      return response.json();
    }

    let errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorBody = await response.json();
      // ✅ Captura 'error' ou 'message' dependendo do padrão do backend
      errorMessage = errorBody.error || errorBody.message || errorMessage;
    } catch {
      // Falha ao parsear JSON, mantém a mensagem padrão do status HTTP
    }

    throw new Error(errorMessage);
  }

  /**
   * Wrapper para fetch com timeout e headers padronizados
   */
  async #fetchWithTimeout(endpoint, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // ✅ Garante que o endpoint comece com /
    const url = `${this.#baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });

      return await this.#handleResponse(response);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Timeout: A requisição para ${endpoint} excedeu ${timeout}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Busca o catálogo de músicas paginado
   */
  async getSongs(limit = 50, offset = 0) {
    return this.#fetchWithTimeout(`/api/recommend/songs?limit=${limit}&offset=${offset}`, {
      method: 'GET'
    });
  }

  /**
   * Gera recomendações baseadas no perfil do usuário via ChromaDB
   */
  async recommend(user, topK = 50) {
    return this.#fetchWithTimeout('/api/recommend', {
      method: 'POST',
      body: JSON.stringify({ user, topK })
    });
  }

  /**
   * Envia dados para persistência ou treinamento no backend (se aplicável)
   */
  async trainModel(userId, likedTracks) {
    return this.#fetchWithTimeout('/api/recommend/train', {
      method: 'POST',
      body: JSON.stringify({ userId, likedTracks })
    }, 30000); // Timeout estendido para operações pesadas
  }

  /**
   * Verifica a saúde da API e conexão com ChromaDB
   */
  async health() {
    return this.#fetchWithTimeout('/health', {
      method: 'GET'
    }, 5000);
  }

  /**
   * Invalida o cache de recomendações do usuário no servidor
   */
  async invalidateCache(userId) {
    return this.#fetchWithTimeout('/api/recommend/cache/invalidate', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }
}