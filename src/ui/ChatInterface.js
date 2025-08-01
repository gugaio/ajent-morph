class ChatInterface {
  constructor() {
    this.panel = null;
    this.messagesContainer = null;
    this.inputField = null;
    this.isVisible = false;
    this.currentMode = 'modify';
    
    this.onMessage = null;
    this.onClose = null;
    this.onModeChange = null;
    
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

      <div class="dsa-mode-toggle">
        <input type="radio" id="mode-modify" name="mode" value="modify" checked>
        <label for="mode-modify">🎨 Modificar CSS</label>
        <input type="radio" id="mode-create" name="mode" value="create">
        <label for="mode-create">🧩 Criar Componente</label>
      </div>
      
      <div class="dsa-messages"></div>
      
      <div class="dsa-input-container">
        <div class="dsa-input-wrapper">
          <textarea 
            class="dsa-input" 
            placeholder="Descreva o que você quer alterar no design..."
            rows="1"
          ></textarea>
          <button class="dsa-send-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <div class="dsa-suggestions modify-suggestions">
          <div class="dsa-suggestion" data-command="Mudar cor do botão">🎨 Mudar cor</div>
          <div class="dsa-suggestion" data-command="Aumentar espaçamento">📏 Espaçamento</div>
          <div class="dsa-suggestion" data-command="Deixar mais arredondado">🔵 Arredondar</div>
          <div class="dsa-suggestion" data-command="Tornar texto maior">📝 Texto maior</div>
        </div>
        <div class="dsa-suggestions create-suggestions" style="display: none;">
          <div class="dsa-suggestion" data-command="Criar elemento similar">🔄 Similar</div>
          <div class="dsa-suggestion" data-command="Criar header baseado neste elemento">📋 Header</div>
          <div class="dsa-suggestion" data-command="Criar card container">📦 Card</div>
          <div class="dsa-suggestion" data-command="Combinar elementos selecionados">🔗 Combinar</div>
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
    
    // Mode toggle handling
    const modeInputs = this.panel.querySelectorAll('input[name="mode"]');
    modeInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.handleModeChange(e.target.value);
      });
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
    this.panel.querySelectorAll('.dsa-suggestion').forEach(suggestion => {
      suggestion.addEventListener('click', () => {
        const command = suggestion.dataset.command;
        this.inputField.value = command;
        this.inputField.focus();
        this.sendMessage();
      });
    });
  }

  handleModeChange(mode) {
    this.currentMode = mode;
    
    // Update placeholder text
    const placeholder = mode === 'create' 
      ? 'Descreva o componente que você quer criar...'
      : 'Descreva o que você quer alterar no design...';
    this.inputField.placeholder = placeholder;
    
    // Show/hide appropriate suggestions
    const modifySuggestions = this.panel.querySelector('.modify-suggestions');
    const createSuggestions = this.panel.querySelector('.create-suggestions');
    
    if (mode === 'create') {
      modifySuggestions.style.display = 'none';
      createSuggestions.style.display = 'flex';
    } else {
      modifySuggestions.style.display = 'flex';
      createSuggestions.style.display = 'none';
    }
    
    // Notify parent component
    if (this.onModeChange) {
      this.onModeChange(mode);
    }
    
    // Add mode indicator to status
    const statusText = this.panel.querySelector('.dsa-status');
    const modeText = mode === 'create' ? 'Modo: Criar Componente' : 'Modo: Modificar CSS';
    statusText.innerHTML = `<span class="dsa-status-dot"></span>${modeText}`;
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