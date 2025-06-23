// Content script for SAT Quiz Blocker

// This script is injected after config.js and supabase-client.js
// so EXTENSION_CONFIG and SupabaseClient class are available.

class SATQuizBlocker {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
    this.isBlocked = false;
    this.isReviewing = false;
    this.currentQuestion = null;
    this.attempts = 0;
    this.modal = null;
    console.log('🎓 SAT Quiz Blocker: Initializing...');

    // Bind event handlers once to `this`
    this.boundPreventDefault = this.preventDefault.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);
    
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
    
    // Disable scrolling on both html and body for better cross-browser support
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    
    // Add event listeners for non-scroll events
    document.addEventListener('click', this.boundPreventDefault, true);
    document.addEventListener('keydown', this.boundPreventDefault, true);
    document.addEventListener('touchmove', this.boundPreventDefault, true);

    // Add a dedicated, non-passive listener for wheel events to ensure we can prevent them
    document.addEventListener('wheel', this.boundHandleWheel, { capture: true, passive: false });
    
    // Add overlay
    this.addOverlay();
  }

  handleWheel(event) {
    // Use elementFromPoint to get the topmost element under the cursor
    const topElement = document.elementFromPoint(event.clientX, event.clientY);

    // If the element under the cursor is inside our modal, let the event proceed.
    // This allows the modal's content to be scrolled.
    if (this.modal && this.modal.contains(topElement)) {
      return;
    }

    // If we're outside the modal, block the wheel event to prevent background scroll.
    event.preventDefault();
    event.stopPropagation();
  }

  preventDefault(event) {
    // This function now only handles non-wheel events like clicks and keydowns.
    // The primary rule: if the event target is inside the modal, allow it.
    if (this.modal && this.modal.contains(event.target)) {
      return;
    }

    // Secondary rule: if in review mode, allow clicks on the overlay to close the quiz.
    if (this.isReviewing && event.type === 'click' && event.target.id === 'sat-quiz-overlay') {
      this.unblockWebsite();
      return;
    }
    
    // Default case: block every other event outside the modal.
    event.preventDefault();
    event.stopPropagation();
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
    const submitBtn = this.modal.querySelector('#submit-answer');
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    submitBtn.textContent = 'Submitting...';

    let userAnswer = '';
    if (this.currentQuestion.question_type === 'multiple_choice') {
      const selectedAnswer = this.modal.querySelector('input[name="answer"]:checked');
      userAnswer = selectedAnswer ? selectedAnswer.value : '';
    } else if (this.currentQuestion.question_type === 'numeric') {
      const answerInput = this.modal.querySelector('input[name="numeric-answer"]');
      userAnswer = answerInput.value.trim();
    }

    if (!userAnswer) {
      this.showFeedback('Please select or enter an answer.', 'error');
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.textContent = 'Submit Answer';
      return;
    }

    const isCorrect = userAnswer.toLowerCase() === this.currentQuestion.correct_answer.toLowerCase();

    if (isCorrect) {
      await this.handleCorrectAnswer();
    } else {
      this.handleIncorrectAnswer();
    }
  }

  async handleCorrectAnswer() {
    this.isReviewing = true; // Enter review mode
    this.showFeedback('✅ Correct! Well done.', 'success');
    this.showExplanation();
    await this.recordSuccess();

    // Disable all inputs in the modal
    this.modal.querySelectorAll('input, button').forEach(el => el.disabled = true);

    // Wait for explanation review time before unblocking
    const reviewTime = EXTENSION_CONFIG.explanationReviewTime || 10000;
    this.startCooldownTimer(reviewTime, () => this.unblockWebsite());
  }

  handleIncorrectAnswer() {
    this.attempts++;
    this.updateAttemptsDisplay();
    const remainingAttempts = EXTENSION_CONFIG.maxAttempts - this.attempts;

    if (remainingAttempts > 0) {
      this.showFeedback(`❌ Incorrect. You have ${remainingAttempts} attempts left.`, 'error');
      const submitBtn = this.modal.querySelector('#submit-answer');
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.textContent = 'Submit Answer';
    } else {
      this.handleMaxAttempts();
    }
  }

  handleMaxAttempts() {
    this.isReviewing = true; // Enter review mode
    this.showFeedback('❌ You have reached the maximum number of attempts.', 'error');
    this.showExplanation(true); // Show explanation and reveal correct answer

    // Disable all inputs in the modal
    this.modal.querySelectorAll('input, button').forEach(el => el.disabled = true);
    
    // Start a "cooldown" period before unblocking
    const cooldownTime = EXTENSION_CONFIG.cooldownPeriod || 15000;
    this.startCooldownTimer(cooldownTime, () => this.unblockWebsite());
  }
  
  startCooldownTimer(duration, callback) {
    let timeLeft = Math.ceil(duration / 1000);
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'cooldown-timer';
    timerDisplay.style.cssText = `margin-top: 15px; color: #6c757d; font-weight: 500;`;
    this.modal.querySelector('#feedback').appendChild(timerDisplay);

    const updateTimer = () => {
      if (timeLeft > 0) {
        timerDisplay.textContent = `You can continue in ${timeLeft}s. (Or click outside to close)`;
        timeLeft--;
        setTimeout(updateTimer, 1000);
      } else {
        callback();
      }
    };
    updateTimer();
  }

  showExplanation(revealAnswer = false) {
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
      
      let revealHtml = '';
      if (revealAnswer) {
        const correctAnswer = this.currentQuestion.correct_answer;
        let correctAnswerText = correctAnswer;
        
        if (this.currentQuestion.question_type === 'multiple_choice') {
          const correctIndex = correctAnswer.charCodeAt(0) - 65;
          correctAnswerText = this.currentQuestion.answer_choices[correctIndex];
        }

        revealHtml = `
          <div style="padding: 10px; background: #fff3cd; border-radius: 6px; margin-bottom: 12px; color: #856404;">
            <strong>The correct answer is:</strong> ${correctAnswer} (${correctAnswerText})
          </div>
        `;
      }
      
      explanationDiv.innerHTML = `
        <div style="font-weight: 600; color: #1976d2; margin-bottom: 8px; display: flex; align-items: center;">
          <span style="margin-right: 8px;">💡</span>
          Explanation
        </div>
        ${revealHtml}
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
    console.log('🎓 SAT Quiz Blocker: Unblocking website...');
    this.isBlocked = false;
    this.isReviewing = false;

    // Re-enable scrolling
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    // Remove event listeners
    document.removeEventListener('click', this.boundPreventDefault, true);
    document.removeEventListener('keydown', this.boundPreventDefault, true);
    document.removeEventListener('touchmove', this.boundPreventDefault, true);
    document.removeEventListener('wheel', this.boundHandleWheel, { capture: true, passive: false });
    
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