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
          <div class="dsa-title">Design System Agent</div>
          <div class="dsa-status">
            <span class="dsa-status-dot"></span>
            Ready to help
          </div>
        </div>
        <button class="dsa-close-btn">×</button>
      </div>
      
      <div class="dsa-messages"></div>
      
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
        </div>
      </div>
    `;
    
    document.body.appendChild(this.panel);
    this.setupEventListeners();
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
}

export default ChatInterface;