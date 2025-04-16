import { COLORS_HEX, COLORS_TEXT, OUTLINE_WIDTH, CORNER_RADIUS, buttonHeight, buttonSpacing, buttonWidth } from "../config/design_hard.js";
import { PROGRESS_BAR } from "../config/design_easy.js";
import BaseGameScene from "./BaseGameScene.js";

export default class GameSceneHard extends BaseGameScene {
    constructor() {
        super({ key: 'GameSceneHard' });
        this.mode = 'hard';
    }

    // Mode-specific word processing
    processSuggestedWord(word) {
        // In hard mode, we don't need to do anything special
        // since BaseGameScene already removes the word
        this.updateCursor();
    }

    // Mode-specific navigation
    onEasyModeClick() {
        this.scene.start('GameSceneEasy', {mode: 'easy'});
    }

    onFeedbackClick() {
        this.scene.start('FeedbackScene', {mode: this.mode});
    }

    // Mode-specific scene setup
    create() {

        super.create && super.create();
        this.cameras.main.scrollY = 0;
        this.createBackgroundEffect();
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
        this.easyButton = this.createButton(
            "EASY", 
            () => this.onEasyModeClick(), 
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
            lineSpacing: 6,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000',
                blur: 2,
                fill: true
            }
        };
    }

    getPromptBoxStyle() {
        return {
            fillColor: COLORS_HEX.BACKGROUND,
            fillAlpha: 0.5,
            hasOutline: true,
            outlineWidth: OUTLINE_WIDTH,
            outlineColor: COLORS_HEX.BLUE,
            cornerRadius: CORNER_RADIUS
        };
    }

    getInputBoxStyle() {
        return {
            fillColor: 0xffffff,
            fillAlpha: 0.9,
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
            shadow: {
                offsetX: 0,
                offsetY: 1,
                color: '#fff',
                blur: 0,
                fill: true
            }
        };
    }

    getAutocompleteTextStyle() {
        return {
            fontFamily: "Nunito",
            fontSize: "22px",
            fill: "#ff0000",
            align: "left",
            alpha: 1,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000',
                blur: 1,
                fill: true
            }
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
                    offsetX: 3,
                    offsetY: 3,
                    color: '#000',
                    blur: 3,
                    fill: true
                }
            }
        };
    }



    // Mode-specific background methods
    createBackgroundEffect() {
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        
        let gradientTextureKey = 'gradientBackground';
    
        if (!this.textures.exists(gradientTextureKey)) {
            let gradientCanvas = this.textures.createCanvas(gradientTextureKey, width, height);
            let ctx = gradientCanvas.getContext();
    
            if (!ctx) {
                console.error("Failed to get canvas context for background effect.");
                return;
            }
    
            let grd = ctx.createRadialGradient(
                width * 0.3, height * 0.3, 0,
                width * 0.5, height * 0.5, width * 0.8
            );
            
            grd.addColorStop(0, "#1f0c33");
            grd.addColorStop(0.4, "#2a1145");
            grd.addColorStop(0.8, "#3a1f5d");
            grd.addColorStop(1, "#321b4a");
    
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, width, height);
            
            this.addNoiseTexture(ctx, width, height, 0.03);
            this.addStarParticles(ctx, width, height);
            
            gradientCanvas.refresh();
        }
    
        this.background = this.add.image(0, 0, gradientTextureKey)
            .setOrigin(0)
            .setDisplaySize(width, height)
            .setDepth(-1);
    
        this.tweens.add({
            targets: this.background,
            alpha: { from: 0.95, to: 1 },
            duration: 5000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        this.tweens.add({
            targets: this.background,
            scaleX: { from: 1, to: 1.05 },
            scaleY: { from: 1, to: 1.05 },
            duration: 15000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }
    
    addNoiseTexture(ctx, width, height, opacity) {
        for (let x = 0; x < width; x += 2) {
            for (let y = 0; y < height; y += 2) {
                if (Math.random() > 0.95) {
                    const alpha = Math.random() * opacity;
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.fillRect(x, y, 2, 2);
                }
            }
        }
    }
    
    addStarParticles(ctx, width, height) {
        for (let i = 0; i < 75; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 2 + 0.5;
            const alpha = Math.random() * 0.5 + 0.2;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 40 + 20;
            const alpha = Math.random() * 0.05 + 0.01;
            
            const glow = ctx.createRadialGradient(x, y, 0, x, y, size);
            glow.addColorStop(0, `rgba(180, 120, 255, ${alpha})`);
            glow.addColorStop(1, 'rgba(180, 120, 255, 0)');
            
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    createFloatingParticles() {
        this.particleContainer = this.add.container(0, 0);
        this.particleContainer.setDepth(-0.5);
        
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * this.cameras.main.width;
            const y = Math.random() * this.cameras.main.height;
            const size = Math.random() * 4 + 2;
            const alpha = Math.random() * 0.3 + 0.1;
            
            const particle = this.add.graphics();
            particle.fillStyle(0xb47aff, alpha);
            particle.fillCircle(0, 0, size);
            
            const glow = this.add.graphics();
            glow.fillStyle(0xb47aff, alpha * 0.5);
            glow.fillCircle(0, 0, size * 2);
            
            const particleContainer = this.add.container(x, y, [glow, particle]);
            this.particleContainer.add(particleContainer);
            
            this.tweens.add({
                targets: particleContainer,
                y: y + (Math.random() * 100 - 50),
                x: x + (Math.random() * 100 - 50),
                alpha: { from: alpha, to: alpha * 0.5 },
                duration: 5000 + Math.random() * 10000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: Math.random() * 3000
            });
        }
    }
}
