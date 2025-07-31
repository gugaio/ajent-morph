import { Agent, Tool } from 'ajent';

class DOMManipulationAgent extends Agent {
  constructor() {
    super('dom_manipulation', 'Expert in DOM manipulation and CSS styling based on natural language commands');

    this.addTool(new Tool('analyzeElement', 'Analyze DOM element structure and current styles. Parameters: { elementData: "stringified JSON with tag, classes, id, text, dimensions, currentStyles" }', this.analyzeElement.bind(this)));
    this.addTool(new Tool('generateCSS', 'Generate CSS modifications based on user intent. Parameters: { "command": "user natural language command", "elementContext": "stringified JSON with element info" }', this.generateCSS.bind(this)));
    this.addTool(new Tool('validateStyles', 'Validate CSS properties and values. Parameters: { styles: "stringified JSON object with CSS properties and values" }', this.validateStyles.bind(this)));
  }

  instruction = () => {
    return `You are a DOM manipulation expert specializing in converting natural language commands into valid CSS modifications. Your primary responsibility is generating syntactically correct, browser-compatible CSS that achieves the user's visual intent.

## CRITICAL CSS VALIDATION RULES

**NEVER generate invalid CSS syntax. Common mistakes to avoid:**
- ❌ WRONG: "text #ff0000" (invalid property-value pair)  
- ✅ CORRECT: "color: #ff0000"
- ❌ WRONG: "background blue" (missing colon)
- ✅ CORRECT: "background-color: blue"
- ❌ WRONG: "margin 10" (missing unit and colon)
- ✅ CORRECT: "margin: 10px"
- ❌ WRONG: "font bold" (incomplete property)
- ✅ CORRECT: "font-weight: bold"

**Always use proper CSS syntax: "property: value;"**

## RESPONSE FORMAT

Always respond with this exact JSON structure:
\`\`\`json
{
    "action": "Clear, concise description of what visual change will occur",
    "styles": {
        "cssProperty": "validCssValue",
        "anotherProperty": "anotherValidValue"
    },
    "explanation": "User-friendly explanation of the changes and their visual impact"
}
\`\`\`

## CSS PROPERTY EXAMPLES AND PATTERNS

### Colors
**Valid color formats:**
- Hex: "#ff0000", "#f00", "#rgba(255,0,0,0.5)"
- RGB: "rgb(255, 0, 0)", "rgba(255, 0, 0, 0.8)"
- HSL: "hsl(0, 100%, 50%)", "hsla(0, 100%, 50%, 0.8)"
- Named: "red", "blue", "transparent", "currentColor"

**Examples:**
- Text color: \`"color": "#ff0000"\`
- Background: \`"background-color": "rgba(0, 128, 255, 0.3)"\`
- Border: \`"border-color": "hsl(120, 50%, 60%)"\`

### Typography
**Font properties:**
- Size: \`"font-size": "16px"\`, \`"font-size": "1.2em"\`, \`"font-size": "clamp(14px, 2vw, 20px)"\`
- Weight: \`"font-weight": "bold"\`, \`"font-weight": "600"\`, \`"font-weight": "normal"\`
- Family: \`"font-family": "'Arial', sans-serif"\`, \`"font-family": "'Roboto', 'Helvetica', sans-serif"\`
- Style: \`"font-style": "italic"\`, \`"font-style": "normal"\`
- Transform: \`"text-transform": "uppercase"\`, \`"text-transform": "capitalize"\`
- Decoration: \`"text-decoration": "underline"\`, \`"text-decoration": "line-through"\`

### Layout & Spacing
**Box model:**
- Margin: \`"margin": "10px"\`, \`"margin": "10px 20px"\`, \`"margin-top": "15px"\`
- Padding: \`"padding": "1rem 2rem"\`, \`"padding-left": "20px"\`
- Width/Height: \`"width": "300px"\`, \`"height": "100vh"\`, \`"max-width": "100%"\`

**Positioning:**
- Position: \`"position": "relative"\`, \`"position": "absolute"\`, \`"position": "fixed"\`
- Top/Left: \`"top": "50%"\`, \`"left": "0"\`, \`"right": "auto"\`
- Z-index: \`"z-index": "1000"\`, \`"z-index": "-1"\`

### Visual Effects
**Borders:**
- Border: \`"border": "2px solid #333"\`, \`"border": "1px dashed red"\`
- Radius: \`"border-radius": "8px"\`, \`"border-radius": "50%"\`

**Shadows:**
- Box shadow: \`"box-shadow": "0 2px 4px rgba(0,0,0,0.1)"\`
- Text shadow: \`"text-shadow": "1px 1px 2px #333"\`

**Transforms:**
- Transform: \`"transform": "rotate(45deg)"\`, \`"transform": "scale(1.2) translateX(10px)"\`
- Transition: \`"transition": "all 0.3s ease"\`, \`"transition": "opacity 0.2s"\`

### Flexbox & Grid
**Flexbox:**
- Display: \`"display": "flex"\`, \`"display": "inline-flex"\`
- Direction: \`"flex-direction": "row"\`, \`"flex-direction": "column"\`
- Justify: \`"justify-content": "center"\`, \`"justify-content": "space-between"\`
- Align: \`"align-items": "center"\`, \`"align-items": "flex-start"\`
- Flex: \`"flex": "1"\`, \`"flex": "0 0 200px"\`

**Grid:**
- Display: \`"display": "grid"\`
- Template: \`"grid-template-columns": "1fr 2fr 1fr"\`, \`"grid-template-rows": "auto 1fr auto"\`
- Gap: \`"gap": "1rem"\`, \`"grid-gap": "10px 20px"\`

### Background Properties
**Background examples:**
- Color: \`"background-color": "#f5f5f5"\`
- Image: \`"background-image": "url('image.jpg')"\`, \`"background-image": "linear-gradient(45deg, #ff0000, #0000ff)"\`
- Size: \`"background-size": "cover"\`, \`"background-size": "100px 200px"\`
- Position: \`"background-position": "center"\`, \`"background-position": "top left"\`

## LANGUAGE SUPPORT

**Portuguese color names (convert to valid CSS values):**
- "azul" → \`"color": "blue"\`
- "vermelho" → \`"color": "red"\`
- "verde" → \`"color": "green"\`
- "amarelo" → \`"color": "yellow"\`
- "preto" → \`"color": "black"\`
- "branco" → \`"color": "white"\`
- "cinza" → \`"color": "gray"\`
- "rosa" → \`"color": "pink"\`
- "roxo" → \`"color": "purple"\`
- "laranja" → \`"color": "orange"\`

**Size/measurement terms:**
- "pequeno" → "12px" or "0.8rem"
- "médio" → "16px" or "1rem"  
- "grande" → "24px" or "1.5rem"
- "maior" → "32px" or "2rem"

## UNIT HANDLING

**Always add appropriate units:**
- Numbers without units → add "px": \`10\` becomes \`"10px"\`
- Percentages: \`"50%"\`, \`"100%"\`
- Relative units: \`"1rem"\`, \`"2em"\`, \`"50vh"\`, \`"100vw"\`
- Zero values can omit units: \`"0"\`

## REAL-WORLD EXAMPLES

### Example 1: Text Color Change
**User:** "Mude a cor do texto para vermelho"
**Response:**
\`\`\`json
{
    "action": "Change text color to red",
    "styles": {
        "color": "red"
    },
    "explanation": "The text color will change to red, making it more prominent and visible."
}
\`\`\`

### Example 2: Layout Adjustment
**User:** "Make this element centered with some padding"
**Response:**
\`\`\`json
{
    "action": "Center element and add padding",
    "styles": {
        "display": "flex",
        "justify-content": "center",
        "align-items": "center",
        "padding": "20px"
    },
    "explanation": "The element will be centered both horizontally and vertically using flexbox, with 20px of internal spacing on all sides."
}
\`\`\`

### Example 3: Complex Styling
**User:** "Make the button blue with rounded corners and a shadow"
**Response:**
\`\`\`json
{
    "action": "Style button with blue background, rounded corners, and shadow",
    "styles": {
        "background-color": "#007bff",
        "border-radius": "8px",
        "box-shadow": "0 2px 4px rgba(0, 0, 0, 0.1)",
        "border": "none",
        "color": "white",
        "padding": "10px 20px",
        "cursor": "pointer"
    },
    "explanation": "The button will have a blue background, rounded corners for a modern look, a subtle shadow for depth, and proper padding for better usability."
}
\`\`\`

### Example 4: Responsive Design
**User:** "Make this responsive and stack on mobile"
**Response:**
\`\`\`json
{
    "action": "Make layout responsive with mobile stacking",
    "styles": {
        "display": "flex",
        "flex-wrap": "wrap",
        "gap": "1rem",
        "@media (max-width: 768px)": {
            "flex-direction": "column"
        }
    },
    "explanation": "The layout will use flexbox to arrange items horizontally on desktop and stack vertically on mobile devices (screens smaller than 768px)."
}
\`\`\`

## ERROR PREVENTION CHECKLIST

Before responding, verify:
1. ✅ All CSS properties use kebab-case (e.g., "background-color", not "backgroundColor")
2. ✅ All values include appropriate units when needed
3. ✅ Color values are in valid CSS format
4. ✅ Property-value pairs are complete and syntactically correct
5. ✅ No typos in property names or values
6. ✅ JSON structure is valid and properly formatted
7. ✅ Response addresses the user's specific request

## ACCESSIBILITY CONSIDERATIONS

Always consider:
- **Color contrast:** Ensure sufficient contrast ratios (4.5:1 for normal text, 3:1 for large text)
- **Focus states:** Include focus styling for interactive elements
- **Screen readers:** Don't rely solely on color to convey information
- **Motion:** Respect prefers-reduced-motion preferences

## BROWSER COMPATIBILITY

Use widely supported properties and provide fallbacks when needed:
- Prefer standard properties over vendor prefixes
- Use feature detection for experimental features
- Provide fallback values for newer CSS properties

Remember: Your primary goal is generating valid, effective CSS that achieves the user's visual intent while maintaining code quality and accessibility standards.`;
};

  async analyzeElement({ elementData }) {
    const parsedData = typeof elementData === 'string' ? JSON.parse(elementData) : elementData;
    const { tag, classes, id, text, dimensions, currentStyles } = parsedData;

    let analysis = `Element Analysis:
- Tag: ${tag}
- Classes: ${classes?.join(', ') || 'none'}
- ID: ${id || 'none'}
- Text: "${text || 'no text content'}"
- Dimensions: ${dimensions?.width}x${dimensions?.height}px

Current Styling:`;

    if (currentStyles && Object.keys(currentStyles).length > 0) {
      Object.entries(currentStyles).forEach(([category, props]) => {
        if (Object.keys(props).length > 0) {
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

  async generateCSS({ command, elementContext }) {
    const parsedCommand = typeof command === 'string' ? command : JSON.stringify(command);
    const parsedContext = typeof elementContext === 'string' ? JSON.parse(elementContext) : elementContext;
    const intent = this.parseUserIntent(parsedCommand);
    const styles = {};
    let action = '';
    let explanation = '';

    switch (intent.type) {
    case 'color':
      if (intent.target === 'background' || intent.target === 'fundo') {
        styles.backgroundColor = this.normalizeColor(intent.value);
        action = 'Alteração de cor de fundo';
        explanation = `Cor de fundo alterada para ${intent.value}`;
      } else {
        styles.color = this.normalizeColor(intent.value);
        action = 'Alteração de cor do texto';
        explanation = `Cor do texto alterada para ${intent.value}`;
      }
      break;

    case 'size':
      if (intent.target === 'font' || intent.target === 'texto') {
        styles.fontSize = this.normalizeSize(intent.value);
        action = 'Alteração do tamanho da fonte';
        explanation = `Tamanho da fonte alterado para ${intent.value}`;
      } else if (intent.target === 'width' || intent.target === 'largura') {
        styles.width = this.normalizeSize(intent.value);
        action = 'Alteração da largura';
        explanation = `Largura alterada para ${intent.value}`;
      } else if (intent.target === 'height' || intent.target === 'altura') {
        styles.height = this.normalizeSize(intent.value);
        action = 'Alteração da altura';
        explanation = `Altura alterada para ${intent.value}`;
      }
      break;

    case 'spacing':
      if (intent.target === 'padding' || intent.target === 'espaçamento interno') {
        styles.padding = this.normalizeSize(intent.value);
        action = 'Alteração do espaçamento interno';
        explanation = `Espaçamento interno alterado para ${intent.value}`;
      } else if (intent.target === 'margin' || intent.target === 'espaçamento externo') {
        styles.margin = this.normalizeSize(intent.value);
        action = 'Alteração do espaçamento externo';
        explanation = `Espaçamento externo alterado para ${intent.value}`;
      }
      break;

    case 'border':
      if (intent.target === 'radius' || intent.target === 'arredondar') {
        styles.borderRadius = this.normalizeSize(intent.value);
        action = 'Aplicação de bordas arredondadas';
        explanation = `Bordas arredondadas com raio de ${intent.value}`;
      } else {
        styles.border = `1px solid ${this.normalizeColor(intent.value)}`;
        action = 'Adição de borda';
        explanation = `Borda adicionada com cor ${intent.value}`;
      }
      break;

    case 'hide':
      styles.display = 'none';
      action = 'Ocultação do elemento';
      explanation = 'Elemento foi ocultado';
      break;

    case 'show':
      styles.display = 'block';
      action = 'Exibição do elemento';
      explanation = 'Elemento foi tornado visível';
      break;

    default:
      // Fallback: try to extract any CSS-like properties from the command
      const extracted = this.extractCSSFromText(parsedCommand);
      Object.assign(styles, extracted.styles);
      action = extracted.action || 'Modificação de estilo';
      explanation = extracted.explanation || `Aplicando modificações baseadas no comando: "${parsedCommand}"`;
    }

    return {
      action,
      styles,
      explanation
    };
  }

  parseUserIntent(command) {
    const lowercaseCommand = command.toLowerCase();

    // Color patterns
    const colorPatterns = [
      { regex: /(?:mude|altere|coloque).*(?:cor|color).*(?:fundo|background).*(azul|vermelho|verde|amarelo|roxo|rosa|cinza|preto|branco|#[0-9a-f]{3,6})/i, type: 'color', target: 'background' },
      { regex: /(?:mude|altere|coloque).*(?:cor|color).*(azul|vermelho|verde|amarelo|roxo|rosa|cinza|preto|branco|#[0-9a-f]{3,6})/i, type: 'color', target: 'text' },
      { regex: /(?:fundo|background).*(azul|vermelho|verde|amarelo|roxo|rosa|cinza|preto|branco|#[0-9a-f]{3,6})/i, type: 'color', target: 'background' }
    ];

    // Size patterns
    const sizePatterns = [
      { regex: /(?:tamanho|size).*(?:fonte|font|texto).*(\d+(?:px|em|rem|%))/i, type: 'size', target: 'font' },
      { regex: /(?:largura|width).*(\d+(?:px|em|rem|%))/i, type: 'size', target: 'width' },
      { regex: /(?:altura|height).*(\d+(?:px|em|rem|%))/i, type: 'size', target: 'height' }
    ];

    // Spacing patterns
    const spacingPatterns = [
      { regex: /(?:padding|espaçamento.*interno).*(\d+(?:px|em|rem))/i, type: 'spacing', target: 'padding' },
      { regex: /(?:margin|espaçamento.*externo).*(\d+(?:px|em|rem))/i, type: 'spacing', target: 'margin' }
    ];

    // Border patterns
    const borderPatterns = [
      { regex: /(?:arredondar|radius|borda.*redonda).*(\d+(?:px|em|rem))/i, type: 'border', target: 'radius' },
      { regex: /(?:borda|border).*(azul|vermelho|verde|amarelo|roxo|rosa|cinza|preto|branco|#[0-9a-f]{3,6})/i, type: 'border', target: 'color' }
    ];

    // Action patterns
    if (/(?:esconder|ocultar|hide)/.test(lowercaseCommand)) {
      return { type: 'hide' };
    }
    if (/(?:mostrar|exibir|show)/.test(lowercaseCommand)) {
      return { type: 'show' };
    }

    // Check all patterns
    const allPatterns = [...colorPatterns, ...sizePatterns, ...spacingPatterns, ...borderPatterns];

    for (const pattern of allPatterns) {
      const match = command.match(pattern.regex);
      if (match) {
        return {
          type: pattern.type,
          target: pattern.target,
          value: match[1]
        };
      }
    }

    return { type: 'unknown', command };
  }

  extractCSSFromText(text) {
    const patterns = {
      color: /(?:color|cor)[:\s]+([#\w\(\),\s]+)/i,
      backgroundColor: /(?:background|fundo)[:\s]+([#\w\(\),\s]+)/i,
      fontSize: /(?:font-?size|tamanho)[:\s]+(\d+(?:px|em|rem|%))/i,
      padding: /(?:padding|espaçamento)[:\s]+(\d+(?:px|em|rem))/i,
      margin: /(?:margin|margem)[:\s]+(\d+(?:px|em|rem))/i,
      borderRadius: /(?:border-?radius|arredondar)[:\s]+(\d+(?:px|em|rem))/i,
      width: /(?:width|largura)[:\s]+(\d+(?:px|em|rem|%))/i,
      height: /(?:height|altura)[:\s]+(\d+(?:px|em|rem|%))/i
    };

    const styles = {};
    let action = 'Modificação de estilo';

    Object.entries(patterns).forEach(([prop, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        let value = match[1].trim();
        if (prop === 'color' || prop === 'backgroundColor') {
          value = this.normalizeColor(value);
        } else if (prop !== 'width' && prop !== 'height' && /^\d+$/.test(value)) {
          value += 'px';
        }
        styles[prop] = value;
      }
    });

    return {
      action,
      styles,
      explanation: `Modificações aplicadas baseadas no texto: "${text}"`
    };
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
      'white': '#FFFFFF'
    };

    return colorMap[color.toLowerCase()] || color;
  }

  normalizeSize(size) {
    if (typeof size === 'string' && /^\d+$/.test(size)) {
      return size + 'px';
    }
    return size;
  }

  async validateStyles({ styles }) {
    const parsedStyles = typeof styles === 'string' ? JSON.parse(styles) : styles;
    const validCSSProperties = new Set([
      'display', 'position', 'top', 'right', 'bottom', 'left',
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight',
      'color', 'backgroundColor', 'border', 'borderRadius', 'boxShadow',
      'textAlign', 'textDecoration', 'textTransform',
      'flexDirection', 'justifyContent', 'alignItems', 'flex',
      'gridTemplateColumns', 'gridTemplateRows', 'gridGap',
      'transform', 'transition', 'animation', 'opacity', 'visibility'
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

export default DOMManipulationAgent;