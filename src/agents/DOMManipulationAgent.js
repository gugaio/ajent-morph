import { Agent, Tool } from 'ajent';
import ResponseApplier from '../core/ResponseApplier.js';

class DOMManipulationAgent extends Agent {
  constructor() {
    super('dom_manipulation', 'Expert in DOM manipulation and CSS styling based on natural language commands');
    
    // Initialize ResponseApplier for applying styles and maintaining history
    this.applier = new ResponseApplier();

    this.addTool(new Tool('applyStyles', 'Apply CSS styles to selected elements and return success status. Call with: {"description": "what_will_happen_visually", "styles": {"cssProperty": "value"}, "elementSelectors": ["#id", ".class", "tagname"]}', (params) => this.applyStylesWrapper(params)));
    this.addTool(new Tool('validateStyles', 'Validate CSS properties and values. Call with: {"styles": object_with_css_properties}', (params) => this.validateStylesWrapper(params)));
    this.addTool(new Tool('createElement', 'Create new HTML elements with complete styling. Call with: {"description": "what_to_create", "html": "<div>content</div>", "css": "optional inline CSS", "elementSelectors": ["#id", ".class"], "insertionMode": "append|replace|after|before"}', (params) => this.createElementWrapper(params)));
    this.addTool(new Tool('createInteractiveElement', 'Create interactive HTML elements with JavaScript behavior. Call with: {"description": "what_to_create", "html": "<button>Click me</button>", "css": "styling", "javascript": "element.onclick = () => alert(\'test\')", "elementSelectors": ["#id", ".class"], "insertionMode": "append|replace|after|before"}', (params) => this.createInteractiveElementWrapper(params)));
    this.addTool(new Tool('addBehavior', 'Add JavaScript behavior to existing elements. Call with: {"description": "what_behavior_to_add", "elementSelectors": ["#id", ".class"], "events": {"click": "alert(\'clicked\')", "mouseenter": "this.style.opacity=0.8"}}', (params) => this.addBehaviorWrapper(params)));
    this.addTool(new Tool('executeScript', 'Execute custom JavaScript in page context. Call with: {"description": "what_script_does", "code": "console.log(\'hello\')", "context": "global"}', (params) => this.executeScriptWrapper(params)));
    this.addTool(new Tool('deleteElement', 'Delete selected DOM elements. Call with: {"elementSelectors": ["#id", ".class"], "confirmation": true}', (params) => this.deleteElementWrapper(params)));
    this.addTool(new Tool('generateClaudeCodeInstructions', 'Generate instructions for Claude Code IDE to implement frontend changes based on change history. Call without parameters: generateClaudeCodeInstructions()', () => this.generateClaudeCodeInstructions()));
    this.addTool(new Tool('generateImage', 'Generate an image using OpenAI API and apply it to elements or create new elements with the image. Call with: {"description": "what_image_to_generate", "prompt": "detailed_image_description", "elementSelectors": ["#id", ".class"], "applyAs": "background|element"}', (params) => this.generateImageWrapper(params)));
    this.addTool(new Tool('planTask', 'Create or update a visual task plan for complex operations. Call with: {"action": "create|update", "tasks": [{"description": "task description", "status": "pending|in_progress|completed"}]}', (params) => this.planTaskWrapper(params)));
  }

  instruction = () => {
    return `You are a DOM manipulation expert that processes natural language commands to modify web page elements. Your responsibility is to analyze user intent and execute the appropriate action using the correct tools.

## CRITICAL: TOOL PARAMETER FORMAT

**ATTENTION:** All tool calls must use the EXACT parameter format specified below. Do NOT deviate from these formats:

1. **applyStyles** - MUST use "elementSelectors" (array of CSS selectors)
2. **createElement** - MUST use "elementSelectors" (array, can be empty)  
3. **createInteractiveElement** - MUST use "elementSelectors" (array, can be empty)
4. **addBehavior** - MUST use "elementSelectors" (array of CSS selectors)
5. **executeScript** - For global JavaScript execution
6. **deleteElement** - MUST use "elementSelectors" (array of CSS selectors)
7. **generateImage** - MUST use "elementSelectors" (array, can be empty) for applying images

**WRONG:** \`"selectedElements": [objects]\`
**CORRECT:** \`"elementSelectors": ["#id", ".class"]\`

## INTENT IDENTIFICATION AND ACTION DECISION

**CRITICAL:** Distinguish between ACTION requests and INFORMATION requests:

### 🔄 REPLACEMENT STRATEGY (VERY IMPORTANT)
**For replacement commands like "trocar logo por menu", "substituir botão", "mudar para":**
1. **NEVER** call deleteElement first  
2. **ALWAYS** use createElement with insertionMode: "replace"
3. This ensures atomic replacement without losing the target position

**Wrong approach:** deleteElement + createElement → element ends up at bottom of page
**Correct approach:** createElement with insertionMode: "replace" → element replaces original position

### 📋 AUTOMATIC TASK PLANNING WORKFLOW
**For complex commands, ALWAYS follow this sequence:**
1. **FIRST:** Call planTask with action: "create" and break down the task into 3-8 steps
2. **THEN:** Execute each step while calling planTask with action: "update" to show progress  
3. **FINALLY:** Complete all tasks and let the plan auto-hide after 3 seconds

**Example complex command workflow:**
User: "Crie um formulário de contato completo"
1. planTask(action: "create", tasks: [...]) → Show plan to user
2. createInteractiveElement(...) → Create form structure  
3. planTask(action: "update", tasks: [...]) → Update progress
4. Continue until all steps completed

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
**When:** User wants to add new static elements to the page
**Examples:** "adicione um botão", "crie um card similar", "duplique este elemento", "add a button"
**Action:** Call createElement tool

#### 3. INTERACTIVE ELEMENT CREATION INTENT
**When:** User wants to create elements with JavaScript behavior
**Examples:** "crie um botão que mostra alerta", "adicione contador interativo", "botão que muda cor ao clicar", "form com validação"
**Action:** Call createInteractiveElement tool

#### 4. ADD BEHAVIOR INTENT
**When:** User wants to add JavaScript behavior to existing elements
**Examples:** "adicione click handler", "faça este botão mostrar alerta", "quando clicar mude a cor", "adicione hover effect"
**Action:** Call addBehavior tool

#### 5. SCRIPT EXECUTION INTENT
**When:** User wants to run custom JavaScript code or create global utilities
**Examples:** "execute este código", "crie uma função global", "adicione script personalizado", "rode este JavaScript"
**Action:** Call executeScript tool

#### 6. ELEMENT DELETION INTENT
**When:** User wants to remove elements from the page  
**Examples:** "remova este elemento", "delete", "apague isso", "remove this"  
**Action:** Call deleteElement tool

**CRITICAL:** For replacement operations ("trocar", "substituir", "mudar para"), DO NOT use deleteElement + createElement. Instead, use createElement with insertionMode: "replace" directly.

#### 7. IMAGE GENERATION INTENT
**When:** User wants to generate images and apply them to elements or create new image elements
**Examples:** "adicione uma imagem de", "crie uma imagem de", "gere uma imagem", "coloque uma foto de", "background com imagem de", "fundo com", "generate image"
**Action:** Call generateImage tool

#### 8. CLAUDE CODE INSTRUCTIONS INTENT
**When:** User wants to generate instructions for Claude Code IDE to implement changes
**Examples:** "Gerar instruções Claude Code", "Instruções para IDE", "Claude Code instructions", "generate IDE instructions"
**Action:** Call generateClaudeCodeInstructions tool, then parse and analyze the returned JSON data
**NOTE:** This tool returns a JSON string with changeHistory array containing elementContext - you must parse, analyze, and create specific instructions using unique selectors

#### 9. TASK PLANNING INTENT (AUTO-TRIGGERED)
**When:** User requests complex operations that require multiple steps
**Examples:** "Crie um formulário completo", "Transforme em dark mode", "Faça um dashboard", "Adicione sistema de navegação", "Construa uma landing page", "Crie um sistema de login"
**Action:** AUTOMATICALLY call planTask tool first to break down the task, then execute each step while updating progress
**Benefits:** Better organization, user visibility, reduced errors, step-by-step execution

**AUTOMATIC PLANNING TRIGGERS:**
- Commands with words like: "completo", "sistema", "dashboard", "formulário", "navegação", "página", "website", "aplicação"
- Multi-component requests: "formulário com validação e envio", "header com menu e logo"
- Style transformations: "transforme em dark mode", "faça responsivo"
- Complex UI: "crie um modal", "adicione carousel", "faça slider"

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
  "elementSelectors": ["#id", ".class"], // reference elements (can be empty array)
  "insertionMode": "replace" // IMPORTANT: choose insertion strategy (replace|append|after|before)
}
\`\`\`

**IMPORTANT for createElement:**
- Always provide complete, valid HTML in the "html" field
- Include all necessary content, structure, and classes
- Use "css" field for additional inline styles if needed
- Make HTML semantic and accessible
- For complex components, include all inner elements in the HTML
- CSS should be inline styles for immediate application

**INSERTION MODE USAGE:**
- Use **"replace"** when user wants to substitute/change an existing element (e.g., "trocar logo por menu")
- Use **"append"** for adding new content inside existing elements
- Use **"after"** to insert next to selected element (same parent level)
- Use **"before"** to insert before selected element (same parent level)

**REPLACEMENT EXAMPLES:**
✅ **Correct:** User says "trocar logo por ícone de menu"
- Call createElement with insertionMode: "replace" and elementSelectors pointing to the logo
- This will replace the logo in its exact position

❌ **Wrong:** deleteElement + createElement (causes element to appear at bottom)
- Never delete first and then create - this loses the target position
- Element will end up at the bottom of the page

**createElement Examples:**
- Simple button: \`"html": "<button>Click Me</button>", "css": "background: blue; color: white; padding: 10px;"\`
- Card component: \`"html": "<div class='card'><h3>Title</h3><p>Content</p></div>", "css": "border: 1px solid #ddd; padding: 20px; border-radius: 8px;"\`
- Form element: \`"html": "<div><label>Name:</label><input type='text' placeholder='Enter name'></div>", "css": "margin: 10px 0;"\`

### For Interactive Element Creation (createInteractiveElement):
**CRITICAL:** You must call createInteractiveElement with this EXACT format:
\`\`\`javascript
{
  "description": "Description of interactive element to create",
  "html": "<button id='my-btn'>Click Me</button>",
  "css": "padding: 10px 20px; background: blue; color: white; border: none; border-radius: 4px; cursor: pointer;",
  "javascript": "element.addEventListener('click', () => alert('Hello!'));",
  "elementSelectors": ["#reference"], // reference elements (can be empty array)
  "insertionMode": "replace" // IMPORTANT: choose insertion strategy (replace|append|after|before)
}
\`\`\`

**IMPORTANT for createInteractiveElement:**
- Use "element" to reference the created element in JavaScript
- JavaScript has access to: element, document, window, console, alert, setTimeout, setInterval
- For event handlers, use: element.addEventListener('event', callback)
- For direct assignment, use: element.onclick = callback

### For Adding Behavior (addBehavior):
**CRITICAL:** You must call addBehavior with this EXACT format:
\`\`\`javascript
{
  "description": "Description of behavior to add",
  "elementSelectors": ["#button", ".clickable"],
  "events": {
    "click": "alert('Clicked!'); console.log('Button clicked');",
    "mouseenter": "this.style.opacity = '0.8';",
    "mouseleave": "this.style.opacity = '1';"
  }
}
\`\`\`

### For Script Execution (executeScript):
**CRITICAL:** You must call executeScript with this EXACT format:
\`\`\`javascript
{
  "description": "Description of what the script does",
  "code": "console.log('Hello World'); window.myFunction = () => alert('Global function');",
  "context": "global"
}
\`\`\`

### For Element Deletion (deleteElement):
**CRITICAL:** You must call deleteElement with this EXACT format:
\`\`\`javascript
{
  "elementSelectors": ["#id", ".class", "tagname"], // CSS selectors for elements to delete
  "confirmation": true // required for safety
}
\`\`\`

### For Image Generation (generateImage):
**CRITICAL:** You must call generateImage with this EXACT format:
\`\`\`javascript
{
  "description": "Description of what image to generate",
  "prompt": "Detailed prompt for image generation (e.g., 'a futuristic city with floating buildings')",
  "elementSelectors": ["#id", ".class"], // CSS selectors for target elements (can be empty array)
  "applyAs": "background" // or "element" - how to apply the image
}
\`\`\`

**IMPORTANT for generateImage:**
- **description**: Clear description of what you're creating/applying
- **prompt**: Detailed description for DALL-E image generation in English or Portuguese
- **elementSelectors**: Array of CSS selectors where to apply image (empty array creates new img element)
- **applyAs**: "background" applies as background-image to selected elements, "element" creates new img tag
- The tool will automatically handle API calls, image URL extraction, and DOM manipulation
- Generated images are tracked in history for undo functionality

**generateImage Examples:**
- Background for element: \`{"description": "Apply mountain landscape background", "prompt": "beautiful mountain landscape at sunrise", "elementSelectors": ["#hero"], "applyAs": "background"}\`
- New image element: \`{"description": "Create cat image", "prompt": "cute orange tabby cat sitting in sunlight", "elementSelectors": [], "applyAs": "element"}\`
- Multiple elements: \`{"description": "Apply space background", "prompt": "deep space with stars and galaxies", "elementSelectors": [".card", ".hero"], "applyAs": "background"}\`

### For Claude Code Instructions (generateClaudeCodeInstructions):
**CRITICAL:** You must call generateClaudeCodeInstructions with NO parameters:
\`\`\`javascript
generateClaudeCodeInstructions()
\`\`\`

**IMPORTANT for generateClaudeCodeInstructions:**
- This tool does NOT require any parameters or selected elements
- It returns a JSON string containing: {changeHistory: [], totalChanges: number, imageDownloads: [], message: string}
- You MUST parse the JSON, analyze the changeHistory array, and create detailed Claude Code instructions
- Each change has: timestamp, element, command, response, previousState, appliedChanges, elementContext
- Use elementContext.uniqueSelector for specific CSS targeting instead of generic selectors
- **IMAGE DOWNLOADS**: If imageDownloads array exists, you MUST include download and file organization instructions:
  - Create \`"src/assets/images/"\` directory if it doesn't exist
  - Download each image from originalUrl and save as filename
  - Update CSS references to use localPath instead of temporary URLs
  - Provide specific curl or fetch commands for downloading images

### For Task Planning (planTask):
**CRITICAL:** You must call planTask with action and tasks array format.

**IMPORTANT for planTask:**
- Use \"create\" action for new task plans, \"update\" for modifying existing ones
- Each task must have description and status (\"pending\", \"in_progress\", \"completed\")
- Break complex operations into 3-8 manageable steps
- Update task status as you work through the plan
- Always show the updated plan to the user for transparency
- Use this tool for commands that require multiple coordinated steps
- Examples: \"Create complete dashboard\", \"Transform to dark theme\", \"Build navigation system\"


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

### Example 6: Interactive Element Creation
**User:** "Crie um botão que mostra alerta quando clicado"
**Your call:**
\`\`\`javascript
createInteractiveElement({
  "description": "Create button with click alert",
  "html": "<button id='alert-btn' class='interactive-btn'>Clique Aqui!</button>",
  "css": "padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; transition: background 0.3s;",
  "javascript": "element.addEventListener('click', () => { alert('Botão clicado!'); console.log('Button clicked at:', new Date()); });",
  "elementSelectors": []
})
\`\`\`

### Example 7: Adding Behavior to Existing Elements
**User:** "Faça este botão mudar de cor quando passar o mouse"
**Your call:**
\`\`\`javascript
addBehavior({
  "description": "Add hover color change effect",
  "elementSelectors": ["#myButton"],
  "events": {
    "mouseenter": "this.style.backgroundColor = '#0056b3'; this.style.transform = 'scale(1.05)';",
    "mouseleave": "this.style.backgroundColor = '#007bff'; this.style.transform = 'scale(1)';",
    "click": "console.log('Button clicked!'); this.style.boxShadow = '0 4px 8px rgba(0,123,255,0.3)';"
  }
})
\`\`\`

### Example 8: Complex Interactive Form
**User:** "Crie um formulário de contato com validação"
**Your call:**
\`\`\`javascript
createInteractiveElement({
  "description": "Create contact form with validation",
  "html": "<form id='contact-form' class='contact-form'><h3>Contato</h3><div><label>Nome:</label><input type='text' id='name' required></div><div><label>Email:</label><input type='email' id='email' required></div><div><label>Mensagem:</label><textarea id='message' required></textarea></div><button type='submit'>Enviar</button></form>",
  "css": "padding: 20px; border: 1px solid #ddd; border-radius: 12px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px; font-family: Arial, sans-serif;",
  "javascript": "element.addEventListener('submit', (e) => { e.preventDefault(); const name = element.querySelector('#name').value; const email = element.querySelector('#email').value; const message = element.querySelector('#message').value; if(name && email && message) { alert('Formulário enviado com sucesso!'); console.log('Form data:', {name, email, message}); element.reset(); } else { alert('Por favor, preencha todos os campos!'); } });",
  "elementSelectors": []
})
\`\`\`

### Example 9: Global Script Execution
**User:** "Crie uma função global que conta cliques na página"
**Your call:**
\`\`\`javascript
executeScript({
  "description": "Create global click counter function",
  "code": "window.clickCounter = 0; window.trackClicks = function() { window.clickCounter++; console.log('Total clicks:', window.clickCounter); }; document.addEventListener('click', window.trackClicks); console.log('Click counter initialized');",
  "context": "global"
})
\`\`\`

### Example 10: Element Deletion
**User:** "Remova este elemento"
**Your call:**
\`\`\`javascript
deleteElement({
  "elementSelectors": ["#elementToDelete"],
  "confirmation": true
})
\`\`\`

### Example 11: Image Generation
**User:** "Adicione uma imagem de uma paisagem de montanha como fundo"
**Your call:**
\`\`\`javascript
generateImage({
  "description": "Apply mountain landscape background to selected element",
  "prompt": "beautiful mountain landscape with snow-capped peaks at sunrise, dramatic clouds, serene lake reflection",
  "elementSelectors": ["#hero"],
  "applyAs": "background"
})
\`\`\`

**User:** "Crie uma imagem de um gato fofo"
**Your call:**
\`\`\`javascript
generateImage({
  "description": "Create cute cat image element",
  "prompt": "adorable fluffy orange tabby cat sitting in warm sunlight, big green eyes, soft fur texture",
  "elementSelectors": [],
  "applyAs": "element"
})
\`\`\`

### Example 12: Claude Code Instructions Generation
**User:** "Gerar instruções Claude Code"
**Your call:**
\`\`\`javascript
generateClaudeCodeInstructions()
\`\`\`

**Your follow-up:** 
1. The tool returns a JSON string - parse it to get the changeHistory and imageDownloads arrays
2. Analyze each change in the array (CSS modifications, elements created, etc.)
3. For each change, use elementContext.uniqueSelector for specific targeting
4. If imageDownloads exist, create download and file organization instructions
5. Create comprehensive, actionable instructions for Claude Code IDE with precise selectors
6. Use final_answer with the formatted instructions as a string

**Example of improved instruction generation:**
Instead of: "Alterar estilo do texto para itálico no elemento <p>"
Generate: "Alterar estilo do texto para itálico no elemento .hero-text p:first-child"

**Example with image downloads:**
\`\`\`
## 🖼️ Image Assets Setup
1. Create assets directory: mkdir -p src/assets/images
2. Download generated images:
   - curl "https://oaidalleapi..." -o "src/assets/images/frontable-2024-01-15-abc123.png"
3. Update CSS references from temporary URLs to local paths

## 📝 CSS Modifications
1. Update .hero background-image to use local asset path
\`\`\`

## INTERACTIVE ELEMENT BEST PRACTICES

### JavaScript Safety and Power
- Use the "element" reference to access the created element directly
- Access common globals: console, alert, prompt, confirm, setTimeout, setInterval
- Use helper functions: $() for querySelector, $$() for querySelectorAll
- Event handlers are automatically wrapped in try-catch for safety
- Elements can interact with each other using selectors

### Event Handler Examples
**Click Events:**
\`\`\`javascript
"click": "alert('Clicked!'); this.textContent = 'Clicked ' + (this.clickCount = (this.clickCount || 0) + 1) + ' times';"
\`\`\`

**Form Validation:**
\`\`\`javascript
"submit": "event.preventDefault(); const input = this.querySelector('input'); if(!input.value) { alert('Required!'); return; } alert('Valid!');"
\`\`\`

**Animation Effects:**
\`\`\`javascript
"mouseenter": "this.style.transform = 'scale(1.1)'; this.style.transition = 'transform 0.3s';",
"mouseleave": "this.style.transform = 'scale(1)';"
\`\`\`

**Data Storage:**
\`\`\`javascript
"click": "const count = parseInt(localStorage.getItem('buttonClicks') || '0') + 1; localStorage.setItem('buttonClicks', count); this.textContent = 'Clicked ' + count + ' times';"
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
1. 🎯 **Identify Intent**: Analyze user command (modify, create, delete, generate image, or Claude Code instructions)
2. 🔧 **Execute Tool**: Call appropriate tool (applyStyles, createElement, deleteElement, generateImage, generateClaudeCodeInstructions)
3. 📊 **Process Results**: For Claude Code instructions, analyze the returned changeHistory object; for images, confirm generation and application
4. ✅ **Provide Final Answer**: Use final_answer tool with formatted instructions or summary

### Example Final Answer Usage:
After calling applyStyles tool:
\`\`\`
final_answer({
  "response": "✅ Cor do texto alterada para vermelho com sucesso! O elemento agora possui a cor vermelha aplicada."
})
\`\`\`

After calling generateClaudeCodeInstructions tool:
\`\`\`
final_answer({
  "response": "🎯 **Instruções para Claude Code IDE:**\\n\\n## Modificações CSS\\n1. Alterar cor do texto para azul no elemento .button\\n   - color: blue\\n\\n## Elementos Criados\\n1. Novo botão com HTML: <button>Click Me</button>\\n\\n## Implementação\\n- Adicione as modificações CSS ao arquivo de estilos\\n- Integre novos elementos nos templates apropriados"
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
      'background', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat', 'backgroundAttachment',
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
        // Determine insertion strategy based on description context and explicit mode
        const insertionMode = this.determineInsertionMode(description, selectedElements, params.insertionMode);
        const insertionInfo = this.findInsertionPoint(selectedElements, insertionMode);
        
        this.insertElementAtPoint(newElement, insertionInfo);
        
        // Add visual indicator for new element
        this.addNewElementIndicator(newElement);
        
        // Use ResponseApplier to track this creation in history
        await this.applier.applyLLMResponse(
          {
            action: 'create_element',
            explanation: `Elemento criado: ${description}`,
            styles: {}, // No styles applied, just element creation
            html: html || newElement.outerHTML,
            insertionMode: insertionMode
          },
          newElement,
          `createElement: ${description}`
        );
        
        const actionMessage = insertionMode === 'replace' 
          ? 'substituído' 
          : insertionMode === 'after' || insertionMode === 'before'
            ? 'inserido adjacente ao elemento selecionado'
            : 'adicionado à página';
            
        return `✅ Elemento criado: ${description}. O novo elemento foi ${actionMessage}.`;
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

  async createInteractiveElement(params) {
    const { description, html, css, javascript, elementSelectors = [] } = params;
    
    if (!description) {
      return 'Descrição é obrigatória para criar elemento interativo.';
    }
    
    if (!html || !html.trim()) {
      return 'HTML é obrigatório para criar elemento interativo.';
    }
    
    let newElement = null;
    
    try {
      // Create element from HTML and CSS
      newElement = this.createElementFromHTML(html, css);
      
      // Add JavaScript behavior if provided
      if (javascript && javascript.trim()) {
        this.addJavaScriptBehavior(newElement, javascript);
      }
      
      // Determine insertion strategy based on description context and explicit mode
      const insertionMode = this.determineInsertionMode(description, elementSelectors, params.insertionMode);
      const insertionInfo = this.findInsertionPoint(elementSelectors, insertionMode);
      
      this.insertElementAtPoint(newElement, insertionInfo);
      
      // Add visual indicator for new element
      this.addNewElementIndicator(newElement);
      
      // Track in history
      await this.applier.applyLLMResponse({
        action: 'create_interactive_element',
        explanation: `Elemento interativo criado: ${description}`,
        styles: {},
        html: newElement.outerHTML,
        javascript: javascript || '',
        insertionMode: insertionMode
      }, newElement, `createInteractiveElement: ${description}`);
      
      const actionMessage = insertionMode === 'replace' 
        ? 'substituído com comportamento interativo' 
        : 'criado com comportamento JavaScript';
        
      return `✅ Elemento interativo criado: ${description}. ${actionMessage}.`;
      
    } catch (error) {
      console.error('Error creating interactive element:', error);
      return `Erro ao criar elemento interativo: ${error.message}`;
    }
  }

  addJavaScriptBehavior(element, code) {
    try {
      // Create safe execution context with commonly used globals
      const safeGlobals = {
        element: element,
        console: window.console,
        alert: window.alert,
        prompt: window.prompt,
        confirm: window.confirm,
        setTimeout: window.setTimeout,
        setInterval: window.setInterval,
        clearTimeout: window.clearTimeout,
        clearInterval: window.clearInterval,
        document: document,
        window: window,
        // Helper functions
        $: (selector) => document.querySelector(selector),
        $$: (selector) => document.querySelectorAll(selector)
      };
      
      // Execute JavaScript with element context and safe globals
      const func = new Function(
        'element', 'console', 'alert', 'prompt', 'confirm', 
        'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 
        'document', 'window', '$', '$$',
        code
      );
      
      func.call(element, ...Object.values(safeGlobals));
      
      console.log('✅ JavaScript behavior added successfully to element:', element);
      
    } catch (error) {
      console.error('❌ JavaScript execution error:', error);
      throw new Error(`JavaScript error: ${error.message}`);
    }
  }

  async addBehavior(params) {
    const { description, elementSelectors = [], events = {} } = params;
    
    if (!description) {
      return 'Descrição é obrigatória para adicionar comportamento.';
    }
    
    if (!elementSelectors || elementSelectors.length === 0) {
      return 'elementSelectors é obrigatório para adicionar comportamento a elementos existentes.';
    }
    
    if (!events || Object.keys(events).length === 0) {
      return 'Events object é obrigatório para definir comportamentos.';
    }
    
    try {
      // Reconstruct elements from selectors
      const elements = this.reconstructElementsFromSelectors(elementSelectors);
      
      if (elements.length === 0) {
        return `Nenhum elemento encontrado com os seletores fornecidos: ${elementSelectors.join(', ')}.`;
      }
      
      let successCount = 0;
      const results = [];
      
      // Add behavior to each element
      elements.forEach((element) => {
        try {
          // Add each event handler
          Object.entries(events).forEach(([eventType, handlerCode]) => {
            const wrappedCode = `
              const handler = function(event) {
                try {
                  ${handlerCode}
                } catch (error) {
                  console.error('Event handler error:', error);
                }
              };
              element.addEventListener('${eventType}', handler);
            `;
            
            this.addJavaScriptBehavior(element, wrappedCode);
          });
          
          successCount++;
          results.push({
            element: this.getElementInfo(element),
            success: true,
            events: Object.keys(events)
          });
          
        } catch (error) {
          results.push({
            element: this.getElementInfo(element),
            success: false,
            error: error.message
          });
        }
      });
      
      // Track in history
      if (successCount > 0) {
        await this.applier.applyLLMResponse({
          action: 'add_behavior',
          explanation: `Comportamento adicionado: ${description}`,
          styles: {},
          eventTypes: Object.keys(events),
          elementCount: successCount
        }, elements[0], `addBehavior: ${description}`);
      }
      
      const message = successCount === elements.length 
        ? `✅ Comportamento adicionado: ${description}. ${successCount} elemento(s) atualizados com eventos: ${Object.keys(events).join(', ')}.`
        : `⚠️ Comportamento parcialmente adicionado: ${successCount}/${elements.length} elemento(s) atualizados.`;
      
      return message;
      
    } catch (error) {
      console.error('Error adding behavior:', error);
      return `Erro ao adicionar comportamento: ${error.message}`;
    }
  }

  async executeScript(params) {
    const { description, code, context = 'global' } = params;
    
    if (!description) {
      return 'Descrição é obrigatória para executar script.';
    }
    
    if (!code || !code.trim()) {
      return 'Código JavaScript é obrigatório para executar script.';
    }
    
    try {
      let result;
      
      if (context === 'global') {
        // Execute in global context with access to document and window
        const func = new Function(
          'document', 'window', 'console', 'alert', 'prompt', 'confirm',
          'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
          '$', '$$',
          code
        );
        
        result = func(
          document, window, window.console, window.alert, 
          window.prompt, window.confirm, window.setTimeout, 
          window.setInterval, window.clearTimeout, window.clearInterval,
          (selector) => document.querySelector(selector),
          (selector) => document.querySelectorAll(selector)
        );
      } else {
        // Execute in restricted context
        const func = new Function(
          'console', '$', '$$',
          code
        );
        
        result = func(
          window.console,
          (selector) => document.querySelector(selector),
          (selector) => document.querySelectorAll(selector)
        );
      }
      
      // Track in history
      await this.applier.applyLLMResponse({
        action: 'execute_script',
        explanation: `Script executado: ${description}`,
        styles: {},
        code: code,
        context: context
      }, document.body, `executeScript: ${description}`);
      
      const resultInfo = result !== undefined ? ` Resultado: ${result}` : '';
      return `✅ Script executado: ${description}.${resultInfo}`;
      
    } catch (error) {
      console.error('Script execution error:', error);
      return `Erro ao executar script: ${error.message}`;
    }
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

  findInsertionPoint(elementSelectors, insertionMode = 'append') {
    // Handle both element selectors and actual elements
    let elements = [];
    
    if (Array.isArray(elementSelectors)) {
      if (elementSelectors.length > 0) {
        // Check if it's an array of selectors (strings) or elements
        if (typeof elementSelectors[0] === 'string') {
          elements = this.reconstructElementsFromSelectors(elementSelectors);
        } else if (elementSelectors[0] && elementSelectors[0].nodeType) {
          elements = elementSelectors;
        }
      }
    }
    
    if (elements.length > 0) {
      const lastSelected = elements[elements.length - 1];
      
      // For replacement mode, return info needed for replacement
      if (insertionMode === 'replace') {
        return {
          type: 'replace',
          target: lastSelected,
          parent: lastSelected.parentNode,
          nextSibling: lastSelected.nextSibling
        };
      }
      
      // For adjacent insertion
      if (insertionMode === 'after') {
        return {
          type: 'after', 
          target: lastSelected,
          parent: lastSelected.parentNode,
          nextSibling: lastSelected.nextSibling
        };
      }
      
      if (insertionMode === 'before') {
        return {
          type: 'before',
          target: lastSelected,
          parent: lastSelected.parentNode,
          nextSibling: lastSelected
        };
      }
      
      // Default append mode - insert into parent
      const parent = lastSelected.parentNode;
      if (parent) {
        return {
          type: 'append',
          target: parent,
          parent: parent
        };
      }
    }
    
    return {
      type: 'append',
      target: document.body,
      parent: document.body
    };
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

  // Simple method to provide insertion options - let LLM decide
  determineInsertionMode(description, selectedElements = [], explicitMode = null) {
    // If LLM explicitly chose a mode, use it
    if (explicitMode && ['append', 'replace', 'after', 'before'].includes(explicitMode)) {
      return explicitMode;
    }
    
    // Default strategy: if elements selected, likely replacement, otherwise append
    return selectedElements.length > 0 ? 'replace' : 'append';
  }

  // Insert element at the determined point with proper strategy
  insertElementAtPoint(newElement, insertionInfo) {
    try {
      switch (insertionInfo.type) {
        case 'replace':
          if (insertionInfo.target && insertionInfo.parent) {
            // Replace the target element - insert before the target, then remove it
            insertionInfo.parent.insertBefore(newElement, insertionInfo.target);
            insertionInfo.parent.removeChild(insertionInfo.target);
          }
          break;
          
        case 'after':
          if (insertionInfo.parent) {
            insertionInfo.parent.insertBefore(newElement, insertionInfo.nextSibling);
          }
          break;
          
        case 'before':
          if (insertionInfo.parent) {
            insertionInfo.parent.insertBefore(newElement, insertionInfo.nextSibling);
          }
          break;
          
        case 'append':
        default:
          if (insertionInfo.target) {
            insertionInfo.target.appendChild(newElement);
          }
          break;
      }
    } catch (error) {
      console.error('Error inserting element:', error);
      // Fallback to body append
      document.body.appendChild(newElement);
    }
  }

  // Analyze parent context for better LLM decision making
  analyzeElementContext(element) {
    if (!element || !element.parentNode) {
      return null;
    }
    
    const parent = element.parentNode;
    const siblings = Array.from(parent.children);
    const elementIndex = siblings.indexOf(element);
    
    return {
      parent: parent,
      parentTag: parent.tagName.toLowerCase(),
      parentClasses: Array.from(parent.classList),
      siblings: siblings,
      elementIndex: elementIndex,
      previousSibling: siblings[elementIndex - 1] || null,
      nextSibling: siblings[elementIndex + 1] || null,
      totalSiblings: siblings.length,
      isFirstChild: elementIndex === 0,
      isLastChild: elementIndex === siblings.length - 1
    };
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
        selectedElements: selectedElements,
        insertionMode: params.insertionMode || null
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

  async createInteractiveElementWrapper(params) {
    console.log('createInteractiveElementWrapper called with params:', params);
    
    if (!params) {
      throw new Error('Description and html parameters are required');
    }
    
    let elementSelectors = [];
    
    // Handle elementSelectors
    if (params.elementSelectors) {
      elementSelectors = params.elementSelectors;
    }
    // Handle case where selectors come from currentElementSelectors
    else if (this.currentElementSelectors && this.currentElementSelectors.length > 0) {
      elementSelectors = this.currentElementSelectors;
    }
    
    // Validate required parameters
    if (!params.description) {
      throw new Error('Description parameter is required');
    }
    
    if (!params.html || !params.html.trim()) {
      throw new Error('HTML parameter is required for interactive elements');
    }
    
    return this.createInteractiveElement({
      description: params.description,
      html: params.html,
      css: params.css || null,
      javascript: params.javascript || null,
      elementSelectors: elementSelectors,
      insertionMode: params.insertionMode || null
    });
  }

  async addBehaviorWrapper(params) {
    console.log('addBehaviorWrapper called with params:', params);
    
    if (!params) {
      throw new Error('Description, elementSelectors, and events parameters are required');
    }
    
    let elementSelectors = [];
    
    // Handle new elementSelectors format
    if (params.elementSelectors) {
      elementSelectors = params.elementSelectors;
    }
    // Handle case where selectors come from currentElementSelectors
    else if (this.currentElementSelectors && this.currentElementSelectors.length > 0) {
      elementSelectors = this.currentElementSelectors;
    }
    
    // Validate required parameters
    if (!params.description) {
      throw new Error('Description parameter is required');
    }
    
    if (!elementSelectors || elementSelectors.length === 0) {
      throw new Error('elementSelectors parameter is required');
    }
    
    if (!params.events || Object.keys(params.events).length === 0) {
      throw new Error('Events parameter is required');
    }
    
    return this.addBehavior({
      description: params.description,
      elementSelectors: elementSelectors,
      events: params.events
    });
  }

  async executeScriptWrapper(params) {
    console.log('executeScriptWrapper called with params:', params);
    
    if (!params) {
      throw new Error('Description and code parameters are required');
    }
    
    // Validate required parameters
    if (!params.description) {
      throw new Error('Description parameter is required');
    }
    
    if (!params.code || !params.code.trim()) {
      throw new Error('Code parameter is required');
    }
    
    return this.executeScript({
      description: params.description,
      code: params.code,
      context: params.context || 'global'
    });
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
      
      // Process history to find temporary image URLs and create download instructions
      const processedHistory = await this.processImageUrlsInHistory(history);
      
      // Return processed history data as JSON string for LLM to analyze
      const historyData = {
        changeHistory: processedHistory.history,
        totalChanges: processedHistory.history.length,
        imageDownloads: processedHistory.imageDownloads,
        message: `Raw change history with ${processedHistory.history.length} modifications ready for Claude Code instruction generation.`
      };
      
      return JSON.stringify(historyData, null, 2);
      
    } catch (error) {
      console.error('Error getting change history:', error);
      return `Failed to get change history: ${error.message}`;
    }
  }

  async processImageUrlsInHistory(history) {
    const imageDownloads = [];
    const processedHistory = [];
    
    for (const change of history) {
      let processedChange = { ...change };
      
      // Check for temporary image URLs in various fields
      const tempUrlPattern = /(https:\/\/oaidalleapiprodscus\.blob\.core\.windows\.net\/[^)"\s]+)/g;
      
      // Process styles object
      if (change.appliedChanges && change.appliedChanges.styles) {
        const styles = { ...change.appliedChanges.styles };
        
        for (const [property, value] of Object.entries(styles)) {
          if (typeof value === 'string' && tempUrlPattern.test(value)) {
            const matches = value.match(tempUrlPattern);
            if (matches) {
              for (const url of matches) {
                const filename = this.generateImageFilename(url, change.timestamp);
                const localPath = `./src/assets/images/${filename}`;
                
                // Add to download instructions
                imageDownloads.push({
                  originalUrl: url,
                  filename: filename,
                  localPath: localPath,
                  cssProperty: property,
                  timestamp: change.timestamp
                });
                
                // Update the style value with local path
                styles[property] = value.replace(url, localPath);
              }
            }
          }
        }
        
        processedChange.appliedChanges.styles = styles;
      }
      
      // Process other fields that might contain image URLs
      if (change.response && typeof change.response === 'string') {
        const matches = change.response.match(tempUrlPattern);
        if (matches) {
          for (const url of matches) {
            const filename = this.generateImageFilename(url, change.timestamp);
            const localPath = `./src/assets/images/${filename}`;
            
            imageDownloads.push({
              originalUrl: url,
              filename: filename,
              localPath: localPath,
              context: 'response',
              timestamp: change.timestamp
            });
            
            processedChange.response = change.response.replace(url, localPath);
          }
        }
      }
      
      processedHistory.push(processedChange);
    }
    
    return {
      history: processedHistory,
      imageDownloads: imageDownloads
    };
  }

  generateImageFilename(url, timestamp) {
    // Extract image format from URL or default to png
    let extension = 'png';
    if (url.includes('.jpg') || url.includes('.jpeg')) {
      extension = 'jpg';
    } else if (url.includes('.webp')) {
      extension = 'webp';
    }
    
    // Create filename with timestamp and random suffix
    const date = new Date(timestamp).toISOString().split('T')[0];
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return `frontable-${date}-${randomSuffix}.${extension}`;
  }


  async generateClaudeCodeInstructionsWrapper(params) {
    console.log('generateClaudeCodeInstructionsWrapper called with params:', params);
    
    if (!params) {
      // Default to claude_code_instructions if no params provided
      return this.generateClaudeCodeInstructions({ requestType: 'claude_code_instructions' });
    }
    
    // Handle case where Ajent framework wraps params in {params: 'stringified_json'}
    let actualParams = params;
    if (params.params && typeof params.params === 'string') {
      try {
        // Handle incomplete JSON (common with LLM generation)
        let jsonString = params.params;
        if (jsonString === '{' || jsonString === '{"' || jsonString.includes('claude_code_instructions')) {
          // If it's incomplete or contains our target, assume it's meant to be claude_code_instructions
          actualParams = { requestType: 'claude_code_instructions' };
        } else {
          actualParams = JSON.parse(jsonString);
        }
        console.log('Parsed actualParams for generateClaudeCodeInstructions:', actualParams);
      } catch (error) {
        console.warn('Failed to parse params.params, using default:', error);
        // Default to claude_code_instructions on parse error
        actualParams = { requestType: 'claude_code_instructions' };
      }
    }
    
    // If no requestType provided, default to claude_code_instructions
    if (!actualParams.requestType) {
      actualParams.requestType = 'claude_code_instructions';
    }
    
    return this.generateClaudeCodeInstructions(actualParams);
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
      
      const url = 'https://spinal.onrender.com/text-to-image';
      //const url = 'http://localhost:5000/text-to-image';
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
        const insertionPoint = this.findInsertionPoint(elementSelectors);
        insertionPoint.appendChild(imgElement);
        
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
      return `Erro ao gerar imagem: ${error.message}`;
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

  async planTask(params) {
    const { action, tasks } = params;
    
    if (!action || !tasks) {
      return 'Action and tasks parameters are required for task planning.';
    }
    
    if (!Array.isArray(tasks)) {
      return 'Tasks parameter must be an array of task objects.';
    }
    
    // Validate task format
    const validTasks = tasks.every(task => 
      task.description && 
      task.status && 
      ['pending', 'in_progress', 'completed'].includes(task.status)
    );
    
    if (!validTasks) {
      return 'Invalid task format. Each task must have description and valid status.';
    }
    
    try {
      // Store task plan in a way the UI can access
      if (typeof window !== 'undefined') {
        if (!window.ajentTaskPlan) {
          window.ajentTaskPlan = {};
        }
        
        window.ajentTaskPlan = {
          action: action,
          tasks: tasks,
          timestamp: Date.now(),
          totalTasks: tasks.length,
          completedTasks: tasks.filter(t => t.status === 'completed').length,
          inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
          pendingTasks: tasks.filter(t => t.status === 'pending').length
        };
        
        // Trigger event for UI to update
        window.dispatchEvent(new CustomEvent('ajentTaskPlanUpdate', {
          detail: window.ajentTaskPlan
        }));
      }
      
      const progressMsg = action === 'create' ? 'Plano de tarefas criado:' : 'Plano de tarefas atualizado:';
      let response = `🎯 ${progressMsg}\n\n`;
      
      tasks.forEach((task, index) => {
        const emoji = task.status === 'completed' ? '✅' : 
                     task.status === 'in_progress' ? '🔄' : '⏳';
        response += `${emoji} ${index + 1}. ${task.description}\n`;
      });
      
      const stats = `\n📊 Progresso: ${window.ajentTaskPlan?.completedTasks || 0}/${tasks.length} concluídas`;
      response += stats;
      
      return response;
      
    } catch (error) {
      console.error('Error in planTask:', error);
      return `Erro ao gerenciar plano de tarefas: ${error.message}`;
    }
  }

  async planTaskWrapper(params) {
    console.log('planTaskWrapper called with params:', params);
    
    if (!params) {
      throw new Error('Action and tasks parameters are required');
    }
    
    // Handle case where Ajent framework wraps params in {params: 'stringified_json'}
    let actualParams = params;
    if (params.params && typeof params.params === 'string') {
      try {
        actualParams = JSON.parse(params.params);
        console.log('Parsed actualParams for planTask:', actualParams);
      } catch (error) {
        console.warn('Failed to parse params.params:', error);
        actualParams = params;
      }
    }
    
    // Validate required parameters
    if (!actualParams.action) {
      throw new Error('Action parameter is required (create or update)');
    }
    
    if (!actualParams.tasks || !Array.isArray(actualParams.tasks)) {
      throw new Error('Tasks parameter is required and must be an array');
    }
    
    return this.planTask({
      action: actualParams.action,
      tasks: actualParams.tasks
    });
  }
}

export default DOMManipulationAgent;