/**
 * ChallengeEngine - Manages daily challenges and themed events
 * Handles challenge generation, progress tracking, and rewards
 */
import { getCurrentUserId } from '../db/supabase-client.js';

class ChallengeEngine {
  constructor(supabaseClient, xpManager, badgeManager) {
    this.supabaseClient = supabaseClient;
    this.xpManager = xpManager;
    this.badgeManager = badgeManager;
    
    // Challenge types and themes
    this.challengeTypes = {
      MATH_MONDAY: 'math_monday',
      TACTICAL_TUESDAY: 'tactical_tuesday',
      WORD_WEDNESDAY: 'word_wednesday',
      THINKING_THURSDAY: 'thinking_thursday',
      FAST_FRIDAY: 'fast_friday',
      CHOICE_SATURDAY: 'choice_saturday',
      SUNDAY_REVIEW: 'sunday_review'
    };
    
    // Challenge difficulty scaling
    this.difficultyScaling = {
      beginner: { minQuestions: 2, maxQuestions: 3, timeBonus: false },
      intermediate: { minQuestions: 3, maxQuestions: 4, timeBonus: true },
      advanced: { minQuestions: 4, maxQuestions: 5, timeBonus: true },
      expert: { minQuestions: 5, maxQuestions: 6, timeBonus: true }
    };
    
    console.log('🎯 Challenge Engine initialized');
  }

  /**
   * Initialize challenge system for user
   */
  async initializeChallenges() {
    try {
      console.log('🎯 Initializing challenges for user:', await getCurrentUserId());
      
      // Load existing challenges
      await this.loadActiveChallenges();
      
      // Generate today's challenge if not exists
      await this.generateDailyChallenge();
      
      console.log('🎯 Challenge system initialized');
      return { success: true };
    } catch (error) {
      console.error('🎯 Error initializing challenges:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate daily challenge based on current date and user level
   */
  async generateDailyChallenge() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Check if challenge already exists for today
      const existingChallenge = await this.getTodaysChallenge(today);
      if (existingChallenge) {
        console.log('🎯 Daily challenge already exists for today');
        return existingChallenge;
      }
      
      // Get user level for difficulty scaling
      const userProgress = await this.xpManager.getUserProgress(await getCurrentUserId());
      const userLevel = userProgress.current_level || 1;
      const difficulty = this.getUserDifficultyTier(userLevel);
      
      // Generate challenge based on day of week
      const challengeData = this.generateChallengeByDay(dayOfWeek, difficulty);
      
      // Save challenge to database
      const challenge = await this.createChallenge(today, challengeData);
      
      console.log('🎯 Daily challenge generated:', challenge);
      return challenge;
      
    } catch (error) {
      console.error('🎯 Error generating daily challenge:', error);
      return null;
    }
  }

  /**
   * Generate challenge configuration based on day of week
   */
  generateChallengeByDay(dayOfWeek, difficulty) {
    const scaling = this.difficultyScaling[difficulty];
    
    switch (dayOfWeek) {
      case 1: // Monday - Math Monday
        return {
          type: this.challengeTypes.MATH_MONDAY,
          name: 'Math Monday Challenge',
          description: 'Master mathematical concepts to start your week strong!',
          icon: '🧮',
          requirements: {
            subjects: ['Algebra', 'Geometry'],
            min_questions: scaling.minQuestions,
            target_questions: scaling.maxQuestions,
            bonus_xp_multiplier: 1.5,
            required_accuracy: 70
          },
          rewards: {
            xp_bonus: 50,
            badge_progress: 'math_focus',
            streak_bonus: 'math_mastery'
          },
          timeLimit: null // No time limit for Math Monday
        };

      case 2: // Tuesday - Tactical Tuesday
        return {
          type: this.challengeTypes.TACTICAL_TUESDAY,
          name: 'Tactical Tuesday',
          description: 'Progress through difficulty levels strategically!',
          icon: '🎯',
          requirements: {
            difficulty_progression: ['easy', 'medium', 'hard'],
            min_questions: scaling.minQuestions,
            streak_bonus: 0.5,
            consecutive_correct: 3
          },
          rewards: {
            xp_bonus: 75,
            badge_progress: 'difficulty_conquest',
            special_unlock: 'tactical_badge'
          },
          timeLimit: null
        };

      case 3: // Wednesday - Word Wednesday
        return {
          type: this.challengeTypes.WORD_WEDNESDAY,
          name: 'Word Wednesday',
          description: 'Expand your vocabulary and grammar mastery!',
          icon: '📖',
          requirements: {
            subjects: ['Vocabulary', 'Grammar'],
            min_questions: scaling.minQuestions,
            target_questions: scaling.maxQuestions,
            bonus_xp_multiplier: 1.5,
            required_accuracy: 75
          },
          rewards: {
            xp_bonus: 50,
            badge_progress: 'verbal_focus',
            vocab_boost: true
          },
          timeLimit: null
        };

      case 4: // Thursday - Thinking Thursday
        return {
          type: this.challengeTypes.THINKING_THURSDAY,
          name: 'Thinking Thursday',
          description: 'Focus on weak areas and turn them into strengths!',
          icon: '🧠',
          requirements: {
            weakness_focus: true,
            min_questions: scaling.minQuestions,
            improvement_target: 20, // 20% improvement in weak areas
            review_explanations: true
          },
          rewards: {
            xp_bonus: 100,
            badge_progress: 'improvement_star',
            weakness_boost: true
          },
          timeLimit: null
        };

      case 5: // Friday - Fast Friday
        return {
          type: this.challengeTypes.FAST_FRIDAY,
          name: 'Fast Friday',
          description: 'Speed and accuracy challenge - beat the clock!',
          icon: '⚡',
          requirements: {
            time_limit_per_question: 30, // 30 seconds per question
            min_questions: scaling.minQuestions,
            speed_bonus_threshold: 20, // Under 20 seconds for bonus
            required_accuracy: 80
          },
          rewards: {
            xp_bonus: 60,
            badge_progress: 'speed_demon',
            time_master_boost: true
          },
          timeLimit: scaling.minQuestions * 30 * 1000 // Total time limit
        };

      case 6: // Saturday - Choice Saturday
        return {
          type: this.challengeTypes.CHOICE_SATURDAY,
          name: 'Choice Saturday',
          description: 'You choose your focus - any subject, any difficulty!',
          icon: '🎪',
          requirements: {
            user_choice: true,
            min_questions: scaling.minQuestions,
            flexibility_bonus: 0.25, // 25% bonus for self-direction
            any_subject: true
          },
          rewards: {
            xp_bonus: 40,
            badge_progress: 'self_directed',
            choice_freedom: true
          },
          timeLimit: null
        };

      case 0: // Sunday - Review Sunday
        return {
          type: this.challengeTypes.SUNDAY_REVIEW,
          name: 'Sunday Review',
          description: 'Review the week\'s learning and consolidate knowledge!',
          icon: '📚',
          requirements: {
            review_mode: true,
            min_questions: scaling.minQuestions,
            previous_week_focus: true,
            explanation_time: 10 // Minimum 10 seconds on explanations
          },
          rewards: {
            xp_bonus: 80,
            badge_progress: 'knowledge_seeker',
            weekly_completion_bonus: true
          },
          timeLimit: null
        };

      default:
        return this.generateChallengeByDay(1, difficulty); // Default to Monday
    }
  }

  /**
   * Get user difficulty tier based on level
   */
  getUserDifficultyTier(level) {
    if (level <= 5) return 'beginner';
    if (level <= 10) return 'intermediate';
    if (level <= 15) return 'advanced';
    return 'expert';
  }

  /**
   * Create challenge in database
   */
  async createChallenge(date, challengeData) {
    try {
      const { data, error } = await this.supabaseClient.supabase
        .from('daily_challenges')
        .insert({
          challenge_date: date,
          challenge_type: challengeData.type,
          challenge_name: challengeData.name,
          challenge_description: challengeData.description,
          requirements: challengeData.requirements,
          rewards: challengeData.rewards,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('🎯 Error creating challenge:', error);
        return null;
      }

      // Initialize user progress for this challenge
      await this.initializeUserChallengeProgress(data.challenge_id);

      return {
        ...data,
        icon: challengeData.icon,
        timeLimit: challengeData.timeLimit
      };
    } catch (error) {
      console.error('🎯 Error in createChallenge:', error);
      return null;
    }
  }

  /**
   * Initialize user progress for a challenge
   */
  async initializeUserChallengeProgress(challengeId) {
    try {
      const { data, error } = await this.supabaseClient.supabase
        .from('user_challenge_progress')
        .insert({
          user_id: await getCurrentUserId(),
          challenge_id: challengeId,
          progress_data: {
            questions_attempted: 0,
            questions_correct: 0,
            subjects_completed: {},
            difficulty_progression: {},
            start_time: new Date().toISOString(),
            special_conditions_met: {}
          },
          is_completed: false
        })
        .select();

      if (error) {
        console.error('🎯 Error initializing challenge progress:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('🎯 Error in initializeUserChallengeProgress:', error);
      return false;
    }
  }

  /**
   * Update challenge progress after quiz completion
   */
  async updateChallengeProgress(quizResult) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todaysChallenge = await this.getTodaysChallenge(today);
      
      if (!todaysChallenge) {
        console.log('🎯 No active challenge for today');
        return { success: false, reason: 'no_active_challenge' };
      }

      // Get current progress
      const currentProgress = await this.getUserChallengeProgress(todaysChallenge.challenge_id);
      if (!currentProgress) {
        console.error('🎯 No progress record found for challenge');
        return { success: false, reason: 'no_progress_record' };
      }

      // Update progress based on quiz result
      const updatedProgress = this.calculateProgressUpdate(
        currentProgress.progress_data, 
        quizResult, 
        todaysChallenge.requirements
      );

      // Check if challenge is completed
      const isCompleted = this.checkChallengeCompletion(updatedProgress, todaysChallenge.requirements);

      // Update database
      const { data, error } = await this.supabaseClient.supabase
        .from('user_challenge_progress')
        .update({
          progress_data: updatedProgress,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', await getCurrentUserId())
        .eq('challenge_id', todaysChallenge.challenge_id)
        .select();

      if (error) {
        console.error('🎯 Error updating challenge progress:', error);
        return { success: false, error: error.message };
      }

      // Award rewards if completed
      let rewards = {};
      if (isCompleted && !currentProgress.is_completed) {
        rewards = await this.awardChallengeRewards(todaysChallenge);
      }

      console.log('🎯 Challenge progress updated:', {
        progress: updatedProgress,
        completed: isCompleted,
        rewards: rewards
      });

      return {
        success: true,
        progress: updatedProgress,
        completed: isCompleted,
        rewards: rewards,
        challenge: todaysChallenge
      };

    } catch (error) {
      console.error('🎯 Error updating challenge progress:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate progress update based on quiz result
   */
  calculateProgressUpdate(currentProgress, quizResult, requirements) {
    const progress = { ...currentProgress };
    
    // Update basic counters
    progress.questions_attempted = (progress.questions_attempted || 0) + 1;
    if (quizResult.isCorrect) {
      progress.questions_correct = (progress.questions_correct || 0) + 1;
    }

    // Update subject progress
    if (quizResult.subject) {
      if (!progress.subjects_completed) progress.subjects_completed = {};
      if (!progress.subjects_completed[quizResult.subject]) {
        progress.subjects_completed[quizResult.subject] = { attempted: 0, correct: 0 };
      }
      progress.subjects_completed[quizResult.subject].attempted++;
      if (quizResult.isCorrect) {
        progress.subjects_completed[quizResult.subject].correct++;
      }
    }

    // Update difficulty progression
    if (quizResult.difficulty) {
      if (!progress.difficulty_progression) progress.difficulty_progression = {};
      if (!progress.difficulty_progression[quizResult.difficulty]) {
        progress.difficulty_progression[quizResult.difficulty] = { attempted: 0, correct: 0 };
      }
      progress.difficulty_progression[quizResult.difficulty].attempted++;
      if (quizResult.isCorrect) {
        progress.difficulty_progression[quizResult.difficulty].correct++;
      }
    }

    // Update special conditions
    if (!progress.special_conditions_met) progress.special_conditions_met = {};

    // Speed challenge conditions
    if (requirements.time_limit_per_question && quizResult.timeToAnswer) {
      const timeInSeconds = quizResult.timeToAnswer / 1000;
      if (timeInSeconds <= requirements.speed_bonus_threshold) {
        progress.special_conditions_met.speed_bonus_achieved = (progress.special_conditions_met.speed_bonus_achieved || 0) + 1;
      }
    }

    // Consecutive correct tracking
    if (requirements.consecutive_correct) {
      if (quizResult.isCorrect) {
        progress.special_conditions_met.current_streak = (progress.special_conditions_met.current_streak || 0) + 1;
        progress.special_conditions_met.max_streak = Math.max(
          progress.special_conditions_met.max_streak || 0,
          progress.special_conditions_met.current_streak
        );
      } else {
        progress.special_conditions_met.current_streak = 0;
      }
    }

    // Explanation viewing time
    if (requirements.explanation_time && quizResult.explanationTime) {
      if (quizResult.explanationTime >= requirements.explanation_time * 1000) {
        progress.special_conditions_met.thorough_explanations = (progress.special_conditions_met.thorough_explanations || 0) + 1;
      }
    }

    return progress;
  }

  /**
   * Check if challenge requirements are met
   */
  checkChallengeCompletion(progress, requirements) {
    // Check minimum questions
    if (requirements.min_questions && progress.questions_attempted < requirements.min_questions) {
      return false;
    }

    // Check accuracy requirement
    if (requirements.required_accuracy && progress.questions_attempted > 0) {
      const accuracy = (progress.questions_correct / progress.questions_attempted) * 100;
      if (accuracy < requirements.required_accuracy) {
        return false;
      }
    }

    // Check subject requirements
    if (requirements.subjects && requirements.subjects.length > 0) {
      for (const subject of requirements.subjects) {
        const subjectProgress = progress.subjects_completed?.[subject];
        if (!subjectProgress || subjectProgress.correct === 0) {
          return false;
        }
      }
    }

    // Check difficulty progression
    if (requirements.difficulty_progression && requirements.difficulty_progression.length > 0) {
      for (const difficulty of requirements.difficulty_progression) {
        const difficultyProgress = progress.difficulty_progression?.[difficulty];
        if (!difficultyProgress || difficultyProgress.correct === 0) {
          return false;
        }
      }
    }

    // Check consecutive correct
    if (requirements.consecutive_correct) {
      const maxStreak = progress.special_conditions_met?.max_streak || 0;
      if (maxStreak < requirements.consecutive_correct) {
        return false;
      }
    }

    return true;
  }

  /**
   * Award challenge completion rewards
   */
  async awardChallengeRewards(challenge) {
    try {
      const rewards = {
        xp: 0,
        badges: [],
        special: []
      };

      // Award XP bonus
      if (challenge.rewards.xp_bonus) {
        const xpResult = await this.xpManager.awardXP(await getCurrentUserId(), challenge.rewards.xp_bonus, {
          source: 'daily_challenge',
          challengeType: challenge.challenge_type,
          challengeName: challenge.challenge_name
        });
        
        if (xpResult.success) {
          rewards.xp = challenge.rewards.xp_bonus;
        }
      }

      // Update badge progress
      if (challenge.rewards.badge_progress) {
        // This would trigger specific badge progress updates
        rewards.special.push({
          type: 'badge_progress',
          category: challenge.rewards.badge_progress,
          progress: 1
        });
      }

      // Award special unlocks
      if (challenge.rewards.special_unlock) {
        rewards.special.push({
          type: 'special_unlock',
          unlock: challenge.rewards.special_unlock
        });
      }

      console.log('🎯 Challenge rewards awarded:', rewards);
      return rewards;

    } catch (error) {
      console.error('🎯 Error awarding challenge rewards:', error);
      return {};
    }
  }

  /**
   * Get today's challenge for user
   */
  async getTodaysChallenge(date) {
    try {
      const { data, error } = await this.supabaseClient.supabase
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', date)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('🎯 Error getting today\'s challenge:', error);
      return null;
    }
  }

  /**
   * Get user's challenge progress
   */
  async getUserChallengeProgress(challengeId) {
    try {
      const { data, error } = await this.supabaseClient.supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', await getCurrentUserId())
        .eq('challenge_id', challengeId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('🎯 Error getting user challenge progress:', error);
      return null;
    }
  }

  /**
   * Load active challenges for user
   */
  async loadActiveChallenges() {
    try {
      const { data, error } = await this.supabaseClient.supabase
        .from('user_challenge_progress')
        .select(`
          *,
          daily_challenges (*)
        `)
        .eq('user_id', await getCurrentUserId())
        .eq('is_completed', false)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      if (error) {
        console.error('🎯 Error loading active challenges:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('🎯 Error in loadActiveChallenges:', error);
      return [];
    }
  }

  /**
   * Get challenge summary for display
   */
  async getChallengesSummary() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todaysChallenge = await this.getTodaysChallenge(today);
      
      if (!todaysChallenge) {
        return {
          success: false,
          message: 'No challenge available for today'
        };
      }

      const userProgress = await this.getUserChallengeProgress(todaysChallenge.challenge_id);
      
      const summary = {
        challenge: {
          name: todaysChallenge.challenge_name,
          description: todaysChallenge.challenge_description,
          type: todaysChallenge.challenge_type,
          requirements: todaysChallenge.requirements,
          rewards: todaysChallenge.rewards,
          icon: this.getChallengeIcon(todaysChallenge.challenge_type)
        },
        progress: userProgress ? {
          questionsAttempted: userProgress.progress_data.questions_attempted || 0,
          questionsCorrect: userProgress.progress_data.questions_correct || 0,
          isCompleted: userProgress.is_completed,
          accuracy: userProgress.progress_data.questions_attempted > 0 
            ? Math.round((userProgress.progress_data.questions_correct / userProgress.progress_data.questions_attempted) * 100)
            : 0,
          specialConditions: userProgress.progress_data.special_conditions_met || {}
        } : {
          questionsAttempted: 0,
          questionsCorrect: 0,
          isCompleted: false,
          accuracy: 0,
          specialConditions: {}
        }
      };

      return {
        success: true,
        data: summary
      };

    } catch (error) {
      console.error('🎯 Error getting challenges summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get challenge icon based on type
   */
  getChallengeIcon(challengeType) {
    const icons = {
      [this.challengeTypes.MATH_MONDAY]: '🧮',
      [this.challengeTypes.TACTICAL_TUESDAY]: '🎯',
      [this.challengeTypes.WORD_WEDNESDAY]: '📖',
      [this.challengeTypes.THINKING_THURSDAY]: '🧠',
      [this.challengeTypes.FAST_FRIDAY]: '⚡',
      [this.challengeTypes.CHOICE_SATURDAY]: '🎪',
      [this.challengeTypes.SUNDAY_REVIEW]: '📚'
    };
    
    return icons[challengeType] || '🎯';
  }

  /**
   * Get weekly challenge statistics
   */
  async getWeeklyChallengeStats() {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const { data, error } = await this.supabaseClient.supabase
        .from('user_challenge_progress')
        .select(`
          *,
          daily_challenges!inner (challenge_date, challenge_type, challenge_name)
        `)
        .eq('user_id', await getCurrentUserId())
        .gte('daily_challenges.challenge_date', weekStartStr);

      if (error) {
        console.error('🎯 Error getting weekly stats:', error);
        return { completed: 0, total: 0, details: [] };
      }

      const completed = data.filter(p => p.is_completed).length;
      const total = data.length;

      return {
        completed,
        total,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        details: data.map(p => ({
          date: p.daily_challenges.challenge_date,
          type: p.daily_challenges.challenge_type,
          name: p.daily_challenges.challenge_name,
          completed: p.is_completed,
          progress: p.progress_data
        }))
      };

    } catch (error) {
      console.error('🎯 Error in getWeeklyChallengeStats:', error);
      return { completed: 0, total: 0, details: [] };
    }
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.ChallengeEngine = ChallengeEngine;
} 