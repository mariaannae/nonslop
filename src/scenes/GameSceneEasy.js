import { COLORS_HEX, COLORS_TEXT, OUTLINE_WIDTH, CORNER_RADIUS, buttonHeight, buttonSpacing, buttonWidth, PROGRESS_BAR} from "../config/design_easy.js";
import BaseGameScene from "./BaseGameScene.js";

export default class GameSceneEasy extends BaseGameScene {
    constructor() {
        super({ key: 'GameSceneEasy' });
        this.mode = 'easy';
    }

    // Mode-specific word processing
    processSuggestedWord(word) {
        // In easy mode, we still allow the word but don't add it again
        // since it was already added in checkAndExplodeWord
        this.updateCursor();
    }

    // Mode-specific navigation
    onHardModeClick() {
        this.scene.start('GameSceneHard', {mode: 'hard', llmEngine: this.llmEngine});
    }

    onFeedbackClick() {
        this.scene.start('FeedbackScene', {mode: this.mode, llmEngine: this.llmEngine});
    }

    // Mode-specific scene setup
    create() {
        super.create && super.create();
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
        const buttonCenterX = inputBoxX + inputBoxWidth / 2 - buttonWidth - 20;
        const buttonCenterY = inputBoxY + inputBoxHeight / 2 + buttonSpacing;
        const padding = 20;

        // Create buttons
        this.doneButton = this.createButton("DONE", () => this.onDoneButtonClick(), buttonCenterX, buttonCenterY);
        this.resetButton = this.createButton("RESET", () => this.onResetButtonClick(), buttonCenterX - 120, buttonCenterY);
        this.feedbackButton = this.createButton(
            "FEEDBACK", 
            () => this.onFeedbackClick(), 
            this.cameras.main.width - buttonWidth / 2 - padding, 
            this.cameras.main.height - buttonHeight / 2 - padding
        );
        this.hardButton = this.createButton(
            "HARD", 
            () => this.onHardModeClick(), 
            buttonWidth / 2 + padding, 
            this.cameras.main.height - buttonHeight / 2 - padding
        );

        this.createFailsCounter();
        this.createOutputTextBox();
        this.inputActive = false;
        this.addButtonClickEffects();
        this.ensureProperLayering();
        this.ensureTextVisibility();
        this.updateCursor();
    }

    // Style methods
    getPromptTextStyle() {
        return {
            fontFamily: "Nunito",
            fontSize: "22px",
            color: COLORS_TEXT.WHITE,
            align: "center",
            lineSpacing: 6
        };
    }

    getPromptBoxStyle() {
        return {
            fillColor: COLORS_HEX.BLUE_BACKGROUND,
            fillAlpha: 0.8,
            hasOutline: true,
            outlineWidth: OUTLINE_WIDTH,
            outlineColor: COLORS_HEX.BOXOUTLINE,
            cornerRadius: CORNER_RADIUS
        };
    }

    getInputBoxStyle() {
        return {
            fillColor: 0xffffff,
            fillAlpha: 0.95,
            hasOutline: true,
            outlineWidth: OUTLINE_WIDTH,
            outlineColor: COLORS_HEX.MIDPURPLE,
            cornerRadius: CORNER_RADIUS
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
            backgroundColor: COLORS_HEX.BACKGROUND,
            borderColor: COLORS_HEX.MIDPURPLE,
            borderWidth: OUTLINE_WIDTH,
            titleStyle: {
                fontFamily: 'barcade3d',
                fontSize: '50px',
                color: COLORS_TEXT.YELLOW,
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
        
        let gradientTextureKey = 'easyModeBackground';
    
        if (!this.textures.exists(gradientTextureKey)) {
            let gradientCanvas = this.textures.createCanvas(gradientTextureKey, width, height);
            let ctx = gradientCanvas.getContext();
    
            if (!ctx) {
                console.error("Failed to get canvas context for background effect.");
                return;
            }
    
            let grd = ctx.createLinearGradient(0, 0, width, height);
            grd.addColorStop(0, "#251a3f");
            grd.addColorStop(0.3, "#2d1f4c");
            grd.addColorStop(0.7, "#362758");
            grd.addColorStop(1, "#3d2c64");
            
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
