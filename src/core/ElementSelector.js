class ElementSelector {
  constructor() {
    this.isEnabled = false;
    this.selectedElement = null;
    this.hoveredElement = null;
    this.overlay = null;
    this.multipleSelectionEnabled = false;
    this.multiSelectedElements = [];
    this.multiOverlays = [];
    this.onSelectionChange = null;
    this.lastSelectedElements = []; // Track last selected elements for reuse
    
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
    this.multipleSelectionEnabled = true; // Always enable multiple selection
    document.addEventListener('mouseover', this.handleMouseOver);
    document.addEventListener('mouseout', this.handleMouseOut);
    document.addEventListener('click', this.handleClick);
  }
  
  disable() {
    this.isEnabled = false;
    this.clearSelection();
    this.clearMultiSelection();
    document.removeEventListener('mouseover', this.handleMouseOver);
    document.removeEventListener('mouseout', this.handleMouseOut);
    document.removeEventListener('click', this.handleClick);
  }
  
  handleMouseOver = (e) => {
    if (!this.isEnabled) return;
    if (e.target.closest('.dsa-chat-panel')) return;
    if (this.selectedElement) return; // Stop hovering after selection
    
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
    
    if (this.multipleSelectionEnabled && e.shiftKey) {
      // Handle multiple selection with Shift+Click
      this.toggleMultiSelection(e.target);
    } else if (this.multipleSelectionEnabled) {
      // Single selection in multi mode
      this.clearMultiSelection();
      this.addToMultiSelection(e.target);
    } else {
      // Original single selection mode
      this.selectElement(e.target);
    }
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

  enableMultipleSelection() {
    this.multipleSelectionEnabled = true;
    this.clearSelection(); // Clear single selection
  }

  disableMultipleSelection() {
    this.multipleSelectionEnabled = false;
    this.clearMultiSelection(); // Clear multiple selections
  }

  toggleMultiSelection(element) {
    const index = this.multiSelectedElements.indexOf(element);
    if (index > -1) {
      this.removeFromMultiSelection(element);
    } else {
      this.addToMultiSelection(element);
    }
  }

  addToMultiSelection(element) {
    if (!this.multiSelectedElements.includes(element)) {
      this.multiSelectedElements.push(element);
      this.showMultiSelectedOverlay(element);
      this.updateLastSelectedElements();
      this.notifySelectionChange();
    }
  }

  removeFromMultiSelection(element) {
    const index = this.multiSelectedElements.indexOf(element);
    if (index > -1) {
      this.multiSelectedElements.splice(index, 1);
      this.hideOverlayForElement(element);
      this.updateLastSelectedElements();
      this.notifySelectionChange();
    }
  }

  clearMultiSelection() {
    this.multiSelectedElements = [];
    this.clearAllMultiOverlays();
    this.forceRemoveAllSelectionOverlays(); // Add extra cleanup
    this.notifySelectionChange();
  }

  showMultiSelectedOverlay(element) {
    const rect = element.getBoundingClientRect();
    
    // Create a new overlay for this element
    const overlay = document.createElement('div');
    overlay.className = 'dsa-multi-selector-overlay';
    overlay.dataset.elementId = this.getElementId(element);
    
    overlay.style.cssText = `
      display: block !important;
      position: absolute !important;
      left: ${rect.left + window.scrollX}px !important;
      top: ${rect.top + window.scrollY}px !important;
      width: ${rect.width}px !important;
      height: ${rect.height}px !important;
      border: 2px solid #f59e0b !important;
      background: rgba(245, 158, 11, 0.1) !important;
      border-radius: 4px !important;
      z-index: 2147483646 !important;
      pointer-events: none !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.3) !important;
    `;

    // Add selection counter
    const counter = document.createElement('div');
    counter.className = 'dsa-selection-counter';
    counter.textContent = this.multiSelectedElements.length;
    counter.style.cssText = `
      position: absolute !important;
      top: -8px !important;
      right: -8px !important;
      background: #f59e0b !important;
      color: white !important;
      border-radius: 50% !important;
      width: 20px !important;
      height: 20px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 12px !important;
      font-weight: bold !important;
      z-index: 2147483647 !important;
    `;
    
    overlay.appendChild(counter);
    document.body.appendChild(overlay);
    this.multiOverlays.push(overlay);
  }

  hideOverlayForElement(element) {
    const elementId = this.getElementId(element);
    const overlays = document.querySelectorAll(`[data-element-id="${elementId}"]`);
    overlays.forEach(overlay => {
      overlay.remove();
      const index = this.multiOverlays.indexOf(overlay);
      if (index > -1) {
        this.multiOverlays.splice(index, 1);
      }
    });
  }

  clearAllMultiOverlays() {
    this.multiOverlays.forEach(overlay => overlay.remove());
    this.multiOverlays = [];
  }

  forceRemoveAllSelectionOverlays() {
    // Force remove any remaining selection overlays that might be stuck in DOM
    const allMultiOverlays = document.querySelectorAll('.dsa-multi-selector-overlay');
    const allCounters = document.querySelectorAll('.dsa-selection-counter');
    
    allMultiOverlays.forEach(overlay => {
      try {
        overlay.remove();
      } catch (e) {
        console.warn('Could not remove overlay:', e);
      }
    });
    
    allCounters.forEach(counter => {
      try {
        counter.remove();
      } catch (e) {
        console.warn('Could not remove counter:', e);
      }
    });
    
    // Clear the arrays to reset state
    this.multiOverlays = [];
    
    console.log('🧹 Force removed all selection overlays');
  }

  getElementId(element) {
    // Create a unique identifier for the element
    if (element.id) return element.id;
    if (element.className) return element.className.replace(/\s+/g, '-');
    return element.tagName + '-' + Array.from(element.parentNode.children).indexOf(element);
  }

  getMultiSelectedElements() {
    return this.multiSelectedElements;
  }

  notifySelectionChange() {
    if (this.onSelectionChange) {
      this.onSelectionChange(this.multiSelectedElements);
    }
  }

  updateLastSelectedElements() {
    // Save current selection as last selected (only valid DOM elements)
    this.lastSelectedElements = this.multiSelectedElements.filter(element => 
      element && element.nodeType && element.nodeType === Node.ELEMENT_NODE && 
      document.contains(element) // Ensure element is still in DOM
    );
    console.log('💾 Saved last selected elements:', this.lastSelectedElements.length);
  }

  restoreLastSelection() {
    // Restore last selected elements if they're still valid and in DOM
    const validLastElements = this.lastSelectedElements.filter(element => 
      element && element.nodeType && element.nodeType === Node.ELEMENT_NODE && 
      document.contains(element)
    );

    if (validLastElements.length > 0) {
      this.clearMultiSelection();
      validLastElements.forEach(element => {
        this.multiSelectedElements.push(element);
        this.showMultiSelectedOverlay(element);
      });
      this.notifySelectionChange();
      console.log('🔄 Restored last selection:', validLastElements.length, 'elements');
      return true;
    }
    
    console.log('❌ No valid last selection to restore');
    return false;
  }

  hasLastSelection() {
    const validLastElements = this.lastSelectedElements.filter(element => 
      element && element.nodeType && element.nodeType === Node.ELEMENT_NODE && 
      document.contains(element)
    );
    return validLastElements.length > 0;
  }
}

export default ElementSelector;