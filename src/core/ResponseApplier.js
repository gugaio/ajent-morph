class ResponseApplier {
  constructor() {
    this.changeHistory = [];
    this.maxHistorySize = 50;
      
    // Mapeamento de propriedades CSS válidas
    this.validCSSProperties = new Set([
      // Layout
      'display', 'position', 'top', 'right', 'bottom', 'left',
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'boxSizing', 'overflow', 'overflowX', 'overflowY', 'zIndex',
        
      // Typography
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
      'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration',
      'textTransform', 'textIndent', 'wordSpacing', 'whiteSpace',
        
      // Colors
      'color', 'backgroundColor', 'backgroundImage', 'backgroundPosition',
      'backgroundSize', 'backgroundRepeat', 'backgroundAttachment',
      'opacity', 'visibility',
        
      // Borders
      'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
      'borderWidth', 'borderStyle', 'borderColor', 'borderRadius',
      'borderTopLeftRadius', 'borderTopRightRadius',
      'borderBottomLeftRadius', 'borderBottomRightRadius',
      'boxShadow', 'outline', 'outlineWidth', 'outlineStyle', 'outlineColor',
        
      // Flexbox
      'flexDirection', 'flexWrap', 'justifyContent', 'alignItems',
      'alignContent', 'flex', 'flexGrow', 'flexShrink', 'flexBasis',
      'alignSelf', 'order',
        
      // Grid
      'gridTemplateColumns', 'gridTemplateRows', 'gridTemplateAreas',
      'gridColumnStart', 'gridColumnEnd', 'gridRowStart', 'gridRowEnd',
      'gridArea', 'gridGap', 'gridColumnGap', 'gridRowGap',
        
      // Transform & Animation
      'transform', 'transformOrigin', 'transition', 'animation',
      'filter', 'backdropFilter', 'clipPath', 'cursor'
    ]);
  }
    
  /**
     * Aplica resposta da LLM ao elemento
     */
  async applyLLMResponse(llmResponse, element, originalCommand) {
    try {
      // Parse da resposta (pode vir como string ou objeto)
      const response = this.parseLLMResponse(llmResponse);
        
      // Valida a resposta
      const validation = this.validateResponse(response);
      if (!validation.isValid) {
        throw new Error(`Invalid LLM response: ${validation.errors.join(', ')}`);
      }
        
      // Salva estado atual para undo
      const previousState = this.captureElementState(element);
        
      // Aplica as mudanças
      const appliedChanges = await this.applyStyles(element, response.styles);
        
      // Registra no histórico
      this.addToHistory({
        timestamp: Date.now(),
        element: this.getElementSelector(element),
        command: originalCommand,
        response: response,
        previousState: previousState,
        appliedChanges: appliedChanges
      });
        
      // Retorna resultado
      return {
        success: true,
        message: response.explanation || response.message || 'Mudanças aplicadas com sucesso!',
        action: response.action,
        appliedStyles: appliedChanges,
        canUndo: true
      };
        
    } catch (error) {
      console.error('Error applying LLM response:', error);
      return {
        success: false,
        message: `Erro ao aplicar mudanças: ${error.message}`,
        error: error
      };
    }
  }
    
  /**
     * Parse da resposta da LLM
     */
  parseLLMResponse(response) {
    // Se já é objeto, retorna direto
    if (typeof response === 'object' && response !== null) {
      return response;
    }
      
    // Se é string, tenta fazer parse JSON
    if (typeof response === 'string') {
      try {
        // Remove markdown code blocks se existirem
        const cleanResponse = response
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
          
        return JSON.parse(cleanResponse);
      } catch (e) {
        // Se não conseguir parse JSON, tenta extrair informações
        return this.extractFromText(response);
      }
    }
      
    throw new Error('Invalid response format');
  }
    
  /**
     * Extrai informações de texto livre (fallback)
     */
  extractFromText(text) {
    // Regex patterns para extrair informações comuns
    const patterns = {
      color: /(?:color|cor)[:\s]+([#\w\(\),\s]+)/i,
      backgroundColor: /(?:background|fundo)[:\s]+([#\w\(\),\s]+)/i,
      fontSize: /(?:font-?size|tamanho)[:\s]+(\d+(?:px|em|rem|%))/i,
      padding: /(?:padding|espaçamento)[:\s]+(\d+(?:px|em|rem))/i,
      borderRadius: /(?:border-?radius|arredondar)[:\s]+(\d+(?:px|em|rem))/i
    };
      
    const styles = {};
    let action = 'Modificação de estilo';
      
    Object.entries(patterns).forEach(([prop, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        styles[prop] = match[1].trim();
      }
    });
      
    // Tenta extrair ação
    const actionMatch = text.match(/(?:action|ação)[:\s]+([^.!?\n]+)/i);
    if (actionMatch) {
      action = actionMatch[1].trim();
    }
      
    return {
      action: action,
      styles: styles,
      explanation: text
    };
  }
    
  /**
     * Valida resposta da LLM
     */
  validateResponse(response) {
    const errors = [];
      
    // Verifica estrutura básica
    if (!response || typeof response !== 'object') {
      errors.push('Response must be an object');
    }
      
    // Verifica se tem styles
    if (!response.styles || typeof response.styles !== 'object') {
      errors.push('Response must have a styles object');
    }
      
    // Valida propriedades CSS
    if (response.styles) {
      Object.keys(response.styles).forEach(prop => {
        const kebabProp = this.camelToKebab(prop);
        const camelProp = this.kebabToCamel(prop);
          
        if (!this.validCSSProperties.has(prop) && 
              !this.validCSSProperties.has(kebabProp) && 
              !this.validCSSProperties.has(camelProp)) {
          errors.push(`Invalid CSS property: ${prop}`);
        }
      });
    }
      
    // Valida valores CSS básicos
    if (response.styles) {
      Object.entries(response.styles).forEach(([prop, value]) => {
        if (!this.isValidCSSValue(prop, value)) {
          errors.push(`Invalid value for ${prop}: ${value}`);
        }
      });
    }
      
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
    
  /**
     * Aplica estilos ao elemento
     */
  async applyStyles(element, styles) {
    // Validate that element is a proper DOM element
    if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
      console.error('Invalid element passed to applyStyles:', element);
      return {
        applied: {},
        failed: { 'invalid_element': { attempted: 'styles', reason: 'Element is not a valid DOM element' } }
      };
    }

    const appliedChanges = {};
    const failedChanges = {};
      
    // Aplica cada estilo individualmente
    Object.entries(styles).forEach(([property, value]) => {
      try {
        // Normaliza nome da propriedade
        const normalizedProp = this.normalizeCSSProperty(property);
          
        // Normaliza valor
        const normalizedValue = this.normalizeCSSValue(property, value);
          
        // Salva valor anterior
        const previousValue = element.style[normalizedProp] || 
                               window.getComputedStyle(element)[normalizedProp];
          
        // Aplica o novo valor
        element.style[normalizedProp] = normalizedValue;
          
        // Verifica se foi aplicado com sucesso
        const appliedValue = element.style[normalizedProp];
        if (appliedValue) {
          appliedChanges[normalizedProp] = {
            previous: previousValue,
            new: appliedValue
          };
        } else {
          failedChanges[normalizedProp] = {
            attempted: normalizedValue,
            reason: 'Value not accepted by browser'
          };
        }
          
      } catch (error) {
        failedChanges[property] = {
          attempted: value,
          reason: error.message
        };
      }
    });
      
    // Log dos resultados
    if (Object.keys(appliedChanges).length > 0) {
      console.log('✅ Successfully applied styles:', appliedChanges);
    }
      
    if (Object.keys(failedChanges).length > 0) {
      console.warn('❌ Failed to apply styles:', failedChanges);
    }
      
    return {
      applied: appliedChanges,
      failed: failedChanges
    };
  }
    
  /**
     * Captura estado atual do elemento
     */
  captureElementState(element) {
    // Validate that element is a proper DOM element
    if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
      console.error('Invalid element passed to captureElementState:', element);
      return { inline: '' }; // Return minimal state
    }

    try {
      const computedStyle = window.getComputedStyle(element);
      const state = {};
        
      // Captura propriedades inline
      if (element.style && element.style.cssText) {
        state.inline = element.style.cssText;
      }
        
      // Captura propriedades computadas relevantes
      this.validCSSProperties.forEach(prop => {
        try {
          const value = computedStyle.getPropertyValue(this.camelToKebab(prop));
          if (value && value !== 'auto' && value !== 'normal') {
            state[prop] = value;
          }
        } catch (error) {
          // Skip properties that can't be accessed
          console.warn(`Could not get computed style for property ${prop}:`, error);
        }
      });
        
      return state;
    } catch (error) {
      console.error('Error capturing element state:', error);
      return { inline: element.style ? element.style.cssText : '' };
    }
  }
    
  /**
     * Desfaz última mudança
     */
  undo() {
    if (this.changeHistory.length === 0) {
      return { success: false, message: 'Nenhuma mudança para desfazer' };
    }
      
    const lastChange = this.changeHistory.pop();
    const element = document.querySelector(lastChange.element);
      
    if (!element) {
      return { success: false, message: 'Elemento não encontrado' };
    }
      
    // Restaura estado anterior
    if (lastChange.previousState.inline) {
      element.style.cssText = lastChange.previousState.inline;
    } else {
      element.style.cssText = '';
    }
      
    return {
      success: true,
      message: 'Mudança desfeita com sucesso!',
      undoneChange: lastChange
    };
  }
    
  /**
     * Utilitários
     */
  normalizeCSSProperty(property) {
    // Converte kebab-case para camelCase
    return this.kebabToCamel(property);
  }
    
  normalizeCSSValue(property, value) {
    const stringValue = String(value).trim();
      
    // Adiciona unidades padrão se necessário
    if (this.needsPixelUnit(property) && /^\d+$/.test(stringValue)) {
      return stringValue + 'px';
    }
      
    // Normaliza cores
    if (this.isColorProperty(property)) {
      return this.normalizeColor(stringValue);
    }
      
    return stringValue;
  }
    
  needsPixelUnit(property) {
    const pixelProperties = [
      'width', 'height', 'fontSize', 'padding', 'margin',
      'borderWidth', 'borderRadius', 'top', 'left', 'right', 'bottom'
    ];
    return pixelProperties.includes(property);
  }
    
  isColorProperty(property) {
    return ['color', 'backgroundColor', 'borderColor'].includes(property);
  }
    
  normalizeColor(color) {
    // Mapeamento de cores em português
    const colorMap = {
      'azul': '#3B82F6',
      'vermelho': '#EF4444',
      'verde': '#10B981',
      'amarelo': '#F59E0B',
      'roxo': '#8B5CF6',
      'rosa': '#EC4899',
      'cinza': '#6B7280',
      'preto': '#000000',
      'branco': '#FFFFFF'
    };
      
    return colorMap[color.toLowerCase()] || color;
  }
    
  isValidCSSValue(property, value) {
    // Validações básicas
    if (!value || typeof value !== 'string') return false;
      
    // Propriedades de cor
    if (this.isColorProperty(property)) {
      return /^(#[0-9a-fA-F]{3,6}|rgb\(|rgba\(|hsl\(|hsla\(|\w+)/i.test(value);
    }
      
    // Propriedades que podem ter múltiplos valores (padding, margin)
    if (this.canHaveMultipleValues(property)) {
      return /^(\d+(\.\d+)?(px|em|rem|%|vh|vw)?\s*)+$/.test(value.trim());
    }
      
    // Propriedades numéricas simples
    if (this.needsPixelUnit(property)) {
      return /^\d+(\.\d+)?(px|em|rem|%|vh|vw)?$/.test(value);
    }
      
    return true;
  }

  canHaveMultipleValues(property) {
    const multiValueProperties = ['padding', 'margin', 'border-width', 'border-radius'];
    return multiValueProperties.includes(property) || multiValueProperties.includes(this.camelToKebab(property));
  }
    
  camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }
    
  kebabToCamel(str) {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }
    
  getElementSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c).slice(0, 3);
      return `.${classes.join('.')}`;
    }
    return element.tagName.toLowerCase();
  }
    
  addToHistory(change) {
    this.changeHistory.push(change);
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory.shift();
    }
  }
    
  getHistory() {
    return this.changeHistory;
  }
    
  clearHistory() {
    this.changeHistory = [];
  }
}

export default ResponseApplier;