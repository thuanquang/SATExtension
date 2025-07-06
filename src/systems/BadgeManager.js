/**
 * BadgeManager - Handles badge/achievement system
 * Tracks user accomplishments and unlocks special rewards
 */

class BadgeManager {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
    this.badgeDefinitions = this._initializeBadgeDefinitions();
    this.checkInterval = null;
  }

  /**
   * Initialize all badge definitions with requirements and rewards
   */
  _initializeBadgeDefinitions() {
    return {
      // Streak-based badges
      'streak_3': {
        id: 'streak_3',
        name: 'Getting Started',
        description: 'Answer 3 questions correctly in a row',
        icon: '🔥',
        type: 'streak',
        requirement: { streak: 3 },
        xpReward: 25,
        rarity: 'common'
      },
      'streak_5': {
        id: 'streak_5',
        name: 'On Fire',
        description: 'Answer 5 questions correctly in a row',
        icon: '🔥',
        type: 'streak',
        requirement: { streak: 5 },
        xpReward: 50,
        rarity: 'common'
      },
      'streak_10': {
        id: 'streak_10',
        name: 'Unstoppable',
        description: 'Answer 10 questions correctly in a row',
        icon: '🔥',
        type: 'streak',
        requirement: { streak: 10 },
        xpReward: 100,
        rarity: 'uncommon'
      },
      'streak_25': {
        id: 'streak_25',
        name: 'Master Streak',
        description: 'Answer 25 questions correctly in a row',
        icon: '🔥',
        type: 'streak',
        requirement: { streak: 25 },
        xpReward: 300,
        rarity: 'rare'
      },
      'streak_50': {
        id: 'streak_50',
        name: 'Legendary Streak',
        description: 'Answer 50 questions correctly in a row',
        icon: '🔥',
        type: 'streak',
        requirement: { streak: 50 },
        xpReward: 750,
        rarity: 'legendary'
      },

      // Volume-based badges
      'questions_10': {
        id: 'questions_10',
        name: 'First Steps',
        description: 'Answer 10 questions total',
        icon: '📚',
        type: 'volume',
        requirement: { questionsAnswered: 10 },
        xpReward: 25,
        rarity: 'common'
      },
      'questions_50': {
        id: 'questions_50',
        name: 'Dedicated Student',
        description: 'Answer 50 questions total',
        icon: '📚',
        type: 'volume',
        requirement: { questionsAnswered: 50 },
        xpReward: 75,
        rarity: 'common'
      },
      'questions_100': {
        id: 'questions_100',
        name: 'Century Club',
        description: 'Answer 100 questions total',
        icon: '📚',
        type: 'volume',
        requirement: { questionsAnswered: 100 },
        xpReward: 150,
        rarity: 'uncommon'
      },
      'questions_500': {
        id: 'questions_500',
        name: 'Quiz Master',
        description: 'Answer 500 questions total',
        icon: '📚',
        type: 'volume',
        requirement: { questionsAnswered: 500 },
        xpReward: 500,
        rarity: 'rare'
      },
      'questions_1000': {
        id: 'questions_1000',
        name: 'Knowledge Seeker',
        description: 'Answer 1000 questions total',
        icon: '📚',
        type: 'volume',
        requirement: { questionsAnswered: 1000 },
        xpReward: 1000,
        rarity: 'epic'
      },

      // Accuracy-based badges
      'accuracy_80': {
        id: 'accuracy_80',
        name: 'Sharp Mind',
        description: 'Maintain 80% accuracy over 25 questions',
        icon: '🎯',
        type: 'accuracy',
        requirement: { accuracy: 80, minQuestions: 25 },
        xpReward: 100,
        rarity: 'uncommon'
      },
      'accuracy_90': {
        id: 'accuracy_90',
        name: 'Precision Expert',
        description: 'Maintain 90% accuracy over 50 questions',
        icon: '🎯',
        type: 'accuracy',
        requirement: { accuracy: 90, minQuestions: 50 },
        xpReward: 250,
        rarity: 'rare'
      },
      'accuracy_95': {
        id: 'accuracy_95',
        name: 'Perfect Precision',
        description: 'Maintain 95% accuracy over 100 questions',
        icon: '🎯',
        type: 'accuracy',
        requirement: { accuracy: 95, minQuestions: 100 },
        xpReward: 500,
        rarity: 'epic'
      },

      // Speed-based badges
      'speed_demon': {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Answer 10 questions in under 20 seconds each',
        icon: '⚡',
        type: 'speed',
        requirement: { fastAnswers: 10, maxTime: 20000 },
        xpReward: 150,
        rarity: 'uncommon'
      },
      'lightning_fast': {
        id: 'lightning_fast',
        name: 'Lightning Fast',
        description: 'Answer 25 questions in under 15 seconds each',
        icon: '⚡',
        type: 'speed',
        requirement: { fastAnswers: 25, maxTime: 15000 },
        xpReward: 300,
        rarity: 'rare'
      },

      // Consistency badges
      'daily_3': {
        id: 'daily_3',
        name: 'Consistent Learner',
        description: 'Study for 3 days in a row',
        icon: '📅',
        type: 'consistency',
        requirement: { dailyStreak: 3 },
        xpReward: 50,
        rarity: 'common'
      },
      'daily_7': {
        id: 'daily_7',
        name: 'Weekly Warrior',
        description: 'Study for 7 days in a row',
        icon: '📅',
        type: 'consistency',
        requirement: { dailyStreak: 7 },
        xpReward: 150,
        rarity: 'uncommon'
      },
      'daily_30': {
        id: 'daily_30',
        name: 'Monthly Master',
        description: 'Study for 30 days in a row',
        icon: '📅',
        type: 'consistency',
        requirement: { dailyStreak: 30 },
        xpReward: 750,
        rarity: 'epic'
      },

      // Special achievement badges
      'perfectionist': {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Answer 20 questions correctly on first attempt',
        icon: '💎',
        type: 'special',
        requirement: { perfectAnswers: 20 },
        xpReward: 200,
        rarity: 'rare'
      },
      'comeback_kid': {
        id: 'comeback_kid',
        name: 'Comeback Kid',
        description: 'Recover from a 5+ question wrong streak',
        icon: '💪',
        type: 'special',
        requirement: { recoveryStreak: 5 },
        xpReward: 100,
        rarity: 'uncommon'
      },
      'night_owl': {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Answer 25 questions between 10 PM and 2 AM',
        icon: '🦉',
        type: 'special',
        requirement: { nightQuestions: 25 },
        xpReward: 100,
        rarity: 'uncommon'
      },
      'early_bird': {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Answer 25 questions between 5 AM and 8 AM',
        icon: '🐦',
        type: 'special',
        requirement: { earlyQuestions: 25 },
        xpReward: 100,
        rarity: 'uncommon'
      }
    };
  }

  /**
   * Check for newly earned badges based on user progress
   */
  async checkForNewBadges(userProgress) {
    try {
      const userId = await window.getCurrentUserId();
      const userBadges = await this.getUserBadges(userId);
      const earnedBadgeIds = userBadges.map(badge => badge.badge_id);
      const newBadges = [];

      // Check each badge definition
      for (const [badgeId, badge] of Object.entries(this.badgeDefinitions)) {
        if (earnedBadgeIds.includes(badgeId)) {
          continue; // Already earned
        }

        if (this._checkBadgeRequirement(badge, userProgress)) {
          const result = await this.awardBadge(userId, badgeId);
          if (result.success) {
            newBadges.push({
              ...badge,
              earnedAt: new Date().toISOString()
            });
          }
        }
      }

      return {
        success: true,
        newBadges: newBadges,
        totalBadges: earnedBadgeIds.length + newBadges.length
      };

    } catch (error) {
      console.error('Error checking for new badges:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a specific badge requirement is met
   */
  _checkBadgeRequirement(badge, userProgress) {
    const req = badge.requirement;
    
    switch (badge.type) {
      case 'streak':
        return userProgress.currentStreak >= req.streak;
      
      case 'volume':
        return userProgress.questionsAnswered >= req.questionsAnswered;
      
      case 'accuracy':
        return userProgress.questionsAnswered >= req.minQuestions && 
               userProgress.accuracy >= req.accuracy;
      
      case 'speed':
        return userProgress.fastAnswers >= req.fastAnswers;
      
      case 'consistency':
        return userProgress.dailyStreak >= req.dailyStreak;
      
      case 'special':
        if (req.perfectAnswers) {
          return userProgress.perfectAnswers >= req.perfectAnswers;
        }
        if (req.recoveryStreak) {
          return userProgress.maxRecoveryStreak >= req.recoveryStreak;
        }
        if (req.nightQuestions) {
          return userProgress.nightQuestions >= req.nightQuestions;
        }
        if (req.earlyQuestions) {
          return userProgress.earlyQuestions >= req.earlyQuestions;
        }
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Award a badge to a user
   */
  async awardBadge(userId, badgeId) {
    try {
      const badge = this.badgeDefinitions[badgeId];
      if (!badge) {
        return { success: false, error: 'Badge not found' };
      }

      // Record badge earning
      const badgeRecord = {
        user_id: userId,
        badge_id: badgeId,
        earned_at: new Date().toISOString(),
        xp_reward: badge.xpReward
      };

      const { data, error } = await window.supabaseQuery('user_badges', 'insert', badgeRecord);

      if (error) {
        console.error('Error awarding badge:', error);
        return { success: false, error: error.message };
      }

      // Award XP if specified
      if (badge.xpReward > 0 && window.XPManager) {
        const xpManager = new window.XPManager(this.supabaseClient);
        await xpManager.awardXP(badge.xpReward, {
          source: 'badge_reward',
          badgeId: badgeId,
          badgeName: badge.name
        });
      }

      console.log(`🏆 Badge awarded: ${badge.name} (+${badge.xpReward} XP)`);

      return {
        success: true,
        badge: {
          ...badge,
          earnedAt: badgeRecord.earned_at
        }
      };

    } catch (error) {
      console.error('Exception in awardBadge:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all badges earned by a user
   */
  async getUserBadges(userId) {
    try {
      const { data, error } = await window.supabaseQuery('user_badges', 'select', null, { user_id: userId });

      if (error) {
        console.error('Error fetching user badges:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Exception in getUserBadges:', error);
      return [];
    }
  }

  /**
   * Get badge progress for display
   */
  async getBadgeProgress(userProgress) {
    try {
      const userId = await window.getCurrentUserId();
      const userBadges = await this.getUserBadges(userId);
      const earnedBadgeIds = userBadges.map(badge => badge.badge_id);
      
      const badgeProgress = [];

      for (const [badgeId, badge] of Object.entries(this.badgeDefinitions)) {
        const isEarned = earnedBadgeIds.includes(badgeId);
        const progress = this._calculateBadgeProgress(badge, userProgress);
        
        badgeProgress.push({
          ...badge,
          isEarned: isEarned,
          progress: progress,
          earnedAt: isEarned ? userBadges.find(b => b.badge_id === badgeId)?.earned_at : null
        });
      }

      // Sort by rarity and progress
      badgeProgress.sort((a, b) => {
        if (a.isEarned && !b.isEarned) return -1;
        if (!a.isEarned && b.isEarned) return 1;
        return b.progress - a.progress;
      });

      return {
        success: true,
        badges: badgeProgress,
        totalEarned: earnedBadgeIds.length,
        totalAvailable: Object.keys(this.badgeDefinitions).length
      };

    } catch (error) {
      console.error('Error getting badge progress:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate progress percentage for a badge
   */
  _calculateBadgeProgress(badge, userProgress) {
    const req = badge.requirement;
    
    switch (badge.type) {
      case 'streak':
        return Math.min(100, (userProgress.currentStreak / req.streak) * 100);
      
      case 'volume':
        return Math.min(100, (userProgress.questionsAnswered / req.questionsAnswered) * 100);
      
      case 'accuracy':
        const accuracyMet = userProgress.accuracy >= req.accuracy;
        const volumeMet = userProgress.questionsAnswered >= req.minQuestions;
        if (accuracyMet && volumeMet) return 100;
        if (accuracyMet) return (userProgress.questionsAnswered / req.minQuestions) * 100;
        return 0;
      
      case 'speed':
        return Math.min(100, ((userProgress.fastAnswers || 0) / req.fastAnswers) * 100);
      
      case 'consistency':
        return Math.min(100, (userProgress.dailyStreak / req.dailyStreak) * 100);
      
      case 'special':
        if (req.perfectAnswers) {
          return Math.min(100, ((userProgress.perfectAnswers || 0) / req.perfectAnswers) * 100);
        }
        if (req.recoveryStreak) {
          return Math.min(100, ((userProgress.maxRecoveryStreak || 0) / req.recoveryStreak) * 100);
        }
        if (req.nightQuestions) {
          return Math.min(100, ((userProgress.nightQuestions || 0) / req.nightQuestions) * 100);
        }
        if (req.earlyQuestions) {
          return Math.min(100, ((userProgress.earlyQuestions || 0) / req.earlyQuestions) * 100);
        }
        return 0;
      
      default:
        return 0;
    }
  }

  /**
   * Get badge summary for popup display
   */
  async getBadgeSummary() {
    try {
      const userId = await window.getCurrentUserId();
      const userBadges = await this.getUserBadges(userId);
      
      const summary = {
        totalEarned: userBadges.length,
        totalAvailable: Object.keys(this.badgeDefinitions).length,
        recentBadges: userBadges
          .sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at))
          .slice(0, 3)
          .map(badge => ({
            ...this.badgeDefinitions[badge.badge_id],
            earnedAt: badge.earned_at
          })),
        rarityBreakdown: this._getRarityBreakdown(userBadges)
      };

      return { success: true, summary: summary };

    } catch (error) {
      console.error('Error getting badge summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get breakdown of badges by rarity
   */
  _getRarityBreakdown(userBadges) {
    const breakdown = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    };

    userBadges.forEach(badge => {
      const badgeData = this.badgeDefinitions[badge.badge_id];
      if (badgeData && breakdown.hasOwnProperty(badgeData.rarity)) {
        breakdown[badgeData.rarity]++;
      }
    });

    return breakdown;
  }

  /**
   * Start periodic badge checking
   */
  startBadgeChecking(intervalMs = 30000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      try {
        if (window.XPManager) {
          const xpManager = new window.XPManager(this.supabaseClient);
          const userProgress = await xpManager.getUserProgress();
          await this.checkForNewBadges(userProgress);
        }
      } catch (error) {
        console.error('Error in periodic badge check:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop periodic badge checking
   */
  stopBadgeChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Make BadgeManager globally accessible
window.BadgeManager = BadgeManager; 