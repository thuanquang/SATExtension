/**
 * FeedbackManager - Handles all feedback display, messages, and explanations
 * Separates feedback logic from business logic
 */
class FeedbackManager {
  constructor() {
    this.feedbackElement = null;
    this.overlayElement = null;
  }

  setFeedbackElement(element) {
    this.feedbackElement = element;
  }

  setOverlayElement(element) {
    this.overlayElement = element;
  }

  showMessage(message, type = 'info') {
    const feedback = this._findFeedbackElement();
    
    if (feedback) {
      this._displayInModal(feedback, message, type);
    } else if (this.overlayElement) {
      this._displayOnOverlay(message, type);
    } else {
      console.warn('No feedback element available');
    }
  }

  showExplanation(question, revealAnswer = false) {
    if (!question.explanation) return;

    const feedback = this._findFeedbackElement();
    if (!feedback) return;

    // Remove existing explanations
    this._clearExplanations(feedback);

    // Create explanation container
    const explanationDiv = document.createElement('div');
    explanationDiv.className = 'explanation-box';

    // Add content
    const content = [];
    
    // Header
    content.push('<div class="explanation-header">💡 Explanation</div>');

    // Correct answer reveal (if needed)
    if (revealAnswer) {
      const correctAnswer = this._formatCorrectAnswer(question);
      content.push(`<div class="correct-answer-reveal">${correctAnswer}</div>`);
    }

    // Explanation text
    content.push(`<div class="explanation-content">${question.explanation}</div>`);

    explanationDiv.innerHTML = content.join('');
    feedback.appendChild(explanationDiv);

    // Apply dynamic height constraint if needed
    this._applyHeightConstraint(explanationDiv);
  }

  showTimer(timeLeft, message = null) {
    const feedback = this._findFeedbackElement();
    if (!feedback) return;

    let timerDiv = feedback.querySelector('.countdown-timer');
    if (!timerDiv) {
      timerDiv = document.createElement('div');
      timerDiv.className = 'countdown-timer';
      feedback.appendChild(timerDiv);
    }

    const defaultMessage = `You can continue in ${timeLeft}s. (Or click outside to close)`;
    timerDiv.textContent = message || defaultMessage;
  }

  clear() {
    const feedback = this._findFeedbackElement();
    if (feedback) {
      feedback.innerHTML = '';
      feedback.className = 'feedback-container';
    }

    this._clearOverlayMessages();
  }

  updateAttempts(current, max) {
    const attemptsElement = document.getElementById('attempts');
    if (attemptsElement) {
      attemptsElement.textContent = `Attempts: ${current}/${max}`;
    }
  }

  _findFeedbackElement() {
    // Try multiple strategies to find feedback element
    if (this.feedbackElement) return this.feedbackElement;
    
    return document.getElementById('feedback') || 
           document.querySelector('.feedback-container') ||
           document.querySelector('#sat-quiz-modal #feedback');
  }

  _displayInModal(feedbackElement, message, type) {
    feedbackElement.innerHTML = '';
    feedbackElement.className = `feedback-container ${type}`;
    feedbackElement.textContent = message;

    // Fade-in effect
    feedbackElement.style.opacity = '0';
    requestAnimationFrame(() => {
      feedbackElement.style.opacity = '1';
    });
  }

  _displayOnOverlay(message, type) {
    if (!this.overlayElement) return;

    // Clear existing messages
    this._clearOverlayMessages();

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `overlay-feedback ${type}`;
    
    messageDiv.innerHTML = `
      <div class="overlay-icon">${this._getTypeIcon(type)}</div>
      <div class="overlay-title">${this._getTypeTitle(type)}</div>
      <div class="overlay-message">${message}</div>
    `;

    this.overlayElement.appendChild(messageDiv);

    // Fade in
    requestAnimationFrame(() => {
      messageDiv.style.opacity = '1';
    });
  }

  _clearExplanations(feedback) {
    const existingExplanations = feedback.querySelectorAll('.explanation-box');
    existingExplanations.forEach(el => el.remove());
  }

  _clearOverlayMessages() {
    if (!this.overlayElement) return;
    
    const messages = this.overlayElement.querySelectorAll('.overlay-feedback');
    messages.forEach(msg => msg.remove());
  }

  _formatCorrectAnswer(question) {
    const correctAnswer = question.correct_answer;
    let correctAnswerText = correctAnswer;
    
    if (question.question_type === 'multiple_choice') {
      const correctIndex = correctAnswer.charCodeAt(0) - 65;
      correctAnswerText = question.answer_choices[correctIndex];
    }

    return `<strong>Correct answer:</strong> ${correctAnswer} (${correctAnswerText})`;
  }

  _applyHeightConstraint(explanationDiv) {
    setTimeout(() => {
      const content = explanationDiv.querySelector('.explanation-content');
      if (content && content.scrollHeight > 200) {
        explanationDiv.classList.add('scrollable');
      }
    }, 0);
  }

  _getTypeIcon(type) {
    const icons = {
      'success': '✅',
      'error': '⚠️',
      'loading': '⏳',
      'info': 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  _getTypeTitle(type) {
    const titles = {
      'success': 'Success',
      'error': 'Error', 
      'loading': 'Loading',
      'info': 'Information'
    };
    return titles[type] || titles.info;
  }
} 