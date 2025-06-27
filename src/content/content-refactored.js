/**
 * SAT Quiz Blocker - Refactored Content Script
 * Uses modular architecture with separated concerns
 */

// Initialize the extension with proper error handling
(async function initializeExtension() {
  try {
    console.log('🎓 SAT Quiz Blocker: Starting refactored extension...');
    
    // Check dependencies
    if (typeof EXTENSION_CONFIG === 'undefined') {
      throw new Error('EXTENSION_CONFIG not found. Check if config.js is loaded.');
    }
    
    if (typeof SupabaseClient === 'undefined') {
      throw new Error('SupabaseClient not found. Check if supabase-client.js is loaded.');
    }
    
    // Check if components are loaded
    const requiredComponents = ['QuizModal', 'FeedbackManager', 'QuizState', 'BlockManager', 'QuizController'];
    for (const component of requiredComponents) {
      if (typeof window[component] === 'undefined') {
        throw new Error(`${component} not found. Check if component files are loaded.`);
      }
    }
    
    console.log('🎓 All dependencies loaded successfully');
    
    // Create Supabase client
    const supabaseClient = new SupabaseClient();
    console.log('🎓 Supabase client created');
    
    // Create and initialize quiz controller
    const controller = new QuizController(supabaseClient);
    
    // Set global instance for debugging
    QuizController.instance = controller;
    window.quizController = controller;
    
    // Initialize the controller
    await controller.init();
    
    console.log('🎓 SAT Quiz Blocker: Refactored extension initialized successfully');
    
  } catch (error) {
    console.error('🎓 SAT Quiz Blocker: Fatal initialization error:', error);
    
    // Show error notification to user
    showInitializationError(error);
  }
})();

/**
 * Show initialization error to user
 */
function showInitializationError(error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #dc3545;
    color: white;
    padding: 15px;
    border-radius: 8px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
  `;
  
  errorDiv.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">SAT Quiz Extension Error</div>
    <div style="font-size: 12px;">${error.message}</div>
  `;
  
  document.body.appendChild(errorDiv);
  
  // Remove error after 10 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 10000);
}

// Add CSS for error notification animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// Development helpers (only available in development)
if (typeof window !== 'undefined') {
  window.debugQuiz = {
    getController: () => QuizController.getInstance(),
    getState: () => QuizController.getInstance()?.getState(),
    forceQuiz: () => QuizController.getInstance()?.forceQuiz(),
    endQuiz: () => QuizController.getInstance()?.endQuiz(),
    simulateCorrect: () => {
      const controller = QuizController.getInstance();
      if (controller) {
        controller._handleCorrectAnswer();
      }
    },
    simulateIncorrect: () => {
      const controller = QuizController.getInstance();
      if (controller) {
        controller._handleIncorrectAnswer();
      }
    }
  };
  
  console.log('🎓 Debug helpers available at window.debugQuiz');
} 