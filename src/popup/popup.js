// Popup script for SAT Quiz Blocker
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  setupEventListeners();
  testBackgroundConnection();
});

async function testBackgroundConnection() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'testBackground' });
    console.log('✅ Background script connection test:', response);
  } catch (error) {
    console.error('❌ Background script connection failed:', error);
  }
}

async function loadStats() {
  try {
    // Test if we can communicate with background script
    await testBackgroundConnection();
    
    // Load basic stats
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    
    // Load gamification data
    const gamificationResponse = await chrome.runtime.sendMessage({ action: 'getGamificationStats' });
    
    if (response) {
      document.getElementById('questions-answered').textContent = response.questionsAnswered;
      document.getElementById('total-attempts').textContent = response.totalAttempts;
      
      if (response.lastQuizTime) {
        const lastQuizDate = new Date(response.lastQuizTime);
        const now = new Date();
        const diffInMinutes = Math.floor((now - lastQuizDate) / (1000 * 60));
        
        if (diffInMinutes < 60) {
          document.getElementById('last-quiz').textContent = `${diffInMinutes}m ago`;
        } else if (diffInMinutes < 1440) {
          const hours = Math.floor(diffInMinutes / 60);
          document.getElementById('last-quiz').textContent = `${hours}h ago`;
        } else {
          const days = Math.floor(diffInMinutes / 1440);
          document.getElementById('last-quiz').textContent = `${days}d ago`;
        }
        
        // Check if quiz is due
        const quizInterval = 30 * 60 * 1000; // 30 minutes in milliseconds
        const timeSinceLastQuiz = now - lastQuizDate;
        const isDue = timeSinceLastQuiz >= quizInterval;
        
        // Update force quiz button text based on status
        const forceQuizBtn = document.getElementById('force-quiz');
        if (isDue) {
          forceQuizBtn.textContent = '🎯 Take Quiz Now';
          forceQuizBtn.title = 'A quiz is due based on your schedule';
        } else {
          const remainingMinutes = Math.ceil((quizInterval - timeSinceLastQuiz) / (1000 * 60));
          forceQuizBtn.textContent = '⚡ Force Quiz Now';
          forceQuizBtn.title = `Next scheduled quiz in ${remainingMinutes} minutes, or force one now`;
        }
      } else {
        document.getElementById('last-quiz').textContent = 'Never';
        const forceQuizBtn = document.getElementById('force-quiz');
        forceQuizBtn.textContent = '🎯 Take First Quiz';
        forceQuizBtn.title = 'Take your first quiz now';
      }
    }

    // Display gamification data
    if (gamificationResponse && gamificationResponse.success) {
      displayGamificationStats(gamificationResponse);
    } else {
      console.warn('Gamification stats not available:', gamificationResponse);
    }
    
  } catch (error) {
    console.error('Error loading stats:', error);
    showNotification('Error loading quiz statistics', 'error');
  }
}

function setupEventListeners() {
  // Toggle switch
  const toggleInput = document.getElementById('toggle-switch-input');
  
  toggleInput.addEventListener('change', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'toggleExtension', enabled: toggleInput.checked });
      if (response && response.enabled !== undefined) {
        updateToggleState(response.enabled);
      }
    } catch (error) {
      console.error('Error toggling extension:', error);
    }
  });

  // Reset stats button
  document.getElementById('reset-stats').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all statistics?')) {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'resetStats' });
        
        if (response && response.success) {
          loadStats(); // Reload stats
          showNotification('Statistics reset successfully!');
        }
      } catch (error) {
        console.error('Error resetting stats:', error);
        showNotification('Error resetting statistics', 'error');
      }
    }
  });

  // Force quiz button
  document.getElementById('force-quiz').addEventListener('click', async () => {
    try {
      console.log('Force quiz button clicked');
      
      // Show loading state
      const forceQuizBtn = document.getElementById('force-quiz');
      const originalText = forceQuizBtn.textContent;
      forceQuizBtn.textContent = '⏳ Loading...';
      forceQuizBtn.disabled = true;
      
      console.log('Sending force quiz message to background script');
      
      // Send message to background script, which will forward to content script
      const response = await chrome.runtime.sendMessage({ 
        action: 'forceQuiz',
        timestamp: Date.now() // Add timestamp to ensure unique message
      });
      
      console.log('Force quiz response:', response);
      
      if (response && response.success) {
        showNotification('Quiz triggered successfully! Check the webpage.', 'success');
        // Brief delay before closing to let user see the success message
        setTimeout(() => {
          window.close();
        }, 2000);
      } else if (response && response.error) {
        showNotification(`Quiz failed: ${response.error}`, 'error');
      } else {
        showNotification('Failed to trigger quiz. The extension may not be active on this page.', 'error');
      }
      
    } catch (error) {
      console.error('Error forcing quiz:', error);
      
      // Provide specific error messages
      if (error.message && error.message.includes('Could not establish connection')) {
        showNotification('Extension not loaded on this page. Try refreshing and ensure the page is a regular website.', 'error');
      } else if (error.message && error.message.includes('receiving end does not exist')) {
        showNotification('Content script not ready. Please refresh the page and try again.', 'error');
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

function displayGamificationStats(gamificationData) {
  try {
    const { xp, badges, streaks } = gamificationData;
    
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
    
  } catch (error) {
    console.error('Error displaying gamification stats:', error);
  }
}

function updateXPDisplay(xpData) {
  const xpElement = document.getElementById('current-xp');
  const levelElement = document.getElementById('current-level');
  const progressElement = document.getElementById('xp-progress');
  const progressBarElement = document.getElementById('xp-progress-bar');
  
  if (xpElement) xpElement.textContent = (xpData.totalXP || 0).toLocaleString();
  if (levelElement) levelElement.textContent = xpData.currentLevel || 1;
  
  if (progressElement && xpData.progressXP !== undefined && xpData.requiredXP !== undefined) {
    progressElement.textContent = `${xpData.progressXP}/${xpData.requiredXP} XP to Level ${(xpData.currentLevel || 1) + 1}`;
  }
  
  if (progressBarElement && xpData.progressPercentage !== undefined) {
    progressBarElement.style.width = `${Math.min(100, Math.max(0, xpData.progressPercentage))}%`;
  }
}

function updateStreakDisplay(streakData) {
  const correctStreakElement = document.getElementById('correct-streak');
  const dailyStreakElement = document.getElementById('daily-streak');
  const streakMultiplierElement = document.getElementById('streak-multiplier');
  
  if (correctStreakElement && streakData.correctAnswers) {
    correctStreakElement.textContent = streakData.correctAnswers.current || 0;
  }
  
  if (dailyStreakElement && streakData.dailyParticipation) {
    dailyStreakElement.textContent = streakData.dailyParticipation.current || 0;
  }
  
  if (streakMultiplierElement && streakData.correctAnswers) {
    const multiplier = streakData.correctAnswers.multiplier || 1;
    streakMultiplierElement.textContent = multiplier > 1 ? `${multiplier}x XP` : 'No bonus';
    streakMultiplierElement.className = multiplier > 1 ? 'streak-multiplier active' : 'streak-multiplier';
  }
}

function updateBadgeDisplay(badgeData) {
  const badgesEarnedElement = document.getElementById('badges-earned');
  const badgesTotalElement = document.getElementById('badges-total');
  const badgeProgressElement = document.getElementById('badge-progress');
  
  if (badgesEarnedElement) badgesEarnedElement.textContent = badgeData.earnedBadges || 0;
  if (badgesTotalElement) badgesTotalElement.textContent = badgeData.totalBadges || 0;
  
  if (badgeProgressElement && badgeData.totalBadges > 0) {
    const percentage = ((badgeData.earnedBadges || 0) / badgeData.totalBadges) * 100;
    badgeProgressElement.textContent = `${Math.round(percentage)}% complete`;
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
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
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
`;
document.head.appendChild(style);

// Load initial toggle state
chrome.storage.local.get(['extensionEnabled'], (result) => {
  updateToggleState(result.extensionEnabled !== false);
}); 