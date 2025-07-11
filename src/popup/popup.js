// Popup script for SAT Quiz Blocker - Refactored Version
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  setupEventListeners();
  testExtensionConnection();
});

async function testExtensionConnection() {
  try {
    console.log('🎓 Testing extension connection...');
    
    // Test background script connection
    const bgResponse = await chrome.runtime.sendMessage({ action: 'testBackground' });
    console.log('✅ Background script connection:', bgResponse);
    
    // Test content script connection
    const contentResponse = await chrome.runtime.sendMessage({ action: 'testContent' });
    console.log('✅ Content script connection:', contentResponse);
    
  } catch (error) {
    console.warn('⚠️ Extension connection test failed:', error);
  }
}

async function loadStats() {
  try {
    console.log('📊 Loading stats...');
    
    // Load basic stats
    const basicStats = await chrome.runtime.sendMessage({ action: 'getStats' });
    console.log('📊 Basic stats:', basicStats);
    
    // Load gamification stats
    const gamificationStats = await chrome.runtime.sendMessage({ action: 'getGamificationStats' });
    console.log('🎮 Gamification stats:', gamificationStats);
    
    // Display basic stats
    if (basicStats) {
      displayBasicStats(basicStats);
    }
    
    // Display gamification stats
    if (gamificationStats && gamificationStats.success) {
      displayGamificationStats(gamificationStats);
    } else {
      console.warn('⚠️ Gamification stats not available:', gamificationStats);
      displayFallbackGamificationStats();
    }
    
  } catch (error) {
    console.error('❌ Error loading stats:', error);
    showNotification('Error loading statistics', 'error');
    displayFallbackStats();
  }
}

function displayBasicStats(stats) {
  try {
    // Update basic stats
    document.getElementById('questions-answered').textContent = stats.questionsAnswered || 0;
    document.getElementById('total-attempts').textContent = stats.totalAttempts || 0;
    
    // Update last quiz time
    if (stats.lastQuizTime) {
      const lastQuizDate = new Date(stats.lastQuizTime);
      const now = new Date();
      const diffInMinutes = Math.floor((now - lastQuizDate) / (1000 * 60));
      
      let timeText;
      if (diffInMinutes < 60) {
        timeText = `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        timeText = `${hours}h ago`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        timeText = `${days}d ago`;
      }
      
      document.getElementById('last-quiz').textContent = timeText;
      
      // Update force quiz button based on timing
      updateForceQuizButton(stats.lastQuizTime);
      
    } else {
      document.getElementById('last-quiz').textContent = 'Never';
      updateForceQuizButton(null);
    }
    
  } catch (error) {
    console.error('❌ Error displaying basic stats:', error);
  }
}

function updateForceQuizButton(lastQuizTime) {
  const forceQuizBtn = document.getElementById('force-quiz');
  
  if (!lastQuizTime) {
    forceQuizBtn.textContent = '🎯 Take First Quiz';
    forceQuizBtn.title = 'Take your first quiz now';
    return;
  }
  
  const now = new Date();
  const lastQuizDate = new Date(lastQuizTime);
  const quizInterval = 30 * 60 * 1000; // 30 minutes
  const timeSinceLastQuiz = now - lastQuizDate;
  const isDue = timeSinceLastQuiz >= quizInterval;
  
  if (isDue) {
    forceQuizBtn.textContent = '🎯 Take Quiz Now';
    forceQuizBtn.title = 'A quiz is due based on your schedule';
  } else {
    const remainingMinutes = Math.ceil((quizInterval - timeSinceLastQuiz) / (1000 * 60));
    forceQuizBtn.textContent = '⚡ Force Quiz Now';
    forceQuizBtn.title = `Next scheduled quiz in ${remainingMinutes} minutes, or force one now`;
  }
}

function displayGamificationStats(gamificationData) {
  try {
    console.log('🎮 Displaying gamification stats:', gamificationData);
    
    const { xp, streaks, badges, challenges } = gamificationData;
    
    // Update XP and Level
    if (xp) {
      updateXPDisplay(xp);
    }
    
    // Update Streaks
    if (streaks) {
      updateStreakDisplay(streaks);
    }
    
    // Update Badges
    if (badges) {
      updateBadgeDisplay(badges);
    }
    
    // Update Challenges
    if (challenges) {
      updateChallengeDisplay(challenges);
    }
    
  } catch (error) {
    console.error('❌ Error displaying gamification stats:', error);
    displayFallbackGamificationStats();
  }
}

function updateXPDisplay(xpData) {
  try {
    console.log('🎮 Updating XP display with data:', xpData);
    
    const xpElement = document.getElementById('current-xp');
    const levelElement = document.getElementById('current-level');
    const progressElement = document.getElementById('xp-progress');
    const progressBarElement = document.getElementById('xp-progress-bar');
    
    // Update XP and level display
    if (xpElement) xpElement.textContent = (xpData.current || 0).toLocaleString();
    if (levelElement) levelElement.textContent = xpData.level || 1;
    
    // Calculate progress more carefully
    const currentXP = xpData.current || 0;
    const nextLevelXP = xpData.nextLevelXP || 100;
    const currentLevel = xpData.level || 1;
    
    // Calculate XP needed for current level (start of current level)
    let currentLevelStartXP = 0;
    if (currentLevel > 1) {
      // Progressive thresholds: 1-5 (100 XP each), 6-10 (200 XP each), etc.
      for (let level = 2; level <= currentLevel; level++) {
        if (level <= 5) {
          currentLevelStartXP += 100;
        } else if (level <= 10) {
          currentLevelStartXP += 200;
        } else if (level <= 15) {
          currentLevelStartXP += 300;
        } else if (level <= 20) {
          currentLevelStartXP += 400;
        } else {
          currentLevelStartXP += 500;
        }
      }
    }
    
    // Calculate progress within current level
    const progressXP = Math.max(0, currentXP - currentLevelStartXP);
    const requiredXP = Math.max(1, nextLevelXP - currentLevelStartXP); // Avoid division by zero
    const progressPercentage = Math.min(100, Math.max(0, (progressXP / requiredXP) * 100));
    
    console.log('🎮 XP Progress Calculation:', {
      currentXP,
      currentLevel,
      currentLevelStartXP,
      nextLevelXP,
      progressXP,
      requiredXP,
      progressPercentage: progressPercentage.toFixed(1),
      original_progressPercentage: xpData.progressPercentage
    });
    
    // Update progress text
    if (progressElement) {
      const nextLevel = currentLevel + 1;
      progressElement.textContent = `${progressXP}/${requiredXP} XP to Level ${nextLevel}`;
    }
    
    // Update progress bar with calculated percentage
    if (progressBarElement) {
      // Use our calculated percentage if the provided one seems incorrect
      const finalPercentage = (xpData.progressPercentage >= 0 && xpData.progressPercentage <= 100) 
        ? xpData.progressPercentage 
        : progressPercentage;
      
      console.log('🎮 Setting progress bar to:', finalPercentage.toFixed(1) + '%');
      progressBarElement.style.width = `${finalPercentage}%`;
      
      // Add visual feedback for progress
      progressBarElement.style.transition = 'width 0.5s ease-out';
      
      // Add color coding based on progress
      if (finalPercentage < 25) {
        progressBarElement.style.backgroundColor = '#ff6b35'; // Orange-red for low progress
      } else if (finalPercentage < 50) {
        progressBarElement.style.backgroundColor = '#ff9500'; // Orange for medium-low
      } else if (finalPercentage < 75) {
        progressBarElement.style.backgroundColor = '#3498db'; // Blue for medium-high
      } else {
        progressBarElement.style.backgroundColor = '#28a745'; // Green for high progress
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating XP display:', error);
    // Fallback display
    const xpElement = document.getElementById('current-xp');
    const levelElement = document.getElementById('current-level');
    const progressElement = document.getElementById('xp-progress');
    const progressBarElement = document.getElementById('xp-progress-bar');
    
    if (xpElement) xpElement.textContent = '0';
    if (levelElement) levelElement.textContent = '1';
    if (progressElement) progressElement.textContent = '0/100 XP to Level 2';
    if (progressBarElement) {
      progressBarElement.style.width = '0%';
      progressBarElement.style.backgroundColor = '#e9ecef';
    }
  }
}

function updateStreakDisplay(streakData) {
  try {
    const correctStreakElement = document.getElementById('correct-streak');
    const dailyStreakElement = document.getElementById('daily-streak');
    const streakMultiplierElement = document.getElementById('streak-multiplier');
    
    if (correctStreakElement) {
      correctStreakElement.textContent = streakData.current || 0;
    }
    
    if (dailyStreakElement) {
      dailyStreakElement.textContent = streakData.daily || 0;
    }
    
    if (streakMultiplierElement) {
      const current = streakData.current || 0;
      const multiplier = current >= 3 ? Math.min(2.5, 1 + (current - 3) * 0.1) : 1;
      
      if (multiplier > 1) {
        streakMultiplierElement.textContent = `${multiplier.toFixed(1)}x XP`;
        streakMultiplierElement.className = 'streak-multiplier active';
      } else {
        streakMultiplierElement.textContent = 'No bonus';
        streakMultiplierElement.className = 'streak-multiplier';
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating streak display:', error);
  }
}

function updateBadgeDisplay(badgeData) {
  try {
    const badgesEarnedElement = document.getElementById('badges-earned');
    const badgesTotalElement = document.getElementById('badges-total');
    const badgeProgressElement = document.getElementById('badge-progress');
    
    const earned = badgeData.earned || 0;
    const total = badgeData.total || 30; // Default total badges
    
    if (badgesEarnedElement) badgesEarnedElement.textContent = earned;
    if (badgesTotalElement) badgesTotalElement.textContent = total;
    
    if (badgeProgressElement && total > 0) {
      const percentage = (earned / total) * 100;
      badgeProgressElement.textContent = `${Math.round(percentage)}% complete`;
    }
    
  } catch (error) {
    console.error('❌ Error updating badge display:', error);
  }
}

function updateChallengeDisplay(challengeData) {
  try {
    const challengeElement = document.getElementById('current-challenge');
    const challengeProgressElement = document.getElementById('challenge-progress');
    
    if (challengeData.hasChallenge) {
      if (challengeElement) {
        challengeElement.textContent = challengeData.title || 'Daily Challenge';
      }
      
      if (challengeProgressElement && challengeData.progress) {
        const percentage = challengeData.progress.percentage || 0;
        challengeProgressElement.textContent = `${Math.round(percentage)}% complete`;
      }
    } else {
      if (challengeElement) {
        challengeElement.textContent = 'No active challenge';
      }
      if (challengeProgressElement) {
        challengeProgressElement.textContent = 'Complete a quiz to unlock';
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating challenge display:', error);
  }
}

function displayFallbackGamificationStats() {
  console.log('📊 Displaying fallback gamification stats');
  
  // Set fallback values
  updateXPDisplay({ current: 0, level: 1, nextLevelXP: 100, progressPercentage: 0 });
  updateStreakDisplay({ current: 0, longest: 0, daily: 0 });
  updateBadgeDisplay({ earned: 0, total: 30 });
  updateChallengeDisplay({ hasChallenge: false });
}

function displayFallbackStats() {
  console.log('📊 Displaying fallback basic stats');
  
  document.getElementById('questions-answered').textContent = '0';
  document.getElementById('total-attempts').textContent = '0';
  document.getElementById('last-quiz').textContent = 'Never';
  
  displayFallbackGamificationStats();
}

function setupEventListeners() {
  // Toggle switch
  const toggleInput = document.getElementById('toggle-switch-input');
  
  toggleInput.addEventListener('change', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'toggleExtension', 
        enabled: toggleInput.checked 
      });
      
      if (response && response.enabled !== undefined) {
        updateToggleState(response.enabled);
      }
    } catch (error) {
      console.error('❌ Error toggling extension:', error);
      showNotification('Failed to toggle extension', 'error');
    }
  });

  // Reset stats button
  document.getElementById('reset-stats').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all statistics and gamification progress?')) {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'resetStats' });
        
        if (response && response.success) {
          loadStats(); // Reload stats
          showNotification('All statistics reset successfully!', 'success');
        } else {
          showNotification('Failed to reset statistics', 'error');
        }
      } catch (error) {
        console.error('❌ Error resetting stats:', error);
        showNotification('Error resetting statistics', 'error');
      }
    }
  });

  // Force quiz button
  document.getElementById('force-quiz').addEventListener('click', async () => {
    try {
      console.log('🎯 Force quiz button clicked');
      
      // Show loading state
      const forceQuizBtn = document.getElementById('force-quiz');
      const originalText = forceQuizBtn.textContent;
      forceQuizBtn.textContent = '⏳ Loading...';
      forceQuizBtn.disabled = true;
      
      console.log('📡 Sending force quiz message...');
      
      // Send message to background script, which forwards to content script
      const response = await chrome.runtime.sendMessage({ 
        action: 'forceQuiz',
        timestamp: Date.now()
      });
      
      console.log('📡 Force quiz response:', response);
      
      if (response && response.success) {
        showNotification('Quiz triggered successfully! Check the webpage.', 'success');
        // Close popup after brief delay
        setTimeout(() => {
          window.close();
        }, 1500);
      } else if (response && response.error) {
        showNotification(`Quiz failed: ${response.error}`, 'error');
      } else {
        showNotification('Failed to trigger quiz. Extension may not be active on this page.', 'error');
      }
      
    } catch (error) {
      console.error('❌ Error forcing quiz:', error);
      
      // Provide specific error messages
      if (error.message && error.message.includes('Could not establish connection')) {
        showNotification('Extension not loaded on this page. Try refreshing.', 'error');
      } else if (error.message && error.message.includes('receiving end does not exist')) {
        showNotification('Content script not ready. Please refresh the page.', 'error');
      } else {
        showNotification(`Error: ${error.message || 'Unknown error occurred'}`, 'error');
      }
    } finally {
      // Restore button state
      const forceQuizBtn = document.getElementById('force-quiz');
      setTimeout(() => {
        forceQuizBtn.disabled = false;
        // Reload stats to get updated button text
        loadStats();
      }, 1500);
    }
  });
}

function updateToggleState(enabled) {
  const toggleInput = document.getElementById('toggle-switch-input');
  const statusIndicator = document.getElementById('status-indicator');
  
  toggleInput.checked = enabled;
  
  if (enabled) {
    statusIndicator.classList.add('active');
  } else {
    statusIndicator.classList.remove('active');
  }
}

function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    max-width: 280px;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Remove notification after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .streak-multiplier {
    font-size: 12px;
    color: #666;
  }

  .streak-multiplier.active {
    color: #ff6b35;
    font-weight: bold;
  }
`;
document.head.appendChild(style);

// Load initial toggle state
chrome.storage.local.get(['extensionEnabled'], (result) => {
  updateToggleState(result.extensionEnabled !== false);
}); 