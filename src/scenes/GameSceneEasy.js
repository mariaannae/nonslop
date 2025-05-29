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
        createBackground(this, THEMES.easy.background, this.levelValue);
        this.createMenuBar();
        this.createPromptTextBox();
        this.createInputTextBox();
        this.updatePromptBasedOnLevel();

        const inputBoxX = this.cameras.main.centerX;
        const inputBoxY = this.cameras.main.centerY;
        const inputBoxWidth = this.cameras.main.width * (5 / 6);
        const inputBoxHeight = 240;
        const buttonCenterX = inputBoxX + inputBoxWidth / 2 - this.design.BUTTON.WIDTH - 20;
        const buttonCenterY = inputBoxY + inputBoxHeight / 2 + this.design.BUTTON.SPACING;
        const padding = 20;

        // Create buttons with tooltips
        this.doneButton = this.createButton(
            "DONE", 
            () => this.onDoneButtonClick(), 
            buttonCenterX, 
            buttonCenterY,
            'Submit your text for evaluation'
        );
        
        // this.resetButton = this.createButton(
        //     "RESET", 
        //     () => this.onResetButtonClick(), 
        //     buttonCenterX - 120, 
        //     buttonCenterY,
        //     'Clear text and start over'
        // );
        

        this.feedbackButton = this.createButton(
            "FEEDBACK", 
            () => this.onFeedbackClick(), 
            this.design.BUTTON.WIDTH / 2 + padding, 
            this.cameras.main.height - this.design.BUTTON.HEIGHT / 2 - padding,
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
            fontFamily: "Nunito",
            fontSize: "22px",
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
            fontFamily: "Nunito",
            fontSize: "22px",
            fill: "#000",
            align: "left",
            lineSpacing: 6,
            wordWrap: { width: this.uiBoxWidth - 60 } // Add word wrap
        };
    }

    getAutocompleteTextStyle() {
        return {
            fontFamily: "Nunito",
            fontSize: "22px",
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



    // Update background when level changes
    updateBackgroundForLevel() {
        // Destroy existing background
        if (this.background) {
            this.background.destroy();
        }
        
        // Recreate background with the current level colors using centralized logic
        createBackground(this, THEMES.easy.background, this.levelValue);
        
        // Destroy and recreate any particles if they exist
        if (this.particleContainer) {
            this.particleContainer.destroy();
            this.createFloatingParticles && this.createFloatingParticles();
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
