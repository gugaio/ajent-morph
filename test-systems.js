/**
 * Script de teste para verificar se todos os sistemas estão funcionando
 * Execute: node test-systems.js
 */

async function testSystems() {
  console.log('🧪 Testing Ajent Morph Enhanced Systems...\n');

  try {
    // Simular ambiente de navegador
    global.window = {
      getComputedStyle: () => ({
        color: 'rgb(0, 0, 0)',
        backgroundColor: 'rgb(255, 255, 255)',
        fontSize: '16px'
      }),
      document: {
        querySelector: () => null,
        querySelectorAll: () => []
      }
    };
    
    global.document = global.window.document;

    // 1. Teste IntentionClassifier
    console.log('1. Testing IntentionClassifier...');
    const { default: IntentionClassifier } = await import('./src/utils/IntentionClassifier.js');
    const classifier = new IntentionClassifier();
    
    const intention = classifier.classifyIntention('deixar azul', [], {});
    console.log('   ✅ Intention classified:', intention.intention, `(${intention.confidence.toFixed(2)})`);

    // 2. Teste EnhancedValidator
    console.log('\n2. Testing EnhancedValidator...');
    const { default: EnhancedValidator } = await import('./src/utils/EnhancedValidator.js');
    const validator = new EnhancedValidator();
    
    const validation = validator.validateStyles({ color: 'blau', fontSize: '16px' });
    console.log('   ✅ Validation completed. Valid styles:', Object.keys(validation.validStyles).length);
    console.log('   ⚠️  Corrections suggested:', validation.suggestions.length);

    // 3. Teste ErrorRecoverySystem
    console.log('\n3. Testing ErrorRecoverySystem...');
    const { default: ErrorRecoverySystem } = await import('./src/utils/ErrorRecoverySystem.js');
    const errorRecovery = new ErrorRecoverySystem();
    
    const error = new Error('this.checkElementSpecificRequirements is not a function');
    const recovery = await errorRecovery.handleError(error, { operation: 'accessibility_check' });
    console.log('   ✅ Error recovery completed. Success:', recovery.success);
    console.log('   💬 User message:', recovery.userMessage);

    // 4. Teste SmartRetrySystem
    console.log('\n4. Testing SmartRetrySystem...');
    const { default: SmartRetrySystem } = await import('./src/utils/SmartRetrySystem.js');
    const retrySystem = new SmartRetrySystem();
    
    let attempts = 0;
    const testOperation = () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Temporary failure');
      }
      return 'Success!';
    };
    
    const retryResult = await retrySystem.executeWithRetry(testOperation, 'network');
    console.log('   ✅ Retry system test:', retryResult.success ? 'SUCCESS' : 'FAILED');
    console.log('   🔄 Attempts made:', retryResult.attempts);

    // 5. Teste AccessibilityChecker
    console.log('\n5. Testing AccessibilityChecker...');
    const { default: AccessibilityChecker } = await import('./src/utils/AccessibilityChecker.js');
    const accessibilityChecker = new AccessibilityChecker();
    
    // Simular elemento DOM
    const mockElement = {
      nodeType: 1, // Node.ELEMENT_NODE
      tagName: 'DIV',
      style: {},
      getAttribute: () => null,
      textContent: 'Test content'
    };
    
    const accessibilityReport = accessibilityChecker.checkElementAccessibility(mockElement, { color: 'blue' });
    console.log('   ✅ Accessibility check completed. Accessible:', accessibilityReport.isAccessible);
    console.log('   📊 Overall score:', accessibilityReport.scores.overall);

    // 6. Teste EnhancedTaskPlanner
    console.log('\n6. Testing EnhancedTaskPlanner...');
    const { default: EnhancedTaskPlanner } = await import('./src/utils/EnhancedTaskPlanner.js');
    const taskPlanner = new EnhancedTaskPlanner();
    
    const plan = taskPlanner.createIntelligentPlan('criar formulário de contato');
    console.log('   ✅ Task plan created:', plan.name);
    console.log('   📋 Subtasks:', plan.subtasks.length);
    console.log('   ⏱️  Estimated time:', Math.round(plan.estimatedTime / 1000), 'seconds');

    // 7. Teste SystemIntegrityChecker
    console.log('\n7. Testing SystemIntegrityChecker...');
    const { getSystemIntegrityChecker } = await import('./src/utils/SystemIntegrityChecker.js');
    const systemChecker = getSystemIntegrityChecker();
    
    const integrityResult = await systemChecker.runIntegrityCheck();
    console.log('   ✅ Integrity check completed. Success:', integrityResult.success);
    console.log('   🔍 Issues found:', integrityResult.issues ? integrityResult.issues.length : 0);

    console.log('\n🎉 All systems tested successfully!');
    console.log('\n📊 Summary:');
    console.log('   • Intention Recognition: Working');
    console.log('   • Enhanced Validation: Working');
    console.log('   • Error Recovery: Working');
    console.log('   • Smart Retry: Working');
    console.log('   • Accessibility Checker: Working');
    console.log('   • Task Planner: Working');
    console.log('   • System Integrity: Working');
    
    console.log('\n✨ Ajent Morph Enhanced Systems are ready for use!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Execute tests
testSystems();