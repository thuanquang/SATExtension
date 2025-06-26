/**
 * BlockManager - Handles website blocking, overlay, and event management
 * Separates blocking logic from quiz logic
 */
class BlockManager {
  constructor() {
    this.isBlocked = false;
    this.overlay = null;
    this.modal = null;
    this.isReviewing = false;
    
    // Bind event handlers
    this.boundPreventDefault = this._preventDefault.bind(this);
    this.boundHandleWheel = this._handleWheel.bind(this);
    
    // Callbacks
    this.onCloseInReviewMode = null;
  }

  block() {
    if (this.isBlocked) return;
    
    console.log('🔒 Blocking website...');
    this.isBlocked = true;
    
    // Disable scrolling
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    
    // Add event listeners
    document.addEventListener('click', this.boundPreventDefault, true);
    document.addEventListener('keydown', this.boundPreventDefault, true);
    document.addEventListener('touchmove', this.boundPreventDefault, true);
    document.addEventListener('wheel', this.boundHandleWheel, { capture: true, passive: false });
    
    // Create overlay
    this._createOverlay();
  }

  unblock() {
    if (!this.isBlocked) return;
    
    console.log('🔓 Unblocking website...');
    this.isBlocked = false;
    this.isReviewing = false;

    // Re-enable scrolling
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    // Remove event listeners
    document.removeEventListener('click', this.boundPreventDefault, true);
    document.removeEventListener('keydown', this.boundPreventDefault, true);
    document.removeEventListener('touchmove', this.boundPreventDefault, true);
    document.removeEventListener('wheel', this.boundHandleWheel, { capture: true, passive: false });
    
    // Remove overlay
    this._removeOverlay();
  }

  setModal(modal) {
    this.modal = modal;
  }

  setReviewMode(isReviewing) {
    this.isReviewing = isReviewing;
  }

  getOverlay() {
    return this.overlay;
  }

  isWebsiteBlocked() {
    return this.isBlocked;
  }

  _createOverlay() {
    if (this.overlay) return;
    
    this.overlay = document.createElement('div');
    this.overlay.id = 'sat-quiz-overlay';
    this.overlay.className = 'quiz-overlay';
    
    document.body.appendChild(this.overlay);
  }

  _removeOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  _preventDefault(event) {
    // Allow events within the modal
    if (this.modal && this.modal.contains(event.target)) {
      return;
    }

    // Allow clicks on overlay to close quiz in review mode
    if (this.isReviewing && 
        event.type === 'click' && 
        event.target.id === 'sat-quiz-overlay') {
      if (this.onCloseInReviewMode) {
        this.onCloseInReviewMode();
      }
      return;
    }
    
    // Block all other events
    event.preventDefault();
    event.stopPropagation();
  }

  _handleWheel(event) {
    // Allow wheel events within the modal
    if (this.modal && this.modal.contains(document.elementFromPoint(event.clientX, event.clientY))) {
      return;
    }

    // Block wheel events outside the modal
    event.preventDefault();
    event.stopPropagation();
  }

  // Utility methods for testing
  simulateClickOutside() {
    if (this.isReviewing && this.onCloseInReviewMode) {
      this.onCloseInReviewMode();
    }
  }

  getBlockingState() {
    return {
      isBlocked: this.isBlocked,
      isReviewing: this.isReviewing,
      hasOverlay: !!this.overlay,
      hasModal: !!this.modal
    };
  }
} 