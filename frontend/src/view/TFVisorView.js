export class TFVisorView {
  #history = [];
  #isGuideRendered = false;

  handleTrainingLog(log) {
    if (!window.tfvis) {
      console.warn('[TFVisorView] tfjs-vis não carregado no objeto window.');
      return;
    }

    if (this.#history.length === 0) {
      tfvis.visor().open();
      this.#renderMetricsGuide();
    }

    this.#history.push(log);

    const container = { name: 'Performance do Modelo', tab: 'Treinamento' };
    tfvis.show.history(container, this.#history, ['loss', 'accuracy']);
  }

  #renderMetricsGuide() {
    if (this.#isGuideRendered) return;

    const surface = tfvis.visor().surface({
      name: 'Entenda os Gráficos',
      tab: 'Treinamento'
    });

    const container = surface.drawArea;

    container.innerHTML = `
      <div style="padding: 12px; font-family: sans-serif; line-height: 1.4; background: #fcfcfc; border: 1px solid #eee; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #333;">Objetivo: reduzir erro e aumentar acurácia</h4>

        <div style="margin-bottom: 10px; border-left: 4px solid #4285f4; padding-left: 10px;">
          <strong style="color: #4285f4; font-size: 12px;">LOSS</strong>
          <p style="font-size: 11px; color: #666; margin: 2px 0;">
            Representa o erro global do modelo. Quanto menor, melhor o aprendizado.
          </p>
        </div>

        <div style="border-left: 4px solid #f4b400; padding-left: 10px;">
          <strong style="color: #f4b400; font-size: 12px;">ACCURACY</strong>
          <p style="font-size: 11px; color: #666; margin: 2px 0;">
            Indica a proporção de acertos do modelo durante o treinamento.
          </p>
        </div>
      </div>
      <hr style="margin: 15px 0; border: 0; border-top: 1px solid #eee;" />
    `;

    this.#isGuideRendered = true;
  }

  reset() {
    this.#history = [];
    this.#isGuideRendered = false;
  }

  showVisor() {
    if (window.tfvis) tfvis.visor().open();
  }

  closeVisor() {
    if (window.tfvis) tfvis.visor().close();
  }

  toggleVisor() {
    if (window.tfvis) tfvis.visor().toggle();
  }
}