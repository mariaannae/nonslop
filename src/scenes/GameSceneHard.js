import { DESIGN, HARD_COLORS_HEX as COLORS_HEX, HARD_COLORS_TEXT as COLORS_TEXT, THEMES } from "../config/design.js";
import { createBackground } from "../backgrounds/createBackground.js";
import ToggleFactory from "../utils/ToggleFactory.js";
import BaseGameScene from "./BaseGameScene.js";

// Device detection utility (available everywhere in this file)
const isMobile = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent) || window.screen.width < 900;

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

    // Helper to reset the timer (stop and start again)
    resetTimer() {
        if (this.timerEvent) {
            this.timerEvent.remove(false);
        }
        // Reset timer value and display
        this.timerValue = 20;
        if (this.timerText) {
            this.timerText.setText('0:20');
        }
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
        this.timerStarted = true;
    }

    // Override setupInputHandlers to prevent using AI-suggested words
    setupInputHandlers() {
        // Use only the parent's queue-based input handler
        super.setupInputHandlers();
    }

    // Enhanced method to show feedback when a word is blocked
    showBlockFeedback(blockedWord) {
        // Delete the AI word from the user's input
        this.deleteAIWord(blockedWord);
        
        // Create warning text with dramatic styling - 10% smaller with newline
        const blockedText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100,
            `AI WORD DETECTED:\n"${blockedWord}"`,
            {
                fontFamily: 'IBM Plex Mono',
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
                fontFamily: 'IBM Plex Mono',
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
const padding = 30;
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
            fontFamily: 'IBM Plex Mono',
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

    // Delete AI word from user input
    deleteAIWord(blockedWord) {
        if (!this.userInput || !blockedWord) return;

        // Check if the original input ended with a space
        const endsWithSpace = /\s$/.test(this.userInput);

        // Find the last word in the user input
        const words = this.userInput.trim().split(/\s+/);
        const lastWordIndex = words.length - 1;

        if (lastWordIndex >= 0) {
            const lastWord = words[lastWordIndex];
            // Check if the last word matches the blocked word (case insensitive)
            if (lastWord.toLowerCase() === blockedWord.toLowerCase()) {
                // Remove the last word from the input
                words.pop();
                // Reconstruct the user input without the blocked word
                this.userInput = words.join(' ');
                // Only add a space if the original input ended with a space and there is still content
                if (this.userInput.length > 0 && endsWithSpace) {
                    this.userInput += ' ';
                }
                // Update the display
                this.updateCursor();
            }
        }
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
        // Use global UI scale for all elements
        this.uiScale = this.registry.get('uiScale') || 1;

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

        // Initialize with empty suggestion arrays
        this.aiSuggestedWords = [];
        this.suggestionBoxes = [];
        this.suggestionTexts = [];
        
        super.create && super.create();

        // Centralized background creation
        createBackground(this, THEMES.hard.background, this.levelValue, this.wordStreak);
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
        createBackground(this, THEMES.hard.background, this.levelValue, this.wordStreak);
        this.createMenuBar();
        // Do NOT call createPromptTextBox or createInputTextBox here; let BaseGameScene handle layout.
        // this.createPromptTextBox();
        // this.createInputTextBox();
        // this.updatePromptBasedOnLevel();

        const inputBoxWidth = this.cameras.main.width * (5 / 6) * this.uiScale;
        const padding = 20 * this.uiScale;
        const buttonPadding = 70 * this.uiScale; // Standard padding used for buttons
        const boxX = this.cameras.main.centerX - inputBoxWidth / 2;
        const buttonCenterX = boxX + inputBoxWidth - buttonPadding - this.design.BUTTON.WIDTH * this.uiScale / 2;

        this.inputActive = false;
        this.addButtonClickEffects();
        this.ensureProperLayering();
        this.ensureTextVisibility();
        this.updateCursor();
        
        // (Mode indicator replaced by toggle)
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
