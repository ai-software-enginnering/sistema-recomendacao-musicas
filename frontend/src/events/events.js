class Events {
  #listeners = {};

  on(event, callback) {
    if (!this.#listeners[event]) {
      this.#listeners[event] = [];
    }
    this.#listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.#listeners[event]) {
      this.#listeners[event].forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[Events] Erro no listener do evento "${event}"`, err);
        }
      });
    }
  }

  off(event, callback) {
    if (this.#listeners[event]) {
      this.#listeners[event] = this.#listeners[event].filter(cb => cb !== callback);
    }
  }

  onUserSelected(cb) { this.on('userSelected', cb); }
  onLike(cb) { this.on('like', cb); }
  onTrainingLog(cb) { this.on('trainingLog', cb); }
  onTrainingComplete(cb) { this.on('trainingComplete', cb); }
  onProgressUpdate(cb) { this.on('progressUpdate', cb); }
  onRecommend(cb) { this.on('recommend', cb); }
}

export default new Events();