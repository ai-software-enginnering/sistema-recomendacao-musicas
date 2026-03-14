export class UserService {
  #users = [];
  #selectedUserId = null;
  #STORAGE_KEY = 'app_music_users';
  #SELECTED_USER_KEY = 'app_music_selected_id'; // ✅ Nova chave para persistir a seleção

  constructor() {
    this.#loadFromStorage();
  }

  #loadFromStorage() {
    const savedUsers = localStorage.getItem(this.#STORAGE_KEY);
    if (savedUsers) {
      this.#users = JSON.parse(savedUsers);
    }

    // ✅ Persiste qual usuário estava selecionado antes do refresh
    const savedId = localStorage.getItem(this.#SELECTED_USER_KEY);
    if (savedId) {
      this.#selectedUserId = Number(savedId);
    }
  }

  #saveToStorage() {
    localStorage.setItem(this.#STORAGE_KEY, JSON.stringify(this.#users));
    if (this.#selectedUserId) {
      localStorage.setItem(this.#SELECTED_USER_KEY, this.#selectedUserId.toString());
    }
  }

  async getDefaultUsers() {
    if (this.#users.length === 0) {
      this.#users = [
        { id: 1, name: 'Erick', age: 30, history: [] },
        { id: 2, name: 'Ana', age: 25, history: [] },
        { id: 3, name: 'Carlos', age: 40, history: [] }
      ];
      this.#saveToStorage();
    }

    // Se não houver seleção prévia, define o primeiro como padrão
    if (this.#selectedUserId === null && this.#users.length > 0) {
      this.setSelectedUser(this.#users[0].id);
    }

    return this.#users;
  }

  getUsers() {
    return this.#users;
  }

  getUserById(id) {
    const numericId = Number(id);
    return this.#users.find(u => u.id === numericId) || null;
  }

  setSelectedUser(userId) {
    const user = this.getUserById(userId);
    if (!user) {
      console.error(`[UserService] Usuário não encontrado: ${userId}`);
      return null;
    }
    this.#selectedUserId = user.id;
    this.#saveToStorage(); // ✅ Salva a escolha do usuário
    return user;
  }

  getSelectedUser() {
    return this.#selectedUserId !== null ? this.getUserById(this.#selectedUserId) : null;
  }

  addTrackToHistory(userId, track) {
    const user = this.getUserById(userId);
    if (!user) return false;

    if (!Array.isArray(user.history)) {
      user.history = [];
    }

    // ✅ Normalização robusta: aceita track_uri, id ou uri
    const trackId = track.track_uri || track.id || track.uri;
    
    const alreadyExists = user.history.some(t => 
      (t.track_uri || t.id || t.uri) === trackId
    );
    
    if (!alreadyExists) {
      // Adiciona metadados de segurança para o treino da IA
      const trackToSave = { 
        ...track, 
        track_uri: trackId, 
        likedAt: new Date().toISOString() 
      };

      user.history.unshift(trackToSave);
      this.#saveToStorage();
      return true;
    }
    
    return false;
  }

  removeTrackFromHistory(userId, trackUri) {
    const user = this.getUserById(userId);
    if (user && Array.isArray(user.history)) {
      user.history = user.history.filter(t => 
        (t.track_uri || t.id || t.uri) !== trackUri
      );
      this.#saveToStorage();
      return true;
    }
    return false;
  }

  // ✅ Método utilitário para debug ou reset
  clearAllData() {
    localStorage.removeItem(this.#STORAGE_KEY);
    localStorage.removeItem(this.#SELECTED_USER_KEY);
    this.#users = [];
    this.#selectedUserId = null;
  }
}