export class ParametersView {
  #tableBody = document.querySelector('#modelParametersTableBody');

  renderFeatureImportance(featureImportance = []) {
    if (!this.#tableBody) return;

    const descriptions = {
      danceability: 'Ritmo e facilidade para dançar',
      energy: 'Intensidade e atividade percebida',
      loudness: 'Volume normalizado',
      speechiness: 'Presença de fala na faixa',
      acousticness: 'Probabilidade de ser acústica',
      instrumentalness: 'Probabilidade de ser instrumental',
      liveness: 'Indício de performance ao vivo',
      valence: 'Positividade emocional da música',
      tempo: 'Andamento normalizado',
      popularity: 'Popularidade normalizada'
    };

    const orderedFeatures = [
      'danceability',
      'energy',
      'loudness',
      'speechiness',
      'acousticness',
      'instrumentalness',
      'liveness',
      'valence',
      'tempo',
      'popularity'
    ];

    const importanceMap = new Map(
      featureImportance.map(item => [item.feature, item.percentage])
    );

    this.#tableBody.innerHTML = orderedFeatures.map(feature => `
      <tr>
        <td>${feature}</td>
        <td>${descriptions[feature]}</td>
        <td>${importanceMap.has(feature) ? `${importanceMap.get(feature).toFixed(2)}%` : '-'}</td>
      </tr>
    `).join('');
  }
}