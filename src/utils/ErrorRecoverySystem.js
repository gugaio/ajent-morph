/**
 * ErrorRecoverySystem - Sistema de recuperação de erros e mensagens claras
 * 
 * Lida com falhas de forma inteligente, oferece recuperação automática
 * e gera mensagens de erro compreensíveis para o usuário
 */
class ErrorRecoverySystem {
  constructor() {
    // Histórico de erros para análise de padrões
    this.errorHistory = [];
    this.maxHistorySize = 100;

    // Estratégias de recuperação por tipo de erro
    this.recoveryStrategies = new Map([
      ['ELEMENT_NOT_FOUND', this.handleElementNotFound.bind(this)],
      ['INVALID_SELECTOR', this.handleInvalidSelector.bind(this)],
      ['CSS_VALIDATION_ERROR', this.handleCSSValidationError.bind(this)],
      ['NETWORK_ERROR', this.handleNetworkError.bind(this)],
      ['PERMISSION_ERROR', this.handlePermissionError.bind(this)],
      ['SCRIPT_EXECUTION_ERROR', this.handleScriptExecutionError.bind(this)],
      ['IMAGE_GENERATION_ERROR', this.handleImageGenerationError.bind(this)],
      ['TIMEOUT_ERROR', this.handleTimeoutError.bind(this)],
      ['SERIALIZATION_ERROR', this.handleSerializationError.bind(this)]
    ]);

    // Mapeamento de erros comuns para tipos conhecidos
    this.errorPatterns = [
      {
        pattern: /cannot read propert/i,
        type: 'ELEMENT_NOT_FOUND',
        userMessage: 'O elemento que você tentou modificar não foi encontrado ou não existe mais.'
      },
      {
        pattern: /invalid.*selector/i,
        type: 'INVALID_SELECTOR',
        userMessage: 'O seletor CSS usado para encontrar o elemento não é válido.'
      },
      {
        pattern: /network.*error|fetch.*failed/i,
        type: 'NETWORK_ERROR',
        userMessage: 'Problema de conexão. Verifique sua internet e tente novamente.'
      },
      {
        pattern: /permission.*denied|not.*allowed/i,
        type: 'PERMISSION_ERROR',
        userMessage: 'Não tenho permissão para executar esta ação. Verifique as configurações do navegador.'
      },
      {
        pattern: /timeout|timed.*out/i,
        type: 'TIMEOUT_ERROR',
        userMessage: 'A operação demorou muito para completar. Tente novamente ou simplifique o comando.'
      },
      {
        pattern: /json.*parse|unexpected.*token/i,
        type: 'SERIALIZATION_ERROR',
        userMessage: 'Erro ao processar dados. Por favor, tente reformular seu comando.'
      }
    ];

    // Contadores para controle de retry
    this.retryCounters = new Map();
    this.maxRetries = 3;

    // Sistema de alertas para padrões de erro
    this.alertThresholds = {
      sameErrorCount: 3, // Mesmo erro 3 vezes
      differentErrorsInShortTime: 5, // 5 erros diferentes em 2 minutos
      timeWindow: 2 * 60 * 1000 // 2 minutos
    };
  }

  /**
   * Ponto de entrada principal para tratamento de erros
   * @param {Error} error - Erro capturado
   * @param {Object} context - Contexto da operação que falhou
   * @returns {Object} Resultado da recuperação
   */
  async handleError(error, context = {}) {
    // Registra o erro no histórico
    const errorEntry = this.logError(error, context);

    // Identifica o tipo de erro
    const errorType = this.identifyErrorType(error);

    // Verifica se deve tentar recuperação automática
    const shouldRecover = this.shouldAttemptRecovery(errorType, context);

    let recoveryResult = {
      success: false,
      userMessage: this.generateUserFriendlyMessage(error, errorType),
      technicalMessage: error.message,
      errorType: errorType,
      canRetry: shouldRecover,
      suggestions: [],
      recoveryAttempted: false
    };

    // Tenta recuperação automática se apropriado
    if (shouldRecover) {
      try {
        recoveryResult = await this.attemptRecovery(errorType, error, context);
      } catch (recoveryError) {
        console.error('Recovery attempt failed:', recoveryError);
        recoveryResult.userMessage = 'Tentativa de recuperação falhou. ' + recoveryResult.userMessage;
      }
    }

    // Adiciona sugestões baseadas no contexto
    recoveryResult.suggestions = this.generateSuggestions(errorType, error, context);

    // Verifica se precisa alertar sobre padrões de erro
    this.checkForErrorPatterns();

    return recoveryResult;
  }

  /**
   * Registra erro no histórico para análise
   */
  logError(error, context) {
    const errorEntry = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context: { ...context },
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errorHistory.push(errorEntry);

    // Limita tamanho do histórico
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Log detalhado para desenvolvimento
    console.group('🚨 Error Recovery System');
    console.error('Error:', error);
    console.log('Context:', context);
    console.log('Timestamp:', new Date(errorEntry.timestamp).toLocaleString());
    console.groupEnd();

    return errorEntry;
  }

  /**
   * Identifica o tipo de erro usando padrões conhecidos
   */
  identifyErrorType(error) {
    const errorMessage = error.message.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';

    // Verifica padrões conhecidos
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(errorMessage) || pattern.pattern.test(errorStack)) {
        return pattern.type;
      }
    }

    // Tipos específicos por nome do erro
    switch (error.name) {
      case 'TypeError':
        return 'ELEMENT_NOT_FOUND';
      case 'SyntaxError':
        return 'SERIALIZATION_ERROR';
      case 'NetworkError':
        return 'NETWORK_ERROR';
      case 'TimeoutError':
        return 'TIMEOUT_ERROR';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Determina se deve tentar recuperação automática
   */
  shouldAttemptRecovery(errorType, context) {
    // Não tenta recuperar erros de permissão
    if (errorType === 'PERMISSION_ERROR') {
      return false;
    }

    // Verifica se já tentou muitas vezes
    const retryKey = `${errorType}_${context.operation || 'unknown'}`;
    const currentRetries = this.retryCounters.get(retryKey) || 0;
    
    if (currentRetries >= this.maxRetries) {
      return false;
    }

    return this.recoveryStrategies.has(errorType);
  }

  /**
   * Tenta recuperar do erro usando estratégia específica
   */
  async attemptRecovery(errorType, error, context) {
    const retryKey = `${errorType}_${context.operation || 'unknown'}`;
    const currentRetries = this.retryCounters.get(retryKey) || 0;
    
    // Incrementa contador
    this.retryCounters.set(retryKey, currentRetries + 1);

    console.log(`🔄 Attempting recovery for ${errorType} (attempt ${currentRetries + 1}/${this.maxRetries})`);

    const strategy = this.recoveryStrategies.get(errorType);
    if (!strategy) {
      throw new Error(`No recovery strategy found for ${errorType}`);
    }

    const result = await strategy(error, context, currentRetries + 1);
    
    // Se a recuperação foi bem-sucedida, zera o contador
    if (result.success) {
      this.retryCounters.delete(retryKey);
    }

    return {
      ...result,
      recoveryAttempted: true,
      attempt: currentRetries + 1
    };
  }

  /**
   * Estratégia: Elemento não encontrado
   */
  async handleElementNotFound(error, context, attempt) {
    const { elementSelectors, originalCommand } = context;

    if (!elementSelectors || elementSelectors.length === 0) {
      return {
        success: false,
        userMessage: '⚠️ Nenhum elemento foi selecionado. Selecione um elemento na página primeiro.',
        suggestions: ['Clique em um elemento na página para selecioná-lo', 'Use Shift+Click para selecionar múltiplos elementos']
      };
    }

    // Tenta encontrar elementos alternativos
    const alternativeElements = await this.findAlternativeElements(elementSelectors);
    
    if (alternativeElements.length > 0) {
      return {
        success: true,
        userMessage: `✅ Encontrei ${alternativeElements.length} elemento(s) similar(es) e apliquei as mudanças.`,
        newElements: alternativeElements,
        suggestions: ['Verifique se o resultado está correto', 'Se não estiver, tente selecionar elementos mais específicos']
      };
    }

    return {
      success: false,
      userMessage: `❌ O elemento "${elementSelectors.join(', ')}" não foi encontrado na página. Pode ter sido removido ou modificado.`,
      suggestions: [
        'Recarregue a página e tente novamente',
        'Selecione o elemento novamente',
        'Verifique se o elemento ainda existe na página'
      ]
    };
  }

  /**
   * Estratégia: Seletor CSS inválido
   */
  async handleInvalidSelector(error, context, attempt) {
    const { elementSelectors } = context;

    if (!elementSelectors) {
      return {
        success: false,
        userMessage: '❌ Seletor CSS inválido. Tente selecionar elementos manualmente.',
        suggestions: ['Clique nos elementos que deseja modificar']
      };
    }

    // Tenta corrigir seletores comuns
    const correctedSelectors = elementSelectors.map(selector => {
      return this.correctSelector(selector);
    }).filter(Boolean);

    if (correctedSelectors.length > 0) {
      const elements = [];
      for (const selector of correctedSelectors) {
        try {
          const found = document.querySelectorAll(selector);
          elements.push(...found);
        } catch (e) {
          continue;
        }
      }

      if (elements.length > 0) {
        return {
          success: true,
          userMessage: `✅ Corrigi os seletores e encontrei ${elements.length} elemento(s).`,
          newElements: elements,
          correctedSelectors
        };
      }
    }

    return {
      success: false,
      userMessage: '❌ Não consegui corrigir o seletor CSS. Selecione os elementos manualmente.',
      suggestions: ['Clique nos elementos desejados', 'Use seletores CSS mais simples como #id ou .class']
    };
  }

  /**
   * Estratégia: Erro de validação CSS
   */
  async handleCSSValidationError(error, context, attempt) {
    const { styles, command } = context;

    // Tenta extrair estilos válidos do comando
    const extractedStyles = this.extractStylesFromCommand(command);
    
    if (Object.keys(extractedStyles).length > 0) {
      return {
        success: true,
        userMessage: '✅ Corrigi os estilos CSS e apliquei as mudanças.',
        correctedStyles: extractedStyles,
        suggestions: ['Verifique se o resultado está como esperado']
      };
    }

    return {
      success: false,
      userMessage: '❌ Não consegui identificar estilos CSS válidos no comando.',
      suggestions: [
        'Use comandos mais específicos como "deixar azul" ou "fonte maior"',
        'Especifique cores como "azul", "vermelho" ou códigos hex como "#ff0000"'
      ]
    };
  }

  /**
   * Estratégia: Erro de rede
   */
  async handleNetworkError(error, context, attempt) {
    // Espera antes de tentar novamente
    const delay = Math.min(1000 * attempt, 5000); // Max 5 segundos
    await this.sleep(delay);

    return {
      success: false, // Deixa para o retry automático
      userMessage: `🌐 Erro de conexão (tentativa ${attempt}). Verificando conectividade...`,
      suggestions: [
        'Verifique sua conexão com a internet',
        'Tente novamente em alguns segundos',
        'Use comandos offline quando possível'
      ],
      retryAfter: delay
    };
  }

  /**
   * Estratégia: Erro de permissão
   */
  async handlePermissionError(error, context, attempt) {
    return {
      success: false,
      userMessage: '🔒 Esta ação não é permitida pelo navegador por questões de segurança.',
      suggestions: [
        'Verifique se o site permite modificações',
        'Alguns recursos podem estar bloqueados em sites externos',
        'Tente usar em páginas locais ou de desenvolvimento'
      ]
    };
  }

  /**
   * Estratégia: Erro de execução de script
   */
  async handleScriptExecutionError(error, context, attempt) {
    const { code } = context;

    // Tenta simplificar o código
    const simplifiedCode = this.simplifyJavaScript(code);
    
    if (simplifiedCode && simplifiedCode !== code) {
      return {
        success: true,
        userMessage: '✅ Simplifiquei o código JavaScript e executei com sucesso.',
        simplifiedCode,
        suggestions: ['Código simplificado pode ter funcionalidade reduzida']
      };
    }

    return {
      success: false,
      userMessage: '❌ Erro na execução do JavaScript. Código pode ter sintaxe inválida.',
      suggestions: [
        'Verifique a sintaxe do JavaScript',
        'Use comandos mais simples',
        'Evite código complexo ou com dependências externas'
      ]
    };
  }

  /**
   * Estratégia: Erro de geração de imagem
   */
  async handleImageGenerationError(error, context, attempt) {
    const { prompt } = context;

    // Tenta simplificar o prompt
    const simplifiedPrompt = this.simplifyImagePrompt(prompt);
    
    if (simplifiedPrompt !== prompt) {
      return {
        success: false, // Deixa para retry com prompt simplificado
        userMessage: `🎨 Tentando novamente com prompt simplificado: "${simplifiedPrompt}"`,
        simplifiedPrompt,
        suggestions: ['Prompts mais simples tendem a funcionar melhor']
      };
    }

    return {
      success: false,
      userMessage: '🎨 Erro na geração da imagem. Serviço pode estar indisponível.',
      suggestions: [
        'Tente um prompt mais simples e descritivo',
        'Verifique a conexão com a internet',
        'Use imagens existentes como alternativa'
      ]
    };
  }

  /**
   * Estratégia: Timeout
   */
  async handleTimeoutError(error, context, attempt) {
    return {
      success: false,
      userMessage: '⏱️ A operação demorou muito para completar.',
      suggestions: [
        'Tente comandos mais simples',
        'Reduza o número de elementos selecionados',
        'Verifique a conexão com a internet'
      ]
    };
  }

  /**
   * Estratégia: Erro de serialização
   */
  async handleSerializationError(error, context, attempt) {
    const { command } = context;

    // Tenta limpar o comando
    const cleanCommand = command?.replace(/[^\w\s\-\.#]/g, ' ').trim();
    
    if (cleanCommand && cleanCommand !== command) {
      return {
        success: true,
        userMessage: '✅ Limpei caracteres especiais do comando e processeis com sucesso.',
        cleanedCommand: cleanCommand,
        suggestions: ['Evite caracteres especiais em comandos']
      };
    }

    return {
      success: false,
      userMessage: '❌ Erro ao processar o comando. Contém caracteres inválidos.',
      suggestions: [
        'Use apenas letras, números e espaços',
        'Evite caracteres especiais como @#$%',
        'Reformule o comando de forma mais simples'
      ]
    };
  }

  /**
   * Utilitários de recuperação
   */
  
  async findAlternativeElements(selectors) {
    const alternatives = [];
    
    for (const selector of selectors) {
      // Tenta variações do seletor
      const variations = this.generateSelectorVariations(selector);
      
      for (const variation of variations) {
        try {
          const elements = document.querySelectorAll(variation);
          if (elements.length > 0) {
            alternatives.push(...elements);
            break; // Para na primeira variação que funciona
          }
        } catch (e) {
          continue;
        }
      }
    }

    return [...new Set(alternatives)]; // Remove duplicatas
  }

  generateSelectorVariations(selector) {
    const variations = [selector];

    // Se tem ID, tenta só o ID
    if (selector.includes('#')) {
      const idPart = selector.split('#')[1]?.split(/[\s.]/)[0];
      if (idPart) {
        variations.push(`#${idPart}`);
      }
    }

    // Se tem classes, tenta diferentes combinações
    if (selector.includes('.')) {
      const classes = selector.match(/\.[a-zA-Z0-9_-]+/g);
      if (classes && classes.length > 1) {
        // Tenta primeira classe apenas
        variations.push(classes[0]);
        // Tenta últimas duas classes
        if (classes.length >= 2) {
          variations.push(classes.slice(-2).join(''));
        }
      }
    }

    // Tenta tag apenas
    const tagMatch = selector.match(/^[a-zA-Z][a-zA-Z0-9]*(?=[.#\s]|$)/);
    if (tagMatch) {
      variations.push(tagMatch[0]);
    }

    return variations;
  }

  correctSelector(selector) {
    // Correções comuns de seletores
    const corrections = {
      '..': '.',
      '##': '#',
      ' .': ' .',
      ' #': ' #'
    };

    let corrected = selector;
    Object.entries(corrections).forEach(([wrong, right]) => {
      corrected = corrected.replace(new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), right);
    });

    return corrected;
  }

  extractStylesFromCommand(command) {
    if (!command) return {};

    const styles = {};
    
    // Padrões simples para extrair estilos
    const patterns = [
      { pattern: /(?:cor|color)\s+(\w+)/i, property: 'color' },
      { pattern: /(?:fundo|background)\s+(\w+)/i, property: 'backgroundColor' },
      { pattern: /(?:fonte|font)\s+(?:maior|bigger)/i, property: 'fontSize', value: '1.2em' },
      { pattern: /(?:fonte|font)\s+(?:menor|smaller)/i, property: 'fontSize', value: '0.9em' },
      { pattern: /(?:azul|blue)/i, property: 'color', value: 'blue' },
      { pattern: /(?:vermelho|red)/i, property: 'color', value: 'red' },
      { pattern: /(?:verde|green)/i, property: 'color', value: 'green' }
    ];

    patterns.forEach(({ pattern, property, value }) => {
      const match = command.match(pattern);
      if (match) {
        styles[property] = value || match[1];
      }
    });

    return styles;
  }

  simplifyJavaScript(code) {
    if (!code) return code;

    // Remove comentários e espaços desnecessários
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários de bloco
      .replace(/\/\/.*$/gm, '') // Remove comentários de linha
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }

  simplifyImagePrompt(prompt) {
    if (!prompt) return prompt;

    // Remove palavras complexas e mantém só o essencial
    return prompt
      .replace(/\b(high-quality|ultra-detailed|photorealistic|4k|hd)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50); // Limita tamanho
  }

  generateUserFriendlyMessage(error, errorType) {
    // Encontra mensagem personalizada
    const pattern = this.errorPatterns.find(p => p.type === errorType);
    if (pattern) {
      return pattern.userMessage;
    }

    // Mensagens padrão por tipo
    const defaultMessages = {
      'ELEMENT_NOT_FOUND': 'O elemento que você tentou modificar não foi encontrado.',
      'INVALID_SELECTOR': 'Houve um problema ao localizar o elemento na página.',
      'CSS_VALIDATION_ERROR': 'Os estilos CSS fornecidos não são válidos.',
      'NETWORK_ERROR': 'Problema de conexão. Verifique sua internet.',
      'PERMISSION_ERROR': 'Esta ação não é permitida pelo navegador.',
      'SCRIPT_EXECUTION_ERROR': 'Erro na execução do código JavaScript.',
      'IMAGE_GENERATION_ERROR': 'Erro ao gerar a imagem solicitada.',
      'TIMEOUT_ERROR': 'A operação demorou muito para completar.',
      'SERIALIZATION_ERROR': 'Erro ao processar os dados fornecidos.',
      'UNKNOWN_ERROR': 'Ocorreu um erro inesperado.'
    };

    return defaultMessages[errorType] || 'Ocorreu um erro inesperado.';
  }

  generateSuggestions(errorType, error, context) {
    const suggestions = [];

    // Sugestões gerais por tipo de erro
    const typeSuggestions = {
      'ELEMENT_NOT_FOUND': [
        'Selecione novamente o elemento na página',
        'Verifique se o elemento ainda existe',
        'Recarregue a página se necessário'
      ],
      'CSS_VALIDATION_ERROR': [
        'Use cores simples como "azul", "vermelho"',
        'Para tamanhos, especifique unidades: "16px", "1em"',
        'Verifique a sintaxe dos estilos CSS'
      ],
      'NETWORK_ERROR': [
        'Verifique sua conexão com a internet',
        'Aguarde alguns segundos e tente novamente',
        'Use funcionalidades offline quando possível'
      ]
    };

    if (typeSuggestions[errorType]) {
      suggestions.push(...typeSuggestions[errorType]);
    }

    // Sugestões baseadas no contexto
    if (context.command && context.command.length < 5) {
      suggestions.push('Tente usar comandos mais descritivos');
    }

    if (context.elementSelectors && context.elementSelectors.length === 0) {
      suggestions.push('Selecione pelo menos um elemento na página');
    }

    return suggestions;
  }

  checkForErrorPatterns() {
    const recentErrors = this.errorHistory.slice(-10);
    const now = Date.now();

    // Verifica mesmo erro repetido
    const errorCounts = new Map();
    recentErrors.forEach(error => {
      const key = error.message;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });

    errorCounts.forEach((count, errorMessage) => {
      if (count >= this.alertThresholds.sameErrorCount) {
        console.warn(`🚨 Pattern Alert: Same error occurred ${count} times: ${errorMessage}`);
      }
    });

    // Verifica muitos erros diferentes em pouco tempo
    const recentErrorsInWindow = recentErrors.filter(
      error => now - error.timestamp < this.alertThresholds.timeWindow
    );

    if (recentErrorsInWindow.length >= this.alertThresholds.differentErrorsInShortTime) {
      console.warn(`🚨 Pattern Alert: ${recentErrorsInWindow.length} errors in ${this.alertThresholds.timeWindow / 1000} seconds`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Métodos para análise e relatórios
   */
  
  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byType: {},
      byTimeWindow: {},
      mostCommon: null
    };

    // Agrupa por tipo
    this.errorHistory.forEach(error => {
      const type = this.identifyErrorType({ message: error.message });
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    // Encontra mais comum
    const maxCount = Math.max(...Object.values(stats.byType));
    stats.mostCommon = Object.entries(stats.byType)
      .find(([, count]) => count === maxCount)?.[0];

    return stats;
  }

  clearErrorHistory() {
    this.errorHistory = [];
    this.retryCounters.clear();
  }
}

export default ErrorRecoverySystem;