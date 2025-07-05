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

  showExplanation(question, revealAnswer = false, isReviewMode = false) {
    const feedback = this._findFeedbackElement();
    if (!feedback || !question.explanation) return;
    // Remove any existing explanation
    const existingExplanation = feedback.querySelector('.explanation-box');
    if (existingExplanation) existingExplanation.remove();
    const explanationDiv = document.createElement('div');
    explanationDiv.className = 'explanation-box';
    if (isReviewMode) explanationDiv.classList.add('scrollable');
    let revealHtml = '';
    if (revealAnswer) {
      const correctAnswer = question.correct_answer;
      let correctAnswerText = correctAnswer;
      if (question.question_type === 'multiple_choice') {
        const correctIndex = correctAnswer.charCodeAt(0) - 65;
        correctAnswerText = question.answer_choices[correctIndex];
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
        ${question.explanation}
      </div>
    `;
    feedback.appendChild(explanationDiv);
  }

  showTimer(timeLeft, message = null) {
    const timerDiv = document.getElementById('footer-timer');
    if (!timerDiv) return;
    const defaultMessage = `You can continue in ${timeLeft}s. (Or click outside to close)`;
    timerDiv.textContent = message || defaultMessage;
  }

  clearTimer() {
    const timerDiv = document.getElementById('footer-timer');
    if (timerDiv) timerDiv.textContent = '';
  }

  clear() {
    const feedback = this._findFeedbackElement();
    if (feedback) {
      feedback.innerHTML = '';
      // Use setAttribute to avoid SVG element issues
      if (feedback.setAttribute) {
        feedback.setAttribute('class', 'feedback-container');
      } else {
        feedback.className = 'feedback-container';
      }
    }

    this._clearOverlayMessages();
  }

  updateAttempts(current, max) {
    const attemptsElement = document.getElementById('footer-attempts');
    if (attemptsElement) {
      attemptsElement.textContent = `Attempts: ${current}/${max}`;
    }
  }

  _findFeedbackElement() {
    // Try multiple strategies to find feedback element
    if (this.feedbackElement) return this.feedbackElement;
    
    // Only return HTML elements, not SVG elements
    const candidates = [
      document.getElementById('feedback'),
      document.querySelector('.feedback-container'),
      document.querySelector('#sat-quiz-modal #feedback')
    ].filter(el => el && el.tagName && el.tagName.toLowerCase() !== 'svg');
    
    return candidates[0] || null;
  }

  _displayInModal(feedbackElement, message, type) {
    feedbackElement.innerHTML = '';
    // Use setAttribute to avoid SVG element issues
    if (feedbackElement.setAttribute) {
      feedbackElement.setAttribute('class', `feedback-container ${type}`);
    } else {
      feedbackElement.className = `feedback-container ${type}`;
    }
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
    // Use setAttribute to avoid SVG element issues
    if (messageDiv.setAttribute) {
      messageDiv.setAttribute('class', `overlay-feedback ${type}`);
    } else {
      messageDiv.className = `overlay-feedback ${type}`;
    }
    
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

// Make FeedbackManager globally accessible
window.FeedbackManager = FeedbackManager; 