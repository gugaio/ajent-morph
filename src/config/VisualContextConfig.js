/**
 * Configuration for Visual Context functionality
 */
const VisualContextConfig = {
  // Visual capture settings
  capture: {
    maxCanvasWidth: 300,
    maxCanvasHeight: 200,
    imageQuality: 0.8,
    scale: 0.5, // Reduce scale for better performance
    backgroundColor: '#ffffff',
    
    // html2canvas options
    html2canvasOptions: {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scale: 0.5,
      logging: false,
      windowWidth: 1920,
      windowHeight: 1080,
      // Optimize for performance
      removeContainer: true,
      async: true
    }
  },

  // UI settings
  ui: {
    showInChat: true,
    enableModal: true,
    enableHover: true,
    animationDuration: 200,
    
    // Canvas styling
    canvasStyles: {
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      cursor: 'pointer'
    },
    
    // Modal styling
    modalStyles: {
      background: 'rgba(0,0,0,0.8)',
      zIndex: 2147483648,
      animation: 'frontable-modal-fade-in 0.2s ease'
    }
  },

  // Command settings
  command: {
    imageCommand: '#image',
    caseSensitive: false,
    enableAutocomplete: true,
    enableSuggestions: true
  },

  // Performance settings
  performance: {
    // Debounce screenshot capture to prevent rapid successive calls
    captureDebounce: 500,
    
    // Cache captured screenshots for better performance
    enableCache: true,
    cacheTimeout: 30000, // 30 seconds
    
    // Compression settings for LLM transmission
    llmCompression: {
      maxSize: 512,
      quality: 0.7,
      format: 'jpeg'
    }
  },

  // Accessibility settings
  accessibility: {
    // Alt text for generated images
    generateAltText: true,
    
    // Keyboard navigation
    enableKeyboardNavigation: true,
    keyBindings: {
      closeModal: 'Escape',
      openModal: 'Enter'
    },
    
    // Screen reader support
    enableAriaLabels: true,
    announceCapture: true
  },

  // Debug settings
  debug: {
    enabled: false,
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    showTimings: false,
    saveDebugImages: false
  },

  // Feature flags
  features: {
    enableMultiElementCapture: true,
    enableHighlightOnCapture: true,
    enableProgressIndicator: true,
    enableErrorRecovery: true,
    enableBatchCapture: false // Future feature
  }
};

// Environment-specific overrides
if (typeof window !== 'undefined') {
  // Browser-specific optimizations
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Mobile optimizations
    VisualContextConfig.capture.maxCanvasWidth = 250;
    VisualContextConfig.capture.maxCanvasHeight = 150;
    VisualContextConfig.capture.scale = 0.4;
    VisualContextConfig.performance.captureDebounce = 750;
  }
  
  // Check if device supports WebGL for better canvas performance
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (gl) {
    VisualContextConfig.features.enableHardwareAcceleration = true;
  }
}

export default VisualContextConfig;