/**
 * ChallengeEngine - Handles daily challenges and special events
 * Creates engaging daily tasks and tracks completion
 */

class ChallengeEngine {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
    this.challengeTypes = {
      ACCURACY: 'accuracy',
      SPEED: 'speed',
      VOLUME: 'volume',
      STREAK: 'streak',
      SUBJECT: 'subject',
      DIFFICULTY: 'difficulty'
    };
    this.difficulties = ['easy', 'medium', 'hard'];
    this.subjects = ['math', 'reading', 'writing', 'science'];
  }

  /**
   * Generate daily challenge for user
   */
  async generateDailyChallenge(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if there's already a challenge for today (global challenge, not user-specific)
      const existingChallenge = await this.getTodaysChallenge();
      if (existingChallenge) {
        return { success: true, challenge: existingChallenge, isNew: false };
      }

      // Get user's recent performance to create personalized challenge type
      const userStats = await this.getUserStats(userId);
      
      // Generate challenge based on day of week and user's level
      const challenge = this.createDailyChallenge(userStats, today);
      
      return { success: true, challenge: challenge, isNew: true };

    } catch (error) {
      console.error('Exception in generateDailyChallenge:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create daily challenge based on day and user level
   */
  createDailyChallenge(userStats, dateString) {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Define daily themes
    const dailyThemes = {
      1: 'Math Monday',
      2: 'Text Tuesday', 
      3: 'Word Wednesday',
      4: 'Think Thursday',
      5: 'Fast Friday',
      6: 'Study Saturday',
      0: 'Sunday Summary'
    };

    const themeName = dailyThemes[dayOfWeek] || 'Daily Challenge';
    
    // Create challenge based on day theme and user level
    let challenge;
    switch (dayOfWeek) {
      case 1: // Monday - Math focus
        challenge = this.createMathChallenge(userStats);
        break;
      case 2: // Tuesday - Reading comprehension
        challenge = this.createReadingChallenge(userStats);
        break;
      case 3: // Wednesday - Vocabulary
        challenge = this.createVocabularyChallenge(userStats);
        break;
      case 4: // Thursday - Mixed subjects
        challenge = this.createMixedChallenge(userStats);
        break;
      case 5: // Friday - Speed challenge
        challenge = this.createSpeedChallenge(userStats);
        break;
      case 6: // Saturday - Volume challenge
        challenge = this.createVolumeChallenge(userStats);
        break;
      case 0: // Sunday - Review/streak
        challenge = this.createStreakChallenge(userStats);
        break;
      default:
        challenge = this.createMixedChallenge(userStats);
    }

    return {
      ...challenge,
      theme: themeName,
      date: dateString,
      id: this.generateChallengeId()
    };
  }

  /**
   * Create math-focused challenge
   */
  createMathChallenge(userStats) {
    const level = userStats.current_level || 1;
    const questionCount = Math.max(3, Math.min(10, Math.floor(level / 2) + 3));

    return {
      type: this.challengeTypes.SUBJECT,
      title: 'Math Monday Challenge',
      description: `Master ${questionCount} math questions with 75% accuracy`,
      icon: '🔢',
      difficulty: level >= 5 ? 'medium' : 'easy',
      requirements: {
        subject: 'math',
        questionCount: questionCount,
        accuracy: 75
      },
      rewards: {
        xp: questionCount * 8,
        badge: questionCount >= 8 ? 'math_specialist' : null
      }
    };
  }

  /**
   * Create reading-focused challenge
   */
  createReadingChallenge(userStats) {
    const level = userStats.current_level || 1;
    const questionCount = Math.max(3, Math.min(8, Math.floor(level / 3) + 3));

    return {
      type: this.challengeTypes.SUBJECT,
      title: 'Text Tuesday Challenge',
      description: `Complete ${questionCount} reading questions correctly`,
      icon: '📖',
      difficulty: level >= 7 ? 'medium' : 'easy',
      requirements: {
        subject: 'reading',
        questionCount: questionCount,
        accuracy: 70
      },
      rewards: {
        xp: questionCount * 7,
        badge: questionCount >= 6 ? 'reading_specialist' : null
      }
    };
  }

  /**
   * Create vocabulary-focused challenge
   */
  createVocabularyChallenge(userStats) {
    const level = userStats.current_level || 1;
    const questionCount = Math.max(4, Math.min(12, Math.floor(level / 2) + 4));

    return {
      type: this.challengeTypes.SUBJECT,
      title: 'Word Wednesday Challenge',
      description: `Expand vocabulary with ${questionCount} word questions`,
      icon: '📝',
      difficulty: level >= 6 ? 'medium' : 'easy',
      requirements: {
        subject: 'writing',
        questionCount: questionCount,
        accuracy: 70
      },
      rewards: {
        xp: questionCount * 6,
        badge: questionCount >= 10 ? 'vocabulary_master' : null
      }
    };
  }

  /**
   * Create mixed subject challenge
   */
  createMixedChallenge(userStats) {
    const level = userStats.current_level || 1;
    const questionCount = Math.max(5, Math.min(15, Math.floor(level / 2) + 5));

    return {
      type: this.challengeTypes.VOLUME,
      title: 'Think Thursday Challenge',
      description: `Tackle ${questionCount} questions from any subject`,
      icon: '🧠',
      difficulty: level >= 8 ? 'hard' : 'medium',
      requirements: {
        questionCount: questionCount,
        accuracy: 65
      },
      rewards: {
        xp: questionCount * 5,
        badge: questionCount >= 12 ? 'versatile_learner' : null
      }
    };
  }

  /**
   * Create speed-focused challenge
   */
  createSpeedChallenge(userStats) {
    const level = userStats.current_level || 1;
    const questionCount = Math.max(3, Math.min(10, Math.floor(level / 3) + 3));
    const targetTime = level >= 10 ? 25 : 30; // seconds per question

    return {
      type: this.challengeTypes.SPEED,
      title: 'Fast Friday Challenge',
      description: `Answer ${questionCount} questions in under ${targetTime} seconds each`,
      icon: '⚡',
      difficulty: 'hard',
      requirements: {
        maxTime: targetTime * 1000, // milliseconds
        questionCount: questionCount
      },
      rewards: {
        xp: questionCount * 10,
        badge: questionCount >= 8 ? 'speed_demon' : null
      }
    };
  }

  /**
   * Create volume-focused challenge
   */
  createVolumeChallenge(userStats) {
    const level = userStats.current_level || 1;
    const questionCount = Math.max(8, Math.min(25, Math.floor(level) + 8));

    return {
      type: this.challengeTypes.VOLUME,
      title: 'Study Saturday Challenge',
      description: `Power through ${questionCount} questions today`,
      icon: '📚',
      difficulty: 'easy',
      requirements: {
        questionCount: questionCount
      },
      rewards: {
        xp: questionCount * 4,
        badge: questionCount >= 20 ? 'volume_master' : null
      }
    };
  }

  /**
   * Create streak-focused challenge
   */
  createStreakChallenge(userStats) {
    const level = userStats.current_level || 1;
    const currentStreak = userStats.current_streak || 0;
    const targetStreak = Math.max(3, Math.min(12, currentStreak + Math.floor(level / 2) + 2));

    return {
      type: this.challengeTypes.STREAK,
      title: 'Sunday Summary Challenge',
      description: `Build a ${targetStreak} question streak`,
      icon: '🔥',
      difficulty: 'medium',
      requirements: {
        streakTarget: targetStreak
      },
      rewards: {
        xp: targetStreak * 12,
        badge: targetStreak >= 10 ? 'streak_master' : null
      }
    };
  }

  /**
   * Update challenge progress (simplified for current schema)
   */
  async updateChallengeProgress(userId, questionResult) {
    try {
      const challenge = await this.getTodaysChallenge();
      if (!challenge) {
        return { success: true, noActiveChallenge: true };
      }

      // Get user's current stats for progress calculation
      const userStats = await this.getUserStats(userId);
      const progress = this.calculateUserProgress(challenge, userStats, questionResult);
      const isCompleted = this.isChallengeCompleted(challenge, progress);

      // Award rewards if just completed
      let rewardResult = null;
      if (isCompleted) {
        rewardResult = await this.awardChallengeRewards(userId, challenge);
      }

      return {
        success: true,
        challenge: challenge,
        progress: progress,
        isCompleted: isCompleted,
        rewards: rewardResult
      };

    } catch (error) {
      console.error('Exception in updateChallengeProgress:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate user progress for current challenge
   */
  calculateUserProgress(challenge, userStats, latestResult) {
    const today = new Date().toISOString().split('T')[0];
    const lastQuizDate = userStats.last_quiz_time ? 
      new Date(userStats.last_quiz_time).toISOString().split('T')[0] : null;
    
    // Simple progress calculation based on user stats
    // In a full implementation, we'd track daily progress separately
    switch (challenge.type) {
      case this.challengeTypes.VOLUME:
        return {
          current: userStats.questions_answered || 0,
          target: challenge.requirements.questionCount,
          percentage: Math.min(100, ((userStats.questions_answered || 0) / challenge.requirements.questionCount) * 100)
        };

      case this.challengeTypes.STREAK:
        return {
          current: userStats.current_streak || 0,
          target: challenge.requirements.streakTarget,
          percentage: Math.min(100, ((userStats.current_streak || 0) / challenge.requirements.streakTarget) * 100)
        };

      case this.challengeTypes.ACCURACY:
        const accuracy = userStats.questions_answered > 0 ? 
          (userStats.questions_correct / userStats.questions_answered) * 100 : 0;
        return {
          current: accuracy,
          target: challenge.requirements.accuracy,
          percentage: Math.min(100, (accuracy / challenge.requirements.accuracy) * 100)
        };

      default:
        // For other types, use a simple completion estimation
        return {
          current: userStats.questions_answered || 0,
          target: challenge.requirements.questionCount || 5,
          percentage: Math.min(100, ((userStats.questions_answered || 0) / (challenge.requirements.questionCount || 5)) * 100)
        };
    }
  }

  /**
   * Check if challenge is completed based on progress
   */
  isChallengeCompleted(challenge, progress) {
    return progress.percentage >= 100;
  }

  /**
   * Award challenge completion rewards
   */
  async awardChallengeRewards(userId, challenge) {
    try {
      const rewards = challenge.rewards;
      const results = {};

      // Award XP
      if (rewards.xp > 0 && window.XPManager) {
        const xpManager = new window.XPManager(this.supabaseClient);
        const xpResult = await xpManager.awardXP(userId, rewards.xp, {
          source: 'daily_challenge',
          challengeType: challenge.type,
          challengeTitle: challenge.title
        });
        results.xp = xpResult;
      }

      // Award badge
      if (rewards.badge && window.BadgeManager) {
        const badgeManager = new window.BadgeManager(this.supabaseClient);
        const badgeResult = await badgeManager.awardBadge(userId, rewards.badge);
        results.badge = badgeResult;
      }

      return { success: true, results: results };

    } catch (error) {
      console.error('Exception in awardChallengeRewards:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get today's challenge (global challenge, not user-specific)
   */
  async getTodaysChallenge() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await window.supabaseQuery('daily_challenges', 'select', null, {
        challenge_date: today
      });

      if (error) {
        console.error('Error fetching today\'s challenge:', error);
        return null;
      }

      if (!data || data.length === 0) {
        // No challenge found for today, return a generated one
        const userStats = await this.getUserStats('default');
        return this.createDailyChallenge(userStats, today);
      }

      // Convert database format to our format
      const dbChallenge = data[0];
      return {
        id: dbChallenge.challenge_id,
        type: dbChallenge.challenge_type,
        title: dbChallenge.challenge_name,
        description: dbChallenge.challenge_description,
        requirements: typeof dbChallenge.requirements === 'string' ? 
          JSON.parse(dbChallenge.requirements) : dbChallenge.requirements,
        rewards: typeof dbChallenge.rewards === 'string' ? 
          JSON.parse(dbChallenge.rewards) : dbChallenge.rewards,
        isActive: dbChallenge.is_active,
        date: dbChallenge.challenge_date
      };

    } catch (error) {
      console.error('Exception in getTodaysChallenge:', error);
      return null;
    }
  }

  /**
   * Get user stats for challenge personalization
   */
  async getUserStats(userId) {
    try {
      const { data, error } = await window.supabaseQuery('user_progress', 'select', null, { user_id: userId });

      if (error) {
        console.error('Error fetching user stats:', error);
        return this.getDefaultUserStats();
      }

      if (!data || data.length === 0) {
        return this.getDefaultUserStats();
      }

      return data[0];

    } catch (error) {
      console.error('Exception in getUserStats:', error);
      return this.getDefaultUserStats();
    }
  }

  /**
   * Get default user stats
   */
  getDefaultUserStats() {
    return {
      user_id: 'default',
      total_xp: 0,
      current_level: 1,
      questions_answered: 0,
      questions_correct: 0,
      total_attempts: 0,
      current_streak: 0,
      longest_streak: 0,
      last_quiz_time: null
    };
  }

  /**
   * Generate unique challenge ID
   */
  generateChallengeId() {
    return 'challenge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get challenge summary for UI display
   */
  async getChallengeSummary(userId) {
    try {
      const challenge = await this.getTodaysChallenge();
      if (!challenge) {
        return { success: false, error: 'No challenge available' };
      }

      const userStats = await this.getUserStats(userId);
      const progress = this.calculateUserProgress(challenge, userStats);
      const isCompleted = this.isChallengeCompleted(challenge, progress);

      return {
        success: true,
        challenge: {
          title: challenge.title,
          description: challenge.description,
          icon: challenge.icon || '🎯',
          type: challenge.type,
          difficulty: challenge.difficulty || 'medium',
          progress: progress,
          isCompleted: isCompleted,
          rewards: challenge.rewards,
          timeRemaining: this.getTimeRemaining()
        }
      };

    } catch (error) {
      console.error('Exception in getChallengeSummary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get time remaining until challenge resets
   */
  getTimeRemaining() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msRemaining = tomorrow.getTime() - now.getTime();
    const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hoursRemaining}h ${minutesRemaining}m`;
  }
}

// Make globally accessible
if (typeof window !== 'undefined') {
  window.ChallengeEngine = ChallengeEngine;
} 