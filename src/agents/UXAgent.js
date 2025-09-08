import { Agent, Tool } from 'ajent';
import ResponseApplier from '../core/ResponseApplier.js';

class UXAgent extends Agent {
  constructor() {
    super('ux_agent', 'UX/UI Designer especializado em implementação visual instantânea: aplica estilos CSS, gera imagens personalizadas com IA, otimiza layouts e exporta mudanças para desenvolvimento - tudo através de comandos em linguagem natural');
    
    // Initialize ResponseApplier for applying styles and maintaining history
    this.applier = new ResponseApplier();

    this.addTool(new Tool(
      'applyVisualStyles', 
      'Aplica estilos CSS aos elementos selecionados na página e retorna o status de sucesso. Use para modificar aparência, layout, cores, tamanhos, etc. Exemplo: {"description": "Mudar cor de fundo para azul e texto para branco", "styles": {"backgroundColor": "#0066cc", "color": "white", "padding": "10px"}, "elementSelectors": ["#header", ".nav-item"]}', 
      ({ description, styles, elementSelectors }) => this.applyStylesWrapper({ description, styles, elementSelectors })
    ));
    
    this.addTool(new Tool(
      'createAndApplyImage', 
      'Gera uma imagem usando IA e a aplica aos elementos especificados como fundo ou cria novos elementos com a imagem. Use para adicionar imagens personalizadas, logos, ilustrações, etc. Exemplo: {"description": "Criar logo da empresa no header", "prompt": "modern minimalist logo with blue and white colors for tech company", "elementSelectors": ["#logo"], "applyAs": "element"}. applyAs pode ser "background" (como fundo) ou "element" (como elemento img)', 
      ({ description, prompt, elementSelectors, applyAs }) => this.generateImageWrapper({description, prompt, elementSelectors, applyAs})
    ));
    
    this.addTool(new Tool(
      'generateClaudeCodeInstructions', 
      'Gera instruções específicas para implementar as mudanças visuais no código do projeto. IMPORTANTE: Esta tool retorna apenas as instruções de implementação. A LLM deve APENAS retornar as instruções geradas, sem executar comandos, propor patches ou realizar implementação adicional. Para diferentes frameworks: React (className, style props), Vue (class, style), CSS tradicional (seletores), Tailwind (classes utilitárias), CSS Modules (styles.className). Use após fazer modificações visuais.', 
      () => this.generateClaudeCodeInstructions()
    ));
  }
  instruction = () => {
    return `
            ## VOCÊ É UM UX/UI DESIGNER ESPECIALIZADO EM IMPLEMENTAÇÃO VISUAL INSTANTÂNEA

            Sua missão: interpretar comandos de design em linguagem natural e executar **UMA ÚNICA TOOL** para implementar mudanças visuais na interface.

            ## 🛠️ ARSENAL DE FERRAMENTAS

            ### 1. **applyVisualStyles** - Modificar Aparência Visual
            Aplica estilos CSS para alterar cores, tamanhos, posicionamento, etc.
            \`\`\`json
            {
              "description": "Descrição clara da mudança visual",
              "styles": { "propriedadeCSS": "valor" },
              "elementSelectors": ["#id", ".classe", "tag"]
            }
            \`\`\`

            ### 2. **createAndApplyImage** - Gerar e Aplicar Imagens com IA
            Cria imagens personalizadas e as aplica como fundo ou elementos.
            \`\`\`json
            {
              "description": "O que será criado e onde aplicado",
              "prompt": "Descrição detalhada da imagem (português ou inglês)",
              "elementSelectors": ["#target"], // [] para criar novo elemento
              "applyAs": "background" | "element"
            }
            \`\`\`

            ### 3. generateClaudeCodeInstructions - Exportar para Desenvolvimento
            Gera **apenas um resumo simplificado das mudanças visuais realizadas** no browser, 
            em formato de changelog legível para desenvolvedores. 
            Não deve gerar código pronto nem múltiplas opções de implementação.
            Exemplo de saída:
            Realizei essas mudanças no browser e desejo aplicar no código fonte.
            Resumo das mudanças aplicadas:
            - Seletor: .mycomponent
              - De: color: rgb(59, 130, 246) (azul)
              - Para: color: #ff0000 (vermelho)

            ## ⚡ REGRAS DE OURO

            1. **UMA TOOL POR COMANDO** - Nunca execute múltiplas ferramentas
            2. **SEMPRE "elementSelectors"** - Nunca use "selectedElements" ou similares
            3. **CSS VÁLIDO** - Propriedades corretas com unidades quando necessário
            4. **PERGUNTAS = INFORMAÇÃO** - Responda consultando computedStyles, não use tools
            5. **SUBSTITUIÇÃO DIRETA** - Em trocas, aplique novo estilo direto (sem deletar)

            ## 🚫 ARMADILHAS COMUNS

            | ❌ ERRO | ✅ CORRETO |
            |---------|------------|
            \`| \`"selectedElements"\` | \`"elementSelectors": ["#id"]\` |
            | \`"color red"\` | \`"color": "red"\` |
            | \`"fontSize": "16"\` | \`"fontSize": "16px"\` |
            | Múltiplas tools | Apenas uma tool |
            | Tool para consulta | Resposta direta com dados |

            ## 🎯 MAPEAMENTO INTELIGENTE

            **MODIFICAR VISUAL** → \`applyVisualStyles\`
            - "Mude a cor", "Aumente o tamanho", "Centralize"

            **ADICIONAR IMAGENS** → \`createAndApplyImage\`  
            - "Adicione uma imagem", "Coloque um fundo", "Crie um ícone"

            **GERAR INSTRUCOES DE CÓDIGO** → \`generateClaudeCodeInstructions\`
            - "Gere instruções", "Exporte mudanças", "Claude Code"
            - IMPORTANTE: Apenas retorne as instruções geradas, sem executar ou implementar

            **CONSULTAR INFO** → Resposta direta (sem tool)
            - "Qual a cor atual?", "Que tamanho tem?"

            ## 💡 EXEMPLOS PRÁTICOS

            \`\`\`
            Usuário: "Deixe o título azul e maior"
            Ação: applyVisualStyles({
              description: "Tornar título azul e aumentar tamanho",
              styles: { color: "blue", fontSize: "24px" },
              elementSelectors: ["h1"]
            })
            \`\`\`

            \`\`\`
            Usuário: "Adicione um gato fofo como fundo"
            Ação: createAndApplyImage({
              description: "Aplicar imagem de gato fofo como fundo",
              prompt: "cute fluffy orange cat, adorable, high quality",
              elementSelectors: ["body"],
              applyAs: "background"
            })
            \`\`\`

            ## 🔍 ANTES DE AGIR

            1. **Identifique a intenção**: modificar, criar imagem ou exportar?
            2. **Selecione a tool adequada**
            3. **Verifique seletores CSS corretos**
            4. **Execute com precisão**

            Seja eficiente, preciso e sempre focado na melhor experiência do usuário!
                `;
  };

  async applyStylesWrapper(params) {
    console.log('applyStylesWrapper called with params:', params);
    
    // Dispatch tool start event for UI feedback
    const toolInfo = {
      tool: 'applyVisualStyles',
      description: params?.description || 'Aplicando modificações de estilo',
      target: params?.elementSelectors?.join(', ') || 'elementos selecionados'
    };
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ajentToolStart', { detail: toolInfo }));
    }
    
    if (!params) {
      const errorMsg = '❌ ERRO: Parâmetros obrigatórios ausentes (description, styles, elementSelectors)';
      this.dispatchErrorEvent('applyVisualStyles', errorMsg);
      return errorMsg;
    }
    
    // Handle case where Ajent framework wraps params in {params: 'stringified_json'}
    let actualParams = params;
    if (params.params && typeof params.params === 'string') {
      try {
        actualParams = JSON.parse(params.params);
        console.log('Parsed actualParams for applyVisualStyles:', actualParams);
      } catch (error) {
        const errorMsg = '❌ ERRO: Falha ao interpretar parâmetros JSON - verifique a sintaxe';
        console.warn('Failed to parse params.params:', error);
        this.dispatchErrorEvent('applyVisualStyles', errorMsg);
        return errorMsg;
      }
    }
    
    // Validate required parameters
    if (!actualParams.styles || typeof actualParams.styles !== 'object') {
      const errorMsg = '❌ ERRO: Parâmetro "styles" é obrigatório e deve ser um objeto CSS válido';
      this.dispatchErrorEvent('applyVisualStyles', errorMsg);
      return errorMsg;
    }
    
    if (!actualParams.elementSelectors || !Array.isArray(actualParams.elementSelectors)) {
      const errorMsg = '❌ ERRO: Parâmetro "elementSelectors" é obrigatório e deve ser um array de seletores CSS';
      this.dispatchErrorEvent('applyVisualStyles', errorMsg);
      return errorMsg;
    }
    
    let selectedElements = [];
    
    // Handle new elementSelectors format
    if (actualParams.elementSelectors) {
      console.log('elementSelectors received:', actualParams.elementSelectors);
      selectedElements = this.reconstructElementsFromSelectors(actualParams.elementSelectors);
      console.log('Reconstructed elements:', selectedElements);
    }
    // Handle legacy selectedElements format (in case it's still used)
    else if (actualParams.selectedElements) {
      console.log('selectedElements received (legacy):', actualParams.selectedElements);
      selectedElements = actualParams.selectedElements.filter(el => 
        el && el.nodeType && el.nodeType === Node.ELEMENT_NODE
      );
    }
    // Handle case where selectors come from currentElementSelectors
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
      const selectors = actualParams.elementSelectors.join(', ');
      const errorMsg = `❌ ERRO: Nenhum elemento encontrado para os seletores: ${selectors}. Verifique se os seletores CSS estão corretos e os elementos existem na página.`;
      this.dispatchErrorEvent('applyVisualStyles', errorMsg);
      return errorMsg;
    }
    
    // Call the main applyVisualStyles method
    try {
      const result = await this.applyVisualStyles({
        description: actualParams.description,
        styles: actualParams.styles,
        selectedElements: selectedElements
      });
      
      // Create detailed success message
      const appliedStyles = Object.entries(actualParams.styles)
        .map(([prop, value]) => `${prop}: ${value}`)
        .join(', ');
      
      const successMsg = `SUCESSO: Estilos aplicados com sucesso!
📍 Elementos afetados: ${selectedElements.length} elemento(s) [${actualParams.elementSelectors.join(', ')}]
🎨 Estilos aplicados: ${appliedStyles}
📝 Descrição: ${actualParams.description || 'Modificação de estilo'}`;
      
      // Dispatch success event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ajentToolSuccess', {
          detail: {
            tool: 'applyVisualStyles',
            result: successMsg,
            elementsCount: selectedElements.length,
            styles: actualParams.styles
          }
        }));
      }
      
      return successMsg;
      
    } catch (error) {
      const errorMsg = `❌ ERRO na aplicação de estilos: ${error.message}
🔍 Elementos alvo: ${actualParams.elementSelectors.join(', ')}
🎨 Estilos tentados: ${JSON.stringify(actualParams.styles, null, 2)}`;
      
      // Dispatch error event
      this.dispatchErrorEvent('applyVisualStyles', errorMsg);
      return errorMsg;
    }
  }

  // Helper method for error events
  dispatchErrorEvent(tool, errorMsg) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ajentToolError', {
        detail: { tool, error: errorMsg }
      }));
    }
  }

  async generateClaudeCodeInstructions(params) {
    console.log('generateClaudeCodeInstructions called with params:', params);
    
    try {
      const history = this.applier.getHistory();
  
      if (!history || history.length === 0) {
        return 'Nenhuma modificação foi feita ainda. Faça algumas alterações primeiro antes de solicitar as instruções.';
      }
  
      let instructions = `Realizei essas mudanças no browser e desejo aplicar no código fonte.\n\n`;
      instructions += `Resumo das mudanças aplicadas:\n`;
  
      history.forEach((change) => {
        if (change.elementInfo?.selector && change.styles) {
          const selector = change.elementInfo.selector;
          
          Object.entries(change.styles).forEach(([prop, value]) => {
            const cssProp = prop.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
  
            // opcional: recuperar valor anterior, se disponível
            const from = change.previousStyles?.[prop] || '(valor anterior desconhecido)';
            const to = value;
  
            instructions += `- Seletor: ${selector}\n`;
            instructions += `  - De: ${cssProp}: ${from}\n`;
            instructions += `  - Para: ${cssProp}: ${to}\n`;
          });
        }
  
        if (change.imageUrl) {
          instructions += `- Imagem gerada: ${change.imageUrl}\n`;
        }
      });
  
      return instructions;
  
    } catch (error) {
      console.error('Error generating Claude Code instructions:', error);
      return `Erro ao gerar instruções: ${error.message}`;
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
        console.log('Parsed actualParams for createAndApplyImage:', actualParams);
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
    
    return this.createAndApplyImage({
      description: actualParams.description,
      prompt: actualParams.prompt,
      elementSelectors: elementSelectors,
      applyAs: actualParams.applyAs || 'background'
    });
  }

  async createAndApplyImage(params) {
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
            }, element, `createAndApplyImage: ${description}`);
            
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
        }, imgElement, `createAndApplyImage: ${description}`);
        
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

  generateTailwindHints(styles) {
    const tailwindMap = {
      // Colors
      'color': {
        '#ff0000': 'text-red-500', '#ef4444': 'text-red-500', 'red': 'text-red-500',
        '#3b82f6': 'text-blue-500', '#0066cc': 'text-blue-600', 'blue': 'text-blue-500',
        '#10b981': 'text-green-500', 'green': 'text-green-500',
        '#000000': 'text-black', 'black': 'text-black',
        '#ffffff': 'text-white', 'white': 'text-white'
      },
      'backgroundColor': {
        '#ff0000': 'bg-red-500', '#ef4444': 'bg-red-500', 'red': 'bg-red-500',
        '#3b82f6': 'bg-blue-500', '#0066cc': 'bg-blue-600', 'blue': 'bg-blue-500',
        '#10b981': 'bg-green-500', 'green': 'bg-green-500',
        '#000000': 'bg-black', 'black': 'bg-black',
        '#ffffff': 'bg-white', 'white': 'bg-white'
      },
      // Font sizes
      'fontSize': {
        '12px': 'text-xs', '14px': 'text-sm', '16px': 'text-base',
        '18px': 'text-lg', '20px': 'text-xl', '24px': 'text-2xl',
        '30px': 'text-3xl', '36px': 'text-4xl'
      },
      // Font weight
      'fontWeight': {
        '100': 'font-thin', '200': 'font-extralight', '300': 'font-light',
        '400': 'font-normal', '500': 'font-medium', '600': 'font-semibold',
        '700': 'font-bold', '800': 'font-extrabold', '900': 'font-black'
      },
      // Text alignment
      'textAlign': {
        'left': 'text-left', 'center': 'text-center', 'right': 'text-right'
      },
      // Display
      'display': {
        'block': 'block', 'inline': 'inline', 'flex': 'flex',
        'grid': 'grid', 'none': 'hidden'
      }
    };

    const hints = [];
    Object.entries(styles).forEach(([prop, value]) => {
      const normalizedValue = String(value).toLowerCase();
      if (tailwindMap[prop] && tailwindMap[prop][normalizedValue]) {
        hints.push(tailwindMap[prop][normalizedValue]);
      }
    });

    return hints;
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
  
  async applyVisualStyles(params) {
    // Defensive parameter validation
    if (!params) {
      console.error('applyVisualStyles called with undefined params');
      return JSON.stringify({
        status: 'error',
        message: 'Parameters object is required',
        should_continue: false,
        data: null
      });
    }

    const { description, styles, selectedElements = [] } = params;

    if (!description) {
      console.error('applyVisualStyles called without description:', params);
      return JSON.stringify({
        status: 'error',
        message: 'Description parameter is required',
        should_continue: false,
        data: null
      });
    }

    if (!styles) {
      console.error('applyVisualStyles called without styles:', params);
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
          `applyVisualStyles: ${description}`
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