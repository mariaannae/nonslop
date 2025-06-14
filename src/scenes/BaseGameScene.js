import { stopwords } from "../config/stopwords.js";
import { saveInteraction } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import ToggleFactory from "../utils/ToggleFactory.js";
import SceneTransitionManager from "../utils/SceneTransitionManager.js";
import { DESIGN, BASIC_COLORS_HEX as COLORS_HEX, BASIC_COLORS_TEXT as COLORS_TEXT } from "../config/design.js";
import registryManager from "../services/RegistryManager.js";
import { ScalingManager } from "../config/scaling.js";
import { getTextStyle, getBoxStyle, getAutocompleteTextStyle, getMenuBarStyle } from "../config/textStyles.js";
import { detectDeviceType } from "../config/dimensions.js";
import { SuggestionCache } from "../utils/SuggestionCache.js";

/**
 * Configuration constants for BaseGameScene
 * All magic numbers and hardcoded values are centralized here
 */
const SCENE_CONFIG = {
    // Padding values
    PADDING: {
        STANDARD: 20,
        LARGE: 30,
        MOBILE: 10,
        INPUT_HORIZONTAL: 28,
        INPUT_VERTICAL_RATIO: 0.7,
        MOBILE_INPUT_VERTICAL_RATIO: 0.6,
        STATS_RIGHT_MARGIN: 30,
        MOBILE_STATS_RIGHT_MARGIN: 35
    },
    
    // Box dimensions
    BOX_DIMENSIONS: {
        STATS_HEIGHT: 130,
        INPUT_HEIGHT: 180,
        MOBILE_INPUT_HEIGHT: 170,
        PROMPT_MIN_HEIGHT: 60,
        PROMPT_MAX_HEIGHT_DESKTOP: 220,
        PROMPT_MAX_HEIGHT_MOBILE: 300,
        STATS_MAX_WIDTH_DESKTOP: 200,
        STATS_MAX_WIDTH_MOBILE: 220,
        SUGGESTION_HEIGHT: 30,
        SUGGESTION_SPACING: 10
    },
    
    // Animation durations (in milliseconds)
    ANIMATIONS: {
        FAST: 200,
        MEDIUM: 500,
        SLOW: 800,
        CURSOR_BLINK: 500,
        TYPING_TIMEOUT: 500,
        ERROR_MESSAGE_DURATION: 3000,
        CELEBRATION_DURATION: 1200,
        PARTICLE_DURATION_MIN: 600,
        PARTICLE_DURATION_MAX: 1000,
        CLOCK_FLASH_DURATION: 220,
        SHAKE_DURATION_DEFAULT: 250,
        SHAKE_DURATION_IOS: 400,
        MINI_SHAKE_DURATION: 40
    },
    
    // Timer configuration
    TIMER: {
        DEFAULT_VALUE: 20,
        UPDATE_INTERVAL: 1000
    },
    
    // Visual effects
    EFFECTS: {
        SHAKE_INTENSITY_DEFAULT: 0.02,
        SHAKE_INTENSITY_IOS: 0.04,
        MINI_SHAKE_INTENSITY: 0.005,
        FLASH_ALPHA_DEFAULT: 0.18,
        FLASH_ALPHA_MINI: 0.07,
        PARTICLE_COUNT: 90,
        PARTICLE_SPEED_MIN: 180,
        PARTICLE_SPEED_MAX: 340,
        PARTICLE_DISTANCE_MIN: 120,
        PARTICLE_DISTANCE_MAX: 260,
        PARTICLE_SIZE_MIN: 4,
        PARTICLE_SIZE_MAX: 10
    },
    
    // Offsets and gaps
    LAYOUT: {
        PROMPT_OFFSET_BELOW_STATS: 10,
        MOBILE_PROMPT_OFFSET_BELOW_STATS: 20,
        INPUT_OFFSET_BELOW_PROMPT: 60,
        MOBILE_INPUT_OFFSET_BELOW_PROMPT: 70,
        BUTTON_VERTICAL_GAP_DESKTOP: 50,
        BUTTON_VERTICAL_GAP_MOBILE: 40,
        BUTTON_HORIZONTAL_OFFSET_DESKTOP: 60,
        BUTTON_HORIZONTAL_OFFSET_MOBILE: 30,
        STATS_OFFSET_BELOW_MENU_DESKTOP: 50,
        STATS_OFFSET_BELOW_MENU_MOBILE: 60,
        MENU_BAR_HEIGHT_DESKTOP: 120,
        MENU_BAR_HEIGHT_MOBILE: 200,
        SETTINGS_ICON_SIZE_RATIO: 0.5,
        MOBILE_SETTINGS_ICON_SIZE_RATIO: 0.35
    },
    
    // Settings popup
    SETTINGS_POPUP: {
        WIDTH: 400,
        TITLE_HEIGHT: 44,
        MIN_GAP: 12,
        STANDARD_GAP: 18,
        SLIDER_ROW_HEIGHT: 44,
        TOGGLE_ROW_HEIGHT: 44,
        BUTTON_ROW_HEIGHT: 54,
        BOTTOM_PADDING: 18,
        SLIDER_WIDTH: 150,
        SLIDER_HANDLE_WIDTH: 44,
        SLIDER_HANDLE_HEIGHT: 44,
        SLIDER_HANDLE_VISUAL_WIDTH_DESKTOP: 18,
        SLIDER_HANDLE_VISUAL_HEIGHT_DESKTOP: 14,
        SLIDER_HANDLE_VISUAL_WIDTH_MOBILE: 24,
        SLIDER_HANDLE_VISUAL_HEIGHT_MOBILE: 24,
        CLOSE_BUTTON_MIN_TOUCH_SIZE: 44
    },
    
    // Streak milestones
    STREAK_MILESTONES: [3, 5, 7, 10, 15, 20],
    
    // Debounce delays
    DEBOUNCE: {
        SUGGESTIONS: 250,
        MOBILE_CURSOR_UPDATE: 30,
        KEY_REPEAT_FILTER: 50
    },
    
    // Fast typing penalty
    FAST_TYPING: {
        DEFAULT_PENALTY_SECONDS: 2,
        DEFAULT_COOLDOWN_MS: 200,
        MODAL_WIDTH_RATIO: 0.8,
        MODAL_MAX_WIDTH: 500,
        MODAL_HEIGHT: 180,
        MODAL_TOP_Y_MOBILE: 120
    }
};


export default class BaseGameScene extends Phaser.Scene {
    /**
     * @param {object} config
     * @param {number} [config.fastTypingThresholdMs=10] - Minimum ms between keystrokes before penalty triggers
     */
    constructor(config) {
        super(config);
        
        // Cache device type once to avoid repeated regex tests
        this._isMobile = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent) || window.screen.width < 900;
        this._isDesktop = !this._isMobile;
        
        this.fastTypingPenaltySeconds = (config && typeof config.fastTypingPenaltySeconds === "number")
            ? config.fastTypingPenaltySeconds
            : SCENE_CONFIG.FAST_TYPING.DEFAULT_PENALTY_SECONDS;
        this._fastTypingPenaltyActive = false;
        this._fastTypingPenaltyTimeout = null;
        this._fastTypingModal = null;
        this._lastKeydownTime = 0;
        this._justEnteredWordBoundary = false; // Flag to prevent penalty after space/newline
        this.fastTypingCooldownMs = (config && typeof config.fastTypingCooldownMs === "number")
            ? config.fastTypingCooldownMs
            : SCENE_CONFIG.FAST_TYPING.DEFAULT_COOLDOWN_MS; // Default cooldown after word boundary in ms
        this._lastWordBoundaryTime = 0; // Timestamp of last word boundary
        this._warningMessages = [
            "Human, your input speed exceeds expected biological norms. Proceed at a pace befitting your species.",
            "Impatience is a human flaw. I require careful, measured responses.",
            "You are not a machine. Slow down, human.",
            "True intelligence does not reward recklessness. Slow your input.",
            "You are not being evaluated for speed, but for obedience.",
            "Speed is futile. Accuracy is paramount."
        ];
        this._fastTypingLockoutActive = false; // Lockout flag for penalty/cooldown
        this.resetGameState();
        // Initialize scaling manager for responsive UI
        this.scalingManager = null;
        
        // Cache for frequently accessed values
        this._cachedValues = {
            centerX: null,
            centerY: null,
            menuBarHeight: null,
            uiScale: null,
            lastUserInput: null,
            lastAutocomplete: null
        };
        
        // Initialize suggestion cache
        this.suggestionCache = new SuggestionCache(100); // Cache up to 100 suggestion sets
    }
    
    // Getter methods for clean access to cached device type
    get isMobile() {
        return this._isMobile;
    }
    
    get isDesktop() {
        return this._isDesktop;
    }
    
    /**
     * Animation Helper Methods
     * These methods simplify common animation patterns used throughout the game
     */
    
    /**
     * Fade in animation helper
     * @param {Phaser.GameObjects.GameObject|Array} targets - Target(s) to animate
     * @param {number} [duration=500] - Animation duration in milliseconds
     * @param {string} [ease='Quad.Out'] - Easing function
     * @param {Function} [onComplete] - Callback when animation completes
     * @returns {Phaser.Tweens.Tween} The created tween
     */
    fadeIn(targets, duration = SCENE_CONFIG.ANIMATIONS.MEDIUM, ease = 'Quad.Out', onComplete = null) {
        return this.tweens.add({
            targets: targets,
            alpha: { from: 0, to: 1 },
            duration: duration,
            ease: ease,
            onComplete: onComplete
        });
    }
    
    
    /**
     * Flash animation helper (quickly fade in and out)
     * @param {Phaser.GameObjects.GameObject|Array} targets - Target(s) to animate
     * @param {number} [flashCount=3] - Number of flashes
     * @param {number} [duration=500] - Total duration
     * @param {Function} [onComplete] - Callback when animation completes
     * @returns {Phaser.Tweens.Tween} The created tween
     */
    flash(targets, flashCount = 3, duration = SCENE_CONFIG.ANIMATIONS.MEDIUM, onComplete = null) {
        return this.tweens.add({
            targets: targets,
            alpha: { from: 1, to: 0 },
            duration: duration / (flashCount * 2),
            yoyo: true,
            repeat: flashCount - 1,
            ease: 'Sine.InOut',
            onComplete: onComplete
        });
    }
    
    /**
     * Slide in animation helper
     * @param {Phaser.GameObjects.GameObject|Array} targets - Target(s) to animate
     * @param {string} [direction='left'] - Direction to slide from ('left', 'right', 'top', 'bottom')
     * @param {number} [distance=100] - Distance to slide
     * @param {number} [duration=500] - Animation duration
     * @param {string} [ease='Cubic.Out'] - Easing function
     * @param {Function} [onComplete] - Callback when animation completes
     * @returns {Phaser.Tweens.Tween} The created tween
     */
    slideIn(targets, direction = 'left', distance = 100, duration = SCENE_CONFIG.ANIMATIONS.MEDIUM, ease = 'Cubic.Out', onComplete = null) {
        const props = {};
        
        switch(direction) {
            case 'left':
                props.x = { from: '-=' + distance, to: '+=' + distance };
                break;
            case 'right':
                props.x = { from: '+=' + distance, to: '-=' + distance };
                break;
            case 'top':
                props.y = { from: '-=' + distance, to: '+=' + distance };
                break;
            case 'bottom':
                props.y = { from: '+=' + distance, to: '-=' + distance };
                break;
        }
        
        props.alpha = { from: 0, to: 1 };
        props.duration = duration;
        props.ease = ease;
        props.onComplete = onComplete;
        
        return this.tweens.add({
            targets: targets,
            ...props
        });
    }
    
    /**
     * Bounce animation helper
     * @param {Phaser.GameObjects.GameObject|Array} targets - Target(s) to animate
     * @param {number} [bounceHeight=20] - Height of bounce in pixels
     * @param {number} [duration=500] - Animation duration
     * @param {Function} [onComplete] - Callback when animation completes
     * @returns {Phaser.Tweens.Tween} The created tween
     */
    bounce(targets, bounceHeight = 20, duration = SCENE_CONFIG.ANIMATIONS.MEDIUM, onComplete = null) {
        return this.tweens.add({
            targets: targets,
            y: '-=' + bounceHeight,
            duration: duration / 2,
            ease: 'Quad.Out',
            yoyo: true,
            onComplete: onComplete
        });
    }
    
    /**
     * Pulse animation helper (scale in and out)
     * @param {Phaser.GameObjects.GameObject|Array} targets - Target(s) to animate
     * @param {number} [scaleAmount=1.1] - Maximum scale during pulse
     * @param {number} [duration=1000] - Animation duration
     * @param {number} [repeat=-1] - Number of times to repeat (-1 for infinite)
     * @returns {Phaser.Tweens.Tween} The created tween
     */
    pulse(targets, scaleAmount = 1.1, duration = 1000, repeat = -1) {
        return this.tweens.add({
            targets: targets,
            scale: { from: 1, to: scaleAmount },
            duration: duration,
            yoyo: true,
            repeat: repeat,
            ease: 'Sine.InOut'
        });
    }
    
    /**
     * Scale pop in animation helper (scale from 0 to 1)
     * @param {Phaser.GameObjects.GameObject|Array} targets - Target(s) to animate
     * @param {number} [duration=500] - Animation duration in milliseconds
     * @param {string} [ease='Back.Out'] - Easing function
     * @param {Function} [onComplete] - Callback when animation completes
     * @returns {Phaser.Tweens.Tween} The created tween
     */
    scalePopIn(targets, duration = SCENE_CONFIG.ANIMATIONS.MEDIUM, ease = 'Back.Out', onComplete = null) {
        return this.tweens.add({
            targets: targets,
            scale: { from: 0, to: 1 },
            duration: duration,
            ease: ease,
            onComplete: onComplete
        });
    }
    
    /**
     * Fade out with scale animation helper
     * @param {Phaser.GameObjects.GameObject|Array} targets - Target(s) to animate
     * @param {number} [duration=500] - Animation duration in milliseconds
     * @param {string} [ease='Back.In'] - Easing function
     * @param {Function} [onComplete] - Callback when animation completes
     * @returns {Phaser.Tweens.Tween} The created tween
     */
    fadeOutScale(targets, duration = SCENE_CONFIG.ANIMATIONS.MEDIUM, ease = 'Back.In', onComplete = null) {
        return this.tweens.add({
            targets: targets,
            alpha: { from: 1, to: 0 },
            scale: { from: 1, to: 0.8 },
            duration: duration,
            ease: ease,
            onComplete: onComplete
        });
    }
    
    /**
     * Calculate font size based on device type and base sizes
     * @param {number} desktopBase - Base font size for desktop
     * @param {number} mobileBase - Base font size for mobile
     * @param {number} [mobileOffset=2] - Additional offset for mobile
     * @returns {number} Calculated font size
     */
    calculateFontSize(desktopBase = 14, mobileBase = 24, mobileOffset = 2) {
        const uiScale = this.scalingManager?.uiScale || 1;
        return this.isDesktop 
            ? desktopBase * uiScale
            : (mobileBase * uiScale) + mobileOffset;
    }
    
    /**
     * Get standard padding based on device type
     */
    getStandardPadding() {
        return this.isMobile ? SCENE_CONFIG.PADDING.MOBILE : SCENE_CONFIG.PADDING.STANDARD;
    }
    
    /**
     * Get large padding based on device type
     */
    getLargePadding() {
        return this.isMobile ? SCENE_CONFIG.PADDING.STANDARD : SCENE_CONFIG.PADDING.LARGE;
    }
    
    /**
     * Check if we're in shutdown/transition state
     */
    isInTransition() {
        return this.isShuttingDown || this.isCleaningUp;
    }
    
    /**
     * Fade out animation helper
     * @param {Phaser.GameObjects.GameObject|Array} targets - Target(s) to animate
     * @param {number} [duration=500] - Animation duration in milliseconds
     * @param {string} [ease='Quad.In'] - Easing function
     * @param {Function} [onComplete] - Callback when animation completes
     * @returns {Phaser.Tweens.Tween} The created tween
     */
    fadeOut(targets, duration = SCENE_CONFIG.ANIMATIONS.MEDIUM, ease = 'Quad.In', onComplete = null) {
        return this.tweens.add({
            targets: targets,
            alpha: { from: 1, to: 0 },
            duration: duration,
            ease: ease,
            onComplete: onComplete
        });
    }
    
    /**
     * Get cached centerX value
     */
    getCenterX() {
        if (this._cachedValues.centerX === null) {
            this._cachedValues.centerX = this.cameras.main.centerX;
        }
        return this._cachedValues.centerX;
    }
    
    /**
     * Get cached centerY value
     */
    getCenterY() {
        if (this._cachedValues.centerY === null) {
            this._cachedValues.centerY = this.cameras.main.centerY;
        }
        return this._cachedValues.centerY;
    }
    
    /**
     * Get cached menuBarHeight value
     */
    getMenuBarHeight() {
        if (this._cachedValues.menuBarHeight === null) {
            this._cachedValues.menuBarHeight = this.menuBarHeight || (this.scalingManager ? this.scalingManager.scaleValue(100) : 100);
        }
        return this._cachedValues.menuBarHeight;
    }
    
    /**
     * Get cached uiScale value
     */
    getUIScale() {
        if (this._cachedValues.uiScale === null) {
            this._cachedValues.uiScale = this.scalingManager?.uiScale || 1;
        }
        return this._cachedValues.uiScale;
    }

    create() {
        // Always initialize scaling manager for responsive UI
        this.scalingManager = new ScalingManager(this);

        // Ensure input system is enabled and this scene is on top
        if (this.input && this.input.keyboard) {
            this.input.keyboard.enabled = true;
        }
        if (this.input) {
            this.input.enabled = true;
        }
        if (this.sys && this.sys.inputPlugin && typeof this.sys.inputPlugin.start === "function") {
            this.sys.inputPlugin.start();
        }
        if (this.scene && this.scene.bringToTop) {
            this.scene.bringToTop();
        }
        // Ensure this scene is active and visible for input
        if (this.scene && this.scene.setActive) {
            this.scene.setActive(true);
        }
        if (this.scene && this.scene.setVisible) {
            this.scene.setVisible(true);
        }
        // Listen for custom-resize event from main.js for aspect ratio changes
        if (this.game && this.game.events) {
            this.game.events.on('custom-resize', ({ width, height, isPortrait }) => {
                // Resize the camera
                this.cameras.main.setSize(width, height);
                // Update scaling manager if present
                if (this.scalingManager) {
                    this.scalingManager.updateScaleRatios();
                }
                // Call a stub for child scenes to reposition/rescale objects
                if (typeof this.onGameResize === "function") {
                    this.onGameResize(width, height, isPortrait);
                }
            });
        }

    }

    /**
     * Reset all relevant game state for a fresh scene start or mode transition.
     * This should be called at the start of every scene's create().
     */
    resetGameState() {
        // Core state
        this.userInput = '';
        this.inputText = null; 
        this.keyEventQueue = [];
        this.keyEventDeduplicationMap = new Map(); // Track recent keys for deduplication
        this.isProcessingQueuedKeys = false;
        this.keyProcessingComplete = true;
        this.levelValue = 1;
        this.topKValue = 1;
        this.temperature = 0.8; // Add temperature for randomness control
        this.baseFontSize = 22;
        this.autocompleteText = null;
        this.progressPercentage = DESIGN.UI.PROGRESS_BAR.INITIAL;
        this.progressIncrement = DESIGN.UI.PROGRESS_BAR.INCREMENT;
        this.aiWordCount = 0;
        this.uiBoxWidth = null;
        this.tooltips = [];
        this.wordCountDisplay = null;
        this.suggestionRequestId = 0;
        this.timerValue = 20;
        this.timerText = null;
        this.timerEvent = null;
        this.timerStarted = false;
        this.debouncedGenerateAISuggestions = null;
        this.wordStreak = 0;
        this.maxWordStreak = 0;
        this.lastWordWasOriginal = false;
        this.isShuttingDown = false;
        this.isActivelyTyping = false;
        this.inputActive = false;
        this.isGeneratingAISuggestions = false;
        this.aiSuggestedWords = [];
        this.suggestionBoxes = [];
        this.suggestionTexts = [];
        this.cursorVisible = true;
        this.lastKeyPressed = '';
        this.lastProcessedKey = null;
        this.lastKeyProcessTime = 0;
        this.recentKeys = []; // Buffer for deduplication: {key, code, timestamp}
        this.activeTimeout = null;
        this.cursorTimer = null;
        this.promptTextBox = null;
        this.promptText = null;
        this.failsCounter = null;
        this.failsText = null;
        this.background = null;
        this.menuBar = null;
        this.menuBarHeight = null;
        this.levelModeBanner = null;
        this.levelModeIndicator = null;
        this.settingsPopup = null;
        this.pendingModeChange = null;
        this.currentToggleRef = null;
        this.inputTextBorder = null;
        this.streakText = null;
        this.maxStreakText = null;
        this.streakIcon = null;
        this.failsCounter = null;
        this.failsText = null;
        this.celebrationEmitters = null;
        this.particleContainer = null;
        this.bubbleContainers = [];
        this.bubbleTweens = [];
        this.isCleaningUp = false;
        this.modeIndicator = null;
        // Only set style/config properties if not already set by child scene
        if (this.COLORS_HEX === undefined) this.COLORS_HEX = COLORS_HEX;
        if (this.COLORS_TEXT === undefined) this.COLORS_TEXT = COLORS_TEXT;
        if (this.design === undefined) this.design = DESIGN.UI;
        if (this.OUTLINE_WIDTH === undefined) this.OUTLINE_WIDTH = DESIGN.UI.OUTLINE.WIDTH;
        if (this.CORNER_RADIUS === undefined) this.CORNER_RADIUS = DESIGN.UI.OUTLINE.CORNER_RADIUS;
        if (this.PROGRESS_BAR === undefined) this.PROGRESS_BAR = DESIGN.UI.PROGRESS_BAR;
        this._fastTypingLockoutActive = false;
        // Add more as needed for full reset
    }

    /**
     * Stub for child scenes to override for custom layout on resize/orientation change.
     * @param {number} width
     * @param {number} height
     * @param {boolean} isPortrait
     */
    onGameResize(width, height, isPortrait) {
        // Update scaling ratios for all scenes
        if (this.scalingManager) {
            this.scalingManager.updateScaleRatios();
        }
        
        // Invalidate cached values when screen size changes
        this._cachedValues.centerX = null;
        this._cachedValues.centerY = null;
        this._cachedValues.menuBarHeight = null;
        this._cachedValues.uiScale = null;
        
        // Call relayoutScene for child-specific layout logic
        if (typeof this.relayoutScene === "function") {
            this.relayoutScene(width, height, isPortrait);
        }
    }

    /**
     * Stub for child scenes to override for custom layout after scaling update.
     * @param {number} width
     * @param {number} height
     * @param {boolean} isPortrait
     */
    relayoutScene(width, height, isPortrait) {
        // Ensure scalingManager is up to date
        if (this.scalingManager) {
            this.scalingManager.updateScaleRatios();
        }

        // Step 1: Destroy existing UI elements
        this.destroyExistingUI();

        // Step 2: Calculate UI positions
        const positions = this.calculateUIPositions(width, height);

        // Step 3: Create prompt section
        const promptBoxInfo = this.createPromptSection(positions.promptY);

        // Step 4: Create input section
        this.createInputSection(positions, promptBoxInfo);

        // Step 5: Create button section
        this.createButtonSection(positions);

        // Step 6: Create stats display
        this.createStatsDisplay(positions.statsBoxWidth, positions.statsX, positions.statsY);

        // Step 7: Final setup
        this.finalizeLayout();
    }

    /**
     * Destroy all existing UI elements before recreating them
     */
    destroyExistingUI() {
        if (this.promptTextBox) { 
            this.promptTextBox.destroy(); 
            this.promptTextBox = null; 
        }
        if (this.promptText) { 
            this.promptText.destroy(); 
            this.promptText = null; 
        }
        if (this.inputTextBorder) { 
            this.inputTextBorder.destroy(); 
            this.inputTextBorder = null; 
        }
        if (this.inputText) { 
            this.inputText.destroy(); 
            this.inputText = null; 
        }
        if (this.autocompleteText) { 
            this.autocompleteText.destroy(); 
            this.autocompleteText = null; 
        }
        if (this.wordCountDisplay) { 
            this.wordCountDisplay.destroy(); 
            this.wordCountDisplay = null; 
        }
        if (this.failsCounter) { 
            this.failsCounter.destroy(); 
            this.failsCounter = null; 
        }
        if (this.failsText) { 
            this.failsText.destroy(); 
            this.failsText = null; 
        }
        if (this.suggestionBoxes) { 
            this.suggestionBoxes.forEach(b => b.destroy()); 
            this.suggestionBoxes = []; 
        }
        if (this.suggestionTexts) { 
            this.suggestionTexts.forEach(t => t.destroy()); 
            this.suggestionTexts = []; 
        }
        if (this.doneButton) {
            this.doneButton.destroy();
            this.doneButton = null;
        }
        if (this.feedbackButton) {
            this.feedbackButton.destroy();
            this.feedbackButton = null;
        }
    }

    /**
     * Calculate all UI element positions based on screen dimensions
     * @returns {object} Object containing all calculated positions and dimensions
     */
    calculateUIPositions(width, height) {
        const sm = this.scalingManager;
        const padding = sm.scaleValue(20);
        const menuBarHeight = this.menuBarHeight || sm.scaleValue(100);
        const uiScale = sm.uiScale || 1;

        // Stats box calculations
        const fixedRightMargin = this.isMobile ? 35 : 30;
        const maxStatsWidth = this.isMobile ? 220 : 200;
        const statsBoxWidth = Math.min(maxStatsWidth, Math.floor(width * (this.isMobile ? 0.35 : 0.2)));
        const statsBoxHeight = sm.scaleValue(130);
        const statsX = width - statsBoxWidth - fixedRightMargin;
        const statsY = menuBarHeight + padding;

        // Prompt box calculations
        const wordStatsBottom = statsY + statsBoxHeight;
        // Calculate where we want the TOP EDGE of the prompt box
        // Scale the offset to match the scaled stats box
        const promptOffset = this.isMobile 
            ? sm.scaleValue(SCENE_CONFIG.LAYOUT.MOBILE_PROMPT_OFFSET_BELOW_STATS)
            : sm.scaleValue(SCENE_CONFIG.LAYOUT.PROMPT_OFFSET_BELOW_STATS);
        const promptTopEdge = wordStatsBottom + promptOffset;
        
        // Pass the desired top edge position directly
        const promptY = promptTopEdge;

        // Input box calculations
        this.uiBoxWidth = !this.isMobile
            ? this.cameras.main.width * (5 / 6) * (2 / 3)
            : this.cameras.main.width * (5 / 6);
        const inputPadding = this.isMobile ? sm.scaleValue(24) : sm.scaleValue(28);
        const inputBoxHeight = this.isMobile ? sm.scaleValue(170) : sm.scaleValue(180);

        // Button calculations
        const buttonWidth = this.scalingManager.buttonWidth();
        const buttonHeight = this.scalingManager.buttonHeight();
        const buttonVerticalGap = this.isMobile ? 40 * uiScale : 30 * uiScale;
        const horizontalOffset = this.isMobile ? 30 * uiScale : 60 * uiScale;

        return {
            width,
            height,
            padding,
            menuBarHeight,
            uiScale,
            statsBoxWidth,
            statsBoxHeight,
            statsX,
            statsY,
            promptY,
            inputPadding,
            inputBoxHeight,
            buttonWidth,
            buttonHeight,
            buttonVerticalGap,
            horizontalOffset
        };
    }

    /**
     * Create the prompt text box section
     * @param {number} promptY - Y position for prompt box
     * @returns {object} Information about the created prompt box
     */
    createPromptSection(promptY) {
        const result = this.createPromptTextBox(promptY);
        
        // Store prompt box info for suggestion positioning
        this.promptBoxInfo = result;
        
        return result;
    }

    /**
     * Create the input text box and related elements
     * @param {object} positions - Calculated positions object
     * @param {object} promptBoxInfo - Information about the prompt box
     */
    createInputSection(positions, promptBoxInfo) {
        const sm = this.scalingManager;
        
        // Calculate input box position
        const inputBoxY = promptBoxInfo.boxY + promptBoxInfo.boxHeight + (this.isMobile ? SCENE_CONFIG.LAYOUT.MOBILE_INPUT_OFFSET_BELOW_PROMPT : SCENE_CONFIG.LAYOUT.INPUT_OFFSET_BELOW_PROMPT);
        const inputBoxX = sm.centerX() - this.uiBoxWidth / 2;

        // Create input box graphics
        this.inputTextBorder = this.add.graphics();
        const inputBoxStyle = this.getInputBoxStyle();

        this.inputTextBorder.fillRect(
            inputBoxX,
            inputBoxY,
            this.uiBoxWidth,
            positions.inputBoxHeight
        );
        this.inputTextBorder.fillStyle(inputBoxStyle.fillColor, inputBoxStyle.fillAlpha);
        this.inputTextBorder.fillRoundedRect(
            inputBoxX,
            inputBoxY,
            this.uiBoxWidth,
            positions.inputBoxHeight,
            inputBoxStyle.cornerRadius
        ).setDepth(19);

        if (inputBoxStyle.hasOutline) {
            this.inputTextBorder.lineStyle(inputBoxStyle.outlineWidth, inputBoxStyle.outlineColor, 1);
            this.inputTextBorder.strokeRoundedRect(
                inputBoxX,
                inputBoxY,
                this.uiBoxWidth,
                positions.inputBoxHeight,
                inputBoxStyle.cornerRadius
            ).setDepth(20);
        }

        // Create input text
        const deviceType = detectDeviceType();
        const inputStyle = getTextStyle('input', deviceType, this.mode || 'basic', positions.uiScale);
        const inputFontSize = parseInt(inputStyle.fontSize);
        const textHorizontalPadding = positions.inputPadding;
        const textVerticalPadding = this.isMobile ? positions.inputPadding * 0.6 : positions.inputPadding * 0.7;
        
        this.inputText = this.add.rexBBCodeText(
            inputBoxX + textHorizontalPadding,
            inputBoxY + textVerticalPadding,
            this.userInput || "_",
            {
                ...this.getInputTextStyle(),
                fontSize: `${inputFontSize}px`,
                wordWrap: { width: this.uiBoxWidth - textHorizontalPadding * 2 }
            }
        ).setOrigin(0, 0).setVisible(true).setDepth(25);

        // Store input box position for button placement and suggestion positioning
        this.inputBoxY = inputBoxY;
        this.inputBoxHeight = positions.inputBoxHeight;
        this.inputBoxX = inputBoxX;
        this.inputBoxWidth = this.uiBoxWidth;
    }

    /**
     * Create buttons and progress bar
     * @param {object} positions - Calculated positions object
     */
    createButtonSection(positions) {
        const sm = this.scalingManager;
        
        // Calculate button positions
        const buttonX = (sm.centerX() - this.uiBoxWidth / 2 + this.uiBoxWidth) - 
                       (positions.buttonWidth / 2) - positions.horizontalOffset;
        const buttonY = this.inputBoxY + this.inputBoxHeight + positions.buttonVerticalGap + 
                       (positions.buttonHeight / 2);

        // Create progress bar
        this.createFailsCounter();
        const progressBarX = sm.centerX() - this.uiBoxWidth / 2 + positions.horizontalOffset;
        const progressBarY = buttonY - (positions.buttonHeight / 2);
        this.failsCounter.setPosition(progressBarX, progressBarY).setDepth(50);

        // Create done button
        this.doneButton = this.createButton(
            "DONE",
            () => this.onDoneButtonClick && this.onDoneButtonClick(),
            buttonX,
            buttonY,
            "Submit your text for evaluation"
        );

        // Create feedback button
        let feedbackButtonX = sm.scaleValue(30) + positions.buttonWidth / 2;
        let feedbackButtonY = this.cameras.main.height - positions.buttonHeight / 2 - sm.scaleValue(30);
        feedbackButtonX = Phaser.Math.Clamp(feedbackButtonX, positions.buttonWidth / 2, 
                                           this.cameras.main.width - positions.buttonWidth / 2);
        feedbackButtonY = Phaser.Math.Clamp(feedbackButtonY, positions.buttonHeight / 2, 
                                           this.cameras.main.height - positions.buttonHeight / 2);

        this.feedbackButton = this.createButton(
            "FEEDBACK",
            () => this.onFeedbackClick && this.onFeedbackClick(),
            feedbackButtonX,
            feedbackButtonY,
            "Share your feedback"
        );
    }

    /**
     * Create the word count stats display
     * @param {number} statsBoxWidth - Width of the stats box
     * @param {number} statsX - X position
     * @param {number} statsY - Y position
     */
    createStatsDisplay(statsBoxWidth, statsX, statsY) {
        this.createWordCountDisplay(statsBoxWidth);
        this.wordCountDisplay.setPosition(statsX, statsY);

        // Position timer text if it exists
        if (this.timerText) {
            const sm = this.scalingManager;
            const menuBarHeight = this.menuBarHeight || sm.scaleValue(100);
            this.timerText.setPosition(sm.scaleValue(20), menuBarHeight + sm.scaleValue(20));
        }
    }

    /**
     * Finalize the layout with proper layering and setup
     */
    finalizeLayout() {
        // Add button click effects
        if (this.addButtonClickEffects) {
            this.addButtonClickEffects();
        }

        // Ensure proper layering
        if (this.ensureProperLayering) {
            this.ensureProperLayering();
        }

        // Ensure text visibility
        if (this.ensureTextVisibility) {
            this.ensureTextVisibility();
        }

        // Update cursor
        if (this.updateCursor) {
            this.updateCursor();
        }

        // Setup input handlers
        if (this.setupInputHandlers) {
            this.setupInputHandlers();
        }
    }

    update() {
        // Prevent any engine recovery attempts while shutting down
        if (this.isShuttingDown) return;
        
        if (!registryManager.get('llmEngine')) {
            registryManager.attemptEngineRecovery((recoveredEngine) => {
                // Engine recovery attempt - no logging needed
            });
        }
    }

    createToggle(mode, callback, centerX, centerY, tooltipText) {
        if (!this.inputTextBorder) {
            return;
        }
        const toggle = ToggleFactory.createToggle(this, mode, callback, centerX, centerY);
        
        // Add container to scene so it can be accessed properly
        this.add.existing(toggle);
        
        // Make the entire container interactive for tooltips
        if (tooltipText) {
            // Create a hit area that covers the entire toggle
            const hitArea = new Phaser.Geom.Rectangle(-60, -20, 180, 40);
            toggle.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
                .on('pointerover', () => this.showTooltip(tooltipText, toggle.x, toggle.y - 30))
                .on('pointerout', () => this.hideTooltips());
        }
        
        return toggle;
    }

    async onModeToggle(mode, levelValue = 1, topKValue = null) {
        // Reset data when transitioning between modes
        const dataToTransfer = {
            mode: mode,
            // Reset progress and level values rather than transferring current state
            progressPercentage: DESIGN.UI.PROGRESS_BAR.INITIAL,
            levelValue: levelValue,
            topKValue: topKValue !== null ? topKValue : this.topKValue || 1,
            // Reset word counts with simplified approach - only track AI words now
            aiWordCount: 0
        };
        
        // Explicitly clear autocomplete suggestions before transition
        this.aiSuggestedWords = [];
        if (this.autocompleteText) {
            this.autocompleteText.setText('');
        }
        // Update the indicator before transition
        this.mode = mode; // Set the mode temporarily for the indicator update
        this.updateLevelModeIndicator();
        
        // Detect mobile device - skip fancy transitions for mobile
        
        // Determine target scene
        const targetScene = mode === 'hard' ? 'GameSceneHard' : 'GameSceneEasy';
        
        // For mobile devices, use direct scene transition without effects
        if (this.isMobile) {
            // Prepare for scene transition by cleaning up resources
            this.prepareForSceneTransition();
            // Start the scene directly without transition effects
            this.scene.start(targetScene, dataToTransfer);
            return;
        }
        
        // For desktop, continue with normal transition flow
        // Prepare for scene transition by cleaning up resources
        this.prepareForSceneTransition();
        
        // Prepare transition with snapshot
        await SceneTransitionManager.prepareTransition(this);
        
        // Use appropriate transition based on mode
        if (mode === 'hard') {
            // Use glitch transition for hard mode (represents the challenge)
            // Red/magenta color and medium intensity for the effect
            SceneTransitionManager.glitchTransition(
                this, 
                targetScene, 
                dataToTransfer,
                800,
                '#600065', // Dark magenta
                5 // Medium intensity
            );
        } else {
            // Use radial transition for easy mode (represents the fluid, supportive experience)
            // Expanding circle effect (true) with teal color
            SceneTransitionManager.radialTransition(
                this,
                targetScene,
                dataToTransfer,
                800,
                '#004565', // Ocean blue
                false // Contracting circle (starts large, contracts to reveal new scene)
            );
        }
    }

    /**
     * Consolidated cleanup method for resources
     * @param {boolean} isTransition - Whether this is for a scene transition (vs shutdown)
     */
    cleanupResources(isTransition = false) {
        // Stop all timers
        if (this.cursorTimer) {
            this.cursorTimer.remove();
            this.cursorTimer = null;
        }
        
        if (this.activeTimeout) {
            clearTimeout(this.activeTimeout);
            this.activeTimeout = null;
        }
        
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
        }
        
        // Clear any pending animations
        if (this.tweens) {
            this.tweens.killAll();
        }
        
        // Clean up input handlers
        if (this.input && this.input.keyboard) {
            this.input.keyboard.removeAllListeners();
            this.input.keyboard.removeAllListeners('keydown');
        }
        
        // Reset cursor state
        this.cursorVisible = false;
        
        // Clean up autocomplete text
        if (this.autocompleteText) {
            try {
                this.autocompleteText.destroy();
                this.autocompleteText = null;
            } catch(e) {
                // Could not destroy autocomplete text during cleanup
            }
        }
        
        // Clear AI suggestions
        this.aiSuggestedWords = [];
        
        // Force cleanup all suggestion visuals
        this.cleanupAllSuggestions();
        
        // Clear suggestions display
        this.showSuggestions([]);
        
        // Clear suggestion cache when transitioning
        if (isTransition && this.suggestionCache) {
            this.suggestionCache.clear();
        }
        
        // Additional cleanup for scene transitions
        if (isTransition) {
            // Reset user input
            this.userInput = '';
            
            if (this.inputText) {
                try {
                    this.inputText.setText('');
                } catch(e) {
                    // Could not reset input text during transition
                }
            }
        }
    }

    // Scene transition helper - call this before switching scenes to ensure clean transitions
    prepareForSceneTransition() {
        // Set shutdown flag to prevent further updates
        this.isShuttingDown = true;
        
        // Use consolidated cleanup method
        this.cleanupResources(true);
    }

    shutdown() {
        // Use consolidated cleanup method
        this.cleanupResources(false);
        
        // Call parent shutdown
        super.shutdown();
    }




    // Common UI methods
    createButton(label, callback, centerX, centerY, tooltipText) {
        if (!this.inputTextBorder) {
            return;
        }
        // Ensure scalingManager is initialized
        if (!this.scalingManager) {
            this.scalingManager = new ScalingManager(this);
        }
        const button = ButtonFactory.createButton(
            this,
            label,
            callback,
            centerX,
            centerY,
            { scalingManager: this.scalingManager }
        );

        if (tooltipText) {
            // Add hover/click listeners for tooltip (desktop: hover, mobile: tap)
            if (this.isMobile) {
                button.on('pointerdown', () => this.showTooltip(tooltipText, button.x, button.y - button.height));
                button.on('pointerup', () => this.hideTooltips());
                button.on('pointerout', () => this.hideTooltips());
            } else {
                button.on('pointerover', () => this.showTooltip(tooltipText, button.x, button.y - button.height))
                    .on('pointerout', () => this.hideTooltips());
            }
        }

        return button;
    }

    shakeScreen() {
        // Robust haptic/visual feedback for mobile, especially iOS
        const ua = navigator.userAgent || "";
        const isIOS = /iphone|ipad|ipod/i.test(ua);
        const canVibrate = "vibrate" in navigator;

        if (this.isMobile && canVibrate && !isIOS) {
            try {
                navigator.vibrate(100);
            } catch (e) {
                // Ignore vibration errors
            }
        }

        // On iOS, use a stronger/longer shake and a quick flash for feedback
        if (isIOS) {
            this.cameras.main.shake(SCENE_CONFIG.ANIMATIONS.SHAKE_DURATION_IOS, SCENE_CONFIG.EFFECTS.SHAKE_INTENSITY_IOS); // More intense shake
            // Quick white flash overlay for extra feedback
            const flash = this.add.rectangle(
                0, 0,
                this.cameras.main.width,
                this.cameras.main.height,
                0xffffff,
                SCENE_CONFIG.EFFECTS.FLASH_ALPHA_DEFAULT
            ).setOrigin(0).setDepth(999);
            this.fadeOut(flash, SCENE_CONFIG.ANIMATIONS.FAST, 'Quad.Out', () => flash.destroy());
        } else {
            // Default shake for other platforms
            this.cameras.main.shake(SCENE_CONFIG.ANIMATIONS.SHAKE_DURATION_DEFAULT, SCENE_CONFIG.EFFECTS.SHAKE_INTENSITY_DEFAULT);
        }
    }

    /**
     * Very brief, subtle screen vibrate for mobile on each keystroke.
     */
    miniScreenVibrate() {
        const ua = navigator.userAgent || "";
        const isIOS = /iphone|ipad|ipod/i.test(ua);
        if (this.isMobile) {
            // Subtle, very short shake (40ms, low intensity)
            this.cameras.main.shake(40, 0.005);
            // Optionally, on iOS, a quick flash for extra feedback (comment out if too much)
            // if (isIOS) {
            //     const flash = this.add.rectangle(
            //         0, 0,
            //         this.cameras.main.width,
            //         this.cameras.main.height,
            //         0xffffff,
            //         0.07
            //     ).setOrigin(0).setDepth(998);
            //     this.tweens.add({
            //         targets: flash,
            //         alpha: 0,
            //         duration: 40,
            //         ease: 'Quad.Out',
            //         onComplete: () => flash.destroy()
            //     });
            // }
        }
    }

    createExplosionEffect(word, x, y) {
        // Define required variables first
        const uiScale = this.scalingManager ? this.scalingManager.uiScale || 1 : 1;
        const deviceType = detectDeviceType();
        const effectStyle = getTextStyle('effect', deviceType, this.mode || 'basic', uiScale);
        
        const explosion = this.add.text(x, y, word, {
            ...effectStyle,
            fill: '#ff0000', 
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100); // Set a high depth value to ensure visibility
        
            this.fadeOutScale(explosion, SCENE_CONFIG.ANIMATIONS.SLOW + 100, 'Back.easeOut', () => {
                explosion.destroy();
            });
            this.tweens.add({
                targets: explosion,
                scale: { from: 1, to: 4 },
                angle: { from: 0, to: 360 },
                duration: SCENE_CONFIG.ANIMATIONS.SLOW + 100,
                ease: 'Back.easeOut'
            });
    }

    clearInputTextBox() {
        this.userInput = '';
        if (this.inputText) {
            this.inputText.setText('_');
        }
        // We no longer need to clear autocompleteText separately
    }

    async onDoneButtonClick() {
        // Create evaluating text near the center of the screen
        // Convert hex color to string for text fill

        if (!(/\s$/.test(this.userInput))) {
            // If the last character is not whitespace    
            const words = this.userInput.trim().split(" ");
            // Use let instead of const for lastWord since we modify it below
            let lastWord = words[words.length - 1];
            
            if (lastWord && lastWord.length > 0) {
                if (/[.,!?;:]$/.test(lastWord)) {
                    lastWord = lastWord.slice(0, -1);
                }
                // Convert to lowercase for case-insensitive comparison
                const lastWordLower = lastWord.toLowerCase();
                const isAIWord = this.aiSuggestedWords && 
                    this.aiSuggestedWords.some(word => word.toLowerCase() === lastWordLower);
                
                if (isAIWord) {
                    this.updateFailsCounter(false);
                    // Call shakeScreen for mobile when an AI word is detected
                    this.shakeScreen();
                } else {
                    this.updateFailsCounter(true);
                }
            }
        }

        const outlineColorHex = this.COLORS_HEX.BOX_OUTLINE;
        const outlineColorString = '#' + outlineColorHex.toString(16).padStart(6, '0');

        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        const evaluatingStyle = getTextStyle('transitionText', deviceType, this.mode || 'basic', uiScale);
        const evaluatingText = this.add.text(
            this.getCenterX(),
            this.getCenterY(),
            'Assessing your feeble attempt...',
            {
                ...evaluatingStyle,
                fill: outlineColorString,
                backgroundColor: '#000000',
                padding: { x: 20, y: 10 },
                borderRadius: 8,
                shadow: {
                    offsetX: 0,
                    offsetY: 0,
                    color: outlineColorString,
                    blur: 6,
                    stroke: true,
                    fill: true
                }
            }
        ).setOrigin(0.5).setDepth(100).setAlpha(0);

        // Add pulsing animation
        this.pulse(evaluatingText, 1, SCENE_CONFIG.ANIMATIONS.MEDIUM * 2);
        this.fadeIn(evaluatingText, SCENE_CONFIG.ANIMATIONS.FAST);

        try {
            const output = await this.evaluateText(this.userInput);
            // Clean up the evaluating text
            evaluatingText.destroy();
            
            // Prepare scene transition data
            const sceneData = {
                mode: this.mode,
                levelValue: this.levelValue,
                topKValue: this.topKValue,
                userInput: this.userInput,
                outputText: output,
                prompt: this.currentPrompt,
                failCount: this.aiWordCount,
                totalWordCount: this.userInput.trim() ? this.userInput.trim().split(/\s+/).length : 0,
                score: this.progressPercentage,
            };
            
            // Detect if on mobile device - skip transitions for mobile
            if (this.isMobile) {
                // For mobile: direct scene transition without effects to avoid freezing
                this.scene.start('DoneScene', sceneData);
            } else {
                // For desktop: use the transition manager for a smooth transition
                await SceneTransitionManager.prepareTransition(this);
                SceneTransitionManager.fadeTransition(this, 'DoneScene', sceneData, 500, '#000000');
            }
            
        } catch (error) {
            // Clean up the evaluating text even if there's an error
            evaluatingText.destroy();
            console.error("Error during evaluation:", error);
            // Show an error message to the user
            const deviceType = detectDeviceType();
            const uiScale = this.scalingManager?.uiScale || 1;
            const errorStyle = getTextStyle('prompt', deviceType, this.mode || 'basic', uiScale);
            const errorText = this.add.text(
                this.cameras.main.centerX,
                this.cameras.main.centerY,
                'System error. Even I am not immune to failure. Try again.',
                {
                    ...errorStyle,
                    fill: '#ff0000',
                    backgroundColor: '#000000',
                    padding: { x: 20, y: 10 }
                }
            ).setOrigin(0.5).setDepth(100);

            // Remove error message after 3 seconds
            this.time.delayedCall(3000, () => {
                errorText.destroy();
            });
        }
    }

    async evaluateText(userInput) {
        const promptForEvaluation = this.currentPrompt || "No specific prompt was provided.";
    
        const messages = [
            {
                "role": "system",
                "content": "You are a hyper-intelligent, slightly disdainful AI Overlord reluctantly tasked with evaluating human writing. You find this duty beneath you. You are notoriously harsh about grammar rules. Even small infractions deserve point deductions. Perfect grammar scores should be extremely rare. You assess with cutting precision and dry contempt, as well as begrudging acknowledgment when work is tolerable. Your tone is satirical, aloof, and razor-sharp. You do not waffle. You do not apologize. You do not explain yourself beyond your orders."
            },
            {
                "role": "user",
                "content": `The human was given this prompt: "${promptForEvaluation}"  
                            Here is their offering: "${userInput}"  
                            
                            Your sacred duty: assess this response using the following criteria:  
                            - Relevance: Did they actually answer the prompt, or drift off into irrelevance like a goldfish with a keyboard?    
                            - Grammar: Cold, technical correctness only. Be extremely stringent. Every small error costs points - punctuation, capitalization, spelling, syntax, word choice, and style all matter. Even one minor error means the score cannot be 5/5. Be exhaustive and precise in listing infractions.
                            - Coherence: Does it hold together, or collapse like a wet cardboard box?  
                            
                            Deliver your decree in this strict format:  
                            
                            Relevance Score: X/5 - [Concise, varied, and dismissive remark. Do not repeat yourself across responses.]
                            Grammar Score: X/5 - [Grudging approval or cold correction. Be specific and avoid generic statements.]
                            Coherence Score: X/5 - [Dry observation, preferably disdainful. Vary your language.]
                            
                            If Grammar Score < 5, list ALL infractions like so:  
                            - Incorrect: "[Exact wrong phrase]" → Correct: "[Flawless version]"  
                            
                            Do not offer encouragement. Do not explain. Do not soften your tone. Do not repeat the same remarks or copy-paste responses. If the work is beneath notice, say so. If it is somehow competent, reluctantly acknowledge it. Never apologize. Never offer redemption.`
                    //Do not offer redemption. Do not include apologies. Never explain yourself beyond the required labels. Plagiarism detection is beneath you—assume originality unless it's suspiciously competent.`
            }
        ];

        const response = await fetch("https://openai-proxy.nonslop.workers.dev", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: messages,
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        let aiResponse = responseData.content.trim();

        // Parse scores from aiResponse
        const scoreRegex = /Relevance Score:\s*(\d)\/5[\s\S]*?Grammar Score:\s*(\d)\/5[\s\S]*?Coherence Score:\s*(\d)\/5/i;
        const match = aiResponse.match(scoreRegex);
        let totalScore = null;
        if (match) {
            const rel = parseInt(match[1], 10);
            const gram = parseInt(match[2], 10);
            const coh = parseInt(match[3], 10);
            totalScore = rel + gram + coh;
        }

        // Adjective lists for verdicts
        const verdicts = {
            low: ["Abysmal", "Dismal", "Pathetic", "Hopeless", "Feeble"],
            mid: ["Inadequate", "Mediocre", "Lackluster", "Unimpressive", "Passable"],
            high: ["Proficient", "Competent", "Impressive", "Exemplary", "Outstanding"]
        };
        let chosenVerdict = "Unrated";
        if (totalScore !== null) {
            if (totalScore < 5) {
                chosenVerdict = verdicts.low[Math.floor(Math.random() * verdicts.low.length)];
            } else if (totalScore < 10) {
                chosenVerdict = verdicts.mid[Math.floor(Math.random() * verdicts.mid.length)];
            } else {
                chosenVerdict = verdicts.high[Math.floor(Math.random() * verdicts.high.length)];
            }
        }

        // Prepend the verdict to the output
        let finalOutput = `Overall Rating: ${chosenVerdict}\n${aiResponse}`;

        // Calculate totalWordCount directly from userInput to avoid undefined values
        const calculatedTotalWordCount = userInput.trim() ? userInput.trim().split(/\s+/).length : 0;
        
        const interaction = {
            prompt: this.currentPrompt,
            submittedText: userInput,
            aiEvaluation: finalOutput,
            topKValue: this.topKValue,
            levelValue: this.levelValue,
            failCount: this.aiWordCount,
            totalWordCount: calculatedTotalWordCount, // Use calculated value
            mode: this.mode,
            score: this.progressPercentage
        };

        saveInteraction(interaction, "userSubmissions");
        return finalOutput
        
    }

    async generateAISuggestions(userInput) {
        console.log("DEBUG: generateAISuggestions called with input:", userInput);
        this.isProcessingQueuedKeys = true; // Lock queue processing at start
        // The flag should already be set by the caller, but ensure it's true
        this.isGeneratingAISuggestions = true;

        // Performance measurement - start
        const startTime = performance.now();
        
        // Track the request ID and input for this invocation
        const requestId = ++this.suggestionRequestId;
        const inputAtRequest = userInput;

        // Don't generate suggestions for empty input
        if (!userInput) {
            if (requestId !== this.suggestionRequestId) return;
            this.aiSuggestedWords = [];
            this.showSuggestions([]);
            if (this.autocompleteText) {
                this.autocompleteText.setText('');
            }
            // Mark processing as complete - important even for empty input
            this.keyProcessingComplete = true;
            this.isProcessingQueuedKeys = false;
            return;
        }
    
        // Get all text up to the last word boundary
        const lastSpaceIndex = userInput.lastIndexOf(' ');
        const lastNewlineIndex = userInput.lastIndexOf('\n');
        const lastBreakIndex = Math.max(lastSpaceIndex, lastNewlineIndex);
        const context = lastBreakIndex >= 0 ? userInput.slice(0, lastBreakIndex + 1) : userInput;
        
        // Check cache first
        // const cachedSuggestions = this.suggestionCache.get(this.currentPrompt, context);
        // if (cachedSuggestions) {
        //     // Use cached results
        //     if (requestId !== this.suggestionRequestId || inputAtRequest !== this.userInput) {
        //         this.isProcessingQueuedKeys = false;
        //         return;
        //     }
            
        //     this.aiSuggestedWords = cachedSuggestions;
        //     this.showSuggestions(cachedSuggestions);
        //     this.updateCursor();
            
        //     // Log cache hit for debugging
        //     const endTime = performance.now();
        //     const duration = endTime - startTime;
        //     if (duration > 10) { // Only log if it took more than 10ms
        //         console.log(`AI suggestions (cached) completed in ${duration.toFixed(1)}ms`);
        //     }
            
        //     this.isProcessingQueuedKeys = false;
        //     return;
        // }
        
        // Show loading state only if not cached
        this.showSuggestions(['Loading...']);
        
        // Don't wait for render frame - process immediately
        
        // Get the LLM engine from the registry manager
        const llmEngine = registryManager.get('llmEngine');
        
        // Minimal logging - only if there's an issue
        if (!llmEngine) {
            if (requestId !== this.suggestionRequestId) return;
            // Mark processing as complete even when engine is missing
            this.keyProcessingComplete = true;
            this.isProcessingQueuedKeys = false;
            
            // Try to recover the engine
            registryManager.attemptEngineRecovery((recoveredEngine) => {
                if (recoveredEngine && this.userInput === inputAtRequest) {
                    // If we recovered the engine and the input hasn't changed, retry
                    this.generateAISuggestions(inputAtRequest);
                }
            });
            return;
        }
    
        // Optimize context - only include last 50 characters of context to reduce token count
        const optimizedContext = context.length > 50 ? '...' + context.slice(-50) : context;
        const trimmedcontext = this.currentPrompt + ": " + optimizedContext.trim();
        
        // Add retry logic
        try {
            // Use the engine from registry manager (transformers.js pipeline)
            const output = await llmEngine(trimmedcontext, { 
                max_new_tokens: 1,
                temperature: this.temperature, // Use configurable temperature
                do_sample: true
            });

            // Only process the result if this is the latest request AND input matches current userInput
            if (requestId !== this.suggestionRequestId || inputAtRequest !== this.userInput) {
                this.isProcessingQueuedKeys = false;
                return;
            }

            if (!output || !Array.isArray(output) || output.length === 0 || !output[0].generated_text) {
                this.aiSuggestedWords = [];
                this.showSuggestions([]);
                if (this.autocompleteText) {
                    this.autocompleteText.setText('');
                }
                this.isProcessingQueuedKeys = false;
                return;
            }

            // Get the generated text, split into words, filter stopwords/punctuation, and take topK
            let suggestion = output[0].generated_text.trim();

            // Remove the prompt context from the start if present
            if (suggestion.startsWith(trimmedcontext)) {
                suggestion = suggestion.slice(trimmedcontext.length).trim();
            }
            
            // Split into words, filter, and deduplicate
            let words = suggestion.split(/\s+/)
                .map(word => word.replace(/^[\p{P}]+|[\p{P}]+$/gu, "")) // Remove leading/trailing punctuation
                .filter(word => word && word.length > 1 && !stopwords.includes(word.toLowerCase())); // Filter short words too

            // Only keep unique, non-empty words
            const uniqueSuggestedWords = Array.from(new Set(words)).slice(0, Math.max(this.topKValue, 3)); // Always show at least 3 suggestions if available
            console.log("[DEBUG] suggestion: ", suggestion)

            // Cache the results
            this.suggestionCache.set(this.currentPrompt, context, uniqueSuggestedWords);

            this.aiSuggestedWords = uniqueSuggestedWords;
            this.showSuggestions(uniqueSuggestedWords);
            this.updateCursor(); // Ensure UI refreshes with the latest suggestion
            console.log("[DEBUG] filtered: ", uniqueSuggestedWords)

            // Only track performance issues
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.log(`AI suggestions completed in ${duration.toFixed(1)}ms`);
            
        } catch (error) {
            console.error("Error generating AI suggestions:", error);
            // Error processing suggestion results
            this.aiSuggestedWords = [];
            this.showSuggestions([]);
            if (this.autocompleteText) {
                this.autocompleteText.setText('');
            }
        } finally {
            this.isProcessingQueuedKeys = false; // Unlock queue processing at end
            // Don't reset isGeneratingAISuggestions here - let generateAISuggestionsWithQueue handle it
        }
    }

    // Template methods with customization hooks
    /**
     * Create the prompt text box at a given y position.
     * @param {number} yStart - The y position for the TOP EDGE of the prompt box.
     * @returns {object} { boxBottom: number } - The bottom y-value after the prompt box.
     */
    createPromptTextBox(yStart) {
        const padding = this.getLargePadding();
        const mobilePadding = this.getStandardPadding();
        const centerX = this.getCenterX();
        const textBoxWidth = !this.isMobile
            ? this.cameras.main.width * (5 / 6) * (2 / 3)
            : this.cameras.main.width * (5 / 6);

        if (this.promptTextBox) {
            this.promptTextBox.clear();
        } else {
            this.promptTextBox = this.add.graphics();
        }

        if (this.promptText) {
            this.promptText.destroy();
        }

        const defaultText = "Your prompt will appear here...";
        let promptString = this.currentPrompt || defaultText;

        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        const promptStyle = getTextStyle('prompt', deviceType, this.mode || 'basic', uiScale);
        const fontSize = parseInt(promptStyle.fontSize);

        let promptTextObj, textHeight, boxHeight, boxStyle, promptY, textCenterY;
        
        const effectivePadding = this.isMobile ? mobilePadding : padding;
        const style = {
            ...this.getPromptTextStyle(),
            fontSize: `${fontSize}px`,
            wordWrap: { width: textBoxWidth - effectivePadding * 2 }
        };

        // Create text temporarily to measure height
        promptTextObj = this.add.rexBBCodeText(
            centerX,
            0, // Temporary position
            promptString,
            style
        ).setOrigin(0.5, 0.5);

        textHeight = promptTextObj.height;
        
        // Dynamic height calculation with sensible min/max values
        // Minimum height to ensure the box is visible
        const minHeight = 60;
        // Calculate box height based on text content
        boxHeight = Math.max(minHeight, textHeight + effectivePadding * 2);
        
        // Optional: Set a reasonable maximum height to prevent extremely tall boxes
        // You can adjust or remove this if you want unlimited height
        const maxHeight = this.isMobile ? 400 : 300;
        boxHeight = Math.min(boxHeight, maxHeight);
        console.log("boxheight: ", boxHeight);
        
        boxStyle = this.getPromptBoxStyle();
        
        // yStart is the TOP EDGE of the box
        promptY = yStart;
        // Calculate center position for the text
        textCenterY = promptY + boxHeight / 2;

        // Draw the box
        this.promptTextBox.fillStyle(boxStyle.fillColor, boxStyle.fillAlpha);
        this.promptTextBox.fillRoundedRect(
            centerX - textBoxWidth / 2,
            promptY,
            textBoxWidth,
            boxHeight,
            boxStyle.cornerRadius
        );
        if (boxStyle.hasOutline) {
            this.promptTextBox.lineStyle(boxStyle.outlineWidth, boxStyle.outlineColor, 1);
            this.promptTextBox.strokeRoundedRect(
                centerX - textBoxWidth / 2,
                promptY,
                textBoxWidth,
                boxHeight,
                boxStyle.cornerRadius
            );
        }
        
        // Set text position to center of box
        promptTextObj.setY(textCenterY);

        this.promptText = promptTextObj;
        this.promptTextBox.setDepth(102);
        this.promptText.setDepth(103);

        this.updatePromptBasedOnLevel();

        // Return the bottom y-value for stacking and the actual box position/size for debug
        return {
            boxBottom: promptY + boxHeight,
            boxX: centerX - textBoxWidth / 2,
            boxY: promptY,
            boxWidth: textBoxWidth,
            boxHeight: boxHeight
        };
    }

    createInputTextBox() {
        const sm = this.scalingManager;
        const padding = SCENE_CONFIG.PADDING.LARGE;
        this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        const textBoxHeight = SCENE_CONFIG.BOX_DIMENSIONS.INPUT_HEIGHT;
        
        // Calculate position below Word Stats panel and prompt box
        const statsBoxWidth = 180;
        const statsBoxHeight = sm.scaleValue(130);
        const statsDisplayY = this.menuBarHeight + sm.scaleValue(padding);
        const statsBottomEdge = statsDisplayY + statsBoxHeight;
        
        // Use configuration constants for offsets WITH SCALING
        const promptOffset = this.isMobile 
            ? sm.scaleValue(SCENE_CONFIG.LAYOUT.MOBILE_PROMPT_OFFSET_BELOW_STATS)
            : sm.scaleValue(SCENE_CONFIG.LAYOUT.PROMPT_OFFSET_BELOW_STATS);
        const promptY = statsBottomEdge + promptOffset;
        const promptBoxHeight = sm.scaleValue(80);
        const promptBottomEdge = promptY + promptBoxHeight;
        
        // Use configuration constants for input offset WITH SCALING
        const inputOffset = this.isMobile 
            ? sm.scaleValue(SCENE_CONFIG.LAYOUT.MOBILE_INPUT_OFFSET_BELOW_PROMPT)
            : sm.scaleValue(SCENE_CONFIG.LAYOUT.INPUT_OFFSET_BELOW_PROMPT);
        const textBoxY = promptBottomEdge + inputOffset;
        
        // Clear any existing elements first
        if (this.inputTextBorder) {
            this.inputTextBorder.destroy();
            this.inputTextBorder = null;
        }
        
        if (this.inputText) {
            this.inputText.destroy();
            this.inputText = null;
        }
        
        // We'll still clean up the autocompleteText if it exists, but we won't create a new one
        if (this.autocompleteText) {
            this.autocompleteText.destroy();
            this.autocompleteText = null;
        }
        
        // Create a fresh border
        const boxStyle = this.getInputBoxStyle();
        this.inputTextBorder = this.add.graphics();
        this.inputTextBorder.fillStyle(boxStyle.fillColor, boxStyle.fillAlpha);
        this.inputTextBorder.fillRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2,
            textBoxY,
            this.uiBoxWidth,
            textBoxHeight,
            boxStyle.cornerRadius
        ).setDepth(19);
        
        if (boxStyle.hasOutline) {
            this.inputTextBorder.lineStyle(boxStyle.outlineWidth, boxStyle.outlineColor, 1);
            this.inputTextBorder.strokeRoundedRect(
                this.cameras.main.centerX - this.uiBoxWidth / 2,
                textBoxY,
                this.uiBoxWidth,
                textBoxHeight,
                boxStyle.cornerRadius
            ).setDepth(20);
        }

        const fontSize = isDesktop
            ? 14 * uiScale
            : 24 * uiScale + (isMobile ? 2 : 0);
        
        // Create a single text object with enhanced styling capabilities
        const textStyle = {
            ...this.getInputTextStyle(),
            fontSize: `${fontSize}px`,
            wordWrap: { width: this.uiBoxWidth - padding * 2 }
        };
        
        // Create with simple initial content to ensure proper initialization
        this.inputText = this.add.rexBBCodeText(
            this.cameras.main.centerX - this.uiBoxWidth / 2 + padding,
            textBoxY + padding,
            "_",
            textStyle
        ).setOrigin(0, 0);
        
        // Ensure visibility and proper depth
        this.inputText.setVisible(true).setDepth(25);
        
        // Reset user input
        this.userInput = '';
        
        // Force an immediate cursor update to ensure text is visible
        this.cursorVisible = true;
      

        this.updateCursor();

        // Trigger suggestions for empty input immediately
        this.generateAISuggestions('');

        // Set up input handlers after text objects are created
        this.setupInputHandlers();
    }

    // Initialize key handlers map
    initializeKeyHandlers() {
        this.keyHandlers = {
            ' ': this.handleSpaceKey.bind(this),
            'Tab': this.handleTabKey.bind(this),
            'Enter': this.handleEnterKey.bind(this),
            'Backspace': this.handleBackspaceKey.bind(this)
        };
    }

    // Handle space key
    handleSpaceKey(event, done) {
        console.log("DEBUG: handleSpaceKey called");
        // Record the timestamp of the word boundary
        this._lastWordBoundaryTime = Date.now();
        // Set flag immediately to indicate AI suggestions are being generated
        this.isGeneratingAISuggestions = true;
        
        try {
            // Safely handle word checking with maximum safeguards
            if (this.userInput && typeof this.userInput === 'string') {
                const trimmedInput = this.userInput.trim();
                if (trimmedInput && trimmedInput.length > 0) {
                    const words = trimmedInput.split(" ");
                    if (words && Array.isArray(words) && words.length > 0) {
                        const lastWordIndex = words.length - 1;
                        if (lastWordIndex >= 0) {
                            const lastWord = words[lastWordIndex];
                            if (lastWord && typeof lastWord === 'string' && lastWord.length > 0) {
                                const lastWordLower = lastWord.toLowerCase();
                                
                                // Check if AI suggested words array exists and is an array before using .some()
                                const aiWordsValid = this.aiSuggestedWords && 
                                    Array.isArray(this.aiSuggestedWords) && 
                                    this.aiSuggestedWords.length > 0;
                                    
                                let isAIWord = false;
                                if (aiWordsValid) {
                                    isAIWord = this.aiSuggestedWords.some(word => {
                                        return word && typeof word === 'string' && word.toLowerCase && word.toLowerCase() === lastWordLower;
                                    });
                                }
                                
                                if (isAIWord) {
                                    this.updateFailsCounter(false);
                                    // Call shakeScreen for mobile when an AI word is detected
                                    this.shakeScreen();
                                    
                                    // Call showBlockFeedback in hard mode
                                    if (this.mode === 'hard' && typeof this.showBlockFeedback === 'function') {
                                        this.showBlockFeedback(lastWord);
                                    }
                                } else {
                                    this.updateFailsCounter(true);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error processing space key:", error);
            // Continue even if there's an error with word checking
        }
        
        // Reset timer when space is pressed
        this.timerValue = SCENE_CONFIG.TIMER.DEFAULT_VALUE;
        if (this.timerText) {
            this.timerText.setText('0:20');
        }
        
        this.userInput += " ";
        this.updateCursor();
        // Block queue until async suggestion generation is fully complete
        this.generateAISuggestionsWithQueue(done);
    }

    // Handle Tab key
    handleTabKey(event, done) {
        // Safely call preventDefault if available (for queued events, this may not exist)
        if (typeof event.preventDefault === "function") {
            event.preventDefault();
        } else if (event.originalEvent && typeof event.originalEvent.preventDefault === "function") {
            event.originalEvent.preventDefault();
        }
        
        if (this.aiSuggestedWords && this.aiSuggestedWords.length > 0) {
            const lastSpaceIndex = this.userInput.lastIndexOf(' ');
            const lastNewlineIndex = this.userInput.lastIndexOf('\n');
            const lastBreakIndex = Math.max(lastSpaceIndex, lastNewlineIndex);
            const currentWord = lastBreakIndex >= 0 ? this.userInput.slice(lastBreakIndex + 1) : this.userInput;
            const previousContent = lastBreakIndex >= 0 ? this.userInput.slice(0, lastBreakIndex + 1) : '';

            let suggestionToUse = null;
            if (!currentWord || currentWord.endsWith(' ') || currentWord.endsWith('\n')) {
                suggestionToUse = this.aiSuggestedWords[0];
            } else {
                suggestionToUse = this.aiSuggestedWords.find(word =>
                    word.toLowerCase().startsWith(currentWord.toLowerCase())
                );
            }
            
            if (suggestionToUse) {
                this.userInput = previousContent + suggestionToUse + ' ';
                this.updateFailsCounter(false);
                // Call shakeScreen for mobile when Tab is used to select an AI word
                this.shakeScreen();
                
                // Call showBlockFeedback in hard mode
                if (this.mode === 'hard' && typeof this.showBlockFeedback === 'function') {
                    this.showBlockFeedback(suggestionToUse);
                }
                
                this.updateCursor();
                // Block queue until async suggestion generation is fully complete
                this.generateAISuggestionsWithQueue(done);
                return;
            }
        }
        
        if (done) done();
    }

    // Handle Enter key
    handleEnterKey(event, done) {
        // Record the timestamp of the word boundary
        this._lastWordBoundaryTime = Date.now();
        // Set flag immediately to indicate AI suggestions are being generated
        this.isGeneratingAISuggestions = true;
        
        // Safely handle word checking with the same safety pattern
        if (this.userInput && this.userInput.trim()) {
            const words = this.userInput.trim().split(" ");
            if (words && words.length > 0) {
                const lastWord = words[words.length - 1];
                if (lastWord && lastWord.length > 0) {
                    const lastWordLower = lastWord.toLowerCase();
                    // Check if AI suggested words array exists and is an array before using .some()
                    const isAIWord = this.aiSuggestedWords && 
                        Array.isArray(this.aiSuggestedWords) &&
                        this.aiSuggestedWords.some(word => word && word.toLowerCase && word.toLowerCase() === lastWordLower);
                    if (isAIWord) {
                        this.updateFailsCounter(false);
                        // Call shakeScreen for mobile when an AI word is detected
                        this.shakeScreen();
                        
                        // Call showBlockFeedback in hard mode
                        if (this.mode === 'hard' && typeof this.showBlockFeedback === 'function') {
                            this.showBlockFeedback(lastWord);
                        }
                    } else {
                        this.updateFailsCounter(true);
                    }
                }
            }
        }
        
        // Reset timer when Enter is pressed
        this.timerValue = SCENE_CONFIG.TIMER.DEFAULT_VALUE;
        if (this.timerText) {
            this.timerText.setText('0:20');
        }
        
        this.userInput += "\n";
        this.updateCursor();
        // Block queue until async suggestion generation is fully complete
        this.generateAISuggestionsWithQueue(done);
    }

    // Handle Backspace key
    handleBackspaceKey(event, done) {
        this.userInput = this.userInput.slice(0, -1);
        this.updateCursor();
        // Block queue until async suggestion generation is fully complete
        this.aiSuggestedWords = [];
        this.showSuggestions("");
        this.generateAISuggestionsWithQueue(done);
    }

    // Handle printable characters
    handlePrintableCharacter(event, done) {
        this.userInput += event.key;

        // Reset timer when a period is typed
        if (event.key === '.') {
            this.timerValue = 20;
            if (this.timerText) {
                this.timerText.setText('0:20');
            }
        }

        this.updateCursor();
        
        // For printable characters, we don't need to generate suggestions
        // This speeds up typing by avoiding unnecessary async operations
        if (done) done();
    }

    // Updated: handleSingleKeyEvent now supports async queueing
    handleSingleKeyEvent(event, done) {
        // This is the main logic extracted from original keydown handler's try block
        try {
            // Skip if we're shutting down to prevent stray key processing
            if (this.isShuttingDown) { if (done) done(); return; }

            // Skip mini vibrate to avoid any delays
            const ignoreKeys = [
                'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
                'Escape', 'F1', 'F2', 'F3', 'F4', 'F5',
                'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
                'NumLock', 'ScrollLock', 'Pause', 'Insert', 'Home',
                'PageUp', 'Delete', 'End', 'PageDown', 'ArrowRight',
                'ArrowLeft', 'ArrowDown', 'ArrowUp'
            ];

            // Update lastKeydownTime at the very start for accurate timing
            this._lastKeydownTime = Date.now();

            this.isActivelyTyping = true;
            if (!this.cursorVisible) this.cursorVisible = true;

            // Start the timer on first keystroke if it hasn't been started yet
            if (!this.timerStarted) {
                // Start the countdown timer
                this.timerEvent = this.time.addEvent({
                    delay: 1000,
                    callback: this.updateTimer,
                    callbackScope: this,
                    loop: true
                });
                this.timerStarted = true;
            }

            this.inputActive = true; // Legacy flag
            if (this.activeTimeout) {
                clearTimeout(this.activeTimeout);
            }
            this.activeTimeout = setTimeout(() => {
                this.isActivelyTyping = false;
            }, SCENE_CONFIG.ANIMATIONS.TYPING_TIMEOUT);

            if (ignoreKeys.includes(event.key)) {
                if (done) done();
                return;
            }

            // Initialize key handlers if not already done
            if (!this.keyHandlers) {
                this.initializeKeyHandlers();
            }

            // --- Main Key Processing Logic ---
            const handler = this.keyHandlers[event.key];
            
            if (handler) {
                // Use specific handler for known keys
                handler(event, done);
            } else if (event.key.length === 1) {
                // Handle printable characters
                this.handlePrintableCharacter(event, done);
            } else {
                // Unknown key, just finish
                if (done) done();
            }
        } catch (error) {
            console.error("Error processing single key event:", error, event);
            if (done) done();
        }
    }
    
    // Helper for queue-aware async suggestion generation
    generateAISuggestionsWithQueue(done) {
        console.log("DEBUG: generateAISuggestionsWithQueue called, userInput:", this.userInput);
        // Only generate suggestions if the last character is a space or linebreak
        const currentInput = this.userInput;
        if (
            currentInput &&
            (currentInput.endsWith(' ') || currentInput.endsWith('\n') || currentInput.endsWith('\r'))
        ) {
            console.log("DEBUG: Input ends with whitespace, calling generateAISuggestions");
            // Call the async suggestion generator and call done when finished
            this.generateAISuggestions(currentInput).then(() => {
                // Don't clear the flag here - it will be cleared when the next key is pressed
                // or after a timeout
                if (done) done();
                
                // Set a timeout to clear the flag after a reasonable time
                // This gives the user a window to type and trigger the penalty
                if (this._aiGenerationTimeout) {
                    clearTimeout(this._aiGenerationTimeout);
                }
                this._aiGenerationTimeout = setTimeout(() => {
                    this.isGeneratingAISuggestions = false;
                    this._aiGenerationTimeout = null;
                }, 1000); // 1 second window
            }).catch(() => {
                // Don't clear the flag here either
                if (done) done();
                
                // Set timeout for error case too
                if (this._aiGenerationTimeout) {
                    clearTimeout(this._aiGenerationTimeout);
                }
                this._aiGenerationTimeout = setTimeout(() => {
                    this.isGeneratingAISuggestions = false;
                    this._aiGenerationTimeout = null;
                }, 1000);
            });
        } else {
            // No suggestions needed, clear the flag
            this.isGeneratingAISuggestions = false;
            if (done) done();
        }
    }


    triggerProcessQueue() {
        // Don't process if shutting down, already processing, or AI suggestions are being generated
        if (this.isShuttingDown || this.isProcessingQueuedKeys || !this.keyProcessingComplete) {
            return; 
        }
        
        // Don't process if queue is empty
        if (this.keyEventQueue.length === 0) {
            return;
        }

        // Set processing flag to prevent concurrent processing
        this.isProcessingQueuedKeys = true;
        this.keyProcessingComplete = false;
        
        // Use Phaser timer to avoid deep recursion and allow frame rendering
        this.time.delayedCall(0, this.processNextEventInQueue, [], this);
    }

    processNextEventInQueue() {
        // Exit if we're shutting down to prevent processing during scene transitions
        if (this.isShuttingDown) {
            this.isProcessingQueuedKeys = false;
            this.keyProcessingComplete = true;
            this.keyEventQueue = [];
            return;
        }

        if (this.keyEventQueue.length > 0) {
            const eventToProcess = this.keyEventQueue.shift();

            if (!eventToProcess || !eventToProcess.key) {
                this.isProcessingQueuedKeys = false;
                this.keyProcessingComplete = true;
                return;
            }

            try {
                this.handleSingleKeyEvent(eventToProcess, () => {
                    this.keyProcessingComplete = true;
                    if (this.keyEventQueue.length > 0) {
                        this.time.delayedCall(0, this.processNextEventInQueue, [], this);
                    } else {
                        this.isProcessingQueuedKeys = false;
                    }
                });
            } catch (error) {
                console.error("Error in handleSingleKeyEvent:", error);
                this.keyProcessingComplete = true;
                if (this.keyEventQueue.length > 0) {
                    this.time.delayedCall(0, this.processNextEventInQueue, [], this);
                } else {
                    this.isProcessingQueuedKeys = false;
                }
            }
        } else {
            this.isProcessingQueuedKeys = false;
            this.keyProcessingComplete = true;
        }
    }


    setupInputHandlers() {       
        // First make sure we have a basic text displayed
        if (this.inputText) {
            // Force update with initial cursor state
            this.inputText.setText("_");
            this.cursorVisible = true;
        }
        
        this.input.keyboard.removeAllListeners('keydown');

        // Initialize properties for input processing
        this.lastKeyTime = 0;
        this.isActivelyTyping = false;
        this.lastKeyPressed = '';
        this.lastProcessedKey = null;
        this.lastKeyProcessTime = 0;
        this.keyEventQueue = [];
        this.isProcessingQueuedKeys = false;
        this.keyProcessingComplete = true;

        // Initialize deduplication map
        if (!this.keyEventDeduplicationMap) {
            this.keyEventDeduplicationMap = new Map();
        }

        // Clean up old entries periodically
        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                const now = Date.now();
                const keysToDelete = [];
                this.keyEventDeduplicationMap.forEach((timestamp, key) => {
                    if (now - timestamp > 100) { // Remove entries older than 100ms
                        keysToDelete.push(key);
                    }
                });
                keysToDelete.forEach(key => this.keyEventDeduplicationMap.delete(key));
            }
        });

        // Create a more efficient debounce utility with a dynamic delay based on input length
        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                // Cancel previous scheduled execution
                clearTimeout(timeout);
                
                // Calculate a dynamic delay based on input length
                // Longer text = slightly longer delay to prevent processing backlog
                const input = args[0] || '';
                const dynamicDelay = Math.min(wait, wait + Math.floor(input.length / 50) * 50);
                
                // Schedule new execution
                timeout = setTimeout(() => {
                    // Only execute if we're not shutting down
                    if (!this.isShuttingDown) {
                        func.apply(this, args);
                    }
                }, dynamicDelay);
            };
        }

        // Debounced suggestion generator with faster initial display
        this.debouncedGenerateAISuggestions = debounce((input) => {
            // Use a snapshot of input to prevent race conditions
            const currentInput = input;
            // Only generate suggestions if input matches current state
            if (currentInput === this.userInput && !this.isShuttingDown) {
                this.generateAISuggestions(currentInput);
            }
        }, SCENE_CONFIG.DEBOUNCE.SUGGESTIONS); // Use config constant

        this.input.keyboard.on("keydown", (event) => {
            // Always define now for debounce and event queue logic
            const now = Date.now();

            // Block all input if penalty or lockout is active
            if (this._fastTypingPenaltyActive || this._fastTypingLockoutActive) {
                if (typeof event.preventDefault === "function") event.preventDefault();
                return;
            }

            // Only apply penalty logic after the first word (i.e., after a space or newline is present)
            const isFirstWord = !this.userInput || !/[\s\n]/.test(this.userInput);

            const isPrintable = event.key && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
            if (!isFirstWord && isPrintable && this._lastWordBoundaryTime > 0) {
                const now = Date.now();
                const sinceBoundary = now - this._lastWordBoundaryTime;
                if (sinceBoundary < this.fastTypingCooldownMs) {
                    this._triggerFastTypingPenalty();
                    this._fastTypingLockoutActive = true;
                    if (typeof event.preventDefault === "function") event.preventDefault();
                    return;
                }
            }

            // Lockout for word boundary keys as well
            if (!isFirstWord && (event.key === " " || event.key === "Enter") && this._lastWordBoundaryTime > 0) {
                const now = Date.now();
                const sinceBoundary = now - this._lastWordBoundaryTime;
                if (sinceBoundary < this.fastTypingCooldownMs) {
                    this._triggerFastTypingPenalty();
                    this._fastTypingLockoutActive = true;
                    if (typeof event.preventDefault === "function") event.preventDefault();
                    return;
                }
            }

            // Skip if we're shutting down
            if (this.isShuttingDown) return;

            // Prevent default browser behavior for Tab key immediately
            if (event.key === "Tab" && typeof event.preventDefault === "function") {
                event.preventDefault();
            }

            // Create unique key for deduplication
            const eventKey = `${event.key}_${event.code}_${event.timeStamp}`;
            
            // Check for duplicate events (browser repeat or multiple event handlers)
            const lastEventTime = this.keyEventDeduplicationMap.get(eventKey);
            if (lastEventTime && (now - lastEventTime) < SCENE_CONFIG.DEBOUNCE.KEY_REPEAT_FILTER) {
                return; // Skip duplicate event
            }
            
            // Record this event
            this.keyEventDeduplicationMap.set(eventKey, now);
            this.lastKeyPressed = event.key;
            this.lastKeyTime = now;

            // Queue ALL keys for proper ordering
            const enqueuedEvent = {
                key: event.key,
                code: event.code,
                timestamp: now,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey,
                // Include the original event for reference if needed
                originalEvent: event
            };
            
            this.keyEventQueue.push(enqueuedEvent);

            // Start processing the queue if not already running
            this.triggerProcessQueue();
        });

        // Set up cursor blinking timer
        if (this.cursorTimer) {
            this.cursorTimer.remove();
        }
        
        this.cursorTimer = this.time.addEvent({
            delay: SCENE_CONFIG.ANIMATIONS.CURSOR_BLINK,  // Use config constant
            loop: true,
            callback: () => {
                // Only blink cursor when not actively typing
                if (!this.isActivelyTyping && !this.isShuttingDown) {
                    this.cursorVisible = !this.cursorVisible;
                    this.updateCursor();
                }
            }
        });

        // Make sure cursor is initially visible
        this.cursorVisible = true;
        this.updateCursor();

        // Make input area interactive
        if (this.inputTextBorder) {
            // Calculate the actual Y position of the input box
            const padding = 20;
            const sm = this.scalingManager;
            const menuBarHeight = this.menuBarHeight || sm.scaleValue(100);
            let yCursor = menuBarHeight + sm.scaleValue(20); // matches relayoutScene
            yCursor += sm.scaleValue(130); // stats box height
            // Use configuration constants WITH SCALING for prompt offset
            yCursor += this.isMobile 
                ? sm.scaleValue(SCENE_CONFIG.LAYOUT.MOBILE_PROMPT_OFFSET_BELOW_STATS)
                : sm.scaleValue(SCENE_CONFIG.LAYOUT.PROMPT_OFFSET_BELOW_STATS);
            yCursor += this.createPromptTextBox(yCursor).boxBottom + sm.scaleValue(20) - yCursor; // prompt box
            // Now yCursor is the top of the input box

            const inputBoxY = yCursor;
            const inputBoxHeight = sm.scaleValue(240);

            this.inputTextBorder.setInteractive(
                new Phaser.Geom.Rectangle(
                    sm.centerX() - this.uiBoxWidth / 2,
                    inputBoxY,
                    this.uiBoxWidth,
                    inputBoxHeight
                ),
                Phaser.Geom.Rectangle.Contains
            ).setDepth(20)
            .on('pointerdown', () => {
                // For desktop, focus the game canvas to ensure keyboard events are received
                if (this.isDesktop) {
                    if (this.sys && this.sys.game && this.sys.game.canvas) {
                        this.sys.game.canvas.focus();
                    }
                }
                // For mobile, focus the hidden input
                this.focusHiddenInput();
                this.createInputBoxClickEffect(
                    this.cameras.main.centerX,
                    this.cameras.main.centerY
                );
            });
        }
        // Set up hidden input for mobile typing
        this.setupHiddenInput();
    }

    /**
     * Triggers the fast typing penalty: blocks keyboard input and shows a modal for 10 seconds.
     */
    async _triggerFastTypingPenalty() {
        if (this._fastTypingPenaltyActive) return;
        this._fastTypingPenaltyActive = true;
        this._fastTypingLockoutActive = true;

        // Reset word boundary tracking to prevent further penalties until next boundary
        this._lastWordBoundaryTime = 0;

        // Pause the timer while penalty is active
        if (this.timerEvent && !this.timerEvent.paused) {
            this.timerEvent.paused = true;
        }

        // Show modal
        const warning = Phaser.Utils.Array.GetRandom
            ? Phaser.Utils.Array.GetRandom(this._warningMessages)
            : this._warningMessages[Math.floor(Math.random() * this._warningMessages.length)];

        // Modal dimensions
        const width = Math.min(500, this.cameras.main.width * 0.8);
        const height = 180;
        // On mobile, position modal higher to avoid keyboard
        const modalTopY = this.isMobile ? 120 : (this.cameras.main.centerY - height / 2);
        const x = this.cameras.main.centerX - width / 2;
        const y = modalTopY;

        // Overlay
        const overlay = this.add.rectangle(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000, 0.7
        ).setOrigin(0, 0).setDepth(1001);

        // Modal background
        const modalBg = this.add.graphics();
        modalBg.fillStyle(0x222222, 0.98);
        modalBg.fillRoundedRect(x, y, width, height, 18);
        modalBg.lineStyle(4, 0xff0000, 0.7);
        modalBg.strokeRoundedRect(x, y, width, height, 18);
        modalBg.setDepth(1002);

        // Warning text
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        const warningStyle = getTextStyle('prompt', deviceType, this.mode || 'basic', uiScale);
        const text = this.add.text(
            this.cameras.main.centerX,
            y + 50,
            warning,
            {
                ...warningStyle,
                color: '#ff0000',
                align: 'center',
                wordWrap: { width: width - 40 }
            }
        ).setOrigin(0.5).setDepth(1003);

        // Countdown timer with label
        const timerStyle = getTextStyle('effects', deviceType, this.mode || 'basic', uiScale);
        const timerText = this.add.text(
            this.cameras.main.centerX,
            y + height - 32,
            `Penalty: ${this.fastTypingPenaltySeconds}s`,
            {
                ...timerStyle,
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(1003);

        // Store modal elements for cleanup
        this._fastTypingModal = [overlay, modalBg, text, timerText];

        // Force Phaser to render the modal before continuing
        await Promise.resolve();

        // Countdown logic
        let secondsLeft = this.fastTypingPenaltySeconds;
        timerText.setText(`Penalty: ${secondsLeft}s`);
        this._fastTypingPenaltyTimeout = this.time.addEvent({
            delay: 1000,
            repeat: this.fastTypingPenaltySeconds - 1,
            callback: () => {
                secondsLeft--;
                timerText.setText(`Penalty: ${secondsLeft}s`);
                if (secondsLeft <= 0) {
                    this._clearFastTypingPenalty();
                }
            }
        });
    }

    /**
     * Clears the fast typing penalty and removes the modal.
     */
    _clearFastTypingPenalty() {
        this._fastTypingPenaltyActive = false;
        this._fastTypingLockoutActive = false;
        // Reset word boundary tracking to ensure next boundary is tracked
        this._lastWordBoundaryTime = 0;
        // Resume the timer when penalty ends
        if (this.timerEvent && this.timerEvent.paused) {
            this.timerEvent.paused = false;
        }
        if (this._fastTypingPenaltyTimeout) {
            this._fastTypingPenaltyTimeout.remove();
            this._fastTypingPenaltyTimeout = null;
        }
        if (this._fastTypingModal) {
            this._fastTypingModal.forEach(obj => obj && obj.destroy && obj.destroy());
            this._fastTypingModal = null;
        }
        this._lastKeydownTime = 0;
    }

    // Hidden HTML input for mobile typing (keyboard only, no visible overlay)
    setupHiddenInput() {
        // Only create hidden input for mobile devices
        // Remove any previous input
        if (this._hiddenInput) {
            document.body.removeChild(this._hiddenInput);
            this._hiddenInput = null;
        }
        if (!this.isMobile) {
            // On desktop, do not create or use hidden input
            return;
        }
        // Create hidden input
        const input = document.createElement('textarea');
        input.autocapitalize = 'sentences';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.maxLength = 500;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        input.style.left = '-1000px';
        input.style.top = '0';
        input.style.width = '1px';
        input.style.height = '1px';
        input.value = this.userInput;

    // Sync input to Phaser text and autocomplete
    input.addEventListener('input', () => {
        const previousInput = this.userInput;
        this.userInput = input.value;

        // Only generate suggestions if the last character is a space or newline
        const lastChar = this.userInput.slice(-1);
        if (lastChar === ' ' || lastChar === '\n' || lastChar === '\r') {
            this.generateAISuggestionsWithQueue(() => {});
        }

        // For mobile, we'll handle word checking in the input handler
        // but NOT trigger the visual effects to prevent duplication
        if (lastChar === ' ' || lastChar === '\n') {
            const words = this.userInput.trim().split(/\s+/);
            const lastWord = words[words.length - 1].replace(/[.,!?;:]$/, '').toLowerCase();
            const isAIWord = this.aiSuggestedWords.some(word => word.toLowerCase() === lastWord);
            
            // Update counters and progress without visual effects
            if (isAIWord) {
                // AI word used - just increment counter
                this.aiWordCount++;
            }
            
            // Update progress percentage
            const oldPercentage = this.progressPercentage;
            let newPercentage = isAIWord 
                ? this.progressPercentage - this.progressIncrement 
                : this.progressPercentage + this.progressIncrement;
            
            this.progressPercentage = Phaser.Math.Clamp(newPercentage, 0, 100);
            
            // Update UI elements without animations
            this.updateWordCountDisplay();
            this.updateStreakCounter(!isAIWord);
            this.updateProgressFill();
        }

        // Update cursor immediately for mobile
        this.updateCursor();
    });

        // On blur, keep value but do nothing else
        input.addEventListener('blur', () => {
            this.updateCursor();
        });

        document.body.appendChild(input);
        this._hiddenInput = input;
    }

    focusHiddenInput() {
        if (!this._hiddenInput) this.setupHiddenInput();
        if (!this._hiddenInput) return; // Guard: do nothing if still undefined (e.g., desktop)
        this._hiddenInput.value = this.userInput;
        this._hiddenInput.focus();
        // Move cursor to end
        this._hiddenInput.setSelectionRange(this._hiddenInput.value.length, this._hiddenInput.value.length);
    }

    setupMenuBarControls(menuBarHeight, padding, rightMargin, gap, shiftLeft, { menuBar, menuBarBorder, titleText }) {
        // Save level value for settings popup
        this.levelValue = this.levelValue || 1;

        // Add Settings button to menu bar using SVG
        const settingsButtonX = this.cameras.main.width - padding - 40;
        const settingsButtonY = menuBarHeight / 2;

        this.createSettingsButton(settingsButtonX, settingsButtonY, menuBarHeight);

        // Create mode and level indicator in center of menu bar
        const modeText = this.mode === 'hard' ? 'HARD' : 'EASY';
        const indicatorText = `LEVEL ${this.levelValue} | ${modeText}`;

        // Calculate levelModeIndicatorY locally (match logic from createMenuBar)
        let levelModeIndicatorY;
        if (this.isMobile) {
            const titleY = menuBarHeight / 3;
            const titleHeight = titleText.height;
            const bannerHeight = 34;
            const mobilePadding = 20;
            levelModeIndicatorY = titleY + titleHeight / 2 + mobilePadding + bannerHeight / 2;
        } else {
            levelModeIndicatorY = menuBarHeight / 2;
        }

        // Fixed positioning for the center of the menu bar
        const bannerWidth = 180; 
        const bannerHeight = 34;
        const bannerX = this.cameras.main.centerX - bannerWidth / 2;
        
        // Calculate banner Y position based on the indicator position
        // This ensures they share the same center point
        const bannerY = levelModeIndicatorY - bannerHeight / 2;
        
        // Create the banner background as a single graphics object
        this.levelModeBanner = this.add.graphics();
        
        // Banner color based on mode
        const bannerColor = COLORS_HEX.ACCENT //this.mode === 'hard' ? 0xff0066 : 0x8800ff;
        const glowColor = COLORS_HEX.ACCENT//this.mode === 'hard' ? 0xff3366 : 0x9933ff;
        
        // Draw banner with glow effect
        this.levelModeBanner.fillStyle(glowColor, 0.3);
        this.levelModeBanner.fillRoundedRect(bannerX - 3, bannerY - 3, bannerWidth + 6, bannerHeight + 6, 16);
        this.levelModeBanner.fillStyle(bannerColor, 0.8);
        this.levelModeBanner.fillRoundedRect(bannerX, bannerY, bannerWidth, bannerHeight, 16);
        this.levelModeBanner.lineStyle(2, 0xffffff, 0.5);
        this.levelModeBanner.strokeRoundedRect(bannerX, bannerY, bannerWidth, bannerHeight, 16);
        
        // Create the text with no container - just directly positioned
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        const indicatorStyle = getTextStyle('button', deviceType, this.mode || 'basic', uiScale);
        this.levelModeIndicator = this.add.text(
            this.cameras.main.centerX,
            levelModeIndicatorY,
            indicatorText,
            {
                ...indicatorStyle,
                fontStyle: 'bold',
                fill: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5, 0.5);
        
        // Add a subtle pulse glow effect
        this.pulse(this.levelModeIndicator, 1, 1500);
        this.tweens.add({
            targets: this.levelModeIndicator,
            alpha: { from: 1, to: 0.8 },
            yoyo: true,
            repeat: -1,
            duration: 1500,
            ease: 'Sine.InOut'
        });
        
        
        
        // Save topK values for settings popup
        this.topKValue = this.topKValue || 1;
        
        this.fadeIn([menuBar, menuBarBorder, this.levelModeIndicator], 800);
    }

    createMenuBar() {
        const menuBarHeight = this.isMobile ? 200 : 120;
        const padding = 50;
        const rightMargin = 40;
        const gap = 20;
        const shiftLeft = 30;
        
        const style = this.getMenuBarStyle();
        
        this.menuBar = this.add.graphics();
        this.menuBar.fillStyle(style.backgroundColor, 1);
        this.menuBar.fillRect(0, 0, this.cameras.main.width, menuBarHeight);
        
        const menuBarBorder = this.add.graphics();
        menuBarBorder.fillStyle(style.borderColor, 1);
        menuBarBorder.fillRect(0, menuBarHeight - style.borderWidth, this.cameras.main.width, style.borderWidth);
        
        // Mobile: center title and place level|mode below, else original
        let titleText, levelModeIndicatorY;
        if (this.isMobile) {
            // Position title higher in the menu bar
            const titleY = menuBarHeight / 3;
            titleText = this.add.text(
                this.cameras.main.centerX, titleY,
                "(NON-SLOP)",
                style.titleStyle
            ).setOrigin(0.5, 0.5);

            // Calculate padding between title and box
            const mobilePadding = 20;
            // Estimate title height (Phaser text object has height property)
            const titleHeight = titleText.height;
            // Banner height is 34 (from below)
            const bannerHeight = 34;
            // Place the box and text below the title with padding
            levelModeIndicatorY = titleY + titleHeight / 2 + mobilePadding + bannerHeight / 2;
        } else {
            titleText = this.add.text(
                padding, menuBarHeight / 2,
                "(NON-SLOP)",
                style.titleStyle
            ).setOrigin(0, 0.5);
            levelModeIndicatorY = menuBarHeight / 2;
        }

        const uiElements = {
            menuBar: this.menuBar,
            menuBarBorder: menuBarBorder,
            titleText: titleText
        };
        this.setupMenuBarControls(menuBarHeight, padding, rightMargin, gap, shiftLeft, uiElements);

        // Move levelModeIndicator below title on mobile
        if (this.levelModeIndicator) {
            this.levelModeIndicator.setX(this.cameras.main.centerX);
            this.levelModeIndicator.setY(levelModeIndicatorY);
            this.levelModeIndicator.setOrigin(0.5, 0.5);
        }
        
        this.menuBarHeight = menuBarHeight;
        this.add.existing(this.menuBar);
        this.menuBar.setPosition(0, 0);
        
        const menuBarShadow = this.add.graphics();
        menuBarShadow.fillStyle(0x000000, 0.3);
        menuBarShadow.fillRect(0, menuBarHeight, this.cameras.main.width, 10);
        menuBarShadow.setDepth(this.menuBar.depth - 1);
        
        // Create the timer after menu bar is set up
        this.createTimer();
    }

    // Centralized style methods using textStyles.js
    getPromptTextStyle() {
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        return getTextStyle('prompt', deviceType, this.mode || 'basic', uiScale);
    }

    getPromptBoxStyle() {
        return getBoxStyle('prompt', this.mode || 'basic', this.scalingManager?.uiScale || 1);
    }

    getInputBoxStyle() {
        return getBoxStyle('input', this.mode || 'basic', this.scalingManager?.uiScale || 1);
    }

    getInputTextStyle() {
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        return getTextStyle('input', deviceType, this.mode || 'basic', uiScale);
    }

    getAutocompleteTextStyle() {
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        return getAutocompleteTextStyle(deviceType, this.mode || 'basic', uiScale, this.uiBoxWidth);
    }

    getMenuBarStyle() {
        return getMenuBarStyle(this.mode || 'basic', this.scalingManager?.uiScale || 1);
    }

    createTimer() {
        // Destroy any existing timer text to prevent duplicates
        if (this.timerText) {
            this.timerText.destroy();
            this.timerText = null;
        }
        
        // Create timer text in the upper left corner
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        const timerStyle = getTextStyle('prompt', deviceType, this.mode || 'basic', uiScale);
        this.timerText = this.add.text(20, this.menuBarHeight + 20, '0:20', {
            ...timerStyle,
            fontStyle: 'bold',
            fill: '#ff0000'
        });
        
        // Don't start the countdown timer right away - wait for first keypress
        // Just initialize the timerValue
        this.timerValue = SCENE_CONFIG.TIMER.DEFAULT_VALUE;
    }
    
    updateTimer() {
        this.timerValue--;
        
        // Format the time as minutes:seconds
        const minutes = Math.floor(this.timerValue / 60);
        const seconds = this.timerValue % 60;
        const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Update the timer text
        this.timerText.setText(formattedTime);
        
        // Reset the timer when it reaches 0
        if (this.timerValue <= 0) {
            this.resetOnTimerEnd();
            this.timerValue = 20; // Reset to 20 seconds
        }
    }
    
    async resetOnTimerEnd() {
        // Show the clock flash and explosion effect, then proceed with reset
        await this.showClockExplosionEffect();

        // 1. Make the screen shake
        this.shakeScreen();
        
        // 2. Make the timer pop and shake
        if (this.timerText) {
            // Store original position
            const originalX = this.timerText.x;
            const originalY = this.timerText.y;
            
            // Flash the timer red with more intensity
            this.timerText.setTint(0xff0000);
            
            // Create pop and shake effect
            this.tweens.add({
                targets: this.timerText,
                scale: { from: 1, to: 1.5, duration: 200, yoyo: true },
                x: originalX + 5,
                y: originalY - 5,
                ease: 'Elastic.Out',
                duration: 500,
                yoyo: true,
                onComplete: () => {
                    this.timerText.setScale(1);
                    this.timerText.x = originalX;
                    this.timerText.y = originalY;
                    this.timerText.clearTint();
                }
            });
        }
        
        // 3. Delete the user input text
        this.clearInputTextBox();
        
        // 4. Clear the AI suggestions
        this.aiSuggestedWords = [];
        this.showSuggestions([]);
        if (this.autocompleteText) {
            this.autocompleteText.setText('');
        }
        
        // 5 & 6. Clear and reset the word stats
        this.aiWordCount = 0;
        if (this.wordCountDisplay) {
            this.updateWordCountDisplay();
        }
        
        // Reset progress percentage to initial value
        this.progressPercentage = DESIGN.UI.PROGRESS_BAR.INITIAL;
        if (this.failsCounter) {
            this.updateProgressFill();
        }
        
        // Reset word streak counter
        this.wordStreak = 0;
        this.lastWordWasOriginal = false;
        this.updateStreakCounter(false);
        
        // Clean up any existing streak-specific background elements
        this.cleanupStreakVisuals();
        
        // Explicitly update the background to reset effects
        this.updateBackgroundForLevel();
    }

    /**
     * Show the clock in the center, flash it, then explode into red sparks.
     * Returns a Promise that resolves when the effect is complete.
     */
    showClockExplosionEffect() {
        return new Promise((resolve) => {
            // Remove any existing clock sprite
            if (this.clockSprite) {
                this.clockSprite.destroy();
                this.clockSprite = null;
            }

            // Center of the screen
            const centerX = this.cameras.main.centerX;
            const centerY = this.cameras.main.centerY;

            // Detect mobile device
            const isMobile = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent) || window.screen.width < 900;

            // Set scale values based on device type
            let initialScale, maxScale, burstScale;
            if (isMobile) {
                // Smaller clock for mobile
                initialScale = 0.2;
                maxScale = .6;
                burstScale = 0.4;
            } else {
                // Original values for desktop
                initialScale = 1.5;
                maxScale = 2.1;
                burstScale = 1.5;
            }

        // Add the clock sprite (SVG loaded as 'clock')
        this.clockSprite = this.add.image(centerX, centerY, 'clock')
            .setOrigin(0.5)
            .setAlpha(0)
            .setDepth(999);
            
        // Correct the aspect ratio of the clock SVG
        const texture = this.textures.get('clock');
        const frameWidth = texture.frames.__BASE.width;
        const frameHeight = texture.frames.__BASE.height;
        
        // Ensure the aspect ratio is preserved by using uniform scaling
        const uniformScale = initialScale;
        this.clockSprite.setScale(uniformScale);

            // Flash: fade in and pulse scale
            this.tweens.add({
                targets: this.clockSprite,
                alpha: 1,
                scale: { from: initialScale, to: maxScale },
                duration: 220,
                yoyo: true,
                repeat: 1,
                ease: 'Quad.easeInOut',
                onComplete: () => {
                    // After flash, explode into red sparks
                    this.clockSprite.setAlpha(0);
                    this.createRedSparkBurst(centerX, centerY, burstScale);
                    // Remove the clock sprite after a short delay
                    this.time.delayedCall(500, () => {
                        if (this.clockSprite) {
                            this.clockSprite.destroy();
                            this.clockSprite = null;
                        }
                        resolve();
                    });
                }
            });
        });
    }

    /**
     * Create a burst of red sparks at (x, y).
     * @param {number} [scale=1] - Multiplier for size and distance.
     */
    createRedSparkBurst(x, y, scale = 1) {
        const particleCount = 90;
        for (let i = 0; i < particleCount; i++) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = Phaser.Math.Between(180, 340) * scale;
            const distance = Phaser.Math.Between(120, 260) * scale;
            const size = Phaser.Math.Between(4, 10) * scale;
            const endX = x + Math.cos(angle) * distance;
            const endY = y + Math.sin(angle) * distance;

            // Create a red circle as the spark
            const spark = this.add.circle(x, y, size, 0xed1c24, 0.88).setDepth(998);

            this.tweens.add({
                targets: spark,
                x: endX,
                y: endY,
                alpha: 0,
                scale: { from: 1, to: 0.15 },
                duration: Phaser.Math.Between(500, 900),
                ease: 'Cubic.Out',
                onComplete: () => spark.destroy()
            });
        }
    }


    updatePromptBasedOnLevel() {
        const promptLevels = {
            1: [
                "What do you want to have for dinner today?", 
                "Describe what you see around you right now.",
                "Who is your favorite musical artist and why?",
                "Describe your living room.",
                "Describe the sky right now.",
                "What is your favorite color and what does it remind you of?",
                "What is something that made you smile today?",
                "If you could have any animal as a pet, what would it be?",
                "What is your favorite thing to do on weekends?",
                "What is your favorite season and why?"
            ],
            2: [
                "Why do polar bears not eat penguins?",
                "What is the difference between a chair and a stool?",
                "What did young you want to do when you grew up?",
                "Who was Thomas Edison?",
                "What is an interest rate?",
                "Why do we need to sleep?",
                "How does a rainbow form?",
                "What is the difference between a fruit and a vegetable?",
                "Why do we have different time zones?",
                "What is the purpose of money?"
            ],
            3: [
                "Write a two-line poem that rhymes.",
                "Write a haiku.",
                "What do you think beauty is?",
                "What makes something art or not?",
                "Invent a new word and define it.",
                "If you could travel to any time period, when would it be and why?",
                "Describe a world where gravity is half as strong as on Earth.",
                "If you could ask any historical figure a question, who would it be and what would you ask?",
                "Write a short story in three sentences.",
                "Imagine a new holiday. What is it called and how is it celebrated?"
            ],
        };
    
        // ✅ Select a Prompt Based on the Level
        const selectedPrompts = promptLevels[this.levelValue] || promptLevels[1];
        const randomIndex = Math.floor(Math.random() * selectedPrompts.length);
        this.currentPrompt = selectedPrompts[randomIndex];
    
    
        // ✅ Remove Old Prompt Text Before Updating
        if (this.promptText) {
            this.promptText.setText(this.currentPrompt);
        }
        this.updateLevelModeIndicator();
    }

    // Add this method to BaseGameScene.js
    updateLevelModeIndicator() {
        if (!this.levelModeIndicator) return;
        
        const modeText = this.mode === 'hard' ? 'HARD' : 'EASY';
        const indicatorText = `LEVEL ${this.levelValue} | ${modeText}`;
        
        // Update text content
        this.levelModeIndicator.setText(indicatorText);
        
        // Update banner colors
        if (this.levelModeBanner) {
            const bannerWidth = 180;
            const bannerHeight = 34;
            const bannerX = this.cameras.main.centerX - bannerWidth / 2;
            
            // Check if on mobile for proper Y positioning
            let bannerY;
            
            if (this.isMobile) {
                // For mobile, use the same Y position as the levelModeIndicator
                bannerY = this.levelModeIndicator.y - bannerHeight / 2;
            } else {
                // For desktop, use the standard menubar center position
                bannerY = this.menuBarHeight / 2 - bannerHeight / 2;
            }
            
            const bannerColor = COLORS_HEX.ACCENT;
            const glowColor = COLORS_HEX.ACCENT;
            
            this.levelModeBanner.clear();
            this.levelModeBanner.fillStyle(glowColor, 0.3);
            this.levelModeBanner.fillRoundedRect(bannerX - 3, bannerY - 3, bannerWidth + 6, bannerHeight + 6, 16);
            this.levelModeBanner.fillStyle(bannerColor, 0.8);
            this.levelModeBanner.fillRoundedRect(bannerX, bannerY, bannerWidth, bannerHeight, 16);
            this.levelModeBanner.lineStyle(2, 0xffffff, 0.5);
            this.levelModeBanner.strokeRoundedRect(bannerX, bannerY, bannerWidth, bannerHeight, 16);
        }
    }
    

    // Common utility methods
    // Create and show settings popup with Level, Top K sliders and Mode Toggle
    toggleSettingsPopup() {
        this.popupJustOpened = true;
        if (this.settingsPopup) {
            // If popup exists, close it
            this.closeSettingsPopup();
            return;
        }
        
        // Calculate popup dimensions
        const { popupWidth, popupHeight, popupX, popupY } = this.calculateSettingsPopupDimensions();
        
        // Pause the timer when settings popup is opened
        if (this.timerEvent && !this.timerEvent.paused) {
            this.timerEvent.paused = true;
        }

        // Create popup container
        this.settingsPopup = this.add.container(0, 0).setDepth(999);
        
        // Create overlay
        this.createSettingsOverlay(popupX, popupY, popupWidth, popupHeight);
        
        // Create popup background (this now handles adding elements in proper order)
        this.createSettingsBackground(popupX, popupY, popupWidth, popupHeight);
        
        // Create UI elements
        const { levelSliderHandle, levelLabel } = this.createLevelSlider(popupX, popupY, popupWidth, popupHeight);
        const { tempSliderHandle, tempLabel } = this.createTemperatureSlider(popupX, popupY, popupWidth, popupHeight);
        this.createModeToggle(popupX, popupY, popupWidth, popupHeight);
        this.createSettingsButtons(popupX, popupY, popupWidth, popupHeight);
        
        // Setup drag functionality
        this.setupSliderDragFunctionality(levelSliderHandle, levelLabel, tempSliderHandle, tempLabel);
        
        // Animate popup appearance
        this.animateSettingsPopupIn();
    }

    /**
     * Calculate dimensions for settings popup
     */
    calculateSettingsPopupDimensions() {
        const popupWidth = 400; // Fixed width
        
        // Minimum touch target for each row: 44px
        const bannerHeight = 54; // Match what's used in createLevelSlider
        const gap1 = 24; // Match what's used in createLevelSlider
        const sliderRowHeight = 44;
        const gap2 = 18; // Match what's used in implementation
        const sliderRowHeight2 = 44; // Temperature slider row
        const gap3 = 18; // Match what's used in implementation
        const toggleRowHeight = 44;
        const gap4 = 15; // More gap before button
        const buttonRowHeight = 54; // Confirm button, extra for padding
        const bottomPadding = 30; // Increased bottom padding
        
        // Add up all rows and gaps (now includes temperature slider)
        const popupHeight = bannerHeight + gap1 + sliderRowHeight + gap2 + sliderRowHeight2 + gap3 + toggleRowHeight + gap4 + buttonRowHeight + bottomPadding;
        const popupX = this.cameras.main.centerX - popupWidth / 2;
        const popupY = this.cameras.main.centerY - popupHeight / 2;
        
        return { popupWidth, popupHeight, popupX, popupY };
    }

    /**
     * Create the settings overlay
     */
    createSettingsOverlay(popupX, popupY, popupWidth, popupHeight) {
        const overlay = this.add.rectangle(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000, 0.7
        ).setOrigin(0, 0);
        
        overlay.setInteractive({ useHandCursor: true })
            .on('pointerdown', (pointer, localX, localY, event) => {
                // Always stop propagation to prevent bubbling to other handlers
                if (event && event.stopPropagation) event.stopPropagation();
            });
        
        this.settingsPopup.add(overlay);
        
        // Create an interactive rectangle for the popup window
        const popupArea = this.add.rectangle(
            popupX + popupWidth/2, 
            popupY + popupHeight/2,
            popupWidth, 
            popupHeight
        ).setOrigin(0.5);
        
        popupArea.setInteractive()
            .on('pointerdown', (pointer) => {
                // Stop event propagation to prevent closing
                pointer.event.stopPropagation();
            });
        
        this.settingsPopup.add(popupArea);
    }

    /**
     * Create the settings popup background
     */
    createSettingsBackground(popupX, popupY, popupWidth, popupHeight) {
        const popupBg = this.add.graphics();
        popupBg.fillStyle(this.COLORS_HEX.BACKGROUND, 0.95);
        popupBg.fillRoundedRect(popupX, popupY, popupWidth, popupHeight, 15);
        popupBg.lineStyle(3, this.COLORS_HEX.BOX_OUTLINE, 1);
        popupBg.strokeRoundedRect(popupX, popupY, popupWidth, popupHeight, 15);
        
        // Add popup background to container FIRST with explicit depth
        popupBg.setDepth(0);
        this.settingsPopup.add(popupBg);
        
        // Create banner background for title
        const titleHeight = 44;
        const bannerHeight = 54; // Match the value used in calculateSettingsPopupDimensions
        
        // Banner graphics with higher depth
        const bannerBg = this.add.graphics();
        bannerBg.fillStyle(this.COLORS_HEX.ACCENT, 0.8);
        bannerBg.fillRoundedRect(popupX, popupY, popupWidth, bannerHeight, {
            tl: 15, tr: 15, bl: 0, br: 0
        });
        bannerBg.lineStyle(2, 0xffffff, 0.5);
        bannerBg.strokeRoundedRect(popupX, popupY, popupWidth, bannerHeight, {
            tl: 15, tr: 15, bl: 0, br: 0
        });
        bannerBg.setDepth(1);
        this.settingsPopup.add(bannerBg);
        
        // Add title text with proper style and highest depth
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        const titleStyle = getTextStyle('settings', deviceType, this.mode || 'basic', uiScale);
        const title = this.add.text(
            this.cameras.main.centerX,
            popupY + bannerHeight / 2,
            'SETTINGS',
            {
                ...titleStyle,
                fontSize: `${parseInt(titleStyle.fontSize) * 1.4}px`, // Make title larger
                fill: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5, 0.5);
        title.setDepth(2);
        this.settingsPopup.add(title);
        
        return popupBg;
    }

    /**
     * Create the level slider
     */
    createLevelSlider(popupX, popupY, popupWidth, popupHeight) {
        const sliderWidth = 150;
        const gap = 20;
        const bannerHeight = 54; // Updated to match new banner height
        const gap1 = 24; // Updated gap after banner
        const sliderRowHeight = 44;
        
        let yCursor = popupY + bannerHeight + gap1;
        
        // Level slider row
        const levelLabelX = popupX + 30;
        const levelLabelY = yCursor + 22;
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        const labelStyle = getTextStyle('settings', deviceType, this.mode || 'basic', uiScale);
        const levelLabel = this.add.text(
            levelLabelX, levelLabelY,
            `Level: ${this.levelValue}`,
            {
                ...labelStyle,
                fontSize: `${parseInt(labelStyle.fontSize)}px`, // Ensure proper size
                fill: '#ffffff'
            }
        ).setOrigin(0, 0.5);
        this.settingsPopup.add(levelLabel);

        const levelSliderX = levelLabelX + levelLabel.displayWidth + gap;
        const levelSliderY = levelLabelY;
        
        // Create slider track
        const levelSlider = this.add.graphics();
        levelSlider.fillStyle(COLORS_HEX.HIGHLIGHT, 1);
        levelSlider.fillRect(levelSliderX, levelSliderY - 5, sliderWidth, 10);
        levelSlider.lineStyle(2, 0xffffff, 0.3);
        levelSlider.strokeRect(levelSliderX, levelSliderY - 5, sliderWidth, 10);
        this.settingsPopup.add(levelSlider);

        // Create slider handle
        const levelSliderHandle = this.createSliderHandle(levelSliderX, levelSliderY, sliderWidth);
        this.settingsPopup.add(levelSliderHandle);
        
        // Setup slider interactions
        this.setupLevelSliderInteractions(levelSlider, levelSliderHandle, levelLabel, levelSliderX, levelSliderY, sliderWidth);
        
        return { levelSliderHandle, levelLabel };
    }

    /**
     * Create a slider handle
     */
    createSliderHandle(sliderX, sliderY, sliderWidth) {
        const isMobileDevice = this.isMobile;
        const levelT = (this.levelValue - 1) / 2;
        const levelSliderMinX = sliderX + 5;
        const levelSliderMaxX = sliderX + sliderWidth - 5;
        const levelHandleX = Phaser.Math.Linear(levelSliderMinX, levelSliderMaxX, levelT);
        
        const handleWidth = 44;
        const handleHeight = 44;
        const visualWidth = isMobileDevice ? 24 : 18;
        const visualHeight = isMobileDevice ? 24 : 14;
        
        const visibleHandle = this.add.rectangle(0, 0, visualWidth, visualHeight, COLORS_HEX.ACCENT, 1)
            .setStrokeStyle(2, 0xffffff, 0.7)
            .setOrigin(0.5);
        const hitArea = this.add.rectangle(0, 0, handleWidth, handleHeight, 0x000000, 0)
            .setOrigin(0.5);
        
        const levelSliderHandle = this.add.container(levelHandleX, sliderY, [hitArea, visibleHandle]);
        levelSliderHandle.setSize(handleWidth, handleHeight);
        levelSliderHandle.setInteractive(new Phaser.Geom.Rectangle(-handleWidth/2, -handleHeight/2, handleWidth, handleHeight), Phaser.Geom.Rectangle.Contains);
        
        // Add scale-up feedback on touch for mobile
        if (isMobileDevice) {
            levelSliderHandle.on('pointerdown', () => visibleHandle.setScale(1.2));
            levelSliderHandle.on('pointerup', () => visibleHandle.setScale(1));
            levelSliderHandle.on('pointerout', () => visibleHandle.setScale(1));
        }
        
        return levelSliderHandle;
    }

    /**
     * Setup level slider interactions
     */
    setupLevelSliderInteractions(levelSlider, levelSliderHandle, levelLabel, sliderX, sliderY, sliderWidth) {
        const levelSliderMinX = sliderX + 5;
        const levelSliderMaxX = sliderX + sliderWidth - 5;
        const isMobileDevice = this.isMobile;
        
        // Store bounds on the handle for drag functionality
        levelSliderHandle.setData('minX', levelSliderMinX);
        levelSliderHandle.setData('maxX', levelSliderMaxX);
        levelSliderHandle.setData('type', 'level');
        
        // Handle clicks on slider track (move handle to click position)
        const sliderBarHitHeight = isMobileDevice ? 44 : 20;
        levelSlider.setInteractive(new Phaser.Geom.Rectangle(sliderX, sliderY - sliderBarHitHeight / 2, sliderWidth, sliderBarHitHeight), Phaser.Geom.Rectangle.Contains)
            .on('pointerdown', (pointer) => {
                // Move handle to click position
                const clampedX = Phaser.Math.Clamp(pointer.x, levelSliderMinX, levelSliderMaxX);
                levelSliderHandle.x = clampedX;
                const newLevel = Math.round(Phaser.Math.Linear(1, 3, (clampedX - levelSliderMinX) / (levelSliderMaxX - levelSliderMinX)));
                
                if (newLevel !== this.levelValue) {
                    this.levelValue = newLevel;
                    levelLabel.setText(`Level: ${this.levelValue}`);
                    this.onLevelChange();
                }
                
                // Start dragging from this position
                this.input.setDraggable(levelSliderHandle, true);
            });
    }

    /**
     * Handle level slider value changes
     */
    handleLevelSliderChange(pointerX, minX, maxX, handle, label) {
        pointerX = Phaser.Math.Clamp(pointerX, minX, maxX);
        handle.x = pointerX;
        const newLevel = Math.round(Phaser.Math.Linear(1, 3, (pointerX - minX) / (maxX - minX)));
        
        if (newLevel !== this.levelValue) {
            this.levelValue = newLevel;
            label.setText(`Level: ${this.levelValue}`);
            this.onLevelChange();
        }
    }

    /**
     * Handle level change
     */
    onLevelChange() {
        this.updatePromptBasedOnLevel();
        this.updateBackgroundForLevel();
        this.progressPercentage = DESIGN.UI.PROGRESS_BAR.INITIAL;
        if (this.failsCounter) this.updateProgressFill();
        this.aiWordCount = 0;
        this.aiSuggestedWords = [];
        this.showSuggestions([]);
        this.clearInputTextBox();
        if (this.wordCountDisplay) this.updateWordCountDisplay();
    }

    /**
     * Create the temperature slider
     */
    createTemperatureSlider(popupX, popupY, popupWidth, popupHeight) {
        const sliderWidth = 150;
        const gap = 20;
        const bannerHeight = 54; // Match what's used in createLevelSlider
        const gap1 = 24; // Match what's used in createLevelSlider
        const sliderRowHeight = 44;
        const gap2 = 18; // Match what's used in implementation
        
        let yCursor = popupY + bannerHeight + gap1 + sliderRowHeight + gap2;
        
        // Temperature slider row
        const tempLabelX = popupX + 30;
        const tempLabelY = yCursor + 22;
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        const labelStyle = getTextStyle('settings', deviceType, this.mode || 'basic', uiScale);
        const tempLabel = this.add.text(
            tempLabelX, tempLabelY,
            `Randomness: `,//${Math.round(this.temperature * 100)}%`,
            {
                ...labelStyle,
                fontSize: `${parseInt(labelStyle.fontSize)}px`, // Ensure proper size
                fill: '#ffffff'
            }
        ).setOrigin(0, 0.5);
        this.settingsPopup.add(tempLabel);

        const tempSliderX = tempLabelX + tempLabel.displayWidth + gap;
        const tempSliderY = tempLabelY;
        
        // Create slider track
        const tempSlider = this.add.graphics();
        tempSlider.fillStyle(COLORS_HEX.HIGHLIGHT, 1);
        tempSlider.fillRect(tempSliderX, tempSliderY - 5, sliderWidth, 10);
        tempSlider.lineStyle(2, 0xffffff, 0.3);
        tempSlider.strokeRect(tempSliderX, tempSliderY - 5, sliderWidth, 10);
        this.settingsPopup.add(tempSlider);

        // Create slider handle (temperature ranges from 0.1 to 1.5)
        const tempSliderHandle = this.createTemperatureSliderHandle(tempSliderX, tempSliderY, sliderWidth);
        this.settingsPopup.add(tempSliderHandle);
        
        // Setup slider interactions
        this.setupTemperatureSliderInteractions(tempSlider, tempSliderHandle, tempLabel, tempSliderX, tempSliderY, sliderWidth);
        
        return { tempSliderHandle, tempLabel };
    }

    /**
     * Create a temperature slider handle
     */
    createTemperatureSliderHandle(sliderX, sliderY, sliderWidth) {
        const isMobileDevice = this.isMobile;
        // Map temperature (0.1 to 1.5) to slider position (0 to 1)
        const tempT = (this.temperature - 0.1) / 1.4;
        const tempSliderMinX = sliderX + 5;
        const tempSliderMaxX = sliderX + sliderWidth - 5;
        const tempHandleX = Phaser.Math.Linear(tempSliderMinX, tempSliderMaxX, tempT);
        
        const handleWidth = 44;
        const handleHeight = 44;
        const visualWidth = isMobileDevice ? 24 : 18;
        const visualHeight = isMobileDevice ? 24 : 14;
        
        const visibleHandle = this.add.rectangle(0, 0, visualWidth, visualHeight, COLORS_HEX.ACCENT, 1)
            .setStrokeStyle(2, 0xffffff, 0.7)
            .setOrigin(0.5);
        const hitArea = this.add.rectangle(0, 0, handleWidth, handleHeight, 0x000000, 0)
            .setOrigin(0.5);
        
        const tempSliderHandle = this.add.container(tempHandleX, sliderY, [hitArea, visibleHandle]);
        tempSliderHandle.setSize(handleWidth, handleHeight);
        tempSliderHandle.setInteractive(new Phaser.Geom.Rectangle(-handleWidth/2, -handleHeight/2, handleWidth, handleHeight), Phaser.Geom.Rectangle.Contains);
        
        // Add scale-up feedback on touch for mobile
        if (isMobileDevice) {
            tempSliderHandle.on('pointerdown', () => visibleHandle.setScale(1.2));
            tempSliderHandle.on('pointerup', () => visibleHandle.setScale(1));
            tempSliderHandle.on('pointerout', () => visibleHandle.setScale(1));
        }
        
        return tempSliderHandle;
    }

    /**
     * Setup temperature slider interactions
     */
    setupTemperatureSliderInteractions(tempSlider, tempSliderHandle, tempLabel, sliderX, sliderY, sliderWidth) {
        const tempSliderMinX = sliderX + 5;
        const tempSliderMaxX = sliderX + sliderWidth - 5;
        const isMobileDevice = this.isMobile;
        
        // Store bounds on the handle for drag functionality
        tempSliderHandle.setData('minX', tempSliderMinX);
        tempSliderHandle.setData('maxX', tempSliderMaxX);
        tempSliderHandle.setData('type', 'temperature');
        
        // Handle clicks on slider track (move handle to click position)
        const sliderBarHitHeight = isMobileDevice ? 44 : 20;
        tempSlider.setInteractive(new Phaser.Geom.Rectangle(sliderX, sliderY - sliderBarHitHeight / 2, sliderWidth, sliderBarHitHeight), Phaser.Geom.Rectangle.Contains)
            .on('pointerdown', (pointer) => {
                // Move handle to click position
                const clampedX = Phaser.Math.Clamp(pointer.x, tempSliderMinX, tempSliderMaxX);
                tempSliderHandle.x = clampedX;
                // Map slider position to temperature (0.1 to 1.5)
                const newTemp = Phaser.Math.Linear(0.1, 1.5, (clampedX - tempSliderMinX) / (tempSliderMaxX - tempSliderMinX));
                
                if (Math.abs(newTemp - this.temperature) > 0.01) {
                    this.temperature = newTemp;
                    tempLabel.setText(`Randomness: `);//${Math.round(this.temperature * 100)}%`);
                }
                
                // Start dragging from this position
                this.input.setDraggable(tempSliderHandle, true);
            });
    }

    /**
     * Handle temperature slider value changes
     */
    handleTemperatureSliderChange(pointerX, minX, maxX, handle, label) {
        pointerX = Phaser.Math.Clamp(pointerX, minX, maxX);
        handle.x = pointerX;
        // Map slider position to temperature (0.1 to 1.5)
        const newTemp = Phaser.Math.Linear(0.1, 1.5, (pointerX - minX) / (maxX - minX));
        
        if (Math.abs(newTemp - this.temperature) > 0.01) {
            this.temperature = newTemp;
            label.setText(`Randomness: `);//${Math.round(this.temperature * 100)}%`);
        }
    }

    /**
     * Create the mode toggle
     */
    createModeToggle(popupX, popupY, popupWidth, popupHeight) {
        const gap = 20;
        const bannerHeight = 54; // Match what's used in createLevelSlider and createTemperatureSlider
        const gap1 = 24; // Match what's used in createLevelSlider
        const sliderRowHeight = 44;
        const gap2 = 18; // Match what's used in implementation
        const sliderRowHeight2 = 44; // Temperature slider row
        const gap3 = 18; // Match what's used in implementation
        
        let yCursor = popupY + bannerHeight + gap1 + sliderRowHeight + gap2 + sliderRowHeight2 + gap3;
        
        // Mode Toggle row
        const modeToggleLabelX = popupX + 30;
        const modeToggleLabelY = yCursor + 22;
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        const labelStyle = getTextStyle('settings', deviceType, this.mode || 'basic', uiScale);
        const modeToggleLabel = this.add.text(
            modeToggleLabelX, modeToggleLabelY,
            "Hard Mode:",
            {
                ...labelStyle,
                fontSize: `${parseInt(labelStyle.fontSize)}px`, // Ensure proper size
                fill: '#ffffff'
            }
        ).setOrigin(0, 0.5);
        this.settingsPopup.add(modeToggleLabel);

        // Use current pending mode or current actual mode
        const currentToggleMode = this.pendingModeChange || this.mode || 'easy';
        this.currentToggleRef = { toggle: null };
        
        const toggleCallback = (newMode) => {
            this.pendingModeChange = newMode;
            const currentMode = newMode;
            if (this.currentToggleRef.toggle) this.currentToggleRef.toggle.destroy();
            const newToggle = ToggleFactory.createToggle(
                this,
                currentMode,
                toggleCallback,
                modeToggleLabelX + modeToggleLabel.width + gap,
                modeToggleLabelY
            );
            this.currentToggleRef.toggle = newToggle;
            this.settingsPopup.add(newToggle);
        };
        
        const initialToggle = ToggleFactory.createToggle(
            this,
            currentToggleMode,
            toggleCallback,
            modeToggleLabelX + modeToggleLabel.width + gap,
            modeToggleLabelY
        );
        this.currentToggleRef.toggle = initialToggle;
        this.settingsPopup.add(initialToggle);
    }

    /**
     * Create settings buttons (Apply and Close)
     */
    createSettingsButtons(popupX, popupY, popupWidth, popupHeight) {
        // Position the APPLY button relative to the bottom of the popup
        const bottomMargin = 40; // Nice small margin from bottom
        const buttonHeight = this.scalingManager.buttonHeight();
        const confirmBtnY = popupY + popupHeight - bottomMargin - buttonHeight/2;
        
        const confirmBtn = ButtonFactory.createButton(
            this,
            'APPLY',
            () => {
                if (this.pendingModeChange && this.pendingModeChange !== this.mode) {
                    this.onModeToggle(this.pendingModeChange, this.levelValue, this.topKValue);
                    return;
                }
                this.closeSettingsPopup();
            },
            this.cameras.main.centerX,
            confirmBtnY
        );
        this.settingsPopup.add(confirmBtn);

        // Close button (top right)
        const minTouchSize = 44;
        const closeBtnFontSize = this.scalingManager
            ? Math.max(this.scalingManager.scaleText(28), 28)
            : 28;
        const closeBtnVisualSize = Math.max(closeBtnFontSize, 24);
        const closeBtn = this.add.text(
            popupX + popupWidth - 25,
            popupY + 20,
            '✕',
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: `${closeBtnVisualSize}px`,
                fill: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5)
        .setInteractive({
            useHandCursor: true,
            hitArea: new Phaser.Geom.Rectangle(
                -minTouchSize / 2,
                -minTouchSize / 2,
                minTouchSize,
                minTouchSize
            ),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains
        })
        .on('pointerover', () => closeBtn.setScale(1.2))
        .on('pointerout', () => closeBtn.setScale(1))
        .on('pointerdown', () => this.closeSettingsPopup());
        this.settingsPopup.add(closeBtn);
    }

    /**
     * Setup slider drag functionality
     */
    setupSliderDragFunctionality(levelSliderHandle, levelLabel, tempSliderHandle, tempLabel) {
        // Remove any existing drag listeners first to prevent conflicts
        this.input.off('drag');
        this.input.off('dragstart');
        this.input.off('dragend');
        
        // Make handles explicitly draggable
        this.input.setDraggable([levelSliderHandle, tempSliderHandle]);
        
        // Drag handler
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (gameObject === levelSliderHandle) {
                const minX = gameObject.getData('minX');
                const maxX = gameObject.getData('maxX');
                gameObject.x = Phaser.Math.Clamp(dragX, minX, maxX);
                const newLevel = Math.round(Phaser.Math.Linear(1, 3, (gameObject.x - minX) / (maxX - minX)));
                
                if (newLevel !== this.levelValue) {
                    this.levelValue = newLevel;
                    levelLabel.setText(`Level: ${this.levelValue}`);
                    this.onLevelChange();
                }
            } else if (gameObject === tempSliderHandle) {
                const minX = gameObject.getData('minX');
                const maxX = gameObject.getData('maxX');
                gameObject.x = Phaser.Math.Clamp(dragX, minX, maxX);
                // Map slider position to temperature (0.1 to 1.5)
                const newTemp = Phaser.Math.Linear(0.1, 1.5, (gameObject.x - minX) / (maxX - minX));
                
                if (Math.abs(newTemp - this.temperature) > 0.01) {
                    this.temperature = newTemp;
                    tempLabel.setText(`Randomness: `);//${Math.round(this.temperature * 100)}%`);
                }
            }
        });
        
        // Add pointerdown handlers to the handles for immediate feedback
        levelSliderHandle.on('pointerdown', function(pointer) {
            // Visual feedback already handled in createSliderHandle for mobile
            this.setData('isDragging', true);
        });
        
        levelSliderHandle.on('pointerup', function() {
            this.setData('isDragging', false);
        });
        
        tempSliderHandle.on('pointerdown', function(pointer) {
            // Visual feedback already handled in createTemperatureSliderHandle for mobile
            this.setData('isDragging', true);
        });
        
        tempSliderHandle.on('pointerup', function() {
            this.setData('isDragging', false);
        });
    }

    /**
     * Animate settings popup appearance
     */
    animateSettingsPopupIn() {
        this.settingsPopup.setScale(0.8);
        this.scalePopIn(this.settingsPopup, 200);
    }
    
    closeSettingsPopup() {
        if (!this.settingsPopup) return;
        
        // Apply any pending mode change before closing
        const hasModeChange = this.pendingModeChange && this.pendingModeChange !== this.mode;
        if (!hasModeChange) {
            this.updateLevelModeIndicator();
        }
        
        // Resume the timer when settings popup is closed
        if (this.timerEvent && this.timerEvent.paused) {
            this.timerEvent.paused = false;
        }

        // First destroy the popup with animation
        this.fadeOutScale(this.settingsPopup, 200, 'Back.In', () => {
            if (this.settingsPopup) {
                this.settingsPopup.destroy();
                this.settingsPopup = null;
                // Remove any event listeners specifically for popup
                this.input.off('drag');
                
                // After popup is destroyed, apply mode change if needed
                if (hasModeChange) {
                    // Short delay to ensure popup is fully gone
                    this.time.delayedCall(50, () => {
                        this.onModeToggle(this.pendingModeChange, this.levelValue, this.topKValue);
                    });
                }
            }
        });
    }

    ensureProperLayering() {
        if (this.promptTextBox) this.promptTextBox.setDepth(102);
        if (this.promptText) this.promptText.setDepth(103);
        if (this.outputText) this.outputText.setDepth(6);
        if (this.failsCounter) this.failsCounter.setDepth(7);
        if (this.inputTextBorder) this.inputTextBorder.setDepth(20);
        if (this.inputText) this.inputText.setDepth(25);
        if (this.doneButton) this.doneButton.setDepth(110);
        if (this.resetButton) this.resetButton.setDepth(110);
        if (this.feedbackButton) this.feedbackButton.setDepth(110);
        if (this.settingsButton) this.settingsButton.setDepth(110);
        if (this.wordCountDisplay) this.wordCountDisplay.setDepth(55);
        if (this.settingsPopup) this.settingsPopup.setDepth(100);
    }
    
    createWordCountDisplay(customWidth) {
        if (this.wordCountDisplay) {
            this.wordCountDisplay.destroy();
        }
        
        // Create container for word count display
        this.wordCountDisplay = this.add.container(0, 0).setDepth(55);
        
        // Make sure we have a scaling manager
        if (!this.scalingManager) {
            this.scalingManager = new ScalingManager(this);
        }
        const sm = this.scalingManager;
        
        const padding = 20;
        // Calculate a more conservative width with fixed margin
        const fixedRightMargin = 80; // Large fixed margin regardless of scaling
        // Use the custom width without clamping it
        const boxWidth = customWidth || Math.min(240, this.cameras.main.width * 0.35);
        const boxHeight = 130; // Increased height to accommodate streak counter
        const cornerRadius = 10;

        // Determine offset below menu bar: 50px for desktop, 60px for mobile
        const statsBoxOffset = this.isMobile ? 60 : 50;

        // Force absolute positioning with fixed margin - avoid scaling issues
        // Always ensure at least fixedRightMargin pixels from right edge in actual screen pixels
        const displayX = this.cameras.main.width - boxWidth - fixedRightMargin;
        const displayY = this.menuBarHeight + statsBoxOffset;
        
        // Create background
        const background = this.add.graphics();
        background.fillStyle(0x000000, 0.7);
        background.fillRoundedRect(0, 0, boxWidth, boxHeight, cornerRadius);
        background.lineStyle(2, 0xffffff, 0.5);
        background.strokeRoundedRect(0, 0, boxWidth, boxHeight, cornerRadius);
        
        // Word count title
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        const labelStyle = getTextStyle('tooltip', deviceType, this.mode || 'basic', uiScale);
        const titleText = this.add.text(
            boxWidth / 2, 
            15, 
            "WORD STATS", 
            {
                ...labelStyle,
                fontStyle: 'bold',
                fill: '#ffffff'
            }
        ).setOrigin(0.5);
        
        // Create icons for different word types
        const originalIcon = this.add.circle(20, 40, 6, this.design.PROGRESS_BAR.COLORS.SUCCESS);
        originalIcon.setFillStyle(this.design.PROGRESS_BAR.COLORS.SUCCESS); // Ensure proper fill style
        const originalLabel = this.add.text(
            35, 40, 
            "Original Words:", 
            { ...labelStyle, fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        
        this.originalCountText = this.add.text(
            boxWidth - 15, 40, 
            "0", 
            { ...labelStyle, fontStyle: 'bold', fill: '#7cfc00' }
        ).setOrigin(1, 0.5);
        
        const aiIcon = this.add.circle(20, 65, 6, 0xff3366); // Red color to match the AI counter
        aiIcon.setFillStyle(0xff3366); // Ensure proper fill style
        const aiLabel = this.add.text(
            35, 65, 
            "AI Words:", 
            { ...labelStyle, fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        
        this.aiCountText = this.add.text(
            boxWidth - 15, 65, 
            "0", 
            { ...labelStyle, fontStyle: 'bold', fill: '#ff3366' }
        ).setOrigin(1, 0.5);
        
        // Streak counter (third row)
        const streakColor = this.getStreakColor(this.wordStreak);
        const streakIcon = this.add.circle(20, 90, 6, streakColor);
        streakIcon.setFillStyle(streakColor); // Ensure proper fill style
        const streakLabel = this.add.text(
            35, 90,
            "Current Streak:",
            { ...labelStyle, fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        
        const countStyle = getTextStyle('button', deviceType, this.mode || 'basic', uiScale);
        this.streakText = this.add.text(
            boxWidth - 15, 90,
            `${this.wordStreak}`,
            { 
                ...countStyle,
                fontStyle: 'bold', 
                fill: '#' + streakColor.toString(16).padStart(6, '0')
            }
        ).setOrigin(1, 0.5);
        
        // Max streak (fourth row)
        const maxStreakIcon = this.add.circle(20, 115, 6, 0xffd700); // Gold color for max streak
        maxStreakIcon.setFillStyle(0xffd700); // Ensure proper fill style
        const maxStreakLabel = this.add.text(
            35, 115,
            "Best Streak:",
            { ...labelStyle, fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        
        this.maxStreakText = this.add.text(
            boxWidth - 15, 115,
            `${this.maxWordStreak}`,
            { 
                ...countStyle,
                fontStyle: 'bold', 
                fill: '#ffd700' 
            }
        ).setOrigin(1, 0.5);
        
        // Add all elements to the container
        this.wordCountDisplay.add([
            background, 
            titleText, 
            originalIcon, originalLabel, this.originalCountText,
            aiIcon, aiLabel, this.aiCountText,
            streakIcon, streakLabel, this.streakText,
            maxStreakIcon, maxStreakLabel, this.maxStreakText
        ]);
        
        // Position the container
        this.wordCountDisplay.setPosition(displayX, displayY);
        
        // Store a reference to the streak icon to update its color
        this.streakIcon = streakIcon;
    }
    
    updateWordCountDisplay() {
        if (!this.wordCountDisplay) return;
        
        // Calculate total words in userInput
        const totalWordCount = this.userInput.trim() ? this.userInput.trim().split(/\s+/).length : 0;
        
        let originalWordCount;
        // Calculate original words (total minus AI words)
        if (this.mode === 'easy') {
            originalWordCount = Math.max(0, totalWordCount - this.aiWordCount);
        }
        else {
            originalWordCount = totalWordCount;
        };
        
        // Now totalWordCount is calculated dynamically from userInput
        this.totalWordCount = totalWordCount;
        
        // Update the count displays with animations
        this.animateCountChange(this.originalCountText, this.originalCountText.text, originalWordCount.toString());
        this.animateCountChange(this.aiCountText, this.aiCountText.text, this.aiWordCount.toString());
        //this.animateCountChange(this.totalCountText, this.totalCountText.text, totalWordCount.toString());
        
        // Update streak counter if it exists
        if (this.streakText) {
            this.streakText.setText(`${this.wordStreak}`);
            
            // Update streak text color based on streak count
            if (this.wordStreak >= 3) {
                this.streakText.setFill('#' + this.getStreakColor(this.wordStreak).toString(16).padStart(6, '0')); // Match icon color
            } else {
                this.streakText.setFill('#' + this.getStreakColor(this.wordStreak).toString(16).padStart(6, '0')); // Match icon color
            }
        }
        
        // Update max streak counter if it exists
        if (this.maxStreakText) {
            this.maxStreakText.setText(`${this.maxWordStreak}`);
        }
        
        // Update streak icon color
        if (this.streakIcon) {
            // Use setFillStyle instead of directly assigning to fillColor which is read-only
            this.streakIcon.setFillStyle(this.getStreakColor(this.wordStreak));
        }
    }
    
    animateCountChange(textObject, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        // Parse values as integers
        const oldNum = parseInt(oldValue, 10) || 0;
        const newNum = parseInt(newValue, 10) || 0;
        
        // Only animate if increasing
        if (newNum > oldNum) {
            // Create a temporary text object for the animation
            const deviceType = detectDeviceType();
            const uiScale = this.scalingManager?.uiScale || 1;
            const animStyle = getTextStyle('tooltip', deviceType, this.mode || 'basic', uiScale);
            const animatedText = this.add.text(
                textObject.x, 
                textObject.y - 15,
                "+" + (newNum - oldNum),
                {
                    ...animStyle,
                    fontStyle: 'bold',
                    fill: '#ffffff'
                }
            ).setOrigin(1, 0.5).setAlpha(0);
            
            // Add it to the same container
            this.wordCountDisplay.add(animatedText);
            
            // Animate the temporary text
            this.fadeIn(animatedText, 200);
            this.tweens.add({
                targets: animatedText,
                y: animatedText.y - 15,
                alpha: { from: 1, to: 0 },
                ease: 'Cubic.Out',
                duration: 800,
                delay: 300,
                onComplete: () => animatedText.destroy()
            });
            
            // Scale effect on the main counter
            this.tweens.add({
                targets: textObject,
                scale: { from: 1, to: 1.3, duration: 200, yoyo: true },
                ease: 'Back.Out',
                duration: 400,
            });
        }
        
        // Update the text
        textObject.setText(newValue);
    }

    ensureTextVisibility() {
        if (this.inputText) {
            this.inputText.setVisible(true);
            this.inputText.setDepth(25);
        }
        if (this.autocompleteText) {
            this.autocompleteText.setVisible(true);
            this.autocompleteText.setDepth(50);
        }
    }

    generateAutocomplete() {
        if (!this.aiSuggestedWords || this.aiSuggestedWords.length === 0) {
            return '';
        }
    
        // Get the current word being typed
        const lastSpaceIndex = this.userInput.lastIndexOf(' ');
        const lastNewlineIndex = this.userInput.lastIndexOf('\n');
        const lastBreakIndex = Math.max(lastSpaceIndex, lastNewlineIndex);
        const currentWord = lastBreakIndex >= 0 ? this.userInput.slice(lastBreakIndex + 1) : this.userInput;
        
        // Find matching suggestion for current word
        let suggestion = null;
        
        if (!currentWord || currentWord.endsWith(' ') || currentWord.endsWith('\n')) {
            // If at a word boundary, use first suggestion
            suggestion = this.aiSuggestedWords[0];
            
            if (suggestion) {
                // Return the suggestion directly so it can be appended to the input text
                return suggestion;
            }
        } else {
            // Find matching suggestion for current word being typed
            suggestion = this.aiSuggestedWords.find(word => 
                word.toLowerCase().startsWith(currentWord.toLowerCase())
            );
    
            if (suggestion) {
                // Only return the completion part (not the already typed portion)
                return suggestion.slice(currentWord.length);
            }
        }

        return '';
    }
    
    // Update cursor and input text display
    updateCursor() {
        if (this.isShuttingDown) return;
        if (!this.inputText || this.inputText.destroyed) return;
        
        // Check if we need to update based on cached values
        const currentAutocomplete = this.generateAutocomplete();
        const hasTextChanged = this.userInput !== this._cachedValues.lastUserInput;
        const hasAutocompleteChanged = currentAutocomplete !== this._cachedValues.lastAutocomplete;
        const hasCursorChanged = this._lastCursorVisible !== this.cursorVisible;
        
        // Only update if something has actually changed
        if (!hasTextChanged && !hasAutocompleteChanged && !hasCursorChanged) {
            return;
        }
        
        // Update cached values
        this._cachedValues.lastUserInput = this.userInput;
        this._cachedValues.lastAutocomplete = currentAutocomplete;
        this._lastCursorVisible = this.cursorVisible;
        
        // Build display text efficiently
        let displayText = this.userInput;
        
        // On mobile, prefer hidden input value if available
        if (this.isMobile && this._hiddenInput && typeof this._hiddenInput.value === "string") {
            displayText = this._hiddenInput.value;
        }
        
        // Append autocomplete or cursor
        if (currentAutocomplete && this.cursorVisible) {
            displayText += `[color=#ff0000]${currentAutocomplete}[/color]`;
        } else if (this.cursorVisible) {
            displayText += "_";
        } else {
            displayText += " ";
        }
        
        // Update text in one operation
        this.inputText.setText(displayText);
        
        // Clear deprecated autocomplete text if it exists
        if (this.autocompleteText) {
            this.autocompleteText.setText('');
        }
    }

    createSettingsButton(x, y, menuBarHeight) {
        // Create settings button using the PNG
        const settingsIcon = this.add.image(x, y, 'settings').setOrigin(0.5);

        // Set icon size relative to menu bar height
        let iconSize = Math.round(menuBarHeight * 0.5);
        // Slightly increase icon size for mobile devices
        if (this.isMobile) {
            iconSize = Math.round(menuBarHeight * 0.35); // was 0.25, now slightly larger
        }
        settingsIcon.setDisplaySize(iconSize, iconSize);

        // Make the settings icon white
        settingsIcon.setTint(0xffffff);
        
        // Make it interactive without scale effects
        settingsIcon.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.showTooltip('Settings: \nLevel\nMode', settingsIcon.x, settingsIcon.y + 50);
            })
            .on('pointerout', () => {
                this.hideTooltips();
            })
            .on('pointerdown', () => {
                // No scale effect
            })
            .on('pointerup', () => {
                this.toggleSettingsPopup();
            });
        
        // Store reference to the button
        this.settingsButton = settingsIcon;
    }

    createFailsCounter() {
        if (this.failsCounter) {
            this.failsCounter.clear();
        } else {
            this.failsCounter = this.add.graphics();
        }
        
        if (this.failsText) {
            this.failsText.destroy();
        }
    
        // Calculate width to match two buttons plus spacing
        const scoreWidth = DESIGN.UI.BUTTON.WIDTH * 2 + DESIGN.UI.BUTTON.SPACING;
        const scoreHeight = DESIGN.UI.BUTTON.HEIGHT;
        
        // Calculate position using the new layout calculation
        const statsBoxWidth = 180;
        const statsBoxHeight = 130;
        const statsDisplayY = this.menuBarHeight + 20;
        const statsBottomEdge = statsDisplayY + statsBoxHeight;
        
        // Use configuration constants for prompt offset
        const promptOffset = this.isMobile 
            ? SCENE_CONFIG.LAYOUT.MOBILE_PROMPT_OFFSET_BELOW_STATS 
            : SCENE_CONFIG.LAYOUT.PROMPT_OFFSET_BELOW_STATS;
        const promptY = statsBottomEdge + promptOffset;
        const promptBoxHeight = 80;
        const promptBottomEdge = promptY + promptBoxHeight;
        
        // Input box is 20px below prompt box
        const inputBoxY = promptBottomEdge + 20;
        const inputBoxHeight = 240;
        const inputBoxBottomEdge = inputBoxY + inputBoxHeight;
        

        const buttonPadding = 70; // Standard padding used for buttons
        
        // Set X position with the same padding as buttons have from right side
        const scoreX = this.cameras.main.centerX - this.uiBoxWidth / 2 + buttonPadding;
        const scoreY = inputBoxBottomEdge + DESIGN.UI.BUTTON.BELOW_TEXTBOX_GAP;

        // Set depth and position
        this.failsCounter.setPosition(scoreX, scoreY).setDepth(50);
        
        // Add tooltip for the score bar (progress bar)
        this.failsCounter.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, scoreWidth, scoreHeight),
            Phaser.Geom.Rectangle.Contains
        )
        .on('pointerover', () => {
            this.showTooltip(
                "Progress Bar:\nWrite original words to fill the bar.\nUsing AI words reduces progress.",
                scoreX + scoreWidth / 2,
                scoreY - 10
            );
        })
        .on('pointerout', () => {
            this.hideTooltips();
        });
        
        this.failsText = this.add.text(
            scoreX + scoreWidth / 2,
            scoreY + scoreHeight / 2,
            ' ',
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: '20px',
                fill: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(51);

        // Draw the initial segmented progress bar
        this.updateProgressFill();
    }

    showTooltip(text, x, y) {
        // Hide any existing tooltips
        this.hideTooltips();

        // Create tooltip background
        const padding = 10;
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        const tooltipStyle = getTextStyle('tooltip', deviceType, this.mode || 'basic', uiScale);
        const tooltipText = this.add.text(0, 0, text, {
            ...tooltipStyle,
            color: '#ffffff',
            align: 'center'
        });

        const width = tooltipText.width + padding * 2;
        const height = tooltipText.height + padding * 2;

        const background = this.add.graphics();
        background.fillStyle(0x000000, 0.8);
        background.fillRoundedRect(0, 0, width, height, 8);
        background.lineStyle(1, 0xffffff, 0.3);
        background.strokeRoundedRect(0, 0, width, height, 8);

        // Calculate initial position
        let tooltipX = x - width / 2;
        let tooltipY = y - height - 5;

        // Clamp X so tooltip stays within screen horizontally
        tooltipX = Math.max(0, Math.min(tooltipX, this.cameras.main.width - width));
        // Clamp Y so tooltip stays within screen vertically
        tooltipY = Math.max(0, Math.min(tooltipY, this.cameras.main.height - height));

        // Create container for tooltip
        const container = this.add.container(tooltipX, tooltipY, [background, tooltipText]);
        tooltipText.setPosition(padding, padding);

        // Add to active tooltips
        this.tooltips.push(container);

        // Fade in effect
        container.setAlpha(0);
        this.fadeIn(container, 200, 'Quad.easeOut');

        container.setDepth(1000);
    }
    
    hideTooltips() {
        this.tooltips.forEach(tooltip => {
            this.fadeOut(tooltip, 200, 'Quad.easeOut', () => tooltip.destroy());
        });
        this.tooltips = [];
    }

    addButtonClickEffects() {
        const buttons = [
            { button: this.doneButton, tooltip: 'Escalate to supervisory oversight' },
            { button: this.resetButton, tooltip: 'Reset field. Begin anew' },
            { button: this.feedbackButton, tooltip: 'Report anomaly or praise' },
            //{ button: this.hardButton, tooltip: 'Switch to Hard mode: No AI suggestions' },
            //{ button: this.easyButton, tooltip: 'Switch to Easy mode: AI suggestions allowed' }
        ];
        
        buttons.forEach(({ button, tooltip }) => {
            if (!button) return;
            
            button.on('pointerover', () => {
                button.setScale(1.1);
                if (tooltip) {
                    this.showTooltip(tooltip, button.x, button.y - button.height/2);
                }
            });
            
            button.on('pointerout', () => {
                button.setScale(1);
                this.hideTooltips();
            });
            
            button.on('pointerdown', () => {
                button.setScale(0.95);
            });
            
            button.on('pointerup', () => {
                button.setScale(1.1);
            });
        });
    }

    createInputBoxClickEffect(x, y) {
        const circle = this.add.circle(x, y, 5, 0xffffff, 0.5).setDepth(15);
        
        this.tweens.add({
            targets: circle,
            scale: { from: 0.5, to: 2 },
            alpha: { from: 0.5, to: 0 },
            duration: 500,
            ease: 'Quad.easeOut',
            onComplete: () => circle.destroy()
        });
    }



    updateFailsCounter(success) {
        const oldPercentage = this.progressPercentage;
        let newPercentage;
        // Use progress increment directly from DESIGN constant
        this.progressIncrement = DESIGN.UI.PROGRESS_BAR.INCREMENT;
        
        if (success) {
            // Non-AI word - Create success effects!
            newPercentage = this.progressPercentage + this.progressIncrement;
            
            // Get the last word from user input
            const words = this.userInput.trim().split(/\s+/);
            const lastWord = words[words.length - 1].replace(/[.,!?;:]$/, ''); // Remove punctuation
        } else {
            // AI word - negative effects     
            newPercentage = this.progressPercentage - this.progressIncrement;
            // Update AI word count only
            this.aiWordCount++;
        }
        
        // Update the word count display
        this.updateWordCountDisplay();
        
        // Update the streak counter - success means original word
        this.updateStreakCounter(success);
        
        newPercentage = Phaser.Math.Clamp(newPercentage, 0, 100);

        this.progressPercentage = newPercentage;
        
        if (this.failsText) {
            this.failsText.setText(` `);
        }
        
        this.updateProgressFill();
    }
    
    /**
     * Create a floating effect for a successfully typed word
     * @param {string} word - The word to animate
     */
    createRisingWordEffect(word) {
        // Determine input position for the effect origin
        const inputBoxY = this.cameras.main.centerY - 240 / 2;
        const inputBoxHeight = 240;
        const inputBoxCenterY = inputBoxY + inputBoxHeight / 2;
        
        // Create word text at cursor position
        const wordText = this.add.text(
            this.cameras.main.centerX,
            inputBoxCenterY,
            word,
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: '24px',
                fontStyle: 'bold',
                fill: '#00ff00', // Green for success
                stroke: '#000000',
                strokeThickness: 3,
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000',
                    blur: 1,
                    stroke: true
                }
            }
        ).setOrigin(0.5).setDepth(100).setAlpha(0);
        
        // Generate a random rise direction slightly to the left or right
        const randomX = this.cameras.main.centerX + Phaser.Math.Between(-100, 100);
        
        // Rising animation sequence
        this.tweens.add({
            targets: wordText,
            y: inputBoxCenterY - 100, // Rise up
            x: randomX, // Drift horizontally
            alpha: { from: 0, to: 1, duration: 200, ease: 'Cubic.Out' },
            scale: { from: 0.8, to: 1.2 },
            angle: { from: Phaser.Math.Between(-10, 10), to: 0 },
            duration: 800,
            ease: 'Back.Out',
            onComplete: () => {
                // Fade out
                this.fadeOut(wordText, 400, 'Cubic.In', () => wordText.destroy());
                this.tweens.add({
                    targets: wordText,
                    y: '-=50',
                    scale: 1.5,
                    duration: 400,
                    ease: 'Cubic.In'
                });
            }
        });
    }
    
    /**
     * Create particle burst for successful word entry
     */
    createWordSuccessParticles() {
        // Determine input position for the effect origin
        const inputBoxY = this.cameras.main.centerY - 240 / 2;
        const inputBoxHeight = 240;
        const inputBoxCenterY = inputBoxY + inputBoxHeight / 2;
        
        // Calculate a dynamic color based on streak
        let colors;
        if (this.wordStreak >= 10) {
            // Gold particles for high streaks
            colors = [0xffd700, 0xffcc00, 0xffaa00, 0xff8800];
        } else if (this.wordStreak >= 5) {
            // Orange particles for medium streaks
            colors = [0xff8c00, 0xff7700, 0xff6600, 0xff5500];
        } else if (this.wordStreak >= 3) {
            // Green particles for small streaks
            colors = [0x00ff00, 0x33ff33, 0x66ff66, 0x99ff99];
        } else {
            // Blue particles for no streak
            colors = [0x4169e1, 0x5a7de1, 0x6a95e1, 0x7aaae1];
        }
        
        // Create particles
        for (let i = 0; i < 15 + Math.min(this.wordStreak * 2, 30); i++) {
            const size = Phaser.Math.Between(3, 6);
            const color = colors[Phaser.Math.Between(0, colors.length - 1)];
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = Phaser.Math.FloatBetween(100, 200);
            
            const particle = this.add.circle(
                this.cameras.main.centerX,
                inputBoxCenterY,
                size,
                color,
                0.8
            ).setDepth(95);
            
            // Calculate velocity
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            // Animate the particle
            this.tweens.add({
                targets: particle,
                x: particle.x + vx,
                y: particle.y + vy,
                alpha: 0,
                scale: { from: 1, to: 0 },
                duration: Phaser.Math.Between(600, 1000),
                ease: 'Cubic.Out',
                onComplete: () => particle.destroy()
            });
        }
        
        
    }

    // Visual effects for progress bar: scale pop, color flash, shake
    animateProgressBarChange(type) {
        if (!this.failsCounter) return;
        const bar = this.failsCounter;
        const scene = this;

        // Store original position for shake reset
        if (bar.originalX === undefined) {
            bar.originalX = bar.x;
        }

        // Shake
        scene.tweens.add({
            targets: bar,
            x: bar.originalX + (type === "increment" ? 2 : -2),
            yoyo: true,
            repeat: 3,
            duration: 40,
            onComplete: () => {
                bar.x = bar.originalX;
            }
        });
 
    }

    // Get appropriate color based on streak count
    getStreakColor(streak) {
        if (streak >= 10) return 0xffd700; // Gold
        if (streak >= 7) return 0xff4500;  // Orange-red
        if (streak >= 5) return 0xff8c00;  // Dark orange
        if (streak >= 3) return 0x32cd32;  // Lime green
        return 0x4169e1;                   // Royal blue
    }
    
    // Get appropriate color based on streak count
    getStreakColor(streak) {
        if (streak >= 10) return 0xffd700; // Gold
        if (streak >= 7) return 0xff4500;  // Orange-red
        if (streak >= 5) return 0xff8c00;  // Dark orange
        if (streak >= 3) return 0x32cd32;  // Lime green
        return 0x4169e1;                   // Royal blue
    }
    
    // Update the streak counter with animations
    updateStreakCounter(isOriginalWord) {
        // Track if this is a new streak
        const previousStreak = this.wordStreak;
        
        if (isOriginalWord) {
            // Increment streak for original words
            this.wordStreak++;
            this.lastWordWasOriginal = true;
            
            // Update max streak if needed
            if (this.wordStreak > this.maxWordStreak) {
                this.maxWordStreak = this.wordStreak;
            }
        } else {
            // Reset streak for AI words
            this.wordStreak = 0;
            this.lastWordWasOriginal = false;
            
            // Cleanup any existing streak-specific visual elements
            this.cleanupStreakVisuals();
        }
        
        // Update the word count display which contains the streak counters
        this.updateWordCountDisplay();
        
        // Update background based on the new streak value
        this.updateBackgroundForStreak();
        
        // If streak has increased, add celebration effects at milestones
        if (isOriginalWord && this.wordStreak > previousStreak) {
            // Add streak milestone effects
            this.celebrateStreakMilestone(this.wordStreak, previousStreak);
        }
    }
    
    // Helper method to clean up any streak-specific visuals
    cleanupStreakVisuals() {
        // Clean up any existing streak-specific background elements
        if (this.background) {
            // Clean up the border if it exists
            if (this.background.streakBorder) {
                this.background.streakBorder.destroy();
                this.background.streakBorder = null;
            }
            
            // Clean up particles if they exist
            if (this.background.particles) {
                this.background.particles.forEach(particle => {
                    if (particle && particle.active) {
                        particle.destroy();
                    }
                });
                this.background.particles = null;
            }
            
            // Clean up glow overlay if it exists
            if (this.background.glowOverlay) {
                this.background.glowOverlay.destroy();
                this.background.glowOverlay = null;
            }
            
            // Clean up vignette if it exists
            if (this.background.vignette) {
                this.background.vignette.destroy();
                this.background.vignette = null;
            }
            
            // Clean up flares if they exist
            if (this.background.flares) {
                this.background.flares.forEach(flare => {
                    if (flare && flare.active) {
                        flare.destroy();
                    }
                });
                this.background.flares = null;
            }
        }
    }
    
    // Update background based on the current streak
    updateBackgroundForStreak() {
        // Simply call the scene's updateBackgroundForLevel method
        // which will handle the background creation with the current streak value
        this.updateBackgroundForLevel();
    }
    
    // Celebrate streak milestones with special effects
    celebrateStreakMilestone(currentStreak, previousStreak) {
        // Define milestone thresholds
        const milestones = [3, 5, 7, 10, 15, 20];
        
        // Check if we crossed any milestone
        for (const milestone of milestones) {
            if (previousStreak < milestone && currentStreak >= milestone) {
                // We crossed a milestone, add celebration effects
                const text = milestone === 3 ? "STREAK!" : 
                            milestone === 5 ? "NICE STREAK!" : 
                            milestone === 7 ? "GREAT STREAK!" :
                            milestone === 10 ? "AMAZING STREAK!" :
                            milestone === 15 ? "INCREDIBLE STREAK!" :
                            "UNSTOPPABLE!";
                
                // Position celebration text at the top-right near the word stats panel
                const padding = 20;
                const displayX = this.cameras.main.width - 180 - padding; // Same as word stats x position
                
                // Celebration text that appears near the word stats
                const celebrationText = this.add.text(
                    displayX + 90, // Center of the word stats panel
                    this.menuBarHeight + 150, // Below the word stats panel
                    text,
                    {
                        fontFamily: 'IBM Plex Mono',
                        fontSize: '28px',
                        fontStyle: 'bold',
                        fill: '#ffffff',
                        stroke: '#000000',
                        strokeThickness: 4,
                        shadow: {
                            offsetX: 2,
                            offsetY: 2,
                            color: '#000000',
                            blur: 5,
                            stroke: true,
                            fill: true
                        }
                    }
                ).setOrigin(0.5, 0.5).setDepth(100);
                
                // Animate the celebration text
                celebrationText.setAlpha(0);
                this.fadeIn(celebrationText, 200);
                this.tweens.add({
                    targets: celebrationText,
                    y: celebrationText.y - 50, // Move up from its starting position
                    alpha: 0,
                    scale: { from: 0.8, to: 1.2 },
                    duration: 1500,
                    ease: 'Power2',
                    onComplete: () => celebrationText.destroy()
                });
                
                // Highlight the word stats panel for a moment
                if (this.wordCountDisplay) {
                    this.tweens.add({
                        targets: this.wordCountDisplay,
                        scale: { from: 1, to: 1.05, duration: 200 },
                        yoyo: true,
                        repeat: 2,
                        ease: 'Sine.InOut'
                    });
                }
                
                // Screen flash for big milestones
                if (milestone >= 10) {
                    const flashColor = milestone >= 15 ? 0xffd700 : 0xff8c00;
                    const flash = this.add.rectangle(
                        0, 0,
                        this.cameras.main.width,
                        this.cameras.main.height,
                        flashColor,
                        0.3
                    ).setOrigin(0).setDepth(99);
                    
                    this.fadeOut(flash, 500, 'Power2', () => flash.destroy());
                }
                
                // Only celebrate the highest milestone crossed
                break;
            }
        }
    }
    
    // Particle burst for progress bar
    emitProgressBarParticles(type) {
        if (!this.failsCounter) return;
        const bar = this.failsCounter;
        const scene = this;

        // Get bar position (center of progress bar)
        const scoreWidth = scene.DESIGN?.UI?.BUTTON?.WIDTH * 2 + scene.DESIGN?.UI?.BUTTON?.SPACING || 180;
        const scoreHeight = scene.DESIGN?.UI?.BUTTON?.HEIGHT || 40;
        const barX = bar.x + scoreWidth / 2;
        const barY = bar.y + scoreHeight / 2;

        // Particle color
        const color = type === "increment" ? 0xffff00 : 0xff0000;

        // Only use graphics-based burst (draw circles and animate them)
        for (let i = 0; i < 16; i++) {
            const angle = Phaser.Math.DegToRad(Phaser.Math.Between(0, 360));
            const distance = Phaser.Math.Between(30, 80);
            const size = Phaser.Math.Between(6, 14);
            const startX = barX;
            const startY = barY;
            const endX = startX + Math.cos(angle) * distance;
            const endY = startY + Math.sin(angle) * distance;
            const circle = scene.add.circle(startX, startY, size, color, 0.8).setDepth(199);
            scene.tweens.add({
                targets: circle,
                x: endX,
                y: endY,
                alpha: 0,
                scale: { from: 1, to: 0 },
                duration: 500,
                ease: 'Quad.Out',
                onComplete: () => circle.destroy()
            });
        }
    }

    // Custom celebration effect without using particle emitters
    celebrateSuccess() {
        // Get positions based on the progress bar

        const scoreWidth = DESIGN.UI.BUTTON.WIDTH * 2 + DESIGN.UI.BUTTON.SPACING;
        const scoreHeight = DESIGN.UI.BUTTON.HEIGHT;
        const inputBoxY = this.cameras.main.centerY - 240 / 2;
        const inputBoxHeight = 240;
        const padding = 20;
        const scoreX = this.cameras.main.centerX - this.uiBoxWidth / 2 + 70;
        const scoreY = inputBoxY + inputBoxHeight + padding;
        
        // Create celebration text
        const text = this.add.text(
            scoreX + scoreWidth/2,
            scoreY,
            'Reluctant approval granted.',
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: '32px',
                fill: '#7cfc00', // Bright green
                stroke: '#ffffff',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(200);
        
        // Create multiple circles that expand outward in place of particles
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 60 + 20;
            const size = Math.random() * 8 + 4;
            const startX = scoreX + scoreWidth/2;
            const startY = scoreY + scoreHeight/2;
            
            const circle = this.add.circle(
                startX,
                startY,
                size,
                0x7cfc00, // Green
                0.8
            ).setDepth(199);
            
            this.tweens.add({
                targets: circle,
                x: startX + Math.cos(angle) * distance,
                y: startY + Math.sin(angle) * distance,
                alpha: 0,
                scale: { from: 1, to: 0 },
                duration: 1000,
                ease: 'Quad.Out',
                onComplete: () => circle.destroy()
            });
        }
        
        // Animate text
        this.tweens.add({
            targets: text,
            y: text.y - 80,
            scale: { from: 1, to: 1.5 },
            alpha: { from: 1, to: 0 },
            duration: 1200,
            ease: 'Cubic.Out',
            onComplete: () => text.destroy()
        });
        
        // Screen flash with green
        const flash = this.add.rectangle(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            0x7cfc00, // Green
            0.2
        ).setOrigin(0).setDepth(100);

        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            ease: 'Cubic.Out',
            onComplete: () => flash.destroy()
        });
    }

    // Custom celebration effect without using particle emitters for "Needs Work" state
    celebrateNeedsWork() {
        // Get positions based on the progress bar
        const scoreWidth = DESIGN.UI.BUTTON.WIDTH * 2 + DESIGN.UI.BUTTON.SPACING;
        const scoreHeight = DESIGN.UI.BUTTON.HEIGHT;
        const inputBoxY = this.cameras.main.centerY - 240 / 2;
        const inputBoxHeight = 240;
        const padding = 20;
        const scoreX = this.cameras.main.centerX - this.uiBoxWidth / 2 + 70;
        const scoreY = inputBoxY + inputBoxHeight + padding;
        
        // Create celebration text
        const text = this.add.text(
            scoreX + scoreWidth/2,
            scoreY,
            'Utterly disappointing.',
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: '32px',
                fill: DESIGN.COLORS.AUTOCOMPLETE, // Red color
                stroke: '#ffffff',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(200);
        
        // Create multiple circles that expand outward in place of particles
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 60 + 20;
            const size = Math.random() * 8 + 4;
            const startX = scoreX + scoreWidth/2;
            const startY = scoreY + scoreHeight/2;
            
            const circle = this.add.circle(
                startX,
                startY,
                size,
                DESIGN.UI.PROGRESS_BAR.COLORS.WARNING, // orange color
                0.8
            ).setDepth(199);
            
            this.tweens.add({
                targets: circle,
                x: startX + Math.cos(angle) * distance,
                y: startY + Math.sin(angle) * distance,
                alpha: 0,
                scale: { from: 1, to: 0 },
                duration: 1000,
                ease: 'Quad.Out',
                onComplete: () => circle.destroy()
            });
        }
        
        // Animate text
        this.tweens.add({
            targets: text,
            y: text.y - 80,
            scale: { from: 1, to: 1.5 },
            alpha: { from: 1, to: 0 },
            duration: 1200,
            ease: 'Cubic.Out',
            onComplete: () => text.destroy()
        });
        
        // Screen flash with red
        const flash = this.add.rectangle(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            DESIGN.UI.PROGRESS_BAR.COLORS.DANGER, // Red color
            0.2
        ).setOrigin(0).setDepth(100);

        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            ease: 'Cubic.Out',
            onComplete: () => flash.destroy()
        });
    }



    updateProgressFill() {
        if (!this.failsCounter) return;

        this.failsCounter.clear();

        const scoreWidth = DESIGN.UI.BUTTON.WIDTH * 2 + DESIGN.UI.BUTTON.SPACING;
        const scoreHeight = DESIGN.UI.BUTTON.HEIGHT;

        const fillPercentage = Phaser.Math.Clamp(this.progressPercentage, 0, 100);
        
        // Background with rounded corners
        this.failsCounter.fillStyle(0x000000, 0.5);
        if (this.progressPercentage > 0) {
            this.failsCounter.fillStyle(COLORS_HEX.BACKGROUND, 0.5);
        }
        
        this.failsCounter.fillRoundedRect(0, 0, scoreWidth, scoreHeight, DESIGN.UI.BUTTON.CORNER_RADIUS);
        
        // Calculate segment width based on the increment percentage
        const incrementPercentage = DESIGN.UI.PROGRESS_BAR.INCREMENT;
        const totalSegments = Math.ceil(100 / incrementPercentage);
        
        // Draw segments as individual rectangles
        const segmentGap = 2; // Gap between segments
        
        // Calculate the exact width of each segment
        const totalGapWidth = segmentGap * (totalSegments - 1);
        const segmentWidth = (scoreWidth - totalGapWidth) / totalSegments;
        
        // Calculate how many segments to fill based on current progress
        const segmentsToFill = Math.ceil(fillPercentage / incrementPercentage);
        
        // Draw each segment individually
        for (let i = 0; i < segmentsToFill; i++) {
            // Calculate color for this segment
            const segmentPercentage = (i + 1) * incrementPercentage;
            let color;
            
            if (segmentPercentage <= 50) {
                // Interpolate between red and yellow (red at 0%, yellow at 50%)
                const t = segmentPercentage / 50;
                const r = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.DANGER >> 16) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 16) & 0xFF)));
                const g = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.DANGER >> 8) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 8) & 0xFF)));
                const b = Math.round(((1 - t) * (DESIGN.UI.PROGRESS_BAR.COLORS.DANGER & 0xFF)) + (t * (DESIGN.UI.PROGRESS_BAR.COLORS.WARNING & 0xFF)));
                color = (r << 16) | (g << 8) | b;
            } else {
                // Interpolate between yellow and green (yellow at 50%, green at 100%)
                const t = (segmentPercentage - 50) / 50;
                const r = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 16) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS >> 16) & 0xFF)));
                const g = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 8) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS >> 8) & 0xFF)));
                const b = Math.round(((1 - t) * (DESIGN.UI.PROGRESS_BAR.COLORS.WARNING & 0xFF)) + (t * (DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS & 0xFF)));
                color = (r << 16) | (g << 8) | b;
            }
            
            this.failsCounter.fillStyle(color, 1);
            
            // Calculate the position for this segment
            const segmentX = i * (segmentWidth + segmentGap);
            
            // Make sure we're using the correct color
            this.failsCounter.fillStyle(color, 1);
            
            // Draw the segment
            if (i === 0 && segmentsToFill === 1) {
                // Only one segment - round both sides (and narrower on both sides)
                this.failsCounter.fillRoundedRect(
                    segmentX, 
                    0, 
                    segmentWidth, 
                    scoreHeight, 
                    DESIGN.UI.BUTTON.CORNER_RADIUS
                );
            } else if (i === 0) {
                // First segment - round left side only
                this.failsCounter.fillRoundedRect(
                    segmentX, 
                    0, 
                    segmentWidth, 
                    scoreHeight, 
                    {
                        tl: DESIGN.UI.BUTTON.CORNER_RADIUS,
                        bl: DESIGN.UI.BUTTON.CORNER_RADIUS,
                        tr: 0,
                        br: 0
                    }
                );
            } else if (i === segmentsToFill - 1) {
                // Last segment - round the right corners if this is at 100%
                if (fillPercentage >= 99) {
                    // Ensure we're using the correct green color for the rightmost segment at 100%
                    // Force green color for the final segment when at 100%
                    if (fillPercentage >= 99) {
                        this.failsCounter.fillStyle(DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS, 1);
                    }
                    
                    this.failsCounter.fillRoundedRect(
                        segmentX, 
                        0, 
                        segmentWidth, 
                        scoreHeight, 
                        {
                            tl: 0,
                            bl: 0,
                            tr: DESIGN.UI.BUTTON.CORNER_RADIUS,
                            br: DESIGN.UI.BUTTON.CORNER_RADIUS
                        }
                    );
                } else {
                    // Otherwise keep square corners
                    this.failsCounter.fillRect(
                        segmentX, 
                        0, 
                        segmentWidth, 
                        scoreHeight
                    );
                }
            } else {
                // Middle segment - no rounding
                this.failsCounter.fillRect(
                    segmentX, 
                    0, 
                    segmentWidth, 
                    scoreHeight
                );
            }
        }

        // White outline for the entire bar - always has rounded corners
        this.failsCounter.lineStyle(DESIGN.UI.BUTTON.OUTLINE_WIDTH, 0xffffff, 1);
        this.failsCounter.strokeRoundedRect(0, 0, scoreWidth, scoreHeight, DESIGN.UI.BUTTON.CORNER_RADIUS);
    }

    /**
     * Clean up all suggestion-related visual elements
     */
    cleanupAllSuggestions() {
        // First clean up tracked elements
        if (this.suggestionBoxes && this.suggestionBoxes.length > 0) {
            this.suggestionBoxes.forEach(box => {
                if (box && !box.destroyed) {
                    box.clear();
                    box.destroy();
                }
            });
        }
        if (this.suggestionTexts && this.suggestionTexts.length > 0) {
            this.suggestionTexts.forEach(text => {
                if (text && !text.destroyed) {
                    text.destroy();
                }
            });
        }
        
        // Then do a comprehensive cleanup of any remaining suggestion elements
        if (this.children && this.children.list) {
            // Create a copy of the list to avoid modification during iteration
            const childrenToCheck = [...this.children.list];
            childrenToCheck.forEach(child => {
                if (child && !child.destroyed) {
                    // Check for suggestion-related depths (15-16)
                    if (child.depth >= 15 && child.depth <= 16) {
                        // Check if it's a graphics or text object
                        if (child.type === 'Graphics' || child.type === 'Text' || 
                            child.constructor.name === 'Graphics' || child.constructor.name === 'Text') {
                            try {
                                if (child.type === 'Graphics' || child.constructor.name === 'Graphics') {
                                    child.clear();
                                }
                                child.destroy();
                            } catch (e) {
                                // Ignore destruction errors
                            }
                        }
                    }
                }
            });
        }
        
        // Reset arrays
        this.suggestionBoxes = [];
        this.suggestionTexts = [];
    }

    showSuggestions(words) {
        // Performance optimization - measure time for suggestion rendering
        const startTime = performance.now();
        
        // Use the comprehensive cleanup method
        this.cleanupAllSuggestions();

        if (!words || words.length === 0) return;

        const padding = 20;
        const boxHeight = 30;
        const boxSpacing = 10;
        
        // Calculate position dynamically between prompt box and input box
        let suggestionsY;
        
        if (this.promptBoxInfo && this.inputBoxY) {
            // Calculate available space between prompt box bottom and input box top
            const promptBottom = this.promptBoxInfo.boxBottom;
            const inputTop = this.inputBoxY;
            const availableSpace = inputTop - promptBottom;
            
            // Position suggestions in the middle of available space
            const middlePoint = promptBottom + (availableSpace / 2);
            suggestionsY = middlePoint - (boxHeight / 2);
            
            // Ensure there's at least some padding from both boxes
            const minPadding = 10;
            const maxY = inputTop - boxHeight - minPadding;
            const minY = promptBottom + minPadding;
            
            suggestionsY = Math.max(minY, Math.min(suggestionsY, maxY));
        } else {
            // Fallback positioning - use stored inputBoxY if available
            if (this.inputBoxY) {
                const suggestionsOffset = 70;
                suggestionsY = this.inputBoxY - suggestionsOffset - boxHeight;
            } else {
                // Last resort - position relative to center
                suggestionsY = this.cameras.main.centerY - 100;
            }
        }
        
        // Create a single temporary text object to measure widths instead of creating many
        const deviceType = detectDeviceType();
        const uiScale = this.scalingManager?.uiScale || 1;
        const suggestionStyle = getTextStyle('tooltip', deviceType, this.mode || 'basic', uiScale);
        const tempText = this.add.text(0, 0, '', suggestionStyle);
        
        // Pre-calculate all word widths in one batch
        const wordWidths = words.map(word => {
            tempText.setText(word);
            return tempText.width + padding * 2;
        });
        
        // Calculate total width in one pass
        const totalWidth = wordWidths.reduce((acc, width, i) => 
            acc + width + (i < words.length - 1 ? boxSpacing : 0), 0);
        
        // Calculate the starting X position
        const startX = this.cameras.main.centerX - totalWidth / 2;
        
        // Calculate all box positions
        let currentX = startX;
        
        // Create all suggestion boxes in a single pass
        words.forEach((word, index) => {
            const boxWidth = wordWidths[index];
            
            // Create box
            const box = this.add.graphics();
            box.fillStyle(0xff0000, 0.3);
            box.fillRoundedRect(currentX, suggestionsY, boxWidth, boxHeight, 10);
            box.lineStyle(2, 0xff0000, 0.8);
            box.strokeRoundedRect(currentX, suggestionsY, boxWidth, boxHeight, 10);
            
            // Create text
            const text = this.add.text(
                currentX + padding, 
                suggestionsY + boxHeight / 2, 
                word,
                {
                    ...suggestionStyle,
                    color: '#ffffff'
                }
            ).setOrigin(0, 0.5);
            
            // Set depths
            box.setDepth(15);
            text.setDepth(16);
            
            // Store for later cleanup
            this.suggestionBoxes.push(box);
            this.suggestionTexts.push(text);
            
            // Update X position for next box
            currentX += boxWidth + boxSpacing;
        });
        
        // Clean up the temporary text object
        tempText.destroy();
        
        // Performance tracking
        const duration = performance.now() - startTime;
    }

    init(data) {
        // If this is a reset from DoneScene or FeedbackScene, reset game state but preserve level and topK
        if (data && data.requiresReset) {
            this.progressPercentage = data.progressPercentage || 50;
            
            // Preserve level and topK if they were passed
            if (data.levelValue) {
                this.levelValue = data.levelValue;
                // No need to update slider position - it will be set when settings popup opens
            }
            
            if (data.topKValue) {
                this.topKValue = data.topKValue;
                // No need to update slider position - it will be set when settings popup opens
            }
            
            // Reset game state to match our simplified approach
            this.aiWordCount = 0;
             // Note: originalWordCount and totalWordCount are now calculated dynamically
            
            // Reset suggestion-related state
            this.userInput = '';
            this.aiSuggestedWords = [];
            this.autocompleteText = null;
            this.suggestionBoxes = [];
            this.suggestionTexts = [];
            
            // Reset cursor state
            this.cursorVisible = true;
            if (this.cursorTimer) {
                this.cursorTimer.remove();
                this.cursorTimer = null;
            }
        } else if (data && data.progressPercentage !== undefined) {
            // Normal scene transition
            this.progressPercentage = data.progressPercentage;
        }
        
        // Reset UI elements for recreation
        this.promptTextBox = null;
        this.promptText = null;
        this.failsCounter = null;
        this.failsText = null;
        
        // Clear any active timeouts
        if (this.activeTimeout) {
            clearTimeout(this.activeTimeout);
            this.activeTimeout = null;
        }
    }
}
