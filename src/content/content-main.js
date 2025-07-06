/**
 * SAT Quiz Extension - Main Content Script
 * Single entry point using ExtensionCore for proper initialization
 * Modern, robust, and follows best practices
 */

(function() {
  'use strict';

  // Prevent multiple initialization
  if (window.SATQuizExtensionInitialized) {
    console.log('🎓 Extension already initialized, skipping...');
    return;
  }

  // Skip on problematic pages
  if (isProblematicPage()) {
    console.log('🎓 Skipping problematic page:', window.location.href);
    return;
  }

  console.log('🎓 SAT Quiz Extension: Starting initialization...');

  // Global state
  let extensionCore = null;
  let initializationAttempts = 0;
  const maxInitAttempts = 3;

  /**
   * Main initialization function
   */
  async function initializeExtension() {
    try {
      initializationAttempts++;
      console.log(`🎓 Initialization attempt ${initializationAttempts}/${maxInitAttempts}`);

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await waitForDOMReady();
      }

      // Wait for dependencies to load
      await waitForDependencies();

      // Create and initialize extension core
      extensionCore = new ExtensionCore();
      await extensionCore.initialize();

      // Mark as initialized
      window.SATQuizExtensionInitialized = true;
      window.satQuizExtension = extensionCore;

      // Setup global debugging interface
      setupDebugInterface();

      console.log('🎓 Extension initialization completed successfully');

    } catch (error) {
      console.error(`🎓 Initialization attempt ${initializationAttempts} failed:`, error);

      if (initializationAttempts < maxInitAttempts) {
        console.log(`🎓 Retrying initialization in ${initializationAttempts * 2} seconds...`);
        setTimeout(initializeExtension, initializationAttempts * 2000);
      } else {
        console.error('🎓 All initialization attempts failed');
        showInitializationError(error);
      }
    }
  }

  /**
   * Wait for DOM to be ready
   */
  function waitForDOMReady() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      } else {
        resolve();
      }
    });
  }

  /**
   * Wait for required dependencies to load
   */
  async function waitForDependencies() {
    const requiredDependencies = [
      'EXTENSION_CONFIG',
      'ExtensionCore'
    ];

    const optionalDependencies = [
      'getRandomQuestion',
      'QuizState',
      'QuizModal',
      'FeedbackManager',
      'BlockManager'
    ];

    // Wait for required dependencies
    for (const dep of requiredDependencies) {
      await waitForGlobal(dep, 10000); // 10 second timeout
    }

    // Check optional dependencies
    for (const dep of optionalDependencies) {
      if (typeof window[dep] === 'undefined') {
        console.warn(`⚠️ Optional dependency ${dep} not found`);
      }
    }

    console.log('✅ Dependencies check completed');
  }

  /**
   * Wait for a global variable to become available
   */
  function waitForGlobal(globalName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (typeof window[globalName] !== 'undefined') {
        resolve();
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (typeof window[globalName] !== 'undefined') {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Timeout waiting for ${globalName}`));
        }
      }, 100);
    });
  }

  /**
   * Check if we're on a problematic page
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

    // Skip if too many SVG elements (might cause conflicts)
    const svgCount = document.querySelectorAll('svg').length;
    if (svgCount > 100) {
      console.log(`🎓 Page has ${svgCount} SVG elements, might cause conflicts`);
      return true;
    }

    return false;
  }

  /**
   * Setup debugging interface
   */
  function setupDebugInterface() {
    window.debugSATQuiz = {
      // Core access
      getCore: () => extensionCore,
      getSystem: (name) => extensionCore?.getSystem(name),
      getSystems: () => extensionCore?.getAvailableSystems(),

      // Actions
      forceQuiz: () => extensionCore?.forceQuiz(),
      getStats: () => extensionCore?.getGamificationStats(),
      resetStats: () => extensionCore?.resetStats(),

      // Diagnostics
      checkDependencies: () => {
        const deps = {
          ExtensionCore: typeof ExtensionCore !== 'undefined',
          EXTENSION_CONFIG: typeof EXTENSION_CONFIG !== 'undefined',
          getRandomQuestion: typeof window.getRandomQuestion !== 'undefined',
          QuizState: typeof window.QuizState !== 'undefined',
          QuizModal: typeof window.QuizModal !== 'undefined',
          FeedbackManager: typeof window.FeedbackManager !== 'undefined',
          BlockManager: typeof window.BlockManager !== 'undefined',
          XPManager: typeof window.XPManager !== 'undefined',
          BadgeManager: typeof window.BadgeManager !== 'undefined',
          StreakManager: typeof window.StreakManager !== 'undefined',
          ChallengeEngine: typeof window.ChallengeEngine !== 'undefined'
        };
        console.table(deps);
        return deps;
      },

      // Testing
      testQuiz: async () => {
        if (extensionCore) {
          await extensionCore.showQuiz();
        } else {
          console.error('Extension core not available');
        }
      },

      // Status
      status: () => ({
        initialized: window.SATQuizExtensionInitialized,
        coreAvailable: !!extensionCore,
        systems: extensionCore?.getAvailableSystems() || [],
        userId: extensionCore?.userId || null
      })
    };

    console.log('🎓 Debug interface available at window.debugSATQuiz');
    console.log('🎓 Try: debugSATQuiz.checkDependencies() or debugSATQuiz.status()');
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
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      
      errorDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px;">🎓 SAT Quiz Extension Error</div>
        <div style="font-size: 13px; margin-bottom: 8px;">${error.message}</div>
        <div style="font-size: 11px; opacity: 0.9;">
          Try refreshing the page. If the problem persists, check the browser console for details.
        </div>
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

  // Start initialization with small delay to ensure scripts are loaded
  setTimeout(initializeExtension, 100);

})(); 