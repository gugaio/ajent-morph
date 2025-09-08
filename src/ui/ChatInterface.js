class ChatInterface {
  constructor() {
    this.panel = null;
    this.messagesContainer = null;
    this.inputField = null;
    this.isVisible = false;
    
    this.onMessage = null;
    this.onClose = null;
    
    this.createInterface();
  }
  
  createInterface() {
    // Remove any existing panels first
    const existingPanels = document.querySelectorAll('.frontable-chat-panel');
    existingPanels.forEach(panel => panel.remove());
    
    this.panel = document.createElement('div');
    this.panel.className = 'frontable-chat-panel';
    
    this.panel.innerHTML = `
      <div class="frontable-chat-header">
      <div>
        <div class="frontable-title">Frontable</div>
      </div>
      <button class="frontable-close-btn">×</button>
      </div>
      
      <div class="frontable-messages"></div>
      
      <div class="frontable-task-progress" style="display: none;">
      <div class="frontable-task-header">
        <span class="frontable-task-title">🎯 Execution Plan</span>
        <span class="frontable-task-stats">0/0</span>
      </div>
      <div class="frontable-task-list"></div>
      </div>
      
      <div class="frontable-input-container">
      <div class="frontable-input-wrapper">
        <textarea 
        class="frontable-input" 
        placeholder="Describe what you want to do..."
        rows="1"
        ></textarea>
        <button class="frontable-send-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
        </button>
      </div>
      <div class="frontable-image-hint">💡 Tip: Use <code>#image</code> to include a screenshot</div>
      <div class="frontable-suggestions">
         <div class="frontable-suggestion frontable-special-suggestion" data-command="Generate Claude Code instructions">⚡ Generate prompt to code agent</div>
      </div>
      </div>
    `;
    
    document.body.appendChild(this.panel);
    this.setupEventListeners();
    this.setupTaskProgressListener();
  }
  
  setupEventListeners() {
    this.messagesContainer = this.panel.querySelector('.frontable-messages');
    this.inputField = this.panel.querySelector('.frontable-input');
    const sendBtn = this.panel.querySelector('.frontable-send-btn');
    const closeBtn = this.panel.querySelector('.frontable-close-btn');
    const inputWrapper = this.panel.querySelector('.frontable-input-wrapper');
    
    // Fix for input focus issue: clicking anywhere in wrapper should focus the textarea
    inputWrapper.addEventListener('click', (e) => {
      // Only focus if the click wasn't on the send button
      if (!sendBtn.contains(e.target)) {
        this.inputField.focus();
      }
    });
    
    // Input handling
    this.inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
      this.autoResizeTextarea();
    });
    
    this.inputField.addEventListener('input', () => {
      this.autoResizeTextarea();
    });
    
    // Button events
    sendBtn.addEventListener('click', () => this.sendMessage());
    closeBtn.addEventListener('click', () => {
      if (this.onClose) this.onClose();
    });
    
    // Suggestion clicks
    this.panel.querySelectorAll('.frontable-suggestion').forEach(suggestion => {
      suggestion.addEventListener('click', () => {
        const command = suggestion.dataset.command;
        this.inputField.value = command;
        this.inputField.focus();
        this.sendMessage();
      });
    });
  }

  
  autoResizeTextarea() {
    this.inputField.style.height = 'auto';
    this.inputField.style.height = Math.min(this.inputField.scrollHeight, 80) + 'px';
  }
  
  show() {
    this.isVisible = true;
    this.panel.classList.add('active');
    setTimeout(() => {
      this.inputField.focus();
    }, 300);
  }
  
  hide() {
    this.isVisible = false;
    this.panel.classList.remove('active');
  }
  
  sendMessage() {
    const message = this.inputField.value.trim();
    if (!message) return;
    
    // Add user message to chat
    this.addMessage({
      type: 'user',
      content: message
    });
    
    // Clear input
    this.inputField.value = '';
    this.autoResizeTextarea();
    
    // Trigger callback
    if (this.onMessage) {
      this.onMessage(message);
    }
  }
  
  addMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = `frontable-message ${message.type}`;
    
    // Check if message has visual context
    if (message.visualContext && message.visualContext.hasImage) {
      messageEl.classList.add('frontable-message-visual');
      
      // Create message content container
      const contentContainer = document.createElement('div');
      contentContainer.className = 'frontable-message-content';
      
      // Add text content
      const textContent = document.createElement('div');
      textContent.className = 'frontable-message-text';
      textContent.textContent = message.content;
      contentContainer.appendChild(textContent);
      
      // Add canvas if provided
      if (message.visualContext.canvas) {
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'frontable-message-canvas-container';
        canvasContainer.appendChild(message.visualContext.canvas);
        contentContainer.appendChild(canvasContainer);
        
        // Add visual context indicator
        const indicator = this.createVisualContextIndicator();
        contentContainer.appendChild(indicator);
      }
      
      messageEl.appendChild(contentContainer);
    } else {
      messageEl.textContent = message.content;
    }
    
    // Check for duplicate messages to prevent double display
    const lastMessage = this.messagesContainer.lastElementChild;
    if (lastMessage && lastMessage.textContent === messageEl.textContent && 
        lastMessage.className === messageEl.className) {
      return; // Don't add duplicate message
    }
    
    this.messagesContainer.appendChild(messageEl);
    this.scrollToBottom();
  }

  /**
   * Creates a message with visual context (canvas)
   */
  addVisualMessage(messageData) {
    const { text, visualData, type = 'user' } = messageData;
    
    const messageEl = document.createElement('div');
    messageEl.className = `frontable-message ${type} frontable-message-visual`;
    
    const contentContainer = document.createElement('div');
    contentContainer.className = 'frontable-message-content';
    
    // Add text content
    const textContent = document.createElement('div');
    textContent.className = 'frontable-message-text';
    textContent.textContent = text;
    contentContainer.appendChild(textContent);
    
    // Add canvas
    if (visualData && visualData.canvas) {
      const canvasContainer = document.createElement('div');
      canvasContainer.className = 'frontable-message-canvas-container';
      
      const displayCanvas = this.createDisplayCanvas(visualData);
      canvasContainer.appendChild(displayCanvas);
      contentContainer.appendChild(canvasContainer);
      
      // Add visual context indicator
      const indicator = this.createVisualContextIndicator();
      contentContainer.appendChild(indicator);
    }
    
    messageEl.appendChild(contentContainer);
    this.messagesContainer.appendChild(messageEl);
    this.scrollToBottom();
    
    return messageEl;
  }

  /**
   * Creates a display canvas for message
   */
  createDisplayCanvas(visualData) {
    const canvas = document.createElement('canvas');
    canvas.className = 'frontable-message-canvas';
    canvas.width = visualData.width;
    canvas.height = visualData.height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(visualData.canvas, 0, 0);
    
    // Add click handler for modal view
    canvas.addEventListener('click', () => {
      this.openImageModal(visualData.dataURL);
    });
    
    return canvas;
  }

  /**
   * Creates visual context indicator
   */
  createVisualContextIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'frontable-visual-context-indicator';
    indicator.innerHTML = '📷 Contexto visual incluído';
    return indicator;
  }

  /**
   * Opens image in modal
   */
  openImageModal(dataURL) {
    const existingModal = document.querySelector('.frontable-visual-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'frontable-visual-modal';
    
    const img = document.createElement('img');
    img.src = dataURL;
    img.className = 'frontable-modal-image';
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', () => modal.remove());
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }
  
  showTyping() {
    const typingEl = document.createElement('div');
    typingEl.className = 'frontable-typing';
    typingEl.innerHTML = `
      <div class="frontable-typing-dot"></div>
      <div class="frontable-typing-dot"></div>
      <div class="frontable-typing-dot"></div>
    `;
    
    this.messagesContainer.appendChild(typingEl);
    this.scrollToBottom();
  }
  
  hideTyping() {
    const typingEl = this.messagesContainer.querySelector('.frontable-typing');
    if (typingEl) {
      typingEl.remove();
    }
  }

  showToolProgress(toolInfo) {
    // Remove existing progress indicators
    this.hideTyping();
    this.hideToolProgress();
    
    const progressEl = document.createElement('div');
    progressEl.className = 'frontable-tool-progress';
    progressEl.innerHTML = `
      <div class="frontable-tool-header">
        <span class="frontable-tool-icon">${this.getToolIcon(toolInfo.tool)}</span>
        <span class="frontable-tool-name">${this.getToolDisplayName(toolInfo.tool)}</span>
        <div class="frontable-progress-spinner"></div>
      </div>
      <div class="frontable-tool-description">${toolInfo.description}</div>
      ${toolInfo.target ? `<div class="frontable-tool-target">🎯 Alvo: ${toolInfo.target}</div>` : ''}
    `;
    
    this.messagesContainer.appendChild(progressEl);
    this.scrollToBottom();
  }

  hideToolProgress() {
    const progressEl = this.messagesContainer.querySelector('.frontable-tool-progress');
    if (progressEl) {
      progressEl.remove();
    }
  }

  updateToolProgress(status, message) {
    const progressEl = this.messagesContainer.querySelector('.frontable-tool-progress');
    if (progressEl) {
      const statusEl = document.createElement('div');
      statusEl.className = `frontable-tool-status frontable-tool-${status}`;
      statusEl.innerHTML = `
        <span class="frontable-status-icon">${status === 'success' ? '✅' : status === 'error' ? '❌' : '⚠️'}</span>
        <span class="frontable-status-message">${message}</span>
      `;
      progressEl.appendChild(statusEl);
      
      // Remove spinner
      const spinner = progressEl.querySelector('.frontable-progress-spinner');
      if (spinner) {
        spinner.remove();
      }
      
      this.scrollToBottom();
      
      // Auto-hide after 3 seconds for successful operations
      if (status === 'success') {
        setTimeout(() => {
          const currentProgressEl = this.messagesContainer.querySelector('.frontable-tool-progress');
          if (currentProgressEl === progressEl) {
            progressEl.style.opacity = '0.6';
            progressEl.style.transform = 'scale(0.95)';
          }
        }, 3000);
      }
    }
  }

  getToolIcon(toolName) {
    const icons = {
      'applyStyles': '🎨',
      'createElement': '➕',
      'createInteractiveElement': '⚡',
      'deleteElement': '🗑️',
      'addBehavior': '🔧',
      'executeScript': '💻',
      'generateImage': '🖼️',
      'generateClaudeCodeInstructions': '📋',
      'planTask': '🎯'
    };
    return icons[toolName] || '🔧';
  }

  getToolDisplayName(toolName) {
    const names = {
      'applyStyles': 'Aplicar Estilos',
      'createElement': 'Criar Elemento',
      'createInteractiveElement': 'Criar Elemento Interativo',
      'deleteElement': 'Remover Elemento',
      'addBehavior': 'Adicionar Comportamento',
      'executeScript': 'Executar Script',
      'generateImage': 'Gerar Imagem',
      'generateClaudeCodeInstructions': 'Gerar Instruções IDE',
      'planTask': 'Planejar Tarefas'
    };
    return names[toolName] || 'Executar Ferramenta';
  }
  
  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  showSelectionPreview(elements) {
    // Remove existing preview
    const existingPreview = this.panel.querySelector('.frontable-selection-preview');
    if (existingPreview) {
      existingPreview.remove();
    }

    if (elements.length === 0) return;

    // Create selection preview
    const preview = document.createElement('div');
    preview.className = 'frontable-selection-preview';
    preview.innerHTML = `
      <div class="frontable-preview-header">
        <span>📝 ${elements.length} elemento(s) selecionado(s)</span>
        <button class="frontable-clear-selection">✕</button>
      </div>
      <div class="frontable-preview-list">
        ${elements.map((el, index) => `
          <div class="frontable-preview-item">
            ${index + 1}. ${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ')[0] : ''}${el.id ? '#' + el.id : ''}
          </div>
        `).join('')}
      </div>
    `;

    // Insert before input container
    const inputContainer = this.panel.querySelector('.frontable-input-container');
    inputContainer.parentNode.insertBefore(preview, inputContainer);

    // Add clear selection event
    const clearBtn = preview.querySelector('.frontable-clear-selection');
    clearBtn.addEventListener('click', () => {
      if (this.onClearSelection) {
        this.onClearSelection();
      }
      preview.remove();
    });
  }

  setupTaskProgressListener() {
    // Listen for task plan updates from the DOMManipulationAgent
    window.addEventListener('ajentTaskPlanUpdate', (event) => {
      this.updateTaskProgress(event.detail);
    });

    // Listen for tool progress events
    window.addEventListener('ajentToolStart', (event) => {
      this.showToolProgress(event.detail);
    });

    window.addEventListener('ajentToolSuccess', (event) => {
      this.updateToolProgress('success', event.detail.result);
    });

    window.addEventListener('ajentToolError', (event) => {
      this.updateToolProgress('error', `Erro: ${event.detail.error}`);
    });
  }

  updateTaskProgress(taskPlan) {
    const progressContainer = this.panel.querySelector('.frontable-task-progress');
    const statsElement = this.panel.querySelector('.frontable-task-stats');
    const listElement = this.panel.querySelector('.frontable-task-list');
    
    if (!progressContainer || !taskPlan) return;
    
    // Show progress container
    progressContainer.style.display = 'block';
    
    // Update stats
    const completed = taskPlan.completedTasks || 0;
    const total = taskPlan.totalTasks || 0;
    statsElement.textContent = `${completed}/${total}`;
    
    // Update task list
    listElement.innerHTML = '';
    
    if (taskPlan.tasks && Array.isArray(taskPlan.tasks)) {
      taskPlan.tasks.forEach((task) => {
        const taskElement = document.createElement('div');
        taskElement.className = 'frontable-task-item';
        
        let emoji = '⏳';
        let statusClass = 'pending';
        
        if (task.status === 'completed') {
          emoji = '✅';
          statusClass = 'completed';
        } else if (task.status === 'in_progress') {
          emoji = '🔄';
          statusClass = 'in_progress';
        }
        
        taskElement.innerHTML = `
          <span class="frontable-task-emoji">${emoji}</span>
          <span class="frontable-task-description">${task.description}</span>
        `;
        
        taskElement.classList.add(`frontable-task-${statusClass}`);
        listElement.appendChild(taskElement);
      });
    }
    
    // Auto-hide when all tasks are completed
    if (completed === total && total > 0) {
      setTimeout(() => {
        progressContainer.style.display = 'none';
      }, 3000);
    }
    
    this.scrollToBottom();
  }

  hideTaskProgress() {
    const progressContainer = this.panel.querySelector('.frontable-task-progress');
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
  }

  /**
   * Shows a real-time progress status message
   */
  showProgressStatus(message, type = 'processing') {
    // Remove any existing status messages
    this.removeProgressStatus();
    
    const statusElement = document.createElement('div');
    statusElement.className = `frontable-progress-status frontable-progress-${type}`;
    statusElement.id = 'frontable-current-status';
    
    const icon = this.getStatusIcon(type);
    statusElement.innerHTML = `
      <div class="frontable-status-content">
        <span class="frontable-status-icon">${icon}</span>
        <span class="frontable-status-text">${message}</span>
        <span class="frontable-status-dots">
          <span>.</span><span>.</span><span>.</span>
        </span>
      </div>
    `;
    
    // Insert before input container
    const inputContainer = this.panel.querySelector('.frontable-input-container');
    inputContainer.parentNode.insertBefore(statusElement, inputContainer);
    
    this.scrollToBottom();
  }

  /**
   * Updates existing progress status message
   */
  updateProgressStatus(message, type = 'processing') {
    const existingStatus = document.getElementById('frontable-current-status');
    if (existingStatus) {
      const icon = this.getStatusIcon(type);
      const textElement = existingStatus.querySelector('.frontable-status-text');
      const iconElement = existingStatus.querySelector('.frontable-status-icon');
      
      if (textElement) textElement.textContent = message;
      if (iconElement) iconElement.innerHTML = icon;
      
      // Update class for styling
      existingStatus.className = `frontable-progress-status frontable-progress-${type}`;
    } else {
      this.showProgressStatus(message, type);
    }
    
    this.scrollToBottom();
  }

  /**
   * Removes progress status message
   */
  removeProgressStatus() {
    const statusElement = document.getElementById('frontable-current-status');
    if (statusElement) {
      statusElement.remove();
    }
  }

  /**
   * Shows success status and auto-removes after delay
   */
  showSuccessStatus(message, autoRemove = true) {
    this.updateProgressStatus(message, 'success');
    
    if (autoRemove) {
      setTimeout(() => {
        this.removeProgressStatus();
      }, 2000);
    }
  }

  /**
   * Shows error status
   */
  showErrorStatus(message) {
    this.updateProgressStatus(message, 'error');
  }

  /**
   * Gets appropriate icon for status type
   */
  getStatusIcon(type) {
    const icons = {
      processing: '⚡',
      validation: '🔍',
      applying: '✨',
      success: '✅',
      error: '❌',
      accessibility: '♿',
      css: '🎨',
      retry: '🔄'
    };
    return icons[type] || '⚡';
  }

  /**
   * Shows step-by-step progress for complex operations
   */
  showStepProgress(steps, currentStep = 0) {
    // Remove existing progress
    this.removeProgressStatus();
    
    const progressElement = document.createElement('div');
    progressElement.className = 'frontable-step-progress';
    progressElement.id = 'frontable-step-progress';
    
    const stepsHtml = steps.map((step, index) => {
      const status = index < currentStep ? 'completed' : 
                    index === currentStep ? 'current' : 'pending';
      const icon = index < currentStep ? '✅' : 
                  index === currentStep ? '⚡' : '⏳';
      
      return `
        <div class="frontable-step frontable-step-${status}">
          <span class="frontable-step-icon">${icon}</span>
          <span class="frontable-step-text">${step}</span>
        </div>
      `;
    }).join('');
    
    progressElement.innerHTML = `
      <div class="frontable-steps-container">
        <div class="frontable-steps-header">
          <span class="frontable-steps-title">📋 Progresso</span>
          <span class="frontable-steps-counter">${currentStep}/${steps.length}</span>
        </div>
        <div class="frontable-steps-list">
          ${stepsHtml}
        </div>
      </div>
    `;
    
    // Insert before input container
    const inputContainer = this.panel.querySelector('.frontable-input-container');
    inputContainer.parentNode.insertBefore(progressElement, inputContainer);
    
    this.scrollToBottom();
  }

  /**
   * Updates step progress
   */
  updateStepProgress(currentStep) {
    const progressElement = document.getElementById('frontable-step-progress');
    if (!progressElement) return;
    
    const steps = progressElement.querySelectorAll('.frontable-step');
    const counter = progressElement.querySelector('.frontable-steps-counter');
    
    steps.forEach((step, index) => {
      const icon = step.querySelector('.frontable-step-icon');
      
      if (index < currentStep) {
        step.className = 'frontable-step frontable-step-completed';
        icon.textContent = '✅';
      } else if (index === currentStep) {
        step.className = 'frontable-step frontable-step-current';
        icon.textContent = '⚡';
      } else {
        step.className = 'frontable-step frontable-step-pending';
        icon.textContent = '⏳';
      }
    });
    
    if (counter) {
      counter.textContent = `${currentStep}/${steps.length}`;
    }
    
    this.scrollToBottom();
  }

  /**
   * Removes step progress
   */
  removeStepProgress() {
    const progressElement = document.getElementById('frontable-step-progress');
    if (progressElement) {
      progressElement.remove();
    }
  }
}

export default ChatInterface;