import { DESIGN, EASY_COLORS_HEX as COLORS_HEX, EASY_COLORS_TEXT as COLORS_TEXT } from "../config/design.js";
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
        this.createEasyModeBackground();
        this.createFloatingParticles();
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

    // Mode-specific background methods
    createEasyModeBackground() {
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        
        // Create a gradient texture key based on the current level
        let gradientTextureKey = `easyModeBackground_level_${this.levelValue}`;
    
        if (!this.textures.exists(gradientTextureKey)) {
            let gradientCanvas = this.textures.createCanvas(gradientTextureKey, width, height);
            let ctx = gradientCanvas.getContext();
    
            if (!ctx) {
                console.error("Failed to get canvas context for background effect.");
                return;
            }
    
            let grd = ctx.createLinearGradient(0, 0, width, height);
            
            // Different color gradients based on level
            if (this.levelValue === 1) {
                grd.addColorStop(0, "#251a3f"); // Original colors
                grd.addColorStop(0.3, "#2d1f4c");
                grd.addColorStop(0.7, "#362758");
                grd.addColorStop(1, "#3d2c64");
            } else if (this.levelValue === 2) {
                grd.addColorStop(0, "#1e1c48"); // Slightly bluer purples
                grd.addColorStop(0.3, "#282256");
                grd.addColorStop(0.7, "#312963");
                grd.addColorStop(1, "#383070");
            } else { // Level 3
                grd.addColorStop(0, "#171e51"); // Deeper, more intense purples
                grd.addColorStop(0.3, "#1e255f");
                grd.addColorStop(0.7, "#252c6e");
                grd.addColorStop(1, "#2c337c");
            }
            
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, width, height);
            
            this.addEnhancedNoise(ctx, width, height, 0.04);
            this.addModerateDensityParticles(ctx, width, height);
            this.addSubtleGlowAreas(ctx, width, height);
            
            gradientCanvas.refresh();
        }
    
        this.background = this.add.image(0, 0, gradientTextureKey)
            .setOrigin(0)
            .setDisplaySize(width, height)
            .setDepth(-1);
    
        this.tweens.add({
            targets: this.background,
            alpha: { from: 0.95, to: 1 },
            duration: 6000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        this.tweens.add({
            targets: this.background,
            scaleX: { from: 1, to: 1.03 },
            scaleY: { from: 1, to: 1.03 },
            duration: 8000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }
    
    addEnhancedNoise(ctx, width, height, opacity) {
        for (let x = 0; x < width; x += 3) {
            for (let y = 0; y < height; y += 3) {
                if (Math.random() > 0.93) {
                    const alpha = Math.random() * opacity;
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
            {x: width * 0.2, y: height * 0.2, size: 120, color: [180, 200, 255]},
            {x: width * 0.8, y: height * 0.3, size: 150, color: [190, 170, 255]},
            {x: width * 0.3, y: height * 0.7, size: 130, color: [200, 180, 255]},
            {x: width * 0.7, y: height * 0.8, size: 140, color: [170, 190, 255]},
            {x: width * 0.5, y: height * 0.5, size: 180, color: [190, 190, 255]},
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
        
        // Destroy existing background
        if (this.background) {
            this.background.destroy();
        }
        
        // Recreate background with the current level colors
        this.createEasyModeBackground();
        
        // Update mode indicator badge if it exists
        if (this.modeIndicator) {
            this.modeIndicator.destroy();
        }
        
        // Recreate mode indicator with current level styling
        //this.addModeIndicator('EASY', 0x64d2ba);
    }
    
    createFloatingParticles() {
        this.particleContainer = this.add.container(0, 0);
        this.particleContainer.setDepth(-0.5);
        
        for (let i = 0; i < 18; i++) {
            const x = Math.random() * this.cameras.main.width;
            const y = Math.random() * this.cameras.main.height;
            const size = Math.random() * 3 + 1.5;
            const alpha = Math.random() * 0.3 + 0.1;
            
            const particle = this.add.graphics();
            particle.fillStyle(0x90caf9, alpha * 0.7);
            particle.fillCircle(0, 0, size);
            
            const glow = this.add.graphics();
            glow.fillStyle(0x90caf9, alpha * 0.3);
            glow.fillCircle(0, 0, size * 2);
            
            const particleContainer = this.add.container(x, y, [glow, particle]);
            this.particleContainer.add(particleContainer);
            
            this.tweens.add({
                targets: particleContainer,
                y: y + (Math.random() * 70 - 35),
                x: x + (Math.random() * 70 - 35),
                alpha: { from: alpha, to: alpha * 0.6 },
                duration: 7000 + Math.random() * 8000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: Math.random() * 3000
            });
        }
    }
}
