import { View } from './View.js';

export class UserView extends View {
  #userSelect = document.querySelector('#userSelect');
  #userAge = document.querySelector('#userAge');
  #historyList = document.querySelector('#pastPurchasesList');

  #template;
  #onUserSelect;
  #onRemove;
  #isInitialized = false;
  #pendingHistory = null;

  constructor() {
    super();
    this.init();
  }

  async init() {
    try {
      this.#template = await this.loadTemplate('./src/view/templates/past-track.html');
      this.#isInitialized = true;
      this.attachUserSelectListener();

      if (this.#pendingHistory) {
        this.renderHistory(this.#pendingHistory);
        this.#pendingHistory = null;
      }

      console.log('[UserView] Template carregado e View pronta.');
    } catch (error) {
      console.error('[UserView] Erro ao inicializar:', error);
    }
  }

  registerUserSelectCallback(cb) {
    this.#onUserSelect = cb;
  }

  registerTrackRemoveCallback(cb) {
    this.#onRemove = cb;
  }

  renderUserOptions(users) {
    if (!this.#userSelect) return;

    const currentValue = this.#userSelect.value;
    const options = users
      .map(u => `<option value="${u.id}">${this.#escapeHtml(u.name)}</option>`)
      .join('');

    this.#userSelect.innerHTML = `<option value="">Selecione um usuário...</option>${options}`;

    if (currentValue) {
      this.#userSelect.value = currentValue;
    }
  }

  renderUserDetails(user) {
    if (this.#userAge) {
      this.#userAge.value = user?.age || '';
    }
  }

  renderHistory(history) {
    if (!this.#isInitialized) {
      this.#pendingHistory = history;
      return;
    }

    if (!this.#historyList) return;

    if (!Array.isArray(history) || history.length === 0) {
      this.#historyList.innerHTML = `
        <p id="emptyHistoryMessage" class="text-muted small mb-0">
          Nenhuma música curtida.
        </p>
      `;
      return;
    }

    const html = history
      .map(track => this.#generateTrackHtml(track))
      .join('');

    this.#historyList.innerHTML = html;
    this.attachRemoveHandlers();
  }

  addToHistory(track) {
    if (!this.#isInitialized || !this.#historyList || !track) return;

    const emptyMsg = this.#historyList.querySelector('#emptyHistoryMessage');
    if (emptyMsg) {
      emptyMsg.remove();
    }

    const trackId = track.track_uri || track.id || track.uri;
    if (!trackId) {
      console.error('[UserView] Track sem identificador válido:', track);
      return;
    }

    const existingItem = this.#historyList.querySelector(
      `.past-purchase[data-track-id="${CSS.escape(String(trackId))}"]`
    );

    if (existingItem) {
      return;
    }

    const html = this.#generateTrackHtml(track);
    this.#historyList.insertAdjacentHTML('afterbegin', html);
    this.attachRemoveHandlers();
  }

  #generateTrackHtml(track) {
    const safeTrackData = this.#encodeTrack(track);
    const trackId = this.#escapeAttribute(track.track_uri || track.id || track.uri || '');

    return this.replaceTemplate(this.#template, {
      name: this.#escapeHtml(track.name || 'Sem nome'),
      artists: this.#escapeHtml(track.artists || 'Artista desconhecido'),
      track: safeTrackData,
      trackId
    });
  }

  #encodeTrack(track) {
    try {
      return btoa(encodeURIComponent(JSON.stringify(track)));
    } catch (error) {
      console.error('[UserView] Erro ao serializar track:', error);
      return '';
    }
  }

  #decodeTrack(encodedTrack) {
    try {
      return JSON.parse(decodeURIComponent(atob(encodedTrack)));
    } catch (error) {
      console.error('[UserView] Erro ao desserializar track:', error);
      return null;
    }
  }

  attachUserSelectListener() {
    this.#userSelect?.addEventListener('change', event => {
      const userId = event.target.value ? Number(event.target.value) : null;

      if (userId) {
        this.#onUserSelect?.(userId);
      } else {
        this.renderUserDetails({ age: '' });
        this.renderHistory([]);
      }
    });
  }

  attachRemoveHandlers() {
    if (!this.#historyList) return;

    const items = this.#historyList.querySelectorAll('.past-purchase');

    items.forEach(el => {
      const removeBtn = el.querySelector('button');

      if (removeBtn && !removeBtn.dataset.bound) {
        removeBtn.dataset.bound = 'true';

        removeBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          try {
            const rawData = el.dataset.track;
            const track = this.#decodeTrack(rawData);
            const userId = this.getSelectedUserId();

            if (!track || !userId) return;

            this.#onRemove?.({ userId, track });

            el.style.transition = 'all 0.4s ease';
            el.style.opacity = '0';
            el.style.transform = 'translateX(-20px)';

            setTimeout(() => {
              el.remove();

              if (this.#historyList.querySelectorAll('.past-purchase').length === 0) {
                this.renderHistory([]);
              }
            }, 400);
          } catch (error) {
            console.error('[UserView] Erro ao processar remoção:', error);
          }
        };
      }
    });
  }

  #escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  #escapeAttribute(text) {
    return this.#escapeHtml(text).replace(/"/g, '&quot;');
  }

  getSelectedUserId() {
    return this.#userSelect?.value ? Number(this.#userSelect.value) : null;
  }
}