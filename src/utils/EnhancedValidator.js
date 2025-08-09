/**
 * EnhancedValidator - Sistema avançado de validação com feedback proativo
 * 
 * Valida CSS, sugere correções e oferece autocompletar com padrões do projeto
 * Inclui validação semântica e sugestões inteligentes
 */
class EnhancedValidator {
  constructor() {
    // Cache de validações para performance
    this.validationCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos

    // Propriedades CSS válidas com metadados
    this.cssProperties = new Map([
      // Layout
      ['display', { type: 'enum', values: ['block', 'inline', 'flex', 'grid', 'none', 'inline-block', 'inline-flex'], category: 'layout' }],
      ['position', { type: 'enum', values: ['static', 'relative', 'absolute', 'fixed', 'sticky'], category: 'layout' }],
      ['top', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'layout' }],
      ['right', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'layout' }],
      ['bottom', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'layout' }],
      ['left', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'layout' }],
      ['zIndex', { type: 'number', category: 'layout' }],
      
      // Flexbox
      ['justifyContent', { type: 'enum', values: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'], category: 'flexbox' }],
      ['alignItems', { type: 'enum', values: ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'], category: 'flexbox' }],
      ['flexDirection', { type: 'enum', values: ['row', 'row-reverse', 'column', 'column-reverse'], category: 'flexbox' }],
      ['flexWrap', { type: 'enum', values: ['nowrap', 'wrap', 'wrap-reverse'], category: 'flexbox' }],
      ['flex', { type: 'string', category: 'flexbox' }],
      ['flexGrow', { type: 'number', category: 'flexbox' }],
      ['flexShrink', { type: 'number', category: 'flexbox' }],
      ['flexBasis', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'flexbox' }],
      
      // CSS Grid
      ['gridTemplateColumns', { type: 'string', category: 'grid' }],
      ['gridTemplateRows', { type: 'string', category: 'grid' }],
      ['gridTemplateAreas', { type: 'string', category: 'grid' }],
      ['gridColumn', { type: 'string', category: 'grid' }],
      ['gridRow', { type: 'string', category: 'grid' }],
      ['gridArea', { type: 'string', category: 'grid' }],
      ['gridGap', { type: 'size', units: ['px', 'em', 'rem'], category: 'grid' }],
      ['gap', { type: 'size', units: ['px', 'em', 'rem'], category: 'grid' }],
      ['rowGap', { type: 'size', units: ['px', 'em', 'rem'], category: 'grid' }],
      ['columnGap', { type: 'size', units: ['px', 'em', 'rem'], category: 'grid' }],
      ['justifyItems', { type: 'enum', values: ['start', 'end', 'center', 'stretch'], category: 'grid' }],
      ['alignContent', { type: 'enum', values: ['start', 'end', 'center', 'stretch', 'space-between', 'space-around'], category: 'grid' }],
      ['width', { type: 'size', units: ['px', 'em', 'rem', '%', 'vw'], category: 'sizing' }],
      ['height', { type: 'size', units: ['px', 'em', 'rem', '%', 'vh'], category: 'sizing' }],
      ['minWidth', { type: 'size', units: ['px', 'em', 'rem', '%', 'vw'], category: 'sizing' }],
      ['maxWidth', { type: 'size', units: ['px', 'em', 'rem', '%', 'vw'], category: 'sizing' }],
      ['minHeight', { type: 'size', units: ['px', 'em', 'rem', '%', 'vh'], category: 'sizing' }],
      ['maxHeight', { type: 'size', units: ['px', 'em', 'rem', '%', 'vh'], category: 'sizing' }],
      
      // Typography
      ['fontSize', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'typography' }],
      ['fontWeight', { type: 'mixed', values: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'], category: 'typography' }],
      ['fontStyle', { type: 'enum', values: ['normal', 'italic', 'oblique'], category: 'typography' }],
      ['fontFamily', { type: 'string', category: 'typography' }],
      ['color', { type: 'color', category: 'color' }],
      ['textAlign', { type: 'enum', values: ['left', 'center', 'right', 'justify'], category: 'typography' }],
      ['textDecoration', { type: 'enum', values: ['none', 'underline', 'overline', 'line-through'], category: 'typography' }],
      ['lineHeight', { type: 'mixed', values: ['normal', '1', '1.2', '1.4', '1.5', '1.6'], category: 'typography' }],
      
      // Colors & Background
      ['backgroundColor', { type: 'color', category: 'color' }],
      ['backgroundImage', { type: 'string', category: 'background' }],
      ['backgroundSize', { type: 'enum', values: ['cover', 'contain', 'auto'], category: 'background' }],
      ['backgroundPosition', { type: 'position', values: ['center', 'top', 'bottom', 'left', 'right'], category: 'background' }],
      
      // Spacing
      ['margin', { type: 'spacing', units: ['px', 'em', 'rem', '%'], category: 'spacing' }],
      ['marginTop', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'spacing' }],
      ['marginRight', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'spacing' }],
      ['marginBottom', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'spacing' }],
      ['marginLeft', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'spacing' }],
      ['padding', { type: 'spacing', units: ['px', 'em', 'rem', '%'], category: 'spacing' }],
      ['paddingTop', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'spacing' }],
      ['paddingRight', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'spacing' }],
      ['paddingBottom', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'spacing' }],
      ['paddingLeft', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'spacing' }],
      
      // Borders
      ['border', { type: 'border', category: 'border' }],
      ['borderRadius', { type: 'size', units: ['px', 'em', 'rem', '%'], category: 'border' }],
      ['borderWidth', { type: 'size', units: ['px'], category: 'border' }],
      ['borderStyle', { type: 'enum', values: ['solid', 'dashed', 'dotted', 'none'], category: 'border' }],
      ['borderColor', { type: 'color', category: 'border' }],
      
      // Effects
      ['boxShadow', { type: 'shadow', category: 'effects' }],
      ['opacity', { type: 'number', min: 0, max: 1, category: 'effects' }],
      ['transform', { type: 'transform', category: 'effects' }],
      ['transition', { type: 'transition', category: 'effects' }],
      
      // Overflow and scroll
      ['overflow', { type: 'enum', values: ['visible', 'hidden', 'scroll', 'auto'], category: 'layout' }],
      ['overflowX', { type: 'enum', values: ['visible', 'hidden', 'scroll', 'auto'], category: 'layout' }],
      ['overflowY', { type: 'enum', values: ['visible', 'hidden', 'scroll', 'auto'], category: 'layout' }],
      
      // Cursor and visibility
      ['cursor', { type: 'enum', values: ['auto', 'default', 'pointer', 'text', 'move', 'help', 'wait'], category: 'interaction' }],
      ['visibility', { type: 'enum', values: ['visible', 'hidden', 'collapse'], category: 'layout' }],
      
      // Text properties
      ['textTransform', { type: 'enum', values: ['none', 'uppercase', 'lowercase', 'capitalize'], category: 'typography' }],
      ['whiteSpace', { type: 'enum', values: ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line'], category: 'typography' }],
      ['wordWrap', { type: 'enum', values: ['normal', 'break-word'], category: 'typography' }],
      ['textOverflow', { type: 'enum', values: ['clip', 'ellipsis'], category: 'typography' }],
      
      // Box model
      ['boxSizing', { type: 'enum', values: ['content-box', 'border-box'], category: 'layout' }],
      ['float', { type: 'enum', values: ['none', 'left', 'right'], category: 'layout' }],
      ['clear', { type: 'enum', values: ['none', 'left', 'right', 'both'], category: 'layout' }],
      
      // Animation and transform
      ['animation', { type: 'string', category: 'effects' }],
      ['animationDelay', { type: 'string', category: 'effects' }],
      ['animationDuration', { type: 'string', category: 'effects' }],
      ['transitionDelay', { type: 'string', category: 'effects' }],
      ['transitionDuration', { type: 'string', category: 'effects' }],
      ['transitionProperty', { type: 'string', category: 'effects' }],
      ['transformOrigin', { type: 'string', category: 'effects' }]
    ]);

    // Mapeamento de cores comuns
    this.colorMap = new Map([
      // Português
      ['azul', '#3B82F6'], ['vermelho', '#EF4444'], ['verde', '#10B981'], 
      ['amarelo', '#F59E0B'], ['roxo', '#8B5CF6'], ['rosa', '#EC4899'],
      ['cinza', '#6B7280'], ['preto', '#000000'], ['branco', '#FFFFFF'],
      ['laranja', '#F97316'],
      
      // Inglês
      ['blue', '#3B82F6'], ['red', '#EF4444'], ['green', '#10B981'],
      ['yellow', '#F59E0B'], ['purple', '#8B5CF6'], ['pink', '#EC4899'],
      ['gray', '#6B7280'], ['black', '#000000'], ['white', '#FFFFFF'],
      ['orange', '#F97316']
    ]);

    // Padrões comuns do projeto (detectados automaticamente)
    this.projectPatterns = {
      colors: new Set(),
      spacings: new Set(),
      fontSizes: new Set(),
      borderRadius: new Set()
    };

    // Erros comuns e suas correções
    this.commonErrors = new Map([
      // Erros de digitação
      ['blau', 'blue'], ['blu', 'blue'], ['azull', 'azul'],
      ['vermelh', 'vermelho'], ['vermelhoo', 'vermelho'],
      ['greem', 'green'], ['gren', 'green'],
      
      // Propriedades CSS
      ['background-color', 'backgroundColor'], ['font-size', 'fontSize'],
      ['border-radius', 'borderRadius'], ['text-align', 'textAlign'],
      ['margin-top', 'marginTop'], ['padding-left', 'paddingLeft'],
      
      // Unidades
      ['10', '10px'], ['20', '20px'], ['100%px', '100%'],
      ['px10', '10px'], ['em1', '1em']
    ]);

    // Sugestões contextuais
    this.contextualSuggestions = {
      button: {
        padding: ['8px 16px', '12px 24px', '10px 20px'],
        borderRadius: ['4px', '8px', '6px'],
        fontSize: ['14px', '16px', '18px']
      },
      text: {
        fontSize: ['14px', '16px', '18px', '20px', '24px'],
        lineHeight: ['1.4', '1.5', '1.6'],
        color: ['#333', '#666', '#999']
      },
      container: {
        padding: ['20px', '24px', '32px'],
        margin: ['16px', '20px', '24px'],
        borderRadius: ['8px', '12px', '16px']
      }
    };

    this.initializeProjectPatterns();
  }

  /**
   * Valida estilos CSS com feedback detalhado e sugestões
   * @param {Object} styles - Objeto com propriedades CSS
   * @param {Object} context - Contexto adicional (elemento, tipo, etc.)
   * @returns {Object} Resultado da validação com sugestões
   */
  validateStyles(styles, context = {}) {
    // Validação defensiva de entrada
    if (!styles || typeof styles !== 'object') {
      return {
        isValid: false,
        errors: ['Invalid styles parameter: must be an object'],
        warnings: [],
        suggestions: ['Provide styles as an object with CSS properties'],
        corrections: {},
        validStyles: {},
        invalidStyles: styles || {},
        enhancements: []
      };
    }

    const cacheKey = JSON.stringify({ styles, context });
    
    // Verifica cache primeiro
    if (this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result;
      }
    }

    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      corrections: {},
      validStyles: {},
      invalidStyles: {},
      enhancements: []
    };

    // Valida cada propriedade
    Object.entries(styles).forEach(([property, value]) => {
      const propertyResult = this.validateProperty(property, value, context);
      
      if (propertyResult.isValid) {
        result.validStyles[propertyResult.normalizedProperty] = propertyResult.normalizedValue;
      } else {
        result.isValid = false;
        result.invalidStyles[property] = value;
        result.errors.push(...propertyResult.errors);
      }

      if (propertyResult.correction) {
        result.corrections[property] = propertyResult.correction;
      }

      result.warnings.push(...propertyResult.warnings);
      result.suggestions.push(...propertyResult.suggestions);
    });

    // Adiciona sugestões contextuais
    this.addContextualSuggestions(result, context);

    // Validações semânticas (combinações de propriedades)
    this.performSemanticValidation(result, styles, context);

    // Cache do resultado
    this.validationCache.set(cacheKey, {
      result: { ...result },
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Valida uma propriedade CSS específica
   */
  validateProperty(property, value, context = {}) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      normalizedProperty: property,
      normalizedValue: value,
      correction: null
    };

    // Normaliza nome da propriedade
    const normalizedProp = this.normalizePropertyName(property);
    if (normalizedProp !== property) {
      result.normalizedProperty = normalizedProp;
      result.correction = normalizedProp;
    }

    // Verifica se a propriedade existe
    if (!this.cssProperties.has(normalizedProp)) {
      // Tenta encontrar correção
      const suggestion = this.findPropertySuggestion(property);
      if (suggestion) {
        result.correction = suggestion;
        result.suggestions.push(`Você quis dizer '${suggestion}'?`);
      } else {
        result.isValid = false;
        result.errors.push(`Propriedade CSS desconhecida: '${property}'`);
        return result;
      }
    }

    const propMeta = this.cssProperties.get(result.normalizedProperty);
    if (!propMeta) {
      return result;
    }

    // Valida o valor
    const valueValidation = this.validateValue(value, propMeta, context);
    if (!valueValidation.isValid) {
      result.isValid = false;
      result.errors.push(...valueValidation.errors);
    }

    if (valueValidation.normalizedValue !== value) {
      result.normalizedValue = valueValidation.normalizedValue;
    }

    result.warnings.push(...valueValidation.warnings);
    result.suggestions.push(...valueValidation.suggestions);

    return result;
  }

  /**
   * Valida valor de uma propriedade CSS
   */
  validateValue(value, propMeta, context = {}) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      normalizedValue: value
    };

    const stringValue = String(value).trim();

    switch (propMeta.type) {
      case 'color':
        return this.validateColor(stringValue, result);
      
      case 'size':
        return this.validateSize(stringValue, propMeta, result);
      
      case 'enum':
        return this.validateEnum(stringValue, propMeta, result);
      
      case 'number':
        return this.validateNumber(stringValue, propMeta, result);
      
      case 'spacing':
        return this.validateSpacing(stringValue, propMeta, result);
      
      case 'border':
        return this.validateBorder(stringValue, result);
      
      default:
        return result;
    }
  }

  /**
   * Valida cores com sugestões inteligentes
   */
  validateColor(value, result) {
    // Verifica se é cor nomeada em português/inglês
    const normalizedColor = this.colorMap.get(value.toLowerCase());
    if (normalizedColor) {
      result.normalizedValue = normalizedColor;
      result.suggestions.push(`Convertido '${value}' para '${normalizedColor}'`);
      return result;
    }

    // Valida formatos de cor
    const colorPatterns = [
      /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, // Hex
      /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, // RGB
      /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/, // RGBA
      /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/, // HSL
      /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/ // HSLA
    ];

    const isValidColor = colorPatterns.some(pattern => pattern.test(value)) ||
                        this.isNamedColor(value);

    if (!isValidColor) {
      // Tenta correção automática
      const suggestion = this.findColorSuggestion(value);
      if (suggestion) {
        result.normalizedValue = suggestion;
        result.suggestions.push(`Corrigi '${value}' para '${suggestion}'`);
      } else {
        result.isValid = false;
        result.errors.push(`Valor de cor inválido: '${value}'. Use hex (#ff0000), rgb(), ou nomes de cores.`);
      }
    }

    return result;
  }

  /**
   * Valida tamanhos com unidades apropriadas
   */
  validateSize(value, propMeta, result) {
    // Validação defensiva - garante que result tem todas as propriedades necessárias
    if (!result.hasOwnProperty('isValid')) {
      result.isValid = true;
    }
    if (!result.errors) {
      result.errors = [];
    }
    if (!result.suggestions) {
      result.suggestions = [];
    }
    if (!result.normalizedValue) {
      result.normalizedValue = value;
    }
    
    // Se é apenas número, adiciona px como padrão
    if (/^\d+(\.\d+)?$/.test(value)) {
      result.normalizedValue = value + 'px';
      result.suggestions.push(`Adicionei 'px' ao valor: ${result.normalizedValue}`);
      return result;
    }

    // Valida formato size com unidade
    const sizePattern = /^(\d+(?:\.\d+)?)(px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch)$/;
    const match = value.match(sizePattern);

    if (!match) {
      result.isValid = false;
      result.errors.push(`Tamanho inválido: '${value}'. Use formato como '16px', '1em', '100%'.`);
      return result;
    }

    const [, number, unit] = match;
    if (propMeta.units && !propMeta.units.includes(unit)) {
      result.warnings.push(`Unidade '${unit}' pode não ser ideal. Unidades recomendadas: ${propMeta.units.join(', ')}`);
    }

    return result;
  }

  /**
   * Valida valores de enumeração
   */
  validateEnum(value, propMeta, result) {
    if (!propMeta.values.includes(value)) {
      const suggestion = this.findClosestMatch(value, propMeta.values);
      if (suggestion) {
        result.normalizedValue = suggestion;
        result.suggestions.push(`Corrigi '${value}' para '${suggestion}'`);
      } else {
        result.isValid = false;
        result.errors.push(`Valor inválido: '${value}'. Valores aceitos: ${propMeta.values.join(', ')}`);
      }
    }

    return result;
  }

  /**
   * Valida números com limites
   */
  validateNumber(value, propMeta, result) {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
      result.isValid = false;
      result.errors.push(`Valor numérico inválido: '${value}'`);
      return result;
    }

    if (propMeta.min !== undefined && num < propMeta.min) {
      result.warnings.push(`Valor ${num} está abaixo do mínimo recomendado (${propMeta.min})`);
    }

    if (propMeta.max !== undefined && num > propMeta.max) {
      result.warnings.push(`Valor ${num} está acima do máximo recomendado (${propMeta.max})`);
    }

    return result;
  }

  /**
   * Valida espaçamento (margin, padding)
   */
  validateSpacing(value, propMeta, result) {
    // Pode ter 1-4 valores
    const values = value.split(/\s+/);
    
    if (values.length > 4) {
      result.isValid = false;
      result.errors.push(`Muitos valores para espaçamento. Use 1-4 valores.`);
      return result;
    }

    // Valida cada valor individualmente
    const validatedValues = [];
    let hasErrors = false;

    values.forEach(val => {
      const valResult = this.validateSize(val, propMeta, {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        normalizedValue: val
      });
      if (valResult.isValid) {
        validatedValues.push(valResult.normalizedValue);
      } else {
        hasErrors = true;
        result.errors.push(...valResult.errors);
      }
    });

    if (!hasErrors) {
      result.normalizedValue = validatedValues.join(' ');
    } else {
      result.isValid = false;
    }

    return result;
  }

  /**
   * Valida propriedades border
   */
  validateBorder(value, result) {
    // Border pode ser "1px solid #000" ou similar
    const borderPattern = /^(\d+(?:px|em|rem))\s+(solid|dashed|dotted|none)\s+(#[0-9a-fA-F]{3,6}|\w+)$/;
    
    if (!borderPattern.test(value) && value !== 'none') {
      result.warnings.push(`Format de border pode estar incorreto. Use formato: "1px solid #000"`);
    }

    return result;
  }

  /**
   * Adiciona sugestões contextuais baseadas no tipo de elemento
   */
  addContextualSuggestions(result, context) {
    const { elementType, elementTag } = context;
    
    let suggestedType = elementType;
    if (!suggestedType && elementTag) {
      suggestedType = this.inferElementType(elementTag);
    }

    if (suggestedType && this.contextualSuggestions[suggestedType]) {
      const suggestions = this.contextualSuggestions[suggestedType];
      
      Object.entries(suggestions).forEach(([prop, values]) => {
        if (!result.validStyles[prop] && !result.invalidStyles[prop]) {
          result.enhancements.push({
            property: prop,
            suggestions: values,
            reason: `Sugestões para ${suggestedType}`
          });
        }
      });
    }
  }

  /**
   * Validação semântica (verifica combinações de propriedades)
   */
  performSemanticValidation(result, styles, context) {
    // Verifica combinações problemáticas
    if (styles.position === 'fixed' && !styles.top && !styles.bottom && !styles.left && !styles.right) {
      result.warnings.push('Elemento com position:fixed deve ter pelo menos uma propriedade de posicionamento (top, left, etc.)');
    }

    // Verifica acessibilidade de cores
    if (styles.color && styles.backgroundColor) {
      const contrastWarning = this.checkColorContrast(styles.color, styles.backgroundColor);
      if (contrastWarning) {
        result.warnings.push(contrastWarning);
      }
    }

    // Verifica propriedades flexbox
    if (styles.display !== 'flex' && (styles.justifyContent || styles.alignItems)) {
      result.warnings.push('justifyContent e alignItems funcionam apenas com display: flex');
    }
  }

  /**
   * Verifica contraste de cores para acessibilidade
   */
  checkColorContrast(foreground, background) {
    // Implementação básica - pode ser expandida
    if ((foreground.toLowerCase().includes('white') || foreground === '#fff' || foreground === '#ffffff') &&
        (background.toLowerCase().includes('white') || background === '#fff' || background === '#ffffff')) {
      return 'Contraste insuficiente: texto branco em fundo branco não é acessível';
    }
    
    if ((foreground.toLowerCase().includes('black') || foreground === '#000' || foreground === '#000000') &&
        (background.toLowerCase().includes('black') || background === '#000' || background === '#000000')) {
      return 'Contraste insuficiente: texto preto em fundo preto não é acessível';
    }

    return null;
  }

  /**
   * Normaliza nome da propriedade CSS
   */
  normalizePropertyName(property) {
    // Converte kebab-case para camelCase
    const corrected = this.commonErrors.get(property);
    if (corrected) {
      return corrected;
    }

    return property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Encontra sugestão para propriedade desconhecida
   */
  findPropertySuggestion(property) {
    const suggestion = this.commonErrors.get(property);
    if (suggestion) {
      return suggestion;
    }

    // Busca por similaridade
    const allProperties = Array.from(this.cssProperties.keys());
    return this.findClosestMatch(property, allProperties);
  }

  /**
   * Encontra sugestão para cor inválida
   */
  findColorSuggestion(color) {
    const suggestion = this.commonErrors.get(color.toLowerCase());
    if (suggestion) {
      return suggestion;
    }

    // Busca por similaridade nas cores conhecidas
    const colorNames = Array.from(this.colorMap.keys());
    const match = this.findClosestMatch(color.toLowerCase(), colorNames);
    return match ? this.colorMap.get(match) : null;
  }

  /**
   * Encontra correspondência mais próxima usando distância de Levenshtein
   */
  findClosestMatch(input, options, threshold = 2) {
    let bestMatch = null;
    let bestDistance = Infinity;

    options.forEach(option => {
      const distance = this.levenshteinDistance(input.toLowerCase(), option.toLowerCase());
      if (distance < bestDistance && distance <= threshold) {
        bestDistance = distance;
        bestMatch = option;
      }
    });

    return bestMatch;
  }

  /**
   * Calcula distância de Levenshtein
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Verifica se é cor nomeada CSS válida
   */
  isNamedColor(color) {
    const namedColors = [
      'red', 'green', 'blue', 'white', 'black', 'yellow', 'cyan', 'magenta',
      'orange', 'purple', 'brown', 'pink', 'gray', 'grey', 'transparent'
    ];
    return namedColors.includes(color.toLowerCase());
  }

  /**
   * Infere tipo de elemento baseado na tag
   */
  inferElementType(tag) {
    const typeMap = {
      'button': 'button',
      'input': 'button', 
      'a': 'button',
      'p': 'text',
      'span': 'text',
      'h1': 'text', 'h2': 'text', 'h3': 'text',
      'div': 'container',
      'section': 'container',
      'article': 'container'
    };
    
    return typeMap[tag?.toLowerCase()] || 'container';
  }

  /**
   * Inicializa padrões do projeto analisando elementos existentes
   */
  initializeProjectPatterns() {
    if (typeof document === 'undefined') return;

    // Analisa elementos existentes para detectar padrões comuns
    const elements = document.querySelectorAll('*');
    
    elements.forEach(el => {
      const computedStyle = window.getComputedStyle(el);
      
      // Coleta cores
      this.collectPattern(computedStyle.color, this.projectPatterns.colors);
      this.collectPattern(computedStyle.backgroundColor, this.projectPatterns.colors);
      
      // Coleta espaçamentos
      this.collectPattern(computedStyle.padding, this.projectPatterns.spacings);
      this.collectPattern(computedStyle.margin, this.projectPatterns.spacings);
      
      // Coleta tamanhos de fonte
      this.collectPattern(computedStyle.fontSize, this.projectPatterns.fontSizes);
      
      // Coleta border-radius
      this.collectPattern(computedStyle.borderRadius, this.projectPatterns.borderRadius);
    });
  }

  /**
   * Coleta padrão para análise do projeto
   */
  collectPattern(value, collection) {
    if (value && value !== 'auto' && value !== 'none' && value !== '0px') {
      collection.add(value);
    }
  }

  /**
   * Gera sugestões de autocompletar baseadas nos padrões do projeto
   */
  getAutocompleteSuggestions(property, partialValue = '') {
    const suggestions = [];
    
    // Sugestões baseadas nos padrões do projeto
    if (this.projectPatterns[property]) {
      const patterns = Array.from(this.projectPatterns[property])
        .filter(p => p.includes(partialValue))
        .slice(0, 5);
      suggestions.push(...patterns);
    }

    // Sugestões contextuais
    if (this.cssProperties.has(property)) {
      const propMeta = this.cssProperties.get(property);
      if (propMeta.values) {
        suggestions.push(...propMeta.values.filter(v => v.includes(partialValue)));
      }
    }

    return [...new Set(suggestions)]; // Remove duplicatas
  }

  /**
   * Limpa cache de validação
   */
  clearCache() {
    this.validationCache.clear();
  }
}

export default EnhancedValidator;