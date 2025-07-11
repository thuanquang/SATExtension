// Background service worker for SAT Quiz Blocker
chrome.runtime.onInstalled.addListener(() => {
  console.log('🎓 SAT Quiz Blocker extension installed');
  
  // Initialize default settings
  chrome.storage.local.set({
    lastQuizTime: null,
    questionsAnswered: 0,
    totalAttempts: 0,
    extensionEnabled: true
  });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This is handled by default_popup in manifest.json
  // but we can add logic here if needed.
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🎓 Background received message:', request);
  
  if (request.action === 'getStats') {
    chrome.storage.local.get(['questionsAnswered', 'totalAttempts', 'lastQuizTime'], (result) => {
      sendResponse({
        questionsAnswered: result.questionsAnswered || 0,
        totalAttempts: result.totalAttempts || 0,
        lastQuizTime: result.lastQuizTime
      });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'resetStats') {
    // Reset both Chrome storage and send reset message to content script
    chrome.storage.local.set({
      questionsAnswered: 0,
      totalAttempts: 0,
      lastQuizTime: null
    }, async () => {
      // Also try to reset gamification data
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          if (tabs[0]) {
            try {
              await chrome.tabs.sendMessage(tabs[0].id, { action: 'resetGamificationData' });
            } catch (error) {
              console.log('Content script not available for gamification reset');
            }
          }
        });
      } catch (error) {
        console.log('Could not reset gamification data');
      }
      
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'toggleExtension') {
    chrome.storage.local.get(['extensionEnabled'], (result) => {
      const newState = !(result.extensionEnabled !== false);
      chrome.storage.local.set({ extensionEnabled: newState }, () => {
        sendResponse({ enabled: newState });
        // Reload active tabs to apply/remove content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.reload(tabs[0].id);
          }
        });
      });
    });
    return true;
  }
  
  // Test message to verify background script is working
  if (request.action === 'testBackground') {
    console.log('🎓 Background script test successful');
    sendResponse({ success: true, message: 'Background script is working' });
    return true;
  }
  
  // Forward messages to content script
  if (request.action === 'forceQuiz' || request.action === 'getGamificationStats') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        try {
          console.log(`🎓 Forwarding ${request.action} to content script...`);
          const response = await chrome.tabs.sendMessage(tabs[0].id, request);
          console.log(`🎓 Content script response for ${request.action}:`, response);
          sendResponse(response);
        } catch (error) {
          console.error(`Failed to send ${request.action} to content script:`, error);
          
          if (request.action === 'getGamificationStats') {
            // Return realistic default gamification stats if content script not available
            console.log('🎓 Returning default gamification stats');
            sendResponse({ 
              success: true,
              xp: { 
                current: 0, 
                level: 1, 
                nextLevelXP: 100, 
                progressPercentage: 0,
                streakMultiplier: 1.0
              },
              streaks: { 
                current: 0, 
                longest: 0, 
                daily: 0, 
                level: 'none',
                isOnFire: false,
                nextMilestone: 3
              },
              badges: { 
                earned: 0, 
                total: 30, 
                recent: [],
                rarityBreakdown: { bronze: 0, silver: 0, gold: 0, platinum: 0 }
              },
              challenges: { 
                hasChallenge: false, 
                progress: 0,
                title: 'No active challenge',
                description: 'Complete a quiz to unlock daily challenges'
              },
              customization: { 
                currentTheme: 'Classic Scholar', 
                availableThemes: 1,
                currentLayout: 'Standard Modal',
                availableLayouts: 1,
                customizationLevel: 1
              }
            });
          } else {
            sendResponse({ 
              success: false, 
              error: 'Extension not loaded on this page. Try refreshing and ensure the page is a regular website.' 
            });
          }
        }
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true;
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('SAT Quiz Blocker extension started');
});

// Log when background script loads
console.log('🎓 SAT Quiz Blocker background script loaded'); 