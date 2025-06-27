# SAT Quiz Blocker - Extension Functionality Documentation

## 🎯 Overview

The SAT Quiz Blocker is a browser extension that blocks websites until users answer SAT questions correctly. It uses a modular architecture with clear separation of concerns, following modern JavaScript and browser extension best practices.

## 📁 Project Structure (Reorganized)

### Source Code Organization (`src/`)

#### Background Scripts (`src/background/`)
- **background.js**: Service worker handling extension lifecycle, storage management, and content script injection

#### Content Scripts (`src/content/`)
- **content.js**: Legacy monolithic content script (kept for reference)
- **content-refactored.js**: New modular content script using component architecture

#### Popup Interface (`src/popup/`)
- **popup.html**: Extension popup UI with progress tracking and controls
- **popup.js**: Popup functionality including statistics and extension controls

#### Components (`src/components/`)
- **QuizState.js**: State management for quiz data and progress tracking
- **QuizModal.js**: UI component for quiz display and user interaction
- **FeedbackManager.js**: Feedback display, messaging, and explanation handling
- **BlockManager.js**: Website blocking, overlay management, and interaction prevention

#### Controller (`src/controller/`)
- **QuizController.js**: Main orchestrator following MVC pattern, coordinating all components

#### Database Layer (`src/db/`)
- **supabase-client.js**: Supabase API client for database operations
- **config.js**: Configuration constants and extension settings

#### Styles (`src/styles/`)
- **styles.css**: Global stylesheet with comprehensive styling for all components

### Supporting Directories

#### Assets (`assets/`)
- Icons, images, fonts, and other static resources

#### SQL Scripts (`sql/`)
- **database-setup.sql**: Database schema and initial question data
- **fix-blank-options.sql**: Database fixes for blank options issue

#### Documentation (`docs/`)
- **README.md**: Main project documentation
- **STRUCTURE.md**: Project structure and best practices
- **EXTENSION_FUNCTIONALITY.md**: This file - detailed functionality documentation
- **BLANK_OPTIONS_ANALYSIS.md**: Analysis of blank options issue
- **BLANK_OPTIONS_FIX_SUMMARY.md**: Summary of fixes applied

#### Testing (`test/`)
- **test-connection.html**: Database connection testing
- **test-countdown.html**: Timer functionality testing
- **test-feedback.html**: Feedback system testing
- **debug-questions.js**: Question debugging utilities

## 🔧 Core Functionality

### 1. Website Blocking System

#### BlockManager Component
- **Purpose**: Prevents user interaction with blocked websites
- **Features**:
  - Creates full-screen overlay with blur effect
  - Disables scrolling, clicking, and keyboard input
  - Manages overlay positioning and styling
  - Handles blocking/unblocking lifecycle

#### Blocking Triggers
- **Time-based**: Every 30 minutes (configurable)
- **Manual**: User can force quiz via popup
- **Error recovery**: Automatic unblocking on errors

### 2. Quiz System

#### QuizController (Main Orchestrator)
- **Architecture**: Follows MVC pattern
- **Responsibilities**:
  - Initialize all components
  - Manage quiz lifecycle
  - Handle user interactions
  - Coordinate between components
  - Manage timers and state transitions

#### QuizState Component
- **Purpose**: Centralized state management
- **Data Managed**:
  - Current question data
  - Attempt counter
  - Timer state
  - Progress tracking
  - User preferences

#### QuizModal Component
- **Purpose**: Quiz interface display
- **Features**:
  - Responsive modal design
  - Question and answer display
  - Timer countdown
  - Attempt tracking
  - Accessibility support

### 3. Feedback System

#### FeedbackManager Component
- **Purpose**: Comprehensive feedback handling
- **Features**:
  - Success/error message display
  - Explanation review system
  - Overlay notifications
  - Animated feedback transitions
  - Fallback mechanisms

#### Feedback Types
- **Success**: Correct answer feedback
- **Error**: Incorrect answer feedback
- **Loading**: Processing state feedback
- **Explanation**: Detailed answer explanations

### 4. Database Integration

#### SupabaseClient
- **Purpose**: Database and API interactions
- **Features**:
  - Random question fetching
  - Tag and difficulty filtering
  - Error handling and retry logic
  - Authentication management
  - Data formatting and validation

#### Question Management
- **Question Types**: Multiple choice and numeric
- **Difficulty Levels**: Easy, medium, hard
- **Tags**: Algebra, Geometry, Grammar, Vocabulary
- **Filtering**: Configurable preferences

### 5. Configuration System

#### Extension Settings
- **Quiz Interval**: 30 minutes (configurable)
- **Max Attempts**: 3 per question
- **Questions Per Session**: 1
- **Preferred Difficulty**: Medium
- **Preferred Tags**: Algebra, Geometry, Grammar, Vocabulary
- **Review Time**: 10 seconds
- **Error Timeout**: 15 seconds

## 🎨 User Interface

### Popup Interface
- **Progress Tracking**: Questions answered, total attempts, last quiz
- **Extension Controls**: Enable/disable toggle, reset statistics, force quiz
- **Visual Design**: Clean, modern interface with consistent styling

### Quiz Modal
- **Layout**: Fixed height, centered modal with scrollable content
- **Responsive**: Adapts to content length and viewport size
- **Accessibility**: Keyboard navigation, screen reader support
- **Visual Feedback**: Clear success/error states, progress indicators

### Overlay System
- **Blocking Overlay**: Full-screen with blur effect
- **Feedback Overlay**: Centered notifications for status updates
- **Animation**: Smooth transitions and fade effects

## 🔄 User Experience Flow

### 1. Extension Initialization
1. Background script starts and initializes storage
2. Content script loads and checks extension status
3. Components initialize in proper order
4. Extension ready for quiz triggering

### 2. Quiz Triggering
1. Time-based trigger or manual activation
2. BlockManager creates overlay and blocks website
3. QuizController fetches question from database
4. QuizModal displays question interface

### 3. Question Interaction
1. User reads question and selects answer
2. QuizController validates answer
3. FeedbackManager displays appropriate feedback
4. State updates (attempts, progress, etc.)

### 4. Quiz Completion
1. Correct answer triggers success flow
2. Explanation review period (10 seconds)
3. Website unblocked and user can continue browsing
4. Progress statistics updated

### 5. Error Handling
1. Network errors trigger fallback mechanisms
2. Database errors show user-friendly messages
3. Component errors handled gracefully
4. Automatic recovery where possible

## 🛠️ Technical Implementation

### Modular Architecture
- **Components**: Self-contained, reusable modules
- **Dependencies**: Clear dependency management
- **Interfaces**: Well-defined component interfaces
- **Testing**: Isolated component testing

### Error Handling
- **Graceful Degradation**: Extension continues working despite errors
- **User Feedback**: Clear error messages and status updates
- **Recovery Mechanisms**: Automatic retry and fallback systems
- **Logging**: Comprehensive error logging for debugging

### Performance Optimization
- **Lazy Loading**: Components loaded as needed
- **Efficient DOM**: Minimal DOM manipulation
- **Memory Management**: Proper cleanup and resource management
- **Caching**: Question caching and state persistence

### Security Considerations
- **Content Security Policy**: Proper CSP implementation
- **Data Validation**: Input validation and sanitization
- **API Security**: Secure database interactions
- **Permission Management**: Minimal required permissions

## 📊 Data Management

### Storage Strategy
- **Chrome Storage**: Extension settings and user progress
- **Supabase Database**: Question bank and user statistics
- **Local State**: Runtime state management
- **Cache Management**: Question and configuration caching

### Data Flow
1. **Configuration**: Loaded from config.js and storage
2. **Questions**: Fetched from Supabase database
3. **User Progress**: Stored in Chrome storage
4. **Runtime State**: Managed by QuizState component

## 🔧 Development and Testing

### Development Workflow
1. **Component Development**: Isolated component development
2. **Integration Testing**: Component integration testing
3. **Extension Testing**: Full extension functionality testing
4. **User Testing**: Real-world usage testing

### Testing Strategy
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **End-to-End Tests**: Full user flow testing
- **Manual Testing**: UI/UX validation

### Debug Tools
- **Console Logging**: Comprehensive debug logging
- **Test Pages**: Dedicated test HTML files
- **Debug Utilities**: Development helper functions
- **Error Tracking**: Detailed error reporting

## 🚀 Deployment and Distribution

### Build Process
1. **Code Organization**: Files organized in proper structure
2. **Path Updates**: All import paths updated
3. **Manifest Updates**: Manifest.json reflects new structure
4. **Documentation**: Updated documentation

### Distribution
- **Chrome Web Store**: Extension packaging and submission
- **Version Management**: Semantic versioning
- **Update Process**: Seamless user updates
- **Compatibility**: Cross-browser compatibility

## 📈 Future Enhancements

### Planned Features
- **Question Bank Expansion**: More questions and categories
- **User Analytics**: Detailed progress tracking
- **Customization**: User-configurable settings
- **Mobile Support**: Mobile browser compatibility

### Technical Improvements
- **Performance**: Further optimization and caching
- **Accessibility**: Enhanced accessibility features
- **Testing**: Comprehensive test coverage
- **Documentation**: Enhanced developer documentation

## 🔍 Troubleshooting

### Common Issues
1. **Extension Not Loading**: Check manifest.json paths
2. **Database Connection**: Verify Supabase configuration
3. **UI Issues**: Check CSS file paths and styling
4. **Performance**: Monitor component initialization

### Debug Steps
1. **Console Logs**: Check browser console for errors
2. **Component Status**: Verify component initialization
3. **Network Requests**: Monitor database API calls
4. **Storage State**: Check Chrome storage values

### Support Resources
- **Documentation**: Comprehensive documentation in docs/
- **Test Files**: Dedicated test pages for debugging
- **Error Logs**: Detailed error logging and reporting
- **Community**: User community and support channels 