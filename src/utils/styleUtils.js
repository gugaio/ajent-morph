export class StyleUtils {
  static formatStyles(styles) {
    return Object.entries(styles)
      .map(([prop, value]) => `${prop}: ${value}`)
      .join(', ');
  }
  
  static formatSuccessMessage({ count, selectors, styles, description }) {
    return [
      '✅ SUCESSO: Estilos aplicados com sucesso!',
      `📍 Elementos afetados: ${count} [${selectors.join(', ')}]`,
      `🎨 Estilos aplicados: ${this.formatStyles(styles)}`,
      `📝 Descrição: ${description}`
    ].join('\n');
  }
}
  