// Content script for SAT Quiz Blocker

// This script is injected after config.js and supabase-client.js
// so EXTENSION_CONFIG and SupabaseClient class are available.

class SATQuizBlocker {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
    this.isBlocked = false;
    this.currentQuestion = null;
    this.attempts = 0;
    this.modal = null;
    console.log('🎓 SAT Quiz Blocker: Initializing...');

    // Bind the event handler once to `this`
    this.boundPreventDefault = this.preventDefault.bind(this);

    this.init();
    this.setupMessageListener();
  }

  async init() {
    console.log('🎓 SAT Quiz Blocker: Starting initialization...');
    // Check if user needs to answer a question
    const shouldShowQuiz = await this.shouldShowQuiz();
    console.log('🎓 SAT Quiz Blocker: Should show quiz?', shouldShowQuiz);
    
    if (shouldShowQuiz) {
      console.log('🎓 SAT Quiz Blocker: Blocking website and showing quiz...');
      this.blockWebsite();
      await this.showQuiz();
    } else {
      console.log('🎓 SAT Quiz Blocker: No quiz needed at this time.');
    }
  }

  setupMessageListener() {
    console.log('🎓 SAT Quiz Blocker: Setting up message listener...');
    // Listen for messages from popup or background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('🎓 SAT Quiz Blocker: Received message:', request);
      
      if (request.action === 'forceQuiz') {
        console.log('🎓 SAT Quiz Blocker: Force quiz requested, processing...');
        this.forceQuiz().then(() => {
          console.log('🎓 SAT Quiz Blocker: Force quiz completed successfully');
          sendResponse({ success: true, message: 'Quiz triggered successfully' });
        }).catch((error) => {
          console.error('🎓 SAT Quiz Blocker: Force quiz failed:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
      } else if (request.action === 'showStats') {
        // Handle stats display if needed
        sendResponse({ success: true });
      } else {
        console.log('🎓 SAT Quiz Blocker: Unknown message action:', request.action);
        sendResponse({ success: false, error: 'Unknown action' });
      }
    });
    console.log('🎓 SAT Quiz Blocker: Message listener set up successfully');
  }

  async forceQuiz() {
    console.log('🎓 SAT Quiz Blocker: Force quiz requested...');
    try {
      // Force show quiz regardless of timing
      if (!this.isBlocked) {
        console.log('🎓 SAT Quiz Blocker: Website not blocked, blocking now...');
        this.blockWebsite();
      } else {
        console.log('🎓 SAT Quiz Blocker: Website already blocked');
      }
      
      console.log('🎓 SAT Quiz Blocker: Showing quiz...');
      await this.showQuiz();
      console.log('🎓 SAT Quiz Blocker: Force quiz completed');
    } catch (error) {
      console.error('🎓 SAT Quiz Blocker: Error in force quiz:', error);
      throw error;
    }
  }

  async shouldShowQuiz() {
    try {
      console.log('🎓 SAT Quiz Blocker: Checking if quiz should be shown...');
      const lastQuizTime = await this.getStorageData('lastQuizTime');
      const currentTime = Date.now();
      
      console.log('🎓 SAT Quiz Blocker: Last quiz time:', lastQuizTime);
      console.log('🎓 SAT Quiz Blocker: Current time:', currentTime);
      console.log('🎓 SAT Quiz Blocker: Quiz interval:', EXTENSION_CONFIG.quizInterval);
      
      // Show quiz if never taken or if interval has passed
      if (!lastQuizTime || (currentTime - lastQuizTime) > EXTENSION_CONFIG.quizInterval) {
        console.log('🎓 SAT Quiz Blocker: Quiz should be shown!');
        return true;
      }
      
      console.log('🎓 SAT Quiz Blocker: Quiz not needed yet.');
      return false;
    } catch (error) {
      console.error('🎓 SAT Quiz Blocker: Error checking quiz status:', error);
      return true; // Show quiz on error
    }
  }

  blockWebsite() {
    console.log('🎓 SAT Quiz Blocker: Blocking website...');
    this.isBlocked = true;
    
    // Disable scrolling
    document.body.style.overflow = 'hidden';
    
    // Disable all interactions using the bound handler
    document.addEventListener('click', this.boundPreventDefault, true);
    document.addEventListener('keydown', this.boundPreventDefault, true);
    document.addEventListener('scroll', this.boundPreventDefault, true);
    document.addEventListener('wheel', this.boundPreventDefault, true);
    document.addEventListener('touchmove', this.boundPreventDefault, true);
    
    // Add overlay
    this.addOverlay();
  }

  preventDefault(event) {
    // Allow all interactions within the quiz modal
    if (this.modal && this.modal.contains(event.target)) {
      // For scroll events within the modal, prevent them from bubbling to the background
      if (event.type === 'scroll' || event.type === 'wheel') {
        event.stopPropagation();
        return;
      }
      return;
    }
    
    // Allow overlay clicks when in review mode (after correct answer)
    if (event.type === 'click' && event.target.id === 'sat-quiz-overlay') {
      // Check if we're in review mode (countdown timer exists)
      const countdownTimer = document.getElementById('countdown-timer');
      if (countdownTimer) {
        console.log('🎓 SAT Quiz Blocker: Overlay clicked during review mode, closing popup...');
        this.unblockWebsite();
        return;
      } else {
        console.log('🎓 SAT Quiz Blocker: Overlay clicked but not in review mode (no countdown timer)');
      }
    }
    
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  addOverlay() {
    console.log('🎓 SAT Quiz Blocker: Adding overlay...');
    const overlay = document.createElement('div');
    overlay.id = 'sat-quiz-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 999999;
      display: flex;
      justify-content: center;
      align-items: center;
    `;
    document.body.appendChild(overlay);
  }

  async showQuiz() {
    try {
      console.log('🎓 SAT Quiz Blocker: Fetching question from Supabase...');
      // Get random question from Supabase (already validated)
      this.currentQuestion = await this.supabaseClient.getRandomQuestion();
      
      console.log('🎓 SAT Quiz Blocker: Question received:', this.currentQuestion);
      
      if (!this.currentQuestion) {
        console.error('🎓 SAT Quiz Blocker: No valid questions available after multiple attempts.');
        this.unblockWebsite();
        return;
      }

      // No need for further validation here, as it's done in the client
      console.log('🎓 SAT Quiz Blocker: Creating modal for validated question...');
      this.createModal();
      this.showModal();
      
    } catch (error) {
      console.error('🎓 SAT Quiz Blocker: Error showing quiz:', error);
      this.unblockWebsite();
      throw error; // Re-throw to be caught by forceQuiz
    }
  }

  createModal() {
    const modal = document.createElement('div');
    modal.id = 'sat-quiz-modal';
    modal.innerHTML = this.getModalHTML();
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      z-index: 1000000;
      max-width: 500px;
      width: 90%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create scrollable content area
    const contentArea = modal.querySelector('.quiz-content');
    if (contentArea) {
      contentArea.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 30px;
        padding-bottom: 20px;
      `;
      
      // Add specific scroll event handling to prevent background scrolling
      contentArea.addEventListener('scroll', (event) => {
        event.stopPropagation();
      }, true);
      
      contentArea.addEventListener('wheel', (event) => {
        event.stopPropagation();
      }, true);
    }

    // Ensure footer stays at bottom
    const footer = modal.querySelector('.quiz-footer');
    if (footer) {
      footer.style.cssText = `
        padding: 20px 30px;
        text-align: center;
        border-top: 1px solid #e0e0e0;
        background: white;
        border-radius: 0 0 12px 12px;
        flex-shrink: 0;
      `;
    }

    // Add event listeners
    const submitBtn = modal.querySelector('#submit-answer');
    
    if (this.currentQuestion.question_type === 'multiple_choice') {
      const answerInputs = modal.querySelectorAll('input[name="answer"]');
      answerInputs.forEach(input => {
        input.addEventListener('change', () => {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
        });
      });
    } else if (this.currentQuestion.question_type === 'numeric') {
      const answerInput = modal.querySelector('input[name="numeric-answer"]');
      answerInput.addEventListener('input', () => {
        submitBtn.disabled = !answerInput.value.trim();
        submitBtn.style.opacity = answerInput.value.trim() ? '1' : '0.5';
      });
    }
    
    submitBtn.addEventListener('click', () => this.handleSubmit());

    // Add instruction toggle functionality
    const instructionToggle = modal.querySelector('#instruction-toggle');
    const instructionBox = modal.querySelector('#instruction-box');
    if (instructionToggle && instructionBox) {
      instructionToggle.addEventListener('click', () => {
        const isVisible = instructionBox.style.display !== 'none';
        instructionBox.style.display = isVisible ? 'none' : 'block';
        instructionToggle.textContent = isVisible ? '📖 Show Instructions' : '📖 Hide Instructions';
      });
    }

    this.modal = modal;
    document.body.appendChild(modal);
    console.log('🎓 SAT Quiz Blocker: Modal created and added to page');
  }

  getModalHTML() {
    const question = this.currentQuestion;
    
    let questionContent = '';
    
    if (question.question_type === 'multiple_choice') {
      // The answer_choices are already validated and filtered by supabase-client.js
      const options = question.answer_choices;
      
      console.log('🎓 SAT Quiz Blocker: Rendering options:', options);
      
      questionContent = `
        <div class="quiz-options">
          ${options.map((option, index) => `
            <label class="option-label" style="display: block; margin: 10px 0; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
              <input type="radio" name="answer" value="${String.fromCharCode(65 + index)}" style="margin-right: 10px;">
              <span style="font-weight: 500;">${String.fromCharCode(65 + index)}.</span> ${option}
            </label>
          `).join('')}
        </div>
      `;
    } else if (question.question_type === 'numeric') {
      questionContent = `
        <div class="numeric-input" style="margin: 20px 0;">
          <input type="text" name="numeric-answer" placeholder="Enter your answer" 
                 style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; box-sizing: border-box;">
        </div>
      `;
    }
    
    return `
      <div class="quiz-content">
        <div class="quiz-header">
          <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px;">
            🎓 SAT Quiz Required
          </h2>
          <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
            Answer this question correctly to continue browsing
          </p>
          <div style="margin-bottom: 15px; padding: 8px 12px; background: #f8f9fa; border-radius: 6px; font-size: 12px; color: #666;">
            <strong>Category:</strong> ${question.tag} | <strong>Difficulty:</strong> ${question.difficulty}
          </div>
        </div>
        
        <div class="quiz-question">
          <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">
            ${question.question_text}
          </h3>
          
          ${question.instructions ? `
            <div style="margin: 15px 0;">
              <button id="instruction-toggle" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                margin-bottom: 10px;
              ">📖 Show Instructions</button>
              <div id="instruction-box" style="display: none; margin: 15px 0; padding: 10px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px; font-size: 14px; color: #1976d2;">
                <strong>Instructions:</strong> ${question.instructions}
              </div>
            </div>
          ` : ''}
          
          ${questionContent}
        </div>
      </div>
      
      <div class="quiz-footer">
        <button id="submit-answer" style="
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          opacity: 0.5;
          transition: all 0.2s;
        " disabled>
          Submit Answer
        </button>
        
        <div id="feedback" style="margin-top: 15px; font-weight: 500;"></div>
        <div id="attempts" style="margin-top: 10px; font-size: 14px; color: #666;">
          Attempts: ${this.attempts}/${EXTENSION_CONFIG.maxAttempts}
        </div>
      </div>
    `;
  }

  showModal() {
    if (this.modal) {
      this.modal.style.display = 'block';
      console.log('🎓 SAT Quiz Blocker: Modal displayed');
    }
  }

  hideModal() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }

  maintainBlockedState() {
    console.log('🎓 SAT Quiz Blocker: Maintaining blocked state for explanation review...');
    // Keep the website blocked but allow scrolling within the modal
    // The body overflow remains hidden, but scroll events within modal are allowed
    this.isBlocked = true;
    document.body.style.overflow = 'hidden';
  }

  async handleSubmit() {
    let userAnswer = '';
    let isValid = false;
    
    if (this.currentQuestion.question_type === 'multiple_choice') {
      const selectedAnswer = document.querySelector('input[name="answer"]:checked');
      if (selectedAnswer) {
        userAnswer = selectedAnswer.value;
        isValid = true;
      } else {
        this.showFeedback('Please select an answer.', 'error');
        return;
      }
    } else if (this.currentQuestion.question_type === 'numeric') {
      const answerInput = document.querySelector('input[name="numeric-answer"]');
      userAnswer = answerInput.value.trim();
      if (userAnswer) {
        isValid = true;
      } else {
        this.showFeedback('Please enter an answer.', 'error');
        return;
      }
    }
    
    if (!isValid) return;
    
    const correctAnswer = this.currentQuestion.correct_answer;
    let isCorrect = false;
    
    if (this.currentQuestion.question_type === 'multiple_choice') {
      isCorrect = userAnswer === correctAnswer;
    } else if (this.currentQuestion.question_type === 'numeric') {
      // For numeric questions, compare the answers (case-insensitive for text answers)
      isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
    }
    
    if (isCorrect) {
      this.showFeedback('✅ Correct! Review the explanation below.', 'success');
      
      // Show explanation immediately if available
      if (this.currentQuestion.explanation) {
        this.showExplanation();
      }
      
      await this.recordSuccess();
      
      // Maintain blocked state but allow modal scrolling
      this.maintainBlockedState();
      
      // Start countdown timer
      this.startCountdownTimer();
      
      // Allow clicking outside modal to close immediately
      this.enableClickOutsideToClose();
      
    } else {
      this.attempts++;
      const remainingAttempts = EXTENSION_CONFIG.maxAttempts - this.attempts;
      
      if (remainingAttempts > 0) {
        this.showFeedback(`❌ Incorrect. ${remainingAttempts} attempts remaining.`, 'error');
        this.updateAttemptsDisplay();
      } else {
        this.showFeedback('❌ No more attempts. Please try again later.', 'error');
        if (this.currentQuestion.explanation) {
          setTimeout(() => {
            this.showExplanation();
          }, 1000);
        }
        setTimeout(() => {
          this.unblockWebsite();
        }, 3000);
      }
    }
  }

  startCountdownTimer() {
    const timeInSeconds = Math.ceil(EXTENSION_CONFIG.explanationReviewTime / 1000);
    let timeLeft = timeInSeconds;
    const feedback = document.getElementById('feedback');
    
    // Create countdown display
    const countdownDiv = document.createElement('div');
    countdownDiv.id = 'countdown-timer';
    countdownDiv.style.cssText = `
      margin-top: 10px;
      font-size: 14px;
      color: #007bff;
      font-weight: 500;
    `;
    
    if (feedback) {
      feedback.appendChild(countdownDiv);
    }
    
    const updateCountdown = () => {
      if (timeLeft > 0) {
        countdownDiv.textContent = `Popup will close in ${timeLeft} seconds... (Click outside to close immediately)`;
        timeLeft--;
        setTimeout(updateCountdown, 1000);
      } else {
        this.unblockWebsite();
      }
    };
    
    updateCountdown();
  }

  enableClickOutsideToClose() {
    console.log('🎓 SAT Quiz Blocker: Enabling click outside to close functionality...');
    
    // Add click handler to modal to prevent event bubbling
    if (this.modal) {
      const handleModalClick = (event) => {
        // Stop the event from bubbling up to the overlay
        event.stopPropagation();
        console.log('🎓 SAT Quiz Blocker: Modal clicked, preventing event bubbling');
      };
      
      // Remove any existing handler first
      if (this.modalClickHandler) {
        this.modal.removeEventListener('click', this.modalClickHandler);
      }
      
      this.modal.addEventListener('click', handleModalClick);
      
      // Store the modal click handler for cleanup
      this.modalClickHandler = handleModalClick;
      
      console.log('🎓 SAT Quiz Blocker: Modal click handler added successfully');
    } else {
      console.error('🎓 SAT Quiz Blocker: Modal not found when trying to enable click outside');
    }
  }

  showExplanation() {
    const feedback = document.getElementById('feedback');
    if (feedback && this.currentQuestion.explanation) {
      // Remove any existing explanation
      const existingExplanation = feedback.querySelector('.explanation-box');
      if (existingExplanation) {
        existingExplanation.remove();
      }
      
      const explanationDiv = document.createElement('div');
      explanationDiv.className = 'explanation-box';
      explanationDiv.style.cssText = `
        margin-top: 15px;
        padding: 15px;
        background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
        border: 2px solid #2196f3;
        border-radius: 8px;
        font-size: 14px;
        text-align: left;
        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
        position: relative;
        word-wrap: break-word;
        overflow-wrap: break-word;
      `;
      
      explanationDiv.innerHTML = `
        <div style="font-weight: 600; color: #1976d2; margin-bottom: 8px; display: flex; align-items: center;">
          <span style="margin-right: 8px;">💡</span>
          Explanation
        </div>
        <div style="line-height: 1.5; color: #333; white-space: pre-wrap;">
          ${this.currentQuestion.explanation}
        </div>
      `;
      
      feedback.appendChild(explanationDiv);
      
      // Scroll to the explanation if it's not fully visible
      setTimeout(() => {
        const contentArea = this.modal.querySelector('.quiz-content');
        if (contentArea) {
          const explanationRect = explanationDiv.getBoundingClientRect();
          const contentRect = contentArea.getBoundingClientRect();
          
          if (explanationRect.bottom > contentRect.bottom) {
            explanationDiv.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest' 
            });
          }
        }
      }, 100);
    }
  }

  showFeedback(message, type) {
    const feedback = document.getElementById('feedback');
    if (feedback) {
      // Find the feedback text element or create one
      let feedbackText = feedback.querySelector('.feedback-text');
      if (!feedbackText) {
        feedbackText = document.createElement('div');
        feedbackText.className = 'feedback-text';
        feedbackText.style.cssText = `
          margin-bottom: 10px;
          font-weight: 500;
        `;
        feedback.insertBefore(feedbackText, feedback.firstChild);
      }
      
      feedbackText.textContent = message;
      feedbackText.style.color = type === 'success' ? '#28a745' : '#dc3545';
    }
  }

  updateAttemptsDisplay() {
    const attemptsDiv = document.getElementById('attempts');
    if (attemptsDiv) {
      attemptsDiv.textContent = `Attempts: ${this.attempts}/${EXTENSION_CONFIG.maxAttempts}`;
    }
  }

  async recordSuccess() {
    try {
      await this.setStorageData('lastQuizTime', Date.now());
      await this.setStorageData('questionsAnswered', 
        (await this.getStorageData('questionsAnswered') || 0) + 1
      );
      
      // Update total attempts
      const currentTotal = await this.getStorageData('totalAttempts') || 0;
      await this.setStorageData('totalAttempts', currentTotal + this.attempts + 1);
      
    } catch (error) {
      console.error('Error recording success:', error);
    }
  }

  unblockWebsite() {
    this.isBlocked = false;
    
    // Re-enable scrolling
    document.body.style.overflow = '';
    
    // Remove event listeners using the same bound handler
    document.removeEventListener('click', this.boundPreventDefault, true);
    document.removeEventListener('keydown', this.boundPreventDefault, true);
    document.removeEventListener('scroll', this.boundPreventDefault, true);
    document.removeEventListener('wheel', this.boundPreventDefault, true);
    document.removeEventListener('touchmove', this.boundPreventDefault, true);
    
    // Remove modal click handler if it exists
    if (this.modal && this.modalClickHandler) {
      this.modal.removeEventListener('click', this.modalClickHandler);
      this.modalClickHandler = null;
    }
    
    // Remove overlay and modal
    const overlay = document.getElementById('sat-quiz-overlay');
    if (overlay) overlay.remove();
    
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  // Chrome storage helpers
  async getStorageData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  async setStorageData(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }
}

// Initialize the script
try {
  console.log('🎓 SAT Quiz Blocker: Initializing content script...');
  const supabaseClient = new SupabaseClient();
  const quizBlockerInstance = new SATQuizBlocker(supabaseClient);
} catch (e) {
  console.error('Error initializing SAT Quiz Blocker:', e);
} 