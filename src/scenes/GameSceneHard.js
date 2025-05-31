import { DESIGN, HARD_COLORS_HEX as COLORS_HEX, HARD_COLORS_TEXT as COLORS_TEXT, THEMES } from "../config/design.js";
import { createBackground } from "../backgrounds/createBackground.js";
import ToggleFactory from "../utils/ToggleFactory.js";
import BaseGameScene from "./BaseGameScene.js";

export default class GameSceneHard extends BaseGameScene {
    constructor() {
        super({ key: 'GameSceneHard' });
        this.mode = 'hard';
        // Get design configuration for hard mode
        this.design = DESIGN.UI;
        
        // Extract needed values for easier access
        this.COLORS_HEX = COLORS_HEX;
        this.COLORS_TEXT = COLORS_TEXT;
        this.OUTLINE_WIDTH = this.design.OUTLINE.WIDTH;
        this.CORNER_RADIUS = this.design.OUTLINE.CORNER_RADIUS;
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

            // Start the timer on first valid keypress if not already started
            if (!this.timerStarted) {
                this.timerEvent = this.time.addEvent({
                    delay: 1000,
                    callback: this.updateTimer,
                    callbackScope: this,
                    loop: true
                });
                this.timerStarted = true;
            }

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

    // Enhanced method to show feedback when a word is blocked
    showBlockFeedback(blockedWord) {
        // Create warning text with dramatic styling - 10% smaller with newline
        const blockedText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100,
            `AI WORD DETECTED:\n"${blockedWord}"`,
            {
                fontFamily: 'Nunito',
                fontSize: '25px', // Reduced from 28px
                fontStyle: 'bold',
                fill: '#ffffff',
                stroke: '#ff0000',
                strokeThickness: 5, // Slightly reduced from 6
                padding: { x: 15, y: 10 },
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(101).setAlpha(0);
        
        // Calculate the necessary width and height for the hexagon background with some padding
        const width = blockedText.width + 80; // Add padding
        const height = width; // Make height same as width for a balanced hexagon
        
        // Create a hexagonal background
        const hexBg = this.add.graphics();
        hexBg.fillStyle(0x800000, 0.8);
        hexBg.lineStyle(4, 0xff0000, 1);
        
        // Create a simple hexagon that's wide enough for the text
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY - 100;
        
        // Draw a regular octagon (stop sign shape)
        hexBg.beginPath();
        
        // Calculate radius based on the width needed for text (10% smaller overall)
        const radius = width / 1.8 * 0.9; // Reduced by 10% to make the whole thing smaller
        
        // Draw octagon with 8 equal sides (like a stop sign)
        for (let i = 0; i < 8; i++) {
            // Start at 22.5 degrees to get flat top like a stop sign
            const angle = (i * 45 + 22.5) * Math.PI / 180;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            if (i === 0) {
                hexBg.moveTo(x, y);
            } else {
                hexBg.lineTo(x, y);
            }
        }
        // Back to start
        hexBg.closePath();
        
        hexBg.fill();
        hexBg.stroke();
        hexBg.setDepth(100).setAlpha(0);
        
        // Add subtext - position in lower part of octagon
        const subText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100 + (radius * 0.4), // Position in lower section of octagon
            "SECURITY VIOLATION - CONTENT PURGED",
            {
                fontFamily: 'Nunito',
                fontSize: '16px', // Reduced from 18px to match overall size reduction
                fontStyle: 'bold',
                fill: '#ff5555',
                stroke: '#000000',
                strokeThickness: 2 // Reduced from 3
            }
        ).setOrigin(0.5).setDepth(101).setAlpha(0);
        
        // Animate all elements together - fade in quickly
        this.tweens.add({
            targets: [hexBg, blockedText, subText],
            alpha: 1,
            duration: 200,
            ease: 'Sine.easeOut',
            onComplete: () => {
                // Add shake effect to text
                this.tweens.add({
                    targets: [blockedText, subText],
                    x: { from: blockedText.x - 5, to: blockedText.x + 5 },
                    duration: 50,
                    yoyo: true,
                    repeat: 4,
                    ease: 'Sine.easeInOut'
                });
                
                // Glitch effect on the blocked word
                this.glitchText(blockedText);
                
                // Pulse the hexagon
                this.tweens.add({
                    targets: hexBg,
                    scaleX: { from: 1, to: 1.05 },
                    scaleY: { from: 1, to: 1.05 },
                    duration: 400,
                    yoyo: true,
                    repeat: 2
                });
                
                // Hold visible with subtle pulsing on the text
                this.tweens.add({
                    targets: blockedText,
                    scaleX: { from: 1, to: 1.05 },
                    scaleY: { from: 1, to: 1.05 },
                    duration: 400,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => {
                        // Exit animation - fade out all elements
                        this.tweens.add({
                            targets: [hexBg, blockedText, subText],
                            alpha: 0,
                            duration: 300,
                            ease: 'Sine.easeIn',
                            onComplete: () => {
                                hexBg.destroy();
                                blockedText.destroy();
                                subText.destroy();
                            }
                        });
                    }
                });
            }
        });
        
        // Create dramatic screen effects
        this.createBlockedWordScreenEffects(blockedWord);
    }
    
    // Helper method to create glitch text effect
    glitchText(textObject) {
        // Store original text
        const originalText = textObject.text;
        let glitchCount = 0;
        
        // Create glitch interval
        const glitchInterval = this.time.addEvent({
            delay: 100,
            callback: () => {
                glitchCount++;
                
                // After several glitches, stop the effect
                if (glitchCount > 10) {
                    glitchInterval.remove();
                    textObject.setText(originalText);
                    return;
                }
                
                // Skip some frames for more random effect
                if (Math.random() > 0.5) {
                    return;
                }
                
                // Generate glitched text by replacing some characters
                let glitchedText = '';
                for (let i = 0; i < originalText.length; i++) {
                    if (Math.random() > 0.8) {
                        // Replace with a random character
                        const chars = "!@#$%^&*<>0123456789";
                        glitchedText += chars.charAt(Math.floor(Math.random() * chars.length));
                    } else {
                        glitchedText += originalText.charAt(i);
                    }
                }
                
                // Apply glitched text
                textObject.setText(glitchedText);
                
                // Restore original after a short delay
                this.time.delayedCall(50, () => {
                    if (textObject.active) {
                        textObject.setText(originalText);
                    }
                });
            },
            repeat: 10
        });
    }
    
    // Method to create screen effects when words are blocked
    createBlockedWordScreenEffects(blockedWord) {
        // Create intense screen flash effect with multiple colors
        const flashColors = [0xff0000, 0xff00ff, 0xaa00aa];
        
        flashColors.forEach((color, index) => {
            const delay = index * 100;
            const flash = this.add.rectangle(
                0, 0, 
                this.cameras.main.width, 
                this.cameras.main.height,
                color, 0.3
            ).setOrigin(0).setDepth(90).setAlpha(0);
            
            this.tweens.add({
                targets: flash,
                alpha: { from: 0, to: 0.3 },
                duration: 100,
                delay: delay,
                yoyo: true,
                onComplete: () => flash.destroy()
            });
        });
        
        // Create electric zap effect from the input box to show word deletion
        const inputBoxY = this.cameras.main.centerY;
        const zapLines = 8;
        
        for (let i = 0; i < zapLines; i++) {
            const zapLine = this.add.graphics().setDepth(95);
            const lineWidth = Math.random() * 2 + 1;
            const segments = Math.floor(Math.random() * 3) + 3;
            
            zapLine.lineStyle(lineWidth, 0xff00ff);
            
            // Draw a jagged line from the input box center outward
            const startX = this.cameras.main.centerX;
            const startY = inputBoxY;
            let currentX = startX;
            let currentY = startY;
            
            zapLine.beginPath();
            zapLine.moveTo(currentX, currentY);
            
            for (let j = 0; j < segments; j++) {
                const angle = (Math.random() * Math.PI / 2) - Math.PI / 4 + (i * Math.PI / 4);
                const length = Math.random() * 80 + 40;
                
                currentX += Math.cos(angle) * length;
                currentY += Math.sin(angle) * length;
                
                zapLine.lineTo(currentX, currentY);
            }
            
            zapLine.strokePath();
            
            // Create particles at the end of each zap line
            const particles = this.add.particles(currentX, currentY, 'ball', {
                lifespan: 300,
                speed: { min: 50, max: 150 },
                scale: { start: 0.2, end: 0 },
                quantity: 5,
                emitting: false,
                tint: 0xff00ff
            }).setDepth(96);
            
            particles.explode(10);
            
            // Animate the zap line
            this.tweens.add({
                targets: zapLine,
                alpha: { from: 1, to: 0 },
                duration: 200,
                delay: i * 50,
                onComplete: () => {
                    zapLine.destroy();
                    // Destroy particles after they're done
                    this.time.delayedCall(300, () => particles.destroy());
                }
            });
        }
        
        // Add camera shake effect
        this.cameras.main.shake(250, 0.01);
        
        // Create explosion effect centered on where the word would have been
        this.createExplosionEffect(blockedWord, this.cameras.main.centerX, inputBoxY);
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
        this.mode = 'hard';
        this.design = DESIGN.UI;
        this.COLORS_HEX = COLORS_HEX;
        this.COLORS_TEXT = COLORS_TEXT;
        this.OUTLINE_WIDTH = this.design.OUTLINE.WIDTH;
        this.CORNER_RADIUS = this.design.CORNER_RADIUS;
        this.PROGRESS_BAR = this.design.PROGRESS_BAR;

        // Log the data received from other mode for debugging
        console.log("GameSceneHard received data:", data);
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
        createBackground(this, THEMES.hard.background, this.levelValue, this.wordStreak);
        this.createMenuBar();
        this.createPromptTextBox();
        this.createInputTextBox();
        this.updatePromptBasedOnLevel();

        const inputBoxWidth = this.cameras.main.width * (5 / 6);
        const padding = 20;
        const buttonCenterX = this.cameras.main.centerX + inputBoxWidth / 2 - this.design.BUTTON.WIDTH - 20;

        // Calculate position using the new layout calculation
        const statsBoxWidth = 180;
        const statsBoxHeight = 130;
        const statsDisplayY = this.menuBarHeight + padding;
        const statsBottomEdge = statsDisplayY + statsBoxHeight;
        
        // Prompt box is 20px below stats box
        const promptY = statsBottomEdge + 20;
        const promptBoxHeight = 80;
        const promptBottomEdge = promptY + promptBoxHeight;
        
        // Input box is 20px below prompt box
        const inputBoxY = promptBottomEdge + 20;
        const inputBoxHeight = 240;
        const inputBoxBottomEdge = inputBoxY + inputBoxHeight;
        
        // Position button further below input box bottom edge (increased spacing)
        const doneButtonY = inputBoxBottomEdge + padding * 2 + this.design.BUTTON.HEIGHT / 2;

        // Create buttons with tooltips
        this.doneButton = this.createButton(
            "DONE", 
            () => this.onDoneButtonClick(), 
            buttonCenterX, 
            doneButtonY,
            'Submit your text for evaluation'
        );

        //console.log(this.doneButton)
        
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
            fill: this.COLORS_TEXT.PRIMARY,
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
            fillColor: this.COLORS_HEX.BOX_FILL,
            fillAlpha: 0.5,
            hasOutline: true,
            outlineWidth: this.OUTLINE_WIDTH,
            outlineColor: this.COLORS_HEX.BOX_OUTLINE,
            cornerRadius: this.CORNER_RADIUS
        };
    }

    getInputBoxStyle() {
        return {
            fillColor: 0xffffff,
            fillAlpha: 0.9,
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
            borderColor: this.COLORS_HEX.BOX_OUTLINE,
            borderWidth: this.OUTLINE_WIDTH,
            titleStyle: {
                fontFamily: 'barcade3d',
                fontSize: '50px',
                color: this.COLORS_TEXT.TITLE,
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
        console.log(`Hard Mode - Creating background with streak: ${this.wordStreak}`);
        
        // Recreate background with the current level colors and streak value
        createBackground(this, THEMES.hard.background, this.levelValue, this.wordStreak);
        
        // Destroy and recreate the floating particles for the new level
        if (this.particleContainer) {
            this.particleContainer.destroy();
            this.createFloatingParticles && this.createFloatingParticles();
        }
        
        // Update mode indicator badge if it exists
        if (this.modeIndicator) {
            this.modeIndicator.destroy();
        }
    }
}
