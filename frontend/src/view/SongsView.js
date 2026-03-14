import { View } from './View.js';

export class SongsView extends View {
  #container = document.getElementById('songsGrid');
  #loader = document.getElementById('loader');
  #countElement = document.getElementById('trackCount');
  #loadMoreBtn = document.getElementById('loadMoreBtn');

  #onLikeCallback = null;
  #onLoadMoreCallback = null;
  #tracksMap = new Map();
  #tooltips = [];

  constructor() {
    super();
    this.init();
  }

  init() {
    if (!this.#container) return;

    this.#container.addEventListener('click', (event) => {
      const btn = event.target.closest('.btn-like');
      if (btn && this.#onLikeCallback) {
        const trackUri = btn.dataset.uri;
        const track = this.#tracksMap.get(trackUri);
        if (track) this.#onLikeCallback(track);
      }
    });

    this.#loadMoreBtn?.addEventListener('click', () => {
      this.#onLoadMoreCallback?.();
    });
  }

  render(tracks, append = false) {
    if (!this.#container) return;

    this.#destroyTooltips();

    if (!append) {
      this.#container.innerHTML = '';
      this.#tracksMap.clear();
    }

    if (!tracks || tracks.length === 0) {
      if (!append) {
        this.#container.innerHTML = `<div class="col-12 text-center text-muted p-5">Nenhuma música encontrada.</div>`;
      }
      return;
    }

    const html = tracks.map(track => {
      const trackId = track.track_uri || track.id;
      this.#tracksMap.set(trackId, track);

      const scoreBadge = track.relevanceScore
        ? `<span class="badge bg-success mb-2 song-match-badge">Match: ${Math.round(track.relevanceScore * 100)}%</span>`
        : '';

      const popValue = Number(track.popularity || 0);
      const popDesc = this.#getPopDesc(popValue);

      return `
        <div class="col-md-6 col-lg-4 song-item">
          <div class="card h-100 shadow-sm song-card border-0">
            <div class="card-body d-flex flex-column">
              ${scoreBadge}
              <div class="song-info">
                <strong class="song-title" title="${this.#escapeHtml(track.name)}">${this.#escapeHtml(track.name)}</strong>
                <span class="song-artist">${this.#escapeHtml(track.artists)}</span>
              </div>
              <div class="song-footer">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="badge bg-light text-dark border popularity-badge" 
                        data-bs-toggle="tooltip" 
                        data-bs-placement="top"
                        title="${popDesc}">
                    Pop: ${popValue}
                  </span>
                  <small class="text-muted text-truncate ms-2" style="max-width: 100px;">
                    ${this.#escapeHtml(track.album || '')}
                  </small>
                </div>
                <button class="btn btn-outline-primary btn-sm w-100 btn-like" data-uri="${this.#escapeHtml(trackId)}">
                  ❤️ Curtir
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (append) {
      this.#container.insertAdjacentHTML('beforeend', html);
    } else {
      this.#container.innerHTML = html;
    }

    this.#initTooltips();
  }

  #getPopDesc(pop) {
    if (pop >= 71) return `Popularidade ${pop}/100: Hit atual no Spotify.`;
    if (pop >= 31) return `Popularidade ${pop}/100: Música bem conhecida.`;
    return `Popularidade ${pop}/100: Música de nicho ou independente.`;
  }

  #initTooltips() {
    // ✅ Verificação segura para evitar erro "bootstrap is not defined"
    if (typeof bootstrap === 'undefined' || !bootstrap.Tooltip) {
      console.warn('[SongsView] Bootstrap Tooltip não disponível');
      return;
    }

    const elements = this.#container.querySelectorAll('[data-bs-toggle="tooltip"]');
    this.#tooltips = Array.from(elements).map(el => {
      try {
        return new bootstrap.Tooltip(el);
      } catch (err) {
        console.error('[SongsView] Erro ao inicializar tooltip:', err);
        return null;
      }
    }).filter(t => t !== null);
  }

  #destroyTooltips() {
    this.#tooltips.forEach(t => {
      try {
        t.dispose();
      } catch (err) {
        console.error('[SongsView] Erro ao descartar tooltip:', err);
      }
    });
    this.#tooltips = [];
  }

  #escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
  }

  showLoading(show) {
    if (this.#loader) this.#loader.style.display = show ? 'block' : 'none';
  }

  updateTrackCount(total) {
    if (this.#countElement) this.#countElement.textContent = `${total} músicas encontradas`;
  }

  toggleLoadMore(show) {
    if (this.#loadMoreBtn) this.#loadMoreBtn.style.display = show ? 'inline-block' : 'none';
  }

  registerLikeCallback(cb) {
    this.#onLikeCallback = cb;
  }

  registerLoadMoreCallback(cb) {
    this.#onLoadMoreCallback = cb;
  }
}