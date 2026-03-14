export class View {
  constructor() {
    this.loadTemplate = this.loadTemplate.bind(this);
  }

  async loadTemplate(templatePath) {
    try {
      const response = await fetch(templatePath);
      if (!response.ok) {
        throw new Error(`Erro ao carregar template: ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (err) {
      console.error('[View] Erro ao carregar template:', err);
      throw err;
    }
  }

  replaceTemplate(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return result;
  }
}