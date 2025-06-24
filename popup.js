// Popup script for SAT Quiz Blocker
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  setupEventListeners();
});

async function loadStats() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    
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
      } else {
        document.getElementById('last-quiz').textContent = 'Never';
      }
    }
  } catch (error) {
    console.error('Error loading stats:', error);
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
      
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        showNotification('No active tab found', 'error');
        return;
      }
      
      console.log('Sending force quiz message to tab:', tab.id);
      
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'forceQuiz',
        timestamp: Date.now() // Add timestamp to ensure unique message
      });
      
      console.log('Force quiz response:', response);
      
      if (response && response.success) {
        showNotification('Quiz triggered successfully!', 'success');
        window.close(); // Close popup
      } else {
        showNotification('Failed to trigger quiz. Try refreshing the page.', 'error');
      }
      
    } catch (error) {
      console.error('Error forcing quiz:', error);
      
      // Check if it's a connection error
      if (error.message && error.message.includes('Could not establish connection')) {
        showNotification('Extension not active on this page. Try refreshing the page.', 'error');
      } else {
        showNotification('Error forcing quiz: ' + error.message, 'error');
      }
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