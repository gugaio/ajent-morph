class ElementInspector {
  constructor() {
    // Propriedades CSS mais relevantes para design systems
    this.designProperties = {
      // Layout & Positioning
      layout: [
        'display', 'position', 'top', 'right', 'bottom', 'left',
        'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
        'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
        'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'boxSizing', 'overflow', 'overflowX', 'overflowY'
      ],
        
      // Typography
      typography: [
        'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
        'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration',
        'textTransform', 'textIndent', 'wordSpacing', 'whiteSpace'
      ],
        
      // Colors & Backgrounds
      colors: [
        'color', 'backgroundColor', 'backgroundImage', 'backgroundPosition',
        'backgroundSize', 'backgroundRepeat', 'backgroundAttachment',
        'opacity', 'visibility'
      ],
        
      // Borders & Effects
      borders: [
        'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
        'borderWidth', 'borderStyle', 'borderColor', 'borderRadius',
        'borderTopLeftRadius', 'borderTopRightRadius', 
        'borderBottomLeftRadius', 'borderBottomRightRadius',
        'boxShadow', 'outline', 'outlineWidth', 'outlineStyle', 'outlineColor'
      ],
        
      // Flexbox & Grid
      flexbox: [
        'flexDirection', 'flexWrap', 'justifyContent', 'alignItems',
        'alignContent', 'flex', 'flexGrow', 'flexShrink', 'flexBasis',
        'alignSelf', 'order'
      ],
        
      grid: [
        'gridTemplateColumns', 'gridTemplateRows', 'gridTemplateAreas',
        'gridColumnStart', 'gridColumnEnd', 'gridRowStart', 'gridRowEnd',
        'gridArea', 'gridGap', 'gridColumnGap', 'gridRowGap',
        'justifyItems', 'alignItems'
      ],
        
      // Transforms & Animations
      effects: [
        'transform', 'transformOrigin', 'transition', 'animation',
        'filter', 'backdropFilter', 'clipPath', 'mask'
      ]
    };
  }
    
  /**
     * Extrai todas as propriedades CSS computadas do elemento
     */
  getComputedProperties(element) {
    if (!element || !element.nodeType) {
      throw new Error('Invalid DOM element provided');
    }
      
    const computedStyle = window.getComputedStyle(element);
    const properties = {};
      
    // Extrai todas as propriedades definidas
    Object.values(this.designProperties).flat().forEach(prop => {
      const value = computedStyle.getPropertyValue(this.camelToKebab(prop));
      if (value && value !== 'auto' && value !== 'normal' && value !== 'none') {
        properties[prop] = value;
      }
    });
      
    return properties;
  }
    
  /**
     * Extrai informações estruturais do elemento
     */
  getElementInfo(element) {
    const rect = element.getBoundingClientRect();
      
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: Array.from(element.classList),
      attributes: this.getRelevantAttributes(element),
      dimensions: {
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y
      },
      textContent: element.textContent?.trim() || null,
      innerHTML: element.innerHTML?.length > 200 
        ? element.innerHTML.substring(0, 200) + '...' 
        : element.innerHTML
    };
  }
    
  /**
     * Detecta se o elemento faz parte de um design system
     */
  detectDesignSystemTokens(element) {
    const tokens = {
      component: null,
      variant: null,
      tokens: {},
      framework: null
    };
      
    // Detecta atributos de design system
    if (element.dataset.component) {
      tokens.component = element.dataset.component;
    }
      
    if (element.dataset.variant) {
      tokens.variant = element.dataset.variant;
    }
      
    if (element.dataset.tokens) {
      try {
        tokens.tokens = JSON.parse(element.dataset.tokens);
      } catch (e) {
        // Ignora se não for JSON válido
      }
    }
      
    // Detecta frameworks comuns
    const classList = Array.from(element.classList);
      
    // Tailwind CSS
    if (classList.some(cls => /^(bg-|text-|p-|m-|w-|h-|rounded|shadow)/.test(cls))) {
      tokens.framework = 'tailwind';
      tokens.tokens.tailwind = classList.filter(cls => 
        /^(bg-|text-|p-|m-|w-|h-|rounded|shadow|border|flex|grid)/.test(cls)
      );
    }
      
    // Bootstrap
    if (classList.some(cls => /^(btn|card|container|row|col|nav|alert)/.test(cls))) {
      tokens.framework = 'bootstrap';
      tokens.tokens.bootstrap = classList.filter(cls => 
        /^(btn|card|container|row|col|nav|alert|bg-|text-)/.test(cls)
      );
    }
      
    // Material-UI / MUI
    if (classList.some(cls => /^(Mui|MuiButton|MuiCard)/.test(cls))) {
      tokens.framework = 'mui';
      tokens.tokens.mui = classList.filter(cls => cls.startsWith('Mui'));
    }
      
    return tokens;
  }
    
  /**
     * Gera um prompt estruturado para a LLM
     */
  generateContextPrompt(element, userCommand) {
    const computedProps = this.getComputedProperties(element);
    const elementInfo = this.getElementInfo(element);
    const designTokens = this.detectDesignSystemTokens(element);
      
    const context = {
      element: {
        tag: elementInfo.tagName,
        id: elementInfo.id,
        classes: elementInfo.classes,
        text: elementInfo.textContent,
        dimensions: elementInfo.dimensions
      },
        
      currentStyles: this.categorizeProperties(computedProps),
        
      designSystem: designTokens,
        
      userCommand: userCommand,
        
      // Contexto adicional
      metadata: {
        isVisible: this.isElementVisible(element),
        isInteractive: this.isInteractiveElement(element),
        hasChildren: element.children.length > 0,
        parentTag: element.parentElement?.tagName.toLowerCase(),
        siblings: element.parentElement?.children.length || 0
      }
    };
      
    return this.formatPrompt(context);
  }
    
  /**
     * Categoriza propriedades por tipo
     */
  categorizeProperties(properties) {
    const categorized = {};
      
    Object.entries(this.designProperties).forEach(([category, props]) => {
      categorized[category] = {};
      props.forEach(prop => {
        if (properties[prop]) {
          categorized[category][prop] = properties[prop];
        }
      });
        
      // Remove categorias vazias
      if (Object.keys(categorized[category]).length === 0) {
        delete categorized[category];
      }
    });
      
    return categorized;
  }
    
  /**
     * Formata o prompt para a LLM
     */
  formatPrompt(context) {
    return `
  ELEMENTO SELECIONADO:
  - Tag: ${context.element.tag}
  - Classes: ${context.element.classes.join(', ') || 'nenhuma'}
  - ID: ${context.element.id || 'nenhum'}
  - Texto: "${context.element.text || 'sem texto'}"
  - Dimensões: ${context.element.dimensions.width}x${context.element.dimensions.height}px
  
  ESTILOS ATUAIS:
  ${this.formatStyles(context.currentStyles)}
  
  DESIGN SYSTEM DETECTADO:
  ${context.designSystem.framework ? `Framework: ${context.designSystem.framework}` : 'Nenhum framework detectado'}
  ${context.designSystem.component ? `Componente: ${context.designSystem.component}` : ''}
  ${context.designSystem.variant ? `Variante: ${context.designSystem.variant}` : ''}
  
  COMANDO DO USUÁRIO: "${context.userCommand}"
  
  CONTEXTO:
  - Elemento visível: ${context.metadata.isVisible}
  - Elemento interativo: ${context.metadata.isInteractive}
  - Tem filhos: ${context.metadata.hasChildren}
  - Elemento pai: ${context.metadata.parentTag || 'nenhum'}
  
  Por favor, interprete o comando e retorne as modificações CSS necessárias em formato JSON:
  {
    "action": "descrição da ação",
    "styles": { "propriedade": "valor" },
    "explanation": "explicação do que foi feito"
  }
      `.trim();
  }
    
  /**
     * Formata estilos para exibição
     */
  formatStyles(styles) {
    let formatted = '';
      
    Object.entries(styles).forEach(([category, props]) => {
      if (Object.keys(props).length > 0) {
        formatted += `\n${category.toUpperCase()}:\n`;
        Object.entries(props).forEach(([prop, value]) => {
          formatted += `  ${prop}: ${value}\n`;
        });
      }
    });
      
    return formatted || '  Nenhum estilo relevante detectado';
  }
    
  /**
     * Utilitários
     */
  camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }
    
  getRelevantAttributes(element) {
    const relevant = {};
    const attrs = ['role', 'aria-label', 'data-testid', 'href', 'type', 'value'];
      
    attrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) relevant[attr] = value;
    });
      
    return relevant;
  }
    
  isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0';
  }
    
  isInteractiveElement(element) {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    const interactiveRoles = ['button', 'link', 'textbox', 'listbox'];
      
    return interactiveTags.includes(element.tagName.toLowerCase()) ||
             interactiveRoles.includes(element.getAttribute('role')) ||
             element.hasAttribute('onclick') ||
             element.style.cursor === 'pointer';
  }
}

export default ElementInspector;