/**
 * XPManager - Handles XP calculation, leveling, and progression
 * Integrates with user progress tracking and provides level-based benefits
 */

class XPManager {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
    this.levelThresholds = this._calculateLevelThresholds();
  }

  /**
   * Calculate XP thresholds for each level
   * Progressive difficulty: 1-5 (100 XP each), 6-10 (200 XP each), etc.
   */
  _calculateLevelThresholds() {
    const thresholds = [0]; // Level 1 starts at 0 XP
    let currentXP = 0;
    
    for (let level = 2; level <= 50; level++) {
      if (level <= 5) {
        currentXP += 100;
      } else if (level <= 10) {
        currentXP += 200;
      } else if (level <= 15) {
        currentXP += 300;
      } else if (level <= 20) {
        currentXP += 400;
      } else {
        currentXP += 500;
      }
      thresholds.push(currentXP);
    }
    
    return thresholds;
  }

  /**
   * Get user's current progress including XP, level, and next level requirements
   */
  async getUserProgress() {
    try {
      const userId = await window.getCurrentUserId();
      
      const { data, error } = await window.supabaseQuery('user_progress', 'select', null, { user_id: userId });
      
      if (error) {
        console.error('Error fetching user progress:', error);
        return this._getDefaultProgress();
      }
      
      if (!data || data.length === 0) {
        // Initialize user progress if not exists
        return await this.initializeUserProgress();
      }
      
      const progress = data[0];
      return this._enrichProgressData(progress);
      
    } catch (error) {
      console.error('Exception in getUserProgress:', error);
      return this._getDefaultProgress();
    }
  }

  /**
   * Initialize user progress with default values
   */
  async initializeUserProgress() {
    try {
      const userId = await window.getCurrentUserId();
      
      const defaultProgress = {
        user_id: userId,
        total_xp: 0,
        current_level: 1,
        questions_answered: 0,
        questions_correct: 0,
        current_streak: 0,
        longest_streak: 0,
        last_quiz_time: new Date().toISOString()
      };
      
      const { data, error } = await window.supabaseQuery('user_progress', 'upsert', defaultProgress);
      
      if (error) {
        console.error('Error initializing user progress:', error);
        return this._getDefaultProgress();
      }
      
      return this._enrichProgressData(defaultProgress);
      
    } catch (error) {
      console.error('Exception in initializeUserProgress:', error);
      return this._getDefaultProgress();
    }
  }

  /**
   * Award XP to user and handle level ups
   */
  async awardXP(xpAmount, context = {}) {
    try {
      const userId = await window.getCurrentUserId();
      const currentProgress = await this.getUserProgress();
      
      const newTotalXP = currentProgress.totalXP + xpAmount;
      const newLevel = this.calculateLevelFromXP(newTotalXP);
      const leveledUp = newLevel > currentProgress.currentLevel;
      
      // Update user progress
      const updatedProgress = {
        user_id: userId,
        total_xp: newTotalXP,
        current_level: newLevel,
        last_quiz_time: new Date().toISOString()
      };
      
      const { data, error } = await window.supabaseQuery('user_progress', 'upsert', updatedProgress);
      
      if (error) {
        console.error('Error awarding XP:', error);
        return { success: false, error: error.message };
      }
      
      // XP transaction recorded successfully
      
      const result = {
        success: true,
        xpGained: xpAmount,
        newTotalXP: newTotalXP,
        newLevel: newLevel,
        leveledUp: leveledUp,
        previousLevel: currentProgress.currentLevel
      };
      
      if (leveledUp) {
        result.levelUpRewards = await this._processLevelUpRewards(newLevel);
      }
      
      return result;
      
    } catch (error) {
      console.error('Exception in awardXP:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate XP for a specific question based on various factors
   */
  calculateQuestionXP(difficulty, attempts, timeToAnswer, currentStreak) {
    // Base XP by difficulty
    const baseXP = {
      'easy': 10,
      'medium': 15,
      'hard': 25
    };
    
    let xp = baseXP[difficulty] || 15;
    
    // First attempt bonus
    if (attempts === 1) {
      xp = Math.floor(xp * 1.5);
    } else if (attempts === 2) {
      xp = Math.floor(xp * 1.2);
    }
    // No bonus for 3+ attempts
    
    // Speed bonus (if answered quickly)
    if (timeToAnswer && timeToAnswer < 30000) { // Less than 30 seconds
      xp = Math.floor(xp * 1.3);
    } else if (timeToAnswer && timeToAnswer < 60000) { // Less than 1 minute
      xp = Math.floor(xp * 1.1);
    }
    
    // Streak multiplier
    const streakMultiplier = this.getStreakMultiplier(currentStreak);
    xp = Math.floor(xp * streakMultiplier);
    
    return Math.max(xp, 1); // Minimum 1 XP
  }

  /**
   * Get streak multiplier based on current streak
   */
  getStreakMultiplier(streak) {
    if (streak >= 10) return 2.5;
    if (streak >= 7) return 2.0;
    if (streak >= 5) return 1.7;
    if (streak >= 3) return 1.5;
    if (streak >= 2) return 1.2;
    return 1.0;
  }

  /**
   * Calculate level from total XP
   */
  calculateLevelFromXP(totalXP) {
    for (let level = this.levelThresholds.length - 1; level >= 1; level--) {
      if (totalXP >= this.levelThresholds[level]) {
        return level;
      }
    }
    return 1;
  }

  /**
   * Get XP required for a specific level
   */
  getXPForLevel(level) {
    return this.levelThresholds[level] || this.levelThresholds[this.levelThresholds.length - 1];
  }

  /**
   * Get XP summary for popup display
   */
  async getXPSummary() {
    try {
      const progress = await this.getUserProgress();
      const currentLevelXP = this.getXPForLevel(progress.currentLevel);
      const nextLevelXP = this.getXPForLevel(progress.currentLevel + 1);
      const progressXP = progress.totalXP - currentLevelXP;
      const requiredXP = nextLevelXP - currentLevelXP;
      
      return {
        success: true,
        totalXP: progress.totalXP,
        currentLevel: progress.currentLevel,
        progressXP: progressXP,
        requiredXP: requiredXP,
        progressPercentage: (progressXP / requiredXP) * 100,
        nextLevelXP: nextLevelXP,
        streakMultiplier: this.getStreakMultiplier(progress.currentStreak)
      };
      
    } catch (error) {
      console.error('Error getting XP summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user stats (questions answered, correct answers, etc.)
   */
  async updateUserStats(isCorrect, difficulty) {
    try {
      const userId = await window.getCurrentUserId();
      const currentProgress = await this.getUserProgress();
      
      const updates = {
        user_id: userId,
        questions_answered: currentProgress.questionsAnswered + 1,
        last_quiz_time: new Date().toISOString()
      };
      
      if (isCorrect) {
        updates.questions_correct = currentProgress.correctAnswers + 1;
      }
      
      const { data, error } = await window.supabaseQuery('user_progress', 'upsert', updates);
      
      if (error) {
        console.error('Error updating user stats:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data: updates };
      
    } catch (error) {
      console.error('Exception in updateUserStats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record XP transaction for analytics (simplified - no separate table)
   */
  async _recordXPTransaction(userId, xpAmount, context) {
    // XP transactions are tracked through user_progress updates
    console.log(`🎮 XP Transaction: +${xpAmount} XP for ${context.source || 'unknown'}`);
  }

  /**
   * Process level up rewards
   */
  async _processLevelUpRewards(newLevel) {
    const rewards = {
      themeUnlocks: [],
      bonusXP: 0,
      specialRewards: []
    };
    
    // Theme unlocks at specific levels
    const themeUnlocks = {
      3: 'midnight_scholar',
      5: 'forest_focus',
      8: 'ocean_depths',
      12: 'sunset_study',
      15: 'galaxy_genius',
      20: 'rainbow_master',
      25: 'custom_creator'
    };
    
    if (themeUnlocks[newLevel]) {
      rewards.themeUnlocks.push(themeUnlocks[newLevel]);
    }
    
    // Bonus XP for major milestones
    if (newLevel % 5 === 0) {
      rewards.bonusXP = newLevel * 5;
    }
    
    // Special rewards
    if (newLevel === 10) {
      rewards.specialRewards.push('Extended focus time (45 minutes)');
    } else if (newLevel === 20) {
      rewards.specialRewards.push('Hint tokens unlocked');
    }
    
    return rewards;
  }

  /**
   * Enrich progress data with calculated fields
   */
  _enrichProgressData(progress) {
    const currentLevelXP = this.getXPForLevel(progress.current_level);
    const nextLevelXP = this.getXPForLevel(progress.current_level + 1);
    const progressXP = progress.total_xp - currentLevelXP;
    const requiredXP = nextLevelXP - currentLevelXP;
    
    return {
      ...progress,
      totalXP: progress.total_xp,
      currentLevel: progress.current_level,
      questionsAnswered: progress.questions_answered,
      correctAnswers: progress.questions_correct,
      currentStreak: progress.current_streak,
      longestStreak: progress.longest_streak,
      progressXP: progressXP,
      requiredXP: requiredXP,
      progressPercentage: (progressXP / requiredXP) * 100,
      nextLevelXP: nextLevelXP,
      accuracy: progress.questions_answered > 0 ? (progress.questions_correct / progress.questions_answered) * 100 : 0
    };
  }

  /**
   * Get default progress for error cases
   */
  _getDefaultProgress() {
    return {
      totalXP: 0,
      currentLevel: 1,
      questionsAnswered: 0,
      correctAnswers: 0,
      currentStreak: 0,
      longestStreak: 0,
      progressXP: 0,
      requiredXP: 100,
      progressPercentage: 0,
      nextLevelXP: 100,
      accuracy: 0
    };
  }
}

// Make XPManager globally accessible
window.XPManager = XPManager; 