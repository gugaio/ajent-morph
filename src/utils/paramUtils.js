export class ParamUtils {
  static parseParams(rawParams) {
    if (typeof rawParams?.params === 'string') {
      try {
        return JSON.parse(rawParams.params);
      } catch {
        throw new Error('Falha ao interpretar parâmetros JSON - verifique a sintaxe');
      }
    }
    return rawParams;
  }
  
  static validateStyles(styles) {
    if (!styles || typeof styles !== 'object') {
      throw new Error('Parâmetro "styles" é obrigatório e deve ser um objeto CSS válido');
    }
  }
  
  static validateSelectors(selectors) {
    if (!Array.isArray(selectors) || selectors.length === 0) {
      throw new Error('Parâmetro "elementSelectors" é obrigatório e deve ser um array de seletores CSS');
    }
  }
}
  