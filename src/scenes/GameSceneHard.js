import { getDesign } from "../config/design.js";
import ToggleFactory from "../utils/ToggleFactory.js";
import BaseGameScene from "./BaseGameScene.js";

export default class GameSceneHard extends BaseGameScene {
    constructor() {
        super({ key: 'GameSceneHard' });
        this.mode = 'hard';
        // Get design configuration for hard mode
        this.design = getDesign('hard');
        
        // Extract needed values for easier access
        this.COLORS_HEX = this.design.COLORS_HEX;
        this.COLORS_TEXT = this.design.COLORS_TEXT;
        this.OUTLINE_WIDTH = this.design.OUTLINE_WIDTH;
        this.CORNER_RADIUS = this.design.CORNER_RADIUS;
        this.PROGRESS_BAR = this.design.PROGRESS_BAR;
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
                    
                     // Find the last word boundary position
                    const lastWordRegex = /\S+$/;
                    const match = this.userInput.match(lastWordRegex);
                    
                    if (match && match.index > 0) {
                        // Remove only the last word, preserving all formatting
                        this.userInput = this.userInput.substring(0, match.index);
                    } else {
                        // If this is the only word, just clear the input
                        this.userInput = '';
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
    
    // Add a visual mode indicator with a more intense style for hard mode
    addModeIndicator(modeName, color) {
        const padding = 20;
        const modeIndicator = this.add.container(padding, this.menuBarHeight + padding);
        modeIndicator.setDepth(50);
        
        // Create edgy background shape for hard mode
        const bg = this.add.graphics();
        bg.fillStyle(color, 0.9);
        bg.lineStyle(3, 0xffffff, 0.9);
        
        // Create a jagged pill shape for hard mode
        const width = 120;
        const height = 40;
        const jaggedness = 5;
        
        bg.beginPath();
        
        // Top edge with jagged effect
        for (let x = 0; x < width; x += 10) {
            const y = (x % 20 === 0) ? -jaggedness : 0;
            if (x === 0) {
                bg.moveTo(x, height/2 + y);
            } else {
                bg.lineTo(x, height/2 + y);
            }
        }
        
        // Right edge with jagged effect
        for (let y = height/2; y < height*1.5; y += 10) {
            const x = (y % 20 === 0) ? width + jaggedness : width;
            bg.lineTo(x, y);
        }
        
        // Bottom edge with jagged effect
        for (let x = width; x > 0; x -= 10) {
            const y = (x % 20 === 0) ? height + jaggedness : height;
            bg.lineTo(x, y);
        }
        
        // Left edge with jagged effect
        for (let y = height; y > height/2; y -= 10) {
            const x = (y % 20 === 0) ? -jaggedness : 0;
            bg.lineTo(x, y);
        }
        
        bg.closePath();
        bg.fill();
        bg.stroke();
        
        // Create text with more aggressive styling
        const text = this.add.text(width/2, height/2, modeName, {
            fontFamily: 'Nunito',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Add pulsing glow effect
        text.setShadow(0, 0, '#ff0000', 5, true, true);
        
        // Add to container
        modeIndicator.add([bg, text]);
        
        // Add more dynamic animation
        this.tweens.add({
            targets: modeIndicator,
            scaleX: { from: 1, to: 1.05 },
            scaleY: { from: 1, to: 1.05 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // Add subtle rotation
        this.tweens.add({
            targets: modeIndicator,
            angle: { from: -1, to: 1 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        return modeIndicator;
    }

    // Mode-specific word processing
    processSuggestedWord(word) {
        // In hard mode, we don't need to do anything special
        // since BaseGameScene already removes the word
        this.updateCursor();
    }

    // Mode-specific navigation
    // onEasyModeClick() {
    //     // Reset data when transitioning between modes
    //     const dataToTransfer = {
    //         mode: 'easy',
    //         // Reset progress and level values rather than transferring current state
    //         progressPercentage: this.PROGRESS_BAR.INITIAL,
    //         levelValue: 1,
    //         topKValue: this.topKValue || 1,
    //         // Reset word counts
    //         wordCount: 0,
    //         originalWordCount: 0,
    //         aiWordCount: 0,
    //         totalWordCount: 0
    //     };
        
    //     // Safety check - log what we're transferring
    //     console.log("Transferring to Easy mode with reset data:", dataToTransfer);
        
    //     // Prepare for scene transition by cleaning up resources
    //     this.prepareForSceneTransition();
        
    //     // Give a small delay to ensure cleanup completes
    //     this.time.delayedCall(50, () => {
    //         this.scene.start('GameSceneEasy', dataToTransfer);
    //     });
    // }

    onFeedbackClick() {
        this.scene.start('FeedbackScene', {mode: this.mode});
    }

    // Mode-specific scene setup
    create(data) {
        // Log the data received from other mode for debugging
        console.log("GameSceneHard received data:", data);
        
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
        const buttonCenterX = inputBoxX + inputBoxWidth / 2 - this.design.buttonWidth - 20;
        const buttonCenterY = inputBoxY + inputBoxHeight / 2 + this.design.buttonSpacing;
        const padding = 20;

        // Create buttons with tooltips
        this.doneButton = this.createButton(
            "DONE", 
            () => this.onDoneButtonClick(), 
            buttonCenterX, 
            buttonCenterY,
            'Submit your text for evaluation'
        );

        //console.log(this.doneButton)
        
        this.resetButton = this.createButton(
            "RESET", 
            () => this.onResetButtonClick(), 
            buttonCenterX - 120, 
            buttonCenterY,
            'Clear text and start over'
        );
        
        // this.feedbackButton = this.createButton(
        //     "FEEDBACK", 
        //     () => this.onFeedbackClick(), 
        //     this.cameras.main.width - this.design.buttonWidth / 2 - padding, 
        //     this.cameras.main.height - this.design.buttonHeight / 2 - padding,
        //     'Share your feedback'
        // );
        this.feedbackButton = this.createButton(
            "FEEDBACK", 
            () => this.onFeedbackClick(), 
            this.design.buttonWidth / 2 + padding, 
            this.cameras.main.height - this.design.buttonHeight / 2 - padding,
            'Share your feedback'
        );

        // Create a mode toggle switch in the top left where the indicator was
        this.modeToggle = ToggleFactory.createToggle(
            this,
            this.mode,
            (newMode) => this.scene.start('GameSceneEasy', { // Switch to easy mode
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
        
        // this.easyButton = this.createButton(
        //     "EASY", 
        //     () => this.onEasyModeClick(), 
        //     this.design.buttonWidth / 2 + padding, 
        //     this.cameras.main.height - this.design.buttonHeight / 2 - padding,
        //     'Switch to Easy mode: AI suggestions allowed'
        // );

        // Initialize the progress bar with the percentage passed from the other mode
        this.createFailsCounter();
        console.log("HardMode: Created fails counter with progress:", this.progressPercentage);
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
            color: this.COLORS_TEXT.WHITE,
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
            fillColor: this.COLORS_HEX.BACKGROUND,
            fillAlpha: 0.5,
            hasOutline: true,
            outlineWidth: this.OUTLINE_WIDTH,
            outlineColor: this.COLORS_HEX.BLUE,
            cornerRadius: this.CORNER_RADIUS
        };
    }

    getInputBoxStyle() {
        return {
            fillColor: 0xffffff,
            fillAlpha: 0.9,
            hasOutline: true,
            outlineWidth: this.OUTLINE_WIDTH,
            outlineColor: this.COLORS_HEX.MIDPURPLE,
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
            backgroundColor: this.COLORS_HEX.BACKGROUND,
            borderColor: this.COLORS_HEX.MIDPURPLE,
            borderWidth: this.OUTLINE_WIDTH,
            titleStyle: {
                fontFamily: 'barcade3d',
                fontSize: '50px',
                color: this.COLORS_TEXT.YELLOW,
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

    // Update background when level changes
    updateBackgroundForLevel() {
        
        // Destroy existing background
        if (this.background) {
            this.background.destroy();
        }
        
        // Recreate background with the current level colors
        this.createBackgroundEffect();
        
        // Destroy and recreate the floating particles for the new level
        if (this.particleContainer) {
            this.particleContainer.destroy();
            this.createFloatingParticles();
        }
        
        // Update mode indicator badge if it exists
        if (this.modeIndicator) {
            this.modeIndicator.destroy();
        }
        
        // Recreate mode indicator with current level styling
        this.addModeIndicator('HARD', 0xff3366);
    }


    // Mode-specific background methods
    createBackgroundEffect() {
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        
        // Create a gradient texture key based on the current level
        let gradientTextureKey = `hardModeBackground_level_${this.levelValue}`;
    
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
            
            // Different color gradients based on level - more intense and red-tinted for hard mode
            if (this.levelValue === 1) {
                grd.addColorStop(0, "#2d0a33"); // Red-tinted darker purples
                grd.addColorStop(0.4, "#3a0f45");
                grd.addColorStop(0.8, "#4a1c5d");
                grd.addColorStop(1, "#42184a");
            } else if (this.levelValue === 2) {
                grd.addColorStop(0, "#360840"); // Deeper red-purple
                grd.addColorStop(0.4, "#44114f");
                grd.addColorStop(0.8, "#521a69");
                grd.addColorStop(1, "#481858");
            } else { // Level 3
                grd.addColorStop(0, "#4a054d"); // Intense crimson-purple
                grd.addColorStop(0.4, "#5a085f");
                grd.addColorStop(0.8, "#6a0c7a");
                grd.addColorStop(1, "#5c0a66");
            }
    
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
        
        // Create more aggressive-looking particles for hard mode
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * this.cameras.main.width;
            const y = Math.random() * this.cameras.main.height;
            const size = Math.random() * 5 + 2;
            const alpha = Math.random() * 0.4 + 0.2;
            
            // Create a more dynamic particle shape - sometimes triangular for hard mode
            const particle = this.add.graphics();
            
            if (Math.random() > 0.6) {
                // Create star-like particles with random rotation
                particle.fillStyle(0xff5d8f, alpha); // Red-pink color
                const rotation = Math.random() * Math.PI * 2;
                const points = [];
                
                for (let j = 0; j < 5; j++) {
                    const angle = rotation + (j * Math.PI * 2 / 5);
                    const radius = j % 2 === 0 ? size : size / 2;
                    points.push({
                        x: Math.cos(angle) * radius,
                        y: Math.sin(angle) * radius
                    });
                }
                
                particle.beginPath();
                particle.moveTo(points[0].x, points[0].y);
                for (let j = 1; j < points.length; j++) {
                    particle.lineTo(points[j].x, points[j].y);
                }
                particle.closePath();
                particle.fill();
            } else {
                // Regular circle particles
                particle.fillStyle(0xff3366, alpha); // Bright red color
                particle.fillCircle(0, 0, size);
            }
            
            const glow = this.add.graphics();
            glow.fillStyle(0xff3366, alpha * 0.5);
            glow.fillCircle(0, 0, size * 2);
            
            const particleContainer = this.add.container(x, y, [glow, particle]);
            this.particleContainer.add(particleContainer);
            
            // More dynamic, faster movement
            this.tweens.add({
                targets: particleContainer,
                y: y + (Math.random() * 150 - 75),
                x: x + (Math.random() * 150 - 75),
                alpha: { from: alpha, to: alpha * 0.5 },
                duration: 3000 + Math.random() * 7000, // Faster animation
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: Math.random() * 2000
            });
        }
    }
}
