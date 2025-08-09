/**
 * SmartRetrySystem - Sistema de retry inteligente com backoff exponencial
 * 
 * Implementa estratégias de retry adaptativos baseadas no tipo de erro,
 * histórico de sucesso e condições de rede/sistema
 */
class SmartRetrySystem {
  constructor() {
    // Configurações base de retry por tipo de operação
    this.retryConfigs = new Map([
      ['network', {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitter: true,
        retryCondition: (error) => this.isRetryableNetworkError(error)
      }],
      ['dom_manipulation', {
        maxRetries: 3,
        baseDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 1.5,
        jitter: false,
        retryCondition: (error) => this.isRetryableDOMError(error)
      }],
      ['css_validation', {
        maxRetries: 2,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitter: false,
        retryCondition: (error) => this.isRetryableCSSError(error)
      }],
      ['image_generation', {
        maxRetries: 4,
        baseDelay: 2000,
        maxDelay: 60000,
        backoffMultiplier: 2.5,
        jitter: true,
        retryCondition: (error) => this.isRetryableImageError(error)
      }],
      ['script_execution', {
        maxRetries: 2,
        baseDelay: 200,
        maxDelay: 2000,
        backoffMultiplier: 2,
        jitter: false,
        retryCondition: (error) => this.isRetryableScriptError(error)
      }]
    ]);

    // Histórico de tentativas para análise adaptativa
    this.retryHistory = new Map();
    this.successRates = new Map();
    
    // Detector de condições do sistema
    this.systemConditions = {
      networkLatency: 'normal', // normal, slow, very_slow
      systemLoad: 'normal', // normal, high, very_high
      errorRate: 'normal' // normal, elevated, high
    };

    // Timeout para limpeza de histórico (5 minutos)
    this.historyCleanupTimeout = 5 * 60 * 1000;
    
    // Inicia monitoramento adaptativo
    this.startAdaptiveMonitoring();
  }

  /**
   * Executa operação com retry inteligente
   * @param {Function} operation - Função que executa a operação
   * @param {string} operationType - Tipo da operação ('network', 'dom_manipulation', etc.)
   * @param {Object} context - Contexto adicional
   * @returns {Promise} Resultado da operação
   */
  async executeWithRetry(operation, operationType = 'dom_manipulation', context = {}) {
    const config = this.getAdaptiveConfig(operationType, context);
    const operationId = this.generateOperationId(operationType, context);

    let lastError = null;
    let attempt = 0;

    // Inicia tracking desta operação
    this.startOperationTracking(operationId, config);

    try {
      while (attempt < config.maxRetries) {
        attempt++;

        try {
          // Log tentativa
          console.log(`🔄 Retry System: Attempting ${operationType} (${attempt}/${config.maxRetries})`);
          
          // Executa operação com timeout adaptativo
          const timeoutMs = this.calculateTimeout(operationType, attempt);
          const result = await this.executeWithTimeout(operation, timeoutMs);
          
          // Sucesso - registra e retorna
          this.recordSuccess(operationId, attempt);
          return {
            success: true,
            result,
            attempts: attempt,
            totalTime: Date.now() - this.retryHistory.get(operationId).startTime
          };

        } catch (error) {
          lastError = error;
          
          // Verifica se deve tentar novamente
          if (!config.retryCondition(error)) {
            console.log(`🚫 Retry System: Error not retryable for ${operationType}:`, error.message);
            break;
          }

          // Se não é a última tentativa, espera antes do próximo retry
          if (attempt < config.maxRetries) {
            const delay = this.calculateDelay(config, attempt, operationType);
            console.log(`⏳ Retry System: Waiting ${delay}ms before attempt ${attempt + 1}`);
            await this.sleep(delay);
          }
        }
      }

      // Todas as tentativas falharam
      this.recordFailure(operationId, attempt, lastError);
      
      return {
        success: false,
        error: lastError,
        attempts: attempt,
        totalTime: Date.now() - this.retryHistory.get(operationId).startTime,
        message: `Operation failed after ${attempt} attempts: ${lastError.message}`
      };

    } catch (error) {
      // Erro inesperado no sistema de retry
      this.recordFailure(operationId, attempt, error);
      throw error;
    }
  }

  /**
   * Executa operação com timeout
   */
  async executeWithTimeout(operation, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Handle both sync and async operations
      Promise.resolve()
        .then(() => operation())
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Obtém configuração adaptativa baseada no histórico e condições do sistema
   */
  getAdaptiveConfig(operationType, context) {
    const baseConfig = { ...this.retryConfigs.get(operationType) };
    if (!baseConfig) {
      throw new Error(`Unknown operation type: ${operationType}`);
    }

    // Adapta baseado na taxa de sucesso histórica
    const successRate = this.getSuccessRate(operationType);
    if (successRate < 0.5) {
      baseConfig.maxRetries = Math.min(baseConfig.maxRetries + 2, 8);
      baseConfig.baseDelay *= 1.5;
    } else if (successRate > 0.9) {
      baseConfig.maxRetries = Math.max(baseConfig.maxRetries - 1, 1);
      baseConfig.baseDelay *= 0.8;
    }

    // Adapta baseado nas condições do sistema
    if (this.systemConditions.networkLatency === 'slow') {
      baseConfig.baseDelay *= 1.5;
      baseConfig.maxDelay *= 1.5;
    } else if (this.systemConditions.networkLatency === 'very_slow') {
      baseConfig.baseDelay *= 2;
      baseConfig.maxDelay *= 2;
    }

    if (this.systemConditions.systemLoad === 'high') {
      baseConfig.baseDelay *= 1.3;
    }

    // Adapta para operações de imagem em condições ruins
    if (operationType === 'image_generation' && 
        (this.systemConditions.networkLatency !== 'normal' || this.systemConditions.errorRate === 'high')) {
      baseConfig.maxRetries = Math.min(baseConfig.maxRetries + 2, 7);
      baseConfig.maxDelay = Math.min(baseConfig.maxDelay * 1.5, 120000); // Max 2 minutos
    }

    return baseConfig;
  }

  /**
   * Calcula delay para próxima tentativa
   */
  calculateDelay(config, attempt, operationType) {
    // Backoff exponencial
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Aplica limite máximo
    delay = Math.min(delay, config.maxDelay);
    
    // Adiciona jitter se habilitado (para evitar thundering herd)
    if (config.jitter) {
      const jitterAmount = delay * 0.1; // 10% de variação
      delay += (Math.random() - 0.5) * jitterAmount;
    }

    // Ajustes específicos por tipo
    switch (operationType) {
    case 'network':
      // Para erros de rede, aumenta o delay se a latência é alta
      if (this.systemConditions.networkLatency === 'very_slow') {
        delay *= 1.8;
      }
      break;
      
    case 'image_generation':
      // Para geração de imagem, delay maior em condições ruins
      if (this.systemConditions.errorRate === 'high') {
        delay *= 1.5;
      }
      break;
    }

    return Math.round(delay);
  }

  /**
   * Calcula timeout adaptativo para operação
   */
  calculateTimeout(operationType, attempt) {
    const baseTimeouts = {
      'network': 10000, // 10s
      'dom_manipulation': 5000, // 5s
      'css_validation': 2000, // 2s
      'image_generation': 45000, // 45s
      'script_execution': 8000 // 8s
    };

    let timeout = baseTimeouts[operationType] || 5000;
    
    // Aumenta timeout com tentativas (operações podem precisar de mais tempo)
    timeout *= Math.min(1 + (attempt - 1) * 0.3, 2.5);
    
    // Ajusta baseado nas condições do sistema
    if (this.systemConditions.networkLatency === 'slow') {
      timeout *= 1.5;
    } else if (this.systemConditions.networkLatency === 'very_slow') {
      timeout *= 2.5;
    }

    return Math.round(timeout);
  }

  /**
   * Condições de retry por tipo de erro
   */
  
  isRetryableNetworkError(error) {
    const retryablePatterns = [
      /timeout/i,
      /network error/i,
      /failed to fetch/i,
      /connection.*reset/i,
      /temporary.*failure/i,
      /service.*unavailable/i,
      /502|503|504|408|429/i // HTTP status codes
    ];

    return retryablePatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    );
  }

  isRetryableDOMError(error) {
    const retryablePatterns = [
      /element.*not.*found/i,
      /cannot.*read.*property/i,
      /node.*not.*attached/i,
      /element.*stale/i
    ];

    // DOM errors são retryáveis apenas se podem ser transitórios
    return retryablePatterns.some(pattern => 
      pattern.test(error.message)
    );
  }

  isRetryableCSSError(error) {
    // CSS errors raramente são retryáveis, apenas em casos específicos
    const retryablePatterns = [
      /computation.*failed/i,
      /style.*not.*applied/i,
      /function/i, // Para erros de função não encontrada
      /not.*a.*function/i,
      /undefined.*is.*not.*a.*function/i,
      /temporary.*error/i,
      /loading.*error/i
    ];

    // Padrões que NÃO devem ser retriados
    const nonRetryablePatterns = [
      /CSS Validation Failed.*Propriedade CSS desconhecida/i,
      /gridTemplateColumns/i, // Grid properties should not be retried
      /Invalid styles parameter/i,
      /contraste insuficiente/i, // Accessibility issues shouldn't trigger retries
      /accessibility/i,
      /Maximum recursion depth/i
    ];

    const message = error.message || error.toString();
    const name = error.name || '';
    
    // Se o erro corresponde a um padrão não-retriável, não retry
    if (nonRetryablePatterns.some(pattern => pattern.test(message) || pattern.test(name))) {
      return false;
    }
    
    return retryablePatterns.some(pattern => 
      pattern.test(message) || pattern.test(name)
    );
  }

  isRetryableImageError(error) {
    const retryablePatterns = [
      /timeout/i,
      /network error/i,
      /service.*unavailable/i,
      /rate.*limit/i,
      /temporary.*error/i,
      /server.*error/i,
      /502|503|504|429/i
    ];

    return retryablePatterns.some(pattern => 
      pattern.test(error.message)
    );
  }

  isRetryableScriptError(error) {
    const retryablePatterns = [
      /timing.*error/i,
      /resource.*loading/i,
      /temporary/i
    ];

    // Scripts errors geralmente não são retryáveis
    return retryablePatterns.some(pattern => 
      pattern.test(error.message)
    );
  }

  /**
   * Tracking e análise
   */
  
  generateOperationId(operationType, context) {
    const timestamp = Date.now();
    const contextHash = this.hashObject(context);
    return `${operationType}_${contextHash}_${timestamp}`;
  }

  startOperationTracking(operationId, config) {
    this.retryHistory.set(operationId, {
      startTime: Date.now(),
      config: config,
      attempts: [],
      completed: false
    });
  }

  recordSuccess(operationId, attempts) {
    const history = this.retryHistory.get(operationId);
    if (history) {
      history.completed = true;
      history.success = true;
      history.finalAttempts = attempts;
      
      // Atualiza taxa de sucesso global
      this.updateSuccessRate(operationId, true);
    }
  }

  recordFailure(operationId, attempts, error) {
    const history = this.retryHistory.get(operationId);
    if (history) {
      history.completed = true;
      history.success = false;
      history.finalAttempts = attempts;
      history.finalError = error;
      
      // Atualiza taxa de sucesso global
      this.updateSuccessRate(operationId, false);
    }
  }

  updateSuccessRate(operationId, success) {
    const operationType = operationId.split('_')[0];
    
    if (!this.successRates.has(operationType)) {
      this.successRates.set(operationType, { successes: 0, total: 0 });
    }

    const stats = this.successRates.get(operationType);
    stats.total++;
    if (success) stats.successes++;

    // Limita histórico para evitar dados muito antigos
    if (stats.total > 100) {
      stats.successes = Math.round(stats.successes * 0.9);
      stats.total = Math.round(stats.total * 0.9);
    }
  }

  getSuccessRate(operationType) {
    const stats = this.successRates.get(operationType);
    if (!stats || stats.total === 0) return 0.5; // Assume neutro sem dados
    return stats.successes / stats.total;
  }

  /**
   * Monitoramento adaptativo do sistema
   */
  
  startAdaptiveMonitoring() {
    // Monitora condições a cada minuto
    setInterval(() => {
      this.updateSystemConditions();
    }, 60000);

    // Limpa histórico antigo a cada 5 minutos
    setInterval(() => {
      this.cleanupOldHistory();
    }, this.historyCleanupTimeout);
  }

  updateSystemConditions() {
    // Estima latência baseada em operações recentes
    this.estimateNetworkLatency();
    
    // Calcula taxa de erro recente
    this.calculateRecentErrorRate();
    
    console.log('📊 Retry System Conditions:', this.systemConditions);
  }

  estimateNetworkLatency() {
    const recentNetworkOps = Array.from(this.retryHistory.values())
      .filter(op => op.config && op.completed && Date.now() - op.startTime < 300000) // Últimos 5 minutos
      .filter(op => op.config === this.retryConfigs.get('network'));

    if (recentNetworkOps.length === 0) {
      this.systemConditions.networkLatency = 'normal';
      return;
    }

    const avgTime = recentNetworkOps.reduce((sum, op) => 
      sum + (Date.now() - op.startTime), 0) / recentNetworkOps.length;

    if (avgTime > 10000) {
      this.systemConditions.networkLatency = 'very_slow';
    } else if (avgTime > 5000) {
      this.systemConditions.networkLatency = 'slow';
    } else {
      this.systemConditions.networkLatency = 'normal';
    }
  }

  calculateRecentErrorRate() {
    const recentOps = Array.from(this.retryHistory.values())
      .filter(op => op.completed && Date.now() - op.startTime < 300000); // Últimos 5 minutos

    if (recentOps.length === 0) {
      this.systemConditions.errorRate = 'normal';
      return;
    }

    const errorRate = recentOps.filter(op => !op.success).length / recentOps.length;

    if (errorRate > 0.5) {
      this.systemConditions.errorRate = 'high';
    } else if (errorRate > 0.2) {
      this.systemConditions.errorRate = 'elevated';
    } else {
      this.systemConditions.errorRate = 'normal';
    }
  }

  cleanupOldHistory() {
    const cutoff = Date.now() - this.historyCleanupTimeout;
    
    for (const [id, history] of this.retryHistory.entries()) {
      if (history.startTime < cutoff) {
        this.retryHistory.delete(id);
      }
    }
  }

  /**
   * Utilitários
   */
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  hashObject(obj) {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * API pública para insights e debugging
   */
  
  getRetryStats() {
    const stats = {
      successRates: Object.fromEntries(this.successRates),
      systemConditions: { ...this.systemConditions },
      activeOperations: this.retryHistory.size,
      recentOperations: Array.from(this.retryHistory.values())
        .filter(op => Date.now() - op.startTime < 300000).length
    };

    return stats;
  }

  resetStats() {
    this.successRates.clear();
    this.retryHistory.clear();
    this.systemConditions = {
      networkLatency: 'normal',
      systemLoad: 'normal',
      errorRate: 'normal'
    };
  }

  /**
   * Configuração dinâmica
   */
  
  updateRetryConfig(operationType, config) {
    if (this.retryConfigs.has(operationType)) {
      this.retryConfigs.set(operationType, { 
        ...this.retryConfigs.get(operationType), 
        ...config 
      });
    }
  }

  getRetryConfig(operationType) {
    return { ...this.retryConfigs.get(operationType) };
  }
}

export default SmartRetrySystem;