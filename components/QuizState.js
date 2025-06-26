/**
 * QuizState - Manages quiz state, attempts, and persistence
 * Separates state management from UI logic
 */
class QuizState {
  constructor() {
    this.currentQuestion = null;
    this.attempts = 0;
    this.isReviewing = false;
    this.maxAttempts = EXTENSION_CONFIG.maxAttempts || 3;
    this.quizInterval = EXTENSION_CONFIG.quizInterval;
  }

  setCurrentQuestion(question) {
    this.currentQuestion = question;
    this.attempts = 0; // Reset attempts for new question
  }

  getCurrentQuestion() {
    return this.currentQuestion;
  }

  incrementAttempts() {
    this.attempts++;
    return this.attempts;
  }

  getAttempts() {
    return this.attempts;
  }

  getMaxAttempts() {
    return this.maxAttempts;
  }

  hasRemainingAttempts() {
    return this.attempts < this.maxAttempts;
  }

  getRemainingAttempts() {
    return Math.max(0, this.maxAttempts - this.attempts);
  }

  setReviewing(isReviewing) {
    this.isReviewing = isReviewing;
  }

  isInReviewMode() {
    return this.isReviewing;
  }

  checkAnswer(userAnswer) {
    if (!this.currentQuestion) return false;
    
    return userAnswer.toLowerCase() === this.currentQuestion.correct_answer.toLowerCase();
  }

  async shouldShowQuiz() {
    try {
      const lastQuizTime = await this.getStorageData('lastQuizTime');
      const currentTime = Date.now();
      
      // Show quiz if never taken or if interval has passed
      return !lastQuizTime || (currentTime - lastQuizTime) > this.quizInterval;
    } catch (error) {
      console.error('Error checking quiz status:', error);
      return true; // Show quiz on error
    }
  }

  async recordSuccess() {
    try {
      await this.setStorageData('lastQuizTime', Date.now());
      
      const questionsAnswered = await this.getStorageData('questionsAnswered') || 0;
      await this.setStorageData('questionsAnswered', questionsAnswered + 1);
      
      const totalAttempts = await this.getStorageData('totalAttempts') || 0;
      await this.setStorageData('totalAttempts', totalAttempts + this.attempts + 1);
      
      console.log('Quiz success recorded');
    } catch (error) {
      console.error('Error recording success:', error);
    }
  }

  async getStats() {
    try {
      const [questionsAnswered, totalAttempts, lastQuizTime] = await Promise.all([
        this.getStorageData('questionsAnswered'),
        this.getStorageData('totalAttempts'),
        this.getStorageData('lastQuizTime')
      ]);

      return {
        questionsAnswered: questionsAnswered || 0,
        totalAttempts: totalAttempts || 0,
        lastQuizTime: lastQuizTime || null
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        questionsAnswered: 0,
        totalAttempts: 0,
        lastQuizTime: null
      };
    }
  }

  async resetStats() {
    try {
      await Promise.all([
        this.setStorageData('questionsAnswered', 0),
        this.setStorageData('totalAttempts', 0),
        this.setStorageData('lastQuizTime', null)
      ]);
      
      console.log('Stats reset successfully');
      return true;
    } catch (error) {
      console.error('Error resetting stats:', error);
      return false;
    }
  }

  reset() {
    this.currentQuestion = null;
    this.attempts = 0;
    this.isReviewing = false;
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

  // Validation helpers
  validateQuestion(question) {
    if (!question) return false;
    if (!question.question_text) return false;
    if (!question.correct_answer) return false;
    
    if (question.question_type === 'multiple_choice') {
      if (!Array.isArray(question.answer_choices)) return false;
      if (question.answer_choices.length < 2) return false;
      
      // Validate correct answer index
      const correctIndex = question.correct_answer.charCodeAt(0) - 65;
      if (correctIndex < 0 || correctIndex >= question.answer_choices.length) return false;
    }
    
    return true;
  }

  getQuestionSummary() {
    if (!this.currentQuestion) return null;
    
    return {
      id: this.currentQuestion.id,
      type: this.currentQuestion.question_type,
      difficulty: this.currentQuestion.difficulty,
      tag: this.currentQuestion.tag,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts
    };
  }
} 