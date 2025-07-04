// Content script for SAT Quiz Blocker

// This script is injected after config.js and supabase-client.js
// so EXTENSION_CONFIG and SupabaseClient class are available.

import { supabase, getCurrentUserId, ensureAuth } from '../db/supabase-client.js';

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
        // Small delay to ensure overlay is properly created
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.log('🎓 SAT Quiz Blocker: Website already blocked');
      }
      
      console.log('🎓 SAT Quiz Blocker: Showing quiz...');
      await this.showQuiz();
      console.log('🎓 SAT Quiz Blocker: Force quiz completed');
    } catch (error) {
      console.error('🎓 SAT Quiz Blocker: Error in force quiz:', error);
      // Show error feedback to user
      this.showFeedback(`Failed to load quiz: ${error.message}. Please try again.`, 'error');
      // Don't immediately unblock, let user see the error
      setTimeout(() => {
        console.log('🎓 SAT Quiz Blocker: Unblocking due to force quiz error');
        this.unblockWebsite();
      }, EXTENSION_CONFIG.errorTimeout);
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
      console.log('🎓 SAT Quiz Blocker: Starting showQuiz...');
      console.log('🎓 SAT Quiz Blocker: Supabase client available?', !!this.supabaseClient);
      
      // Show loading state
      this.showFeedback('Loading quiz...', 'loading');
      
      if (!this.supabaseClient) {
        console.error('🎓 SAT Quiz Blocker: Supabase client is not available!');
        this.showFeedback('Error: Database connection not available. Please refresh the page.', 'error');
        // Use configurable timeout
        setTimeout(() => this.unblockWebsite(), EXTENSION_CONFIG.errorTimeout);
        return;
      }

      console.log('🎓 SAT Quiz Blocker: Fetching question from Supabase...');
      
      // Add retry mechanism for question fetching
      let retryCount = 0;
      const maxRetries = 3;
      let question = null;
      
      while (retryCount < maxRetries && !question) {
        try {
          this.showFeedback(`Loading quiz... (Attempt ${retryCount + 1}/${maxRetries})`, 'loading');
          question = await this.supabaseClient.getRandomQuestion();
          
          if (question) {
            console.log('🎓 SAT Quiz Blocker: Question received successfully:', question);
            break;
          } else {
            console.log(`🎓 SAT Quiz Blocker: No question received on attempt ${retryCount + 1}`);
            retryCount++;
            if (retryCount < maxRetries) {
              // Wait 2 seconds before retry
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch (error) {
          console.error(`🎓 SAT Quiz Blocker: Error on attempt ${retryCount + 1}:`, error);
          retryCount++;
          if (retryCount < maxRetries) {
            this.showFeedback(`Connection error, retrying... (${retryCount}/${maxRetries})`, 'error');
            // Wait 3 seconds before retry for network issues
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
      
      this.currentQuestion = question;
      
      if (!this.currentQuestion) {
        console.error('🎓 SAT Quiz Blocker: No valid questions available after multiple attempts.');
        this.showFeedback('No questions available. Please try again later or check your internet connection.', 'error');
        // Use configurable timeout
        setTimeout(() => this.unblockWebsite(), EXTENSION_CONFIG.errorTimeout);
        return;
      }

      // Validate question has required fields
      if (!this.currentQuestion.question_text) {
        console.error('🎓 SAT Quiz Blocker: Question missing text:', this.currentQuestion);
        this.showFeedback('Error: Invalid question data. Please refresh the page and try again.', 'error');
        // Use configurable timeout
        setTimeout(() => this.unblockWebsite(), EXTENSION_CONFIG.errorTimeout);
        return;
      }

      // Clear loading message
      this.clearFeedback();
      
      // No need for further validation here, as it's done in the client
      console.log('🎓 SAT Quiz Blocker: Creating modal for validated question...');
      this.createModal();
      this.showModal();
      
    } catch (error) {
      console.error('🎓 SAT Quiz Blocker: Error in showQuiz:', error);
      console.error('🎓 SAT Quiz Blocker: Error stack:', error.stack);
      
      // Show error message to user
      this.showFeedback(`Error loading quiz: ${error.message}. Please check your internet connection and try again.`, 'error');
      
      // Use configurable timeout
      setTimeout(() => {
        console.log('🎓 SAT Quiz Blocker: Unblocking due to error in showQuiz');
        this.unblockWebsite();
      }, EXTENSION_CONFIG.errorTimeout);
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
          
          // Remove 'selected' class from all option labels
          modal.querySelectorAll('.option-label').forEach(label => {
            label.classList.remove('selected');
          });
          
          // Add 'selected' class to the parent label of the checked radio
          const parentLabel = input.closest('.option-label');
          if (parentLabel) {
            parentLabel.classList.add('selected');
          }
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
      // Defensive: ensure options is a valid array and filter out invalid options
      let options = [];
      
      if (Array.isArray(question.answer_choices)) {
        options = question.answer_choices.filter(opt => {
          // Filter out null, undefined, non-strings, and empty strings
          return opt !== null && 
                 opt !== undefined && 
                 typeof opt === 'string' && 
                 opt.trim() !== '';
        });
      }
      
      console.log('🎓 SAT Quiz Blocker: Raw answer_choices:', question.answer_choices);
      console.log('🎓 SAT Quiz Blocker: Filtered options for rendering:', options);
      
      // Additional safety check - if we don't have enough valid options, show an error
      if (options.length < 2) {
        console.error('🎓 SAT Quiz Blocker: Not enough valid options for rendering. Options:', options);
        questionContent = `
          <div class="quiz-error" style="color: #dc3545; padding: 20px; text-align: center; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px;">
            <h4>⚠️ Question Error</h4>
            <p>This question has insufficient answer options.</p>
            <p>Question ID: ${question.id}</p>
            <p>Please report this issue to the administrator.</p>
          </div>
        `;
      } else {
        // Render valid options only
        questionContent = `
          <div class="quiz-options">
            ${options.map((option, index) => {
              // Double-check each option before rendering
              const safeOption = (option && typeof option === 'string') ? option.trim() : '';
              if (!safeOption) {
                console.warn('🎓 SAT Quiz Blocker: Skipping empty option at index:', index);
                return ''; // Skip empty options
              }
              
              return `
                <label class="option-label" style="display: block; margin: 10px 0; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                  <input type="radio" name="answer" value="${String.fromCharCode(65 + index)}" style="margin-right: 10px;">
                  <span style="font-weight: 500;">${String.fromCharCode(65 + index)}.</span> ${safeOption}
                </label>
              `;
            }).filter(html => html !== '').join('')}
          </div>
        `;
        
        // Log warning if some options were filtered out
        const renderedOptionsCount = options.filter(opt => opt && opt.trim()).length;
        if (renderedOptionsCount !== question.answer_choices?.length) {
          console.warn('🎓 SAT Quiz Blocker: Some options were filtered out during rendering');
          console.warn('🎓 SAT Quiz Blocker: Original count:', question.answer_choices?.length, 'Rendered count:', renderedOptionsCount);
        }
      }
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
    // Do NOT enter review mode to prevent clicking outside to close
    this.showFeedback('❌ You have reached the maximum number of attempts.', 'error');
    this.showExplanation(true); // Show explanation and reveal correct answer

    // Disable all inputs in the modal
    this.modal.querySelectorAll('input, button').forEach(el => el.disabled = true);
    
    // Start a "cooldown" period before unblocking
    const cooldownTime = EXTENSION_CONFIG.cooldownPeriod || 15000;
    const message = `Unlocking in ${Math.ceil(cooldownTime / 1000)} seconds...`;
    this.startCooldownTimer(cooldownTime, () => this.unblockWebsite(), message);
  }
  
  startCooldownTimer(duration, callback, customMessage) {
    let timeLeft = Math.ceil(duration / 1000);
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'cooldown-timer';
    timerDisplay.style.cssText = `margin-top: 15px; color: #6c757d; font-weight: 500;`;
    this.modal.querySelector('#feedback').appendChild(timerDisplay);

    const updateTimer = () => {
      if (timeLeft > 0) {
        const message = customMessage 
          ? customMessage.replace('${timeLeft}', timeLeft)
          : `You can continue in ${timeLeft}s. (Or click outside to close)`;
        timerDisplay.textContent = message;
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
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        font-size: 14px;
        text-align: left;
        position: relative;
        word-wrap: break-word;
        overflow-wrap: break-word;
        line-height: 1.4;
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
          <div style="padding: 8px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; margin-bottom: 8px; color: #856404; font-size: 13px;">
            <strong>Correct answer:</strong> ${correctAnswer} (${correctAnswerText})
          </div>
        `;
      }
      
      explanationDiv.innerHTML = `
        <div style="font-weight: 600; color: #495057; margin-bottom: 8px; font-size: 13px;">
          💡 Explanation
        </div>
        ${revealHtml}
        <div class="explanation-content" style="line-height: 1.4; color: #495057; white-space: pre-wrap; font-size: 13px;">
          ${this.currentQuestion.explanation}
        </div>
      `;
      
      feedback.appendChild(explanationDiv);
      
      // Dynamically constrain height only if needed
      setTimeout(() => {
        const content = explanationDiv.querySelector('.explanation-content');
        if (content && content.scrollHeight > 200) {
          explanationDiv.style.maxHeight = '200px';
          explanationDiv.style.overflowY = 'auto';
          explanationDiv.style.resize = 'vertical';
        } else {
          explanationDiv.style.maxHeight = '';
          explanationDiv.style.overflowY = '';
          explanationDiv.style.resize = '';
        }
      }, 0);
    }
  }

  showFeedback(message, type = '') {
    console.log(`🎓 SAT Quiz Blocker: Showing feedback - ${type}: ${message}`);
    
    // Clear any existing overlay messages first
    this.clearOverlayMessages();
    
    // If message is empty or just whitespace, clear feedback
    if (!message || !message.trim()) {
      this.clearFeedback();
      return;
    }
    
    // Try to show feedback in the modal first
    const feedback = this.findFeedbackElement();
    if (feedback) {
      console.log('🎓 SAT Quiz Blocker: Showing feedback in modal');
      this.displayFeedbackInModal(feedback, message, type);
      return;
    }
    
    // If modal doesn't exist yet, show message on overlay
    console.log('🎓 SAT Quiz Blocker: Modal not available, showing feedback on overlay');
    this.displayFeedbackOnOverlay(message, type);
  }

  findFeedbackElement() {
    // Try multiple ways to find the feedback element
    let feedback = null;
    
    // First, try within the modal if it exists
    if (this.modal) {
      feedback = this.modal.querySelector('#feedback');
    }
    
    // If not found, try in the document
    if (!feedback) {
      feedback = document.getElementById('feedback');
    }
    
    // If still not found, try to find it within any quiz modal
    if (!feedback) {
      const modal = document.getElementById('sat-quiz-modal');
      if (modal) {
        feedback = modal.querySelector('#feedback');
      }
    }
    
    return feedback;
  }

  displayFeedbackInModal(feedbackElement, message, type) {
    // Clear any existing content and classes
    feedbackElement.innerHTML = '';
    feedbackElement.className = '';
    
    // Set the message
    feedbackElement.textContent = message;
    
    // Apply appropriate styling
    if (type) {
      feedbackElement.classList.add(type);
    }
    
    // Ensure it's visible
    feedbackElement.style.display = 'block';
    
    // Add fade-in effect
    feedbackElement.style.opacity = '0';
    requestAnimationFrame(() => {
      feedbackElement.style.opacity = '1';
    });
  }

  displayFeedbackOnOverlay(message, type) {
    const overlay = document.getElementById('sat-quiz-overlay');
    if (!overlay) {
      console.warn('🎓 SAT Quiz Blocker: No overlay found for feedback display');
      return;
    }
    
    // Create message display
    const messageDiv = document.createElement('div');
    messageDiv.className = 'overlay-feedback';
    messageDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 400px;
      z-index: 1000001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    `;
    
    let icon, color, bgColor, borderColor;
    switch (type) {
      case 'error':
        icon = '⚠️';
        color = '#dc3545';
        bgColor = '#fdecea';
        borderColor = '#f5c6cb';
        break;
      case 'loading':
        icon = '⏳';
        color = '#007bff';
        bgColor = '#e3f2fd';
        borderColor = '#bee5eb';
        break;
      case 'success':
        icon = '✅';
        color = '#28a745';
        bgColor = '#e9f7ef';
        borderColor = '#c3e6cb';
        break;
      default:
        icon = 'ℹ️';
        color = '#6c757d';
        bgColor = '#f8f9fa';
        borderColor = '#dee2e6';
    }
    
    messageDiv.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 15px;">${icon}</div>
      <div style="color: ${color}; font-weight: 600; margin-bottom: 10px; text-transform: uppercase;">
        ${type === 'loading' ? 'Loading' : type || 'Info'}
      </div>
      <div style="color: #333; line-height: 1.5; padding: 10px; background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 6px;">
        ${message}
      </div>
    `;
    
    overlay.appendChild(messageDiv);
    
    // Fade in the message
    requestAnimationFrame(() => {
      messageDiv.style.opacity = '1';
    });
  }

  clearFeedback() {
    console.log('🎓 SAT Quiz Blocker: Clearing feedback');
    
    // Clear modal feedback
    const feedback = this.findFeedbackElement();
    if (feedback) {
      feedback.innerHTML = '';
      feedback.className = '';
      feedback.style.display = 'none';
    }
    
    // Clear overlay messages
    this.clearOverlayMessages();
  }

  clearOverlayMessages() {
    const overlay = document.getElementById('sat-quiz-overlay');
    if (overlay) {
      // Remove old overlay messages
      const existingMessages = overlay.querySelectorAll('.overlay-feedback, .overlay-error');
      existingMessages.forEach(msg => msg.remove());
    }
  }

  updateAttemptsDisplay() {
    const attemptsDisplay = document.getElementById('attempts');
    if (attemptsDisplay) {
      attemptsDisplay.textContent = `Attempts: ${this.attempts}/${EXTENSION_CONFIG.maxAttempts}`;
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
  console.log('🎓 SAT Quiz Blocker: Checking if SupabaseClient is available...');
  
  if (typeof supabase === 'undefined') {
    console.error('🎓 SAT Quiz Blocker: SupabaseClient class is not defined!');
    throw new Error('SupabaseClient class not found. Check if supabase-client.js is loaded.');
  }
  
  console.log('🎓 SAT Quiz Blocker: Creating Supabase client...');
  const supabaseClient = supabase;
  console.log('🎓 SAT Quiz Blocker: Supabase client created successfully');
  
  console.log('🎓 SAT Quiz Blocker: Creating quiz blocker instance...');
  const quizBlockerInstance = new SATQuizBlocker(supabaseClient);
  console.log('🎓 SAT Quiz Blocker: Quiz blocker instance created successfully');
  
} catch (e) {
  console.error('🎓 SAT Quiz Blocker: Error initializing SAT Quiz Blocker:', e);
  console.error('🎓 SAT Quiz Blocker: Error stack:', e.stack);
  
  // Show error on page if possible
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
  `;
  errorDiv.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">SAT Quiz Extension Error</div>
    <div style="font-size: 12px;">${e.message}</div>
  `;
  document.body.appendChild(errorDiv);
  
  // Remove error after 10 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 10000);
} 