import ElementInspector from './ElementInspector';
import ResponseApplier from './ResponseApplier';
import { Squad } from 'ajent';
import DOMManipulationAgent from '../agents/DOMManipulationAgent.js';

class CommandProcessor {
  constructor(apiToken = null) {
    this.inspector = new ElementInspector();
    this.applier = new ResponseApplier();
    
    // Initialize AI agent squad
    if (apiToken) {
      const agents = [new DOMManipulationAgent()];
      this.squad = new Squad({
        agents,
        apiToken: apiToken
      });
      this.hasAI = true;
    } else {
      this.squad = null;
      this.hasAI = false;
    }
  }
  
  async process(message, context = {}) {
    const { selectedElement, selectedElements, mode, elementsData } = context;
    
    // Support both old (selectedElement) and new (selectedElements) formats
    const elements = selectedElements || (selectedElement ? [selectedElement] : []);
    const firstElement = elements.length > 0 ? elements[0] : null;
    
    // Only check for selection if we're not in component generation mode
    // Note: intelligent_decision mode can work with or without selected elements
    if (!firstElement && mode !== 'component_generation' && mode !== 'intelligent_decision') {
      return {
        message: 'Por favor, clique em um elemento da página primeiro para que eu possa editá-lo! 👆'
      };
    }
    try {
      if (mode === 'component_generation') {
        // Handle component generation mode
        return await this.processComponentGeneration(message, elementsData);
      }
      
      if (mode === 'intelligent_decision') {
        // Handle intelligent decision mode using DOMManipulationAgent
        return await this.processIntelligentDecision(message, elements);
      }
      
      // Original CSS modification logic
      // Gera contexto para LLM
      const contextPrompt = this.inspector.generateContextPrompt(firstElement, message);
      
      // Tenta chamar LLM primeiro
      let llmResponse;
      try {
        llmResponse = await this.callLLM(contextPrompt);
      } catch (error) {
        console.warn('LLM call failed, using local fallback:', error.message);
        // Fallback para sistema local
        return await this.createLocalFallbackResponse(message, firstElement);
      }
      // Aplica resposta da LLM
      const result = await this.applier.applyLLMResponse(
        llmResponse, 
        firstElement, 
        message
      );
      
      return {
        message: result.message,
        success: result.success,
        changes: result.appliedStyles ? [{ 
          element: selectedElement, 
          styles: result.appliedStyles 
        }] : [],
        canUndo: result.canUndo
      };
      
    } catch (error) {
      console.error('Error processing command:', error);
      return {
        message: 'Erro ao processar comando. Tentando método alternativo...',
        success: false
      };
    }
  }

  async processComponentGeneration(message, elementsData) {
    try {
      // Build component generation prompt
      const componentPrompt = this.buildComponentGenerationPrompt(message, elementsData);
      
      // Call LLM for component generation
      let llmResponse;
      try {
        llmResponse = await this.callLLM(componentPrompt);
      } catch (error) {
        console.warn('LLM call failed for component generation:', error.message);
        // Return a fallback response
        return {
          message: 'Erro ao conectar com IA. Tente novamente em alguns instantes.',
          success: false
        };
      }
      
      // For component generation, we expect HTML in the response
      console.log('Raw LLM response:', llmResponse);
      
      return {
        message: 'Componente gerado com sucesso!',
        success: true,
        html: llmResponse
      };
      
    } catch (error) {
      console.error('Error in component generation:', error);
      return {
        message: 'Erro ao gerar componente.',
        success: false
      };
    }
  }

  buildComponentGenerationPrompt(description, elementsData) {
    const elementsDescription = elementsData.map((data, index) => {
      return `Elemento ${index + 1}:
HTML: ${data.html}
CSS principais: ${JSON.stringify(data.computedCSS, null, 2)}
Posição: ${data.position.width}x${data.position.height}`;
    }).join('\n\n');

    return `Baseado neste(s) elemento(s):
${elementsDescription}

Crie: ${description}

Retorne apenas o HTML completo do novo componente, incluindo CSS inline ou classes. O componente deve ser funcional e bem estruturado.`;
  }
  
  // Método para desfazer última mudança
  undo() {
    return this.applier.undo();
  }
  
  // Método para ver histórico
  getHistory() {
    return this.applier.getHistory();
  }
  
  async callLLM(prompt) {
    if (!this.hasAI || !this.squad) {
      throw new Error('AI agent not configured - API token required');
    }

    try {
      // Use the AI agent squad to process the request
      const response = await this.squad.send(prompt);
      
      // The DOMManipulationAgent should return a structured response
      return response;
    } catch (error) {
      console.error('AI Agent error:', error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }
  
  // Método para configurar API token após instanciação
  setApiToken(apiToken) {
    if (apiToken) {
      const agents = [new DOMManipulationAgent()];
      this.squad = new Squad({
        agents,
        apiToken: apiToken
      });
      this.hasAI = true;
    } else {
      this.squad = null;
      this.hasAI = false;
    }
  }
  
  async processIntelligentDecision(message, elements) {
    // Special case: Claude Code instructions don't require selected elements
    const isClaudeCodeRequest = message.toLowerCase().includes('claude code') || 
                               message.toLowerCase().includes('instruções') && message.toLowerCase().includes('ide') ||
                               message.toLowerCase().includes('gerar instruções');
    
    // Check if there are elements selected first, before calling LLM (except for Claude Code instructions)
    if (!isClaudeCodeRequest && (!elements || elements.length === 0)) {
      return {
        message: 'Por favor, selecione um elemento na página antes de executar comandos! 👆',
        success: false,
        noElementsSelected: true
      };
    }

    if (!this.squad) {
      // Fallback to local processing if no LLM available
      return await this.createLocalFallbackResponse(message, elements[0]);
    }

    try {
      // Convert elements to selectors to avoid serialization issues
      const elementSelectors = elements.map(element => {
        if (this.squad && this.squad.agents && this.squad.agents[0]) {
          return this.squad.agents[0].getElementSelector(element);
        }
        // Fallback selector generation
        if (element.id) return `#${element.id}`;
        if (element.className) {
          const classes = Array.from(element.classList).slice(0, 2);
          return `.${classes.join('.')}`;
        }
        return element.tagName.toLowerCase();
      }).filter(Boolean);

      // Create a context-rich prompt for the LLM that includes element information and selectors
      let contextPrompt = `User command: "${message}"\n\n`;
      
      if (isClaudeCodeRequest) {
        contextPrompt += `SPECIAL REQUEST: Generate Claude Code IDE instructions based on change history.\n`;
        contextPrompt += `No elements need to be selected for this request - it works with stored change history only.\n\n`;
      } else if (elements && elements.length > 0) {
        contextPrompt += `Selected elements (these will be passed to tools as elementSelectors parameter):\n`;
        elements.forEach((element, index) => {
          const elementInfo = this.inspector.getElementInfo(element);
          const selector = elementSelectors[index];
          contextPrompt += `Element ${index + 1} (selector: ${selector}): ${JSON.stringify(elementInfo, null, 2)}\n`;
        });
      } else {
        contextPrompt += `No elements selected.\n`;
      }
      
      contextPrompt += `\nPlease analyze this command and call the appropriate tool:

1. **For CSS modifications:** Call applyStyles tool with:
   - description: clear description of visual change
   - styles: CSS property-value pairs
   - elementSelectors: array of CSS selectors for target elements

2. **For element creation:** Call createElement tool with:
   - description: what to create  
   - elementSelectors: selectors for reference elements (can be empty)

3. **For interactive element creation:** Call createInteractiveElement tool with:
   - description: what to create
   - html: complete HTML code
   - css: styling
   - javascript: behavior code
   - elementSelectors: reference elements (can be empty)

4. **For adding behavior:** Call addBehavior tool with:
   - description: behavior to add
   - elementSelectors: target elements
   - events: event handlers object

5. **For script execution:** Call executeScript tool with:
   - description: what script does
   - code: JavaScript code
   - context: execution context

6. **For element deletion:** Call deleteElement tool with:
   - elementSelectors: selectors for elements to delete
   - confirmation: true

7. **For Claude Code instructions:** Call generateClaudeCodeInstructions tool with:
   - requestType: "claude_code_instructions"
   - NOTE: This tool works with change history only - no elements needed

The element selectors will be used to reconstruct the DOM elements within the tools.`;

      console.log('Sending intelligent decision prompt to LLM:', contextPrompt);

      // Set the element selectors in a way the agent can access them
      if (this.squad && this.squad.agents && this.squad.agents[0]) {
        this.squad.agents[0].currentElementSelectors = elementSelectors;
        this.squad.agents[0].currentSelectedElements = elements; // Keep as backup
      }

      // Use the LLM squad to process the intelligent decision
      const response = await this.callLLM(contextPrompt);
      
      console.log('LLM response for intelligent decision:', response);

      // Clean up
      if (this.squad && this.squad.agents && this.squad.agents[0]) {
        delete this.squad.agents[0].currentElementSelectors;
        delete this.squad.agents[0].currentSelectedElements;
      }

      // The response can be a string (from final_answer) or an object with properties
      const messageContent = typeof response === 'string' ? response : (response.message || 'Comando processado com sucesso!');
      
      return {
        message: messageContent,
        success: response.success !== false,
        appliedCount: response.appliedCount,
        failedCount: response.failedCount,
        results: response.results,
        canUndo: response.canUndo,
        html: response.html,
        action: response.action
      };

    } catch (error) {
      console.error('Intelligent decision processing failed:', error);
      // Fallback to local processing
      const firstElement = elements && elements.length > 0 ? elements[0] : null;
      return await this.createLocalFallbackResponse(message, firstElement);
    }
  }

  async createLocalFallbackResponse(message, element) {
    // Simple local fallback when LLM is not available
    if (!element) {
      return {
        message: 'Por favor, selecione um elemento na página antes de executar comandos! 👆',
        success: false,
        noElementsSelected: true
      };
    }
    
    return {
      message: `Comando "${message}" foi recebido, mas o sistema de IA não está disponível. Por favor, tente novamente ou verifique a configuração da API.`,
      success: false,
      fallback: true
    };
  }

  // Verifica se AI está disponível
  isAIAvailable() {
    return this.hasAI && this.squad !== null;
  }
}

export default CommandProcessor;
export { CommandProcessor, ResponseApplier };