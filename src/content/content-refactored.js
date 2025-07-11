/**
 * SAT Quiz Blocker - Refactored Content Script
 * Uses modular architecture with separated concerns
 */

// Add a small delay to ensure all scripts are loaded
setTimeout(() => {
  initializeExtension();
}, 100);

// Initialize the extension with proper error handling
async function initializeExtension() {
  try {
    console.log('🎓 SAT Quiz Blocker: Starting refactored extension...');
    
    // Check if we're on a problematic page
    if (isProblematicPage()) {
      console.log('🎓 Skipping initialization on problematic page');
      return;
    }
    
    // Check dependencies with detailed logging
    console.log('🔍 Checking dependencies...');
    
    if (typeof EXTENSION_CONFIG === 'undefined') {
      console.error('❌ EXTENSION_CONFIG not found');
      throw new Error('EXTENSION_CONFIG not found. Check if config.js is loaded.');
    }
    console.log('✅ EXTENSION_CONFIG loaded');
    
    if (typeof window.getRandomQuestion === 'undefined') {
      console.error('❌ Supabase client functions not found');
      throw new Error('Supabase client functions not found. Check if supabase-client.js is loaded.');
    }
    console.log('✅ Supabase client functions loaded');
    
    // Check if components are loaded with detailed logging
    const requiredComponents = ['QuizModal', 'FeedbackManager', 'QuizState', 'BlockManager', 'QuizController'];
    const loadedComponents = [];
    const missingComponents = [];
    
    for (const component of requiredComponents) {
      if (typeof window[component] !== 'undefined') {
        loadedComponents.push(component);
        console.log(`✅ ${component} loaded`);
      } else {
        missingComponents.push(component);
        console.error(`❌ ${component} not found`);
      }
    }
    
    console.log('📊 Component status:', {
      loaded: loadedComponents,
      missing: missingComponents,
      total: requiredComponents.length
    });
    
    if (missingComponents.length > 0) {
      throw new Error(`Missing components: ${missingComponents.join(', ')}. Check if component files are loaded.`);
    }
    
    console.log('🎓 All dependencies loaded successfully');
    
    // Create and initialize quiz controller with error handling
    const controller = new QuizController();
    
    // Set global instance for debugging
    QuizController.instance = controller;
    window.quizController = controller;
    
    // Initialize the controller with error handling
    await controller.init();
    
    console.log('🎓 SAT Quiz Blocker: Refactored extension initialized successfully');
    
    // Add a temporary visual indicator that the extension loaded
    showExtensionLoadedIndicator();
    
    // Setup global message listener for popup communication
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('🎓 Content script received message:', request);
        
        // Test message to verify content script is working
        if (request.action === 'testContent') {
          console.log('🎓 Content script test successful');
          sendResponse({ success: true, message: 'Content script is working', loaded: true });
          return true;
        }
        
        // Handle extension state changes
        if (request.action === 'extensionStateChanged') {
          console.log('🎓 Extension state changed:', request.enabled);
          if (request.enabled) {
            console.log('🎓 Extension enabled - reinitializing if needed');
            // Reinitialize if extension was disabled and is now enabled
            if (controller && !controller.isActive) {
              controller.init();
            }
          } else {
            console.log('🎓 Extension disabled - stopping active quizzes');
            // Stop any active quizzes when extension is disabled
            if (controller) {
              controller.endQuiz();
            }
          }
          sendResponse({ success: true });
          return true;
        }
        
        // Forward other messages to the controller if available
        if (controller) {
          if (request.action === 'forceQuiz') {
            console.log('🎓 Force quiz requested via content script');
            controller.forceQuiz().then(() => {
              console.log('🎓 Force quiz completed successfully');
              sendResponse({ success: true, message: 'Quiz triggered successfully' });
            }).catch((error) => {
              console.error('🎓 Force quiz failed:', error);
              sendResponse({ success: false, error: error.message });
            });
            return true;
          } else if (request.action === 'getStats') {
            console.log('🎓 Get stats requested via content script');
            controller.state.getStats().then(stats => {
              console.log('🎓 Stats retrieved:', stats);
              sendResponse(stats);
            }).catch(error => {
              console.error('🎓 Get stats failed:', error);
              sendResponse({ questionsAnswered: 0, totalAttempts: 0, lastQuizTime: null });
            });
            return true;
          } else if (request.action === 'getGamificationStats') {
            console.log('🎓 Get gamification stats requested via content script');
            console.log('🎓 Controller state:', {
              hasController: !!controller,
              hasXPManager: !!controller.xpManager,
              hasBadgeManager: !!controller.badgeManager,
              hasStreakManager: !!controller.streakManager,
              hasChallengeEngine: !!controller.challengeEngine,
              hasCustomizationManager: !!controller.customizationManager
            });
            
            controller.getGamificationSummary().then(gamificationStats => {
              console.log('🎮 Gamification stats retrieved:', gamificationStats);
              sendResponse(gamificationStats);
            }).catch(error => {
              console.error('🎮 Get gamification stats failed:', error);
              console.error('🎮 Error details:', error.stack);
              sendResponse({ 
                success: false, 
                error: error.message,
                // Provide fallback data
                xp: { current: 0, level: 1, nextLevelXP: 100, progressPercentage: 0 },
                streaks: { current: 0, longest: 0, daily: 0, level: 'none' },
                badges: { earned: 0, total: 0, recent: [] },
                challenges: { hasChallenge: false, progress: 0 },
                customization: { currentTheme: 'Default', availableThemes: 0 }
              });
            });
            return true;
          } else if (request.action === 'resetGamificationData') {
            console.log('🎓 Reset gamification data requested via content script');
            // Reset gamification data through the controller's gamification systems
            if (controller && controller.xpManager) {
              controller.xpManager.initializeUserProgress().then(() => {
                console.log('🎮 Gamification data reset successfully');
                sendResponse({ success: true });
              }).catch(error => {
                console.error('🎮 Failed to reset gamification data:', error);
                sendResponse({ success: false, error: error.message });
              });
            } else {
              console.log('🎮 No gamification systems available for reset');
              sendResponse({ success: true }); // Still return success since basic stats were reset
            }
            return true;
          } else if (request.action === 'resetStats') {
            console.log('🎓 Reset stats requested via content script');
            controller.state.resetStats().then(success => {
              console.log('🎓 Stats reset result:', success);
              sendResponse({ success });
            }).catch(error => {
              console.error('🎓 Reset stats failed:', error);
              sendResponse({ success: false });
            });
            return true;
          }
        } else {
          console.error('🎓 Controller not available for action:', request.action);
          sendResponse({ success: false, error: 'Controller not available' });
          return true;
        }
        
        // Fallback for unknown actions
        sendResponse({ success: false, error: 'Unknown action or controller not available' });
      });
      
      console.log('🎓 Global message listener set up successfully');
    } else {
      console.log('🎓 Chrome runtime not available - message listener not set up (testing mode)');
    }
    
  } catch (error) {
    console.error('🎓 SAT Quiz Blocker: Fatal initialization error:', error);
    
    // Show error notification to user
    showInitializationError(error);
  }
}

/**
 * Check if we're on a page that might cause issues
 */
function isProblematicPage() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  // Skip on certain problematic sites or page types
  const problematicPatterns = [
    'chrome://',
    'chrome-extension://',
    'moz-extension://',
    'edge://',
    'about:',
    'file://',
    'data:',
    'javascript:',
    'localhost',
    '127.0.0.1'
  ];
  
  for (const pattern of problematicPatterns) {
    if (url.startsWith(pattern)) {
      return true;
    }
  }
  
  // Skip if the page has too many SVG elements (might cause conflicts)
  const svgCount = document.querySelectorAll('svg').length;
  if (svgCount > 50) {
    console.log(`🎓 Page has ${svgCount} SVG elements, might cause conflicts`);
    return true;
  }
  
  return false;
}

/**
 * Show a temporary indicator that the extension has loaded
 */
function showExtensionLoadedIndicator() {
  try {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease-out;
    `;
    
    indicator.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">🎓</span>
        <span>SAT Quiz Extension Loaded</span>
      </div>
    `;
    
    document.body.appendChild(indicator);
    
    // Remove indicator after 3 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.remove();
          }
        }, 300);
      }
    }, 3000);
  } catch (error) {
    console.error('Failed to show extension loaded indicator:', error);
  }
}

/**
 * Show initialization error to user
 */
function showInitializationError(error) {
  try {
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
      <div style="font-size: 11px; margin-top: 5px; opacity: 0.8;">Check console for details</div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Remove error after 15 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 15000);
  } catch (notificationError) {
    console.error('Failed to show error notification:', notificationError);
  }
}

// Add CSS for notification animations
try {
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
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
} catch (styleError) {
  console.error('Failed to add notification styles:', styleError);
}

// Development helpers (only available in development)
if (typeof window !== 'undefined') {
  window.debugQuiz = {
    getController: () => QuizController.getInstance(),
    getState: () => QuizController.getInstance()?.getState(),
    forceQuiz: () => QuizController.getInstance()?.forceQuiz(),
    endQuiz: () => QuizController.getInstance()?.endQuiz(),
    checkDependencies: () => {
      const deps = {
        EXTENSION_CONFIG: typeof EXTENSION_CONFIG !== 'undefined',
        getRandomQuestion: typeof window.getRandomQuestion !== 'undefined',
        QuizModal: typeof window.QuizModal !== 'undefined',
        FeedbackManager: typeof window.FeedbackManager !== 'undefined',
        QuizState: typeof window.QuizState !== 'undefined',
        BlockManager: typeof window.BlockManager !== 'undefined',
        QuizController: typeof window.QuizController !== 'undefined'
      };
      console.log('🔍 Dependency check:', deps);
      return deps;
    },
    reinitialize: () => {
      console.log('🔄 Reinitializing extension...');
      initializeExtension();
    },
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
    },
    // Additional debug helpers
    forceQuizDue: async () => {
      const controller = QuizController.getInstance();
      if (controller && controller.state) {
        const result = await controller.state.forceQuizDue();
        console.log('🎓 Quiz timing reset:', result);
        return result;
      }
      return false;
    },
    checkTiming: async () => {
      const controller = QuizController.getInstance();
      if (controller && controller.state) {
        const shouldShow = await controller.state.shouldShowQuiz();
        console.log('🎓 Should show quiz:', shouldShow);
        return shouldShow;
      }
      return false;
    },
    getStats: async () => {
      const controller = QuizController.getInstance();
      if (controller && controller.state) {
        const stats = await controller.state.getStats();
        console.log('🎓 Current stats:', stats);
        return stats;
      }
      return null;
    },
    resetStats: async () => {
      const controller = QuizController.getInstance();
      if (controller && controller.state) {
        const result = await controller.state.resetStats();
        console.log('🎓 Stats reset:', result);
        return result;
      }
      return false;
    }
  };
  
  console.log('🎓 Debug helpers available at window.debugQuiz');
  console.log('🎓 Available methods:', Object.keys(window.debugQuiz));
  console.log('🎓 Try: debugQuiz.checkDependencies() or debugQuiz.reinitialize()');
} 