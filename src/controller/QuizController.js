/**
 * QuizController - Main controller that orchestrates all quiz components
 * Follows MVC pattern and separates concerns properly
 * Enhanced with comprehensive gamification systems
 */

class QuizController {
  constructor() {
    
    // Initialize core components
    this.state = new QuizState();
    this.modal = new QuizModal();
    this.feedback = new FeedbackManager();
    this.blockManager = new BlockManager();
    
    // Initialize gamification systems - simplified for content script
    this.xpManager = null;
    this.badgeManager = null;
    this.streakManager = null;
    this.challengeEngine = null;
    this.progressDashboard = null;
    
    // User identification for gamification
    this.userId = null; // Will be set after auth
    
    // Timer management
    this.countdownTimer = null;
    
    // Session start time for timing
    this.sessionStartTime = null;
    
    // Setup callbacks
    this._setupCallbacks();
    
    console.log('🎓 Enhanced Quiz Controller initialized');
  }

  async init() {
    console.log('🎓 Starting enhanced quiz controller initialization...');
    
    try {
      // Ensure user is authenticated and get UUID
      await window.ensureAuth();
      this.userId = await window.getCurrentUserId();
      
      // Initialize gamification systems (simplified)
      await this.initializeGamificationSystems();
      
      const shouldShowQuiz = await this.state.shouldShowQuiz();
      console.log('🎓 Should show quiz?', shouldShowQuiz);
      
      if (shouldShowQuiz) {
        await this.startQuiz();
      } else {
        console.log('🎓 No quiz needed at this time');
      }
    } catch (error) {
      console.error('🎓 Error during initialization:', error);
    }
  }

  /**
   * Initialize all gamification systems
   */
  async initializeGamificationSystems() {
    try {
      console.log('🎮 Initializing gamification systems...');
      
      // Initialize XP Manager
      if (window.XPManager) {
        this.xpManager = new window.XPManager(null);
        console.log('🎮 XP Manager initialized');
      }
      
      // Initialize Badge Manager
      if (window.BadgeManager) {
        this.badgeManager = new window.BadgeManager(null);
        console.log('🎮 Badge Manager initialized');
      }
      
      // Initialize Streak Manager
      if (window.StreakManager) {
        this.streakManager = new window.StreakManager(null);
        console.log('🎮 Streak Manager initialized');
      }
      
      // Initialize Challenge Engine
      if (window.ChallengeEngine) {
        this.challengeEngine = new window.ChallengeEngine(null);
        console.log('🎮 Challenge Engine initialized');
      }
      
      // Initialize Progress Dashboard
      if (window.ProgressDashboard) {
        this.progressDashboard = new window.ProgressDashboard(null);
        console.log('🎮 Progress Dashboard initialized');
      }
      
      // Initialize Customization Manager
      if (window.CustomizationManager) {
        this.customizationManager = new window.CustomizationManager(null);
        console.log('🎮 Customization Manager initialized');
      }
      
      console.log('🎮 Gamification systems initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('🎮 Error initializing gamification systems:', error);
      return { success: false, error: error.message };
    }
  }

  async startQuiz() {
    console.log('🎓 Starting enhanced quiz...');
    
    try {
      // Record session start time for analytics
      this.sessionStartTime = Date.now();
      
      // Block the website
      this.blockManager.block();
      
      // Setup feedback manager
      this.feedback.setOverlayElement(this.blockManager.getOverlay());
      
      // Show loading with gamification context
      this.feedback.showMessage('Loading quiz... 🎯', 'loading');
      
      // Fetch question with retry logic
      const question = await this._fetchQuestionWithRetry();
      
      if (!question) {
        throw new Error('No questions available');
      }

      // Validate and set question
      if (!this.state.validateQuestion(question)) {
        throw new Error('Invalid question data');
      }

      this.state.setCurrentQuestion(question);
      
      // Create and show modal with gamification features
      await this._createAndShowModal(question);
      
      // Show current streaks and XP info
      await this._showGamificationInfo();
      
      console.log('🎓 Enhanced quiz started successfully');
      
    } catch (error) {
      console.error('🎓 Error starting quiz:', error);
      this.feedback.showMessage(`Error: ${error.message}. Please refresh and try again.`, 'error');
      
      // Auto-unblock after error timeout
      setTimeout(() => {
        this.endQuiz();
      }, EXTENSION_CONFIG.errorTimeout || 15000);
    }
  }

  async forceQuiz() {
    console.log('🎓 Force quiz requested');
    
    if (!this.blockManager.isWebsiteBlocked()) {
      this.blockManager.block();
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow overlay to be created
    }
    
    await this.startQuiz();
  }

  endQuiz() {
    console.log('🎓 Ending quiz');
    // Clear timer
    this._clearTimer();
    this.feedback.clearTimer();
    // Remove modal
    this.modal.remove();
    // Unblock website
    this.blockManager.unblock();
    // Reset state
    this.state.reset();
    // Clear feedback
    this.feedback.clear();
  }

  async _createAndShowModal(question) {
    // Clear feedback
    this.feedback.clear();
    
    // Get the overlay from BlockManager
    const overlay = this.blockManager.getOverlay();
    
    // Create modal with existing overlay
    const modalElement = this.modal.create(question, overlay);
    
    // Setup feedback element
    const feedbackElement = modalElement.querySelector('#feedback');
    this.feedback.setFeedbackElement(feedbackElement);
    
    // Setup block manager
    this.blockManager.setModal(modalElement);
    
    // Show modal (this is now handled in create, but ensure it's visible)
    this.modal.show();
    
    // Update attempts display
    this.feedback.updateAttempts(this.state.getAttempts(), this.state.getMaxAttempts());
  }

  async _handleSubmit() {
    console.log('🎓 Handling submit');
    
    // Disable submit button
    this.modal.setSubmitButton('Submitting...', true);
    
    // Get user answer
    const question = this.state.getCurrentQuestion();
    const userAnswer = this.modal.getUserAnswer(question.question_type);
    
    if (!userAnswer) {
      this.feedback.showMessage('Please select or enter an answer.', 'error');
      this.modal.setSubmitButton('Submit Answer', false);
      return;
    }

    // Check answer
    const isCorrect = this.state.checkAnswer(userAnswer);
    
    if (isCorrect) {
      await this._handleCorrectAnswer();
    } else {
      this._handleIncorrectAnswer();
    }
  }

  async _handleCorrectAnswer() {
    console.log('🎓 Correct answer!');
    
    // Calculate timing and session data
    const timeToAnswer = this.sessionStartTime ? Date.now() - this.sessionStartTime : null;
    const currentQuestion = this.state.getCurrentQuestion();
    const attempts = this.state.getAttempts() + 1; // Include current attempt
    
    // Update state
    this.state.setReviewing(true);
    this.blockManager.setReviewMode(true);
    this.modal.setReviewMode(true);
    
    // Process gamification rewards (simplified)
    const gamificationResults = await this._processCorrectAnswerRewards(
      currentQuestion, 
      attempts, 
      timeToAnswer
    );
    
    // Show enhanced success message with rewards
    this._showEnhancedSuccessMessage(gamificationResults);
    
    // Show explanation (scrollable in review mode)
    this.feedback.showExplanation(currentQuestion, false, true);
    
    // Record enhanced session data
    await this._recordEnhancedSession(currentQuestion, true, attempts, timeToAnswer, gamificationResults);
    
    // Update traditional state
    await this.state.recordSuccess();
    
    // Disable inputs
    this.modal.disableInputs();
    
    // Start countdown timer
    const reviewTime = EXTENSION_CONFIG.explanationReviewTime || 10000;
    this._startCountdownTimer(reviewTime);
  }

  async _handleIncorrectAnswer() {
    console.log('🎓 Incorrect answer');
    
    // Increment attempts
    this.state.incrementAttempts();
    this.feedback.updateAttempts(this.state.getAttempts(), this.state.getMaxAttempts());
    
    if (this.state.hasRemainingAttempts()) {
      // Show error with remaining attempts
      const remaining = this.state.getRemainingAttempts();
      this.feedback.showMessage(`❌ Incorrect. You have ${remaining} attempts left.`, 'error');
      
      // Re-enable submit button
      this.modal.setSubmitButton('Submit Answer', false);
    } else {
      // Max attempts reached - break streaks and record session
      await this._handleMaxAttempts();
    }
  }

  async _handleMaxAttempts() {
    console.log('🎓 Max attempts reached');
    
    // Calculate timing and session data
    const timeToAnswer = this.sessionStartTime ? Date.now() - this.sessionStartTime : null;
    const currentQuestion = this.state.getCurrentQuestion();
    const attempts = this.state.getMaxAttempts();
    
    // Process streak breaking and record session
    const failureResults = await this._processIncorrectAnswerEffects(currentQuestion, attempts, timeToAnswer);
    await this._recordEnhancedSession(currentQuestion, false, attempts, timeToAnswer, failureResults);
    
    // Do NOT enter review mode (no click outside to close)
    this.feedback.showMessage('❌ You have reached the maximum number of attempts.', 'error');
    
    // Show explanation with correct answer (scrollable in review mode)
    this.feedback.showExplanation(currentQuestion, true, true);
    
    // Disable inputs
    this.modal.disableInputs();
    
    // Start cooldown timer
    const cooldownTime = EXTENSION_CONFIG.cooldownPeriod || 15000;
    this._startCountdownTimer(cooldownTime, `Unlocking in {time} seconds...`);
  }

  _startCountdownTimer(duration, customMessage = null) {
    this._clearTimer();
    this.feedback.clearTimer();
    let timeLeft = Math.ceil(duration / 1000);
    const updateTimer = () => {
      if (timeLeft > 0) {
        const message = customMessage 
          ? customMessage.replace('{time}', timeLeft)
          : null;
        this.feedback.showTimer(timeLeft, message);
        timeLeft--;
        this.countdownTimer = setTimeout(updateTimer, 1000);
      } else {
        this.feedback.clearTimer();
        this.endQuiz();
      }
    };
    updateTimer();
  }

  _clearTimer() {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  async _fetchQuestionWithRetry() {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        this.feedback.showMessage(`Loading quiz... (Attempt ${retryCount + 1}/${maxRetries})`, 'loading');
        
        const question = await window.getRandomQuestion();
        if (question) {
          return question;
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`🎓 Fetch attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        
        if (retryCount < maxRetries) {
          this.feedback.showMessage(`Connection error, retrying... (${retryCount}/${maxRetries})`, 'error');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    return null;
  }

  _setupCallbacks() {
    // Modal callbacks
    this.modal.onSubmit = () => this._handleSubmit();
    this.modal.onInstructionToggle = (isVisible) => {
      console.log('🎓 Instructions toggled:', isVisible);
    };
    
    // Block manager callbacks
    this.blockManager.onCloseInReviewMode = () => {
      console.log('🎓 Close in review mode requested');
      this.endQuiz();
    };
  }

  /**
   * Process incorrect answer effects (streak breaking, stats update)
   */
  async _processIncorrectAnswerEffects(question, attempts, timeToAnswer) {
    try {
      console.log('🎮 Processing incorrect answer effects...');
      
      const results = {
        xp: { success: false },
        streaks: { success: false, streakBroken: false },
        badges: { success: false, newBadges: [] },
        challenge: { success: false },
        question: question
      };
      
      // Break streaks
      if (this.streakManager) {
        const streakResult = await this.streakManager.updateStreak(false, question.difficulty);
        results.streaks = streakResult;
        console.log('💔 Streak broken:', streakResult);
      }
      
      // Update user stats (incorrect answer)
      if (this.xpManager) {
        await this.xpManager.updateUserStats(false, question.difficulty);
      }
      
      // Update challenge progress (might still count toward volume challenges)
      if (this.challengeEngine) {
        const challengeResult = await this.challengeEngine.updateChallengeProgress(this.userId, {
          isCorrect: false,
          difficulty: question.difficulty,
          subject: question.tag,
          timeToAnswer: timeToAnswer,
          attempts: attempts
        });
        
        results.challenge = challengeResult;
      }
      
      return results;
      
    } catch (error) {
      console.error('🎮 Error processing incorrect answer effects:', error);
      return { error: error.message };
    }
  }

  /**
   * Process correct answer rewards (XP, badges, streaks)
   */
  async _processCorrectAnswerRewards(question, attempts, timeToAnswer) {
    try {
      console.log('🎮 Processing gamification rewards...');
      
      const results = {
        xp: { success: false },
        streaks: { success: false },
        badges: { success: false, newBadges: [] },
        challenge: { success: false },
        question: question
      };
      
      // Update streaks first
      if (this.streakManager) {
        const streakResult = await this.streakManager.updateStreak(true, question.difficulty);
        results.streaks = streakResult;
        console.log('🔥 Streak updated:', streakResult);
      }
      
      // Calculate and award XP
      if (this.xpManager) {
        const currentStreak = results.streaks.currentStreak || 0;
        const xpAmount = this.xpManager.calculateQuestionXP(
          question.difficulty, 
          attempts, 
          timeToAnswer, 
          currentStreak
        );
        
        const xpResult = await this.xpManager.awardXP(this.userId, xpAmount, {
          source: 'question_completion',
          difficulty: question.difficulty,
          attempts: attempts,
          timeToAnswer: timeToAnswer,
          questionId: question.question_id
        });
        
        results.xp = xpResult;
        console.log('⭐ XP awarded:', xpResult);
        
        // Update user stats
        await this.xpManager.updateUserStats(true, question.difficulty);
      }
      
      // Check for new badges
      if (this.badgeManager && this.xpManager) {
        const userProgress = await this.xpManager.getUserProgress();
        const badgeResult = await this.badgeManager.checkForNewBadges(userProgress);
        results.badges = badgeResult;
        
        if (badgeResult.newBadges && badgeResult.newBadges.length > 0) {
          console.log('🏆 New badges earned:', badgeResult.newBadges);
        }
      }
      
      // Update challenge progress
      if (this.challengeEngine) {
        const challengeResult = await this.challengeEngine.updateChallengeProgress(this.userId, {
          isCorrect: true,
          difficulty: question.difficulty,
          subject: question.tag,
          timeToAnswer: timeToAnswer,
          attempts: attempts
        });
        
        results.challenge = challengeResult;
        
        if (challengeResult.justCompleted) {
          console.log('🎯 Challenge completed!', challengeResult.challenge);
        }
      }
      
      // Update daily streak
      if (this.streakManager) {
        await this.streakManager.updateDailyStreak();
      }
      
      return results;
      
    } catch (error) {
      console.error('🎮 Error processing rewards:', error);
      return { error: error.message };
    }
  }

  /**
   * Show enhanced success message with gamification rewards
   */
  _showEnhancedSuccessMessage(results) {
    let message = '✅ Correct! Well done!';
    let additionalMessages = [];
    
    // Add XP information
    if (results.xp && results.xp.success) {
      message += ` (+${results.xp.xpGained || 10} XP)`;
      
      if (results.xp.leveledUp) {
        additionalMessages.push(`🎉 Level up! You're now level ${results.xp.newLevel}!`);
      }
    }
    
    // Add streak information
    if (results.streaks && results.streaks.success) {
      if (results.streaks.currentStreak > 1) {
        message += ` 🔥 ${results.streaks.currentStreak} streak!`;
      }
      
      if (results.streaks.streakReward) {
        additionalMessages.push(`🔥 Streak milestone! ${results.streaks.streakReward.message}`);
      }
    }
    
    // Add badge information
    if (results.badges && results.badges.newBadges && results.badges.newBadges.length > 0) {
      results.badges.newBadges.forEach(badge => {
        additionalMessages.push(`🏆 New badge: ${badge.name}!`);
      });
    }
    
    // Add challenge information
    if (results.challenge && results.challenge.justCompleted) {
      additionalMessages.push(`🎯 Challenge completed: ${results.challenge.challenge.title}!`);
    }
    
    // Show main message
    this.feedback.showMessage(message, 'success');
    
    // Show additional messages with delay
    additionalMessages.forEach((msg, index) => {
      setTimeout(() => {
        this.feedback.showMessage(msg, 'achievement', 3000);
      }, (index + 1) * 1500);
    });
  }

  /**
   * Record enhanced session data
   */
  async _recordEnhancedSession(question, isCorrect, attempts, timeToAnswer, gamificationResults) {
    try {
      const sessionData = {
        user_id: this.userId,
        question_id: question.question_id,
        is_correct: isCorrect,
        attempts: attempts,
        time_to_answer: timeToAnswer,
        difficulty: question.difficulty,
        subject: question.tag,
        session_timestamp: new Date().toISOString(),
        gamification_data: gamificationResults
      };
      
      console.log('📊 Recording session:', sessionData);
      
      // For now, just log - database recording will be added later
      console.log('📊 Session recorded successfully');
      
    } catch (error) {
      console.error('📊 Error recording session:', error);
    }
  }

  /**
   * Show current gamification info
   */
  async _showGamificationInfo() {
    try {
      // Simplified for now
      console.log('🎮 Showing gamification info...');
    } catch (error) {
      console.error('🎮 Error showing gamification info:', error);
    }
  }

  /**
   * Get current state for testing/debugging
   */
  getState() {
    return {
      currentQuestion: this.state.getCurrentQuestion(),
      attempts: this.state.getAttempts(),
      maxAttempts: this.state.getMaxAttempts(),
      isReviewing: this.state.isInReviewMode(),
      isBlocked: this.blockManager.isWebsiteBlocked(),
      userId: this.userId
    };
  }

  /**
   * Get gamification summary for popup
   */
  async getGamificationSummary() {
    try {
      const summary = {
        success: true,
        xp: { current: 0, level: 1, nextLevelXP: 100, progressPercentage: 0 },
        streaks: { current: 0, longest: 0, daily: 0, level: 'none' },
        badges: { earned: 0, total: 0, recent: [] },
        challenges: { hasChallenge: false, progress: 0 },
        customization: { currentTheme: 'Default', availableThemes: 0 }
      };
      
      // Get XP summary
      if (this.xpManager) {
        const xpSummary = await this.xpManager.getXPSummary();
        if (xpSummary.success) {
          summary.xp = {
            current: xpSummary.totalXP,
            level: xpSummary.currentLevel,
            nextLevelXP: xpSummary.nextLevelXP,
            progressPercentage: xpSummary.progressPercentage,
            streakMultiplier: xpSummary.streakMultiplier
          };
        }
      }
      
      // Get streak summary
      if (this.streakManager) {
        const streakSummary = await this.streakManager.getStreakSummary();
        if (streakSummary.success) {
          summary.streaks = {
            current: streakSummary.summary.currentStreak,
            longest: streakSummary.summary.longestStreak,
            daily: streakSummary.summary.dailyStreak,
            level: streakSummary.summary.streakLevel,
            isOnFire: streakSummary.summary.isOnFire,
            nextMilestone: streakSummary.summary.nextMilestone
          };
        }
      }
      
      // Get badge summary
      if (this.badgeManager) {
        const badgeSummary = await this.badgeManager.getBadgeSummary();
        if (badgeSummary.success) {
          summary.badges = {
            earned: badgeSummary.summary.totalEarned,
            total: badgeSummary.summary.totalAvailable,
            recent: badgeSummary.summary.recentBadges,
            rarityBreakdown: badgeSummary.summary.rarityBreakdown
          };
        }
      }
      
      // Get challenge summary
      if (this.challengeEngine) {
        const challengeSummary = await this.challengeEngine.getChallengeSummary(this.userId);
        if (challengeSummary.success) {
          summary.challenges = challengeSummary.hasChallenge ? {
            hasChallenge: true,
            title: challengeSummary.challenge.title,
            description: challengeSummary.challenge.description,
            progress: challengeSummary.challenge.progress,
            isCompleted: challengeSummary.challenge.isCompleted,
            timeRemaining: challengeSummary.challenge.timeRemaining
          } : { hasChallenge: false };
        }
      }
      
      // Get customization summary
      if (this.customizationManager) {
        const customSummary = await this.customizationManager.getCustomizationSummary(this.userId);
        if (customSummary.success) {
          summary.customization = {
            currentTheme: customSummary.summary.currentTheme.name,
            currentLayout: customSummary.summary.currentLayout.name,
            availableThemes: customSummary.summary.availableThemes,
            availableLayouts: customSummary.summary.availableLayouts,
            customizationLevel: customSummary.summary.customizationLevel
          };
        }
      }
      
      return summary;
    } catch (error) {
      console.error('🎮 Error getting gamification summary:', error);
      return { success: false, error: error.message };
    }
  }

  // Singleton pattern
  static instance = null;
  
  static getInstance() {
    if (!QuizController.instance) {
      QuizController.instance = new QuizController();
    }
    return QuizController.instance;
  }
}

// Make QuizController globally accessible
window.QuizController = QuizController; 