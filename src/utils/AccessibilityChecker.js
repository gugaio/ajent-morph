/**
 * AccessibilityChecker - Sistema de testes automáticos de acessibilidade
 * 
 * Verifica contraste de cores, estrutura semântica e outras diretrizes WCAG
 * Oferece sugestões automáticas para melhorar acessibilidade
 */
class AccessibilityChecker {
  constructor() {
    // Padrões WCAG 2.1 para contraste
    this.contrastRatios = {
      AA_NORMAL: 4.5, // Texto normal AA
      AA_LARGE: 3.0,  // Texto grande (18pt+ ou 14pt+ bold) AA
      AAA_NORMAL: 7.0, // Texto normal AAA
      AAA_LARGE: 4.5   // Texto grande AAA
    };

    // Elementos que precisam de verificação semântica
    this.semanticElements = new Set([
      'img', 'button', 'a', 'input', 'select', 'textarea', 
      'form', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ]);

    // Cache de cálculos de cor para performance
    this.colorCache = new Map();

    // Sugestões de cores seguras organizadas por categoria
    this.safeColorPalettes = {
      primary: [
        { color: '#1f2937', name: 'Gray 800', contrast: { white: 16.84 } },
        { color: '#374151', name: 'Gray 700', contrast: { white: 12.63 } },
        { color: '#1e40af', name: 'Blue 800', contrast: { white: 15.68 } },
        { color: '#0f172a', name: 'Slate 900', contrast: { white: 19.31 } }
      ],
      secondary: [
        { color: '#4b5563', name: 'Gray 600', contrast: { white: 7.60 } },
        { color: '#6b7280', name: 'Gray 500', contrast: { white: 5.74 } },
        { color: '#2563eb', name: 'Blue 600', contrast: { white: 8.59 } }
      ],
      accent: [
        { color: '#059669', name: 'Emerald 600', contrast: { white: 7.24 } },
        { color: '#dc2626', name: 'Red 600', contrast: { white: 5.89 } },
        { color: '#ea580c', name: 'Orange 600', contrast: { white: 4.52 } }
      ]
    };

    // Cores de fundo recomendadas
    this.backgroundColors = [
      { color: '#ffffff', name: 'White' },
      { color: '#f9fafb', name: 'Gray 50' },
      { color: '#f3f4f6', name: 'Gray 100' },
      { color: '#e5e7eb', name: 'Gray 200' }
    ];

    // Alertas de acessibilidade em tempo real
    this.realTimeAlerts = true;
    this.alertCallback = null;
  }

  /**
   * Verifica acessibilidade completa de um elemento
   * @param {Element} element - Elemento DOM a ser verificado
   * @param {Object} styles - Estilos que serão aplicados (opcional)
   * @returns {Object} Relatório de acessibilidade
   */
  checkElementAccessibility(element, styles = {}) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return { isAccessible: false, errors: ['Invalid element provided'] };
    }

    const report = {
      isAccessible: true,
      errors: [],
      warnings: [],
      suggestions: [],
      scores: {
        contrast: null,
        semantic: null,
        keyboard: null,
        overall: null
      },
      fixes: []
    };

    // 1. Verificações de contraste
    const contrastResult = this.checkColorContrast(element, styles);
    this.mergeResult(report, contrastResult);

    // 2. Verificações semânticas
    const semanticResult = this.checkSemanticStructure(element, styles);
    this.mergeResult(report, semanticResult);

    // 3. Verificações de navegabilidade por teclado
    const keyboardResult = this.checkKeyboardAccessibility(element);
    this.mergeResult(report, keyboardResult);

    // 4. Verificações específicas por tipo de elemento
    const specificResult = this.checkElementSpecificAccessibility(element, styles);
    this.mergeResult(report, specificResult);

    // 5. Calcula pontuação geral
    report.scores.overall = this.calculateOverallScore(report);

    // 6. Gera sugestões automáticas de correção
    report.fixes = this.generateAutoFixes(element, report, styles);

    // 7. Dispara alerta em tempo real se necessário
    if (this.realTimeAlerts && !report.isAccessible && this.alertCallback) {
      this.alertCallback(report);
    }

    return report;
  }

  /**
   * Verifica contraste de cores
   */
  checkColorContrast(element, styles = {}) {
    const result = {
      isAccessible: true,
      errors: [],
      warnings: [],
      suggestions: [],
      scores: { contrast: 100 }
    };

    try {
      // Obtém cores atuais e propostas
      const currentColors = this.getElementColors(element);
      const proposedColors = this.getProposedColors(currentColors, styles);

      if (!proposedColors.foreground || !proposedColors.background) {
        result.warnings.push('Não foi possível determinar as cores do elemento para verificação de contraste');
        result.scores.contrast = 80;
        return result;
      }

      // Calcula contraste
      const contrastRatio = this.calculateContrastRatio(
        proposedColors.foreground,
        proposedColors.background
      );

      // Determina se é texto grande
      const isLargeText = this.isLargeText(element, styles);

      // Verifica conformidade WCAG
      const wcagResult = this.evaluateWCAGContrast(contrastRatio, isLargeText);

      if (!wcagResult.passesAA) {
        result.isAccessible = false;
        result.errors.push(
          `Contraste insuficiente (${contrastRatio.toFixed(2)}:1). ` +
          `Mínimo necessário: ${wcagResult.requiredAA}:1 para ${isLargeText ? 'texto grande' : 'texto normal'}`
        );
        result.scores.contrast = Math.max(0, (contrastRatio / wcagResult.requiredAA) * 70);
      } else {
        result.scores.contrast = wcagResult.passesAAA ? 100 : 85;
      }

      if (!wcagResult.passesAAA && wcagResult.passesAA) {
        result.warnings.push(
          `Contraste atende ao padrão AA mas não AAA (${contrastRatio.toFixed(2)}:1). ` +
          `Para AAA, necessário: ${wcagResult.requiredAAA}:1`
        );
      }

      // Gera sugestões de cores melhores
      if (!wcagResult.passesAA) {
        const colorSuggestions = this.suggestBetterColors(
          proposedColors.background,
          isLargeText
        );
        result.suggestions.push(...colorSuggestions);
      }

      // Adiciona informações detalhadas
      result.contrastDetails = {
        ratio: contrastRatio,
        foreground: proposedColors.foreground,
        background: proposedColors.background,
        isLargeText,
        wcagLevel: wcagResult.passesAAA ? 'AAA' : wcagResult.passesAA ? 'AA' : 'Fail'
      };

    } catch (error) {
      result.errors.push(`Erro na verificação de contraste: ${error.message}`);
      result.scores.contrast = 0;
      result.isAccessible = false;
    }

    return result;
  }

  /**
   * Verifica estrutura semântica
   */
  checkSemanticStructure(element, styles = {}) {
    const result = {
      isAccessible: true,
      errors: [],
      warnings: [],
      suggestions: [],
      scores: { semantic: 100 }
    };

    const tagName = element.tagName.toLowerCase();

    try {
      // Verificações específicas por tipo de elemento
      switch (tagName) {
        case 'img':
          this.checkImageAccessibility(element, result);
          break;
        
        case 'button':
        case 'input':
          this.checkButtonAccessibility(element, result);
          break;
        
        case 'a':
          this.checkLinkAccessibility(element, result);
          break;
        
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          this.checkHeadingAccessibility(element, result);
          break;
        
        case 'form':
          this.checkFormAccessibility(element, result);
          break;
        
        case 'table':
          this.checkTableAccessibility(element, result);
          break;
        
        default:
          this.checkGenericElementAccessibility(element, result);
      }

      // Verifica se elemento criado dinamicamente precisa de role/aria
      if (styles && Object.keys(styles).length > 0) {
        this.checkDynamicElementRoles(element, styles, result);
      }

      // Calcula pontuação semântica
      const errorPenalty = result.errors.length * 30;
      const warningPenalty = result.warnings.length * 10;
      result.scores.semantic = Math.max(0, 100 - errorPenalty - warningPenalty);

    } catch (error) {
      result.errors.push(`Erro na verificação semântica: ${error.message}`);
      result.scores.semantic = 0;
      result.isAccessible = false;
    }

    return result;
  }

  /**
   * Verifica acessibilidade por teclado
   */
  checkKeyboardAccessibility(element) {
    const result = {
      isAccessible: true,
      errors: [],
      warnings: [],
      suggestions: [],
      scores: { keyboard: 100 }
    };

    const tagName = element.tagName.toLowerCase();
    const isInteractive = this.isInteractiveElement(element);

    if (isInteractive) {
      // Elementos interativos devem ser focáveis
      if (!this.isFocusable(element)) {
        result.isAccessible = false;
        result.errors.push('Elemento interativo não é focável por teclado');
        result.suggestions.push('Adicione tabindex="0" ao elemento');
        result.scores.keyboard -= 40;
      }

      // Deve ter indicação visual de foco
      const focusStyle = this.getFocusStyle(element);
      if (!focusStyle.hasOutline && !focusStyle.hasBoxShadow) {
        result.warnings.push('Elemento pode não ter indicação visual clara de foco');
        result.suggestions.push('Adicione estilo de foco visível (outline ou box-shadow)');
        result.scores.keyboard -= 15;
      }

      // Verifica se tem handlers de teclado adequados
      if (tagName === 'div' || tagName === 'span') {
        const hasKeyHandlers = this.hasKeyboardHandlers(element);
        if (!hasKeyHandlers) {
          result.warnings.push('Elemento customizado pode precisar de handlers de teclado (Enter/Space)');
          result.suggestions.push('Adicione event listeners para as teclas Enter e Space');
          result.scores.keyboard -= 20;
        }
      }
    }

    return result;
  }

  /**
   * Verificações específicas por tipo de elemento (método principal)
   */
  checkElementSpecificAccessibility(element, styles = {}) {
    const result = {
      isAccessible: true,
      errors: [],
      warnings: [],
      suggestions: [],
      scores: { specific: 100 }
    };

    const tagName = element.tagName.toLowerCase();

    try {
      // Verificações específicas por tipo de elemento
      switch (tagName) {
        case 'img':
          this.checkImageAccessibility(element, result);
          break;
        
        case 'button':
        case 'input':
          this.checkButtonAccessibility(element, result);
          break;
        
        case 'a':
          this.checkLinkAccessibility(element, result);
          break;
        
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          this.checkHeadingAccessibility(element, result);
          break;
        
        case 'form':
          this.checkFormAccessibility(element, result);
          break;
        
        case 'table':
          this.checkTableAccessibility(element, result);
          break;
        
        default:
          this.checkGenericElementAccessibility(element, result);
      }

      // Verifica se elemento criado dinamicamente precisa de role/aria
      if (styles && Object.keys(styles).length > 0) {
        this.checkDynamicElementRoles(element, styles, result);
      }

      // Calcula pontuação específica
      const errorPenalty = result.errors.length * 30;
      const warningPenalty = result.warnings.length * 10;
      result.scores.specific = Math.max(0, 100 - errorPenalty - warningPenalty);

    } catch (error) {
      result.errors.push(`Erro na verificação específica: ${error.message}`);
      result.scores.specific = 0;
      result.isAccessible = false;
    }

    return result;
  }

  /**
   * Verificações para elementos dinamicamente criados
   */
  checkDynamicElementRoles(element, styles, result) {
    const tagName = element.tagName.toLowerCase();
    
    // Se elemento genérico (div/span) está recebendo estilos que o tornam interativo
    if ((tagName === 'div' || tagName === 'span')) {
      const isClickable = styles.cursor === 'pointer' || 
                         element.onclick || 
                         element.addEventListener;
      
      if (isClickable && !element.getAttribute('role')) {
        result.warnings.push('Elemento interativo pode precisar de role apropriado (role="button")');
        result.suggestions.push('Adicione role="button" ou use elemento semântico como <button>');
      }
    }
    
    // Verifica se elementos com background-image precisam de alt text alternativo
    if (styles.backgroundImage && !element.getAttribute('aria-label')) {
      result.warnings.push('Imagem de fundo pode precisar de descrição (aria-label)');
      result.suggestions.push('Adicione aria-label descrevendo a imagem de fundo');
    }
  }

  /**
   * Verificações específicas por tipo de elemento
   */
  
  checkImageAccessibility(element, result) {
    const alt = element.getAttribute('alt');
    const role = element.getAttribute('role');

    if (!alt && role !== 'presentation' && role !== 'none') {
      result.isAccessible = false;
      result.errors.push('Imagem sem texto alternativo (atributo alt)');
      result.suggestions.push('Adicione atributo alt com descrição da imagem');
    }

    if (alt && alt.trim() === '') {
      result.warnings.push('Imagem com alt vazio - certifique-se que é decorativa');
    }

    if (alt && (alt.toLowerCase().includes('image') || alt.toLowerCase().includes('photo'))) {
      result.warnings.push('Evite palavras como "image" ou "photo" no alt text');
    }
  }

  checkButtonAccessibility(element, result) {
    const text = element.textContent?.trim();
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledBy = element.getAttribute('aria-labelledby');

    if (!text && !ariaLabel && !ariaLabelledBy) {
      result.isAccessible = false;
      result.errors.push('Botão sem texto ou label acessível');
      result.suggestions.push('Adicione texto visível, aria-label ou aria-labelledby');
    }

    if (text && text.length < 2) {
      result.warnings.push('Texto do botão muito curto para ser descritivo');
    }
  }

  checkLinkAccessibility(element, result) {
    const text = element.textContent?.trim();
    const ariaLabel = element.getAttribute('aria-label');
    const href = element.getAttribute('href');

    if (!text && !ariaLabel) {
      result.isAccessible = false;
      result.errors.push('Link sem texto acessível');
      result.suggestions.push('Adicione texto descritivo ou aria-label');
    }

    if (text && (text.toLowerCase() === 'clique aqui' || text.toLowerCase() === 'leia mais')) {
      result.warnings.push('Texto de link genérico não é informativo');
      result.suggestions.push('Use texto que descreva o destino do link');
    }

    if (href && href.startsWith('javascript:')) {
      result.warnings.push('Link com javascript: pode não funcionar com teclado');
      result.suggestions.push('Considere usar button com onclick em vez de link');
    }
  }

  checkHeadingAccessibility(element, result) {
    const text = element.textContent?.trim();
    const level = parseInt(element.tagName.charAt(1));

    if (!text) {
      result.isAccessible = false;
      result.errors.push('Cabeçalho vazio');
      result.suggestions.push('Adicione texto descritivo ao cabeçalho');
    }

    // Verifica hierarquia de cabeçalhos (simplificado)
    const previousHeading = this.findPreviousHeading(element);
    if (previousHeading) {
      const prevLevel = parseInt(previousHeading.tagName.charAt(1));
      if (level > prevLevel + 1) {
        result.warnings.push(`Possível pulo na hierarquia de cabeçalhos (h${prevLevel} para h${level})`);
        result.suggestions.push('Mantenha sequência lógica de cabeçalhos');
      }
    }
  }

  checkFormAccessibility(element, result) {
    const inputs = element.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      const label = id ? element.querySelector(`label[for="${id}"]`) : null;

      if (!label && !ariaLabel && !ariaLabelledBy) {
        result.errors.push(`Campo de formulário sem label associado: ${input.tagName}`);
        result.suggestions.push('Associe labels aos campos com "for" e "id" ou use aria-label');
      }
    });
  }

  checkTableAccessibility(element, result) {
    const hasCaption = element.querySelector('caption');
    const hasThElements = element.querySelectorAll('th').length > 0;

    if (!hasCaption) {
      result.warnings.push('Tabela sem caption para descrição');
      result.suggestions.push('Adicione elemento <caption> descrevendo o conteúdo da tabela');
    }

    if (!hasThElements) {
      result.warnings.push('Tabela sem cabeçalhos (elementos th)');
      result.suggestions.push('Use elementos <th> para cabeçalhos de coluna/linha');
    }
  }

  checkGenericElementAccessibility(element, result) {
    const role = element.getAttribute('role');
    const isClickable = element.onclick || element.addEventListener;

    // Se elemento tem comportamento interativo mas não é semanticamente interativo
    if (isClickable && !this.isInteractiveElement(element) && !role) {
      result.warnings.push('Elemento com comportamento interativo pode precisar de role apropriado');
      result.suggestions.push('Considere adicionar role="button" ou usar elemento semântico');
    }
  }

  /**
   * Cálculos de cor e contraste
   */
  
  getElementColors(element) {
    const computedStyle = window.getComputedStyle(element);
    
    return {
      foreground: computedStyle.color,
      background: this.getEffectiveBackgroundColor(element)
    };
  }

  getProposedColors(currentColors, styles) {
    return {
      foreground: styles.color || currentColors.foreground,
      background: styles.backgroundColor || currentColors.background
    };
  }

  getEffectiveBackgroundColor(element) {
    let currentElement = element;
    
    while (currentElement && currentElement !== document.body) {
      const computedStyle = window.getComputedStyle(currentElement);
      const bgColor = computedStyle.backgroundColor;
      
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        return bgColor;
      }
      
      currentElement = currentElement.parentElement;
    }
    
    return '#ffffff'; // Assume fundo branco como padrão
  }

  calculateContrastRatio(foreground, background) {
    const cacheKey = `${foreground}-${background}`;
    if (this.colorCache.has(cacheKey)) {
      return this.colorCache.get(cacheKey);
    }

    const fgLuminance = this.getRelativeLuminance(foreground);
    const bgLuminance = this.getRelativeLuminance(background);
    
    const contrast = (Math.max(fgLuminance, bgLuminance) + 0.05) / 
                    (Math.min(fgLuminance, bgLuminance) + 0.05);
    
    this.colorCache.set(cacheKey, contrast);
    return contrast;
  }

  getRelativeLuminance(color) {
    const rgb = this.parseColor(color);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  parseColor(color) {
    if (!color) return null;

    // RGB/RGBA
    let match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }

    // Hex
    match = color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (match) {
      return [
        parseInt(match[1], 16),
        parseInt(match[2], 16),
        parseInt(match[3], 16)
      ];
    }

    // Hex abreviado
    match = color.match(/^#([a-f\d])([a-f\d])([a-f\d])$/i);
    if (match) {
      return [
        parseInt(match[1] + match[1], 16),
        parseInt(match[2] + match[2], 16),
        parseInt(match[3] + match[3], 16)
      ];
    }

    // Cores nomeadas básicas
    const namedColors = {
      black: [0, 0, 0],
      white: [255, 255, 255],
      red: [255, 0, 0],
      green: [0, 128, 0],
      blue: [0, 0, 255]
    };

    return namedColors[color.toLowerCase()] || null;
  }

  /**
   * Avaliação WCAG e sugestões
   */
  
  evaluateWCAGContrast(ratio, isLargeText) {
    const requiredAA = isLargeText ? this.contrastRatios.AA_LARGE : this.contrastRatios.AA_NORMAL;
    const requiredAAA = isLargeText ? this.contrastRatios.AAA_LARGE : this.contrastRatios.AAA_NORMAL;

    return {
      passesAA: ratio >= requiredAA,
      passesAAA: ratio >= requiredAAA,
      requiredAA,
      requiredAAA
    };
  }

  isLargeText(element, styles = {}) {
    const computedStyle = window.getComputedStyle(element);
    const fontSize = styles.fontSize || computedStyle.fontSize;
    const fontWeight = styles.fontWeight || computedStyle.fontWeight;

    const sizeInPx = parseFloat(fontSize);
    const weightNum = parseInt(fontWeight) || (fontWeight === 'bold' ? 700 : 400);

    // 18pt+ (24px+) ou 14pt+ (18.7px+) se bold
    return sizeInPx >= 24 || (sizeInPx >= 18.7 && weightNum >= 700);
  }

  suggestBetterColors(backgroundColor, isLargeText) {
    const suggestions = [];
    const requiredRatio = isLargeText ? this.contrastRatios.AA_LARGE : this.contrastRatios.AA_NORMAL;

    // Testa cores da paleta
    for (const [category, colors] of Object.entries(this.safeColorPalettes)) {
      for (const colorInfo of colors) {
        const ratio = this.calculateContrastRatio(colorInfo.color, backgroundColor);
        if (ratio >= requiredRatio) {
          suggestions.push({
            color: colorInfo.color,
            name: colorInfo.name,
            category,
            contrastRatio: ratio.toFixed(2),
            wcagLevel: ratio >= (isLargeText ? this.contrastRatios.AAA_LARGE : this.contrastRatios.AAA_NORMAL) ? 'AAA' : 'AA'
          });
        }
      }
    }

    return suggestions.slice(0, 5); // Limita a 5 sugestões
  }

  /**
   * Verificações de interatividade
   */
  
  isInteractiveElement(element) {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    const tagName = element.tagName.toLowerCase();
    
    return interactiveTags.includes(tagName) || 
           element.hasAttribute('onclick') ||
           element.hasAttribute('tabindex') ||
           element.getAttribute('role') === 'button';
  }

  isFocusable(element) {
    const tabIndex = element.getAttribute('tabindex');
    
    if (tabIndex !== null) {
      return parseInt(tabIndex) >= 0;
    }

    const focusableTags = ['button', 'input', 'select', 'textarea', 'a'];
    return focusableTags.includes(element.tagName.toLowerCase());
  }

  getFocusStyle(element) {
    const computedStyle = window.getComputedStyle(element, ':focus');
    
    return {
      hasOutline: computedStyle.outline !== 'none',
      hasBoxShadow: computedStyle.boxShadow !== 'none'
    };
  }

  hasKeyboardHandlers(element) {
    // Verifica se tem event listeners (limitado pelo que podemos detectar)
    const events = ['keydown', 'keyup', 'keypress'];
    return events.some(event => {
      try {
        // Não podemos detectar todos os listeners, mas tentamos alguns padrões
        return element.getAttribute(`on${event}`) !== null;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Utilitários
   */
  
  findPreviousHeading(element) {
    let current = element.previousElementSibling;
    
    while (current) {
      if (/^h[1-6]$/i.test(current.tagName)) {
        return current;
      }
      current = current.previousElementSibling;
    }
    
    return null;
  }

  mergeResult(target, source) {
    target.isAccessible = target.isAccessible && source.isAccessible;
    target.errors.push(...source.errors);
    target.warnings.push(...source.warnings);
    target.suggestions.push(...source.suggestions);
    
    if (source.scores) {
      Object.assign(target.scores, source.scores);
    }
  }

  calculateOverallScore(report) {
    const scores = Object.values(report.scores).filter(score => score !== null);
    if (scores.length === 0) return 0;
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  generateAutoFixes(element, report, styles) {
    const fixes = [];

    // Fixes para problemas de contraste
    if (report.contrastDetails && !report.contrastDetails.wcagLevel !== 'Fail') {
      const colorSuggestions = this.suggestBetterColors(
        report.contrastDetails.background,
        report.contrastDetails.isLargeText
      );
      
      if (colorSuggestions.length > 0) {
        fixes.push({
          type: 'color_contrast',
          description: 'Corrigir contraste de cores',
          action: 'apply_style',
          style: { color: colorSuggestions[0].color },
          reason: `Melhora contraste para ${colorSuggestions[0].contrastRatio}:1 (${colorSuggestions[0].wcagLevel})`
        });
      }
    }

    // Fixes para problemas semânticos
    if (report.errors.some(error => error.includes('alt'))) {
      fixes.push({
        type: 'semantic',
        description: 'Adicionar texto alternativo',
        action: 'add_attribute',
        attribute: { alt: 'Descreva esta imagem' },
        reason: 'Melhora acessibilidade para leitores de tela'
      });
    }

    return fixes;
  }

  /**
   * API pública
   */
  
  setRealTimeAlerts(enabled, callback = null) {
    this.realTimeAlerts = enabled;
    this.alertCallback = callback;
  }

  checkMultipleElements(elements, styles = {}) {
    return elements.map(element => this.checkElementAccessibility(element, styles));
  }

  getBestColorForBackground(backgroundColor, textType = 'normal') {
    const isLarge = textType === 'large';
    const suggestions = this.suggestBetterColors(backgroundColor, isLarge);
    return suggestions[0] || null;
  }

  validateColorCombination(foreground, background, textType = 'normal') {
    const ratio = this.calculateContrastRatio(foreground, background);
    const isLarge = textType === 'large';
    return this.evaluateWCAGContrast(ratio, isLarge);
  }

  clearColorCache() {
    this.colorCache.clear();
  }
}

export default AccessibilityChecker;