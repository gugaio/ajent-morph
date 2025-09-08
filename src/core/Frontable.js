import ChatInterface from '../ui/ChatInterface';
import ElementSelector from './ElementSelector';
import CommandProcessor from './CommandProcessor';
import VisualContextManager from '../utils/VisualContextManager';
import logo50 from '../assets/images/logo50.png';

class Frontable {
  constructor(options = {}) {
    this.isActive = false;
    this.activationSequence = options.activationSequence || 'frontable';
    this.currentSequence = '';
    
    this.chatInterface = new ChatInterface();
    this.elementSelector = new ElementSelector();
    this.commandProcessor = new CommandProcessor('faab7706-adec-498e-bf2a-6da0ffe8ae82', this.chatInterface);
    this.visualContextManager = new VisualContextManager();
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
    
    // Create floating button
    this.createFloatingButton();
  }
  
  handleKeydown(e) {
    // Handle ESC key when agent is active (but not when typing in chat)
    if (this.isActive && e.key === 'Escape' && !e.target.matches('.frontable-input')) {
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
  
  createFloatingButton() {
    // Create floating button container
    this.floatingButton = document.createElement('div');
    this.floatingButton.className = 'frontable-floating-btn';
    
    // Create button element
    const button = document.createElement('button');
    button.className = 'frontable-btn';
    button.setAttribute('aria-label', 'Abrir Frontable');
    button.setAttribute('title', 'Clique para ativar o Frontable');
    
    // Create image element
    const img = document.createElement('img');
    img.src = logo50;
    img.alt = 'Frontable Logo';
    img.className = 'frontable-logo';
    
    // Assemble elements
    button.appendChild(img);
    this.floatingButton.appendChild(button);
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleActivation();
    });
    
    // Add styles
    this.addFloatingButtonStyles();
    
    // Add to page
    document.body.appendChild(this.floatingButton);
  }
  
  addFloatingButtonStyles() {
    // Check if styles already exist
    if (document.getElementById('frontable-floating-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'frontable-floating-styles';
    style.textContent = `
      .frontable-floating-btn {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        opacity: 1;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        filter: drop-shadow(0 8px 32px rgba(0, 0, 0, 0.12));
      }
      
      .frontable-floating-btn:hover {
        transform: translateY(-2px);
        filter: drop-shadow(0 12px 48px rgba(0, 0, 0, 0.15));
      }
      
      .frontable-btn {
        width: 64px;
        height: 64px;
        border: none;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.25);
        transition: all 0.3s ease;
        padding: 0;
        overflow: hidden;
        position: relative;
      }
      
      .frontable-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 30px rgba(102, 126, 234, 0.35);
      }
      
      .frontable-btn:active {
        transform: scale(0.95);
      }
      
      .frontable-logo {
        width: 36px;
        height: 36px;
        object-fit: contain;
        transition: transform 0.3s ease;
      }
      
      .frontable-btn:hover .frontable-logo {
        transform: rotate(5deg);
      }
      
      .frontable-floating-btn.active .frontable-btn {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
        box-shadow: 0 6px 30px rgba(255, 107, 107, 0.35);
      }
      
      @media (max-width: 768px) {
        .frontable-floating-btn {
          bottom: 20px;
          right: 20px;
        }
        
        .frontable-btn {
          width: 56px;
          height: 56px;
        }
        
        .frontable-logo {
          width: 32px;
          height: 32px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  toggleActivation() {
    if (this.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }
  
  activate() {
    if (this.isActive) return;
    
    console.log('🚀 Frontable activated!');
    this.isActive = true;
    
    // Update floating button state
    if (this.floatingButton) {
      this.floatingButton.classList.add('active');
    }
    
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
    
    // Update floating button state
    if (this.floatingButton) {
      this.floatingButton.classList.remove('active');
    }
    
    this.chatInterface.hide();
    this.elementSelector.disable();
    this.currentSequence = '';
  }
  
  async handleUserMessage(message) {
    try {
      // Check if message includes visual context request
      const includeVisual = this.visualContextManager.shouldIncludeVisualContext(message);
      const cleanMessage = this.visualContextManager.cleanUserMessage(message);
      let visualData = null;

      // Capture screenshot if requested
      if (includeVisual) {
        const selectedElements = this.elementSelector.getMultiSelectedElements();
        
        if (selectedElements.length > 0) {
          this.chatInterface.showProgressStatus('Capturando screenshot...', 'processing');
          
          try {
            if (selectedElements.length === 1) {
              visualData = await this.visualContextManager.captureElementScreenshot(selectedElements[0]);
            } else {
              visualData = await this.visualContextManager.captureMultipleElements(selectedElements);
            }
            
            if (visualData) {
              // Display message with visual context
              this.chatInterface.addVisualMessage({
                text: cleanMessage,
                visualData: visualData,
                type: 'user'
              });
              
              this.chatInterface.updateProgressStatus('Screenshot capturado!', 'success');
              setTimeout(() => this.chatInterface.removeProgressStatus(), 1500);
            } else {
              throw new Error('Falha na captura de screenshot');
            }
          } catch (error) {
            console.error('Error capturing visual context:', error);
            this.chatInterface.showErrorStatus('Erro na captura de screenshot');
            setTimeout(() => this.chatInterface.removeProgressStatus(), 2000);
            
            // Fall back to text-only message
            this.chatInterface.addMessage({
              type: 'user',
              content: cleanMessage
            });
          }
        } else {
          // No elements selected, but user requested visual context
          this.chatInterface.addMessage({
            type: 'user',
            content: cleanMessage
          });
          this.chatInterface.addMessage({
            type: 'agent',
            content: '⚠️ Comando #image detectado, mas nenhum elemento está selecionado. Selecione elementos primeiro para incluir contexto visual.'
          });
          return;
        }
      } else {
        // Regular text message
        this.chatInterface.addMessage({
          type: 'user',
          content: message
        });
      }

      // Show typing indicator
      this.chatInterface.showTyping();

      if (typeof cleanMessage === 'string' && cleanMessage.trim().toLowerCase() === 'undo') {
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
      
      // Send message to command processor (use original message if no visual context)
      await this.handleUserCommand(includeVisual ? cleanMessage : message, visualData);
      
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

  async handleUserCommand(message, visualData = null) {
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
      
      // Prepare visual context for LLM if available
      let visualContext = null;
      if (visualData) {
        visualContext = await this.visualContextManager.prepareVisualDataForLLM(visualData, `Visual context for: ${message}`);
      }

      // Process the command with the LLM agent to determine action and execute it
      result = await this.commandProcessor.process(message, {
        selectedElements: selectedElements,
        mode: 'intelligent_decision',
        visualContext: visualContext
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
    element.style.animation = 'frontable-new-element-pulse 2s ease-in-out';
    
    // Add CSS for the animation if it doesn't exist
    if (!document.querySelector('#frontable-new-element-styles')) {
      const style = document.createElement('style');
      style.id = 'frontable-new-element-styles';
      style.textContent = `
        @keyframes frontable-new-element-pulse {
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

export default Frontable;