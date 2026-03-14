export class UserController {
  #userView;
  #userService;
  #events;

  static init({ userView, userService, events }) {
    const controller = new UserController();
    controller.#userView = userView;
    controller.#userService = userService;
    controller.#events = events;

    controller.#bindEvents();
    controller.#bindViewCallbacks();

    return controller;
  }

  #bindEvents() {
    // Escuta o evento de 'like' vindo do SongsController
    this.#events.onLike(({ user, track }) => {
      const selectedUser = this.#userService.getSelectedUser();

      // Verifica se o like pertence ao usuário atualmente selecionado
      if (selectedUser && Number(selectedUser.id) === Number(user.id)) {
        const added = this.#userService.addTrackToHistory(selectedUser.id, track);
        
        if (added) {
          this.#userView.addToHistory(track);
          this.#events.emit('historyUpdated', { user: selectedUser });
          console.log(`[UserController] Música "${track.name}" persistida no histórico.`);
        }
      }
    });
  }

  #bindViewCallbacks() {
    // Callback disparado quando o usuário muda a seleção no <select>
    this.#userView.registerUserSelectCallback((userId) => {
      const user = this.#userService.setSelectedUser(userId);

      if (!user) {
        this.#clearSelectedUserView();
        // ✅ Notifica que a seleção foi limpa para resetar o catálogo
        this.#events.emit('userSelected', { user: null });
        return;
      }

      this.#renderSelectedUser(user);
      // ✅ Notifica a troca de usuário (SongsController ouvirá isso para resetar o offset)
      this.#events.emit('userSelected', { user });
    });

    // Callback para remoção de música do histórico
    this.#userView.registerTrackRemoveCallback(({ userId, track }) => {
      if (!userId || !track) return;

      const trackId = track.track_uri || track.id || track.uri;
      if (!trackId) return;

      this.#userService.removeTrackFromHistory(userId, trackId);

      const updatedUser = this.#userService.getUserById(userId);
      this.#userView.renderHistory(updatedUser?.history || []);
      this.#events.emit('historyUpdated', { user: updatedUser, removedTrack: track });
    });
  }

  #renderSelectedUser(user) {
    this.#userView.renderUserDetails(user);
    this.#userView.renderHistory(user.history || []);
  }

  #clearSelectedUserView() {
    this.#userView.renderUserDetails({ age: '' });
    this.#userView.renderHistory([]);
  }

  async renderUsers() {
    const users = this.#userService.getUsers();

    if (!Array.isArray(users) || users.length === 0) {
      this.#clearSelectedUserView();
      return;
    }

    this.#userView.renderUserOptions(users);

    const selectedUser = this.#userService.getSelectedUser();
    if (selectedUser) {
      this.#renderSelectedUser(selectedUser);
      // ✅ Garante o reset do catálogo caso já exista um usuário pré-selecionado (ex: reload)
      this.#events.emit('userSelected', { user: selectedUser });
    }
  }
}