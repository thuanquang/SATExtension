/**
 * QuizController - Main controller that orchestrates all quiz components
 * Follows MVC pattern and separates concerns properly
 */
class QuizController {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
    
    // Initialize components
    this.state = new QuizState();
    this.modal = new QuizModal();
    this.feedback = new FeedbackManager();
    this.blockManager = new BlockManager();
    
    // Timer management
    this.countdownTimer = null;
    
    // Setup callbacks
    this._setupCallbacks();
    
    console.log('🎓 Quiz Controller initialized');
  }

  async init() {
    console.log('🎓 Starting quiz controller initialization...');
    
    try {
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

    // Setup message listener for popup communication
    this._setupMessageListener();
  }

  async startQuiz() {
    console.log('🎓 Starting quiz...');
    
    try {
      // Block the website
      this.blockManager.block();
      
      // Setup feedback manager
      this.feedback.setOverlayElement(this.blockManager.getOverlay());
      
      // Show loading
      this.feedback.showMessage('Loading quiz...', 'loading');
      
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
      
      // Create and show modal
      await this._createAndShowModal(question);
      
      console.log('🎓 Quiz started successfully');
      
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
    
    // Create modal
    const modalElement = this.modal.create(question);
    
    // Setup feedback element
    const feedbackElement = modalElement.querySelector('#feedback');
    this.feedback.setFeedbackElement(feedbackElement);
    
    // Setup block manager
    this.blockManager.setModal(modalElement);
    
    // Show modal
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
    
    // Update state
    this.state.setReviewing(true);
    this.blockManager.setReviewMode(true);
    
    // Show success message
    this.feedback.showMessage('✅ Correct! Well done.', 'success');
    
    // Show explanation
    this.feedback.showExplanation(this.state.getCurrentQuestion());
    
    // Record success
    await this.state.recordSuccess();
    
    // Disable inputs
    this.modal.disableInputs();
    
    // Start countdown timer
    const reviewTime = EXTENSION_CONFIG.explanationReviewTime || 10000;
    this._startCountdownTimer(reviewTime);
  }

  _handleIncorrectAnswer() {
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
      // Max attempts reached
      this._handleMaxAttempts();
    }
  }

  _handleMaxAttempts() {
    console.log('🎓 Max attempts reached');
    
    // Do NOT enter review mode (no click outside to close)
    this.feedback.showMessage('❌ You have reached the maximum number of attempts.', 'error');
    
    // Show explanation with correct answer
    this.feedback.showExplanation(this.state.getCurrentQuestion(), true);
    
    // Disable inputs
    this.modal.disableInputs();
    
    // Start cooldown timer
    const cooldownTime = EXTENSION_CONFIG.cooldownPeriod || 15000;
    this._startCountdownTimer(cooldownTime, `Unlocking in {time} seconds...`);
  }

  _startCountdownTimer(duration, customMessage = null) {
    this._clearTimer();
    
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
        
        const question = await this.supabaseClient.getRandomQuestion();
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

  _setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('🎓 Message received:', request);
      
      if (request.action === 'forceQuiz') {
        this.forceQuiz().then(() => {
          sendResponse({ success: true, message: 'Quiz triggered successfully' });
        }).catch((error) => {
          console.error('🎓 Force quiz failed:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open
      } else if (request.action === 'getStats') {
        this.state.getStats().then(stats => {
          sendResponse(stats);
        }).catch(error => {
          console.error('🎓 Get stats failed:', error);
          sendResponse({ questionsAnswered: 0, totalAttempts: 0, lastQuizTime: null });
        });
        return true;
      } else if (request.action === 'resetStats') {
        this.state.resetStats().then(success => {
          sendResponse({ success });
        }).catch(error => {
          console.error('🎓 Reset stats failed:', error);
          sendResponse({ success: false });
        });
        return true;
      }
      
      sendResponse({ success: false, error: 'Unknown action' });
    });
  }

  // Public API for testing and debugging
  getState() {
    return {
      question: this.state.getQuestionSummary(),
      blocking: this.blockManager.getBlockingState(),
      isReviewing: this.state.isInReviewMode()
    };
  }

  // Expose for global access
  static instance = null;
  
  static getInstance() {
    return QuizController.instance;
  }
} 