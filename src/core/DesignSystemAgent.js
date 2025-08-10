import ChatInterface from '../ui/ChatInterface';
import ElementSelector from './ElementSelector';
import CommandProcessor from './CommandProcessor';

class DesignSystemAgent {
  constructor(options = {}) {
    this.isActive = false;
    this.activationSequence = options.activationSequence || 'frontable';
    this.currentSequence = '';
    
    this.chatInterface = new ChatInterface();
    this.elementSelector = new ElementSelector();
    this.commandProcessor = new CommandProcessor('faab7706-adec-498e-bf2a-6da0ffe8ae82', this.chatInterface);
    
    this.init();
  }
  
  init() {
    // Listen for activation sequence
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Setup message handling
    this.chatInterface.onMessage = (message) => this.handleUserMessage(message);
    this.chatInterface.onClose = () => this.deactivate();
    this.chatInterface.onClearSelection = () => this.elementSelector.clearMultiSelection();
    
    // Setup element selection change notification
    this.elementSelector.onSelectionChange = (elements) => {
      this.chatInterface.showSelectionPreview(elements);
    };
  }
  
  handleKeydown(e) {
    // Handle ESC key when agent is active (but not when typing in chat)
    if (this.isActive && e.key === 'Escape' && !e.target.matches('.dsa-input')) {
      this.elementSelector.clearMultiSelection();
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
    
    console.log('🚀 Frontable activated!');
    this.isActive = true;
    
    this.chatInterface.show();
    this.elementSelector.enable();
    
    // Send welcome message
    setTimeout(() => {
      this.chatInterface.addMessage({
        type: 'agent',
        content: 'Olá! Clique em qualquer elemento da página e me diga o que quer fazer.\n\n💡 Shift+Click para seleção múltipla'
      });
    }, 500);
  }
  
  deactivate() {
    if (!this.isActive) return;
    
    console.log('❌ Frontable deactivated');
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
        // Clear selection after undo command
        this.clearSelectionAfterCommand();
        return;
      }
      
      // Send message directly to the LLM agent to decide action
      await this.handleUserCommand(message);
      
    } catch (error) {
      this.chatInterface.hideTyping();
      this.chatInterface.addMessage({
        type: 'agent',
        content: 'Desculpe, não consegui processar esse comando. Pode tentar de outra forma?'
      });
      console.error('Command processing error:', error);
      
      // Clear selection even on error to prevent confusion
      this.clearSelectionAfterCommand();
    }
  }

  async handleUserCommand(message) {
    let result = null;
    
    try {
      // Get selected elements
      let selectedElements = this.elementSelector.getMultiSelectedElements();
      
      // If no elements are currently selected, try to restore last selection
      if (selectedElements.length === 0 && this.elementSelector.hasLastSelection()) {
        console.log('🔄 No current selection, attempting to restore last selection...');
        const restored = this.elementSelector.restoreLastSelection();
        if (restored) {
          selectedElements = this.elementSelector.getMultiSelectedElements();
          
          // Show user-friendly message about restoration
          this.chatInterface.addMessage({
            type: 'agent',
            content: `🔄 Restaurei a seleção anterior (${selectedElements.length} elemento(s)) para executar o comando.`
          });
        }
      }
      
      // Process the command with the LLM agent to determine action and execute it
      result = await this.commandProcessor.process(message, {
        selectedElements: selectedElements,
        mode: 'intelligent_decision'
      }, (llmResponse) => {
        // Show typing indicator during processing
        this.chatInterface.addMessage(
          {
            type: 'agent',
            content: llmResponse.message || 'Processando...'
          }
        );
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
      
      // Insert HTML if provided (for element creation)
      if (result.html && result.html.trim()) {
        this.insertGeneratedHTML(result.html);
      }
      
    } finally {
      // Only clear selection if the command was successful or if it's not about missing elements
      if (result && (result.success !== false || !result.noElementsSelected)) {
        this.clearSelectionAfterCommand();
      }
    }
  }

  async handleCSSModification(message) {
    try {
      // Get selected elements (now unified system)
      const selectedElements = this.elementSelector.getMultiSelectedElements();
      const selectedElement = selectedElements.length > 0 ? selectedElements[0] : null;
      
      console.log('CSS Modification - Selected elements:', selectedElements);
      console.log('CSS Modification - First element:', selectedElement);
      
      // Process the command (existing functionality)
      const result = await this.commandProcessor.process(message, {
        selectedElement: selectedElement
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
      
    } finally {
      // ALWAYS clear selection after command
      this.clearSelectionAfterCommand();
    }
  }

  async handleComponentCreation(message) {
    try {
      // Extract HTML and CSS from selected elements
      const selectedElements = this.elementSelector.getMultiSelectedElements();
      if (selectedElements.length === 0) {
        this.chatInterface.hideTyping();
        this.chatInterface.addMessage({
          type: 'agent',
          content: 'Por favor, selecione um ou mais elementos para criar um componente. Use Shift+Click para seleção múltipla.'
        });
        return;
      }
      
      const elementsData = this.extractElementsData(selectedElements);
      
      // Generate component using LLM via CommandProcessor
      const result = await this.commandProcessor.process(message, {
        mode: 'component_generation',
        elementsData: elementsData
      });
      
      this.chatInterface.hideTyping();
      
      if (result.success) {
        console.log('LLM Response for component:', result.html);
        
        // Insert the generated HTML
        if (result.html && result.html.trim()) {
          this.insertGeneratedHTML(result.html);
          this.chatInterface.addMessage({
            type: 'agent',
            content: result.message || 'Componente criado com sucesso!'
          });
        } else {
          console.warn('No HTML content received from LLM');
          this.chatInterface.addMessage({
            type: 'agent',
            content: 'Componente processado, mas não foi possível inserir HTML.'
          });
        }
      } else {
        this.chatInterface.addMessage({
          type: 'agent',
          content: result.message || 'Não foi possível criar o componente.'
        });
      }
      
    } finally {
      // ALWAYS clear selection after component creation
      this.clearSelectionAfterCommand();
    }
  }

  /**
   * Centralized method to clear element selection after any command
   * This ensures consistent behavior and prevents lingering selections
   */
  clearSelectionAfterCommand() {
    // Save current selection as last selected before clearing
    this.elementSelector.updateLastSelectedElements();
    
    // Clear the multi-selection
    this.elementSelector.clearMultiSelection();
    
    // Also update the chat interface to remove selection preview
    this.chatInterface.showSelectionPreview([]);
    
    console.log('🧹 Element selection cleared after command execution');
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



  extractElementsData(elements) {
    return elements.map(element => {
      const computedStyles = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      return {
        html: element.outerHTML,
        computedCSS: this.getRelevantStyles(computedStyles),
        position: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        },
        tagName: element.tagName.toLowerCase(),
        className: element.className,
        id: element.id
      };
    });
  }

  getRelevantStyles(computedStyles) {
    const relevantProperties = [
      'display', 'position', 'width', 'height', 'margin', 'padding',
      'border', 'border-radius', 'background', 'color', 'font-family',
      'font-size', 'font-weight', 'text-align', 'flex', 'grid',
      'justify-content', 'align-items', 'box-shadow', 'transform'
    ];
    
    const styles = {};
    relevantProperties.forEach(prop => {
      const value = computedStyles.getPropertyValue(prop);
      if (value && value !== 'initial' && value !== 'normal') {
        styles[prop] = value;
      }
    });
    
    return styles;
  }


  insertGeneratedHTML(html) {
    try {
      console.log('Attempting to insert HTML:', html);
      
      // Clean up the HTML response (remove markdown code blocks if present)
      let cleanHtml = html.trim();
      if (cleanHtml.startsWith('```html')) {
        cleanHtml = cleanHtml.replace(/^```html\s*/, '').replace(/\s*```$/, '');
      } else if (cleanHtml.startsWith('```')) {
        cleanHtml = cleanHtml.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('Cleaned HTML:', cleanHtml);
      
      // Create a temporary container to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanHtml;
      
      const selectedElements = this.elementSelector.getMultiSelectedElements();
      console.log('Selected elements for replacement:', selectedElements);
      
      // Check if we should replace or insert
      const shouldReplace = this.shouldReplaceElement(tempDiv, selectedElements);
      console.log('Should replace existing element:', shouldReplace);
      
      if (shouldReplace && selectedElements.length > 0) {
        // Replace the selected element(s)
        this.replaceSelectedElements(tempDiv, selectedElements);
      } else {
        // Insert new elements (original behavior)
        this.insertNewElements(tempDiv);
      }
      
    } catch (error) {
      console.error('Error inserting generated HTML:', error);
      console.error('HTML content was:', html);
    }
  }

  shouldReplaceElement(tempDiv, selectedElements) {
    if (selectedElements.length !== 1) return false;
    
    const selectedElement = selectedElements[0];
    const generatedElements = Array.from(tempDiv.children);
    
    if (generatedElements.length !== 1) return false;
    
    const generatedElement = generatedElements[0];
    
    // Check if the generated element has the same tag and similar structure as selected
    return (
      selectedElement.tagName === generatedElement.tagName &&
      selectedElement.className === generatedElement.className
    );
  }

  replaceSelectedElements(tempDiv, selectedElements) {
    const selectedElement = selectedElements[0];
    const generatedElement = tempDiv.firstElementChild;
    
    console.log('Replacing element:', selectedElement, 'with:', generatedElement);
    
    // Copy over any important attributes but preserve new content
    if (selectedElement.id && !generatedElement.id) {
      generatedElement.id = selectedElement.id;
    }
    
    // Add visual indicator
    this.addNewElementIndicator(generatedElement);
    
    // Replace the element
    selectedElement.parentNode.replaceChild(generatedElement, selectedElement);
    
    console.log('Successfully replaced element');
    
    // Scroll to the replaced element
    generatedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  insertNewElements(tempDiv) {
    // Find the best insertion point
    const insertionPoint = this.findInsertionPoint();
    console.log('Insertion point:', insertionPoint);
    
    let insertedCount = 0;
    const elementsToInsert = Array.from(tempDiv.children);
    console.log('Elements to insert:', elementsToInsert);
    
    if (elementsToInsert.length === 0) {
      console.warn('No valid HTML elements found to insert');
      // Try inserting as innerHTML if no child elements
      const cleanHtml = tempDiv.innerHTML;
      if (cleanHtml.trim()) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = cleanHtml;
        wrapper.style.cssText = 'border: 2px dashed #10b981; padding: 10px; margin: 5px; background: rgba(16, 185, 129, 0.1);';
        insertionPoint.appendChild(wrapper);
        this.addNewElementIndicator(wrapper);
        insertedCount = 1;
      }
    } else {
      // Insert each element
      elementsToInsert.forEach(element => {
        console.log('Inserting element:', element);
        insertionPoint.appendChild(element);
        this.addNewElementIndicator(element);
        insertedCount++;
      });
    }
    
    console.log(`Successfully inserted ${insertedCount} elements`);
    
    // Scroll to the new elements
    if (insertedCount > 0) {
      const newElements = insertionPoint.querySelectorAll(':scope > *:nth-last-child(-n+' + insertedCount + ')');
      if (newElements.length > 0) {
        newElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  findInsertionPoint() {
    const selectedElements = this.elementSelector.getMultiSelectedElements();
    console.log('Selected elements for insertion:', selectedElements);
    
    if (selectedElements.length > 0) {
      const lastSelected = selectedElements[selectedElements.length - 1];
      console.log('Last selected element:', lastSelected);
      
      // Try to insert after the last selected element's next sibling
      // or as the last child of its parent
      const parent = lastSelected.parentNode;
      if (parent) {
        console.log('Parent node found:', parent);
        return parent;
      }
    }
    
    console.log('Falling back to document.body');
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
}

export default DesignSystemAgent;