/**
 * ProgressDashboard - Comprehensive progress tracking and analytics
 * Provides detailed insights into user performance and learning patterns
 */

class ProgressDashboard {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
    this.timeRanges = {
      today: 'today',
      week: 'week',
      month: 'month',
      all: 'all'
    };
    this.subjects = ['math', 'reading', 'writing', 'science'];
    this.difficulties = ['easy', 'medium', 'hard'];
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(userId, timeRange = 'week') {
    try {
      const [
        overviewStats,
        performanceData,
        streakData,
        subjectBreakdown,
        difficultyBreakdown,
        recentActivity,
        achievements,
        goals
      ] = await Promise.all([
        this.getOverviewStats(userId, timeRange),
        this.getPerformanceData(userId, timeRange),
        this.getStreakData(userId),
        this.getSubjectBreakdown(userId, timeRange),
        this.getDifficultyBreakdown(userId, timeRange),
        this.getRecentActivity(userId, 10),
        this.getRecentAchievements(userId, 5),
        this.getGoalProgress(userId)
      ]);

      return {
        success: true,
        dashboard: {
          overview: overviewStats,
          performance: performanceData,
          streaks: streakData,
          subjects: subjectBreakdown,
          difficulties: difficultyBreakdown,
          recentActivity: recentActivity,
          achievements: achievements,
          goals: goals,
          timeRange: timeRange
        }
      };

    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get overview statistics
   */
  async getOverviewStats(userId, timeRange) {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      
      // Get user progress
      const { data: progressData, error: progressError } = await window.supabaseQuery(
        'user_progress', 
        'select', 
        null, 
        { user_id: userId }
      );

      if (progressError) {
        console.error('Error fetching user progress:', progressError);
        return this.getDefaultOverviewStats();
      }

      const progress = progressData && progressData.length > 0 ? progressData[0] : {};

      // Get session data for time range
      const sessionStats = await this.getSessionStats(userId, dateFilter);

      return {
        totalXP: progress.total_xp || 0,
        currentLevel: progress.current_level || 1,
        questionsAnswered: progress.questions_answered || 0,
        correctAnswers: progress.questions_correct || 0,
        accuracy: progress.questions_answered > 0 ? 
          Math.round((progress.questions_correct / progress.questions_answered) * 100) : 0,
        currentStreak: progress.current_streak || 0,
        longestStreak: progress.longest_streak || 0,

        sessionsInRange: sessionStats.sessionCount,
        timeSpentInRange: sessionStats.totalTime,
        questionsInRange: sessionStats.questionCount,
        accuracyInRange: sessionStats.accuracy
      };

    } catch (error) {
      console.error('Error getting overview stats:', error);
      return this.getDefaultOverviewStats();
    }
  }

  /**
   * Get performance data over time
   */
  async getPerformanceData(userId, timeRange) {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      const groupBy = this.getGroupByPeriod(timeRange);

      // This would typically query session data grouped by time periods
      // For now, return sample data structure
      const performanceData = await this.getPerformanceOverTime(userId, dateFilter, groupBy);

      return {
        accuracyTrend: performanceData.accuracy,
        speedTrend: performanceData.speed,
        volumeTrend: performanceData.volume,
        xpTrend: performanceData.xp,
        periods: performanceData.periods
      };

    } catch (error) {
      console.error('Error getting performance data:', error);
      return this.getDefaultPerformanceData();
    }
  }

  /**
   * Get streak statistics
   */
  async getStreakData(userId) {
    try {
      if (window.StreakManager) {
        const streakManager = new window.StreakManager(this.supabaseClient);
        const streakStats = await streakManager.getStreakStats();
        
        if (streakStats.success) {
          return {
            current: streakStats.currentStreak,
            longest: streakStats.longestStreak,
            daily: streakStats.dailyStreak,
            level: streakStats.streakLevel,
            multiplier: streakStats.streakMultiplier,
            nextMilestone: streakStats.nextMilestone
          };
        }
      }

      return this.getDefaultStreakData();

    } catch (error) {
      console.error('Error getting streak data:', error);
      return this.getDefaultStreakData();
    }
  }

  /**
   * Get subject performance breakdown
   */
  async getSubjectBreakdown(userId, timeRange) {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      const subjectStats = {};

      // Initialize all subjects
      this.subjects.forEach(subject => {
        subjectStats[subject] = {
          questionsAnswered: 0,
          correctAnswers: 0,
          accuracy: 0,
          averageTime: 0,
          improvement: 0
        };
      });

      // Get actual subject data (would query session results)
      // For now, return default structure
      return subjectStats;

    } catch (error) {
      console.error('Error getting subject breakdown:', error);
      return this.getDefaultSubjectBreakdown();
    }
  }

  /**
   * Get difficulty performance breakdown
   */
  async getDifficultyBreakdown(userId, timeRange) {
    try {
      const dateFilter = this.getDateFilter(timeRange);
      const difficultyStats = {};

      // Initialize all difficulties
      this.difficulties.forEach(difficulty => {
        difficultyStats[difficulty] = {
          questionsAnswered: 0,
          correctAnswers: 0,
          accuracy: 0,
          averageTime: 0,
          xpEarned: 0
        };
      });

      // Get actual difficulty data (would query session results)
      // For now, return default structure
      return difficultyStats;

    } catch (error) {
      console.error('Error getting difficulty breakdown:', error);
      return this.getDefaultDifficultyBreakdown();
    }
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(userId, limit = 10) {
    try {
      // Get recent quiz sessions
      const { data: sessions, error } = await window.supabaseQuery(
        'quiz_sessions',
        'select',
        'created_at, question_count, correct_count, session_duration, difficulty',
        {
          user_id: userId,
          limit: limit,
          order: 'created_at desc'
        }
      );

      if (error) {
        console.error('Error fetching recent activity:', error);
        return [];
      }

      return (sessions || []).map(session => ({
        type: 'quiz_session',
        date: session.created_at,
        description: `Answered ${session.question_count} questions (${session.correct_count} correct)`,
        accuracy: session.question_count > 0 ? 
          Math.round((session.correct_count / session.question_count) * 100) : 0,
        duration: session.session_duration,
        difficulty: session.difficulty
      }));

    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Get recent achievements
   */
  async getRecentAchievements(userId, limit = 5) {
    try {
      const achievements = [];

      // Get recent badges
      if (window.BadgeManager) {
        const badgeManager = new window.BadgeManager(this.supabaseClient);
        const userBadges = await badgeManager.getUserBadges(userId);
        
        userBadges
          .sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at))
          .slice(0, limit)
          .forEach(badge => {
            const badgeData = badgeManager.badgeDefinitions[badge.badge_id];
            if (badgeData) {
              achievements.push({
                type: 'badge',
                title: badgeData.name,
                description: badgeData.description,
                icon: badgeData.icon,
                date: badge.earned_at,
                rarity: badgeData.rarity
              });
            }
          });
      }

      // Get recent level ups (would query level history)
      // For now, just return badges

      return achievements.slice(0, limit);

    } catch (error) {
      console.error('Error getting recent achievements:', error);
      return [];
    }
  }

  /**
   * Get goal progress
   */
  async getGoalProgress(userId) {
    try {
      const goals = {
        daily: {
          target: 10,
          current: 0,
          description: 'Questions answered today'
        },
        weekly: {
          target: 50,
          current: 0,
          description: 'Questions answered this week'
        },
        accuracy: {
          target: 80,
          current: 0,
          description: 'Weekly accuracy percentage'
        },
        streak: {
          target: 7,
          current: 0,
          description: 'Daily streak goal'
        }
      };

      // Get actual progress data
      const todayStats = await this.getSessionStats(userId, this.getDateFilter('today'));
      const weekStats = await this.getSessionStats(userId, this.getDateFilter('week'));
      const streakData = await this.getStreakData(userId);

      goals.daily.current = todayStats.questionCount;
      goals.weekly.current = weekStats.questionCount;
      goals.accuracy.current = weekStats.accuracy;
      goals.streak.current = streakData.daily;

      return goals;

    } catch (error) {
      console.error('Error getting goal progress:', error);
      return this.getDefaultGoals();
    }
  }

  /**
   * Get session statistics for a date range
   */
  async getSessionStats(userId, dateFilter) {
    try {
      // This would query actual session data
      // For now, return default stats
      return {
        sessionCount: 0,
        questionCount: 0,
        correctCount: 0,
        totalTime: 0,
        accuracy: 0
      };

    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        sessionCount: 0,
        questionCount: 0,
        correctCount: 0,
        totalTime: 0,
        accuracy: 0
      };
    }
  }

  /**
   * Get performance data over time
   */
  async getPerformanceOverTime(userId, dateFilter, groupBy) {
    try {
      // This would query and aggregate session data
      // For now, return sample structure
      const periods = this.generatePeriods(groupBy);
      
      return {
        accuracy: periods.map(() => Math.floor(Math.random() * 20) + 70),
        speed: periods.map(() => Math.floor(Math.random() * 10) + 20),
        volume: periods.map(() => Math.floor(Math.random() * 15) + 5),
        xp: periods.map(() => Math.floor(Math.random() * 100) + 50),
        periods: periods
      };

    } catch (error) {
      console.error('Error getting performance over time:', error);
      return this.getDefaultPerformanceData();
    }
  }

  /**
   * Generate time periods for charts
   */
  generatePeriods(groupBy) {
    const periods = [];
    const now = new Date();
    
    switch (groupBy) {
      case 'hour':
        for (let i = 23; i >= 0; i--) {
          const date = new Date(now);
          date.setHours(date.getHours() - i);
          periods.push(date.getHours() + ':00');
        }
        break;
      
      case 'day':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          periods.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        }
        break;
      
      case 'week':
        for (let i = 3; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - (i * 7));
          periods.push(`Week ${Math.ceil(date.getDate() / 7)}`);
        }
        break;
      
      default:
        periods.push('Today');
    }
    
    return periods;
  }

  /**
   * Get date filter for time range
   */
  getDateFilter(timeRange) {
    const now = new Date();
    
    switch (timeRange) {
      case 'today':
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return { start: today.toISOString() };
      
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: weekAgo.toISOString() };
      
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { start: monthAgo.toISOString() };
      
      case 'all':
      default:
        return { start: '2000-01-01T00:00:00.000Z' };
    }
  }

  /**
   * Get grouping period for time range
   */
  getGroupByPeriod(timeRange) {
    switch (timeRange) {
      case 'today':
        return 'hour';
      case 'week':
        return 'day';
      case 'month':
        return 'week';
      case 'all':
      default:
        return 'month';
    }
  }

  /**
   * Get learning insights and recommendations
   */
  async getLearningInsights(userId) {
    try {
      const insights = [];
      const recommendations = [];

      // Get user data for analysis
      const overviewStats = await this.getOverviewStats(userId, 'week');
      const subjectBreakdown = await this.getSubjectBreakdown(userId, 'week');
      const difficultyBreakdown = await this.getDifficultyBreakdown(userId, 'week');

      // Accuracy insights
      if (overviewStats.accuracy < 70) {
        insights.push({
          type: 'warning',
          title: 'Accuracy Needs Improvement',
          description: `Your accuracy is ${overviewStats.accuracy}%. Consider reviewing incorrect answers.`,
          icon: '⚠️'
        });
        recommendations.push({
          title: 'Focus on Understanding',
          description: 'Take more time to read questions carefully and review explanations.',
          priority: 'high'
        });
      } else if (overviewStats.accuracy > 85) {
        insights.push({
          type: 'success',
          title: 'Excellent Accuracy!',
          description: `Your accuracy of ${overviewStats.accuracy}% shows strong understanding.`,
          icon: '🎯'
        });
        recommendations.push({
          title: 'Challenge Yourself',
          description: 'Try harder difficulty questions to continue growing.',
          priority: 'medium'
        });
      }

      // Streak insights
      if (overviewStats.currentStreak === 0) {
        insights.push({
          type: 'info',
          title: 'Start Your Streak',
          description: 'Answer questions correctly to build momentum.',
          icon: '🔥'
        });
        recommendations.push({
          title: 'Build Consistency',
          description: 'Set a daily goal to practice and maintain streaks.',
          priority: 'medium'
        });
      } else if (overviewStats.currentStreak >= 10) {
        insights.push({
          type: 'success',
          title: 'Amazing Streak!',
          description: `You're on a ${overviewStats.currentStreak} question streak!`,
          icon: '🔥'
        });
      }

      // Activity insights
      if (overviewStats.questionsInRange < 10) {
        insights.push({
          type: 'info',
          title: 'Increase Practice',
          description: 'More practice leads to better results.',
          icon: '📚'
        });
        recommendations.push({
          title: 'Set Daily Goals',
          description: 'Aim for at least 10 questions per day for consistent progress.',
          priority: 'high'
        });
      }

      return {
        success: true,
        insights: insights,
        recommendations: recommendations
      };

    } catch (error) {
      console.error('Error getting learning insights:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export dashboard data
   */
  async exportDashboardData(userId, timeRange = 'all') {
    try {
      const dashboardData = await this.getDashboardData(userId, timeRange);
      
      if (!dashboardData.success) {
        return dashboardData;
      }

      const exportData = {
        version: '1.0',
        userId: userId,
        timeRange: timeRange,
        exportedAt: new Date().toISOString(),
        data: dashboardData.dashboard
      };

      return { success: true, data: exportData };

    } catch (error) {
      console.error('Error exporting dashboard data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get default overview stats
   */
  getDefaultOverviewStats() {
    return {
      totalXP: 0,
      currentLevel: 1,
      questionsAnswered: 0,
      correctAnswers: 0,
      accuracy: 0,
      currentStreak: 0,
      longestStreak: 0,
      dailyStreak: 0,
      sessionsInRange: 0,
      timeSpentInRange: 0,
      questionsInRange: 0,
      accuracyInRange: 0
    };
  }

  /**
   * Get default performance data
   */
  getDefaultPerformanceData() {
    return {
      accuracyTrend: [],
      speedTrend: [],
      volumeTrend: [],
      xpTrend: [],
      periods: []
    };
  }

  /**
   * Get default streak data
   */
  getDefaultStreakData() {
    return {
      current: 0,
      longest: 0,
      daily: 0,
      level: 'none',
      multiplier: 1.0,
      nextMilestone: null
    };
  }

  /**
   * Get default subject breakdown
   */
  getDefaultSubjectBreakdown() {
    const breakdown = {};
    this.subjects.forEach(subject => {
      breakdown[subject] = {
        questionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
        averageTime: 0,
        improvement: 0
      };
    });
    return breakdown;
  }

  /**
   * Get default difficulty breakdown
   */
  getDefaultDifficultyBreakdown() {
    const breakdown = {};
    this.difficulties.forEach(difficulty => {
      breakdown[difficulty] = {
        questionsAnswered: 0,
        correctAnswers: 0,
        accuracy: 0,
        averageTime: 0,
        xpEarned: 0
      };
    });
    return breakdown;
  }

  /**
   * Get default goals
   */
  getDefaultGoals() {
    return {
      daily: { target: 10, current: 0, description: 'Questions answered today' },
      weekly: { target: 50, current: 0, description: 'Questions answered this week' },
      accuracy: { target: 80, current: 0, description: 'Weekly accuracy percentage' },
      streak: { target: 7, current: 0, description: 'Daily streak goal' }
    };
  }
}

// Make ProgressDashboard globally accessible
window.ProgressDashboard = ProgressDashboard; 