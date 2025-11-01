import ElementInspector from './ElementInspector';
import ResponseApplier from './ResponseApplier';
import { Squad } from 'ajent';
import UXAgent from '../agents/UXAgent.js';

class CommandProcessor {

  constructor(apiToken = null, chatInterface = null) {
    this.inspector = new ElementInspector();
    this.applier = new ResponseApplier();
    this.chatInterface = chatInterface;
    this.squad = null;
    this.hasAI = false;

    if(!apiToken){
      console.warn('No API token provided. AI features will be disabled.');
      return;
    }
    
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
      apiUrl: 'http://localhost:5000'
    });
    //apiUrl: 'http://localhost:5000'
    this.hasAI = true;
  }
  
  async process(message, context = {}) {
    const { selectedElements, visualContext } = context; 
    return await this.processIntelligentDecision(message, selectedElements, visualContext);
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
        return this.generateElementSelector(element);
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

      console.log('Sending final prompt to LLM:', contextPrompt);

      // Set the element selectors in a way the agent can access them
      if (this.squad && this.squad.agents && this.squad.agents[0]) {
        this.squad.agents[0].currentElementSelectors = elementSelectors;
        this.squad.agents[0].currentSelectedElements = elements; // Keep as backup
      }

      this.chatInterface && this.chatInterface.addMessage({
        type: 'agent',
        content: 'Enviando comando para LLM... ⏳'
      });
 
      this.chatInterface.showTyping();

      // Use the LLM squad to process the intelligent decision
      const response = await this.callLLM(contextPrompt, visualContext);

      this.chatInterface.hideTyping();
      
      console.log('LLM response:', response);

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

  undo() {
    return this.applier.undo();
  }
  
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
        const response = await this.squad.send(prompt);
        return response;
      }
    } catch (error) {
      console.error('AI Agent error:', error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  


  // Verifica se AI está disponível
  isAIAvailable() {
    return this.hasAI && this.squad !== null;
  }

  /**
   * Generate a specific CSS selector path for an element
   * @param {Element} element - The DOM element
   * @returns {string} - CSS selector path
   */
  generateElementSelector(element) {
    // Create a unique CSS selector path for the element
    if (element.id) return `#${element.id}`;
    
    // Build a complete CSS path
    const path = [];
    let current = element;
    
    while (current && current !== document.body && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();
      
      // Add class if available
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(cls => cls);
        if (classes.length > 0) {
          // Use first 2 classes to keep selector manageable
          selector += '.' + classes.slice(0, 2).join('.');
        }
      }
      
      // Add nth-of-type if no unique identifier
      if (!current.id && (!current.className || !current.className.trim())) {
        const siblings = Array.from(current.parentNode?.children || []);
        const sameTagSiblings = siblings.filter(sibling => 
          sibling.tagName.toLowerCase() === current.tagName.toLowerCase()
        );
        
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentNode;
      
      // Stop if we have a unique identifier
      if (current && current.id) {
        path.unshift(`#${current.id}`);
        break;
      }
    }
    
    return path.join(' > ');
  }
}

export default CommandProcessor;
export { CommandProcessor, ResponseApplier };