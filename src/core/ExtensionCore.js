/**
 * ExtensionCore - Central orchestrator for SAT Quiz Extension
 * Handles initialization, dependency management, and system coordination
 * Follows modern JavaScript best practices with proper error handling
 */

class ExtensionCore {
  constructor() {
    this.isInitialized = false;
    this.systems = new Map();
    this.config = null;
    this.userId = null;
    this.eventBus = new EventTarget();
    
    // Bind methods
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    
    console.log('🎓 ExtensionCore: Initializing...');
  }

  /**
   * Initialize the extension with proper dependency management
   */
  async initialize() {
    try {
      console.log('🎓 ExtensionCore: Starting initialization...');
      
      // Step 1: Load configuration
      await this.loadConfiguration();
      
      // Step 2: Setup error handling
      this.setupErrorHandling();
      
      // Step 3: Initialize user authentication
      await this.initializeAuth();
      
      // Step 4: Load core systems
      await this.loadCoreSystems();
      
      // Step 5: Load gamification systems (lazy)
      await this.loadGamificationSystems();
      
      // Step 6: Setup message handling
      this.setupMessageHandling();
      
      // Step 7: Start quiz logic
      await this.startQuizLogic();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('🎓 ExtensionCore: Initialization completed successfully');
      this.showLoadNotification();
      
    } catch (error) {
      console.error('🎓 ExtensionCore: Fatal initialization error:', error);
      this.handleFatalError(error);
    }
  }

  /**
   * Load and validate configuration
   */
  async loadConfiguration() {
    try {
      // Check if EXTENSION_CONFIG is available
      if (typeof EXTENSION_CONFIG === 'undefined') {
        throw new Error('EXTENSION_CONFIG not found');
      }
      
      this.config = EXTENSION_CONFIG;
      console.log('✅ Configuration loaded');
      
    } catch (error) {
      throw new Error(`Configuration loading failed: ${error.message}`);
    }
  }

  /**
   * Setup global error handling
   */
  setupErrorHandling() {
    // Handle uncaught errors
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handleError);
    
    console.log('✅ Error handling setup');
  }

  /**
   * Initialize user authentication and ID
   */
  async initializeAuth() {
    try {
      // Ensure user authentication
      if (typeof window.ensureAuth === 'function') {
        await window.ensureAuth();
      }
      
      // Get or create user ID
      if (typeof window.getCurrentUserId === 'function') {
        this.userId = await window.getCurrentUserId();
      } else {
        // Fallback: create simple user ID
        this.userId = await this.createUserSession();
      }
      
      if (!this.userId) {
        throw new Error('Failed to establish user session');
      }
      
      console.log('✅ User authentication completed:', this.userId);
      
    } catch (error) {
      // Non-fatal: create anonymous session
      console.warn('⚠️ Auth failed, creating anonymous session:', error.message);
      this.userId = this.createAnonymousSession();
    }
  }

  /**
   * Load core systems (essential for quiz functionality)
   */
  async loadCoreSystems() {
    const coreSystemsToLoad = [
      { name: 'QuizState', class: 'QuizState', required: true },
      { name: 'QuizModal', class: 'QuizModal', required: true },
      { name: 'FeedbackManager', class: 'FeedbackManager', required: true },
      { name: 'BlockManager', class: 'BlockManager', required: true }
    ];

    for (const system of coreSystemsToLoad) {
      await this.loadSystem(system);
    }

    console.log('✅ Core systems loaded');
  }

  /**
   * Load gamification systems (non-essential, fail gracefully)
   */
  async loadGamificationSystems() {
    const gamificationSystems = [
      { name: 'XPManager', class: 'XPManager', required: false },
      { name: 'BadgeManager', class: 'BadgeManager', required: false },
      { name: 'StreakManager', class: 'StreakManager', required: false },
      { name: 'ChallengeEngine', class: 'ChallengeEngine', required: false },
      { name: 'ProgressDashboard', class: 'ProgressDashboard', required: false },
      { name: 'CustomizationManager', class: 'CustomizationManager', required: false }
    ];

    let loadedCount = 0;
    for (const system of gamificationSystems) {
      try {
        await this.loadSystem(system);
        loadedCount++;
      } catch (error) {
        console.warn(`⚠️ Optional system ${system.name} failed to load:`, error.message);
      }
    }

    console.log(`✅ Gamification systems loaded: ${loadedCount}/${gamificationSystems.length}`);
  }

  /**
   * Load individual system with error handling
   */
  async loadSystem(systemConfig) {
    try {
      const { name, class: className, required } = systemConfig;
      
      // Check if class is available
      if (typeof window[className] === 'undefined') {
        const error = new Error(`${className} class not found`);
        if (required) throw error;
        console.warn(`⚠️ Optional system ${name} not available`);
        return;
      }

      // Create instance based on system type
      let instance;
      if (name.includes('Manager') || name.includes('Engine') || name.includes('Dashboard')) {
        // Gamification systems need supabase client
        instance = new window[className](window.supabaseClient || null);
      } else {
        // Core systems don't need parameters
        instance = new window[className]();
      }

      // Store system
      this.systems.set(name, instance);
      console.log(`✅ ${name} loaded successfully`);

    } catch (error) {
      if (systemConfig.required) {
        throw new Error(`Required system ${systemConfig.name} failed to load: ${error.message}`);
      } else {
        console.warn(`⚠️ Optional system ${systemConfig.name} failed:`, error.message);
      }
    }
  }

  /**
   * Setup message handling for popup communication
   */
  setupMessageHandling() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(this.handleMessage);
      console.log('✅ Message handling setup');
    }
  }

  /**
   * Handle messages from popup/background
   */
  async handleMessage(request, sender, sendResponse) {
    try {
      console.log('🎓 Message received:', request.action);

      switch (request.action) {
        case 'forceQuiz':
          await this.forceQuiz();
          sendResponse({ success: true, message: 'Quiz forced successfully' });
          break;

        case 'getGamificationStats':
          const stats = await this.getGamificationStats();
          sendResponse(stats);
          break;

        case 'getStats':
          const basicStats = await this.getBasicStats();
          sendResponse(basicStats);
          break;

        case 'resetStats':
          const resetResult = await this.resetStats();
          sendResponse(resetResult);
          break;

        case 'testContent':
          sendResponse({ success: true, message: 'Content script working', extension: 'SAT Quiz Blocker' });
          break;

        default:
          sendResponse({ success: false, error: `Unknown action: ${request.action}` });
      }

    } catch (error) {
      console.error('🎓 Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }

    return true; // Keep message channel open
  }

  /**
   * Start quiz logic
   */
  async startQuizLogic() {
    try {
      // Check if quiz should be shown
      const shouldShow = await this.shouldShowQuiz();
      
      if (shouldShow) {
        await this.showQuiz();
      } else {
        console.log('🎓 No quiz needed at this time');
      }

    } catch (error) {
      console.error('🎓 Quiz logic error:', error);
    }
  }

  /**
   * Check if quiz should be displayed
   */
  async shouldShowQuiz() {
    try {
      // Get timing from storage
      const result = await chrome.storage.local.get(['lastQuizTime']);
      const lastQuizTime = result.lastQuizTime;
      const currentTime = Date.now();
      const interval = this.config?.quizInterval || (30 * 60 * 1000); // 30 minutes

      if (!lastQuizTime || (currentTime - lastQuizTime) >= interval) {
        return true;
      }

      return false;

    } catch (error) {
      console.error('🎓 Error checking quiz timing:', error);
      return true; // Show quiz on error
    }
  }

  /**
   * Show quiz with full gamification integration
   */
  async showQuiz() {
    try {
      console.log('🎓 Starting quiz...');

      // Get required systems
      const blockManager = this.systems.get('BlockManager');
      const quizModal = this.systems.get('QuizModal');
      const feedback = this.systems.get('FeedbackManager');
      const quizState = this.systems.get('QuizState');

      if (!blockManager || !quizModal || !feedback || !quizState) {
        throw new Error('Core systems not available');
      }

      // Block website
      blockManager.block();
      feedback.setOverlayElement(blockManager.getOverlay());

      // Show loading
      feedback.showMessage('Loading quiz... 🎯', 'loading');

      // Fetch question
      const question = await this.fetchQuestion();
      if (!question) {
        throw new Error('No questions available');
      }

      // Validate and set question
      quizState.setCurrentQuestion(question);

      // Create modal
      const modalElement = quizModal.create(question, blockManager.getOverlay());
      feedback.setFeedbackElement(modalElement.querySelector('#feedback'));
      blockManager.setModal(modalElement);

      // Setup quiz handlers
      this.setupQuizHandlers(quizState, quizModal, feedback, blockManager);

      // Clear loading message
      feedback.clear();

      console.log('🎓 Quiz displayed successfully');

    } catch (error) {
      console.error('🎓 Quiz display error:', error);
      this.handleQuizError(error);
    }
  }

  /**
   * Setup quiz event handlers
   */
  setupQuizHandlers(quizState, quizModal, feedback, blockManager) {
    // Submit handler
    quizModal.onSubmit = async () => {
      await this.handleQuizSubmit(quizState, quizModal, feedback, blockManager);
    };

    // Close handler for review mode
    blockManager.onCloseInReviewMode = () => {
      this.endQuiz(quizState, quizModal, feedback, blockManager);
    };
  }

  /**
   * Handle quiz submission
   */
  async handleQuizSubmit(quizState, quizModal, feedback, blockManager) {
    try {
      // Disable submit button
      quizModal.setSubmitButton('Checking...', true);

      // Get answer
      const question = quizState.getCurrentQuestion();
      const userAnswer = quizModal.getUserAnswer(question.question_type);

      if (!userAnswer) {
        feedback.showMessage('Please select or enter an answer.', 'error');
        quizModal.setSubmitButton('Submit Answer', false);
        return;
      }

      // Check answer
      const isCorrect = quizState.checkAnswer(userAnswer);

      if (isCorrect) {
        await this.handleCorrectAnswer(question, quizState, quizModal, feedback, blockManager);
      } else {
        await this.handleIncorrectAnswer(quizState, quizModal, feedback, blockManager);
      }

    } catch (error) {
      console.error('🎓 Quiz submission error:', error);
      feedback.showMessage('Error processing answer. Please try again.', 'error');
      quizModal.setSubmitButton('Submit Answer', false);
    }
  }

  /**
   * Handle correct answer with gamification
   */
  async handleCorrectAnswer(question, quizState, quizModal, feedback, blockManager) {
    console.log('🎓 Correct answer!');

    const attempts = quizState.getAttempts() + 1;
    const timeToAnswer = quizState.getTimeToAnswer();

    // Process gamification rewards
    const rewards = await this.processGamificationRewards(question, attempts, timeToAnswer);

    // Show success message
    this.showSuccessMessage(feedback, rewards);

    // Show explanation
    feedback.showExplanation(question, false, true);

    // Record success
    await this.recordQuizSession(question, true, attempts, timeToAnswer, rewards);

    // Set review mode
    quizState.setReviewing(true);
    blockManager.setReviewMode(true);
    quizModal.setReviewMode(true);
    quizModal.disableInputs();

    // Start countdown
    this.startCountdownTimer(feedback, blockManager, quizState, quizModal, this.config.explanationReviewTime || 10000);
  }

  /**
   * Handle incorrect answer
   */
  async handleIncorrectAnswer(quizState, quizModal, feedback, blockManager) {
    console.log('🎓 Incorrect answer');

    quizState.incrementAttempts();
    feedback.updateAttempts(quizState.getAttempts(), quizState.getMaxAttempts());

    if (quizState.hasRemainingAttempts()) {
      const remaining = quizState.getRemainingAttempts();
      feedback.showMessage(`❌ Incorrect. You have ${remaining} attempts left.`, 'error');
      quizModal.setSubmitButton('Submit Answer', false);
    } else {
      await this.handleMaxAttempts(quizState, quizModal, feedback, blockManager);
    }
  }

  /**
   * Handle maximum attempts reached
   */
  async handleMaxAttempts(quizState, quizModal, feedback, blockManager) {
    console.log('🎓 Max attempts reached');

    const question = quizState.getCurrentQuestion();
    const attempts = quizState.getMaxAttempts();
    const timeToAnswer = quizState.getTimeToAnswer();

    // Process failure effects
    await this.processFailureEffects(question, attempts, timeToAnswer);

    // Show explanation with correct answer
    feedback.showMessage('❌ Maximum attempts reached.', 'error');
    feedback.showExplanation(question, true, true);

    // Record session
    await this.recordQuizSession(question, false, attempts, timeToAnswer);

    // Disable inputs
    quizModal.disableInputs();

    // Start cooldown
    this.startCountdownTimer(feedback, blockManager, quizState, quizModal, this.config.cooldownPeriod || 15000, 'Unlocking in {time} seconds...');
  }

  /**
   * Process gamification rewards for correct answers
   */
  async processGamificationRewards(question, attempts, timeToAnswer) {
    const rewards = {
      xp: { success: false, gained: 0 },
      streaks: { success: false, current: 0 },
      badges: { success: false, newBadges: [] },
      challenges: { success: false }
    };

    try {
      // Update streaks first
      const streakManager = this.systems.get('StreakManager');
      if (streakManager) {
        const streakResult = await streakManager.updateStreak(true, question.difficulty);
        if (streakResult.success) {
          rewards.streaks = streakResult;
        }
      }

      // Award XP
      const xpManager = this.systems.get('XPManager');
      if (xpManager) {
        const currentStreak = rewards.streaks.current || 0;
        const xpAmount = xpManager.calculateQuestionXP(question.difficulty, attempts, timeToAnswer, currentStreak);
        
        const xpResult = await xpManager.awardXP(this.userId, xpAmount, {
          source: 'question_completion',
          difficulty: question.difficulty,
          attempts: attempts,
          timeToAnswer: timeToAnswer,
          questionId: question.question_id
        });

        if (xpResult.success) {
          rewards.xp = xpResult;
        }
      }

      // Check badges
      const badgeManager = this.systems.get('BadgeManager');
      if (badgeManager && xpManager) {
        const userProgress = await xpManager.getUserProgress();
        const badgeResult = await badgeManager.checkForNewBadges(userProgress);
        if (badgeResult.success) {
          rewards.badges = badgeResult;
        }
      }

      // Update challenges
      const challengeEngine = this.systems.get('ChallengeEngine');
      if (challengeEngine) {
        const challengeResult = await challengeEngine.updateChallengeProgress(this.userId, {
          isCorrect: true,
          difficulty: question.difficulty,
          subject: question.tag,
          timeToAnswer: timeToAnswer,
          attempts: attempts
        });

        if (challengeResult.success) {
          rewards.challenges = challengeResult;
        }
      }

    } catch (error) {
      console.error('🎮 Gamification reward processing error:', error);
    }

    return rewards;
  }

  /**
   * Process failure effects
   */
  async processFailureEffects(question, attempts, timeToAnswer) {
    try {
      // Break streaks
      const streakManager = this.systems.get('StreakManager');
      if (streakManager) {
        await streakManager.updateStreak(false, question.difficulty);
      }

      // Update challenge progress (may still count for volume challenges)
      const challengeEngine = this.systems.get('ChallengeEngine');
      if (challengeEngine) {
        await challengeEngine.updateChallengeProgress(this.userId, {
          isCorrect: false,
          difficulty: question.difficulty,
          subject: question.tag,
          timeToAnswer: timeToAnswer,
          attempts: attempts
        });
      }

    } catch (error) {
      console.error('🎮 Failure effect processing error:', error);
    }
  }

  /**
   * Show success message with rewards
   */
  showSuccessMessage(feedback, rewards) {
    let message = '✅ Correct! Well done!';

    if (rewards.xp.success && rewards.xp.gained > 0) {
      message += ` (+${rewards.xp.gained} XP)`;
    }

    if (rewards.streaks.success && rewards.streaks.current > 1) {
      message += ` 🔥 ${rewards.streaks.current} streak!`;
    }

    feedback.showMessage(message, 'success');

    // Show additional notifications
    if (rewards.xp.leveledUp) {
      setTimeout(() => {
        feedback.showMessage(`🎉 Level up! You're now level ${rewards.xp.newLevel}!`, 'achievement', 3000);
      }, 1500);
    }

    if (rewards.badges.newBadges && rewards.badges.newBadges.length > 0) {
      rewards.badges.newBadges.forEach((badge, index) => {
        setTimeout(() => {
          feedback.showMessage(`🏆 New badge: ${badge.name}!`, 'achievement', 3000);
        }, (index + 2) * 1500);
      });
    }
  }

  /**
   * Start countdown timer
   */
  startCountdownTimer(feedback, blockManager, quizState, quizModal, duration, customMessage = null) {
    let timeLeft = Math.ceil(duration / 1000);
    
    const updateTimer = () => {
      if (timeLeft > 0) {
        const message = customMessage ? customMessage.replace('{time}', timeLeft) : null;
        feedback.showTimer(timeLeft, message);
        timeLeft--;
        setTimeout(updateTimer, 1000);
      } else {
        this.endQuiz(quizState, quizModal, feedback, blockManager);
      }
    };
    
    updateTimer();
  }

  /**
   * End quiz and cleanup
   */
  endQuiz(quizState, quizModal, feedback, blockManager) {
    console.log('🎓 Ending quiz');
    
    feedback.clearTimer();
    feedback.clear();
    quizModal.remove();
    blockManager.unblock();
    quizState.reset();
  }

  /**
   * Force quiz (called from popup)
   */
  async forceQuiz() {
    console.log('🎓 Force quiz requested');
    await this.showQuiz();
  }

  /**
   * Get gamification stats for popup
   */
  async getGamificationStats() {
    try {
      const stats = {
        success: true,
        xp: { current: 0, level: 1, nextLevelXP: 100, progressPercentage: 0 },
        streaks: { current: 0, longest: 0, daily: 0 },
        badges: { earned: 0, total: 0, recent: [] },
        challenges: { hasChallenge: false, progress: 0 }
      };

      // Get XP stats
      const xpManager = this.systems.get('XPManager');
      if (xpManager) {
        const xpSummary = await xpManager.getXPSummary();
        if (xpSummary.success) {
          stats.xp = {
            current: xpSummary.totalXP,
            level: xpSummary.currentLevel,
            nextLevelXP: xpSummary.nextLevelXP,
            progressPercentage: xpSummary.progressPercentage
          };
        }
      }

      // Get streak stats
      const streakManager = this.systems.get('StreakManager');
      if (streakManager) {
        const streakSummary = await streakManager.getStreakSummary();
        if (streakSummary.success) {
          stats.streaks = {
            current: streakSummary.summary.currentStreak,
            longest: streakSummary.summary.longestStreak,
            daily: streakSummary.summary.dailyStreak
          };
        }
      }

      // Get badge stats
      const badgeManager = this.systems.get('BadgeManager');
      if (badgeManager) {
        const badgeSummary = await badgeManager.getBadgeSummary();
        if (badgeSummary.success) {
          stats.badges = {
            earned: badgeSummary.summary.totalEarned,
            total: badgeSummary.summary.totalAvailable,
            recent: badgeSummary.summary.recentBadges
          };
        }
      }

      // Get challenge stats
      const challengeEngine = this.systems.get('ChallengeEngine');
      if (challengeEngine) {
        const challengeSummary = await challengeEngine.getChallengeSummary(this.userId);
        if (challengeSummary.success && challengeSummary.challenge) {
          stats.challenges = {
            hasChallenge: true,
            title: challengeSummary.challenge.title,
            progress: challengeSummary.challenge.progress,
            isCompleted: challengeSummary.challenge.isCompleted
          };
        }
      }

      return stats;

    } catch (error) {
      console.error('🎮 Error getting gamification stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get basic stats for popup
   */
  async getBasicStats() {
    try {
      const result = await chrome.storage.local.get(['questionsAnswered', 'totalAttempts', 'lastQuizTime']);
      return {
        questionsAnswered: result.questionsAnswered || 0,
        totalAttempts: result.totalAttempts || 0,
        lastQuizTime: result.lastQuizTime
      };
    } catch (error) {
      console.error('🎓 Error getting basic stats:', error);
      return { questionsAnswered: 0, totalAttempts: 0, lastQuizTime: null };
    }
  }

  /**
   * Reset all stats
   */
  async resetStats() {
    try {
      await chrome.storage.local.set({
        questionsAnswered: 0,
        totalAttempts: 0,
        lastQuizTime: null
      });

      // Reset gamification stats if available
      const xpManager = this.systems.get('XPManager');
      if (xpManager) {
        await xpManager.resetProgress();
      }

      return { success: true };
    } catch (error) {
      console.error('🎓 Error resetting stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch question from database
   */
  async fetchQuestion() {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        if (typeof window.getRandomQuestion === 'function') {
          const question = await window.getRandomQuestion();
          if (question && question.question_text) {
            return question;
          }
        }

        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`🎓 Question fetch attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    return null;
  }

  /**
   * Record quiz session
   */
  async recordQuizSession(question, isCorrect, attempts, timeToAnswer, rewards = null) {
    try {
      // Update storage
      const updates = {
        lastQuizTime: Date.now(),
        totalAttempts: await this.incrementStorageValue('totalAttempts', attempts)
      };

      if (isCorrect) {
        updates.questionsAnswered = await this.incrementStorageValue('questionsAnswered', 1);
      }

      await chrome.storage.local.set(updates);

      // Emit event for other systems
      this.emit('quizCompleted', {
        question,
        isCorrect,
        attempts,
        timeToAnswer,
        rewards
      });

      console.log('📊 Quiz session recorded');

    } catch (error) {
      console.error('📊 Session recording error:', error);
    }
  }

  /**
   * Helper: Increment storage value
   */
  async incrementStorageValue(key, increment) {
    const result = await chrome.storage.local.get([key]);
    const newValue = (result[key] || 0) + increment;
    return newValue;
  }

  /**
   * Create user session
   */
  async createUserSession() {
    try {
      const sessionId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      await chrome.storage.local.set({ userId: sessionId });
      return sessionId;
    } catch (error) {
      return this.createAnonymousSession();
    }
  }

  /**
   * Create anonymous session
   */
  createAnonymousSession() {
    return 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Handle quiz errors
   */
  handleQuizError(error) {
    const feedback = this.systems.get('FeedbackManager');
    const blockManager = this.systems.get('BlockManager');

    if (feedback) {
      feedback.showMessage(`Error: ${error.message}. Please refresh and try again.`, 'error');
    }

    setTimeout(() => {
      if (blockManager) {
        blockManager.unblock();
      }
    }, this.config?.errorTimeout || 15000);
  }

  /**
   * Handle fatal errors
   */
  handleFatalError(error) {
    console.error('🎓 FATAL ERROR:', error);
    
    // Show user notification
    this.showErrorNotification(`Extension failed to load: ${error.message}`);
  }

  /**
   * Handle general errors
   */
  handleError(event) {
    if (event.error) {
      console.error('🎓 Extension error:', event.error);
    } else if (event.reason) {
      console.error('🎓 Promise rejection:', event.reason);
    }
  }

  /**
   * Show load notification
   */
  showLoadNotification() {
    try {
      const notification = document.createElement('div');
      notification.style.cssText = `
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
      `;
      
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">🎓</span>
          <span>SAT Quiz Extension Loaded</span>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 3000);
      
    } catch (error) {
      console.error('Failed to show load notification:', error);
    }
  }

  /**
   * Show error notification
   */
  showErrorNotification(message) {
    try {
      const notification = document.createElement('div');
      notification.style.cssText = `
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
      `;
      
      notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">Extension Error</div>
        <div style="font-size: 12px;">${message}</div>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Failed to show error notification:', error);
    }
  }

  /**
   * Event emitter helper
   */
  emit(eventName, data = null) {
    this.eventBus.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  /**
   * Event listener helper
   */
  on(eventName, callback) {
    this.eventBus.addEventListener(eventName, callback);
  }

  /**
   * Get system instance
   */
  getSystem(name) {
    return this.systems.get(name);
  }

  /**
   * Check if system is available
   */
  hasSystem(name) {
    return this.systems.has(name);
  }

  /**
   * Get all available systems
   */
  getAvailableSystems() {
    return Array.from(this.systems.keys());
  }
}

// Make ExtensionCore globally accessible
window.ExtensionCore = ExtensionCore; 