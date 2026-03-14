import { View } from './View.js';

export class ModelView extends View {
  #trainBtn = document.querySelector('#trainModelBtn');
  #recommendBtn = document.querySelector('#runRecommendBtn');
  #progressBar = document.querySelector('#trainingProgress');
  #progressText = document.querySelector('#progressText');

  #onTrain;
  #onRecommend;

  constructor() {
    super();
    this.init();
  }

  init() {
    if (this.#trainBtn) {
      this.#trainBtn.addEventListener('click', () => this.#onTrain?.());
    }

    if (this.#recommendBtn) {
      this.#recommendBtn.addEventListener('click', () => this.#onRecommend?.());
    }
  }

  registerTrainModelCallback(cb) {
    this.#onTrain = cb;
  }

  registerRunRecommendationCallback(cb) {
    this.#onRecommend = cb;
  }

  updateProgress(percent) {
    if (!this.#progressBar || !this.#progressText) return;

    const p = Math.max(0, Math.min(100, Math.round(percent)));
    this.#progressBar.style.width = `${p}%`;
    this.#progressBar.setAttribute('aria-valuenow', p);
    this.#progressText.textContent = `Progresso: ${p}%`;
  }

  setLoadingState(isLoading, btnType = 'train') {
    const btn = btnType === 'train' ? this.#trainBtn : this.#recommendBtn;
    if (!btn) return;

    if (isLoading) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Processando...
      `;
    } else {
      btn.disabled = false;
      btn.setAttribute('aria-busy', 'false');
      btn.textContent = btnType === 'train' ? 'Treinar Modelo' : 'Gerar Recomendações';
    }
  }
}