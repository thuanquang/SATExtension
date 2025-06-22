# SAT Quiz Blocker Chrome Extension

A Chrome extension that blocks specified websites and prompts the user with an SAT question. The extension is designed to be a productivity and study tool, fetching questions from a user-configured Supabase database.

## Features

-   **📚 SAT Question Prompts**: Fetches SAT questions from a Supabase backend to test your knowledge.
-   **🔒 Website Blocking**: Blocks access to distracting websites until a quiz is passed.
-   **🔧 Fully Configurable**: Easily configure your Supabase credentials, blocked websites, and quiz behavior in a single `config.js` file.
-   ** versatile Question Types**: Supports both multiple-choice and numeric-input questions.
-   **⚙️ Advanced Filtering**: Filter questions by difficulty level (`easy`, `medium`, `hard`) and custom tags (e.g., 'Algebra', 'Grammar').
-   **🎛️ User Controls**: A simple popup allows you to toggle the extension on/off, force a quiz immediately, and reset your stats.
-   **📊 Progress Tracking**: Keeps track of how many questions you've answered correctly.
-   **🐛 Debugging Tools**: Includes a `test-connection.html` page to diagnose issues with your Supabase setup.
-   **🏗️ Sophisticated Schema**: Built on a robust PostgreSQL schema that organizes questions into tests and sections.

## How It Works

Once installed and configured, the extension's background script monitors your browsing activity. When you navigate to a website listed in your `BLOCKED_SITES` configuration, the extension injects a content script. This script overlays the page with a quiz modal, preventing further interaction until you answer the question correctly. Questions are fetched from your Supabase database according to your preferences for difficulty and tags.

## Installation and Setup (5-Minute Guide)

Follow these steps to get the extension up and running.

### Prerequisites

-   A free [Supabase](https://supabase.com) account.

### Step 1: Set Up the Supabase Database

1.  **Create a new Supabase project** in your Supabase dashboard.
2.  Navigate to the **SQL Editor** in your new project.
3.  Open the `database-setup.sql` file from this repository.
4.  **Copy the entire content** of the file, paste it into the Supabase SQL Editor, and click **RUN**.
5.  This will:
    -   Create the necessary tables: `questions`, `tests`, `test_sections`, and `test_questions`.
    -   Set up custom types for difficulty and question formats.
    -   Populate the tables with sample questions and test data.
    -   Implement Row Level Security policies to allow the extension to read data.

### Step 2: Configure the Extension

1.  **Find your Supabase API credentials**. In your Supabase project, go to **Settings -> API**. You will need the **Project URL** and the `anon` **public** key.
2.  **Edit the configuration file**. Open `config.js` in a text editor.
3.  **Fill in your credentials**. Replace the placeholder values in `SUPABASE_CONFIG` with your own URL and anon key.

    ```javascript
    // config.js

    const SUPABASE_CONFIG = {
      url: 'https://your-project-id.supabase.co', // ⬅️ Your Supabase Project URL
      anonKey: 'your-anon-key-here',              // ⬅️ Your Supabase anon public key
    };
    ```

### Step 3: Load the Extension in Chrome

1.  Open Google Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** using the toggle switch in the top-right corner.
3.  Click the **Load unpacked** button.
4.  Select the directory where you saved the extension files.
5.  The "SAT Quiz Blocker" extension should now appear in your list of extensions.

The setup is complete! The extension will now be active and will block the sites you've defined in `config.js`.

## Configuration Options

You can customize the extension's behavior by editing the `EXTENSION_CONFIG` and `BLOCKED_SITES` variables in `config.js`.

```javascript
// config.js

// --- Extension Behavior ---
const EXTENSION_CONFIG = {
  // How long to wait between quizzes (in milliseconds)
  quizInterval: 30 * 60 * 1000, // Default: 30 minutes

  // How many questions to fetch from the database at once
  questionFetchLimit: 100,

  // Preferred question difficulty: 'easy', 'medium', or 'hard'
  // Leave empty to get questions of any difficulty.
  preferredDifficulty: 'medium',

  // Preferred question tags (e.g., 'Algebra', 'Grammar', 'Vocabulary')
  // The extension will try to fetch questions matching these tags.
  // Leave empty to get questions with any tag.
  preferredTags: ['Algebra', 'Geometry'],
};

// --- Websites to Block ---
// Add any websites you want to block here.
// Use the format "hostname.com"
const BLOCKED_SITES = [
  "www.youtube.com",
  "www.facebook.com",
  "www.twitter.com",
  "www.instagram.com",
  "www.reddit.com",
  "www.netflix.com",
];
```

## Usage

### The Quiz Modal

When you visit a blocked site, a quiz modal will appear, blocking the page. You must select an answer (for multiple-choice) or type your answer (for numeric questions) and click "Submit". If you are correct, the page will become accessible.

### Extension Popup

Click the extension's icon in the Chrome toolbar to open the popup. From here you can:
-   **Toggle the extension On/Off**: Temporarily disable the extension without uninstalling it.
-   **Force Quiz Now**: Manually trigger a quiz on the current page.
-   **Reset Stats**: Clear your session statistics, like the number of questions answered.

## Database Schema

The extension relies on a structured database to manage questions effectively.

| Table             | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `questions`       | Stores individual SAT questions, including text, type, answer, and category. |
| `tests`           | Defines a collection of questions, like a full practice test.               |
| `test_sections`   | Breaks down tests into sections (e.g., "Reading", "Math - No Calculator").   |
| `test_questions`  | Links questions to a specific test and section, defining their order.       |

For full details on each column, please refer to the `database-setup.sql` file.

## Adding Your Own Questions

You can easily add more questions to your Supabase database.

1.  **Navigate to the Table Editor** in your Supabase dashboard.
2.  Select the **`questions`** table.
3.  Click **Insert row** and fill out the fields.

**Tips for adding questions:**
-   `question_type`: Must be either `multiple_choice` or `numeric`.
-   `answer_choices`: For `multiple_choice`, provide the options as a PostgreSQL array, e.g., `{"Choice A", "Choice B", "Choice C"}`. For `numeric` questions, this can be an empty array `{}`.
-   `correct_answer`: For `multiple_choice`, this is the 1-based index of the correct answer in the `answer_choices` array. For `numeric` questions, this is the string value of the correct answer.

## Troubleshooting

If the extension isn't working as expected, here are some steps to diagnose the problem.

### 1. Use the Connection Tester

The easiest way to find a problem is to use the built-in test page.
1.  Open the `test-connection.html` file from the extension folder directly in your Chrome browser.
2.  Click the buttons to test the Supabase connection, check for tables, and fetch a random question.
3.  The page will provide success or error messages to help you pinpoint the issue.

    -   **"Connection failed"**: Double-check your `url` and `anonKey` in `config.js`.
    -   **"Table not found"**: Make sure you ran the entire `database-setup.sql` script successfully.
    -   **"No questions found"**: Your `questions` table is empty, or your `preferredDifficulty` and `preferredTags` filters in `config.js` are too restrictive and don't match any questions in your database.

### 2. Check the Browser Console

1.  On a page where you expect a quiz, press `F12` to open Developer Tools and go to the **Console** tab.
2.  Look for any error messages, especially those related to network requests or script failures. Errors are often printed in red.

### Common Issues

| Issue                                        | Solution                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No quiz appears on blocked sites.**        | 1. Check the `test-connection.html` page first. <br> 2. Ensure the website is listed in `BLOCKED_SITES` in `config.js`. <br> 3. Check the browser console for errors. <br> 4. Reload the extension at `chrome://extensions/`. |
| **I get a quiz, but it says "No Question".** | This means the extension connected to the database but couldn't retrieve a question. Check your filter settings in `config.js` and make sure they match questions in your database. Try with empty `preferredDifficulty` and `preferredTags`. |
| **"Force Quiz Now" button doesn't work.**    | This can happen if a script failed to load. Reload the page and the extension, and check the console for errors like `ReferenceError`.                                                               |

## Project File Structure

```
SATExtension/
├── manifest.json          # Core extension configuration for Chrome
├── background.js          # Service worker for managing browser events
├── config.js              # User configuration (Supabase keys, blocked sites)
├── content.js             # Script injected into pages to show the quiz
├── supabase-client.js     # Handles all communication with the Supabase API
├── popup.html             # The HTML for the extension's popup menu
├── popup.js               # The JavaScript for the popup menu
├── styles.css             # CSS for the quiz modal and popup
├── database-setup.sql     # SQL script for initializing the database
├── test-connection.html   # A utility page for debugging Supabase connection
└── README.md              # This file
``` 