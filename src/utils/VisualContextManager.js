import html2canvas from 'html2canvas';
import VisualContextConfig from '../config/VisualContextConfig.js';

class VisualContextManager {
  constructor() {
    this.config = VisualContextConfig;
    this.captureCache = new Map();
    this.debounceTimers = new Map();
  }

  /**
   * Detects if message contains the #image command
   */
  shouldIncludeVisualContext(userMessage) {
    const command = this.config.command.imageCommand;
    const message = this.config.command.caseSensitive ? userMessage : userMessage.toLowerCase();
    const searchCommand = this.config.command.caseSensitive ? command : command.toLowerCase();
    
    return message.includes(searchCommand);
  }

  /**
   * Removes #image command from user message
   */
  cleanUserMessage(userMessage) {
    const flags = this.config.command.caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(this.config.command.imageCommand, flags);
    return userMessage.replace(regex, '').trim();
  }

  /**
   * Captures screenshot of a specific element
   */
  async captureElementScreenshot(element) {
    try {
      // Check cache first if enabled
      if (this.config.performance.enableCache) {
        const cacheKey = this.generateCacheKey(element);
        const cached = this.captureCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.config.performance.cacheTimeout) {
          if (this.config.debug.enabled) {
            console.log('Using cached screenshot for element');
          }
          return cached.data;
        }
      }

      // Temporarily highlight the element for better visual context (if enabled)
      const originalStyles = {};
      if (this.config.features.enableHighlightOnCapture) {
        originalStyles.boxShadow = element.style.boxShadow;
        originalStyles.outline = element.style.outline;
        
        element.style.boxShadow = '0 0 0 2px #007bff';
        element.style.outline = 'none';
      }

      // Use html2canvas to capture the element
      const startTime = this.config.debug.showTimings ? performance.now() : 0;
      
      const canvas = await html2canvas(element, this.config.capture.html2canvasOptions);
      
      if (this.config.debug.showTimings) {
        console.log(`Screenshot capture took: ${performance.now() - startTime}ms`);
      }

      // Restore original styles
      if (this.config.features.enableHighlightOnCapture) {
        Object.entries(originalStyles).forEach(([prop, value]) => {
          element.style[prop] = value;
        });
      }

      // Resize canvas if needed
      const resizedCanvas = this.resizeCanvas(
        canvas, 
        this.config.capture.maxCanvasWidth, 
        this.config.capture.maxCanvasHeight
      );

      const result = {
        canvas: resizedCanvas,
        dataURL: resizedCanvas.toDataURL('image/png', this.config.capture.imageQuality),
        width: resizedCanvas.width,
        height: resizedCanvas.height,
        originalElement: element,
        timestamp: Date.now()
      };

      // Cache result if enabled
      if (this.config.performance.enableCache) {
        const cacheKey = this.generateCacheKey(element);
        this.captureCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        // Clean up old cache entries
        this.cleanupCache();
      }

      return result;

    } catch (error) {
      if (this.config.debug.enabled) {
        console.error('Error capturing element screenshot:', error);
      }
      return null;
    }
  }

  /**
   * Captures screenshot of multiple elements
   */
  async captureMultipleElements(elements) {
    try {
      if (elements.length === 0) return null;

      // If single element, use captureElementScreenshot
      if (elements.length === 1) {
        return await this.captureElementScreenshot(elements[0]);
      }

      // For multiple elements, find the common container
      const container = this.findCommonContainer(elements);
      
      // Highlight all selected elements
      const originalStyles = elements.map(el => ({
        element: el,
        boxShadow: el.style.boxShadow,
        outline: el.style.outline
      }));

      elements.forEach(el => {
        el.style.boxShadow = '0 0 0 2px #007bff';
        el.style.outline = 'none';
      });

      // Capture the container
      const canvas = await html2canvas(container, this.config.captureOptions);

      // Restore original styles
      originalStyles.forEach(({ element, boxShadow, outline }) => {
        element.style.boxShadow = boxShadow;
        element.style.outline = outline;
      });

      // Resize canvas if needed
      const resizedCanvas = this.resizeCanvas(canvas, this.config.maxCanvasWidth, this.config.maxCanvasHeight);

      return {
        canvas: resizedCanvas,
        dataURL: resizedCanvas.toDataURL('image/png', this.config.imageQuality),
        width: resizedCanvas.width,
        height: resizedCanvas.height,
        originalElements: elements,
        container: container
      };

    } catch (error) {
      console.error('Error capturing multiple elements screenshot:', error);
      return null;
    }
  }

  /**
   * Finds the common container for multiple elements
   */
  findCommonContainer(elements) {
    if (elements.length === 0) return document.body;
    if (elements.length === 1) return elements[0];

    let container = elements[0];

    for (let i = 1; i < elements.length; i++) {
      container = this.findCommonParent(container, elements[i]);
    }

    return container;
  }

  /**
   * Finds common parent of two elements
   */
  findCommonParent(element1, element2) {
    const parents1 = this.getParents(element1);
    const parents2 = this.getParents(element2);

    for (let parent of parents1) {
      if (parents2.includes(parent)) {
        return parent;
      }
    }

    return document.body;
  }

  /**
   * Gets all parent elements of an element
   */
  getParents(element) {
    const parents = [];
    let current = element.parentElement;

    while (current && current !== document.body) {
      parents.push(current);
      current = current.parentElement;
    }

    parents.push(document.body);
    return parents;
  }

  /**
   * Resizes canvas maintaining aspect ratio
   */
  resizeCanvas(originalCanvas, maxWidth, maxHeight) {
    const { width, height } = originalCanvas;
    const ratio = Math.min(maxWidth / width, maxHeight / height);

    if (ratio >= 1) {
      return originalCanvas; // No need to resize
    }

    const newWidth = Math.floor(width * ratio);
    const newHeight = Math.floor(height * ratio);

    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = newWidth;
    resizedCanvas.height = newHeight;

    const ctx = resizedCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(originalCanvas, 0, 0, newWidth, newHeight);

    return resizedCanvas;
  }

  /**
   * Creates a display canvas for chat message
   */
  createMessageCanvas(visualData, container) {
    if (!visualData || !visualData.canvas) return null;

    const displayCanvas = document.createElement('canvas');
    displayCanvas.className = 'message-canvas';
    displayCanvas.width = visualData.width;
    displayCanvas.height = visualData.height;

    // Copy the image data
    const ctx = displayCanvas.getContext('2d');
    ctx.drawImage(visualData.canvas, 0, 0);

    // Apply styles
    displayCanvas.style.cssText = `
      max-width: 100%;
      height: auto;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-top: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      cursor: pointer;
    `;

    // Add click handler to open larger version
    displayCanvas.addEventListener('click', () => {
      this.openImageModal(visualData.dataURL);
    });

    if (container) {
      container.appendChild(displayCanvas);
    }

    return displayCanvas;
  }

  /**
   * Opens image in a modal for better viewing
   */
  openImageModal(dataURL) {
    // Remove existing modal
    const existingModal = document.querySelector('.visual-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'visual-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    `;

    const img = document.createElement('img');
    img.src = dataURL;
    img.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    modal.appendChild(img);
    document.body.appendChild(modal);

    // Close on click
    modal.addEventListener('click', () => {
      modal.remove();
    });

    // Close on escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Creates visual context indicator
   */
  createVisualContextIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'visual-context-indicator';
    indicator.innerHTML = '📷 Contexto visual incluído';
    indicator.style.cssText = `
      font-size: 0.85em;
      color: #6c757d;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    `;
    return indicator;
  }

  /**
   * Compresses image data for optimal LLM transmission
   */
  compressImageForLLM(dataURL, maxSize = 512) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate size to fit within maxSize while maintaining aspect ratio
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Compress further by reducing quality
        const compressedDataURL = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedDataURL);
      };

      img.src = dataURL;
    });
  }

  /**
   * Prepares visual data for LLM consumption
   */
  async prepareVisualDataForLLM(visualData, description = '') {
    if (!visualData) return null;

    const compressedImage = await this.compressImageForLLM(visualData.dataURL);
    
    return {
      image: compressedImage,
      description: description || 'Screenshot of selected elements for visual context',
      metadata: {
        originalWidth: visualData.width,
        originalHeight: visualData.height,
        elementCount: visualData.originalElements ? visualData.originalElements.length : 1,
        capturedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Generates cache key for element
   */
  generateCacheKey(element) {
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    
    return `${element.tagName}-${element.id || ''}-${element.className || ''}-${rect.width}x${rect.height}-${styles.backgroundColor}-${styles.color}`;
  }

  /**
   * Cleans up old cache entries
   */
  cleanupCache() {
    const now = Date.now();
    const timeout = this.config.performance.cacheTimeout;
    
    for (const [key, entry] of this.captureCache.entries()) {
      if (now - entry.timestamp > timeout) {
        this.captureCache.delete(key);
      }
    }
  }

  /**
   * Debounced capture to prevent rapid successive calls
   */
  async debouncedCapture(element, method = 'single') {
    const key = this.generateCacheKey(element);
    
    return new Promise((resolve) => {
      // Clear existing timer
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key));
      }
      
      // Set new timer
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key);
        
        try {
          let result;
          if (method === 'single') {
            result = await this.captureElementScreenshot(element);
          } else {
            result = await this.captureMultipleElements([element]);
          }
          resolve(result);
        } catch (error) {
          console.error('Debounced capture error:', error);
          resolve(null);
        }
      }, this.config.performance.captureDebounce);
      
      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Enables debug mode
   */
  enableDebug(level = 'info') {
    this.config.debug.enabled = true;
    this.config.debug.logLevel = level;
    console.log('🔍 Visual Context Debug Mode Enabled');
  }

  /**
   * Disables debug mode
   */
  disableDebug() {
    this.config.debug.enabled = false;
    console.log('Visual Context Debug Mode Disabled');
  }

  /**
   * Gets performance metrics
   */
  getPerformanceMetrics() {
    return {
      cacheSize: this.captureCache.size,
      activeTimers: this.debounceTimers.size,
      cacheHitRate: this.cacheHits / Math.max(this.cacheRequests, 1),
      averageCaptureTime: this.totalCaptureTime / Math.max(this.captureCount, 1)
    };
  }

  /**
   * Clears all caches and timers
   */
  cleanup() {
    this.captureCache.clear();
    
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    console.log('🧹 Visual Context Manager cleaned up');
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.debug.enabled) {
      console.log('Visual Context Config updated:', newConfig);
    }
  }

  /**
   * Gets current configuration
   */
  getConfig() {
    return { ...this.config };
  }
}

export default VisualContextManager;