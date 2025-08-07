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
    const existingPanels = document.querySelectorAll('.dsa-chat-panel');
    existingPanels.forEach(panel => panel.remove());
    
    this.panel = document.createElement('div');
    this.panel.className = 'dsa-chat-panel';
    
    this.panel.innerHTML = `
      <div class="dsa-chat-header">
        <div>
          <div class="dsa-title">Frontable</div>
        </div>
        <button class="dsa-close-btn">×</button>
      </div>
      
      <div class="dsa-messages"></div>
      
      <div class="dsa-task-progress" style="display: none;">
        <div class="dsa-task-header">
          <span class="dsa-task-title">🎯 Plano de Execução</span>
          <span class="dsa-task-stats">0/0</span>
        </div>
        <div class="dsa-task-list"></div>
      </div>
      
      <div class="dsa-input-container">
        <div class="dsa-input-wrapper">
          <textarea 
            class="dsa-input" 
            placeholder="Descreva o que você quer fazer..."
            rows="1"
          ></textarea>
          <button class="dsa-send-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <div class="dsa-suggestions">
          <div class="dsa-suggestion" data-command="Mudar cor do botão">🎨 Mudar cor</div>
          <div class="dsa-suggestion" data-command="Aumentar espaçamento">📏 Espaçamento</div>
          <div class="dsa-suggestion" data-command="Criar elemento similar">🔄 Criar similar</div>
          <div class="dsa-suggestion" data-command="Adicionar mais um botão">➕ Adicionar elemento</div>
          <div class="dsa-suggestion dsa-special-suggestion" data-command="Gerar instruções Claude Code">⚡ Instruções para IDE</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.panel);
    this.setupEventListeners();
    this.setupTaskProgressListener();
  }
  
  setupEventListeners() {
    this.messagesContainer = this.panel.querySelector('.dsa-messages');
    this.inputField = this.panel.querySelector('.dsa-input');
    const sendBtn = this.panel.querySelector('.dsa-send-btn');
    const closeBtn = this.panel.querySelector('.dsa-close-btn');
    
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
    this.panel.querySelectorAll('.dsa-suggestion').forEach(suggestion => {
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
    messageEl.className = `dsa-message ${message.type}`;
    messageEl.textContent = message.content;
    
    this.messagesContainer.appendChild(messageEl);
    this.scrollToBottom();
  }
  
  showTyping() {
    const typingEl = document.createElement('div');
    typingEl.className = 'dsa-typing';
    typingEl.innerHTML = `
      <div class="dsa-typing-dot"></div>
      <div class="dsa-typing-dot"></div>
      <div class="dsa-typing-dot"></div>
    `;
    
    this.messagesContainer.appendChild(typingEl);
    this.scrollToBottom();
  }
  
  hideTyping() {
    const typingEl = this.messagesContainer.querySelector('.dsa-typing');
    if (typingEl) {
      typingEl.remove();
    }
  }
  
  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  showSelectionPreview(elements) {
    // Remove existing preview
    const existingPreview = this.panel.querySelector('.dsa-selection-preview');
    if (existingPreview) {
      existingPreview.remove();
    }

    if (elements.length === 0) return;

    // Create selection preview
    const preview = document.createElement('div');
    preview.className = 'dsa-selection-preview';
    preview.innerHTML = `
      <div class="dsa-preview-header">
        <span>📝 ${elements.length} elemento(s) selecionado(s)</span>
        <button class="dsa-clear-selection">✕</button>
      </div>
      <div class="dsa-preview-list">
        ${elements.map((el, index) => `
          <div class="dsa-preview-item">
            ${index + 1}. ${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ')[0] : ''}${el.id ? '#' + el.id : ''}
          </div>
        `).join('')}
      </div>
    `;

    // Insert before input container
    const inputContainer = this.panel.querySelector('.dsa-input-container');
    inputContainer.parentNode.insertBefore(preview, inputContainer);

    // Add clear selection event
    const clearBtn = preview.querySelector('.dsa-clear-selection');
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
  }

  updateTaskProgress(taskPlan) {
    const progressContainer = this.panel.querySelector('.dsa-task-progress');
    const statsElement = this.panel.querySelector('.dsa-task-stats');
    const listElement = this.panel.querySelector('.dsa-task-list');
    
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
        taskElement.className = 'dsa-task-item';
        
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
          <span class="dsa-task-emoji">${emoji}</span>
          <span class="dsa-task-description">${task.description}</span>
        `;
        
        taskElement.classList.add(`dsa-task-${statusClass}`);
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
    const progressContainer = this.panel.querySelector('.dsa-task-progress');
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
  }
}

export default ChatInterface;