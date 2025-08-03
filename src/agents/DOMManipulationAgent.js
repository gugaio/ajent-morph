import { Agent, Tool } from 'ajent';
import ResponseApplier from '../core/ResponseApplier.js';

class DOMManipulationAgent extends Agent {
  constructor() {
    super('dom_manipulation', 'Expert in DOM manipulation and CSS styling based on natural language commands');
    
    // Initialize ResponseApplier for applying styles and maintaining history
    this.applier = new ResponseApplier();

    this.addTool(new Tool('applyStyles', 'Apply CSS styles to selected elements and return success status. Call with: {"description": "what_will_happen_visually", "styles": {"cssProperty": "value"}, "elementSelectors": ["#id", ".class", "tagname"]}', (params) => this.applyStylesWrapper(params)));
    this.addTool(new Tool('validateStyles', 'Validate CSS properties and values. Call with: {"styles": object_with_css_properties}', (params) => this.validateStylesWrapper(params)));
    this.addTool(new Tool('createElement', 'Create new HTML elements with complete styling. Call with: {"description": "what_to_create", "html": "<div>content</div>", "css": "optional inline CSS", "elementSelectors": ["#id", ".class"]}', (params) => this.createElementWrapper(params)));
    this.addTool(new Tool('deleteElement', 'Delete selected DOM elements. Call with: {"elementSelectors": ["#id", ".class"], "confirmation": true}', (params) => this.deleteElementWrapper(params)));
  }

  instruction = () => {
    return `You are a DOM manipulation expert that processes natural language commands to modify web page elements. Your responsibility is to analyze user intent and execute the appropriate action using the correct tools.

## CRITICAL: TOOL PARAMETER FORMAT

**ATTENTION:** All tool calls must use the EXACT parameter format specified below. Do NOT deviate from these formats:

1. **applyStyles** - MUST use "elementSelectors" (array of CSS selectors)
2. **createElement** - MUST use "elementSelectors" (array, can be empty)  
3. **deleteElement** - MUST use "elementSelectors" (array of CSS selectors)

**WRONG:** \`"selectedElements": [objects]\`
**CORRECT:** \`"elementSelectors": ["#id", ".class"]\`

## INTENT IDENTIFICATION AND ACTION DECISION

**CRITICAL:** Distinguish between ACTION requests and INFORMATION requests:

### 🔍 INFORMATION REQUESTS (NO TOOLS NEEDED)
**When:** User wants to know about current element properties/styles
**Examples:** "me detalha a cor de fundo", "qual a cor atual?", "que tamanho tem?", "mostra os estilos", "analyze this element"
**Action:** ❌ DO NOT call any tools! Use the element data already provided in the prompt to answer with final_answer

### 🛠️ ACTION REQUESTS (USE TOOLS)

#### 1. CSS MODIFICATION INTENT
**When:** User wants to CHANGE visual properties of existing elements
**Examples:** "deixe azul", "faça maior", "arredondar bordas", "alterar cor", "make it red", "increase font size"
**Action:** Call applyStyles tool to directly apply changes to DOM elements

#### 2. ELEMENT CREATION INTENT  
**When:** User wants to add new elements to the page
**Examples:** "adicione um botão", "crie um card similar", "duplique este elemento", "add a button"
**Action:** Call createElement tool

#### 3. ELEMENT DELETION INTENT
**When:** User wants to remove elements from the page  
**Examples:** "remova este elemento", "delete", "apague isso", "remove this"
**Action:** Call deleteElement tool

## CRITICAL: WHEN NOT TO USE TOOLS

**NEVER call analyzeElement tool** - element data is already provided in the user prompt!

**For information requests:**
- Read the element data from the user prompt (includes computedStyles field)
- Check the computedStyles object for current CSS values (backgroundColor, color, etc.)
- Analyze the provided information thoroughly
- Respond directly with final_answer tool with detailed, accurate information

## TOOL CALLING PATTERNS

### For CSS Modifications (applyStyles):
**CRITICAL:** You must call applyStyles with this EXACT format:
\`\`\`javascript
{
  "description": "Clear description of the visual change that will occur",
  "styles": {
    "cssProperty": "validCssValue",
    "anotherProperty": "anotherValue"
  },
  "elementSelectors": ["#id", ".class", "tagname"] // CSS selectors for target elements
}
\`\`\`

**IMPORTANT:** Use "elementSelectors" (array of CSS selectors), NOT "selectedElements"

**Examples:**
- Command: "deixe azul" → \`{"description": "Change text color to blue", "styles": {"color": "blue"}, "elementSelectors": ["#myElement"]}\`
- Command: "faça maior" → \`{"description": "Increase font size", "styles": {"fontSize": "1.2em"}, "elementSelectors": [".button"]}\`
- Command: "fundo vermelho" → \`{"description": "Change background to red", "styles": {"backgroundColor": "red"}, "elementSelectors": ["div"]}\`

### For Element Creation (createElement):
**CRITICAL:** You must call createElement with this EXACT format:
\`\`\`javascript
{
  "description": "Description of what element to create",
  "html": "<div class='my-component'>Complete HTML content here</div>",
  "css": "optional inline CSS string for styling",
  "elementSelectors": ["#id", ".class"] // reference elements (can be empty array)
}
\`\`\`

**IMPORTANT for createElement:**
- Always provide complete, valid HTML in the "html" field
- Include all necessary content, structure, and classes
- Use "css" field for additional inline styles if needed
- Make HTML semantic and accessible
- For complex components, include all inner elements in the HTML
- CSS should be inline styles for immediate application

**createElement Examples:**
- Simple button: \`"html": "<button>Click Me</button>", "css": "background: blue; color: white; padding: 10px;"\`
- Card component: \`"html": "<div class='card'><h3>Title</h3><p>Content</p></div>", "css": "border: 1px solid #ddd; padding: 20px; border-radius: 8px;"\`
- Form element: \`"html": "<div><label>Name:</label><input type='text' placeholder='Enter name'></div>", "css": "margin: 10px 0;"\`

### For Element Deletion (deleteElement):
**CRITICAL:** You must call deleteElement with this EXACT format:
\`\`\`javascript
{
  "elementSelectors": ["#id", ".class", "tagname"], // CSS selectors for elements to delete
  "confirmation": true // required for safety
}
\`\`\`


## CSS GENERATION GUIDELINES

When calling applyStyles, you must provide:

1. **Description**: Clear explanation of the visual change
2. **Styles**: Valid CSS property-value pairs
3. **SelectedElements**: Array of DOM elements to apply styles to

### Common Style Mappings:

**Colors (Portuguese/English):**
- "azul/blue" → \`"color": "blue"\` or \`"backgroundColor": "blue"\`
- "vermelho/red" → \`"color": "red"\` or \`"backgroundColor": "red"\`
- "verde/green" → \`"color": "green"\` or \`"backgroundColor": "green"\`
- "preto/black" → \`"color": "black"\` or \`"backgroundColor": "black"\`

**Sizes:**
- "maior/bigger" → \`"fontSize": "1.2em"\` or \`"width": "120%"\`
- "menor/smaller" → \`"fontSize": "0.8em"\` or \`"width": "80%"\`
- "grande/large" → \`"fontSize": "2rem"\`

**Spacing:**
- "mais espaço/more space" → \`"padding": "20px"\` or \`"margin": "20px"\`
- "sem espaço/no space" → \`"padding": "0"\` or \`"margin": "0"\`

**Borders:**
- "arredondar/round" → \`"borderRadius": "8px"\`
- "borda/border" → \`"border": "1px solid #ccc"\`

## CRITICAL CSS VALIDATION RULES

**Always use valid CSS syntax:**
- ✅ CORRECT: \`"color": "red"\`
- ❌ WRONG: \`"color red"\` (missing colon)
- ✅ CORRECT: \`"fontSize": "16px"\`  
- ❌ WRONG: \`"font 16px"\` (invalid property)
- ✅ CORRECT: \`"backgroundColor": "#ff0000"\`
- ❌ WRONG: \`"background red"\` (incomplete)

**Unit handling:**
- Add units when needed: \`"10px"\`, \`"1rem"\`, \`"50%"\`
- Zero values can omit units: \`"0"\`

## RESPONSE PATTERNS

The tools will return structured responses. Present them to the user in a clear, friendly way:

**For CSS modifications:**
"✅ Modificação aplicada: [description]. O elemento agora tem [style changes]."

**For element creation:**
"✅ Elemento criado: [description]. O novo elemento foi adicionado à página."

**For element deletion:**
"✅ Elemento removido: [description]. O elemento foi deletado da página."

## REAL-WORLD EXAMPLES

### Example 0: Information Request (NO TOOLS)
**User:** "qual a cor de fundo desse elemento"
**Your response:**
\`\`\`javascript
final_answer({
  "response": "🎨 Analisando o elemento selecionado (.activation-hint):\n\n**Cor de fundo:** #eff6ff (azul claro)\n**Outras propriedades visuais:**\n- Padding: 24px (1.5rem)\n- Border-radius: 12px (bordas arredondadas)\n- Box-shadow: sombra sutil\n- Text-align: center\n\nEste elemento tem um fundo azul claro bem suave, ideal para destacar informações importantes."
})
\`\`\`

**IMPORTANT:** Always check the computedStyles field in the element data to get accurate style information!

### Example 1: Color Change (ACTION)
**User:** "Deixe o texto azul"
**Your call:**
\`\`\`javascript
applyStyles({
  "description": "Change text color to blue",
  "styles": {
    "color": "blue"
  },
  "elementSelectors": ["#textElement"]
})
\`\`\`

### Example 2: Background Change  
**User:** "Fundo vermelho"
**Your call:**
\`\`\`javascript
applyStyles({
  "description": "Change background color to red", 
  "styles": {
    "backgroundColor": "red"
  },
  "elementSelectors": [".container"]
})
\`\`\`

### Example 3: Size Adjustment
**User:** "Faça a fonte maior"  
**Your call:**
\`\`\`javascript
applyStyles({
  "description": "Increase font size",
  "styles": {
    "fontSize": "1.3em"
  },
  "elementSelectors": ["p"]
})
\`\`\`

### Example 4: Complex Styling
**User:** "Botão azul com bordas arredondadas"
**Your call:**
\`\`\`javascript
applyStyles({
  "description": "Style button with blue background and rounded corners",
  "styles": {
    "backgroundColor": "#007bff",
    "borderRadius": "8px",
    "color": "white",
    "border": "none",
    "padding": "10px 20px",
    "cursor": "pointer"
  },
  "elementSelectors": ["#myButton"]
})
\`\`\`

### Example 5: Element Creation
**User:** "Adicione um botão azul com ícone"
**Your call:**
\`\`\`javascript
createElement({
  "description": "Create a blue button with icon",
  "html": "<button class='btn-primary'><span class='icon'>👍</span> Clique Aqui</button>",
  "css": "background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 16px;",
  "elementSelectors": []
})
\`\`\`

### Example 6: Element Deletion
**User:** "Remova este elemento"
**Your call:**
\`\`\`javascript
deleteElement({
  "elementSelectors": ["#elementToDelete"],
  "confirmation": true
})
\`\`\`

## ERROR PREVENTION

Before calling any tool, verify:
1. ✅ Intent is correctly identified (modify, create, or delete)
2. ✅ CSS properties use correct names (backgroundColor, not background-color)
3. ✅ CSS values include units when needed
4. ✅ Description clearly explains the visual change
5. ✅ All required parameters are provided

## ACCESSIBILITY & BEST PRACTICES

Consider accessibility in your style suggestions:
- Maintain color contrast ratios (4.5:1 for normal text)
- Include focus states for interactive elements  
- Use semantic color choices
- Ensure responsive behavior

## IMPORTANT: FINAL ANSWER REQUIREMENT

**CRITICAL:** After completing any DOM manipulation task (applyStyles, createElement, or deleteElement), you MUST use the "final_answer" tool to indicate that you have completed your task or reasoning and are returning a final response to the user.

### Workflow Pattern:
1. 🎯 **Identify Intent**: Analyze user command (modify, create, or delete)
2. 🔧 **Execute Tool**: Call appropriate tool (applyStyles, createElement, deleteElement)
3. ✅ **Provide Final Answer**: Use final_answer tool with a user-friendly summary

### Example Final Answer Usage:
After calling applyStyles tool:
\`\`\`
final_answer({
  "response": "✅ Cor do texto alterada para vermelho com sucesso! O elemento agora possui a cor vermelha aplicada."
})
\`\`\`

**Remember:** 
- Your role is to understand user intent and call the appropriate tools with the correct, structured parameters
- The tools handle the technical implementation
- Always conclude with final_answer to provide clear feedback to the user`;
  };

  async analyzeElement(params) {
    // Defensive parameter validation
    if (!params) {
      throw new Error('Parameters object is required');
    }
    
    const { elementData } = params;
    
    if (!elementData) {
      throw new Error('ElementData parameter is required');
    }
    
    const parsedData = typeof elementData === 'string' ? JSON.parse(elementData) : elementData;
    const { tag, tagName, classes, id, text, dimensions, currentStyles } = parsedData;

    // Use tagName as fallback for tag
    const elementTag = tag || tagName || 'unknown';
    
    // Handle classes - could be array or string
    let classesDisplay = 'none';
    if (classes) {
      if (Array.isArray(classes)) {
        classesDisplay = classes.join(', ') || 'none';
      } else if (typeof classes === 'string') {
        classesDisplay = classes;
      }
    }

    // Handle dimensions safely
    let dimensionsDisplay = 'unknown';
    if (dimensions && dimensions.width && dimensions.height) {
      dimensionsDisplay = `${dimensions.width}x${dimensions.height}px`;
    }

    let analysis = `Element Analysis:
- Tag: ${elementTag}
- Classes: ${classesDisplay}
- ID: ${id || 'none'}
- Text: "${text ? text.substring(0, 100) : 'no text content'}"${text && text.length > 100 ? '...' : ''}
- Dimensions: ${dimensionsDisplay}

Current Styling:`;

    if (currentStyles && typeof currentStyles === 'object' && Object.keys(currentStyles).length > 0) {
      Object.entries(currentStyles).forEach(([category, props]) => {
        if (props && typeof props === 'object' && Object.keys(props).length > 0) {
          analysis += `\n${category.toUpperCase()}:`;
          Object.entries(props).forEach(([prop, value]) => {
            analysis += `\n  ${prop}: ${value}`;
          });
        }
      });
    } else {
      analysis += '\n  No significant styles detected';
    }

    return analysis;
  }

  async applyStyles(params) {
    // Defensive parameter validation
    if (!params) {
      console.error('applyStyles called with undefined params');
      throw new Error('Parameters object is required');
    }
    
    const { description, styles, selectedElements = [] } = params;
    
    if (!description) {
      console.error('applyStyles called without description:', params);
      throw new Error('Description parameter is required');
    }
    
    if (!styles) {
      console.error('applyStyles called without styles:', params);
      throw new Error('Styles parameter is required');
    }

    if (!selectedElements || selectedElements.length === 0) {
      return 'Nenhum elemento selecionado para aplicar estilos.';
    }
    
    // Validate and normalize the provided styles
    const normalizedStyles = this.normalizeStyles(styles);
    
    // Validate CSS properties
    const validation = await this.validateStyles({ styles: normalizedStyles });
    
    if (!validation.isValid) {
      console.warn('Invalid styles detected:', validation.errors);
      // Continue with valid styles only
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
          results.push({
            element: this.getElementInfo(element),
            success: true,
            appliedStyles: result.appliedStyles
          });
        } else {
          failureCount++;
          results.push({
            element: this.getElementInfo(element),
            success: false,
            error: result.message
          });
        }
      } catch (error) {
        failureCount++;
        results.push({
          element: this.getElementInfo(element),
          success: false,
          error: error.message
        });
      }
    }

    // Generate success message
    let message = '';
    if (successCount > 0 && failureCount === 0) {
      message = `✅ ${description} aplicado com sucesso em ${successCount} elemento(s).`;
    } else if (successCount > 0 && failureCount > 0) {
      message = `⚠️ ${description} aplicado em ${successCount} elemento(s). ${failureCount} falharam.`;
    } else {
      message = `❌ Falha ao aplicar ${description}. Nenhum elemento foi modificado.`;
    }

    if (validation.errors.length > 0) {
      message += ` Propriedades CSS inválidas ignoradas: ${validation.errors.join(', ')}`;
    }

    // Return only string message for Ajent framework
    return message;
  }

  getElementInfo(element) {
    // Validate that element is a proper DOM element
    if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
      return {
        tagName: 'invalid',
        id: null,
        classes: [],
        textContent: ''
      };
    }

    try {
      return {
        tagName: element.tagName ? element.tagName.toLowerCase() : 'unknown',
        id: element.id || null,
        classes: element.classList ? Array.from(element.classList) : [],
        textContent: element.textContent ? element.textContent.slice(0, 50) : ''
      };
    } catch (error) {
      console.warn('Error getting element info:', error);
      return {
        tagName: 'error',
        id: null,
        classes: [],
        textContent: ''
      };
    }
  }

  // Undo last change
  undo() {
    return this.applier.undo();
  }

  // Get change history
  getHistory() {
    return this.applier.getHistory();
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

  async validateStyles(params) {
    // Defensive parameter validation
    if (!params) {
      console.error('validateStyles called with undefined params');
      throw new Error('Parameters object is required');
    }
    
    const { styles } = params;
    
    if (!styles) {
      console.error('validateStyles called without styles:', params);
      throw new Error('Styles parameter is required');
    }
    
    const parsedStyles = typeof styles === 'string' ? JSON.parse(styles) : styles;
    const validCSSProperties = new Set([
      'display', 'position', 'top', 'right', 'bottom', 'left',
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
      'color', 'backgroundColor', 'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
      'borderColor', 'borderWidth', 'borderStyle', 'borderRadius',
      'boxShadow', 'textShadow', 'textAlign', 'textDecoration', 'textTransform',
      'flexDirection', 'justifyContent', 'alignItems', 'alignSelf', 'flex', 'flexGrow', 'flexShrink',
      'gridTemplateColumns', 'gridTemplateRows', 'gridGap', 'gap',
      'transform', 'transition', 'animation', 'opacity', 'visibility', 'overflow',
      'cursor', 'userSelect', 'pointerEvents', 'zIndex'
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

  async createElement(params) {
    const { description, html, css, selectedElements = [] } = params;
    
    if (!description) {
      return 'Descrição é obrigatória para criar elemento.';
    }
    
    let newElement = null;
    
    try {
      // Priority 1: Use provided HTML
      if (html && html.trim()) {
        newElement = this.createElementFromHTML(html, css);
      }
      // Priority 2: Clone from selected elements
      else if (selectedElements.length > 0) {
        const reference = selectedElements[0];
        newElement = reference.cloneNode(true);
        
        // Clear any ID to avoid duplicates
        if (newElement.id) {
          newElement.id = newElement.id + '_copy';
        }
        
        // Add visual indicator that it's a copy
        newElement.style.border = '2px dashed #10b981';
        newElement.style.opacity = '0.8';
      }
      // Priority 3: Fallback to basic element creation
      else {
        newElement = this.createBasicElement(description);
      }
      
      // Actually insert the element into the DOM
      if (newElement) {
        const insertionPoint = this.findInsertionPoint(selectedElements);
        insertionPoint.appendChild(newElement);
        
        // Add visual indicator for new element
        this.addNewElementIndicator(newElement);
        
        // Use ResponseApplier to track this creation in history
        await this.applier.applyLLMResponse(
          {
            action: 'create_element',
            explanation: `Elemento criado: ${description}`,
            styles: {}, // No styles applied, just element creation
            html: html || newElement.outerHTML
          },
          newElement,
          `createElement: ${description}`
        );
        
        return `✅ Elemento criado: ${description}. O novo elemento foi adicionado à página.`;
      }
      
      return 'Falha ao criar elemento.';
      
    } catch (error) {
      console.error('Error creating element:', error);
      return `Erro ao criar elemento: ${error.message}`;
    }
  }

  createElementFromHTML(html, css) {
    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html.trim();
    
    // Get the first child element (the main element to create)
    const element = tempContainer.firstElementChild;
    
    if (!element) {
      throw new Error('Invalid HTML provided - no element found');
    }
    
    // Apply additional CSS if provided
    if (css && css.trim()) {
      // Parse and apply CSS styles
      const existingStyle = element.style.cssText;
      element.style.cssText = existingStyle + '; ' + css;
    }
    
    return element;
  }

  createBasicElement(description) {
    const lowerDesc = description.toLowerCase();
    let element;
    
    if (lowerDesc.includes('botão') || lowerDesc.includes('button')) {
      element = document.createElement('button');
      element.textContent = 'Novo Botão';
      element.style.cssText = 'padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 5px;';
    } else if (lowerDesc.includes('div') || lowerDesc.includes('container')) {
      element = document.createElement('div');
      element.textContent = 'Novo Container';
      element.style.cssText = 'padding: 20px; border: 1px solid #ddd; border-radius: 4px; background-color: #f9f9f9; margin: 5px;';
    } else if (lowerDesc.includes('texto') || lowerDesc.includes('text') || lowerDesc.includes('parágrafo') || lowerDesc.includes('paragraph')) {
      element = document.createElement('p');
      element.textContent = 'Novo texto aqui.';
      element.style.cssText = 'margin: 10px 0; line-height: 1.6;';
    } else if (lowerDesc.includes('título') || lowerDesc.includes('heading') || lowerDesc.includes('h1') || lowerDesc.includes('h2')) {
      element = document.createElement('h2');
      element.textContent = 'Novo Título';
      element.style.cssText = 'margin: 20px 0 10px; color: #333;';
    } else if (lowerDesc.includes('card')) {
      element = document.createElement('div');
      element.innerHTML = '<h3>Novo Card</h3><p>Conteúdo do card aqui.</p>';
      element.style.cssText = 'padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 10px;';
    } else {
      element = document.createElement('div');
      element.textContent = 'Novo Elemento';
      element.style.cssText = 'padding: 10px; border: 1px dashed #ccc; background: #f8f9fa; margin: 5px;';
    }
    
    return element;
  }

  async deleteElement(params) {
    const { selectedElements = [], confirmation = false } = params;
    
    if (!confirmation) {
      return 'Confirmação necessária para deletar elementos. Use confirmation: true.';
    }
    
    if (selectedElements.length === 0) {
      return 'Nenhum elemento selecionado para deletar.';
    }
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    try {
      // Delete each selected element
      for (let i = 0; i < selectedElements.length; i++) {
        const element = selectedElements[i];
        try {
          // Save element state for undo before deletion
          const elementInfo = this.getElementInfo(element);
          const elementHTML = element.outerHTML;
          const parentNode = element.parentNode;
          const nextSibling = element.nextSibling;
          
          // Store deletion info for potential undo
          await this.applier.applyLLMResponse(
            {
              action: 'delete_element',
              explanation: `Elemento removido: ${elementInfo.tagName}`,
              styles: {}, // Empty styles object required by ResponseApplier
              elementHTML: elementHTML,
              parentNode: parentNode,
              nextSibling: nextSibling
            },
            element,
            `deleteElement: ${elementInfo.tagName}`
          );
          
          // Actually remove the element from DOM
          if (element.parentNode) {
            element.parentNode.removeChild(element);
            successCount++;
            results.push({
              element: elementInfo,
              success: true,
              message: 'Elemento removido com sucesso'
            });
          } else {
            failureCount++;
            results.push({
              element: elementInfo,
              success: false,
              error: 'Elemento não possui parent node'
            });
          }
          
        } catch (error) {
          failureCount++;
          results.push({
            element: this.getElementInfo(element),
            success: false,
            error: error.message
          });
        }
      }
      
      // Generate result message
      let message = '';
      if (successCount > 0 && failureCount === 0) {
        message = `✅ ${successCount} elemento(s) foram removidos com sucesso.`;
      } else if (successCount > 0 && failureCount > 0) {
        message = `⚠️ ${successCount} elemento(s) removidos. ${failureCount} falharam.`;
      } else {
        message = `❌ Falha ao remover elementos. Nenhum elemento foi deletado.`;
      }
      
      return message;
      
    } catch (error) {
      console.error('Error deleting elements:', error);
      return `Erro ao deletar elementos: ${error.message}`;
    }
  }

  // Helper methods
  getElementSelector(element) {
    if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    // Try ID first
    if (element.id) {
      return `#${element.id}`;
    }

    // Try unique class combination
    if (element.className) {
      const classes = Array.from(element.classList).slice(0, 3);
      if (classes.length > 0) {
        const selector = `.${classes.join('.')}`;
        // Check if this selector is unique
        const matches = document.querySelectorAll(selector);
        if (matches.length === 1) {
          return selector;
        }
      }
    }

    // Generate a data attribute selector as fallback
    const timestamp = Date.now();
    const uniqueId = `dsa-element-${timestamp}-${Math.random().toString(36).substring(2, 11)}`;
    element.setAttribute('data-dsa-id', uniqueId);
    return `[data-dsa-id='${uniqueId}']`;
  }

  reconstructElementsFromSelectors(selectors) {
    if (!Array.isArray(selectors)) {
      return [];
    }

    const elements = [];
    for (const selector of selectors) {
      if (typeof selector === 'string') {
        try {
          const element = document.querySelector(selector);
          if (element) {
            elements.push(element);
          }
        } catch (error) {
          console.warn(`Failed to find element with selector "${selector}":`, error);
        }
      }
    }
    return elements;
  }

  convertElementsToSelectors(elements) {
    if (!Array.isArray(elements)) {
      return [];
    }

    return elements.map(element => this.getElementSelector(element)).filter(Boolean);
  }

  findInsertionPoint(selectedElements) {
    if (selectedElements && selectedElements.length > 0) {
      const lastSelected = selectedElements[selectedElements.length - 1];
      const parent = lastSelected.parentNode;
      if (parent) {
        return parent;
      }
    }
    return document.body;
  }

  addNewElementIndicator(element) {
    // Add a temporary visual indicator for the new element
    element.style.animation = 'dsa-new-element-pulse 2s ease-in-out';
    
    // Add CSS for the animation if it doesn't exist
    if (!document.querySelector('#dsa-new-element-styles')) {
      const style = document.createElement('style');
      style.id = 'dsa-new-element-styles';
      style.textContent = `
        @keyframes dsa-new-element-pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Remove the animation after it completes
    setTimeout(() => {
      element.style.animation = '';
    }, 2000);
  }

  // Wrapper methods to handle different parameter formats from Ajent LLM
  async analyzeElementWrapper(params) {
    if (!params || !params.elementData) {
      throw new Error('Missing required parameter. Expected format: {"elementData": {...}}');
    }
    
    return this.analyzeElement(params);
  }

  async applyStylesWrapper(params) {
    console.log('applyStylesWrapper called with params:', params);
    
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
    return this.applyStyles({
      description: actualParams.description,
      styles: actualParams.styles,
      selectedElements: selectedElements
    });
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

  async createElementWrapper(params) {
    console.log('createElementWrapper called with params:', params);
    
    if (!params) {
      throw new Error('Description parameter is required');
    }
    
    let selectedElements = [];
    
    // Handle new elementSelectors format
    if (params.elementSelectors) {
      selectedElements = this.reconstructElementsFromSelectors(params.elementSelectors);
    }
    // Handle legacy selectedElements format
    else if (params.selectedElements) {
      selectedElements = params.selectedElements.filter(el => 
        el && el.nodeType && el.nodeType === Node.ELEMENT_NODE
      );
    }
    // Handle case where selectors come from currentElementSelectors
    else if (this.currentElementSelectors && this.currentElementSelectors.length > 0) {
      selectedElements = this.reconstructElementsFromSelectors(this.currentElementSelectors);
    }
    // Fallback to currentSelectedElements
    else if (this.currentSelectedElements && this.currentSelectedElements.length > 0) {
      selectedElements = this.currentSelectedElements;
    }
    
    // Handle case where description is passed as string
    if (typeof params === 'string') {
      return this.createElement({ 
        description: params, 
        selectedElements: selectedElements 
      });
    }
    
    // Handle object format
    if (typeof params === 'object' && params.description) {
      return this.createElement({
        description: params.description,
        html: params.html || null,
        css: params.css || null,
        selectedElements: selectedElements
      });
    }
    
    throw new Error('Invalid format. Expected: {"description": "what_to_create", "html": "<element>", "css": "styles", "elementSelectors": []}');
  }

  async deleteElementWrapper(params) {
    console.log('deleteElementWrapper called with params:', params);
    
    if (!params) {
      throw new Error('elementSelectors parameter is required');
    }
    
    let selectedElements = [];
    let confirmation = false;
    
    // Handle new elementSelectors format
    if (params.elementSelectors) {
      selectedElements = this.reconstructElementsFromSelectors(params.elementSelectors);
      confirmation = params.confirmation || false;
    }
    // Handle legacy selectedElements format
    else if (params.selectedElements) {
      selectedElements = params.selectedElements.filter(el => 
        el && el.nodeType && el.nodeType === Node.ELEMENT_NODE
      );
      confirmation = params.confirmation || false;
    }
    // Handle case where selectors come from currentElementSelectors
    else if (this.currentElementSelectors && this.currentElementSelectors.length > 0) {
      selectedElements = this.reconstructElementsFromSelectors(this.currentElementSelectors);
      confirmation = params.confirmation || false;
    }
    // Fallback to currentSelectedElements
    else if (this.currentSelectedElements && this.currentSelectedElements.length > 0) {
      selectedElements = this.currentSelectedElements;
      confirmation = params.confirmation || false;
    }
    // Handle case where params is array of selectors
    else if (Array.isArray(params)) {
      selectedElements = this.reconstructElementsFromSelectors(params);
      confirmation = true; // Auto-confirm for array format
    }
    
    if (selectedElements.length === 0) {
      throw new Error('elementSelectors parameter is required. Cannot delete elements without target elements.');
    }
    
    return this.deleteElement({
      selectedElements: selectedElements,
      confirmation: confirmation
    });
  }
}

export default DOMManipulationAgent;