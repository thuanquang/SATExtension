# SAT Quiz Blocker Extension - Architecture & Best Practices

This document outlines the best practices, patterns, and structural guidelines used in the refactored SAT Quiz Blocker extension. Follow these principles for all future development and maintenance.

---

## 1. Modular Architecture

- **Each major concern is a separate module/class.**
- **No monolithic classes**: Avoid mixing UI, state, and business logic in a single file.
- **Directory structure:**
  ```
  components/
    QuizState.js         // State management
    QuizModal.js         // UI modal component
    FeedbackManager.js   // Feedback & explanations
    BlockManager.js      // Website blocking
  QuizController.js      // Main orchestrator
  content-refactored.js  // Entry point
  styles.css             // All styling
  ```

## 2. Separation of Concerns (SoC)

- **QuizState**: Handles all quiz state, attempts, and persistence. No UI code.
- **QuizModal**: Handles all modal creation, rendering, and user input. No business logic.
- **FeedbackManager**: Handles all feedback and explanation display. No state or quiz logic.
- **BlockManager**: Handles overlay, website blocking, and event management. No quiz or UI logic.
- **QuizController**: Orchestrates all components, manages quiz flow, and centralizes error handling.

## 3. CSS-First Styling

- **No inline styles in JavaScript.**
- **All UI styling is handled via CSS classes.**
- **Adaptive sizing** (e.g., explanation box) is achieved with CSS, not JS.
- **Use BEM-like or clear class names** for all UI elements.
- **Override styles only in CSS, never in JS.**

## 4. Event-Driven & Callback Patterns

- **Use callbacks for component communication.**
  - Example: `modal.onSubmit = () => controller._handleSubmit();`
  - Example: `blockManager.onCloseInReviewMode = () => controller.endQuiz();`
- **Never directly manipulate another component's state or DOM.**

## 5. Dependency Injection

- **Pass dependencies via constructors.**
  - Example: `new QuizController(supabaseClient)`
- **No hardcoded singletons or global state.**

## 6. Centralized Error Handling

- **All error handling is done in the controller.**
- **Show user-friendly messages via FeedbackManager.**
- **Graceful fallback and recovery for all errors.**

## 7. State Management

- **Single source of truth:** All quiz state is managed in `QuizState`.
- **No state in UI components.**
- **All state transitions are explicit and validated.**

## 8. Adaptive UI Patterns

- **Explanation box and feedback areas are adaptive/minimal by default.**
- **Scrolling and max-height are only applied via CSS when content is long.**
- **No fixed heights or min-heights unless required for accessibility.**

## 9. Testability & Debugging

- **Each component is independently testable.**
- **Development helpers are exposed via `window.debugQuiz` for manual testing.**
- **No hidden side effects or global state.**

## 10. Maintainability & Extensibility

- **Adding new features means adding new components, not modifying existing ones.**
- **All interfaces between components are clear and documented.**
- **All new code must follow these patterns.**

---

## Example: Adding a New Feature

1. **Create a new component** (e.g., `NotificationManager.js`).
2. **Inject it into the controller** (e.g., `this.feedback = new NotificationManager();`).
3. **Add new CSS classes as needed.**
4. **Document the new pattern in this file.**

---

## Summary

- **Never use inline styles in JS.**
- **Never mix state, UI, and business logic.**
- **Always use CSS classes for styling.**
- **Always separate concerns into modules.**
- **Always use callbacks for component communication.**
- **Always centralize error handling.**
- **Always keep state in a single source of truth.**
- **Always make UI adaptive and minimal by default.**
- **Always document new patterns in this file.**

This structure ensures the SAT Quiz Blocker extension remains robust, maintainable, and easy to extend for years to come. 