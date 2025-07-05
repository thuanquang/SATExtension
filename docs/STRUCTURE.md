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
│   │   └── QuizController.js   # Main controller (MVC pattern) - Enhanced with gamification
│   ├── db/                     # Database and API logic
│   │   ├── supabase-client.js  # Supabase API client
│   │   └── config.js           # Configuration and constants
│   ├── systems/                # 🎮 GAMIFICATION SYSTEMS (NEW)
│   │   ├── XPManager.js        # Experience points and leveling system
│   │   ├── BadgeManager.js     # Badge definitions and achievement tracking
│   │   ├── StreakManager.js    # Streak tracking and momentum features
│   │   ├── ChallengeEngine.js  # Daily challenges and themed events
│   │   ├── CustomizationManager.js # Themes, avatars, and interface personalization
│   │   └── ProgressDashboard.js # Comprehensive progress visualization and analytics
│   └── styles/                 # Global styles
│       └── styles.css          # Main stylesheet (Enhanced with gamification styles)
│
├── assets/                     # Images, icons, fonts, etc.
├── sql/                        # SQL scripts and database setup
│   ├── database-setup.sql      # Database schema and initial data
│   └── fix-blank-options.sql   # Database fixes
├── docs/                       # Documentation and markdown files
│   ├── README.md               # Main project documentation
│   ├── STRUCTURE.md            # This file - project structure
│   ├── EXTENSION_FUNCTIONALITY.md # Detailed functionality docs
│   ├── COMPREHENSIVE_GAMIFICATION_STRATEGY.md # Complete gamification analysis and implementation strategy
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

## 🎮 Gamification Systems (NEW)

### XPManager (src/systems/)
- **Purpose**: Experience points and leveling system
- **Responsibilities**:
  - Calculate XP based on difficulty, attempts, and speed
  - Apply streak multipliers (up to 2.5x)
  - Manage level progression with escalating requirements
  - Award bonus XP for achievements and milestones

### BadgeManager (src/systems/)
- **Purpose**: Badge definitions and achievement tracking
- **Responsibilities**:
  - Define 30+ badges across 4 categories (subject, difficulty, consistency, special)
  - Track progress towards badge requirements
  - Award badges automatically when criteria are met
  - Provide visual representations and progress indicators

### StreakManager (src/systems/)
- **Purpose**: Streak tracking and momentum features
- **Responsibilities**:
  - Track correct answer streaks with XP multipliers
  - Monitor daily participation streaks
  - Generate motivational messages based on performance
  - Handle streak breaking and comeback mechanics

### ChallengeEngine (src/systems/)
- **Purpose**: Daily challenges and themed events
- **Responsibilities**:
  - Generate themed daily challenges (Math Monday, Word Wednesday, etc.)
  - Scale difficulty based on user level (beginner to expert)
  - Track challenge progress and completion
  - Award bonus rewards for challenge completion

### CustomizationManager (src/systems/)
- **Purpose**: Themes, avatars, and interface personalization
- **Responsibilities**:
  - Manage 8 unlockable themes with level requirements
  - Handle avatar system (15 animals, 14 colors, 6 accessories, 3 poses)
  - Apply customizations to quiz interface
  - Track unlock progress and available options

### ProgressDashboard (src/systems/)
- **Purpose**: Comprehensive progress visualization and analytics
- **Responsibilities**:
  - Create multi-dimensional analytics dashboards
  - Generate visual progress charts and graphs
  - Display achievement timelines and milestone celebrations
  - Provide comprehensive statistics and trends

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
5. **Accessibility**: Full WCAG compliance with ARIA labels and keyboard navigation
6. **Error Handling**: Comprehensive error recovery and user feedback
7. **Testing**: Comprehensive test suite for all components
8. **Performance**: Optimized loading and memory management

### Benefits
1. **Maintainability**: Easier to find and modify specific functionality
2. **Scalability**: Clear structure for adding new features
3. **Testing**: Dedicated test directory with organized test files
4. **Documentation**: Centralized documentation in `docs/` directory
5. **Accessibility**: Works for all users including those with disabilities
6. **Reliability**: Robust error handling and recovery mechanisms
7. **User Experience**: Clear feedback and intuitive interactions
8. **Developer Experience**: Comprehensive debugging tools and logging

### Backward Compatibility
- All existing functionality preserved
- No breaking changes to user experience
- Extension continues to work as before
- Enhanced with better error handling and accessibility

## 🧪 Testing & Quality Assurance

### Comprehensive Test Suite
- **test/comprehensive-functionality-test.html**: Full functionality testing
- **Dependency Checking**: Validates all components load correctly
- **Component Testing**: Individual component validation
- **Integration Testing**: Full workflow validation
- **Performance Testing**: Load time and memory usage monitoring
- **Accessibility Testing**: Keyboard navigation and screen reader support

### Debug Tools
Available via `window.debugQuiz` in browser console:
- `checkTiming()` - Check if quiz is due
- `forceQuiz()` - Trigger quiz immediately
- `forceQuizDue()` - Make quiz immediately due
- `getStats()` - View current statistics
- `resetStats()` - Reset all statistics
- `getState()` - Get current extension state

### Error Monitoring
- Comprehensive console logging with 🎓 prefixes
- User-friendly error messages
- Automatic error recovery mechanisms
- Detailed error reporting for debugging 