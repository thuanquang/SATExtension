/**
 * QuizModal - Handles modal creation, rendering, and UI interactions
 * Separates UI concerns from business logic
 */
class QuizModal {
  constructor() {
    this.modal = null;
    this.overlay = null;
    this.onSubmit = null;
    this.onInstructionToggle = null;
  }

  create(question, existingOverlay = null) {
    // Use existing overlay or create a new one
    if (existingOverlay) {
      this.overlay = existingOverlay;
    } else {
      this.overlay = document.createElement('div');
      this.overlay.className = 'quiz-overlay';
      document.body.appendChild(this.overlay);
    }
    
    // Set accessibility attributes for overlay
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-hidden', 'false');
    this.overlay.setAttribute('aria-labelledby', 'quiz-title');
    this.overlay.setAttribute('aria-describedby', 'quiz-subtitle');
    
    // Create modal
    this.modal = document.createElement('div');
    this.modal.id = 'sat-quiz-modal';
    this.modal.className = 'quiz-modal';
    this.modal.setAttribute('tabindex', '-1');
    this.modal.innerHTML = this._generateModalHTML(question);
    this._attachEventListeners();
    
    // Append modal to overlay
    this.overlay.appendChild(this.modal);
    
    // Ensure overlay is visible
    this.overlay.style.display = 'flex';
    
    // Focus management
    this._setupFocusManagement();
    
    return this.modal;
  }

  show() {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      this.overlay.setAttribute('aria-hidden', 'false');
    }
    if (this.modal) {
      this.modal.style.display = 'flex';
      // Focus the modal for screen readers
      setTimeout(() => {
        this.modal.focus();
      }, 100);
    }
  }

  hide() {
    if (this.overlay) {
      this.overlay.style.display = 'none';
      this.overlay.setAttribute('aria-hidden', 'true');
    }
  }

  remove() {
    // Restore focus before removing
    this._restoreFocus();
    
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    // Only remove overlay if we created it (not passed from BlockManager)
    if (this.overlay && !this.overlay.id) {
      this.overlay.remove();
    }
    this.overlay = null;
  }

  disableInputs() {
    if (this.modal) {
      this.modal.querySelectorAll('input, button').forEach(el => el.disabled = true);
    }
  }

  getUserAnswer(questionType) {
    if (!this.modal) return '';

    if (questionType === 'multiple_choice') {
      const selectedAnswer = this.modal.querySelector('input[name="answer"]:checked');
      return selectedAnswer ? selectedAnswer.value : '';
    } else if (questionType === 'numeric') {
      const answerInput = this.modal.querySelector('input[name="numeric-answer"]');
      return answerInput ? answerInput.value.trim() : '';
    }
    return '';
  }

  setSubmitButton(text, disabled = false) {
    const submitBtn = this.modal?.querySelector('#submit-answer');
    if (submitBtn) {
      submitBtn.textContent = text;
      submitBtn.disabled = disabled;
      submitBtn.classList.toggle('disabled', disabled);
    }
  }

  _generateModalHTML(question) {
    return `
      <div class="quiz-content">
        <div class="quiz-header">
          <h2 id="quiz-title" class="quiz-title">🎓 SAT Quiz Required</h2>
          <p id="quiz-subtitle" class="quiz-subtitle">Answer this question correctly to continue browsing</p>
          <div class="quiz-meta">
            <strong>Category:</strong> ${question.tag} | <strong>Difficulty:</strong> ${question.difficulty}
          </div>
        </div>
        
        <div class="quiz-question">
          <h3 class="question-text" role="heading" aria-level="3">${question.question_text}</h3>
          
          ${question.instructions ? `
            <div class="instruction-section">
              <button id="instruction-toggle" class="instruction-toggle" aria-expanded="false" aria-controls="instruction-box">📖 Show Instructions</button>
              <div id="instruction-box" class="instruction-box hidden" aria-hidden="true">
                <strong>Instructions:</strong> ${question.instructions}
              </div>
            </div>
          ` : ''}
          
          ${this._generateQuestionContent(question)}
        </div>
      </div>
      
      <div class="quiz-footer">
        <button id="submit-answer" class="submit-button disabled" disabled aria-describedby="footer-attempts">Submit Answer</button>
        <div id="feedback" class="feedback-container" role="status" aria-live="polite"></div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <div id="footer-attempts" class="attempts-counter">Attempts: 0/3</div>
          <div id="footer-timer" class="countdown-timer" role="timer" aria-live="polite"></div>
        </div>
      </div>
    `;
  }

  _generateQuestionContent(question) {
    if (question.question_type === 'multiple_choice') {
      return this._generateMultipleChoiceOptions(question);
    } else if (question.question_type === 'numeric') {
      return this._generateNumericInput();
    }
    return '';
  }

  _generateMultipleChoiceOptions(question) {
    const options = this._filterValidOptions(question.answer_choices);
    
    if (options.length < 2) {
      return `
        <div class="quiz-error" role="alert">
          <h4>⚠️ Question Error</h4>
          <p>This question has insufficient answer options.</p>
          <p>Question ID: ${question.id}</p>
          <p>Please report this issue to the administrator.</p>
        </div>
      `;
    }

    return `
      <fieldset class="quiz-options" role="radiogroup" aria-labelledby="quiz-title">
        <legend class="sr-only">Choose your answer</legend>
        ${options.map((option, index) => `
          <label class="option-label">
            <input type="radio" name="answer" value="${String.fromCharCode(65 + index)}" aria-describedby="option-${index}-text">
            <span class="option-letter">${String.fromCharCode(65 + index)}.</span>
            <span class="option-text" id="option-${index}-text">${option}</span>
          </label>
        `).join('')}
      </fieldset>
    `;
  }

  _generateNumericInput() {
    return `
      <div class="numeric-input">
        <label for="numeric-answer-input" class="sr-only">Enter your numeric answer</label>
        <input type="text" id="numeric-answer-input" name="numeric-answer" class="numeric-answer" placeholder="Enter your answer" aria-describedby="quiz-title" autocomplete="off">
      </div>
    `;
  }

  _filterValidOptions(answerChoices) {
    if (!Array.isArray(answerChoices)) return [];
    
    return answerChoices.filter(opt => 
      opt !== null && 
      opt !== undefined && 
      typeof opt === 'string' && 
      opt.trim() !== ''
    );
  }

  _attachEventListeners() {
    const submitBtn = this.modal.querySelector('#submit-answer');
    const instructionToggle = this.modal.querySelector('#instruction-toggle');
    const instructionBox = this.modal.querySelector('#instruction-box');

    // Submit button
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (this.onSubmit) this.onSubmit();
      });
    }

    // Instruction toggle
    if (instructionToggle && instructionBox) {
      instructionToggle.addEventListener('click', () => {
        instructionBox.classList.toggle('hidden');
        const isVisible = !instructionBox.classList.contains('hidden');
        
        // Update button text and ARIA attributes
        instructionToggle.textContent = isVisible ? '📖 Hide Instructions' : '📖 Show Instructions';
        instructionToggle.setAttribute('aria-expanded', isVisible.toString());
        instructionBox.setAttribute('aria-hidden', (!isVisible).toString());
        
        if (this.onInstructionToggle) this.onInstructionToggle(isVisible);
      });
    }

    // Answer selection for multiple choice
    const answerInputs = this.modal.querySelectorAll('input[name="answer"]');
    answerInputs.forEach(input => {
      input.addEventListener('change', () => {
        this._handleAnswerSelection();
        this._updateSelectedOption(input);
      });
    });

    // Answer input for numeric
    const numericInput = this.modal.querySelector('input[name="numeric-answer"]');
    if (numericInput) {
      numericInput.addEventListener('input', () => {
        this._handleAnswerSelection();
      });
    }
  }

  _handleAnswerSelection() {
    const submitBtn = this.modal.querySelector('#submit-answer');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('disabled');
    }
  }

  _updateSelectedOption(selectedInput) {
    // Remove selected class from all options
    this.modal.querySelectorAll('.option-label').forEach(label => {
      label.classList.remove('selected');
    });

    // Add selected class to the current option
    const parentLabel = selectedInput.closest('.option-label');
    if (parentLabel) {
      parentLabel.classList.add('selected');
    }
  }

  _setupFocusManagement() {
    // Store the currently focused element before showing modal
    this.previouslyFocusedElement = document.activeElement;
    
    // Set up keyboard event handlers for modal
    this.keydownHandler = (event) => {
      if (event.key === 'Escape') {
        // Only allow escape in review mode
        if (this.isReviewMode) {
          this.remove();
        }
      } else if (event.key === 'Tab') {
        this._trapFocus(event);
      }
    };
    
    document.addEventListener('keydown', this.keydownHandler);
  }

  _restoreFocus() {
    // Remove keyboard event handlers
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
    
    // Restore focus to the previously focused element
    if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
      this.previouslyFocusedElement.focus();
    }
  }

  _trapFocus(event) {
    if (!this.modal) return;
    
    const focusableElements = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      if (document.activeElement === firstFocusableElement) {
        lastFocusableElement.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusableElement) {
        firstFocusableElement.focus();
        event.preventDefault();
      }
    }
  }

  setReviewMode(isReviewMode) {
    this.isReviewMode = isReviewMode;
  }
} 