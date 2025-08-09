/**
 * EnhancedTaskPlanner - Sistema avançado de planejamento de tarefas
 * 
 * Gerencia tarefas complexas com dependências, estimativa de tempo,
 * progresso visual e otimização automática de execução
 */
class EnhancedTaskPlanner {
  constructor() {
    // Armazenamento de planos ativos
    this.activePlans = new Map();
    
    // Sistema de dependências
    this.dependencyGraph = new Map();
    
    // Templates de tarefas comuns
    this.taskTemplates = new Map([
      ['create_form', {
        name: 'Criar Formulário Completo',
        estimatedTime: 120000, // 2 minutos
        subtasks: [
          { id: 'form_container', name: 'Criar estrutura do formulário', estimatedTime: 20000, dependencies: [] },
          { id: 'form_fields', name: 'Adicionar campos de entrada', estimatedTime: 40000, dependencies: ['form_container'] },
          { id: 'form_labels', name: 'Configurar labels e acessibilidade', estimatedTime: 30000, dependencies: ['form_fields'] },
          { id: 'form_validation', name: 'Implementar validação JavaScript', estimatedTime: 50000, dependencies: ['form_fields'] },
          { id: 'form_styling', name: 'Aplicar estilos e layout', estimatedTime: 30000, dependencies: ['form_labels'] },
          { id: 'form_submission', name: 'Configurar envio de dados', estimatedTime: 20000, dependencies: ['form_validation', 'form_styling'] }
        ]
      }],
      ['create_navigation', {
        name: 'Criar Sistema de Navegação',
        estimatedTime: 90000, // 1.5 minutos
        subtasks: [
          { id: 'nav_structure', name: 'Criar estrutura de navegação', estimatedTime: 15000, dependencies: [] },
          { id: 'nav_items', name: 'Adicionar itens de menu', estimatedTime: 25000, dependencies: ['nav_structure'] },
          { id: 'nav_responsive', name: 'Implementar responsividade', estimatedTime: 30000, dependencies: ['nav_items'] },
          { id: 'nav_interactions', name: 'Adicionar interações e animações', estimatedTime: 20000, dependencies: ['nav_responsive'] }
        ]
      }],
      ['create_dashboard', {
        name: 'Criar Dashboard Completo',
        estimatedTime: 180000, // 3 minutos
        subtasks: [
          { id: 'dashboard_layout', name: 'Definir layout principal', estimatedTime: 30000, dependencies: [] },
          { id: 'dashboard_cards', name: 'Criar cards informativos', estimatedTime: 45000, dependencies: ['dashboard_layout'] },
          { id: 'dashboard_charts', name: 'Adicionar gráficos e visualizações', estimatedTime: 60000, dependencies: ['dashboard_cards'] },
          { id: 'dashboard_filters', name: 'Implementar filtros e controles', estimatedTime: 30000, dependencies: ['dashboard_layout'] },
          { id: 'dashboard_responsive', name: 'Otimizar para dispositivos móveis', estimatedTime: 25000, dependencies: ['dashboard_charts', 'dashboard_filters'] }
        ]
      }],
      ['dark_theme_conversion', {
        name: 'Converter para Tema Escuro',
        estimatedTime: 60000, // 1 minuto
        subtasks: [
          { id: 'analyze_colors', name: 'Analisar cores atuais', estimatedTime: 10000, dependencies: [] },
          { id: 'define_dark_palette', name: 'Definir paleta escura', estimatedTime: 15000, dependencies: ['analyze_colors'] },
          { id: 'update_backgrounds', name: 'Atualizar cores de fundo', estimatedTime: 15000, dependencies: ['define_dark_palette'] },
          { id: 'update_text_colors', name: 'Ajustar cores do texto', estimatedTime: 10000, dependencies: ['update_backgrounds'] },
          { id: 'check_contrast', name: 'Verificar contraste e acessibilidade', estimatedTime: 10000, dependencies: ['update_text_colors'] }
        ]
      }]
    ]);

    // Sistema de estimativas inteligentes
    this.executionHistory = new Map();
    this.performanceMetrics = {
      avgTaskTime: new Map(),
      complexityFactors: new Map(),
      successRates: new Map()
    };

    // Configurações de UI
    this.uiConfig = {
      showProgressBar: true,
      showTimeEstimates: true,
      showDependencyGraph: false,
      autoCollapse: true,
      soundAlerts: false
    };

    // Sistema de notificações
    this.notificationCallbacks = new Set();
    
    // Inicia sistema de monitoramento
    this.startPerformanceMonitoring();
  }

  /**
   * Cria um plano de tarefas inteligente baseado no comando do usuário
   * @param {string} command - Comando do usuário
   * @param {Object} context - Contexto adicional (elementos selecionados, etc.)
   * @returns {Object} Plano de tarefas estruturado
   */
  createIntelligentPlan(command, context = {}) {
    const planId = this.generatePlanId();
    
    // 1. Analisa o comando para identificar tipo de tarefa
    const taskType = this.analyzeCommandType(command, context);
    
    // 2. Usa template se disponível, senão cria plan customizado
    const basePlan = this.taskTemplates.get(taskType) || this.generateCustomPlan(command, context);
    
    // 3. Ajusta estimativas baseado no histórico
    const adjustedPlan = this.adjustPlanEstimates(basePlan, context);
    
    // 4. Otimiza ordem de execução considerando dependências
    const optimizedPlan = this.optimizeExecutionOrder(adjustedPlan);
    
    // 5. Cria estrutura final do plano
    const plan = {
      id: planId,
      name: optimizedPlan.name,
      command: command,
      context: context,
      status: 'created',
      createdAt: Date.now(),
      estimatedTime: optimizedPlan.estimatedTime,
      actualStartTime: null,
      actualEndTime: null,
      totalTasks: optimizedPlan.subtasks.length,
      completedTasks: 0,
      currentTaskIndex: -1,
      subtasks: optimizedPlan.subtasks.map((task, index) => ({
        ...task,
        index: index,
        status: 'pending', // pending, in_progress, completed, failed, skipped
        startTime: null,
        endTime: null,
        actualDuration: null,
        errors: [],
        result: null
      })),
      dependencies: this.buildDependencyMap(optimizedPlan.subtasks),
      progress: {
        percentage: 0,
        currentPhase: 'planning',
        nextTask: optimizedPlan.subtasks[0]?.name,
        timeRemaining: optimizedPlan.estimatedTime,
        tasksRemaining: optimizedPlan.subtasks.length
      },
      metadata: {
        complexity: this.calculateComplexity(optimizedPlan),
        riskLevel: this.assessRiskLevel(optimizedPlan, context),
        requiredCapabilities: this.identifyRequiredCapabilities(optimizedPlan)
      }
    };

    // 6. Armazena o plano
    this.activePlans.set(planId, plan);
    
    // 7. Notifica criação do plano
    this.notifyPlanCreated(plan);
    
    return plan;
  }

  /**
   * Executa plano de tarefas com monitoramento inteligente
   * @param {string} planId - ID do plano
   * @param {Function} taskExecutor - Função que executa cada tarefa
   * @returns {Promise<Object>} Resultado da execução
   */
  async executePlan(planId, taskExecutor) {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    plan.status = 'executing';
    plan.actualStartTime = Date.now();
    plan.progress.currentPhase = 'execution';
    
    this.notifyPlanStarted(plan);

    try {
      // Executa tarefas respeitando dependências
      while (plan.completedTasks < plan.totalTasks) {
        // Encontra próxima tarefa executável
        const nextTask = this.getNextExecutableTask(plan);
        
        if (!nextTask) {
          // Todas as tarefas restantes estão bloqueadas por dependências falhas
          plan.status = 'blocked';
          break;
        }

        // Executa a tarefa
        await this.executeTask(plan, nextTask, taskExecutor);
        
        // Atualiza progresso
        this.updatePlanProgress(plan);
        
        // Notifica progresso
        this.notifyPlanProgress(plan);
        
        // Pausa pequena para UX
        await this.sleep(100);
      }

      // Finaliza plano
      plan.actualEndTime = Date.now();
      plan.status = plan.completedTasks === plan.totalTasks ? 'completed' : 'partial';
      
      this.notifyPlanCompleted(plan);
      
      return {
        success: plan.status === 'completed',
        plan: plan,
        completedTasks: plan.completedTasks,
        totalTasks: plan.totalTasks,
        totalTime: plan.actualEndTime - plan.actualStartTime,
        estimatedTime: plan.estimatedTime
      };

    } catch (error) {
      plan.status = 'failed';
      plan.error = error;
      this.notifyPlanFailed(plan, error);
      throw error;
    }
  }

  /**
   * Executa uma tarefa individual
   */
  async executeTask(plan, task, taskExecutor) {
    task.status = 'in_progress';
    task.startTime = Date.now();
    plan.currentTaskIndex = task.index;
    
    try {
      console.log(`🔄 Executing task: ${task.name}`);
      
      // Executa a tarefa
      const result = await taskExecutor(task, plan.context);
      
      // Sucesso
      task.status = 'completed';
      task.endTime = Date.now();
      task.actualDuration = task.endTime - task.startTime;
      task.result = result;
      
      plan.completedTasks++;
      
      // Atualiza métricas de performance
      this.updatePerformanceMetrics(task);
      
      console.log(`✅ Task completed: ${task.name} (${task.actualDuration}ms)`);
      
    } catch (error) {
      console.error(`❌ Task failed: ${task.name}`, error);
      
      task.status = 'failed';
      task.endTime = Date.now();
      task.actualDuration = task.endTime - task.startTime;
      task.errors.push(error.message);
      
      // Decide se deve continuar ou falhar o plano
      const shouldContinue = this.handleTaskFailure(plan, task, error);
      if (!shouldContinue) {
        throw error;
      }
    }
  }

  /**
   * Encontra próxima tarefa que pode ser executada (dependências satisfeitas)
   */
  getNextExecutableTask(plan) {
    for (const task of plan.subtasks) {
      if (task.status === 'pending' && this.areDependenciesSatisfied(plan, task)) {
        return task;
      }
    }
    return null;
  }

  /**
   * Verifica se as dependências de uma tarefa foram satisfeitas
   */
  areDependenciesSatisfied(plan, task) {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every(depId => {
      const depTask = plan.subtasks.find(t => t.id === depId);
      return depTask && depTask.status === 'completed';
    });
  }

  /**
   * Analisa tipo de comando para escolher template
   */
  analyzeCommandType(command, context) {
    const lowerCommand = command.toLowerCase();
    
    // Mapeamento de padrões para templates
    const patterns = [
      { pattern: /formul[aá]rio|form|contato|cadastro|registro/i, template: 'create_form' },
      { pattern: /navega[çc][aã]o|menu|nav|header/i, template: 'create_navigation' },
      { pattern: /dashboard|painel|gr[aá]ficos|relat[oó]rio/i, template: 'create_dashboard' },
      { pattern: /dark|escuro|theme|tema.*escuro/i, template: 'dark_theme_conversion' }
    ];

    for (const { pattern, template } of patterns) {
      if (pattern.test(lowerCommand)) {
        return template;
      }
    }

    return 'custom';
  }

  /**
   * Gera plano customizado quando não há template
   */
  generateCustomPlan(command, context) {
    // Análise básica do comando para gerar tarefas
    const tasks = [];
    const lowerCommand = command.toLowerCase();
    
    // Detecta intenções básicas
    if (lowerCommand.includes('criar') || lowerCommand.includes('adicionar')) {
      tasks.push({
        id: 'create_element',
        name: 'Criar elemento solicitado',
        estimatedTime: 15000,
        dependencies: []
      });
    }

    if (lowerCommand.includes('estilo') || lowerCommand.includes('cor') || lowerCommand.includes('design')) {
      tasks.push({
        id: 'apply_styling',
        name: 'Aplicar estilos e design',
        estimatedTime: 10000,
        dependencies: tasks.length > 0 ? [tasks[tasks.length - 1].id] : []
      });
    }

    if (lowerCommand.includes('interativo') || lowerCommand.includes('click') || lowerCommand.includes('comportamento')) {
      tasks.push({
        id: 'add_interactivity',
        name: 'Adicionar interatividade',
        estimatedTime: 20000,
        dependencies: tasks.length > 0 ? [tasks[tasks.length - 1].id] : []
      });
    }

    // Fallback para comando genérico
    if (tasks.length === 0) {
      tasks.push({
        id: 'generic_task',
        name: 'Executar comando solicitado',
        estimatedTime: 15000,
        dependencies: []
      });
    }

    // Sempre adiciona verificação final
    tasks.push({
      id: 'final_verification',
      name: 'Verificar resultado e acessibilidade',
      estimatedTime: 5000,
      dependencies: tasks.map(t => t.id).slice(-1)
    });

    return {
      name: `Execução de: "${command}"`,
      estimatedTime: tasks.reduce((sum, task) => sum + task.estimatedTime, 0),
      subtasks: tasks
    };
  }

  /**
   * Ajusta estimativas baseado no histórico de execução
   */
  adjustPlanEstimates(plan, context) {
    const adjustedPlan = { ...plan };
    
    adjustedPlan.subtasks = plan.subtasks.map(task => {
      const historicalData = this.performanceMetrics.avgTaskTime.get(task.id);
      
      if (historicalData && historicalData.count > 2) {
        // Usa média histórica com ajuste de contexto
        const complexityFactor = this.getComplexityFactor(task, context);
        const adjustedTime = Math.round(historicalData.average * complexityFactor);
        
        return {
          ...task,
          estimatedTime: adjustedTime,
          confidence: Math.min(historicalData.count / 10, 1) // 0-1
        };
      }
      
      return task;
    });

    // Recalcula tempo total
    adjustedPlan.estimatedTime = adjustedPlan.subtasks.reduce(
      (sum, task) => sum + task.estimatedTime, 0
    );

    return adjustedPlan;
  }

  /**
   * Otimiza ordem de execução das tarefas
   */
  optimizeExecutionOrder(plan) {
    // Implementa algoritmo de ordenação topológica considerando dependências
    const optimizedPlan = { ...plan };
    const graph = this.buildDependencyMap(plan.subtasks);
    
    // Por agora, mantém ordem original mas pode ser expandido
    // para otimização mais sofisticada baseada em paralelização
    
    return optimizedPlan;
  }

  /**
   * Constrói mapa de dependências
   */
  buildDependencyMap(subtasks) {
    const map = new Map();
    
    subtasks.forEach(task => {
      map.set(task.id, {
        task: task,
        dependencies: task.dependencies || [],
        dependents: []
      });
    });

    // Constrói lista de dependentes
    map.forEach((taskInfo, taskId) => {
      taskInfo.dependencies.forEach(depId => {
        const depInfo = map.get(depId);
        if (depInfo) {
          depInfo.dependents.push(taskId);
        }
      });
    });

    return map;
  }

  /**
   * Atualiza progresso do plano
   */
  updatePlanProgress(plan) {
    const completedCount = plan.subtasks.filter(t => t.status === 'completed').length;
    const failedCount = plan.subtasks.filter(t => t.status === 'failed').length;
    const inProgressCount = plan.subtasks.filter(t => t.status === 'in_progress').length;
    
    plan.progress.percentage = Math.round((completedCount / plan.totalTasks) * 100);
    plan.progress.tasksRemaining = plan.totalTasks - completedCount - failedCount;
    
    // Estima tempo restante baseado em progresso atual
    if (plan.actualStartTime && completedCount > 0) {
      const elapsedTime = Date.now() - plan.actualStartTime;
      const avgTimePerTask = elapsedTime / completedCount;
      plan.progress.timeRemaining = Math.round(avgTimePerTask * plan.progress.tasksRemaining);
    }

    // Identifica próxima tarefa
    const nextTask = this.getNextExecutableTask(plan);
    plan.progress.nextTask = nextTask?.name || 'Finalizando...';

    // Atualiza fase atual
    if (plan.progress.percentage === 100) {
      plan.progress.currentPhase = 'completed';
    } else if (inProgressCount > 0) {
      plan.progress.currentPhase = 'execution';
    } else if (failedCount > 0) {
      plan.progress.currentPhase = 'error_handling';
    }
  }

  /**
   * Lida com falhas de tarefa
   */
  handleTaskFailure(plan, failedTask, error) {
    console.warn(`Task failed: ${failedTask.name}`, error);

    // Verifica se outras tarefas dependem desta
    const dependentTasks = plan.subtasks.filter(task => 
      task.dependencies && task.dependencies.includes(failedTask.id)
    );

    // Marca tarefas dependentes como skipped se a falha é crítica
    if (this.isCriticalTask(failedTask)) {
      dependentTasks.forEach(task => {
        if (task.status === 'pending') {
          task.status = 'skipped';
          task.errors.push(`Skipped due to failed dependency: ${failedTask.name}`);
        }
      });
      return false; // Para execução do plano
    }

    // Para falhas não críticas, continua execução
    return true;
  }

  /**
   * Determina se uma tarefa é crítica para o plano
   */
  isCriticalTask(task) {
    const criticalIds = ['form_container', 'nav_structure', 'dashboard_layout'];
    return criticalIds.includes(task.id) || task.critical === true;
  }

  /**
   * Sistema de métricas e análise
   */
  
  updatePerformanceMetrics(task) {
    const taskId = task.id;
    
    if (!this.performanceMetrics.avgTaskTime.has(taskId)) {
      this.performanceMetrics.avgTaskTime.set(taskId, {
        total: 0,
        count: 0,
        average: 0
      });
    }

    const metrics = this.performanceMetrics.avgTaskTime.get(taskId);
    metrics.total += task.actualDuration;
    metrics.count++;
    metrics.average = metrics.total / metrics.count;

    // Atualiza taxa de sucesso
    if (!this.performanceMetrics.successRates.has(taskId)) {
      this.performanceMetrics.successRates.set(taskId, {
        successes: 0,
        total: 0,
        rate: 1
      });
    }

    const successMetrics = this.performanceMetrics.successRates.get(taskId);
    successMetrics.total++;
    if (task.status === 'completed') {
      successMetrics.successes++;
    }
    successMetrics.rate = successMetrics.successes / successMetrics.total;
  }

  calculateComplexity(plan) {
    const factors = {
      taskCount: plan.subtasks.length,
      dependencies: plan.subtasks.reduce((sum, task) => sum + (task.dependencies?.length || 0), 0),
      estimatedTime: plan.estimatedTime
    };

    // Fórmula simples de complexidade (pode ser refinada)
    const complexity = (factors.taskCount * 0.3) + 
                      (factors.dependencies * 0.5) + 
                      (factors.estimatedTime / 60000 * 0.2); // minutos

    if (complexity > 10) return 'high';
    if (complexity > 5) return 'medium';
    return 'low';
  }

  assessRiskLevel(plan, context) {
    let riskScore = 0;

    // Fatores de risco
    if (plan.subtasks.length > 8) riskScore += 2;
    if (plan.estimatedTime > 300000) riskScore += 2; // > 5 minutos
    if (!context.elementSelectors || context.elementSelectors.length === 0) riskScore += 1;
    
    // Baseado na taxa de sucesso histórica
    const avgSuccessRate = Array.from(this.performanceMetrics.successRates.values())
      .reduce((sum, metric) => sum + metric.rate, 0) / 
      Math.max(this.performanceMetrics.successRates.size, 1);
    
    if (avgSuccessRate < 0.7) riskScore += 2;
    else if (avgSuccessRate < 0.9) riskScore += 1;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  identifyRequiredCapabilities(plan) {
    const capabilities = new Set();

    plan.subtasks.forEach(task => {
      if (task.id.includes('form') || task.id.includes('input')) {
        capabilities.add('dom_manipulation');
        capabilities.add('event_handling');
      }
      if (task.id.includes('styling') || task.id.includes('color')) {
        capabilities.add('css_styling');
      }
      if (task.id.includes('validation') || task.id.includes('script')) {
        capabilities.add('javascript_execution');
      }
      if (task.id.includes('responsive') || task.id.includes('mobile')) {
        capabilities.add('responsive_design');
      }
    });

    return Array.from(capabilities);
  }

  getComplexityFactor(task, context) {
    let factor = 1.0;

    // Ajusta baseado no número de elementos selecionados
    if (context.elementSelectors) {
      const elementCount = context.elementSelectors.length;
      factor *= Math.max(1, elementCount * 0.1);
    }

    // Ajusta baseado no tipo de tarefa
    if (task.id.includes('responsive')) factor *= 1.3;
    if (task.id.includes('validation')) factor *= 1.2;
    if (task.id.includes('chart') || task.id.includes('visualization')) factor *= 1.5;

    return Math.min(factor, 2.0); // Limita fator máximo
  }

  /**
   * Sistema de notificações
   */
  
  addNotificationCallback(callback) {
    this.notificationCallbacks.add(callback);
  }

  removeNotificationCallback(callback) {
    this.notificationCallbacks.delete(callback);
  }

  notifyPlanCreated(plan) {
    this.notify('plan_created', { plan });
  }

  notifyPlanStarted(plan) {
    this.notify('plan_started', { plan });
  }

  notifyPlanProgress(plan) {
    this.notify('plan_progress', { plan, progress: plan.progress });
  }

  notifyPlanCompleted(plan) {
    this.notify('plan_completed', { plan });
  }

  notifyPlanFailed(plan, error) {
    this.notify('plan_failed', { plan, error });
  }

  notify(event, data) {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Notification callback error:', error);
      }
    });
  }

  /**
   * API pública
   */
  
  getPlan(planId) {
    return this.activePlans.get(planId);
  }

  getAllPlans() {
    return Array.from(this.activePlans.values());
  }

  getActivePlans() {
    return Array.from(this.activePlans.values()).filter(plan => 
      ['created', 'executing'].includes(plan.status)
    );
  }

  cancelPlan(planId) {
    const plan = this.activePlans.get(planId);
    if (plan) {
      plan.status = 'cancelled';
      this.notify('plan_cancelled', { plan });
      return true;
    }
    return false;
  }

  getPerformanceStats() {
    return {
      avgTaskTimes: Object.fromEntries(this.performanceMetrics.avgTaskTime),
      successRates: Object.fromEntries(this.performanceMetrics.successRates),
      totalPlansExecuted: this.executionHistory.size,
      activeTemplates: Array.from(this.taskTemplates.keys())
    };
  }

  addTaskTemplate(id, template) {
    this.taskTemplates.set(id, template);
  }

  removeTaskTemplate(id) {
    return this.taskTemplates.delete(id);
  }

  updateUIConfig(config) {
    this.uiConfig = { ...this.uiConfig, ...config };
  }

  getUIConfig() {
    return { ...this.uiConfig };
  }

  /**
   * Utilitários
   */
  
  generatePlanId() {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  startPerformanceMonitoring() {
    // Limpa dados antigos periodicamente
    setInterval(() => {
      this.cleanupOldPlans();
    }, 5 * 60 * 1000); // A cada 5 minutos
  }

  cleanupOldPlans() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 horas
    
    for (const [planId, plan] of this.activePlans.entries()) {
      if (plan.createdAt < cutoff && ['completed', 'failed', 'cancelled'].includes(plan.status)) {
        this.activePlans.delete(planId);
      }
    }
  }
}

export default EnhancedTaskPlanner;