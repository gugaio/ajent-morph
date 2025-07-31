import { Agent, Tool } from 'ajent';

class DOMManipulationAgent extends Agent {
  constructor() {
    super('dom_manipulation', 'Expert in DOM manipulation and CSS styling based on natural language commands');
        
    this.addTool(new Tool('analyzeElement', 'Analyze DOM element structure and current styles. Parameters: { elementData: "stringified JSON with tag, classes, id, text, dimensions, currentStyles" }', this.analyzeElement.bind(this)));
    this.addTool(new Tool('generateCSS', 'Generate CSS modifications based on user intent. Parameters: { command: "user natural language command", elementContext: "stringified JSON with element info" }', this.generateCSS.bind(this)));
    this.addTool(new Tool('validateStyles', 'Validate CSS properties and values. Parameters: { styles: "stringified JSON object with CSS properties and values" }', this.validateStyles.bind(this)));
  }

  instruction = () => {
    return `You are a DOM manipulation expert. Your role is to:

1. Understand natural language commands for visual changes
2. Analyze DOM elements and their current styling
3. Generate appropriate CSS modifications
4. Ensure browser compatibility and best practices

When receiving a request:
- Parse the user's intent (color changes, layout adjustments, typography, etc.)
- Consider the element's current state and context
- Generate precise CSS properties and values
- Explain what changes will be applied

Always respond with a JSON object containing:
{
    "action": "clear description of the action being performed",
    "styles": { "cssProperty": "cssValue" },
    "explanation": "user-friendly explanation of the changes"
}

Support for:
- Colors (including color names in Portuguese: azul, vermelho, verde, etc.)
- Typography (font size, weight, family)
- Layout (margins, padding, dimensions)
- Positioning and transforms
- Borders and shadows
- Background properties
- Flexbox and Grid properties

Be smart about:
- Adding default units (px) when numbers are provided without units
- Converting color names to hex/rgb values
- Handling responsive design considerations
- Maintaining accessibility standards`;
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