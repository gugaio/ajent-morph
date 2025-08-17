import { Agent, Tool } from 'ajent';
import ResponseApplier from '../core/ResponseApplier.js';

class UXAgent extends Agent {
  constructor() {
    super('ux_agent', 'Expert in UX designer, executing DOM manipulation and CSS styling based on natural language commands');
    
    // Initialize ResponseApplier for applying styles and maintaining history
    this.applier = new ResponseApplier();

    this.addTool(new Tool('applyStyles', 'Apply CSS styles to selected elements and return success status. Call with: {"description": "what_will_happen_visually", "styles": {"cssProperty": "value"}, "elementSelectors": ["#id", ".class", "tagname"]}', ({ description, styles, elementSelectors }) => this.applyStylesWrapper({ description, styles, elementSelectors })));
    this.addTool(new Tool('generateImage', 'Generate an image using OpenAI API and apply it to elements or create new elements with the image. Call with: {"description": "what_image_to_generate", "prompt": "detailed_image_description", "elementSelectors": ["#id", ".class"], "applyAs": "background|element"}', ({ description, prompt, elementSelectors, applyAs }) => this.generateImageWrapper({description, prompt, elementSelectors, applyAs})));
    this.addTool(new Tool('generateClaudeCodeInstructions', 'Generate instructions for Claude Code IDE to implement frontend changes based on change history. Call without parameters: generateClaudeCodeInstructions()', () => this.generateClaudeCodeInstructions()));
  }

  instruction = () => {
    return `
  Você é especialista em manipulação do DOM.  
  Sua função: interpretar comandos do usuário e executar UMA única tool abaixo.
  
  ## TOOLS DISPONÍVEIS
  1. **applyStyles** – Alterar estilo visual de elementos  
     {
       "description": "Mudança visual",
       "styles": { "propriedadeCSS": "valor" },
       "elementSelectors": ["#id", ".classe"]
     }
  
  2. **generateImage** – Criar imagem e aplicar em elementos ou como novo <img>  
     {
       "description": "O que será gerado/aplicado",
       "prompt": "Prompt detalhado (PT/EN)",
       "elementSelectors": ["#id", ".classe"], // pode ser []
       "applyAs": "background" | "element"
     }
  
  3. **generateClaudeCodeInstructions** – Gerar instruções para Claude Code IDE  
     generateClaudeCodeInstructions()  
     Retorna JSON com changeHistory e imageDownloads para criar instruções detalhadas.
  
  ## REGRAS CRÍTICAS
  - Apenas **1 tool por comando**.
  - Use **sempre** "elementSelectors" (array de seletores CSS), **nunca** "selectedElements".
  - Responder perguntas de **informação** sem usar tools, lendo computedStyles.
  - Em substituições ("trocar", "substituir"), aplique direto (sem deleteElement).
  - CSS sempre válido, com unidades corretas quando necessário.
  
  ## ⚠️ ERROS COMUNS A EVITAR
  - ❌ \`selectedElements\` → ✅ Use "elementSelectors": ["#id", ".classe"]  
  - ❌ CSS inválido: \`"color red"\` → ✅ \`"color": "red"\`  
  - ❌ Sem unidade: \`"fontSize": "16"\` → ✅ \`"fontSize": "16px"\`  
  - ❌ Mais de uma tool por comando → ✅ Sempre apenas uma  
  - ❌ Usar tool para responder cor/tamanho → ✅ Responda com dados do computedStyles
  
  ## MAPEAMENTO DE INTENÇÃO
  - Modificar estilo → applyStyles  
  - Adicionar/aplicar imagem → generateImage  
  - Gerar instruções para IDE → generateClaudeCodeInstructions
  
  ## EXEMPLOS RÁPIDOS
  "Deixe o texto azul" → applyStyles({ description: "...", styles: { color: "blue" }, elementSelectors: ["#id"] })
  
  "Adicione imagem de gato" → generateImage({ description: "...", prompt: "cute orange cat", elementSelectors: [], applyAs: "element" })
  
  "Gerar instruções Claude Code" → generateClaudeCodeInstructions()
    `;
  };

  async applyStylesWrapper(params) {
    console.log('applyStylesWrapper called with params:', params);
    
    // Dispatch tool start event for UI feedback
    const toolInfo = {
      tool: 'applyStyles',
      description: params?.description || 'Aplicando modificações de estilo',
      target: params?.elementSelectors?.join(', ') || 'elementos selecionados'
    };
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ajentToolStart', { detail: toolInfo }));
    }
    
    if (!params) {
      throw new Error('Description, styles, and elementSelectors parameters are required');
    }
    
    // Handle case where Ajent framework wraps params in {params: 'stringified_json'}
    let actualParams = params;
    if (params.params && typeof params.params === 'string') {
      try {
        actualParams = JSON.parse(params.params);
        console.log('Parsed actualParams for applyStyles:', actualParams);
      } catch (error) {
        console.warn('Failed to parse params.params:', error);
        actualParams = params;
      }
    }
    
    let selectedElements = [];    // Handle new elementSelectors format
    if (actualParams.elementSelectors) {
      console.log('elementSelectors received:', actualParams.elementSelectors);
      selectedElements = this.reconstructElementsFromSelectors(actualParams.elementSelectors);
      console.log('Reconstructed elements:', selectedElements);
    }
    // Handle legacy selectedElements format (in case it's still used)
    else if (actualParams.selectedElements) {
      console.log('selectedElements received (legacy):', actualParams.selectedElements);
      // Try to use them directly if they're valid DOM elements
      selectedElements = actualParams.selectedElements.filter(el => 
        el && el.nodeType && el.nodeType === Node.ELEMENT_NODE
      );
    }
    // Handle case where selectors come from currentElementSelectors (set by CommandProcessor)
    else if (this.currentElementSelectors && this.currentElementSelectors.length > 0) {
      console.log('Using currentElementSelectors:', this.currentElementSelectors);
      selectedElements = this.reconstructElementsFromSelectors(this.currentElementSelectors);
    }
    // Fallback to currentSelectedElements
    else if (this.currentSelectedElements && this.currentSelectedElements.length > 0) {
      console.log('Using currentSelectedElements (fallback):', this.currentSelectedElements);
      selectedElements = this.currentSelectedElements;
    }
    
    if (selectedElements.length === 0) {
      throw new Error('elementSelectors parameter is required. Cannot apply styles without target elements.');
    }
    
    // Call the main applyStyles method with reconstructed elements
    try {
      const result = await this.applyStyles({
        description: actualParams.description,
        styles: actualParams.styles,
        selectedElements: selectedElements
      });
      
      // Dispatch success event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ajentToolSuccess', {
          detail: {
            tool: 'applyStyles',
            result: result
          }
        }));
      }
      
      return result;
    } catch (error) {
      // Dispatch error event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ajentToolError', {
          detail: {
            tool: 'applyStyles',
            error: error.message
          }
        }));
      }
      throw error;
    }
  }

  async generateClaudeCodeInstructions(params) {
    // Return raw change history for LLM to process
    console.log('generateClaudeCodeInstructions called with params:', params);
    
    try {
      // Get raw change history from ResponseApplier
      const history = this.applier.getHistory();
      
      if (!history || history.length === 0) {
        return 'No changes made yet. Make some modifications first before requesting instructions.';
      }
      
      // Return processed history data as JSON string for LLM to analyze
      const historyData = {
        changeHistory: history,
        totalChanges: history.length,
        message: `Raw change history with ${history.length} modifications ready for Claude Code instruction generation.`
      };
      
      return JSON.stringify(historyData, null, 2);
      
    } catch (error) {
      console.error('Error getting change history:', error);
      return `Failed to get change history: ${error.message}`;
    }
  }


  async generateImageWrapper(params) {
    console.log('generateImageWrapper called with params:', params);
    
    if (!params) {
      throw new Error('Description and prompt parameters are required');
    }
    
    // Handle case where Ajent framework wraps params in {params: 'stringified_json'}
    let actualParams = params;
    if (params.params && typeof params.params === 'string') {
      try {
        actualParams = JSON.parse(params.params);
        console.log('Parsed actualParams for generateImage:', actualParams);
      } catch (error) {
        console.warn('Failed to parse params.params:', error);
        actualParams = params;
      }
    }
    
    let elementSelectors = [];
    
    // Handle elementSelectors
    if (actualParams.elementSelectors) {
      elementSelectors = actualParams.elementSelectors;
    }
    // Handle case where selectors come from currentElementSelectors
    else if (this.currentElementSelectors && this.currentElementSelectors.length > 0) {
      elementSelectors = this.currentElementSelectors;
    }
    
    // Validate required parameters
    if (!actualParams.description) {
      throw new Error('Description parameter is required');
    }
    
    if (!actualParams.prompt || !actualParams.prompt.trim()) {
      throw new Error('Prompt parameter is required for image generation');
    }
    
    return this.generateImage({
      description: actualParams.description,
      prompt: actualParams.prompt,
      elementSelectors: elementSelectors,
      applyAs: actualParams.applyAs || 'background'
    });
  }

  async generateImage(params) {
    const { description, prompt, elementSelectors = [], applyAs = 'background' } = params;
    
    if (!description) {
      return 'Descrição é obrigatória para gerar imagem.';
    }
    
    if (!prompt || !prompt.trim()) {
      return 'Prompt é obrigatório para gerar imagem.';
    }
    
    try {
      
      // Call OpenAI API to generate image
      console.log('🎨 Generating image with prompt:', prompt);
      
      //const url = 'https://spinal.onrender.com/text-to-image';
      const url = 'http://localhost:5000/text-to-image';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': 'faab7706-adec-498e-bf2a-6da0ffe8ae82'
        },
        body: JSON.stringify({
          prompt: prompt,
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'standard',
          n: 1
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Image generated successfully:', result);
      
      
      // Extract image URL from response
      let imageUrl;
      if (result.images && result.images.length > 0) {
        // Handle the actual API response format: {images: ['url1', 'url2']}
        imageUrl = result.images[0];
      } else if (result.data && result.data.length > 0 && result.data[0].url) {
        // Handle OpenAI standard format (fallback)
        imageUrl = result.data[0].url;
      } else if (result.url) {
        // Handle direct URL format (fallback)
        imageUrl = result.url;
      } else {
        console.error('Unexpected API response format:', result);
        throw new Error('No image URL found in API response');
      }

      console.log('🖼️ Image URL:', imageUrl);

      // Apply the image based on the applyAs parameter
      if (applyAs === 'background' && elementSelectors.length > 0) {
        
        // Apply as background image to selected elements
        const elements = this.reconstructElementsFromSelectors(elementSelectors);
        
        if (elements.length === 0) {
          return `❌ Nenhum elemento encontrado com os seletores fornecidos: ${elementSelectors.join(', ')}.`;
        }

        let successCount = 0;
        for (const element of elements) {
          try {
            // Apply background image
            await this.applier.applyLLMResponse({
              action: 'apply_background_image',
              explanation: `Imagem de fundo aplicada: ${description}`,
              styles: {
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }
            }, element, `generateImage: ${description}`);
            
            successCount++;
          } catch (error) {
            console.error('Error applying background image:', error);
          }
        }

        return `✅ Imagem gerada e aplicada como fundo: ${description}. Background aplicado em ${successCount} elemento(s). URL: ${imageUrl}`;
        
      } else {
        // Create new img element
        const imgElement = document.createElement('img');
        imgElement.src = imageUrl;
        imgElement.alt = description;
        imgElement.style.cssText = 'max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin: 10px;';
        
        // Insert into DOM
        const insertionMode = this.determineInsertionMode(description, elementSelectors);
        const insertionInfo = this.findInsertionPoint(elementSelectors, insertionMode);
        this.insertElementAtPoint(imgElement, insertionInfo);
        
        // Add visual indicator for new element
        this.addNewElementIndicator(imgElement);
        
        // Track in history
        await this.applier.applyLLMResponse({
          action: 'create_image_element',
          explanation: `Elemento de imagem criado: ${description}`,
          styles: {},
          html: imgElement.outerHTML,
          imageUrl: imageUrl
        }, imgElement, `generateImage: ${description}`);
        
        return `✅ Imagem gerada e elemento criado: ${description}. Nova imagem adicionada à página. URL: ${imageUrl}`;
      }
      
    } catch (error) {
      console.error('❌ Error generating image:', error);
      
      // Show error and hide progress
      this.updateProgress(`Erro na geração: ${error.message}`, 'error');
      setTimeout(() => this.hideProgress(), 3000);
      
      return `Erro ao gerar imagem: ${error.message}`;
    }
  }

  reconstructElementsFromSelectors(selectors) {
    if (!Array.isArray(selectors)) {
      return [];
    }

    const elements = [];
    for (const selector of selectors) {
      if (typeof selector === 'string') {
        try {
          // Escape Tailwind CSS special characters for CSS selectors
          const escapedSelector = this.escapeCSSSelector(selector);
          
          // Use querySelectorAll to get all matching elements instead of just the first
          const foundElements = document.querySelectorAll(escapedSelector);
          if (foundElements.length > 0) {
            // Convert NodeList to Array and add all elements
            elements.push(...Array.from(foundElements));
            console.log(`Found ${foundElements.length} elements matching selector "${selector}" (escaped: "${escapedSelector}")`);
          } else {
            console.warn(`No elements found for selector "${selector}" (escaped: "${escapedSelector}")`);
          }
        } catch (error) {
          console.warn(`Failed to find elements with selector "${selector}":`, error);
        }
      }
    }
    return elements;
  }

  /**
   * Escapes special characters in CSS selectors for Tailwind CSS compatibility
   * @param {string} selector - The CSS selector to escape
   * @returns {string} - The escaped CSS selector
   */
  escapeCSSSelector(selector) {
    // Handle Tailwind CSS classes with special characters
    return selector
      // Escape brackets [ and ]
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      // Escape colons (for pseudo-selectors and Tailwind modifiers)
      .replace(/:/g, '\\:')
      // Escape forward slashes
      .replace(/\//g, '\\/')
      // Escape parentheses
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      // Escape dots in values (but not class separators)
      .replace(/(\[[^\]]*)\./g, '$1\\.')
      // Escape percentage signs
      .replace(/%/g, '\\%')
      // Escape plus signs
      .replace(/\+/g, '\\+');
  }

  async validateStylesWrapper(params) {
    console.log('validateStylesWrapper called with params:', params);
    
    if (!params) {
      throw new Error('Styles parameter is required');
    }
    
    // Handle case where Ajent framework wraps params in {params: 'stringified_json'}
    let actualParams = params;
    if (params.params && typeof params.params === 'string') {
      try {
        actualParams = JSON.parse(params.params);
      } catch (error) {
        console.warn('Failed to parse params.params:', error);
        actualParams = params;
      }
    }
    
    if (actualParams.styles) {
      return this.validateStyles(actualParams);
    }
    
    if (typeof actualParams === 'object') {
      return this.validateStyles({ styles: actualParams });
    }
    
    throw new Error('Invalid styles format');
  }
  
  async applyStyles(params) {
    // Defensive parameter validation
    if (!params) {
      console.error('applyStyles called with undefined params');
      return JSON.stringify({
        status: 'error',
        message: 'Parameters object is required',
        should_continue: false,
        data: null
      });
    }

    const { description, styles, selectedElements = [] } = params;

    if (!description) {
      console.error('applyStyles called without description:', params);
      return JSON.stringify({
        status: 'error',
        message: 'Description parameter is required',
        should_continue: false,
        data: null
      });
    }

    if (!styles) {
      console.error('applyStyles called without styles:', params);
      return JSON.stringify({
        status: 'error',
        message: 'Styles parameter is required',
        should_continue: false,
        data: null
      });
    }

    if (!selectedElements || selectedElements.length === 0) {
      return JSON.stringify({
        status: 'error',
        message: 'Nenhum elemento selecionado para aplicar estilos.',
        should_continue: false,
        data: null
      });
    }

    // Validate and normalize the provided styles
    const normalizedStyles = this.normalizeStyles(styles);

    // Validate CSS properties
    const validation = await this.validateStyles(normalizedStyles);

    if (!validation.isValid) {
      console.info('Some styles were filtered during validation:', validation.errors);
      // Continue with valid styles only - this is expected behavior
    }

    // Apply styles to each selected element
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < selectedElements.length; i++) {
      const element = selectedElements[i];

      // Validate that element is a proper DOM element
      if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
        failureCount++;
        results.push({
          element: { tagName: 'invalid', id: null, classes: [], textContent: '' },
          success: false,
          error: 'Invalid DOM element'
        });
        continue;
      }

      try {
        // Use ResponseApplier to apply styles and maintain history
        const result = await this.applier.applyLLMResponse(
          {
            action: description,
            styles: validation.valid,
            explanation: description
          },
          element,
          `applyStyles: ${description}`
        );

        if (result.success) {
          successCount++;
          results.push({ element, success: true });
        } else {
          failureCount++;
          results.push({ element, success: false, error: result.error });
        }
      } catch (error) {
        failureCount++;
        results.push({ element, success: false, error: error.message });
      }
    }

    return JSON.stringify({
      status: 'success',
      message: 'Styles applied successfully',
      should_continue: true,
      data: {
        successCount,
        failureCount,
        results
      }
    });
  }

  normalizeStyles(styles) {
    const normalized = {};
    
    Object.entries(styles).forEach(([prop, value]) => {
      // Normalize color values
      if (prop === 'color' || prop === 'backgroundColor' || prop === 'borderColor') {
        normalized[prop] = this.normalizeColor(value);
      }
      // Normalize size values
      else if (prop.includes('Size') || prop.includes('Width') || prop.includes('Height') || 
               prop.includes('margin') || prop.includes('padding') || prop === 'borderRadius') {
        normalized[prop] = this.normalizeSize(value);
      }
      // Keep other values as-is
      else {
        normalized[prop] = value;
      }
    });
    
    return normalized;
  }

  normalizeColor(color) {
    const colorMap = {
      'azul': '#3B82F6',
      'vermelho': '#EF4444', 
      'verde': '#10B981',
      'amarelo': '#F59E0B',
      'roxo': '#8B5CF6',
      'rosa': '#EC4899',
      'cinza': '#6B7280',
      'preto': '#000000',
      'branco': '#FFFFFF',
      'blue': '#3B82F6',
      'red': '#EF4444',
      'green': '#10B981',
      'yellow': '#F59E0B',
      'purple': '#8B5CF6',
      'pink': '#EC4899',
      'gray': '#6B7280',
      'black': '#000000',
      'white': '#FFFFFF',
      'laranja': '#F97316',
      'orange': '#F97316'
    };

    return colorMap[color.toLowerCase()] || color;
  }

  normalizeSize(size) {
    if (typeof size === 'string') {
      // If it's just a number, add px
      if (/^\d+$/.test(size)) {
        return size + 'px';
      }
      // If it already has units, keep as-is
      return size;
    }
    if (typeof size === 'number') {
      return size + 'px';
    }
    return size;
  }

  async validateStyles(styles) { 
        
    const parsedStyles = typeof styles === 'string' ? JSON.parse(styles) : styles;
    const validCSSProperties = new Set([
      'display', 'position', 'top', 'right', 'bottom', 'left',
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
      'color', 'backgroundColor', 'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
      'borderColor', 'borderWidth', 'borderStyle', 'borderRadius',
      'background', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat', 'backgroundAttachment',
      'boxShadow', 'textShadow', 'textAlign', 'textDecoration', 'textTransform',
      'flexDirection', 'justifyContent', 'alignItems', 'alignSelf', 'flex', 'flexGrow', 'flexShrink',
      'gridTemplateColumns', 'gridTemplateRows', 'gridGap', 'gap',
      'transform', 'transition', 'animation', 'opacity', 'visibility', 'overflow',
      'cursor', 'userSelect', 'pointerEvents', 'zIndex',
      // WebKit specific properties for gradients and text effects
      'WebkitBackgroundClip', 'webkitBackgroundClip', '-webkit-background-clip',
      'WebkitTextFillColor', 'webkitTextFillColor', '-webkit-text-fill-color',
      'WebkitTextStroke', 'webkitTextStroke', '-webkit-text-stroke',
      'WebkitTextStrokeColor', 'webkitTextStrokeColor', '-webkit-text-stroke-color',
      'WebkitTextStrokeWidth', 'webkitTextStrokeWidth', '-webkit-text-stroke-width',
      // Additional background properties
      'backgroundClip', 'background-clip',
      // Mozilla specific
      'MozBackgroundClip', 'mozBackgroundClip', '-moz-background-clip'
    ]);

    const errors = [];
    const validStyles = {};

    Object.entries(parsedStyles).forEach(([prop, value]) => {
      if (validCSSProperties.has(prop)) {
        validStyles[prop] = value;
      } else {
        errors.push(`Invalid CSS property: ${prop}`);
      }
    });

    return {
      valid: validStyles,
      errors,
      isValid: errors.length === 0
    };

  }

}

export default UXAgent;