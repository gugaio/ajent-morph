/**
 * IntentionClassifier - Sistema de reconhecimento de intenções ambíguas
 * 
 * Analisa comandos do usuário para determinar a intenção correta antes da execução
 * Evita ações incorretas e melhora a precisão do agente
 */
class IntentionClassifier {
  constructor() {
    // Palavras-chave ponderadas para cada tipo de intenção
    this.intentionPatterns = {
      // Modificação de estilos existentes
      modify: {
        keywords: [
          'mudar', 'alterar', 'modificar', 'trocar', 'deixar', 'fazer', 'tornar',
          'change', 'alter', 'modify', 'make', 'turn', 'set',
          'cor', 'color', 'tamanho', 'size', 'fonte', 'font',
          'azul', 'vermelho', 'verde', 'blue', 'red', 'green', 
          'maior', 'menor', 'bigger', 'smaller', 'larger'
        ],
        weight: 1.0,
        negativeKeywords: ['criar', 'adicionar', 'novo', 'create', 'add', 'new']
      },

      // Criação de novos elementos
      create: {
        keywords: [
          'criar', 'adicionar', 'inserir', 'novo', 'gerar',
          'create', 'add', 'insert', 'new', 'generate',
          'botão', 'button', 'div', 'elemento', 'element',
          'card', 'menu', 'formulário', 'form'
        ],
        weight: 1.2,
        negativeKeywords: ['mudar', 'alterar', 'modificar', 'change', 'alter', 'modify']
      },

      // Substituição (replace mode)
      replace: {
        keywords: [
          'substituir', 'trocar', 'substituir por', 'mudar para',
          'replace', 'swap', 'change to', 'substitute',
          'em vez de', 'instead of', 'ao invés de'
        ],
        weight: 1.5,
        negativeKeywords: []
      },

      // Adição de comportamento
      addBehavior: {
        keywords: [
          'adicionar comportamento', 'add behavior', 'clique', 'click',
          'hover', 'passar mouse', 'evento', 'event', 'interativo',
          'interactive', 'funcionalidade', 'functionality'
        ],
        weight: 1.3,
        negativeKeywords: []
      },

      // Criação interativa
      createInteractive: {
        keywords: [
          'formulário', 'form', 'botão que', 'button that',
          'contador', 'counter', 'validação', 'validation',
          'javascript', 'script', 'funcional', 'functional'
        ],
        weight: 1.4,
        negativeKeywords: []
      },

      // Geração de imagens
      generateImage: {
        keywords: [
          'imagem', 'image', 'foto', 'photo', 'gerar imagem', 'generate image',
          'criar imagem', 'create image', 'background', 'fundo',
          'paisagem', 'landscape', 'gato', 'cat'
        ],
        weight: 1.6,
        negativeKeywords: []
      },

      // Solicitação de informações
      information: {
        keywords: [
          'qual', 'what', 'como', 'how', 'me diga', 'tell me',
          'mostrar', 'show', 'analisar', 'analyze', 'detalhar', 'detail',
          'cor atual', 'current color', 'estilo atual', 'current style'
        ],
        weight: 1.1,
        negativeKeywords: ['fazer', 'criar', 'mudar', 'make', 'create', 'change']
      },

      // Remoção de elementos
      delete: {
        keywords: [
          'remover', 'deletar', 'apagar', 'excluir',
          'remove', 'delete', 'clear', 'eliminate'
        ],
        weight: 1.5,
        negativeKeywords: []
      }
    };

    // Histórico de contexto para melhorar classificação
    this.contextHistory = [];
    this.maxHistorySize = 10;

    // Padrões de ambiguidade conhecidos
    this.ambiguityPatterns = [
      {
        pattern: /mudar.*para/i,
        possibleIntentions: ['modify', 'replace'],
        disambiguationQuestions: [
          'Você quer modificar a propriedade do elemento existente ou substituir o elemento inteiro?'
        ]
      },
      {
        pattern: /criar.*similar/i,
        possibleIntentions: ['create', 'modify'],
        disambiguationQuestions: [
          'Você quer criar um novo elemento ou modificar o existente para ficar similar?'
        ]
      }
    ];
  }

  /**
   * Classifica a intenção de um comando do usuário
   * @param {string} command - Comando do usuário
   * @param {Array} selectedElements - Elementos selecionados (contexto)
   * @param {Object} previousContext - Contexto da interação anterior
   * @returns {Object} Resultado da classificação
   */
  classifyIntention(command, selectedElements = [], previousContext = {}) {
    const normalizedCommand = command.toLowerCase().trim();
    
    // Verifica se é uma pergunta/solicitação de informação
    if (this.isInformationRequest(normalizedCommand)) {
      return {
        intention: 'information',
        confidence: 0.9,
        reasoning: 'Comando identificado como solicitação de informação',
        ambiguous: false
      };
    }

    // Calcula pontuação para cada intenção
    const scores = {};
    Object.entries(this.intentionPatterns).forEach(([intention, pattern]) => {
      scores[intention] = this.calculateIntentionScore(
        normalizedCommand, 
        pattern, 
        selectedElements, 
        previousContext
      );
    });

    // Encontra a intenção com maior pontuação
    const sortedScores = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)
      .filter(([,score]) => score > 0);

    if (sortedScores.length === 0) {
      return {
        intention: 'modify', // fallback padrão
        confidence: 0.3,
        reasoning: 'Nenhuma intenção clara identificada, usando fallback para modificação',
        ambiguous: true
      };
    }

    const [topIntention, topScore] = sortedScores[0];
    const [secondIntention, secondScore] = sortedScores[1] || [null, 0];

    // Verifica se há ambiguidade (duas intenções com pontuação similar)
    const isAmbiguous = secondScore > 0 && (topScore - secondScore) < 0.3;

    // Verifica padrões de ambiguidade conhecidos
    const ambiguityCheck = this.checkKnownAmbiguities(normalizedCommand);

    return {
      intention: topIntention,
      confidence: topScore,
      reasoning: `Intenção '${topIntention}' identificada com pontuação ${topScore.toFixed(2)}`,
      ambiguous: isAmbiguous || ambiguityCheck.isAmbiguous,
      alternatives: isAmbiguous ? [secondIntention] : [],
      disambiguationSuggestion: ambiguityCheck.suggestion || null,
      allScores: scores
    };
  }

  /**
   * Calcula pontuação para uma intenção específica
   */
  calculateIntentionScore(command, pattern, selectedElements, previousContext) {
    let score = 0;

    // Pontuação base por palavras-chave encontradas
    pattern.keywords.forEach(keyword => {
      if (command.includes(keyword)) {
        score += pattern.weight;
      }
    });

    // Reduz pontuação por palavras-chave negativas
    pattern.negativeKeywords.forEach(negativeKeyword => {
      if (command.includes(negativeKeyword)) {
        score -= 0.5;
      }
    });

    // Ajusta pontuação baseado no contexto dos elementos selecionados
    if (selectedElements.length > 0) {
      // Se há elementos selecionados, é mais provável ser modificação/comportamento
      if (['modify', 'addBehavior', 'delete'].includes(pattern.name)) {
        score += 0.3;
      }
      // Criação é menos provável com elementos já selecionados
      if (pattern.name === 'create') {
        score -= 0.2;
      }
    } else {
      // Sem elementos selecionados, criação é mais provável
      if (pattern.name === 'create') {
        score += 0.2;
      }
    }

    // Considera histórico recente
    if (this.contextHistory.length > 0) {
      const recentIntentions = this.contextHistory.slice(-3).map(h => h.intention);
      if (recentIntentions.includes(pattern.name)) {
        score += 0.1; // Pequeno boost para consistência
      }
    }

    // Normaliza pontuação (0-1)
    return Math.min(Math.max(score / 3, 0), 1);
  }

  /**
   * Verifica se é uma solicitação de informação
   */
  isInformationRequest(command) {
    const questionWords = ['qual', 'what', 'como', 'how', 'me diga', 'tell me', 'mostrar', 'show'];
    const questionMarkers = ['?', 'qual a', 'qual o', 'what is', 'what are'];
    
    return questionWords.some(word => command.includes(word)) ||
           questionMarkers.some(marker => command.includes(marker)) ||
           command.endsWith('?');
  }

  /**
   * Verifica padrões de ambiguidade conhecidos
   */
  checkKnownAmbiguities(command) {
    for (const ambiguity of this.ambiguityPatterns) {
      if (ambiguity.pattern.test(command)) {
        return {
          isAmbiguous: true,
          suggestion: ambiguity.disambiguationQuestions[0],
          possibleIntentions: ambiguity.possibleIntentions
        };
      }
    }
    return { isAmbiguous: false };
  }

  /**
   * Adiciona comando ao histórico de contexto
   */
  addToHistory(command, intention, confidence) {
    this.contextHistory.push({
      command,
      intention,
      confidence,
      timestamp: Date.now()
    });

    // Limita tamanho do histórico
    if (this.contextHistory.length > this.maxHistorySize) {
      this.contextHistory.shift();
    }
  }

  /**
   * Sugere confirmação para intenções ambíguas
   */
  generateConfirmationPrompt(classificationResult, command) {
    if (!classificationResult.ambiguous) {
      return null;
    }

    const { intention, alternatives, disambiguationSuggestion } = classificationResult;

    if (disambiguationSuggestion) {
      return {
        type: 'disambiguation',
        message: disambiguationSuggestion,
        options: classificationResult.possibleIntentions || [intention, ...alternatives]
      };
    }

    return {
      type: 'confirmation',
      message: `Entendi que você quer "${intention === 'modify' ? 'modificar elementos existentes' : 
                                        intention === 'create' ? 'criar novos elementos' : 
                                        intention === 'replace' ? 'substituir elementos' : intention}". Está correto?`,
      options: [intention, ...alternatives].filter(Boolean)
    };
  }

  /**
   * Analisa contexto específico do elemento para melhor classificação
   */
  analyzeElementContext(elements) {
    if (!elements || elements.length === 0) {
      return { hasElements: false, elementTypes: [] };
    }

    const elementTypes = elements.map(el => ({
      tag: el.tagName?.toLowerCase() || 'unknown',
      hasContent: !!(el.textContent?.trim()),
      hasStyles: !!(el.style?.cssText),
      isInteractive: ['button', 'input', 'select', 'textarea', 'a'].includes(el.tagName?.toLowerCase())
    }));

    return {
      hasElements: true,
      elementTypes,
      allInteractive: elementTypes.every(e => e.isInteractive),
      hasStyles: elementTypes.some(e => e.hasStyles),
      hasContent: elementTypes.some(e => e.hasContent)
    };
  }

  /**
   * Gera sugestões de melhoria para comandos vagos
   */
  generateCommandSuggestions(command, classificationResult) {
    if (classificationResult.confidence > 0.7) {
      return [];
    }

    const suggestions = [];

    if (classificationResult.intention === 'modify') {
      suggestions.push(
        'Seja mais específico: "mudar cor para azul", "aumentar tamanho da fonte", "adicionar borda"'
      );
    }

    if (classificationResult.intention === 'create') {
      suggestions.push(
        'Especifique o que criar: "criar botão azul", "adicionar card com título", "novo formulário"'
      );
    }

    if (command.length < 10) {
      suggestions.push(
        'Tente usar comandos mais descritivos para melhores resultados'
      );
    }

    return suggestions;
  }
}

export default IntentionClassifier;