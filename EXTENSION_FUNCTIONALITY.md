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

## 5. Current Issue and Debugging

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