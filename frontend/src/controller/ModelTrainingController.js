class RecommendationCache {
  #cache = new Map();
  #maxSize = 50;

  getKey(userId, topK) {
    return `${userId}:${topK}`;
  }

  get(userId, topK) {
    return this.#cache.get(this.getKey(userId, topK));
  }

  set(userId, topK, recommendations) {
    const key = this.getKey(userId, topK);

    if (this.#cache.has(key)) {
      this.#cache.delete(key);
    }

    if (this.#cache.size >= this.#maxSize) {
      const firstKey = this.#cache.keys().next().value;
      this.#cache.delete(firstKey);
    }

    this.#cache.set(key, recommendations);
  }

  invalidate(userId) {
    for (const key of this.#cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.#cache.delete(key);
      }
    }
  }

  clear() {
    this.#cache.clear();
  }
}

export class ModelTrainingController {
  #modelView;
  #userService;
  #apiService;
  #workerApi;
  #songsController;
  #events;
  #cache = new RecommendationCache();

  #isTraining = false;
  #isRecommending = false;
  #recommendationRequestId = 0;

  static init({ modelView, userService, apiService, workerApi, songsController, events }) {
    const controller = new ModelTrainingController();
    controller.#modelView = modelView;
    controller.#userService = userService;
    controller.#apiService = apiService;
    controller.#workerApi = workerApi;
    controller.#songsController = songsController;
    controller.#events = events;

    controller.#modelView.registerTrainModelCallback(() => {
      controller.#trainModel();
    });

    controller.#modelView.registerRunRecommendationCallback(() => {
      controller.#runRecommendation();
    });

      const toggleBtn = document.getElementById('toggleTfVisorBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (window.tfvis) {
          tfvis.visor().toggle();
        } else {
          console.warn('[ModelTrainingController] TFVisor não carregado.');
        }
      });
    }

    controller.#events.on('progressUpdate', ({ progress }) => {
      controller.#modelView.updateProgress(progress);
    });

    controller.#events.on('trainingComplete', () => {
      controller.#isTraining = false;
      controller.#modelView.setLoadingState(false, 'train');
      controller.#modelView.updateProgress(100);
      controller.#cache.clear();
      console.log('[ModelTrainingController] Treinamento finalizado e cache limpo.');
    });

    controller.#events.on('trainingError', ({ message } = {}) => {
      controller.#isTraining = false;
      controller.#modelView.setLoadingState(false, 'train');
      controller.#modelView.updateProgress(0);
      console.error('[ModelTrainingController] Erro no treinamento:', message);
      alert(`Erro ao treinar modelo: ${message || 'erro desconhecido'}`);
    });

    controller.#events.on('recommend', () => {
      controller.#isRecommending = false;
      controller.#modelView.setLoadingState(false, 'recommend');
    });

    controller.#events.on('recommendError', ({ message } = {}) => {
      controller.#isRecommending = false;
      controller.#modelView.setLoadingState(false, 'recommend');
      alert(`Erro ao gerar recomendações: ${message || 'erro desconhecido'}`);
    });

    controller.#events.onLike(({ user }) => {
      if (!user?.id) return;

      console.log(`[ModelTrainingController] Invalidando cache para usuário ${user.id} devido a novo Like.`);
      controller.#cache.invalidate(user.id);
      controller.#apiService.invalidateCache(user.id).catch(err => {
        console.error('[ModelTrainingController] Erro ao invalidar cache no backend:', err);
      });
    });

    return controller;
  }

  async #trainModel() {
    if (this.#isTraining) return;

    const selectedUser = this.#userService.getSelectedUser();
    const allUsers = this.#userService.getUsers();

    if (!selectedUser) {
      alert('Selecione um usuário para treinar o modelo.');
      return;
    }

    if (!selectedUser.history?.length) {
      alert('O usuário selecionado não possui histórico de curtidas para treinar.');
      return;
    }

    this.#isTraining = true;
    this.#modelView.setLoadingState(true, 'train');
    this.#modelView.updateProgress(0);

    try {
      this.#workerApi.trainModel({
        users: allUsers,
        user: selectedUser
      });
    } catch (err) {
      this.#isTraining = false;
      this.#modelView.setLoadingState(false, 'train');
      alert(`Erro ao iniciar treinamento: ${err.message}`);
    }
  }

  async #runRecommendation() {
    if (this.#isRecommending) return;

    const selectedUser = this.#userService.getSelectedUser();
    if (!selectedUser) {
      alert('Por favor, selecione um usuário primeiro.');
      return;
    }

    this.#isRecommending = true;
    this.#modelView.setLoadingState(true, 'recommend');

    const currentRequestId = ++this.#recommendationRequestId;
    const topK = 50;

    try {
      const cached = this.#cache.get(selectedUser.id, topK);

      if (cached) {
        this.#workerApi.rerank({
          user: selectedUser,
          candidates: cached,
          requestId: currentRequestId
        });
        return;
      }

      const response = await this.#apiService.recommend(selectedUser, topK);

      if (currentRequestId !== this.#recommendationRequestId) return;

      const candidates = response?.candidates ?? [];
      this.#cache.set(selectedUser.id, topK, candidates);

      this.#workerApi.rerank({
        user: selectedUser,
        candidates,
        requestId: currentRequestId
      });
    } catch (err) {
      if (currentRequestId !== this.#recommendationRequestId) return;

      this.#isRecommending = false;
      this.#modelView.setLoadingState(false, 'recommend');
      alert(`Erro ao gerar recomendações: ${err.message}`);
    }
  }
}