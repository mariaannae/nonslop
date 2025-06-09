import { DESIGN, EASY_COLORS_HEX as COLORS_HEX, EASY_COLORS_TEXT as COLORS_TEXT, THEMES } from "../config/design.js";
import { createBackground } from "../backgrounds/createBackground.js";
import ToggleFactory from "../utils/ToggleFactory.js";
import BaseGameScene from "./BaseGameScene.js";

//this.colors_hex, this.colors_text, 

export default class GameSceneEasy extends BaseGameScene {
    constructor() {
        super({ key: 'GameSceneEasy' });
        this.mode = 'easy';
        // Get design configuration for easy mode
        this.design = DESIGN.UI;
        console.log('Design UI:', this.design);
        // Extract needed values for easier access
        this.COLORS_HEX = COLORS_HEX;
        this.COLORS_TEXT = COLORS_TEXT;
        console.log('Easy Mode Colors:', {
            accent: this.COLORS_HEX.ACCENT,
            background: this.COLORS_HEX.BACKGROUND,
            text: this.COLORS_HEX.TEXT
        });
        this.OUTLINE_WIDTH = this.design.OUTLINE.WIDTH;
        this.CORNER_RADIUS = this.design.OUTLINE.CORNER_RADIUS;
    }

    // Responsive relayout for orientation/resize changes
    relayoutScene(width, height, isPortrait) {
        // Destroy and recreate background
        if (this.background) {
            this.background.destroy();
            this.background = null;
        }
        createBackground(this, THEMES.easy.background, this.levelValue, this.wordStreak);

        // Destroy and recreate menu bar
        if (this.menuBar) {
            this.menuBar.destroy();
            this.menuBar = null;
        }
        this.createMenuBar && this.createMenuBar();

        // Destroy and recreate prompt box/text
        if (this.promptTextBox) {
            this.promptTextBox.destroy();
            this.promptTextBox = null;
        }
        if (this.promptText) {
            this.promptText.destroy();
            this.promptText = null;
        }
        this.createPromptTextBox && this.createPromptTextBox();

        // Destroy and recreate input box/text
        if (this.inputTextBorder) {
            this.inputTextBorder.destroy();
            this.inputTextBorder = null;
        }
        if (this.inputText) {
            this.inputText.destroy();
            this.inputText = null;
        }
        this.createInputTextBox && this.createInputTextBox();

        // Destroy and recreate fails counter/progress bar
        if (this.failsCounter) {
            this.failsCounter.destroy();
            this.failsCounter = null;
        }
        if (this.failsText) {
            this.failsText.destroy();
            this.failsText = null;
        }
        this.createFailsCounter && this.createFailsCounter();
        this.updateProgressFill && this.updateProgressFill();

        // Destroy and recreate word count display
        if (this.wordCountDisplay) {
            this.wordCountDisplay.destroy();
            this.wordCountDisplay = null;
        }
        this.createWordCountDisplay && this.createWordCountDisplay();

        // Destroy and recreate buttons
        if (this.doneButton) {
            this.doneButton.destroy();
            this.doneButton = null;
        }
        if (this.feedbackButton) {
            this.feedbackButton.destroy();
            this.feedbackButton = null;
        }
        // Recreate buttons
        const inputBoxWidth = this.cameras.main.width * (5 / 6);
        const padding = 20;
        const buttonPadding = 70;
        const boxX = this.cameras.main.centerX - inputBoxWidth / 2;
        const buttonCenterX = boxX + inputBoxWidth - buttonPadding - this.design.BUTTON.WIDTH / 2;
        const statsBoxHeight = 130;
        const menuBarHeight = this.menuBarHeight || 100;
        const statsDisplayY = menuBarHeight + padding;
        const statsBottomEdge = statsDisplayY + statsBoxHeight;
        const promptY = statsBottomEdge + 20;
        const promptBoxHeight = 80;
        const promptBottomEdge = promptY + promptBoxHeight;
        const inputBoxY = promptBottomEdge + 20;
        const inputBoxHeight = 240;
        const inputBoxBottomEdge = inputBoxY + inputBoxHeight;
        const outlineWidth = this.design.OUTLINE.WIDTH;
        const doneButtonY = inputBoxBottomEdge + outlineWidth / 2 + this.design.BUTTON.BELOW_TEXTBOX_GAP + this.design.BUTTON.HEIGHT / 2;

        this.doneButton = this.createButton(
            "DONE", 
            () => this.onDoneButtonClick(), 
            buttonCenterX, 
            doneButtonY,
            'Submit your text for evaluation'
        );
        // Calculate safe area insets for mobile (if available)
        let safeAreaLeft = 0, safeAreaBottom = 0;
        if (typeof window !== "undefined" && window.CSS && window.CSS.supports && window.CSS.supports("padding-bottom: env(safe-area-inset-bottom)")) {
            // Try to read the safe area insets from CSS environment variables
            safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--satmp-safe-area-inset-left') || 0, 10);
            safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--satmp-safe-area-inset-bottom') || 0, 10);
            // Fallback: try direct env() if custom properties not set
            if (!safeAreaLeft) {
                safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('padding-left') || 0, 10);
            }
            if (!safeAreaBottom) {
                safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('padding-bottom') || 0, 10);
            }
        }
        // Default to 0 if not found
        safeAreaLeft = isNaN(safeAreaLeft) ? 0 : safeAreaLeft;
        safeAreaBottom = isNaN(safeAreaBottom) ? 0 : safeAreaBottom;
        const leftPadding = Math.max(30, safeAreaLeft);
        const bottomPadding = Math.max(30, safeAreaBottom);

const isMobile = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent) || window.screen.width < 900;
const mobileGameHeight = this.sys.game.config.height;
const feedbackButtonY = isMobile
    ? mobileGameHeight - bottomPadding - (this.design.BUTTON.HEIGHT / 2)
    : this.scale.height - bottomPadding - (this.design.BUTTON.HEIGHT / 2);

this.feedbackButton = this.createButton(
    "FEEDBACK",
    () => this.onFeedbackClick(),
    leftPadding + (this.design.BUTTON.WIDTH / 2),
    feedbackButtonY,
    'Share your feedback'
);

        // Reapply effects and layering
        this.addButtonClickEffects && this.addButtonClickEffects();
        this.ensureProperLayering && this.ensureProperLayering();
        this.ensureTextVisibility && this.ensureTextVisibility();
        this.updateCursor && this.updateCursor();
    }

    // Mode-specific word processing
    processSuggestedWord(word) {
        // In easy mode, we still allow the word but don't add it again
        // since it was already added in checkAndExplodeWord
        this.updateCursor();
    }

    

    onFeedbackClick() {
        this.scene.start('FeedbackScene', {
            mode: this.mode,
            levelValue: this.levelValue,
            topKValue: this.topKValue
        });
    }

    // Mode-specific scene setup
    create(data) {
        // --- Robust state reset for every transition ---
        this.resetGameState();

        // Re-apply mode-specific design/colors after reset
        this.mode = 'easy';
        this.design = DESIGN.UI;
        this.COLORS_HEX = COLORS_HEX;
        this.COLORS_TEXT = COLORS_TEXT;
        this.OUTLINE_WIDTH = this.design.OUTLINE.WIDTH;
        this.CORNER_RADIUS = this.design.OUTLINE.CORNER_RADIUS;

        // Log the data received from other mode for debugging
        console.log("GameSceneEasy received data:", data);
        this.registry.events.on('changedata', this.logRegistryChange, this);

        // Initialize with empty suggestion arrays
        this.aiSuggestedWords = [];
        this.suggestionBoxes = [];
        this.suggestionTexts = [];
        
        super.create && super.create();
        
        // Apply data passed from other modes if available
        if (data && data.progressPercentage !== undefined) {
            this.progressPercentage = data.progressPercentage;
            console.log("Setting progress percentage to:", this.progressPercentage);
        }
        if (data && data.levelValue !== undefined) {
            this.levelValue = data.levelValue;
        }
        if (data && data.topKValue !== undefined) {
            this.topKValue = data.topKValue;
        }
        if (data && data.originalWordCount !== undefined) {
            this.originalWordCount = data.originalWordCount;
        }
        if (data && data.aiWordCount !== undefined) {
            this.aiWordCount = data.aiWordCount;
        }
        if (data && data.totalWordCount !== undefined) {
            this.totalWordCount = data.totalWordCount;
        }
        if (data && data.wordCount !== undefined) {
            this.wordCount = data.wordCount;
        }
        
        this.cameras.main.scrollY = 0;
        // Centralized background creation
        createBackground(this, THEMES.easy.background, this.levelValue, this.wordStreak);
        this.createMenuBar();
        this.createPromptTextBox();
        this.createInputTextBox();
        this.updatePromptBasedOnLevel();

        const inputBoxWidth = this.cameras.main.width * (5 / 6);
        const padding = 20;
        const buttonPadding = 70; // Standard padding used for buttons
        const boxX = this.cameras.main.centerX - inputBoxWidth / 2;
        const buttonCenterX = boxX + inputBoxWidth - buttonPadding - this.design.BUTTON.WIDTH / 2;

        // Calculate the actual input box Y and height based on the layout in BaseGameScene
        // This matches the logic in createInputTextBox()
        const statsBoxHeight = 130;
        const menuBarHeight = this.menuBarHeight || 100;
        const statsDisplayY = menuBarHeight + padding;
        const statsBottomEdge = statsDisplayY + statsBoxHeight;
        const promptY = statsBottomEdge + 20;
        const promptBoxHeight = 80;
        const promptBottomEdge = promptY + promptBoxHeight;
        const inputBoxY = promptBottomEdge + 20;
        const inputBoxHeight = 240;
        const inputBoxBottomEdge = inputBoxY + inputBoxHeight;

        // Position button further below input box bottom edge (configurable gap from design.js)
        const outlineWidth = this.design.OUTLINE.WIDTH;
        const doneButtonY = inputBoxBottomEdge + outlineWidth / 2 + this.design.BUTTON.BELOW_TEXTBOX_GAP + this.design.BUTTON.HEIGHT / 2;

        // Create buttons with tooltips
        this.doneButton = this.createButton(
            "DONE", 
            () => this.onDoneButtonClick(), 
            buttonCenterX, 
            doneButtonY,
            'Submit your text for evaluation'
        );
        
        // this.resetButton = this.createButton(
        //     "RESET", 
        //     () => this.onResetButtonClick(), 
        //     buttonCenterX - 120, 
        //     buttonCenterY,
        //     'Clear text and start over'
        // );
        

const isMobile2 = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent) || window.screen.width < 900;
const mobileGameHeight2 = this.sys.game.config.height;
const feedbackButtonY2 = isMobile2
    ? mobileGameHeight2 - this.design.BUTTON.HEIGHT / 2 - padding
    : this.cameras.main.height - this.design.BUTTON.HEIGHT / 2 - padding;

this.feedbackButton = this.createButton(
    "FEEDBACK", 
    () => this.onFeedbackClick(), 
    this.design.BUTTON.WIDTH / 2 + padding, 
    feedbackButtonY2,
    'Share your feedback'
);
        
        // Mode toggle moved to settings popup

        // Initialize the progress bar with the percentage passed from the other mode
        this.createFailsCounter();
        console.log("EasyMode: Created fails counter with progress:", this.progressPercentage);
        this.updateProgressFill();
        

        
        // Create word count display
        this.createWordCountDisplay();
        
        this.inputActive = false;
        this.addButtonClickEffects();
        this.ensureProperLayering();
        this.ensureTextVisibility();
        this.updateCursor();
        
        // (Mode indicator replaced by toggle)
    }

    // Style methods
    getPromptTextStyle() {
        return {
            fontFamily: "IBM Plex Mono",
            fontSize: `${this.design.TEXTBOX_FONT_SIZE}px`,
            fill: this.COLORS_TEXT.PRIMARY,
            align: "center",
            lineSpacing: 6
        };
    }

    getPromptBoxStyle() {
        return {
            fillColor: this.COLORS_HEX.BOX_FILL,
            fillAlpha: 0.8,
            hasOutline: true,
            outlineWidth: this.OUTLINE_WIDTH,
            outlineColor: this.COLORS_HEX.BOX_OUTLINE,
            cornerRadius: this.CORNER_RADIUS
        };
    }

    getInputBoxStyle() {
        return {
            fillColor: this.COLORS_HEX.TEXT,
            fillAlpha: 0.95,
            hasOutline: true,
            outlineWidth: this.OUTLINE_WIDTH,
            outlineColor: this.COLORS_HEX.ACCENT,
            cornerRadius: this.CORNER_RADIUS
        };
    }

    getInputTextStyle() {
        return {
            fontFamily: "IBM Plex Mono",
            fontSize: `${this.design.TEXTBOX_FONT_SIZE}px`,
            fill: "#000",
            align: "left",
            lineSpacing: 6,
            wordWrap: { width: this.uiBoxWidth - 60 } // Add word wrap
        };
    }

    getAutocompleteTextStyle() {
        return {
            fontFamily: "IBM Plex Mono",
            fontSize: `${this.design.TEXTBOX_FONT_SIZE}px`,
            fill: "#ff0000",
            align: "left",
            alpha: 0.7, // Make slightly transparent
            wordWrap: { width: this.uiBoxWidth - 60 } // Add word wrap
        };
    }

    getMenuBarStyle() {
        return {
            backgroundColor: this.COLORS_HEX.BACKGROUND,
            borderColor: this.COLORS_HEX.ACCENT,
            borderWidth: this.OUTLINE_WIDTH,
            titleStyle: {
                fontFamily: 'barcade3d',
                fontSize: '50px',
                color: this.COLORS_TEXT.TITLE,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000',
                    blur: 2,
                    fill: true
                }
            }
        };
    }



    // Update background when level changes or streak changes
    updateBackgroundForLevel() {
        // Destroy existing background and all streak-specific visuals
        if (this.background) {
            // Clean up any streak-specific visuals first
            this.cleanupStreakVisuals();
            
            // Then destroy the background itself
            this.background.destroy();
        }
        
        // Log streak value for debugging
        console.log(`Creating background with streak: ${this.wordStreak}`);
        
        // Recreate background with the current level colors and streak value
        createBackground(this, THEMES.easy.background, this.levelValue, this.wordStreak);
        
        // Update mode indicator badge if it exists
        if (this.modeIndicator) {
            this.modeIndicator.destroy();
        }
    }
    
    cleanupParticles() {
        this.isShuttingDown = true;
        this.clearAllEffects && this.clearAllEffects();
        if (this.particleContainer) {
            this.particleContainer.destroy(true);
            this.particleContainer = null;
        }
    }

    clearAllEffects() {
        this.isCleaningUp = true;
        // Destroy all bubble containers
        if (this.bubbleContainers) {
            this.bubbleContainers.forEach(c => {
                if (c && c.destroy) c.destroy(true);
            });
            this.bubbleContainers = [];
        }
        // Kill all bubble tweens
        if (this.bubbleTweens) {
            this.bubbleTweens.forEach(tw => {
                if (tw && tw.remove) tw.remove();
            });
            this.bubbleTweens = [];
        }
        // Destroy particle container
        if (this.particleContainer) {
            this.particleContainer.destroy(true);
            this.particleContainer = null;
        }
        this.isCleaningUp = false;
    }

    shutdown() {
        this.cleanupParticles();
        if (super.shutdown) {
            super.shutdown();
        }
    }
}
