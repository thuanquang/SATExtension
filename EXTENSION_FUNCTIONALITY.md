# SAT Quiz Blocker Extension Functionality

This document outlines the core functionality of the SAT Quiz Blocker extension, focusing on the quiz presentation, interaction, and data handling logic. It serves as a reference to prevent regressions and ensure consistent behavior.

## 1. Core Purpose

The primary goal of this extension is to block user-specified distracting websites and require them to correctly answer an SAT question to regain access.

## 2. Quiz Triggering and Data Handling

- **Quiz Triggering**: The quiz is shown if the `quizInterval` (defined in `config.js`) has passed since the last successfully completed quiz. This is checked by the `shouldShowQuiz` function in `content.js`.
- **Fetching Questions**: Questions are fetched from a Supabase database using the `getRandomQuestion` method in `supabase-client.js`.
- **Data Validation**:
    - The `formatQuestion` method ensures that every question is well-formed before being used. It returns `null` if a question is invalid (e.g., missing text, insufficient answer choices).
    - The `getRandomQuestion` method includes a retry mechanism. If `formatQuestion` returns `null`, it will attempt to fetch another question up to 5 times to prevent showing a broken quiz.

## 3. Quiz Interaction Flow

The quiz interaction is managed within `content.js` and is designed to be robust and user-friendly.

### Initial State (Quiz Active)

- **Blocking**: When the quiz is active, the `blockWebsite` function creates a full-screen overlay (`sat-quiz-overlay`) and the quiz modal.
- **Interaction Lock**: The `preventDefault` method blocks **all** user interactions outside of the quiz modal. This includes:
    - Clicking the overlay.
    - Scrolling the main page.
    - Any other clicks or key presses.
- The user **cannot** close the modal by clicking outside or scrolling.

### Answering the Question

- **Submission**: The `handleSubmit` function manages the answer submission. The "Submit" button is temporarily disabled to prevent multiple submissions.
- **Incorrect Answer**:
    - The `handleIncorrectAnswer` function is called.
    - The attempts counter is incremented.
    - If the user has remaining attempts, an error message is shown, and the "Submit" button is re-enabled.
- **Max Attempts Reached**:
    - If the user runs out of attempts, the `handleMaxAttempts` function is called.
    - This triggers **Review Mode**.

### Correct Answer

- If the user answers correctly, the `handleCorrectAnswer` function is called.
- This immediately triggers **Review Mode**.

## 4. Review Mode (`isReviewing`)

Review Mode is activated when a quiz is completed, either by answering correctly or by running out of attempts. The `isReviewing` property is set to `true`. This mode has different rules:

- **Scrolling is ENABLED**: The user can freely scroll the modal to read the explanation, no matter how long it is.
- **Click Outside to Close is ENABLED**: The user can click on the dark overlay (`sat-quiz-overlay`) to prematurely close the quiz and unblock the website.
- **Cooldown Timer**:
    - A cooldown timer starts (`startCooldownTimer`).
    - The duration is configurable via `explanationReviewTime` (for correct answers) or `cooldownPeriod` (for max attempts) in `config.js`.
    - The timer's text explicitly states that the user can click outside to close early.
    - If the user does not close it manually, the website is unblocked automatically when the timer finishes.

## 5. Error Handling and Recovery

### Recent Fixes (Latest Update)

**Issue**: Quiz automatically and prematurely exiting after 3 seconds when forcing new quiz or during other scenarios.

**Root Cause**: Aggressive 3-second timeouts in the `showQuiz()` method that automatically unblocked the website on any error condition.

**Solution Implemented**:

1. **Extended Timeout Duration**: 
   - Changed from 3 seconds to 15 seconds (configurable via `errorTimeout` in `config.js`)
   - Gives more time for network recovery and user understanding

2. **Retry Mechanism**:
   - Added 3-attempt retry logic for question fetching
   - 2-second delays between retries for normal failures
   - 3-second delays for network errors
   - Progressive feedback showing retry attempts

3. **Enhanced Loading States**:
   - Added loading feedback during question fetching
   - Clear visual indicators for different states (loading, error, success)
   - Better user communication about what's happening

4. **Improved Error Handling**:
   - More descriptive error messages
   - Graceful handling of network issues
   - Better feedback for different error types

5. **Race Condition Prevention**:
   - Added small delay in `forceQuiz()` to ensure proper overlay creation
   - Better initialization checks
   - Improved error recovery in force quiz scenarios

### Error Timeout Configuration

- **`errorTimeout`**: New configurable setting in `config.js` (default: 15 seconds)
- Controls how long to wait before auto-unblocking on errors
- Can be adjusted based on network conditions and user preferences

### Loading and Feedback System

- **Loading State**: Shows "Loading quiz..." with attempt counter during retries
- **Error State**: Shows specific error messages with recovery suggestions
- **Success State**: Clears feedback when quiz loads successfully
- **Overlay Feedback**: Shows messages on overlay when modal isn't created yet

## 6. Current Issue and Debugging

### Problem Description
The extension shows the grey overlay (background gets greyed up) but then disappears after a few seconds without showing the quiz modal. This suggests an error in the quiz loading process.

### Debugging Approach
1. **Enhanced Error Logging**: Added comprehensive error handling and logging to `showQuiz()` method to identify where the failure occurs.
2. **Error Display**: Modified `showFeedback()` to display errors on the overlay when the modal hasn't been created yet.
3. **Initialization Checks**: Added checks for SupabaseClient availability and proper initialization.
4. **Debug Page**: Created `debug-extension.html` to test each component step by step.

### Debug Steps
1. Open `debug-extension.html` in a browser with the extension enabled
2. Run each test section to identify the failing component:
   - Extension Status Check
   - Configuration Test
   - Supabase Connection Test
   - Question Fetching Test
   - Force Quiz Test
3. Check browser console for detailed error logs
4. Use the console log capture in the debug page to see all extension-related logs

### Potential Issues
- Supabase client not properly initialized
- Database connection failing
- Question fetching returning null/empty data
- Modal creation failing due to missing DOM elements
- Script injection order issues in background.js

### Recent Changes
- Added error handling to `showQuiz()` method
- Enhanced `showFeedback()` to work before modal creation
- Added initialization checks for SupabaseClient
- Created comprehensive debug page for troubleshooting
- **FIXED**: Extended error timeouts from 3 to 15 seconds
- **FIXED**: Added retry mechanism for question fetching
- **FIXED**: Improved loading states and user feedback
- **FIXED**: Added race condition prevention in force quiz
- **FIXED**: Made error timeout configurable via `errorTimeout` setting

## 7. Blank Options Issue - Complete Fix

### Problem Description
Sometimes the quiz popup displays blank options instead of the actual answer choices. This is a critical issue that makes questions impossible to answer correctly.

### Root Causes Identified
1. **Database Issues**:
   - NULL or missing `answer_choices` arrays
   - Empty `answer_choices` arrays
   - Individual choices that are NULL, undefined, or empty strings
   - Whitespace-only choices
   - Non-string data types in choices arrays

2. **Data Processing Issues**:
   - Insufficient validation during question formatting
   - Incorrect filtering logic
   - Missing safety checks in rendering

3. **UI Rendering Issues**:
   - Inadequate client-side validation
   - Poor error handling for malformed data

### Comprehensive Solution Implemented

#### 1. Enhanced Database Validation (`supabase-client.js`)
- **Strict Type Checking**: Validates `answer_choices` is a proper array
- **Content Filtering**: Removes NULL, undefined, empty, and whitespace-only choices
- **Minimum Requirements**: Ensures at least 2 valid choices exist
- **Correct Answer Validation**: Verifies correct answer index is valid
- **Detailed Logging**: Comprehensive logging for debugging

#### 2. Robust UI Rendering (`content.js`)
- **Multi-layer Validation**: Additional checks before rendering
- **Error Display**: Shows user-friendly error for problematic questions
- **Safe Rendering**: Filters out invalid options during HTML generation
- **Graceful Degradation**: Handles edge cases without crashing

#### 3. Database Diagnostic and Fix Tools
- **`debug-blank-options.html`**: Comprehensive diagnostic tool
- **`fix-blank-options.sql`**: SQL queries to identify and fix database issues
- **Automated Analysis**: Detects all types of blank option problems

#### 4. Enhanced Error Handling
- **Validation Cascade**: Multiple validation layers from database to UI
- **User-Friendly Errors**: Clear error messages for problematic questions
- **Admin Notifications**: Detailed logging for troubleshooting
- **Graceful Fallbacks**: System continues to work even with some bad data

### Tools for Diagnosis and Repair

#### Diagnostic Tool (`debug-blank-options.html`)
1. Open the file in your browser with the extension enabled
2. It will automatically analyze your database
3. Provides detailed report of all issues found
4. Generates SQL commands to fix problems

#### SQL Fix Script (`fix-blank-options.sql`)
1. Run in your Supabase SQL editor
2. Identifies all problematic questions
3. Provides example fix commands
4. Validates fixes were successful

### Prevention Measures
1. **Input Validation**: Validate data when adding questions
2. **Regular Audits**: Periodically run diagnostic tools
3. **Data Quality Checks**: Implement database constraints
4. **User Feedback**: Monitor for blank option reports

### Quick Fix Commands

**Find all problematic questions:**
```sql
SELECT question_id, answer_choices 
FROM questions 
WHERE question_type = 'multiple_choice' 
AND (answer_choices IS NULL OR answer_choices && ARRAY['', NULL]);
```

**Delete unfixable questions:**
```sql
DELETE FROM questions 
WHERE question_type = 'multiple_choice' 
AND answer_choices IS NULL;
```

**Example fix for a specific question:**
```sql
UPDATE questions 
SET answer_choices = ARRAY['Option A', 'Option B', 'Option C', 'Option D']
WHERE question_id = 'problematic-question-id';
```

### Monitoring and Maintenance
- Run diagnostic tool monthly
- Check console logs for validation warnings
- Monitor user feedback for quiz display issues
- Maintain data quality standards for new questions

This comprehensive fix addresses all known causes of blank options and provides tools for ongoing maintenance and prevention. 