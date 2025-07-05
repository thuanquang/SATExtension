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
      
      // For now, just log - gamification systems will be added later
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
    
    // Record failed session for analytics
    await this._recordEnhancedSession(currentQuestion, false, attempts, timeToAnswer, {
      xp: { success: false },
      streaks: { results: { correctAnswerStreak: { streakBroken: true } } },
      badges: { newBadges: [] }
    });
    
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
   * Process correct answer rewards (XP, badges, streaks) - simplified
   */
  async _processCorrectAnswerRewards(question, attempts, timeToAnswer) {
    try {
      console.log('🎮 Processing gamification rewards...');
      
      // Simplified for now - just return success
      return {
        xp: { success: true, xpGained: 10 },
        streaks: { results: { correctAnswerStreak: { streakCount: 1 } } },
        badges: { newBadges: [] },
        challenge: { success: true },
        question: question
      };
      
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
    
    if (results.xp && results.xp.success) {
      message += ` (+${results.xp.xpGained || 10} XP)`;
    }
    
    if (results.streaks && results.streaks.results) {
      const streak = results.streaks.results.correctAnswerStreak;
      if (streak && streak.streakCount > 1) {
        message += ` 🔥 ${streak.streakCount} streak!`;
      }
    }
    
    this.feedback.showMessage(message, 'success');
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
      // Simplified for now
      return {
        success: true,
        xp: { current: 0, level: 1, nextLevelXP: 100 },
        streaks: { correct: 0, daily: 0 },
        badges: { earned: 0, total: 0 },
        challenges: { active: 0, completed: 0 }
      };
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