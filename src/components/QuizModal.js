/**
 * QuizModal - Handles modal creation, rendering, and UI interactions
 * Separates UI concerns from business logic
 */
class QuizModal {
  constructor() {
    this.modal = null;
    this.onSubmit = null;
    this.onInstructionToggle = null;
  }

  create(question) {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'quiz-overlay';
    // Create modal
    this.modal = document.createElement('div');
    this.modal.id = 'sat-quiz-modal';
    this.modal.className = 'quiz-modal';
    this.modal.innerHTML = this._generateModalHTML(question);
    this._attachEventListeners();
    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
    return this.modal;
  }

  show() {
    if (this.modal) {
      this.modal.style.display = 'block';
    }
  }

  hide() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }

  remove() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
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
          <h2 class="quiz-title">🎓 SAT Quiz Required</h2>
          <p class="quiz-subtitle">Answer this question correctly to continue browsing</p>
          <div class="quiz-meta">
            <strong>Category:</strong> ${question.tag} | <strong>Difficulty:</strong> ${question.difficulty}
          </div>
        </div>
        
        <div class="quiz-question">
          <h3 class="question-text">${question.question_text}</h3>
          
          ${question.instructions ? `
            <div class="instruction-section">
              <button id="instruction-toggle" class="instruction-toggle">📖 Show Instructions</button>
              <div id="instruction-box" class="instruction-box hidden">
                <strong>Instructions:</strong> ${question.instructions}
              </div>
            </div>
          ` : ''}
          
          ${this._generateQuestionContent(question)}
        </div>
      </div>
      
      <div class="quiz-footer">
        <button id="submit-answer" class="submit-button disabled" disabled>Submit Answer</button>
        <div id="feedback" class="feedback-container"></div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <div id="footer-attempts" class="attempts-counter">Attempts: 0/3</div>
          <div id="footer-timer" class="countdown-timer"></div>
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
        <div class="quiz-error">
          <h4>⚠️ Question Error</h4>
          <p>This question has insufficient answer options.</p>
          <p>Question ID: ${question.id}</p>
          <p>Please report this issue to the administrator.</p>
        </div>
      `;
    }

    return `
      <div class="quiz-options">
        ${options.map((option, index) => `
          <label class="option-label">
            <input type="radio" name="answer" value="${String.fromCharCode(65 + index)}">
            <span class="option-letter">${String.fromCharCode(65 + index)}.</span>
            <span class="option-text">${option}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  _generateNumericInput() {
    return `
      <div class="numeric-input">
        <input type="text" name="numeric-answer" class="numeric-answer" placeholder="Enter your answer">
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
        instructionToggle.textContent = isVisible ? '📖 Hide Instructions' : '📖 Show Instructions';
        
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
} 