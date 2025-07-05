/**
 * StreakManager - Handles streak tracking and momentum features
 * Manages consecutive correct answers, daily participation, and streak rewards
 */
import { getCurrentUserId } from '../db/supabase-client.js';

class StreakManager {
  constructor(supabaseClient, xpManager) {
    this.supabaseClient = supabaseClient;
    this.xpManager = xpManager;
    this.streakTypes = {
      CORRECT_ANSWERS: 'correct_answers',
      DAILY_PARTICIPATION: 'daily_participation',
      CHALLENGE_COMPLETION: 'challenge_completion'
    };
    
    console.log('🔥 Streak Manager initialized');
  }

  /**
   * Update streak after a quiz session
   */
  async updateStreaks(userId, sessionResult) {
    try {
      console.log('🔥 Updating streaks for user:', userId, sessionResult);
      
      const results = {};

      // Update correct answer streak
      results.correctAnswerStreak = await this.updateCorrectAnswerStreak(
        userId, 
        sessionResult.isCorrect
      );

      // Update daily participation streak
      results.dailyParticipationStreak = await this.updateDailyParticipationStreak(userId);

      // Update challenge completion streak if applicable
      if (sessionResult.isChallenge) {
        results.challengeStreak = await this.updateChallengeStreak(
          userId, 
          sessionResult.challengeCompleted
        );
      }

      console.log('🔥 Streak update results:', results);
      return { success: true, results };

    } catch (error) {
      console.error('🔥 Error updating streaks:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update correct answer streak
   */
  async updateCorrectAnswerStreak(userId, isCorrect) {
    try {
      userId = await getCurrentUserId();
      const currentStreak = await this.getCurrentStreak(userId, this.streakTypes.CORRECT_ANSWERS);
      
      if (isCorrect) {
        // Extend or start streak
        const newStreakCount = (currentStreak?.streak_count || 0) + 1;
        
        // Update user progress with new streak
        await this.updateUserProgressStreak(userId, newStreakCount);
        
        // Update or create streak record
        const streakResult = await this.updateStreakRecord(
          userId, 
          this.streakTypes.CORRECT_ANSWERS, 
          newStreakCount, 
          true
        );

        // Check for streak milestones
        const milestones = await this.checkStreakMilestones(userId, newStreakCount);

        return {
          success: true,
          streakCount: newStreakCount,
          isActive: true,
          milestones,
          multiplier: this.getStreakMultiplier(newStreakCount)
        };
      } else {
        // Break streak
        if (currentStreak && currentStreak.is_active) {
          await this.endStreak(userId, this.streakTypes.CORRECT_ANSWERS);
          await this.updateUserProgressStreak(userId, 0);
        }

        return {
          success: true,
          streakCount: 0,
          isActive: false,
          streakBroken: currentStreak?.streak_count > 0
        };
      }
    } catch (error) {
      console.error('🔥 Error updating correct answer streak:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update daily participation streak
   */
  async updateDailyParticipationStreak(userId) {
    try {
      userId = await getCurrentUserId();
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Check if user already participated today
      const todayParticipation = await this.checkTodayParticipation(userId, today);
      if (todayParticipation.alreadyParticipated) {
        return {
          success: true,
          streakCount: todayParticipation.currentStreak,
          isActive: true,
          alreadyRecorded: true
        };
      }

      // Check yesterday's participation
      const yesterdayParticipation = await this.checkYesterdayParticipation(userId, yesterday);
      
      let newStreakCount;
      if (yesterdayParticipation) {
        // Continue existing streak
        const currentStreak = await this.getCurrentStreak(userId, this.streakTypes.DAILY_PARTICIPATION);
        newStreakCount = (currentStreak?.streak_count || 0) + 1;
      } else {
        // Start new streak
        newStreakCount = 1;
        
        // End previous streak if it exists
        const oldStreak = await this.getCurrentStreak(userId, this.streakTypes.DAILY_PARTICIPATION);
        if (oldStreak && oldStreak.is_active) {
          await this.endStreak(userId, this.streakTypes.DAILY_PARTICIPATION);
        }
      }

      // Update streak record
      await this.updateStreakRecord(
        userId, 
        this.streakTypes.DAILY_PARTICIPATION, 
        newStreakCount, 
        true
      );

      // Check for daily streak milestones
      const milestones = await this.checkDailyStreakMilestones(userId, newStreakCount);

      return {
        success: true,
        streakCount: newStreakCount,
        isActive: true,
        milestones
      };

    } catch (error) {
      console.error('🔥 Error updating daily participation streak:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update challenge completion streak
   */
  async updateChallengeStreak(userId, challengeCompleted) {
    try {
      userId = await getCurrentUserId();
      const currentStreak = await this.getCurrentStreak(userId, this.streakTypes.CHALLENGE_COMPLETION);
      
      if (challengeCompleted) {
        const newStreakCount = (currentStreak?.streak_count || 0) + 1;
        
        await this.updateStreakRecord(
          userId, 
          this.streakTypes.CHALLENGE_COMPLETION, 
          newStreakCount, 
          true
        );

        return {
          success: true,
          streakCount: newStreakCount,
          isActive: true
        };
      } else {
        // Challenge not completed, don't break streak but don't extend it
        return {
          success: true,
          streakCount: currentStreak?.streak_count || 0,
          isActive: currentStreak?.is_active || false,
          maintained: true
        };
      }
    } catch (error) {
      console.error('🔥 Error updating challenge streak:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current streak for a user and type
   */
  async getCurrentStreak(userId, streakType) {
    try {
      userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('streak_history')
        .select('*')
        .eq('user_id', userId)
        .eq('streak_type', streakType)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('🔥 Error getting current streak:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('🔥 Error in getCurrentStreak:', error);
      return null;
    }
  }

  /**
   * Update or create streak record
   */
  async updateStreakRecord(userId, streakType, streakCount, isActive) {
    try {
      userId = await getCurrentUserId();
      const existingStreak = await this.getCurrentStreak(userId, streakType);
      
      if (existingStreak) {
        // Update existing streak
        const { data, error } = await this.supabaseClient.supabase
          .from('streak_history')
          .update({
            streak_count: streakCount,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStreak.id)
          .select();

        if (error) {
          console.error('🔥 Error updating streak record:', error);
          return { success: false, error };
        }

        return { success: true, data: data[0], updated: true };
      } else {
        // Create new streak
        const { data, error } = await this.supabaseClient.supabase
          .from('streak_history')
          .insert({
            user_id: userId,
            streak_type: streakType,
            streak_count: streakCount,
            start_date: new Date().toISOString(),
            is_active: isActive,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (error) {
          console.error('🔥 Error creating streak record:', error);
          return { success: false, error };
        }

        return { success: true, data: data[0], created: true };
      }
    } catch (error) {
      console.error('🔥 Error in updateStreakRecord:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * End an active streak
   */
  async endStreak(userId, streakType) {
    try {
      userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('streak_history')
        .update({
          is_active: false,
          end_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('streak_type', streakType)
        .eq('is_active', true);

      if (error) {
        console.error('🔥 Error ending streak:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('🔥 Error in endStreak:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user progress table with current streak
   */
  async updateUserProgressStreak(userId, currentStreak) {
    try {
      userId = await getCurrentUserId();
      const userProgress = await this.xpManager.getUserProgress(userId);
      const longestStreak = Math.max(userProgress.longest_streak || 0, currentStreak);

      await this.xpManager.updateUserStats(userId, {
        current_streak: currentStreak,
        longest_streak: longestStreak
      });

      return { success: true };
    } catch (error) {
      console.error('🔥 Error updating user progress streak:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check today's participation
   */
  async checkTodayParticipation(userId, today) {
    try {
      userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('quiz_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', today)
        .lt('created_at', today + 'T23:59:59')
        .limit(1);

      if (error) {
        console.error('🔥 Error checking today participation:', error);
        return { alreadyParticipated: false };
      }

      const alreadyParticipated = data && data.length > 0;
      
      if (alreadyParticipated) {
        const currentStreak = await this.getCurrentStreak(userId, this.streakTypes.DAILY_PARTICIPATION);
        return { 
          alreadyParticipated: true, 
          currentStreak: currentStreak?.streak_count || 0 
        };
      }

      return { alreadyParticipated: false };
    } catch (error) {
      console.error('🔥 Error in checkTodayParticipation:', error);
      return { alreadyParticipated: false };
    }
  }

  /**
   * Check yesterday's participation
   */
  async checkYesterdayParticipation(userId, yesterday) {
    try {
      userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('quiz_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', yesterday)
        .lt('created_at', yesterday + 'T23:59:59')
        .limit(1);

      if (error) {
        console.error('🔥 Error checking yesterday participation:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('🔥 Error in checkYesterdayParticipation:', error);
      return false;
    }
  }

  /**
   * Check streak milestones for XP bonuses and achievements
   */
  async checkStreakMilestones(userId, streakCount) {
    const milestones = [];

    // XP multiplier milestones
    if ([2, 3, 5, 7, 10, 15, 20, 30].includes(streakCount)) {
      milestones.push({
        type: 'streak_milestone',
        streakCount,
        title: `${streakCount} Correct Streak!`,
        description: `Amazing! You've answered ${streakCount} questions correctly in a row.`,
        reward: 'XP Multiplier Increased'
      });
    }

    // Special streak achievements
    if (streakCount === 5) {
      milestones.push({
        type: 'streak_achievement',
        title: 'On Fire!',
        description: 'You\'re on a 5-question streak!',
        icon: '🔥',
        xpBonus: 25
      });
    }

    if (streakCount === 10) {
      milestones.push({
        type: 'streak_achievement',
        title: 'Unstoppable!',
        description: 'Double digits! 10 correct answers in a row!',
        icon: '⚡',
        xpBonus: 50
      });
    }

    if (streakCount === 20) {
      milestones.push({
        type: 'streak_achievement',
        title: 'Legendary Streak!',
        description: 'Incredible! 20 consecutive correct answers!',
        icon: '🏆',
        xpBonus: 100
      });
    }

    // Award XP bonuses for milestones
    for (const milestone of milestones) {
      if (milestone.xpBonus) {
        await this.xpManager.awardXP(userId, milestone.xpBonus, {
          source: 'streak_milestone',
          streakCount,
          milestoneTitle: milestone.title
        });
      }
    }

    return milestones;
  }

  /**
   * Check daily streak milestones
   */
  async checkDailyStreakMilestones(userId, streakCount) {
    const milestones = [];

    // Daily streak milestones
    if ([3, 7, 14, 30, 60, 100].includes(streakCount)) {
      let title, description, icon, xpBonus;
      
      switch (streakCount) {
        case 3:
          title = 'Habit Forming';
          description = '3 days in a row - you\'re building momentum!';
          icon = '🌱';
          xpBonus = 30;
          break;
        case 7:
          title = 'Week Warrior';
          description = 'One full week of dedication!';
          icon = '⚔️';
          xpBonus = 70;
          break;
        case 14:
          title = 'Two Week Champion';
          description = 'Fourteen days of consistent learning!';
          icon = '🏅';
          xpBonus = 140;
          break;
        case 30:
          title = 'Monthly Master';
          description = 'An entire month of daily participation!';
          icon = '👑';
          xpBonus = 300;
          break;
        case 60:
          title = 'Study Legend';
          description = 'Two months of unwavering commitment!';
          icon = '🌟';
          xpBonus = 600;
          break;
        case 100:
          title = 'Centurion Scholar';
          description = '100 days of learning excellence!';
          icon = '🎯';
          xpBonus = 1000;
          break;
      }

      milestones.push({
        type: 'daily_streak_milestone',
        streakCount,
        title,
        description,
        icon,
        xpBonus
      });

      // Award XP bonus
      if (xpBonus) {
        await this.xpManager.awardXP(userId, xpBonus, {
          source: 'daily_streak_milestone',
          streakCount,
          milestoneTitle: title
        });
      }
    }

    return milestones;
  }

  /**
   * Get streak multiplier for XP calculations
   */
  getStreakMultiplier(streakCount) {
    if (streakCount >= 7) return 2.5;
    if (streakCount >= 5) return 2.0;
    if (streakCount >= 3) return 1.5;
    if (streakCount >= 2) return 1.2;
    return 1.0;
  }

  /**
   * Get all user streaks
   */
  async getUserStreaks(userId) {
    try {
      userId = await getCurrentUserId();
      const streaks = {};
      
      for (const streakType of Object.values(this.streakTypes)) {
        const currentStreak = await this.getCurrentStreak(userId, streakType);
        const longestStreak = await this.getLongestStreak(userId, streakType);
        
        streaks[streakType] = {
          current: currentStreak ? {
            count: currentStreak.streak_count,
            isActive: currentStreak.is_active,
            startDate: currentStreak.start_date
          } : { count: 0, isActive: false },
          longest: longestStreak ? {
            count: longestStreak.streak_count,
            startDate: longestStreak.start_date,
            endDate: longestStreak.end_date
          } : { count: 0 }
        };
      }

      return { success: true, streaks };
    } catch (error) {
      console.error('🔥 Error getting user streaks:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get longest streak for a user and type
   */
  async getLongestStreak(userId, streakType) {
    try {
      userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('streak_history')
        .select('*')
        .eq('user_id', userId)
        .eq('streak_type', streakType)
        .order('streak_count', { ascending: false })
        .limit(1);

      if (error) {
        console.error('🔥 Error getting longest streak:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('🔥 Error in getLongestStreak:', error);
      return null;
    }
  }

  /**
   * Get streak statistics and motivation
   */
  async getStreakStats(userId) {
    try {
      userId = await getCurrentUserId();
      const userStreaks = await this.getUserStreaks(userId);
      if (!userStreaks.success) {
        return { success: false, error: userStreaks.error };
      }

      const correctAnswerStreak = userStreaks.streaks[this.streakTypes.CORRECT_ANSWERS];
      const dailyStreak = userStreaks.streaks[this.streakTypes.DAILY_PARTICIPATION];
      const challengeStreak = userStreaks.streaks[this.streakTypes.CHALLENGE_COMPLETION];

      const stats = {
        correctAnswers: {
          current: correctAnswerStreak.current.count,
          longest: correctAnswerStreak.longest.count,
          isActive: correctAnswerStreak.current.isActive,
          multiplier: this.getStreakMultiplier(correctAnswerStreak.current.count)
        },
        dailyParticipation: {
          current: dailyStreak.current.count,
          longest: dailyStreak.longest.count,
          isActive: dailyStreak.current.isActive
        },
        challengeCompletion: {
          current: challengeStreak.current.count,
          longest: challengeStreak.longest.count,
          isActive: challengeStreak.current.isActive
        },
        motivation: this.getMotivationalMessage(
          correctAnswerStreak.current.count, 
          dailyStreak.current.count
        )
      };

      return { success: true, stats };
    } catch (error) {
      console.error('🔥 Error getting streak stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get motivational message based on streaks
   */
  getMotivationalMessage(correctStreak, dailyStreak) {
    if (correctStreak >= 10) {
      return {
        title: "You're on fire! 🔥",
        message: `${correctStreak} correct answers in a row! Keep this momentum going!`,
        level: 'excellent'
      };
    } else if (correctStreak >= 5) {
      return {
        title: "Great streak! ⚡",
        message: `${correctStreak} correct answers! You're doing amazing!`,
        level: 'great'
      };
    } else if (correctStreak >= 2) {
      return {
        title: "Building momentum! 🌟",
        message: `${correctStreak} in a row! Keep it up!`,
        level: 'good'
      };
    } else if (dailyStreak >= 7) {
      return {
        title: "Consistent learner! 📚",
        message: `${dailyStreak} days of learning! Consistency is key to success!`,
        level: 'great'
      };
    } else {
      return {
        title: "Ready to start! 🚀",
        message: "Every expert was once a beginner. Let's build that streak!",
        level: 'encouraging'
      };
    }
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.StreakManager = StreakManager;
} 