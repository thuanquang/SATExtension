/**
 * XPManager - Handles experience points, levels, and progression
 * Core gamification system for tracking user advancement
 */
import { getCurrentUserId } from '../db/supabase-client.js';

class XPManager {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
    this.xpRates = {
      easy: 10,
      medium: 15,
      hard: 25
    };
    this.streakMultipliers = {
      2: 1.2,
      3: 1.5,
      5: 2.0,
      7: 2.5 // Maximum multiplier
    };
    this.bonusConditions = {
      firstAttempt: 0.5, // +50% XP
      speedBonus: 0.25,  // +25% XP for <30s answers
      perfectDay: 100,   // Flat bonus XP
      weeklyConsistency: 200 // Flat bonus XP
    };
    
    console.log('🎯 XP Manager initialized');
  }

  /**
   * Calculate XP for a completed question
   */
  async calculateQuestionXP(difficulty, attempts, timeToAnswer, currentStreak) {
    // Base XP from difficulty
    let baseXP = this.xpRates[difficulty.toLowerCase()] || this.xpRates.medium;
    
    // First attempt bonus
    if (attempts === 1) {
      baseXP *= (1 + this.bonusConditions.firstAttempt);
    }
    
    // Speed bonus (under 30 seconds)
    if (timeToAnswer && timeToAnswer < 30000) {
      baseXP *= (1 + this.bonusConditions.speedBonus);
    }
    
    // Streak multiplier
    const streakMultiplier = this.getStreakMultiplier(currentStreak);
    baseXP *= streakMultiplier;
    
    return Math.floor(baseXP);
  }

  /**
   * Get streak multiplier based on current streak
   */
  getStreakMultiplier(streak) {
    if (streak >= 7) return this.streakMultipliers[7];
    if (streak >= 5) return this.streakMultipliers[5];
    if (streak >= 3) return this.streakMultipliers[3];
    if (streak >= 2) return this.streakMultipliers[2];
    return 1.0;
  }

  /**
   * Calculate level from total XP
   */
  calculateLevel(totalXP) {
    if (totalXP < 500) {
      return Math.floor(totalXP / 100) + 1;
    } else if (totalXP < 1500) {
      return Math.floor((totalXP - 500) / 200) + 6;
    } else if (totalXP < 3000) {
      return Math.floor((totalXP - 1500) / 300) + 11;
    } else if (totalXP < 5000) {
      return Math.floor((totalXP - 3000) / 400) + 16;
    } else {
      return Math.floor((totalXP - 5000) / 500) + 21;
    }
  }

  /**
   * Calculate XP required for a specific level
   */
  getXPForLevel(level) {
    if (level <= 5) {
      return (level - 1) * 100;
    } else if (level <= 10) {
      return 500 + ((level - 6) * 200);
    } else if (level <= 15) {
      return 1500 + ((level - 11) * 300);
    } else if (level <= 20) {
      return 3000 + ((level - 16) * 400);
    } else {
      return 5000 + ((level - 21) * 500);
    }
  }

  /**
   * Get level progress information
   */
  getLevelProgress(totalXP) {
    const currentLevel = this.calculateLevel(totalXP);
    const currentLevelXP = this.getXPForLevel(currentLevel);
    const nextLevelXP = this.getXPForLevel(currentLevel + 1);
    const progressXP = totalXP - currentLevelXP;
    const requiredXP = nextLevelXP - currentLevelXP;
    const progressPercentage = (progressXP / requiredXP) * 100;

    return {
      currentLevel,
      totalXP,
      progressXP,
      requiredXP,
      nextLevelXP,
      progressPercentage: Math.min(100, Math.max(0, progressPercentage))
    };
  }

  /**
   * Award XP to user and update database
   */
  async awardXP(userId, xpAmount, context = {}) {
    try {
      console.log('🎯 Awarding XP:', { userId, xpAmount, context });

      // Get current user progress
      userId = await getCurrentUserId();
      const currentProgress = await this.getUserProgress(userId);
      const newTotalXP = (currentProgress.total_xp || 0) + xpAmount;
      const newLevel = this.calculateLevel(newTotalXP);
      const oldLevel = currentProgress.current_level || 1;
      const leveledUp = newLevel > oldLevel;

      // Update user progress
      const { data, error } = await this.supabaseClient.supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          total_xp: newTotalXP,
          current_level: newLevel,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('🎯 Error awarding XP:', error);
        return { success: false, error };
      }

      // Log the XP gain
      await this.logXPGain(userId, xpAmount, context);

      console.log('🎯 XP awarded successfully:', {
        xpGained: xpAmount,
        newTotalXP,
        oldLevel,
        newLevel,
        leveledUp
      });

      return {
        success: true,
        xpGained: xpAmount,
        newTotalXP,
        oldLevel,
        newLevel,
        leveledUp,
        levelProgress: this.getLevelProgress(newTotalXP)
      };

    } catch (error) {
      console.error('🎯 Error in awardXP:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user progress data
   */
  async getUserProgress(userId) {
    try {
      userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('🎯 Error getting user progress:', error);
        return {};
      }

      return data || {};
    } catch (error) {
      console.error('🎯 Error in getUserProgress:', error);
      return {};
    }
  }

  /**
   * Initialize user progress if not exists
   */
  async initializeUserProgress(userId) {
    try {
      userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          total_xp: 0,
          current_level: 1,
          questions_answered: 0,
          questions_correct: 0,
          total_attempts: 0,
          current_streak: 0,
          longest_streak: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('🎯 Error initializing user progress:', error);
        return { success: false, error };
      }

      console.log('🎯 User progress initialized:', userId);
      return { success: true, data };
    } catch (error) {
      console.error('🎯 Error in initializeUserProgress:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user statistics
   */
  async updateUserStats(userId, stats) {
    try {
      userId = await getCurrentUserId();
      const updates = {
        user_id: userId,
        updated_at: new Date().toISOString(),
        ...stats
      };

      const { data, error } = await this.supabaseClient.supabase
        .from('user_progress')
        .upsert(updates)
        .select();

      if (error) {
        console.error('🎯 Error updating user stats:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('🎯 Error in updateUserStats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log XP gain for analytics
   */
  async logXPGain(userId, xpAmount, context) {
    try {
      userId = await getCurrentUserId();
      const sessionData = {
        user_id: userId,
        session_context: {
          xp_gained: xpAmount,
          source: context.source || 'question_completion',
          difficulty: context.difficulty,
          streak_multiplier: context.streakMultiplier,
          bonus_type: context.bonusType,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      };

      // We'll log this as part of quiz session data
      // This will be useful for analytics later
      console.log('🎯 XP gain logged:', sessionData);
      
    } catch (error) {
      console.error('🎯 Error logging XP gain:', error);
    }
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboardData(leaderboardType = 'weekly_xp', limit = 10) {
    try {
      const { data, error } = await this.supabaseClient.supabase
        .from('leaderboard_entries')
        .select('*')
        .eq('leaderboard_type', leaderboardType)
        .order('rank_position', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('🎯 Error getting leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('🎯 Error in getLeaderboardData:', error);
      return [];
    }
  }

  /**
   * Calculate daily bonus XP
   */
  calculateDailyBonus(perfectDay, weeklyConsistency) {
    let bonusXP = 0;
    
    if (perfectDay) {
      bonusXP += this.bonusConditions.perfectDay;
    }
    
    if (weeklyConsistency) {
      bonusXP += this.bonusConditions.weeklyConsistency;
    }
    
    return bonusXP;
  }

  /**
   * Get level benefits/unlocks
   */
  getLevelBenefits(level) {
    const benefits = [];
    
    // Theme unlocks
    if (level >= 3) benefits.push('Classic Scholar theme');
    if (level >= 6) benefits.push('Night Owl theme');
    if (level >= 9) benefits.push('Minimalist theme');
    if (level >= 12) benefits.push('Nature Scholar theme');
    if (level >= 15) benefits.push('Tech Wizard theme');
    if (level >= 18) benefits.push('Artistic Mind theme');
    if (level >= 21) benefits.push('Custom Creator theme');

    // Functional benefits
    if (level >= 5) benefits.push('Extended focus time (+5 minutes)');
    if (level >= 10) benefits.push('Hint tokens (2 per week)');
    if (level >= 15) benefits.push('Skip passes (1 per month)');
    if (level >= 20) benefits.push('Advanced analytics dashboard');

    // Avatar customizations
    if (level >= 4) benefits.push('Avatar accessories');
    if (level >= 7) benefits.push('Special avatar poses');
    if (level >= 11) benefits.push('Avatar backgrounds');
    if (level >= 16) benefits.push('Animated avatar elements');

    return benefits;
  }

  /**
   * Check if user has leveled up
   */
  hasLeveledUp(oldXP, newXP) {
    const oldLevel = this.calculateLevel(oldXP);
    const newLevel = this.calculateLevel(newXP);
    return newLevel > oldLevel;
  }

  /**
   * Get comprehensive XP summary
   */
  async getXPSummary(userId) {
    try {
      userId = await getCurrentUserId();
      const progress = await this.getUserProgress(userId);
      const levelProgress = this.getLevelProgress(progress.total_xp || 0);
      const benefits = this.getLevelBenefits(levelProgress.currentLevel);

      return {
        ...levelProgress,
        questionsAnswered: progress.questions_answered || 0,
        questionsCorrect: progress.questions_correct || 0,
        currentStreak: progress.current_streak || 0,
        longestStreak: progress.longest_streak || 0,
        levelBenefits: benefits,
        accuracy: progress.questions_answered > 0 
          ? ((progress.questions_correct / progress.questions_answered) * 100).toFixed(1)
          : 0
      };
    } catch (error) {
      console.error('🎯 Error getting XP summary:', error);
      return null;
    }
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.XPManager = XPManager;
} 