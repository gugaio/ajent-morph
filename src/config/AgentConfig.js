/**
 * Configuração central do Ajent Morph com todas as melhorias implementadas
 */
const AgentConfig = {
  // Sistema de reconhecimento de intenções
  intentionRecognition: {
    enabled: true,
    confidenceThreshold: 0.7,
    ambiguityThreshold: 0.3,
    maxHistorySize: 50,
    enableFallbacks: true
  },

  // Sistema de validação avançada
  validation: {
    enabled: true,
    proactiveCorrection: true,
    cacheTimeout: 300000, // 5 minutos
    enableSuggestions: true,
    strictMode: false,
    enableProjectPatterns: true
  },

  // Sistema de recuperação de erros
  errorRecovery: {
    enabled: true,
    maxRetries: 3,
    autoRecovery: true,
    enableLogging: true,
    alertThresholds: {
      sameErrorCount: 3,
      differentErrorsInShortTime: 5,
      timeWindow: 120000 // 2 minutos
    }
  },

  // Sistema de retry inteligente
  smartRetry: {
    enabled: true,
    adaptiveLearning: true,
    networkRetries: 5,
    domRetries: 3,
    cssRetries: 2,
    imageRetries: 4,
    scriptRetries: 2,
    baseDelays: {
      network: 1000,
      dom_manipulation: 500,
      css_validation: 100,
      image_generation: 2000,
      script_execution: 200
    }
  },

  // Sistema de acessibilidade
  accessibility: {
    enabled: true,
    realTimeAlerts: true,
    autoFix: true,
    contrastRatios: {
      AA_NORMAL: 4.5,
      AA_LARGE: 3.0,
      AAA_NORMAL: 7.0,
      AAA_LARGE: 4.5
    },
    enableVoiceAlerts: false,
    strictMode: false
  },

  // Sistema de planejamento de tarefas
  taskPlanning: {
    enabled: true,
    intelligentPlanning: true,
    dependencyTracking: true,
    timeEstimation: true,
    performanceLearning: true,
    visualProgress: true,
    templates: {
      form: true,
      navigation: true,
      dashboard: true,
      darkTheme: true,
      custom: true
    }
  },

  // Configurações de UI
  ui: {
    showProgressBars: true,
    showTimeEstimates: true,
    showAccessibilityAlerts: true,
    enableSoundAlerts: false,
    autoCollapseCompleted: true,
    showAdvancedMetrics: false,
    theme: 'auto' // auto, light, dark
  },

  // Performance e otimização
  performance: {
    enableCaching: true,
    cacheSize: 100,
    enableCompression: false,
    batchOperations: true,
    lazyLoading: true,
    enableProfiling: false
  },

  // Debugging e desenvolvimento
  debug: {
    enableLogging: true,
    logLevel: 'info', // error, warn, info, debug
    enableMetrics: true,
    enableProfiling: false,
    showInternalErrors: false,
    enableTracking: true
  },

  // Recursos experimentais
  experimental: {
    aiSuggestions: false,
    predictiveValidation: false,
    autoOptimization: false,
    voiceCommands: false,
    gestureRecognition: false
  }
};

/**
 * Configurações específicas por ambiente
 */
const EnvironmentConfigs = {
  development: {
    debug: {
      enableLogging: true,
      logLevel: 'debug',
      showInternalErrors: true,
      enableProfiling: true
    },
    validation: {
      strictMode: false
    },
    accessibility: {
      strictMode: false
    }
  },

  production: {
    debug: {
      enableLogging: true,
      logLevel: 'warn',
      showInternalErrors: false,
      enableProfiling: false
    },
    validation: {
      strictMode: true
    },
    accessibility: {
      strictMode: true
    },
    performance: {
      enableCompression: true,
      enableProfiling: false
    }
  },

  testing: {
    errorRecovery: {
      enabled: false // Para testes determinísticos
    },
    smartRetry: {
      enabled: false
    },
    debug: {
      enableLogging: false
    }
  }
};

/**
 * Aplica configuração baseada no ambiente
 */
function getEnvironmentConfig() {
  const env = typeof process !== 'undefined' && process.env.NODE_ENV || 'development';
  const baseConfig = { ...AgentConfig };
  const envOverrides = EnvironmentConfigs[env] || {};

  // Merge recursivo das configurações
  return mergeDeep(baseConfig, envOverrides);
}

/**
 * Merge profundo de objetos
 */
function mergeDeep(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Validador de configuração
 */
function validateConfig(config) {
  const errors = [];
  
  // Validações básicas
  if (config.smartRetry.enabled && config.smartRetry.baseDelays.network < 100) {
    errors.push('Network retry delay should be at least 100ms');
  }
  
  if (config.accessibility.enabled && config.accessibility.contrastRatios.AA_NORMAL < 4.5) {
    errors.push('AA contrast ratio should be at least 4.5:1');
  }
  
  if (config.errorRecovery.maxRetries > 10) {
    errors.push('Max retries should not exceed 10');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Configuração adaptativa baseada em capacidades do sistema
 */
function getAdaptiveConfig() {
  const config = getEnvironmentConfig();
  
  // Detecta capacidades do navegador/sistema
  if (typeof navigator !== 'undefined') {
    // Reduce features on low-end devices
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      config.performance.batchOperations = false;
      config.accessibility.realTimeAlerts = false;
      config.ui.showAdvancedMetrics = false;
    }
    
    // Disable sound on iOS Safari (autoplay restrictions)
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      config.ui.enableSoundAlerts = false;
    }
  }
  
  return config;
}

export {
  AgentConfig,
  EnvironmentConfigs,
  getEnvironmentConfig,
  getAdaptiveConfig,
  validateConfig,
  mergeDeep
};

export default getAdaptiveConfig();