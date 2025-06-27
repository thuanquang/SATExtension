# SAT Quiz Blocker - Project Structure & Best Practices

## 📁 Folder Structure

```
SATExtension/
│
├── src/                        # All source code (JS, CSS, HTML)
│   ├── background/             # Background scripts
│   │   └── background.js       # Service worker for extension lifecycle
│   ├── content/                # Content scripts
│   │   ├── content.js          # Legacy content script (monolithic)
│   │   └── content-refactored.js # New modular content script
│   ├── popup/                  # Popup UI and logic
│   │   ├── popup.html          # Extension popup interface
│   │   └── popup.js            # Popup functionality
│   ├── components/             # UI and logic components (modular)
│   │   ├── BlockManager.js     # Website blocking/overlay management
│   │   ├── FeedbackManager.js  # Feedback display and messaging
│   │   ├── QuizModal.js        # Quiz modal UI component
│   │   └── QuizState.js        # State management for quiz data
│   ├── controller/             # Orchestration logic
│   │   └── QuizController.js   # Main controller (MVC pattern)
│   ├── db/                     # Database and API logic
│   │   ├── supabase-client.js  # Supabase API client
│   │   └── config.js           # Configuration and constants
│   └── styles/                 # Global styles
│       └── styles.css          # Main stylesheet
│
├── assets/                     # Images, icons, fonts, etc.
├── sql/                        # SQL scripts and database setup
│   ├── database-setup.sql      # Database schema and initial data
│   └── fix-blank-options.sql   # Database fixes
├── docs/                       # Documentation and markdown files
│   ├── README.md               # Main project documentation
│   ├── STRUCTURE.md            # This file - project structure
│   ├── EXTENSION_FUNCTIONALITY.md # Detailed functionality docs
│   ├── BLANK_OPTIONS_ANALYSIS.md # Analysis of blank options issue
│   └── BLANK_OPTIONS_FIX_SUMMARY.md # Summary of fixes applied
├── test/                       # Test HTML files and debug scripts
│   ├── test-connection.html    # Database connection testing
│   ├── test-countdown.html     # Timer functionality testing
│   ├── test-feedback.html      # Feedback system testing
│   └── debug-questions.js      # Question debugging utilities
├── manifest.json               # Extension manifest
└── .gitignore                  # Git ignore rules
```

## 🏗️ Architecture Principles

### 1. **Separation of Concerns**
- **UI Components**: `src/components/` - Pure UI logic
- **Business Logic**: `src/controller/` - Orchestration and state management
- **Data Layer**: `src/db/` - Database and API interactions
- **Presentation**: `src/styles/` - Styling and theming

### 2. **Modular Design**
- Each component has a single responsibility
- Components are loosely coupled and highly cohesive
- Clear interfaces between components
- Easy to test and maintain

### 3. **Browser Extension Best Practices**
- **Content Scripts**: Minimal, focused on DOM manipulation
- **Background Scripts**: Handle extension lifecycle and storage
- **Popup**: Lightweight UI for user interaction
- **Manifest**: Clear permissions and resource declarations

## 🔧 Development Guidelines

### File Naming Conventions
- **Components**: PascalCase (e.g., `QuizModal.js`)
- **Utilities**: camelCase (e.g., `supabase-client.js`)
- **Constants**: UPPER_SNAKE_CASE (in config files)
- **CSS Classes**: kebab-case (e.g., `quiz-modal`)

### Import/Export Patterns
- Use ES6 modules where possible
- Global variables for browser extension compatibility
- Clear dependency management in manifest.json

### Error Handling
- Graceful degradation for missing dependencies
- User-friendly error messages
- Comprehensive logging for debugging

### Performance Considerations
- Lazy loading of components when possible
- Efficient DOM manipulation
- Minimal re-renders and state updates

## 📦 Component Responsibilities

### QuizController (src/controller/)
- **Purpose**: Main orchestrator following MVC pattern
- **Responsibilities**: 
  - Initialize all components
  - Manage quiz lifecycle
  - Handle user interactions
  - Coordinate between components

### QuizState (src/components/)
- **Purpose**: State management for quiz data
- **Responsibilities**:
  - Store current question data
  - Track attempts and progress
  - Manage timer state
  - Provide state update methods

### QuizModal (src/components/)
- **Purpose**: UI component for quiz display
- **Responsibilities**:
  - Render quiz interface
  - Handle user input
  - Manage modal visibility
  - Provide accessibility features

### FeedbackManager (src/components/)
- **Purpose**: Handle all feedback and messaging
- **Responsibilities**:
  - Display success/error messages
  - Show explanations
  - Manage overlay notifications
  - Handle feedback animations

### BlockManager (src/components/)
- **Purpose**: Website blocking and overlay management
- **Responsibilities**:
  - Create and manage overlay
  - Block user interactions
  - Handle blocking/unblocking
  - Manage overlay positioning

### SupabaseClient (src/db/)
- **Purpose**: Database and API interactions
- **Responsibilities**:
  - Fetch questions from database
  - Handle API authentication
  - Manage data formatting
  - Error handling for network issues

## 🚀 Deployment Considerations

### Manifest.json Updates
- All script paths updated to reflect new structure
- CSS paths updated to `src/styles/styles.css`
- Background script path updated to `src/background/background.js`

### Testing
- Test files moved to dedicated `test/` directory
- CSS paths updated in test HTML files
- Debug utilities organized in `test/` directory

### Documentation
- All documentation moved to `docs/` directory
- Structure documentation updated
- Functionality documentation preserved

## 🔄 Migration Notes

### What Changed
1. **File Organization**: All source code moved to `src/` directory
2. **Component Separation**: Clear separation of UI, logic, and data layers
3. **Path Updates**: All import paths and manifest references updated
4. **Documentation**: Moved to dedicated `docs/` directory

### Benefits
1. **Maintainability**: Easier to find and modify specific functionality
2. **Scalability**: Clear structure for adding new features
3. **Testing**: Dedicated test directory with organized test files
4. **Documentation**: Centralized documentation in `docs/` directory

### Backward Compatibility
- All existing functionality preserved
- No breaking changes to user experience
- Extension continues to work as before 