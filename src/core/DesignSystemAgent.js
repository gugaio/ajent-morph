import ChatInterface from '../ui/ChatInterface';
import ElementSelector from './ElementSelector';
import CommandProcessor from './CommandProcessor';

class DesignSystemAgent {
  constructor(options = {}) {
    this.isActive = false;
    this.activationSequence = options.activationSequence || 'ajent';
    this.currentSequence = '';
    
    this.chatInterface = new ChatInterface();
    this.elementSelector = new ElementSelector();
    this.commandProcessor = new CommandProcessor('faab7706-adec-498e-bf2a-6da0ffe8ae82');
    
    this.init();
  }
  
  init() {
    // Listen for activation sequence
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Setup message handling
    this.chatInterface.onMessage = (message) => this.handleUserMessage(message);
    this.chatInterface.onClose = () => this.deactivate();
  }
  
  handleKeydown(e) {
    // Handle ESC key when agent is active (but not when typing in chat)
    if (this.isActive && e.key === 'Escape' && !e.target.matches('.dsa-input')) {
      this.elementSelector.clearSelection();
      return;
    }
    
    // Skip if typing in input fields or agent is already active
    if (this.isActive || e.target.matches('input, textarea, [contenteditable]')) {
      return;
    }
    
    // Build sequence
    this.currentSequence += e.key.toLowerCase();
    
    // Keep only last 10 characters
    if (this.currentSequence.length > 10) {
      this.currentSequence = this.currentSequence.slice(-10);
    }
    
    // Check if activation sequence matches
    if (this.currentSequence.includes(this.activationSequence)) {
      if (!this.isActive) {
        this.activate();
      }
      this.currentSequence = '';
    }
  }
  
  activate() {
    if (this.isActive) return;
    
    console.log('🚀 Design System Agent activated!');
    this.isActive = true;
    
    this.chatInterface.show();
    this.elementSelector.enable();
    
    // Send welcome message
    setTimeout(() => {
      this.chatInterface.addMessage({
        type: 'agent',
        content: 'Olá! 👋 Sou seu assistente de design system. Posso ajudar você a editar elementos da página.\n\nTente comandos como:\n• "Deixe este botão azul"\n• "Aumente o espaçamento"\n• "Mude a fonte para bold"'
      });
    }, 500);
  }
  
  deactivate() {
    if (!this.isActive) return;
    
    console.log('❌ Design System Agent deactivated');
    this.isActive = false;
    
    this.chatInterface.hide();
    this.elementSelector.disable();
    this.currentSequence = '';
  }
  
  async handleUserMessage(message) {
    try {
      // Show typing indicator
      this.chatInterface.showTyping();

      if (typeof message === 'string' && message.trim().toLowerCase() === 'undo') {
        const undoResult = await this.undoLastChange();
        this.chatInterface.hideTyping();
        this.chatInterface.addMessage({
          type: 'agent',
          content: undoResult.message
        });
        return;
      }
      
      // Process the command
      const result = await this.commandProcessor.process(message, {
        selectedElement: this.elementSelector.getSelectedElement()
      });
      
      // Hide typing
      this.chatInterface.hideTyping();
      
      // Show result
      this.chatInterface.addMessage({
        type: 'agent',
        content: result.message
      });
      
      // Apply changes if any
      if (result.changes) {
        this.applyChanges(result.changes);
      }
      
      // Clear selection after command is processed
      this.elementSelector.clearSelection();
      
    } catch (error) {
      this.chatInterface.hideTyping();
      this.chatInterface.addMessage({
        type: 'agent',
        content: 'Desculpe, não consegui processar esse comando. Pode tentar de outra forma?'
      });
      console.error('Command processing error:', error);
    }
  }

  async undoLastChange() {
    try {
      const undoResult = await this.commandProcessor.undo();
      if (undoResult && undoResult.changes) {
        this.applyChanges(undoResult.changes);
      }
      return {
        message: undoResult && undoResult.message ? undoResult.message : 'Alteração desfeita.',
        success: undoResult && undoResult.success !== undefined ? undoResult.success : true
      };
    } catch (error) {
      console.error('Undo error:', error);
      return {
        message: 'Não foi possível desfazer a última alteração.',
        success: false
      };
    }
  }
  
  applyChanges(changes) {
    // Apply CSS changes to elements
    changes.forEach(change => {
      if (change.element && change.styles) {
        Object.assign(change.element.style, change.styles);
        
        console.log('Applied changes:', change);
      }
    });
  }
}

export default DesignSystemAgent;