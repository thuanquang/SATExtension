/**
 * BadgeManager - Handles badge definitions, progress tracking, and achievements
 * Manages all gamification badges and recognition systems
 */
import { getCurrentUserId } from '../db/supabase-client.js';

class BadgeManager {
  constructor(supabaseClient, xpManager) {
    this.supabaseClient = supabaseClient;
    this.xpManager = xpManager;
    this.badgeDefinitions = new Map();
    this.userBadges = new Map();
    
    console.log('🏆 Badge Manager initialized');
  }

  /**
   * Initialize badge system - load definitions and user badges
   */
  async initialize() {
    try {
      await this.loadBadgeDefinitions();
      const userId = await getCurrentUserId();
      if (userId) {
        await this.loadUserBadges();
      }
      console.log('🏆 Badge system initialized');
      return { success: true };
    } catch (error) {
      console.error('🏆 Error initializing badge system:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load all badge definitions from database
   */
  async loadBadgeDefinitions() {
    try {
      const { data, error } = await this.supabaseClient.supabase
        .from('badge_definitions')
        .select('*')
        .eq('is_active', true)
        .order('badge_category', { ascending: true });

      if (error) {
        console.error('🏆 Error loading badge definitions:', error);
        return;
      }

      this.badgeDefinitions.clear();
      data.forEach(badge => {
        this.badgeDefinitions.set(badge.badge_id, badge);
      });

      console.log('🏆 Loaded badge definitions:', this.badgeDefinitions.size);
    } catch (error) {
      console.error('🏆 Error in loadBadgeDefinitions:', error);
    }
  }

  /**
   * Load user's earned badges
   */
  async loadUserBadges() {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('🏆 Error loading user badges:', error);
        return;
      }

      this.userBadges.clear();
      data.forEach(badge => {
        this.userBadges.set(badge.badge_id, badge);
      });

      console.log('🏆 Loaded user badges:', this.userBadges.size);
    } catch (error) {
      console.error('🏆 Error in loadUserBadges:', error);
    }
  }

  /**
   * Check and award badges based on user progress
   */
  async checkAndAwardBadges(progressData) {
    try {
      const newBadges = [];
      
      for (const [badgeId, badgeDefinition] of this.badgeDefinitions) {
        // Skip if user already has this badge
        if (this.userBadges.has(badgeId)) {
          continue;
        }

        // Check if requirements are met
        if (await this.checkBadgeRequirements(badgeDefinition, progressData)) {
          const result = await this.awardBadge(badgeId);
          if (result.success) {
            newBadges.push({
              ...badgeDefinition,
              earnedAt: new Date().toISOString()
            });
          }
        }
      }

      return {
        success: true,
        newBadges,
        badgeCount: newBadges.length
      };
    } catch (error) {
      console.error('🏆 Error checking badges:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if badge requirements are met
   */
  async checkBadgeRequirements(badgeDefinition, progressData) {
    try {
      const requirements = badgeDefinition.requirements;
      const category = badgeDefinition.badge_category;

      switch (category) {
        case 'subject':
          return await this.checkSubjectBadgeRequirements(requirements, progressData);
        
        case 'difficulty':
          return await this.checkDifficultyBadgeRequirements(requirements, progressData);
        
        case 'consistency':
          return await this.checkConsistencyBadgeRequirements(requirements, progressData);
        
        case 'special':
          return await this.checkSpecialBadgeRequirements(requirements, progressData);
        
        default:
          console.warn('🏆 Unknown badge category:', category);
          return false;
      }
    } catch (error) {
      console.error('🏆 Error checking badge requirements:', error);
      return false;
    }
  }

  /**
   * Check subject mastery badge requirements
   */
  async checkSubjectBadgeRequirements(requirements, progressData) {
    const subject = requirements.subject;
    const requiredCorrect = requirements.correct_answers;
    const requiredAccuracy = requirements.accuracy || 0;

    // Get subject-specific progress
    const subjectProgress = await this.getSubjectProgress(subject);
    
    const hasEnoughCorrect = subjectProgress.questions_correct >= requiredCorrect;
    const hasRequiredAccuracy = subjectProgress.accuracy_percentage >= requiredAccuracy;

    return hasEnoughCorrect && hasRequiredAccuracy;
  }

  /**
   * Check difficulty conquest badge requirements
   */
  async checkDifficultyBadgeRequirements(requirements, progressData) {
    if (requirements.difficulty && requirements.correct_answers) {
      // Single difficulty requirement
      const difficultyProgress = await this.getDifficultyProgress(requirements.difficulty);
      return difficultyProgress.correct >= requirements.correct_answers;
    }

    if (requirements.easy && requirements.medium && requirements.hard) {
      // Multi-difficulty requirement (Difficulty Destroyer)
      const easyProgress = await this.getDifficultyProgress('easy');
      const mediumProgress = await this.getDifficultyProgress('medium');
      const hardProgress = await this.getDifficultyProgress('hard');

      return easyProgress.correct >= requirements.easy &&
             mediumProgress.correct >= requirements.medium &&
             hardProgress.correct >= requirements.hard;
    }

    if (requirements.attempts && requirements.difficulty) {
      // Attempt-based requirement (Challenge Seeker)
      const difficultyProgress = await this.getDifficultyProgress(requirements.difficulty);
      return difficultyProgress.total >= requirements.attempts;
    }

    return false;
  }

  /**
   * Check consistency badge requirements
   */
  async checkConsistencyBadgeRequirements(requirements, progressData) {
    const requiredStreak = requirements.streak_days;
    
    // Get current streak from progress data or database
    const userProgress = await this.xpManager.getUserProgress();
    const currentStreak = userProgress.current_streak || 0;

    return currentStreak >= requiredStreak;
  }

  /**
   * Check special achievement badge requirements
   */
  async checkSpecialBadgeRequirements(requirements, progressData) {
    // First Try Genius
    if (requirements.first_attempt_correct) {
      const firstTryCount = await this.getFirstAttemptCorrectCount();
      return firstTryCount >= requirements.first_attempt_correct;
    }

    // Comeback Kid
    if (requirements.comeback_correct) {
      const comebackCount = await this.getComebackCorrectCount();
      return comebackCount >= requirements.comeback_correct;
    }

    // Speed Demon
    if (requirements.quick_answers && requirements.time_limit) {
      const quickAnswerCount = await this.getQuickAnswerCount(requirements.time_limit);
      return quickAnswerCount >= requirements.quick_answers;
    }

    // Patient Scholar / Knowledge Seeker
    if (requirements.explanations_reviewed) {
      const reviewCount = await this.getExplanationReviewCount();
      return reviewCount >= requirements.explanations_reviewed;
    }

    // Perfect Day
    if (requirements.perfect_day) {
      return await this.checkPerfectDay();
    }

    // Subject Sampler
    if (requirements.all_subjects) {
      return await this.checkAllSubjectsAnswered();
    }

    // Improvement Star
    if (requirements.accuracy_improvement && requirements.period_days) {
      return await this.checkAccuracyImprovement(requirements.accuracy_improvement, requirements.period_days);
    }

    // Consistency King/Queen
    if (requirements.completion_rate && requirements.period_days) {
      return await this.checkCompletionRate(requirements.completion_rate, requirements.period_days);
    }

    return false;
  }

  /**
   * Award badge to user
   */
  async awardBadge(badgeId) {
    try {
      const badgeDefinition = this.badgeDefinitions.get(badgeId);
      if (!badgeDefinition) {
        console.error('🏆 Badge definition not found:', badgeId);
        return { success: false, error: 'Badge definition not found' };
      }

      const userId = await getCurrentUserId();

      // Insert user badge record
      const { data, error } = await this.supabaseClient.supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badgeId,
          earned_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('🏆 Error awarding badge:', error);
        return { success: false, error };
      }

      // Add to local cache
      this.userBadges.set(badgeId, data[0]);

      // Award XP bonus if specified
      if (badgeDefinition.reward_xp > 0) {
        await this.xpManager.awardXP(userId, badgeDefinition.reward_xp, {
          source: 'badge_earned',
          badgeId: badgeId,
          badgeName: badgeDefinition.badge_name
        });
      }

      console.log('🏆 Badge awarded:', {
        userId,
        badgeId,
        badgeName: badgeDefinition.badge_name,
        rewardXP: badgeDefinition.reward_xp
      });

      return {
        success: true,
        badge: badgeDefinition,
        earnedAt: data[0].earned_at
      };
    } catch (error) {
      console.error('🏆 Error in awardBadge:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's badge collection
   */
  getUserBadges(category = null) {
    const badges = Array.from(this.userBadges.values()).map(userBadge => {
      const definition = this.badgeDefinitions.get(userBadge.badge_id);
      return {
        ...definition,
        earnedAt: userBadge.earned_at,
        progressData: userBadge.progress_data
      };
    });

    if (category) {
      return badges.filter(badge => badge.badge_category === category);
    }

    return badges;
  }

  /**
   * Get badge progress for all badges
   */
  async getBadgeProgress() {
    try {
      const progress = {};
      
      for (const [badgeId, badgeDefinition] of this.badgeDefinitions) {
        const isEarned = this.userBadges.has(badgeId);
        
        if (isEarned) {
          progress[badgeId] = {
            ...badgeDefinition,
            earned: true,
            earnedAt: this.userBadges.get(badgeId).earned_at,
            progress: 100
          };
        } else {
          const progressPercentage = await this.calculateBadgeProgress(badgeDefinition);
          progress[badgeId] = {
            ...badgeDefinition,
            earned: false,
            progress: progressPercentage
          };
        }
      }

      return progress;
    } catch (error) {
      console.error('🏆 Error getting badge progress:', error);
      return {};
    }
  }

  /**
   * Calculate progress towards a badge
   */
  async calculateBadgeProgress(badgeDefinition) {
    try {
      const requirements = badgeDefinition.requirements;
      const category = badgeDefinition.badge_category;

      switch (category) {
        case 'subject':
          const subjectProgress = await this.getSubjectProgress(requirements.subject);
          const correctProgress = (subjectProgress.questions_correct / requirements.correct_answers) * 100;
          const accuracyProgress = requirements.accuracy ? 
            (subjectProgress.accuracy_percentage / requirements.accuracy) * 100 : 100;
          return Math.min(100, Math.min(correctProgress, accuracyProgress));

        case 'difficulty':
          if (requirements.difficulty && requirements.correct_answers) {
            const difficultyProgress = await this.getDifficultyProgress(requirements.difficulty);
            return Math.min(100, (difficultyProgress.correct / requirements.correct_answers) * 100);
          }
          break;

        case 'consistency':
          const userProgress = await this.xpManager.getUserProgress();
          const currentStreak = userProgress.current_streak || 0;
          return Math.min(100, (currentStreak / requirements.streak_days) * 100);

        case 'special':
          // Handle different special badge types
          if (requirements.first_attempt_correct) {
            const count = await this.getFirstAttemptCorrectCount();
            return Math.min(100, (count / requirements.first_attempt_correct) * 100);
          }
          // Add more special badge progress calculations as needed
          break;

        default:
          return 0;
      }

      return 0;
    } catch (error) {
      console.error('🏆 Error calculating badge progress:', error);
      return 0;
    }
  }

  /**
   * Helper method to get subject progress
   */
  async getSubjectProgress(subject) {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('subject_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('subject', subject)
        .single();

      if (error || !data) {
        return {
          questions_answered: 0,
          questions_correct: 0,
          accuracy_percentage: 0
        };
      }

      return data;
    } catch (error) {
      console.error('🏆 Error getting subject progress:', error);
      return {
        questions_answered: 0,
        questions_correct: 0,
        accuracy_percentage: 0
      };
    }
  }

  /**
   * Helper method to get difficulty progress
   */
  async getDifficultyProgress(difficulty) {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('quiz_sessions')
        .select('is_correct')
        .eq('user_id', userId)
        .eq('difficulty_level', difficulty);

      if (error || !data) {
        return { total: 0, correct: 0 };
      }

      const total = data.length;
      const correct = data.filter(session => session.is_correct).length;

      return { total, correct };
    } catch (error) {
      console.error('🏆 Error getting difficulty progress:', error);
      return { total: 0, correct: 0 };
    }
  }

  /**
   * Helper methods for special badge requirements
   */
  async getFirstAttemptCorrectCount() {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_correct', true)
        .eq('attempts_used', 1);

      return error ? 0 : data.length;
    } catch (error) {
      return 0;
    }
  }

  async getComebackCorrectCount() {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_correct', true)
        .gte('attempts_used', 3);

      return error ? 0 : data.length;
    } catch (error) {
      return 0;
    }
  }

  async getQuickAnswerCount(timeLimit) {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_correct', true)
        .lt('time_to_answer', timeLimit * 1000); // Convert to milliseconds

      return error ? 0 : data.length;
    } catch (error) {
      return 0;
    }
  }

  async getExplanationReviewCount() {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('explanation_viewed', true)
        .gt('explanation_time', 5000); // At least 5 seconds

      return error ? 0 : data.length;
    } catch (error) {
      return 0;
    }
  }

  async checkPerfectDay() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await this.supabaseClient.supabase
        .from('quiz_sessions')
        .select('is_correct')
        .eq('user_id', userId)
        .gte('created_at', today)
        .lt('created_at', today + 'T23:59:59');

      if (error || !data || data.length === 0) {
        return false;
      }

      return data.every(session => session.is_correct);
    } catch (error) {
      return false;
    }
  }

  async checkAllSubjectsAnswered() {
    const subjects = ['Algebra', 'Geometry', 'Grammar', 'Vocabulary'];
    
    try {
      for (const subject of subjects) {
        const progress = await this.getSubjectProgress(subject);
        if (progress.questions_correct === 0) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkAccuracyImprovement(requiredImprovement, periodDays) {
    // Implementation for checking accuracy improvement over time
    // This would require more complex analytics
    return false; // Placeholder
  }

  async checkCompletionRate(requiredRate, periodDays) {
    // Implementation for checking quiz completion rate
    // This would require tracking quiz triggers vs completions
    return false; // Placeholder
  }

  /**
   * Get badge statistics
   */
  getBadgeStats() {
    const totalBadges = this.badgeDefinitions.size;
    const earnedBadges = this.userBadges.size;
    const categories = {};

    for (const [badgeId, badge] of this.badgeDefinitions) {
      const category = badge.badge_category;
      if (!categories[category]) {
        categories[category] = { total: 0, earned: 0 };
      }
      categories[category].total++;
      
      if (this.userBadges.has(badgeId)) {
        categories[category].earned++;
      }
    }

    return {
      totalBadges,
      earnedBadges,
      completionPercentage: totalBadges > 0 ? ((earnedBadges / totalBadges) * 100).toFixed(1) : 0,
      categories
    };
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.BadgeManager = BadgeManager;
} 