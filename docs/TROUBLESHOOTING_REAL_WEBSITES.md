# SAT Quiz Extension - Real Website Troubleshooting Guide

## 🚨 Issue: Gamification Works in Test but Not on Real Websites

### Problem Description
The gamification system works perfectly in the `test/debug-gamification.html` test environment, but when using the extension on real websites, the gamification features (XP, badges, streaks) don't appear.

### Root Cause Analysis
This typically occurs when:
1. **Content Script Issues**: The content script isn't loading properly with all gamification systems
2. **Parameter Issues**: Missing parameters in gamification function calls
3. **Browser Extension Context**: Different behavior between test environment and browser extension context

### 🔧 Fixes Applied

#### 1. Fixed Missing userId Parameter
**Problem**: QuizController was calling `awardXP(xpAmount, context)` instead of `awardXP(userId, xpAmount, context)`

**Solution**: Updated QuizController.js line 475:
```javascript
// Before (incorrect)
const xpResult = await this.xpManager.awardXP(xpAmount, {
  source: 'question_completion',
  // ...
});

// After (correct)
const xpResult = await this.xpManager.awardXP(this.userId, xpAmount, {
  source: 'question_completion',  
  // ...
});
```

#### 2. Created Real Website Test Page
**Solution**: Created `test/test-content-script.html` to test content script loading on a real webpage

### 🧪 Testing Your Installation

#### Step 1: Test Content Script Loading
1. Open the `test/test-content-script.html` file in your browser
2. Look for the green "SAT Quiz Extension Loaded" notification
3. Click "Check Extension Loaded" button
4. Verify all gamification systems show as available

#### Step 2: Test Quiz Functionality  
1. Click "Force Quiz" button on the test page
2. Answer a question correctly
3. Look for gamification notifications (XP gained, streaks, etc.)
4. Check browser console for detailed logs

#### Step 3: Test on Real Website
1. Visit any regular website (like example.com)
2. Wait 30 minutes or use popup to force a quiz
3. Verify that gamification features appear when answering correctly

### 🔍 Diagnostic Steps

#### Check Extension Status
1. Open Chrome Extension Manager (`chrome://extensions/`)
2. Verify "SAT Quiz Blocker" is enabled
3. Check for any error messages

#### Check Console Logs
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for messages starting with `🎓` (extension logs)
4. Look for messages starting with `🎮` (gamification logs)

#### Expected Log Messages
```
🎓 SAT Quiz Blocker: Starting refactored extension...
🎮 Initializing gamification systems...
🎮 XP Manager initialized
🎮 Badge Manager initialized
🎮 Streak Manager initialized
🎮 Challenge Engine initialized
```

### 📊 Verifying Gamification Data

#### Using Popup
1. Click extension icon in browser toolbar
2. Look for gamification stats:
   - Current XP and Level
   - Streak counters
   - Badge progress
   - Challenge information

#### Using Test Page
1. Open `test/test-content-script.html`
2. Click "Get Stats" button
3. Review detailed gamification data in results

#### Expected Stats Structure
```json
{
  "success": true,
  "xp": {
    "current": 47,
    "level": 1,
    "nextLevelXP": 100,
    "progressPercentage": 47
  },
  "streaks": {
    "current": 1,
    "longest": 1,
    "daily": 1
  },
  "badges": {
    "earned": 0,
    "total": 30
  }
}
```

### 🚫 Common Issues and Solutions

#### Issue: "QuizController not found"
**Cause**: Content script not loading properly  
**Solution**: 
1. Refresh the webpage
2. Check if extension is enabled
3. Try on a different website

#### Issue: "User ID not set"
**Cause**: Authentication not working  
**Solution**:
1. Extension automatically creates user ID
2. Clear browser storage and reload
3. Check console for auth errors

#### Issue: XP/badges not updating
**Cause**: Database connection issues  
**Solution**:
1. Check internet connection
2. Look for database errors in console
3. Retry quiz after connection is restored

#### Issue: Quiz shows but no gamification
**Cause**: Gamification systems not initialized  
**Solution**:
1. Check that all gamification scripts are loaded in manifest.json
2. Verify no JavaScript errors in console
3. Use test page to verify system status

### 📁 Files Modified for This Fix

#### Core Files Updated
- `src/controller/QuizController.js` - Fixed awardXP call with userId parameter
- `test/test-content-script.html` - New comprehensive test page for real website testing

#### Files to Verify
- `manifest.json` - Ensure all gamification scripts are in content_scripts
- `src/content/content-refactored.js` - Primary content script using QuizController
- All files in `src/systems/` - Gamification system implementations

### 🎯 Success Criteria

Your gamification system is working correctly when:

✅ **Extension loads**: Green notification appears on websites  
✅ **Quiz triggers**: Extension blocks website and shows quiz modal  
✅ **XP awards**: Correct answers show "+XP" in success message  
✅ **Streaks track**: Multiple correct answers build streaks  
✅ **Badges check**: System checks for badge eligibility  
✅ **Challenges generate**: Daily challenges are created and tracked  
✅ **Stats persist**: Popup shows updated gamification statistics  
✅ **Cross-session**: Stats maintain between browser sessions  

### 🆘 Still Having Issues?

If gamification still doesn't work on real websites:

1. **Force refresh**: Clear browser cache and reload
2. **Check permissions**: Ensure extension has permissions for the website
3. **Try incognito**: Test in incognito mode to rule out conflicts
4. **Check compatibility**: Some websites may have CSP restrictions
5. **Console debugging**: Look for specific error messages in console

### 💡 Developer Notes

The key difference between test environment and real websites:
- **Test environment**: Direct script loading with global access
- **Real websites**: Content script injection with extension context
- **Parameter handling**: Real websites require proper userId parameter passing
- **Async initialization**: Real websites need proper async/await handling

This fix ensures the gamification system works consistently in both environments. 