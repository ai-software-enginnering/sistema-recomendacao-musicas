export class SongsController {
  #songsView;
  #userService;
  #songsService;
  #events;
  #offset = 0;
  #limit = 21;

  static init({ songsView, userService, songsService, events }) {
    const controller = new SongsController();

    controller.#songsView = songsView;
    controller.#userService = userService;
    controller.#songsService = songsService;
    controller.#events = events;

    controller.#bindEvents();

    return controller;
  }

 // frontend/src/controller/SongsController.js

#bindEvents() {
  // ✅ CORREÇÃO: Quando um usuário é selecionado, o catálogo volta ao estado inicial
  this.#events.on('userSelected', () => {
    console.log('[SongsController] Novo usuário detectado. Reiniciando catálogo...');
    this.#offset = 0; // Zera a paginação
    this.loadAllTracks(false); // false indica que o grid deve ser limpo (não append)
  });

  if (this.#songsView?.registerLoadMoreCallback) {
    this.#songsView.registerLoadMoreCallback(() => this.loadMore());
  }

  if (this.#songsView?.registerLikeCallback) {
    this.#songsView.registerLikeCallback((track) => {
      const user = this.#userService?.getSelectedUser?.();

      if (!user) {
        alert('Selecione um usuário antes de curtir uma música.');
        return;
      }

      this.#events?.emit?.('like', { user, track });
    });
  }
}

  async loadAllTracks(append = false) {
    try {
      this.#songsView?.showLoading?.(true);

      const { tracks, hasMore } = await this.#songsService.getSongs(
        this.#limit,
        this.#offset
      );

      this.#songsView?.render?.(tracks, append);
      this.#songsView?.toggleLoadMore?.(hasMore);
      this.#songsView?.updateTrackCount?.(this.#offset + tracks.length);

      return tracks;
    } catch (error) {
      console.error('[SongsController] Erro ao carregar catálogo:', error);
      this.#songsView?.showError?.(
        'Erro ao carregar catálogo. Verifique a conexão com o servidor.'
      );
      throw error;
    } finally {
      this.#songsView?.showLoading?.(false);
    }
  }

  async loadMore() {
    this.#offset += this.#limit;
    return this.loadAllTracks(true);
  }

  async renderTracksPage(page = 0) {
    this.#offset = Math.max(0, Number(page) || 0) * this.#limit;
    return this.loadAllTracks(false);
  }
}