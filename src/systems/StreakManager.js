/**
 * StreakManager - Handles streak tracking and momentum systems
 * Manages daily streaks, question streaks, and streak-based rewards
 */

class StreakManager {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
    this.streakThresholds = {
      bronze: 3,
      silver: 7,
      gold: 15,
      platinum: 30,
      diamond: 50
    };
    this.streakRewards = {
      3: { xp: 25, message: 'Great start! 🔥' },
      7: { xp: 75, message: 'One week strong! 💪' },
      15: { xp: 200, message: 'Incredible momentum! ⚡' },
      30: { xp: 500, message: 'Unstoppable force! 🚀' },
      50: { xp: 1000, message: 'Legendary dedication! 👑' }
    };
  }

  /**
   * Update streak after a question is answered
   */
  async updateStreak(isCorrect, difficulty) {
    try {
      const userId = await window.getCurrentUserId();
      const currentProgress = await this.getUserProgress(userId);
      
      let newStreak = currentProgress.current_streak || 0;
      let newLongestStreak = currentProgress.longest_streak || 0;
      let streakBroken = false;
      let streakReward = null;

      if (isCorrect) {
        newStreak += 1;
        if (newStreak > newLongestStreak) {
          newLongestStreak = newStreak;
        }
        
        // Check for streak milestone rewards
        if (this.streakRewards[newStreak]) {
          streakReward = this.streakRewards[newStreak];
        }
      } else {
        if (newStreak > 0) {
          streakBroken = true;
        }
        newStreak = 0;
      }

      // Update user progress
      const updates = {
        user_id: userId,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_quiz_time: new Date().toISOString()
      };

      const { data, error } = await window.supabaseQuery('user_progress', 'upsert', updates);

      if (error) {
        console.error('Error updating streak:', error);
        return { success: false, error: error.message };
      }

      // Award streak reward if applicable
      if (streakReward && window.XPManager) {
        const xpManager = new window.XPManager(this.supabaseClient);
        await xpManager.awardXP(streakReward.xp, {
          source: 'streak_milestone',
          streak: newStreak,
          difficulty: difficulty
        });
      }

      // Record streak event (simplified logging)
      console.log(`🔥 Streak Event: ${streakBroken ? 'broken' : 'continued'}, length: ${newStreak}`);

      return {
        success: true,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        streakBroken: streakBroken,
        streakReward: streakReward,
        streakLevel: this.getStreakLevel(newStreak)
      };

    } catch (error) {
      console.error('Exception in updateStreak:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update daily streak
   */
  async updateDailyStreak() {
    try {
      const userId = await window.getCurrentUserId();
      const currentProgress = await this.getUserProgress(userId);
      
      // Daily streak functionality simplified since we don't have daily_streak column
      return {
        success: true,
        dailyStreak: 0,
        streakContinued: false
      };

    } catch (error) {
      console.error('Exception in updateDailyStreak:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get streak level based on current streak
   */
  getStreakLevel(streak) {
    if (streak >= this.streakThresholds.diamond) return 'diamond';
    if (streak >= this.streakThresholds.platinum) return 'platinum';
    if (streak >= this.streakThresholds.gold) return 'gold';
    if (streak >= this.streakThresholds.silver) return 'silver';
    if (streak >= this.streakThresholds.bronze) return 'bronze';
    return 'none';
  }

  /**
   * Get streak statistics for display
   */
  async getStreakStats() {
    try {
      const userId = await window.getCurrentUserId();
      const progress = await this.getUserProgress(userId);
      
      const currentStreak = progress.current_streak || 0;
      const longestStreak = progress.longest_streak || 0;
      const dailyStreak = 0; // Not available in current schema
      
      const streakLevel = this.getStreakLevel(currentStreak);
      const nextMilestone = this._getNextMilestone(currentStreak);
      
      return {
        success: true,
        currentStreak: currentStreak,
        longestStreak: longestStreak,
        dailyStreak: dailyStreak,
        streakLevel: streakLevel,
        nextMilestone: nextMilestone,
        streakMultiplier: this._calculateStreakMultiplier(currentStreak)
      };

    } catch (error) {
      console.error('Error getting streak stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user progress data
   */
  async getUserProgress(userId) {
    try {
      const { data, error } = await window.supabaseQuery('user_progress', 'select', null, { user_id: userId });

      if (error) {
        console.error('Error fetching user progress:', error);
        return {};
      }

      return data && data.length > 0 ? data[0] : {};

    } catch (error) {
      console.error('Exception in getUserProgress:', error);
      return {};
    }
  }

  /**
   * Get next milestone information
   */
  _getNextMilestone(currentStreak) {
    const milestones = Object.keys(this.streakRewards).map(Number).sort((a, b) => a - b);
    
    for (const milestone of milestones) {
      if (currentStreak < milestone) {
        return {
          target: milestone,
          remaining: milestone - currentStreak,
          reward: this.streakRewards[milestone]
        };
      }
    }
    
    return null; // No more milestones
  }

  /**
   * Calculate streak multiplier for XP
   */
  _calculateStreakMultiplier(streak) {
    if (streak >= 50) return 3.0;
    if (streak >= 30) return 2.5;
    if (streak >= 15) return 2.0;
    if (streak >= 7) return 1.7;
    if (streak >= 3) return 1.5;
    return 1.0;
  }

  /**
   * Record streak event for analytics (simplified - no separate table)
   */
  async _recordStreakEvent(userId, eventData) {
    // Streak events are tracked through user_progress updates
    console.log(`🔥 Streak Analytics: ${eventData.streakBroken ? 'broken' : 'continued'} at ${eventData.streakLength}`);
  }

  /**
   * Get streak history for analytics (simplified)
   */
  async getStreakHistory(userId, limit = 50) {
    // Return empty array since we don't have a separate streak_events table
    return [];
  }

  /**
   * Get streak leaderboard
   */
  async getStreakLeaderboard(type = 'current', limit = 10) {
    try {
      const orderBy = type === 'current' ? 'current_streak' : 'longest_streak';
      
      const { data, error } = await window.supabaseQuery('user_progress', 'select', 
        'user_id, current_streak, longest_streak', 
        { 
          limit: limit,
          order: `${orderBy} desc`
        });

      if (error) {
        console.error('Error fetching streak leaderboard:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Exception in getStreakLeaderboard:', error);
      return [];
    }
  }

  /**
   * Check if user is on fire (high streak)
   */
  isOnFire(streak) {
    return streak >= this.streakThresholds.gold;
  }

  /**
   * Get streak encouragement message
   */
  getStreakMessage(streak, streakBroken = false) {
    if (streakBroken) {
      return {
        title: 'Streak Broken 💔',
        message: 'Don\'t worry! Every expert was once a beginner. Start your new streak now!',
        type: 'encouragement'
      };
    }

    if (streak === 0) {
      return {
        title: 'Ready to Start? 🚀',
        message: 'Answer your first question correctly to begin your streak!',
        type: 'motivation'
      };
    }

    const level = this.getStreakLevel(streak);
    const messages = {
      bronze: {
        title: 'Getting Started! 🔥',
        message: `${streak} correct in a row! Keep the momentum going!`,
        type: 'progress'
      },
      silver: {
        title: 'You\'re on Fire! 🔥🔥',
        message: `Amazing ${streak} streak! You're building serious momentum!`,
        type: 'progress'
      },
      gold: {
        title: 'Unstoppable! 🔥🔥🔥',
        message: `Incredible ${streak} streak! You're in the zone!`,
        type: 'achievement'
      },
      platinum: {
        title: 'Legendary! 👑',
        message: `Phenomenal ${streak} streak! You're a quiz master!`,
        type: 'achievement'
      },
      diamond: {
        title: 'Absolutely Incredible! 💎',
        message: `Mind-blowing ${streak} streak! You're rewriting the rules!`,
        type: 'legendary'
      }
    };

    return messages[level] || messages.bronze;
  }

  /**
   * Get streak summary for popup
   */
  async getStreakSummary() {
    try {
      const userId = await window.getCurrentUserId();
      const stats = await this.getStreakStats();
      
      if (!stats.success) {
        return stats;
      }

      const streakMessage = this.getStreakMessage(stats.currentStreak);
      const isOnFire = this.isOnFire(stats.currentStreak);
      
      return {
        success: true,
        summary: {
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          dailyStreak: stats.dailyStreak,
          streakLevel: stats.streakLevel,
          nextMilestone: stats.nextMilestone,
          streakMultiplier: stats.streakMultiplier,
          isOnFire: isOnFire,
          message: streakMessage
        }
      };

    } catch (error) {
      console.error('Error getting streak summary:', error);
      return { success: false, error: error.message };
    }
  }
}

// Make StreakManager globally accessible
window.StreakManager = StreakManager; 