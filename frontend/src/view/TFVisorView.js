export class TFVisorView {
  #history = [];
  #surface = { name: 'Métricas de Treinamento', tab: 'Treinamento' };
  #isGuideRendered = false;

  /**
   * Renderiza os logs recebidos do Worker
   * @param {Object} log - Objeto contendo { loss, mse, accuracy, epoch }
   */
  handleTrainingLog(log) {
    if (!window.tfvis) {
      console.warn('[TFVisorView] tfjs-vis não carregado no objeto window.');
      return;
    }

    // Abre o visor e renderiza o guia explicativo no primeiro log
    if (this.#history.length === 0) {
      tfvis.visor().open();
      this.#renderMetricsGuide();
    }

    this.#history.push(log);

    const container = { name: 'Performance do Modelo', tab: 'Treinamento' };
    
    // Renderiza o histórico com as três métricas mantidas
    tfvis.show.history(container, this.#history, ['loss', 'mse', 'accuracy']);
  }

  /**
   * Injeta o guia explicativo diretamente na aba de treinamento
   */
  #renderMetricsGuide() {
    if (this.#isGuideRendered) return;

    const surface = tfvis.visor().surface({ 
      name: 'Entenda os Gráficos', 
      tab: 'Treinamento' 
    });
    
    const container = surface.drawArea;

    container.innerHTML = `
      <div style="padding: 12px; font-family: sans-serif; line-height: 1.4; background: #fcfcfc; border: 1px solid #eee; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #333;">🎯 Objetivo: As linhas de erro devem descer</h4>
        
        <div style="margin-bottom: 10px; border-left: 4px solid #4285f4; padding-left: 10px;">
          <strong style="color: #4285f4; font-size: 12px;">📉 LOSS (Aprendizado)</strong>
          <p style="font-size: 11px; color: #666; margin: 2px 0;">
            Representa o erro global da IA. Quanto menor o valor, mais o modelo entendeu seus padrões de gosto.
          </p>
        </div>

        <div style="margin-bottom: 10px; border-left: 4px solid #34a853; padding-left: 10px;">
          <strong style="color: #34a853; font-size: 12px;">📊 MSE (Precisão)</strong>
          <p style="font-size: 11px; color: #666; margin: 2px 0;">
            Mede a distância média entre a nota prevista e a real. Ideal para recomendações mais assertivas.
          </p>
        </div>

        <div style="border-left: 4px solid #f4b400; padding-left: 10px;">
          <strong style="color: #f4b400; font-size: 12px;">✅ ACCURACY (Acerto Exato)</strong>
          <p style="font-size: 11px; color: #666; margin: 2px 0;">
            Indica a porcentagem de vezes que a IA previu exatamente o valor esperado.
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