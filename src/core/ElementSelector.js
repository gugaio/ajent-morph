class ElementSelector {
  constructor() {
    this.isEnabled = false;
    this.selectedElement = null;
    this.hoveredElement = null;
    this.overlay = null;
    
    this.createOverlay();
  }
  
  createOverlay() {
    // Remove any existing overlays first
    const existingOverlays = document.querySelectorAll('.dsa-selector-overlay');
    existingOverlays.forEach(overlay => overlay.remove());
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'dsa-selector-overlay';
    document.body.appendChild(this.overlay);
  }
  
  enable() {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    document.addEventListener('mouseover', this.handleMouseOver);
    document.addEventListener('mouseout', this.handleMouseOut);
    document.addEventListener('click', this.handleClick);
  }
  
  disable() {
    this.isEnabled = false;
    this.clearSelection();
    document.removeEventListener('mouseover', this.handleMouseOver);
    document.removeEventListener('mouseout', this.handleMouseOut);
    document.removeEventListener('click', this.handleClick);
  }
  
  handleMouseOver = (e) => {
    if (!this.isEnabled) return;
    if (e.target.closest('.dsa-chat-panel')) return;
    if (this.selectedElement) return; // Stop hovering after selection
    
    console.log('Hovering over:', e.target);
    this.hoveredElement = e.target;
    this.showOverlay(e.target);
  };
  
  handleMouseOut = (e) => {
    if (!this.isEnabled) return;
    if (e.target.closest('.dsa-chat-panel')) return;
    if (this.selectedElement) return; // Keep overlay visible after selection
    
    this.hoveredElement = null;
    this.hideOverlay();
  };
  
  handleClick = (e) => {
    if (!this.isEnabled) return;
    if (e.target.closest('.dsa-chat-panel')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Allow reselecting a different element
    this.selectElement(e.target);
  };
  
  showOverlay(element) {
    const rect = element.getBoundingClientRect();
    
    this.overlay.style.cssText = `
      display: block !important;
      position: absolute !important;
      left: ${rect.left + window.scrollX}px !important;
      top: ${rect.top + window.scrollY}px !important;
      width: ${rect.width}px !important;
      height: ${rect.height}px !important;
      border: 2px solid #3b82f6 !important;
      background: rgba(59, 130, 246, 0.1) !important;
      border-radius: 4px !important;
      z-index: 2147483646 !important;
      pointer-events: none !important;
      transition: all 0.2s ease !important;
    `;
  }
  
  hideOverlay() {
    this.overlay.style.cssText = 'display: none !important;';
  }
  
  selectElement(element) {
    this.selectedElement = element;
    this.showSelectedOverlay(element);
    
    console.log('Selected element:', element);
  }
  
  showSelectedOverlay(element) {
    const rect = element.getBoundingClientRect();
    
    this.overlay.style.cssText = `
      display: block !important;
      position: absolute !important;
      left: ${rect.left + window.scrollX}px !important;
      top: ${rect.top + window.scrollY}px !important;
      width: ${rect.width}px !important;
      height: ${rect.height}px !important;
      border: 2px solid #10b981 !important;
      background: rgba(16, 185, 129, 0.1) !important;
      border-radius: 4px !important;
      z-index: 2147483646 !important;
      pointer-events: none !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.3) !important;
    `;
  }
  
  clearSelection() {
    this.selectedElement = null;
    this.hideOverlay();
  }
  
  getSelectedElement() {
    return this.selectedElement;
  }
}

export default ElementSelector;