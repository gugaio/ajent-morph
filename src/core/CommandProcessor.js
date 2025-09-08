import ElementInspector from './ElementInspector';
import ResponseApplier from './ResponseApplier';
import { Squad } from 'ajent';
import UXAgent from '../agents/UXAgent.js';

class CommandProcessor {
  constructor(apiToken = null, chatInterface = null) {
    this.inspector = new ElementInspector();
    this.applier = new ResponseApplier();
    this.chatInterface = chatInterface;
    
    // Initialize AI agent squad
    if (apiToken) {
      const agents = [new UXAgent()];
      
      // Pass chat interface reference to agents for progress feedback
      agents.forEach(agent => {
        if (agent.setChatInterface) {
          agent.setChatInterface(chatInterface);
        }
      });
      
      this.squad = new Squad({
        agents,
        apiToken: apiToken,
        model: 'gpt-5-mini',
      });
      //apiUrl: 'http://localhost:5000'
      this.hasAI = true;
    } else {
      this.squad = null;
      this.hasAI = false;
    }
  }
  
  async process(message, context = {}) {
    const { selectedElement, selectedElements, mode, elementsData, visualContext } = context;
    
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
        return await this.processIntelligentDecision(message, elements, visualContext);
      }
      
      // Original CSS modification logic
      // Gera contexto para LLM
      const contextPrompt = this.inspector.generateContextPrompt(firstElement, message);
      
      // Tenta chamar LLM primeiro
      let llmResponse = await this.callLLM(contextPrompt);
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
  
  async callLLM(prompt, visualContext = null) {
    try {
      // If visual context is provided, send message with image
      if (visualContext && visualContext.image) {
        console.log('Sending message with visual context to LLM');
        const response = await this.squad.send(prompt, {
          images: [visualContext.image]
        });
        return response;
      } else {
        // Use the AI agent squad to process the request (text only)
        const response = await this.squad.send(prompt);
        return response;
      }
    } catch (error) {
      console.error('AI Agent error:', error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  async processIntelligentDecision(message, elements, visualContext = null) {
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
    
    try {
      // Convert elements to selectors to avoid serialization issues
      const elementSelectors = elements.map(element => {
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
        contextPrompt += 'SPECIAL REQUEST: Generate Claude Code IDE instructions based on change history.\n';
        contextPrompt += 'No elements need to be selected for this request - it works with stored change history only.\n\n';
      } else if (elements && elements.length > 0) {
        contextPrompt += 'Selected elements (these will be passed to tools as elementSelectors parameter):\n';
        elements.forEach((element, index) => {
          const elementInfo = this.inspector.getElementInfo(element);
          const selector = elementSelectors[index];
          contextPrompt += `Element ${index + 1} (selector: ${selector}): ${JSON.stringify(elementInfo, null, 2)}\n`;
        });
      } else {
        contextPrompt += 'No elements selected.\n';
      }

      // Add visual context if available
      if (visualContext) {
        contextPrompt += `\nVisual Context: Screenshot of selected elements provided for better understanding.\n`;
        contextPrompt += `Visual Description: ${visualContext.description}\n`;
        contextPrompt += `Screenshot Metadata: ${JSON.stringify(visualContext.metadata, null, 2)}\n\n`;
        contextPrompt += 'Please analyze both the DOM data and the visual screenshot to provide the best suggestions.\n';
      }

      console.log('Sending intelligent decision prompt to LLM:', contextPrompt);

      // Set the element selectors in a way the agent can access them
      if (this.squad && this.squad.agents && this.squad.agents[0]) {
        this.squad.agents[0].currentElementSelectors = elementSelectors;
        this.squad.agents[0].currentSelectedElements = elements; // Keep as backup
        
        // Tool progress events are now handled directly in the agent wrappers
      }

      // Use the LLM squad to process the intelligent decision
      const response = await this.callLLM(contextPrompt, visualContext);
      
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


  // Verifica se AI está disponível
  isAIAvailable() {
    return this.hasAI && this.squad !== null;
  }

  setupToolProgressListeners(agent) {
    // Store original methods to add progress tracking
    const originalMethods = {};
    const toolNames = ['applyStyles', 'createElement', 'createInteractiveElement', 'deleteElement', 'addBehavior', 'executeScript', 'generateImage', 'planTask'];
    
    toolNames.forEach(toolName => {
      const wrapperMethod = `${toolName}Wrapper`;
      if (agent[wrapperMethod] && typeof agent[wrapperMethod] === 'function') {
        // Store original method
        originalMethods[wrapperMethod] = agent[wrapperMethod].bind(agent);
        
        // Override with progress tracking
        agent[wrapperMethod] = async (params) => {
          // Extract meaningful information for progress display
          const toolInfo = this.extractToolInfo(toolName, params);
          
          // Dispatch start event
          window.dispatchEvent(new CustomEvent('ajentToolStart', { detail: toolInfo }));
          
          try {
            // Call original method
            const result = await originalMethods[wrapperMethod](params);
            
            // Dispatch success event
            window.dispatchEvent(new CustomEvent('ajentToolSuccess', { 
              detail: { 
                tool: toolName,
                result: typeof result === 'string' ? result : result.message || 'Operação concluída',
                fullResult: result
              }
            }));
            
            return result;
          } catch (error) {
            // Dispatch error event
            window.dispatchEvent(new CustomEvent('ajentToolError', {
              detail: {
                tool: toolName,
                error: error.message
              }
            }));
            throw error;
          }
        };
      }
    });
  }

  extractToolInfo(toolName, params) {
    const toolInfo = {
      tool: toolName,
      description: '',
      target: ''
    };
    
    switch (toolName) {
    case 'applyStyles':
      toolInfo.description = params?.description || 'Aplicando modificações de estilo';
      toolInfo.target = params?.elementSelectors?.join(', ') || 'elementos selecionados';
      break;
    case 'createElement':
      toolInfo.description = params?.description || 'Criando novo elemento';
      toolInfo.target = params?.elementSelectors?.length > 0 ? `próximo a ${params.elementSelectors.join(', ')}` : 'na página';
      break;
    case 'createInteractiveElement':
      toolInfo.description = params?.description || 'Criando elemento interativo';
      toolInfo.target = params?.elementSelectors?.length > 0 ? `próximo a ${params.elementSelectors.join(', ')}` : 'na página';
      break;
    case 'deleteElement':
      toolInfo.description = 'Removendo elementos da página';
      toolInfo.target = params?.elementSelectors?.join(', ') || 'elementos selecionados';
      break;
    case 'addBehavior':
      toolInfo.description = params?.description || 'Adicionando comportamento JavaScript';
      toolInfo.target = params?.elementSelectors?.join(', ') || 'elementos selecionados';
      break;
    case 'executeScript':
      toolInfo.description = params?.description || 'Executando código JavaScript';
      toolInfo.target = 'contexto global';
      break;
    case 'generateImage':
      toolInfo.description = params?.description || 'Gerando imagem com IA';
      toolInfo.target = params?.elementSelectors?.length > 0 ? params.elementSelectors.join(', ') : 'novo elemento';
      break;
    case 'planTask':
      toolInfo.description = params?.action === 'create' ? 'Criando plano de tarefas' : 'Atualizando progresso das tarefas';
      toolInfo.target = `${params?.tasks?.length || 0} tarefas`;
      break;
    default:
      toolInfo.description = 'Executando operação';
      toolInfo.target = 'elementos da página';
    }
    
    return toolInfo;
  }
}

export default CommandProcessor;
export { CommandProcessor, ResponseApplier };