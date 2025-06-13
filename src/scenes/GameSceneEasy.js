import { DESIGN, EASY_COLORS_HEX as COLORS_HEX, EASY_COLORS_TEXT as COLORS_TEXT, THEMES } from "../config/design.js";
import { createBackground } from "../backgrounds/createBackground.js";
import ToggleFactory from "../utils/ToggleFactory.js";
import BaseGameScene from "./BaseGameScene.js";

// Device detection utility (available everywhere in this file)
const isMobile = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent) || window.screen.width < 900;

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
        // Use the parent class's relayoutScene to ensure consistent layout and prompt box positioning
        super.relayoutScene(width, height, isPortrait);
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
        // Use global UI scale for all elements
        this.uiScale = this.registry.get('uiScale') || 1;

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

        // Initialize with empty suggestion arrays
        this.aiSuggestedWords = [];
        this.suggestionBoxes = [];
        this.suggestionTexts = [];
        
        // Use parent class's create for all layout and UI
        super.create && super.create(data);

        // Centralized background creation
        createBackground(this, THEMES.easy.background, this.levelValue, this.wordStreak);
        this.createMenuBar();

        // Ensure correct layout after menu bar is created
        this.relayoutScene(
            this.cameras.main.width,
            this.cameras.main.height,
            this.cameras.main.height > this.cameras.main.width
        );

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

        this.inputActive = false;
        this.addButtonClickEffects();
        this.ensureProperLayering();
        this.ensureTextVisibility();
        this.updateCursor();
    }

    // Style methods are now provided by BaseGameScene using the centralized textStyles.js



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
