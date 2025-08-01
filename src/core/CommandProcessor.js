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
    const { selectedElement, mode, elementsData } = context;
    
    // Only check for selectedElement if we're not in component generation mode
    if (!selectedElement && mode !== 'component_generation') {
      return {
        message: 'Por favor, clique em um elemento da página primeiro para que eu possa editá-lo! 👆'
      };
    }
    
    try {
      if (mode === 'component_generation') {
        // Handle component generation mode
        return await this.processComponentGeneration(message, elementsData);
      }
      
      // Original CSS modification logic
      // Gera contexto para LLM
      const contextPrompt = this.inspector.generateContextPrompt(selectedElement, message);
      
      // Tenta chamar LLM primeiro
      let llmResponse;
      try {
        llmResponse = await this.callLLM(contextPrompt);
      } catch (error) {
        console.warn('LLM call failed, using local fallback:', error.message);
        // Fallback para sistema local
        return await this.processLocalCommand(message, selectedElement);
      }
      
      // Aplica resposta da LLM
      const result = await this.applier.applyLLMResponse(
        llmResponse, 
        selectedElement, 
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
  
  // Verifica se AI está disponível
  isAIAvailable() {
    return this.hasAI && this.squad !== null;
  }
}

export default CommandProcessor;
export { CommandProcessor, ResponseApplier };