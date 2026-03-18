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
    this.#events.onLike(({ user, track }) => {
      const selectedUser = this.#userService.getSelectedUser();

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
    this.#userView.registerUserSelectCallback((userId) => {
      const user = this.#userService.setSelectedUser(userId);

      if (!user) {
        this.#clearSelectedUserView();
        this.#events.emit('userSelected', { user: null });
        return;
      }

      this.#renderSelectedUser(user);
      this.#events.emit('userSelected', { user });
    });

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
    this.#userView.renderUserDetails();
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
      this.#events.emit('userSelected', { user: selectedUser });
    }
  }
}