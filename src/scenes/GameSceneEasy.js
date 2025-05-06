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
        this.scene.start('FeedbackScene', {mode: this.mode});
    }

    // Mode-specific scene setup
    create(data) {
        // Log the data received from other mode for debugging
        console.log("GameSceneEasy received data:", data);
        
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
        
        this.resetButton = this.createButton(
            "RESET", 
            () => this.onResetButtonClick(), 
            buttonCenterX - 120, 
            buttonCenterY,
            'Clear text and start over'
        );
        

        this.feedbackButton = this.createButton(
            "FEEDBACK", 
            () => this.onFeedbackClick(), 
            this.design.BUTTON.WIDTH / 2 + padding, 
            this.cameras.main.height - this.design.BUTTON.HEIGHT / 2 - padding,
            'Share your feedback'
        );
        
        // Create a mode toggle switch in the top left where the indicator was
        this.modeToggle = ToggleFactory.createToggle(
            this,
            this.mode,
            (newMode) => this.scene.start('GameSceneHard', { // Switch to hard mode
                progressPercentage: this.progressPercentage,
                levelValue: this.levelValue,
                topKValue: this.topKValue,
                originalWordCount: this.originalWordCount,
                aiWordCount: this.aiWordCount,
                totalWordCount: this.totalWordCount,
                wordCount: this.wordCount
            }),
            padding,
            this.menuBarHeight + padding
        );

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
            fillColor: this.COLORS_HEX.BACKGROUND,
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


    addSoftGlow(ctx, width, height) {
        const glowPoints = [
            { x: width * 0.2, y: height * 0.2, size: 200 },
            { x: width * 0.8, y: height * 0.3, size: 180 },
            { x: width * 0.3, y: height * 0.7, size: 220 },
            { x: width * 0.7, y: height * 0.8, size: 190 },
            { x: width * 0.5, y: height * 0.5, size: 250 }
        ];

        glowPoints.forEach(point => {
            const glow = ctx.createRadialGradient(
                point.x, point.y, 0,
                point.x, point.y, point.size
            );
            glow.addColorStop(0, 'rgba(2, 5, 29, 0.15)');   // Deep midnight blue
            glow.addColorStop(0.5, 'rgba(3, 6, 45, 0.1)');  // Dark navy
            glow.addColorStop(1, 'rgba(1, 2, 19, 0)');      // Transparent nearly black

            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    addFlowingPatterns(ctx, width, height) {
        const patternCount = 8;
        for (let i = 0; i < patternCount; i++) {
            const startX = Math.random() * width;
            const startY = Math.random() * height;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            // Create flowing curve
            const cp1x = startX + Math.random() * 200 - 100;
            const cp1y = startY + Math.random() * 200 - 100;
            const cp2x = startX + Math.random() * 200 - 100;
            const cp2y = startY + Math.random() * 200 - 100;
            const endX = startX + Math.random() * 200 - 100;
            const endY = startY + Math.random() * 200 - 100;
            
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            
            const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, 'rgba(2, 5, 29, 0.05)');   // Deep midnight blue
            gradient.addColorStop(1, 'rgba(5, 26, 47, 0.03)');  // Dark teal-navy
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = Math.random() * 3 + 1;
            ctx.stroke();
        }
    }
    
    addEnhancedNoise(ctx, width, height, opacity) {
        for (let x = 0; x < width; x += 3) {
            for (let y = 0; y < height; y += 3) {
                if (Math.random() > 0.95) {  // Reduce frequency
                    const alpha = Math.random() * (opacity * 0.3);  // Reduce opacity
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }
    
    addModerateDensityParticles(ctx, width, height) {
        for (let i = 0; i < 85; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 1.8 + 0.4;
            const alpha = Math.random() * 0.2 + 0.1;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    addSubtleGlowAreas(ctx, width, height) {
        const glowPositions = [
            {x: width * 0.2, y: height * 0.2, size: 120, color: [2, 5, 29]},    // Deep midnight blue
            {x: width * 0.8, y: height * 0.3, size: 150, color: [3, 6, 45]},    // Dark navy
            {x: width * 0.3, y: height * 0.7, size: 130, color: [5, 26, 47]},   // Dark teal-navy
            {x: width * 0.7, y: height * 0.8, size: 140, color: [1, 2, 19]},    // Nearly black
            {x: width * 0.5, y: height * 0.5, size: 180, color: [2, 5, 29]},    // Deep midnight blue
        ];
        
        glowPositions.forEach(glow => {
            const alpha = Math.random() * 0.06 + 0.04;
            
            const gradientGlow = ctx.createRadialGradient(
                glow.x, glow.y, 0, 
                glow.x, glow.y, glow.size
            );
            gradientGlow.addColorStop(0, `rgba(${glow.color[0]}, ${glow.color[1]}, ${glow.color[2]}, ${alpha})`);
            gradientGlow.addColorStop(1, `rgba(${glow.color[0]}, ${glow.color[1]}, ${glow.color[2]}, 0)`);
            
            ctx.fillStyle = gradientGlow;
            ctx.beginPath();
            ctx.arc(glow.x, glow.y, glow.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Update background when level changes
    updateBackgroundForLevel() {
        this.clearAllEffects && this.clearAllEffects();

        // Destroy existing background
        if (this.background) {
            this.background.destroy();
        }

        // Recreate background with the current level colors using centralized logic
        createBackground(this, THEMES.easy.background, this.levelValue);

        // Update mode indicator badge if it exists
        if (this.modeIndicator) {
            this.modeIndicator.destroy();
        }

        // Recreate mode indicator with current level styling
        //this.addModeIndicator('EASY', 0x64d2ba);
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
