/**
 * ProgressDashboard - Enhanced progress visualization and analytics
 * Integrates XP, badges, streaks, and performance data into comprehensive dashboard
 */
class ProgressDashboard {
  constructor(supabaseClient, xpManager, badgeManager, streakManager) {
    this.supabaseClient = supabaseClient;
    this.xpManager = xpManager;
    this.badgeManager = badgeManager;
    this.streakManager = streakManager;
    this.dashboardElement = null;
    
    console.log('📊 Progress Dashboard initialized');
  }

  /**
   * Create and render the complete dashboard
   */
  async createDashboard(userId, containerElement) {
    try {
      console.log('📊 Creating progress dashboard for user:', userId);

      // Gather all progress data
      const progressData = await this.gatherProgressData(userId);
      
      // Create dashboard HTML
      this.dashboardElement = this.createDashboardHTML(progressData);
      
      // Append to container
      if (containerElement) {
        containerElement.innerHTML = '';
        containerElement.appendChild(this.dashboardElement);
      }

      // Add interactive features
      this.addInteractiveFeatures();

      console.log('📊 Dashboard created successfully');
      return { success: true, element: this.dashboardElement };

    } catch (error) {
      console.error('📊 Error creating dashboard:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gather all progress data from different systems
   */
  async gatherProgressData(userId) {
    try {
      console.log('📊 Gathering progress data...');

      const [
        xpSummary,
        badgeProgress,
        streakStats,
        subjectProgress,
        performanceAnalytics
      ] = await Promise.all([
        this.xpManager.getXPSummary(userId),
        this.badgeManager.getBadgeProgress(userId),
        this.streakManager.getStreakStats(userId),
        this.getSubjectProgress(userId),
        this.getPerformanceAnalytics(userId)
      ]);

      return {
        xp: xpSummary,
        badges: badgeProgress,
        streaks: streakStats.success ? streakStats.stats : null,
        subjects: subjectProgress,
        performance: performanceAnalytics,
        userId
      };
    } catch (error) {
      console.error('📊 Error gathering progress data:', error);
      return {};
    }
  }

  /**
   * Create the main dashboard HTML structure
   */
  createDashboardHTML(data) {
    const dashboard = document.createElement('div');
    dashboard.className = 'progress-dashboard';
    
    dashboard.innerHTML = `
      <div class="dashboard-header">
        <h2 class="dashboard-title">
          <span class="dashboard-icon">📊</span>
          Your Learning Journey
        </h2>
        <div class="dashboard-subtitle">Track your progress and achievements</div>
      </div>

      <div class="dashboard-content">
        <div class="dashboard-grid">
          ${this.createXPSection(data.xp)}
          ${this.createStreakSection(data.streaks)}
          ${this.createBadgeSection(data.badges)}
          ${this.createSubjectSection(data.subjects)}
          ${this.createPerformanceSection(data.performance)}
          ${this.createAchievementsSection(data)}
        </div>
      </div>

      <div class="dashboard-footer">
        <button class="dashboard-refresh-btn" onclick="window.progressDashboard?.refresh()">
          🔄 Refresh Data
        </button>
      </div>
    `;

    return dashboard;
  }

  /**
   * Create XP and level section
   */
  createXPSection(xpData) {
    if (!xpData) return '<div class="dashboard-section">XP data loading...</div>';

    const { currentLevel, totalXP, progressXP, requiredXP, progressPercentage, levelBenefits } = xpData;

    return `
      <div class="dashboard-section xp-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">⭐</span>
            Level & XP
          </h3>
        </div>
        
        <div class="level-display">
          <div class="level-badge">
            <div class="level-number">${currentLevel}</div>
            <div class="level-label">Level</div>
          </div>
          
          <div class="xp-info">
            <div class="xp-total">${totalXP.toLocaleString()} XP</div>
            <div class="xp-progress-container">
              <div class="xp-progress-bar">
                <div class="xp-progress-fill" style="width: ${progressPercentage}%"></div>
              </div>
              <div class="xp-progress-text">
                ${progressXP}/${requiredXP} XP to Level ${currentLevel + 1}
              </div>
            </div>
          </div>
        </div>

        <div class="level-benefits">
          <div class="benefits-title">Level ${currentLevel} Benefits:</div>
          <div class="benefits-list">
            ${levelBenefits.slice(-3).map(benefit => 
              `<span class="benefit-item">${benefit}</span>`
            ).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create streak section
   */
  createStreakSection(streakData) {
    if (!streakData) return '<div class="dashboard-section">Streak data loading...</div>';

    const { correctAnswers, dailyParticipation, motivation } = streakData;

    return `
      <div class="dashboard-section streak-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">🔥</span>
            Streaks & Momentum
          </h3>
        </div>

        <div class="streak-display">
          <div class="streak-item ${correctAnswers.isActive ? 'active' : 'inactive'}">
            <div class="streak-type">Correct Answers</div>
            <div class="streak-count">${correctAnswers.current}</div>
            <div class="streak-multiplier">
              ${correctAnswers.multiplier > 1 ? `${correctAnswers.multiplier}x XP` : 'No bonus'}
            </div>
            <div class="streak-record">Best: ${correctAnswers.longest}</div>
          </div>

          <div class="streak-item ${dailyParticipation.isActive ? 'active' : 'inactive'}">
            <div class="streak-type">Daily Learning</div>
            <div class="streak-count">${dailyParticipation.current}</div>
            <div class="streak-unit">days</div>
            <div class="streak-record">Best: ${dailyParticipation.longest}</div>
          </div>
        </div>

        <div class="motivation-message ${motivation.level}">
          <div class="motivation-title">${motivation.title}</div>
          <div class="motivation-text">${motivation.message}</div>
        </div>
      </div>
    `;
  }

  /**
   * Create badge section
   */
  createBadgeSection(badgeData) {
    if (!badgeData) return '<div class="dashboard-section">Badge data loading...</div>';

    const badges = Object.values(badgeData);
    const earnedBadges = badges.filter(badge => badge.earned);
    const recentBadges = earnedBadges.slice(-6); // Show 6 most recent
    const badgeProgress = badges.filter(badge => !badge.earned && badge.progress > 0).slice(0, 3);

    return `
      <div class="dashboard-section badge-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">🏆</span>
            Badges & Achievements
          </h3>
          <div class="badge-summary">
            ${earnedBadges.length}/${badges.length} earned
          </div>
        </div>

        <div class="recent-badges">
          <div class="subsection-title">Recent Achievements</div>
          <div class="badge-grid">
            ${recentBadges.map(badge => this.createBadgeCard(badge, true)).join('')}
          </div>
        </div>

        <div class="badge-progress">
          <div class="subsection-title">In Progress</div>
          <div class="progress-badges">
            ${badgeProgress.map(badge => this.createProgressBadgeCard(badge)).join('')}
          </div>
        </div>

        <button class="view-all-badges-btn" onclick="window.progressDashboard?.showAllBadges()">
          View All Badges
        </button>
      </div>
    `;
  }

  /**
   * Create subject progress section
   */
  createSubjectSection(subjectData) {
    if (!subjectData) return '<div class="dashboard-section">Subject data loading...</div>';

    return `
      <div class="dashboard-section subject-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">📚</span>
            Subject Mastery
          </h3>
        </div>

        <div class="subject-radar">
          <div class="radar-chart-container">
            ${this.createRadarChart(subjectData)}
          </div>
        </div>

        <div class="subject-details">
          ${Object.entries(subjectData).map(([subject, data]) => 
            this.createSubjectCard(subject, data)
          ).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Create performance analytics section
   */
  createPerformanceSection(performanceData) {
    if (!performanceData) return '<div class="dashboard-section">Performance data loading...</div>';

    return `
      <div class="dashboard-section performance-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">📈</span>
            Performance Analytics
          </h3>
        </div>

        <div class="performance-metrics">
          <div class="metric-card">
            <div class="metric-value">${performanceData.overallAccuracy}%</div>
            <div class="metric-label">Overall Accuracy</div>
            <div class="metric-trend ${performanceData.accuracyTrend}">${performanceData.accuracyTrendText}</div>
          </div>

          <div class="metric-card">
            <div class="metric-value">${performanceData.averageTime}s</div>
            <div class="metric-label">Avg. Response Time</div>
            <div class="metric-trend ${performanceData.timeTrend}">${performanceData.timeTrendText}</div>
          </div>

          <div class="metric-card">
            <div class="metric-value">${performanceData.questionsThisWeek}</div>
            <div class="metric-label">Questions This Week</div>
            <div class="metric-trend ${performanceData.weeklyTrend}">${performanceData.weeklyTrendText}</div>
          </div>
        </div>

        <div class="performance-chart">
          ${this.createPerformanceChart(performanceData.weeklyData)}
        </div>
      </div>
    `;
  }

  /**
   * Create achievements showcase section
   */
  createAchievementsSection(data) {
    const achievements = this.getRecentAchievements(data);

    return `
      <div class="dashboard-section achievements-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">🌟</span>
            Recent Achievements
          </h3>
        </div>

        <div class="achievements-timeline">
          ${achievements.map(achievement => this.createAchievementCard(achievement)).join('')}
        </div>

        ${achievements.length === 0 ? 
          '<div class="no-achievements">Complete some quizzes to see your achievements!</div>' : 
          ''
        }
      </div>
    `;
  }

  /**
   * Create individual badge card
   */
  createBadgeCard(badge, earned = false) {
    return `
      <div class="badge-card ${earned ? 'earned' : 'unearned'}">
        <div class="badge-icon">${this.getBadgeIcon(badge.badge_category, badge.badge_tier)}</div>
        <div class="badge-name">${badge.badge_name}</div>
        <div class="badge-tier ${badge.badge_tier}">${badge.badge_tier}</div>
        ${earned ? `<div class="earned-date">${new Date(badge.earnedAt).toLocaleDateString()}</div>` : ''}
      </div>
    `;
  }

  /**
   * Create progress badge card
   */
  createProgressBadgeCard(badge) {
    return `
      <div class="progress-badge-card">
        <div class="progress-badge-header">
          <span class="progress-badge-icon">${this.getBadgeIcon(badge.badge_category, badge.badge_tier)}</span>
          <span class="progress-badge-name">${badge.badge_name}</span>
        </div>
        <div class="progress-badge-bar">
          <div class="progress-badge-fill" style="width: ${badge.progress}%"></div>
        </div>
        <div class="progress-badge-text">${Math.round(badge.progress)}% complete</div>
      </div>
    `;
  }

  /**
   * Create subject card
   */
  createSubjectCard(subject, data) {
    return `
      <div class="subject-card">
        <div class="subject-header">
          <span class="subject-icon">${this.getSubjectIcon(subject)}</span>
          <span class="subject-name">${subject}</span>
        </div>
        <div class="subject-stats">
          <div class="subject-accuracy">${data.accuracy}% accuracy</div>
          <div class="subject-count">${data.correct}/${data.total} correct</div>
        </div>
        <div class="subject-progress-bar">
          <div class="subject-progress-fill" style="width: ${data.accuracy}%"></div>
        </div>
      </div>
    `;
  }

  /**
   * Create achievement card
   */
  createAchievementCard(achievement) {
    return `
      <div class="achievement-card">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-content">
          <div class="achievement-title">${achievement.title}</div>
          <div class="achievement-description">${achievement.description}</div>
          <div class="achievement-date">${achievement.date}</div>
        </div>
      </div>
    `;
  }

  /**
   * Create radar chart for subjects (simplified CSS version)
   */
  createRadarChart(subjectData) {
    const subjects = Object.keys(subjectData);
    const maxValue = 100;
    
    return `
      <div class="radar-chart">
        <svg viewBox="0 0 200 200" class="radar-svg">
          <!-- Radar grid -->
          <circle cx="100" cy="100" r="80" fill="none" stroke="#e0e0e0" stroke-width="1"/>
          <circle cx="100" cy="100" r="60" fill="none" stroke="#e0e0e0" stroke-width="1"/>
          <circle cx="100" cy="100" r="40" fill="none" stroke="#e0e0e0" stroke-width="1"/>
          <circle cx="100" cy="100" r="20" fill="none" stroke="#e0e0e0" stroke-width="1"/>
          
          <!-- Subject axes -->
          ${subjects.map((subject, index) => {
            const angle = (index * 2 * Math.PI) / subjects.length - Math.PI / 2;
            const x = 100 + 80 * Math.cos(angle);
            const y = 100 + 80 * Math.sin(angle);
            return `<line x1="100" y1="100" x2="${x}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`;
          }).join('')}
          
          <!-- Data polygon -->
          <polygon points="${subjects.map((subject, index) => {
            const angle = (index * 2 * Math.PI) / subjects.length - Math.PI / 2;
            const value = subjectData[subject]?.accuracy || 0;
            const radius = (value / maxValue) * 80;
            const x = 100 + radius * Math.cos(angle);
            const y = 100 + radius * Math.sin(angle);
            return `${x},${y}`;
          }).join(' ')}" fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6" stroke-width="2"/>
          
          <!-- Subject labels -->
          ${subjects.map((subject, index) => {
            const angle = (index * 2 * Math.PI) / subjects.length - Math.PI / 2;
            const x = 100 + 95 * Math.cos(angle);
            const y = 100 + 95 * Math.sin(angle);
            return `<text x="${x}" y="${y}" text-anchor="middle" class="radar-label">${subject}</text>`;
          }).join('')}
        </svg>
      </div>
    `;
  }

  /**
   * Create performance chart (simplified)
   */
  createPerformanceChart(weeklyData) {
    if (!weeklyData || weeklyData.length === 0) {
      return '<div class="chart-placeholder">Complete more quizzes to see trends</div>';
    }

    const maxValue = Math.max(...weeklyData.map(d => d.accuracy));
    
    return `
      <div class="performance-chart">
        <svg viewBox="0 0 300 150" class="chart-svg">
          <!-- Chart grid -->
          <line x1="30" y1="20" x2="30" y2="130" stroke="#e0e0e0" stroke-width="1"/>
          <line x1="30" y1="130" x2="280" y2="130" stroke="#e0e0e0" stroke-width="1"/>
          
          <!-- Data line -->
          <polyline points="${weeklyData.map((data, index) => {
            const x = 30 + (index * 250) / (weeklyData.length - 1);
            const y = 130 - (data.accuracy / maxValue) * 110;
            return `${x},${y}`;
          }).join(' ')}" fill="none" stroke="#3b82f6" stroke-width="3"/>
          
          <!-- Data points -->
          ${weeklyData.map((data, index) => {
            const x = 30 + (index * 250) / (weeklyData.length - 1);
            const y = 130 - (data.accuracy / maxValue) * 110;
            return `<circle cx="${x}" cy="${y}" r="4" fill="#3b82f6"/>`;
          }).join('')}
          
          <!-- Labels -->
          ${weeklyData.map((data, index) => {
            const x = 30 + (index * 250) / (weeklyData.length - 1);
            return `<text x="${x}" y="145" text-anchor="middle" class="chart-label">${data.day}</text>`;
          }).join('')}
        </svg>
      </div>
    `;
  }

  /**
   * Helper methods for icons and data
   */
  getBadgeIcon(category, tier) {
    const icons = {
      subject: { bronze: '📝', silver: '📚', gold: '🎓', platinum: '👑' },
      difficulty: { bronze: '🎯', silver: '🔥', gold: '⚡', platinum: '💎' },
      consistency: { bronze: '📅', silver: '⏰', gold: '🏃', platinum: '🏆' },
      special: { bronze: '⭐', silver: '🌟', gold: '✨', platinum: '💫' }
    };
    return icons[category]?.[tier] || '🏅';
  }

  getSubjectIcon(subject) {
    const icons = {
      'Algebra': '🧮',
      'Geometry': '📐',
      'Grammar': '✏️',
      'Vocabulary': '📖',
      'Science': '🔬'
    };
    return icons[subject] || '📚';
  }

  /**
   * Get subject progress data
   */
  async getSubjectProgress(userId) {
    try {
      const { data, error } = await this.supabaseClient.supabase
        .from('subject_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('📊 Error getting subject progress:', error);
        return {};
      }

      const progress = {};
      data.forEach(subject => {
        progress[subject.subject] = {
          total: subject.questions_answered,
          correct: subject.questions_correct,
          accuracy: subject.accuracy_percentage || 0
        };
      });

      return progress;
    } catch (error) {
      console.error('📊 Error in getSubjectProgress:', error);
      return {};
    }
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(userId) {
    try {
      // This would typically involve more complex analytics
      // For now, we'll create a simplified version
      const { data, error } = await this.supabaseClient.supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data || data.length === 0) {
        return {
          overallAccuracy: 0,
          averageTime: 0,
          questionsThisWeek: 0,
          accuracyTrend: 'neutral',
          timeTrend: 'neutral',
          weeklyTrend: 'neutral',
          accuracyTrendText: 'No trend data',
          timeTrendText: 'No trend data',
          weeklyTrendText: 'No trend data',
          weeklyData: []
        };
      }

      const totalQuestions = data.length;
      const correctAnswers = data.filter(s => s.is_correct).length;
      const overallAccuracy = Math.round((correctAnswers / totalQuestions) * 100);
      
      const avgTime = data.reduce((sum, s) => sum + (s.time_to_answer || 0), 0) / totalQuestions / 1000;
      const averageTime = Math.round(avgTime);

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const questionsThisWeek = data.filter(s => new Date(s.created_at) > oneWeekAgo).length;

      return {
        overallAccuracy,
        averageTime,
        questionsThisWeek,
        accuracyTrend: overallAccuracy >= 80 ? 'positive' : overallAccuracy >= 60 ? 'neutral' : 'negative',
        timeTrend: averageTime <= 30 ? 'positive' : averageTime <= 60 ? 'neutral' : 'negative',
        weeklyTrend: questionsThisWeek >= 10 ? 'positive' : questionsThisWeek >= 5 ? 'neutral' : 'negative',
        accuracyTrendText: overallAccuracy >= 80 ? '📈 Excellent' : overallAccuracy >= 60 ? '➡️ Steady' : '📉 Improving',
        timeTrendText: averageTime <= 30 ? '⚡ Fast' : averageTime <= 60 ? '➡️ Good' : '🐌 Take time to think',
        weeklyTrendText: questionsThisWeek >= 10 ? '🔥 Very Active' : questionsThisWeek >= 5 ? '👍 Active' : '📈 More practice needed',
        weeklyData: this.generateWeeklyData(data)
      };
    } catch (error) {
      console.error('📊 Error getting performance analytics:', error);
      return {};
    }
  }

  /**
   * Generate weekly performance data
   */
  generateWeeklyData(sessions) {
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.created_at);
        return sessionDate >= dayStart && sessionDate < dayEnd;
      });

      const dayAccuracy = daySessions.length > 0 
        ? (daySessions.filter(s => s.is_correct).length / daySessions.length) * 100
        : 0;

      weeklyData.push({
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        accuracy: Math.round(dayAccuracy)
      });
    }
    return weeklyData;
  }

  /**
   * Get recent achievements
   */
  getRecentAchievements(data) {
    const achievements = [];
    
    // Add XP level achievements
    if (data.xp && data.xp.currentLevel > 1) {
      achievements.push({
        title: `Level ${data.xp.currentLevel} Reached!`,
        description: `You've reached level ${data.xp.currentLevel} with ${data.xp.totalXP} total XP`,
        icon: '⭐',
        date: 'Recently',
        type: 'level'
      });
    }

    // Add streak achievements
    if (data.streaks && data.streaks.correctAnswers.current >= 3) {
      achievements.push({
        title: 'On a Roll!',
        description: `${data.streaks.correctAnswers.current} correct answers in a row`,
        icon: '🔥',
        date: 'Active now',
        type: 'streak'
      });
    }

    // Add recent badges (simulated)
    if (data.badges) {
      const earnedBadges = Object.values(data.badges).filter(b => b.earned);
      earnedBadges.slice(-2).forEach(badge => {
        achievements.push({
          title: `${badge.badge_name} Earned!`,
          description: badge.badge_description,
          icon: this.getBadgeIcon(badge.badge_category, badge.badge_tier),
          date: new Date(badge.earnedAt).toLocaleDateString(),
          type: 'badge'
        });
      });
    }

    return achievements.slice(-5); // Show last 5 achievements
  }

  /**
   * Add interactive features to dashboard
   */
  addInteractiveFeatures() {
    // Add global reference for button callbacks
    window.progressDashboard = this;
    
    // Add hover effects and tooltips
    this.addTooltips();
    
    // Add refresh functionality
    this.addRefreshHandler();
  }

  /**
   * Add tooltips to dashboard elements
   */
  addTooltips() {
    const tooltipElements = this.dashboardElement.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
      element.addEventListener('mouseenter', (e) => {
        this.showTooltip(e.target, e.target.getAttribute('data-tooltip'));
      });
      
      element.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });
  }

  /**
   * Show tooltip
   */
  showTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'dashboard-tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    const tooltip = document.querySelector('.dashboard-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  /**
   * Add refresh handler
   */
  addRefreshHandler() {
    const refreshBtn = this.dashboardElement.querySelector('.dashboard-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refresh();
      });
    }
  }

  /**
   * Refresh dashboard data
   */
  async refresh() {
    const refreshBtn = this.dashboardElement.querySelector('.dashboard-refresh-btn');
    if (refreshBtn) {
      refreshBtn.textContent = '🔄 Refreshing...';
      refreshBtn.disabled = true;
    }

    try {
      // Re-gather data and update dashboard
      const progressData = await this.gatherProgressData(this.userId);
      const newDashboard = this.createDashboardHTML(progressData);
      
      // Replace content
      this.dashboardElement.innerHTML = newDashboard.innerHTML;
      this.addInteractiveFeatures();
      
      console.log('📊 Dashboard refreshed successfully');
    } catch (error) {
      console.error('📊 Error refreshing dashboard:', error);
    } finally {
      if (refreshBtn) {
        refreshBtn.textContent = '🔄 Refresh Data';
        refreshBtn.disabled = false;
      }
    }
  }

  /**
   * Show all badges modal
   */
  showAllBadges() {
    // This would open a modal with all badges
    // Implementation depends on modal system
    console.log('📊 Show all badges modal');
  }

  /**
   * Update dashboard with new data
   */
  async updateProgress(userId, newData) {
    try {
      // Update specific sections without full refresh
      if (newData.xp) {
        this.updateXPSection(newData.xp);
      }
      
      if (newData.badges) {
        this.updateBadgeSection(newData.badges);
      }
      
      if (newData.streaks) {
        this.updateStreakSection(newData.streaks);
      }
      
      console.log('📊 Dashboard updated with new data');
    } catch (error) {
      console.error('📊 Error updating dashboard:', error);
    }
  }

  /**
   * Update XP section only
   */
  updateXPSection(xpData) {
    const xpSection = this.dashboardElement.querySelector('.xp-section');
    if (xpSection) {
      xpSection.innerHTML = this.createXPSection(xpData);
    }
  }

  /**
   * Update badge section only
   */
  updateBadgeSection(badgeData) {
    const badgeSection = this.dashboardElement.querySelector('.badge-section');
    if (badgeSection) {
      badgeSection.innerHTML = this.createBadgeSection(badgeData);
    }
  }

  /**
   * Update streak section only
   */
  updateStreakSection(streakData) {
    const streakSection = this.dashboardElement.querySelector('.streak-section');
    if (streakSection) {
      streakSection.innerHTML = this.createStreakSection(streakData);
    }
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.ProgressDashboard = ProgressDashboard;
} 