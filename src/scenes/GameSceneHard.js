import { COLORS_HEX, COLORS_TEXT, OUTLINE_WIDTH, CORNER_RADIUS, buttonHeight, buttonSpacing, buttonWidth } from "../config/design_hard.js";
import { PROGRESS_BAR } from "../config/design_easy.js";
import BaseGameScene from "./BaseGameScene.js";

export default class GameSceneHard extends BaseGameScene {
    constructor() {
        super({ key: 'GameSceneHard' });
        this.mode = 'hard';
    }

    // ...existing code...

    // Override setupInputHandlers to prevent using AI-suggested words
    setupInputHandlers() {
        // Call the parent method to get the base functionality
        super.setupInputHandlers();
        
        // Remove existing listeners and add our modified ones
        this.input.keyboard.removeAllListeners('keydown');
        this.input.keyboard.on("keydown", (event) => {
            this.inputActive = true;

            if(this.activeTimeout) {
                clearTimeout(this.activeTimeout);
            }

            this.activeTimeout = setTimeout(() => {
                this.inputActive = false;
            }, 3000);

            const ignoreKeys = [
                'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 
                'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 
                'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
                'NumLock', 'ScrollLock', 'Pause', 'Insert', 'Home', 
                'PageUp', 'Delete', 'End', 'PageDown', 'ArrowRight', 
                'ArrowLeft', 'ArrowDown', 'ArrowUp'
            ];
            
            if (ignoreKeys.includes(event.key)) {
                return;
            }

            // Handle space key
            if (event.key === " ") {
                // Check if the last word is an AI suggestion
                const words = this.userInput.trim().split(/\s+/);
                const lastWord = words[words.length - 1];
                
                if (lastWord && lastWord.length > 0) {
                    // Convert to lowercase for case-insensitive comparison
                    const lastWordLower = lastWord.toLowerCase();
                    const isAIWord = this.aiSuggestedWords && 
                        this.aiSuggestedWords.some(word => word.toLowerCase() === lastWordLower);
                    
                    // In the space key handler where AI words are blocked (around line 52):
                if (isAIWord) {
                    console.log("AI word blocked:", lastWord);
                    // Remove the last word instead of adding it
                    this.userInput = words.slice(0, -1).join(" ");
                    if (this.userInput.length > 0) {
                        this.userInput += " ";
                    }
                    
                    // Show feedback message
                    this.showBlockFeedback(lastWord);
                    
                    // Decrement score for trying to use AI word
                    this.updateFailsCounter(false);
                    
                    this.updateCursor();
                    this.generateAISuggestions(this.userInput);
                    return;
                }
                    
                    console.log("Non-AI word used:", lastWord);
                    this.wordCount++;
                    this.updateFailsCounter(true);
                }
                
                this.userInput += " ";
                this.updateCursor();
                this.generateAISuggestions(this.userInput);
            } 
            // Handle tab key
            // Handle tab key
        else if (event.key === "Tab") {
            event.preventDefault();
            
            if (this.aiSuggestedWords && this.aiSuggestedWords.length > 0) {
                // Get current word being typed
                const lastSpaceIndex = this.userInput.lastIndexOf(' ');
                const lastNewlineIndex = this.userInput.lastIndexOf('\n');
                const lastBreakIndex = Math.max(lastSpaceIndex, lastNewlineIndex);
                const currentWord = lastBreakIndex >= 0 ? this.userInput.slice(lastBreakIndex + 1) : this.userInput;
                const previousContent = lastBreakIndex >= 0 ? this.userInput.slice(0, lastBreakIndex + 1) : '';
                
                // Find the suggestion that would be autocompleted
                let suggestion;
                if (!currentWord || currentWord.length === 0) {
                    suggestion = this.aiSuggestedWords[0];
                } else {
                    suggestion = this.aiSuggestedWords.find(word => 
                        word.toLowerCase().startsWith(currentWord.toLowerCase())
                    ) || this.aiSuggestedWords[0];
                }
                
                if (suggestion) {
                    console.log("AI autocomplete blocked:", suggestion);
                    
                    // Show feedback message
                    this.showBlockFeedback(suggestion);
                    
                    // Remove the current word the user was typing
                    this.userInput = previousContent;
                    
                    // Decrement score for trying to use AI word
                    this.updateFailsCounter(false);
                    
                    // Update the cursor and show new suggestions
                    this.updateCursor();
                    this.generateAISuggestions(this.userInput);
                }
            }
        }
            // Handle enter key
            else if (event.key === "Enter") {
                // Check if the last word is an AI suggestion
                const words = this.userInput.trim().split(/\s+/);
                const lastWord = words[words.length - 1];
                
                if (lastWord && lastWord.length > 0) {
                    // Convert to lowercase for case-insensitive comparison
                    const lastWordLower = lastWord.toLowerCase();
                    const isAIWord = this.aiSuggestedWords && 
                        this.aiSuggestedWords.some(word => word.toLowerCase() === lastWordLower);
                    
                    if (isAIWord) {
                        console.log("AI word blocked:", lastWord);
                        // Remove the last word
                        this.userInput = words.slice(0, -1).join(" ");
                        if (this.userInput.length > 0) {
                            this.userInput += " ";
                        }
                        
                        // Show feedback message
                        this.showBlockFeedback(lastWord);
                        
                        // Decrement score for trying to use AI word
                        this.updateFailsCounter(false);
                        
                        this.updateCursor();
                        this.generateAISuggestions(this.userInput);
                        return;
                    }
                    
                    console.log("Non-AI word used:", lastWord);
                    this.wordCount++;
                    this.updateFailsCounter(true);
                }
                
                this.userInput += "\n";
                this.updateCursor();
                this.generateAISuggestions(this.userInput);
            } 
            // Handle regular character input
            else if (event.key.length === 1) {
                this.userInput += event.key;
                this.updateCursor();
            } 
            // Handle backspace
            else if (event.key === "Backspace") {
                this.userInput = this.userInput.slice(0, -1);
                this.updateCursor();
                
                // Only generate new suggestions if we're at a word boundary
                const lastSpaceIndex = this.userInput.lastIndexOf(' ');
                const lastNewlineIndex = this.userInput.lastIndexOf('\n');
                const lastBreakIndex = Math.max(lastSpaceIndex, lastNewlineIndex);
                if (lastBreakIndex === this.userInput.length - 1) {
                    this.generateAISuggestions(this.userInput);
                }
            }
            
            this.updateCursor();
        });
    }

    // Add a method to show feedback when a word is blocked
    // Replace the showBlockFeedback method with this fixed version
    showBlockFeedback(blockedWord) {
        // Create a text notification
        const text = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100,
            `"${blockedWord}" blocked - AI suggestion!`,
            {
                fontFamily: 'Nunito',
                fontSize: '24px',
                fill: '#ff0000',
                stroke: '#000000',
                strokeThickness: 4,
                backgroundColor: '#00000066',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5).setDepth(100).setAlpha(0);
        
        // Fade in
        this.tweens.add({
            targets: text,
            alpha: 1,
            duration: 200,
            onComplete: () => {
                // Hold at visible
                this.tweens.add({
                    targets: text,
                    alpha: 1, 
                    duration: 1000,
                    onComplete: () => {
                        // Fade out
                        this.tweens.add({
                            targets: text,
                            alpha: 0,
                            duration: 200,
                            onComplete: () => text.destroy()
                        });
                    }
                });
            }
        });
        
        // Add a brief screen flash effect
        const flash = this.add.rectangle(
            0, 0, 
            this.cameras.main.width, 
            this.cameras.main.height,
            0xff0000, 0.2
        ).setOrigin(0).setDepth(90).setAlpha(0);
        
        this.tweens.add({
            targets: flash,
            alpha: { from: 0.2, to: 0 },
            duration: 300,
            onComplete: () => flash.destroy()
        });
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
            this.cameras.main.width - buttonWidth / 2 - padding, 
            this.cameras.main.height - buttonHeight / 2 - padding,
            'Share your feedback'
        );
        
        this.easyButton = this.createButton(
            "EASY", 
            () => this.onEasyModeClick(), 
            buttonWidth / 2 + padding, 
            this.cameras.main.height - buttonHeight / 2 - padding,
            'Switch to Easy mode: AI suggestions allowed'
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
