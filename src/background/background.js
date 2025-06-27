// Background service worker for SAT Quiz Blocker
chrome.runtime.onInstalled.addListener(() => {
  console.log('SAT Quiz Blocker extension installed');
  
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
    chrome.storage.local.set({
      questionsAnswered: 0,
      totalAttempts: 0,
      lastQuizTime: null
    }, () => {
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
});

// Handle tab updates to inject content script
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    const { extensionEnabled } = await chrome.storage.local.get(['extensionEnabled']);
    
    if (extensionEnabled !== false) {
      console.log('Injecting scripts into tab:', tabId);
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['src/db/config.js']
        });
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['src/db/supabase-client.js']
        });
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['src/content/content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tabId },
          files: ['src/styles/styles.css']
        });
        console.log('Scripts injected successfully into tab:', tabId);
      } catch (err) {
        console.error('Failed to inject scripts:', err);
      }
    }
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('SAT Quiz Blocker extension started');
}); 