import { DESIGN, HARD_COLORS_HEX as COLORS_HEX, HARD_COLORS_TEXT as COLORS_TEXT } from "../config/design.js";
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

        //console.log(this.doneButton)
        
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
            color: this.COLORS_TEXT.PRIMARY,
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

   
    }


    // Mode-specific background methods
    createBackgroundEffect() {
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        
        let gradientTextureKey = `hardModeBackground_level_${this.levelValue}`;
    
        if (!this.textures.exists(gradientTextureKey)) {
            let gradientCanvas = this.textures.createCanvas(gradientTextureKey, width, height);
            let ctx = gradientCanvas.getContext();
    
            if (!ctx) {
                console.error("Failed to get canvas context for background effect.");
                return;
            }
    
            // Create dynamic multi-point gradient based on level
            if (this.levelValue === 1) {
                // Level 1: Dark Mystic Field
                const gradient = ctx.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, "#0d0419");    // Very dark purple
                gradient.addColorStop(0.3, "#15042d");  // Dark purple
                gradient.addColorStop(0.7, "#1e0441");  // Deep purple
                gradient.addColorStop(1, "#250555");    // Mid purple
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
                
                // Add intense energy core
                const coreGradient = ctx.createRadialGradient(
                    width/2, height/2, 0,
                    width/2, height/2, Math.max(width, height) * 0.7
                );
                coreGradient.addColorStop(0, "rgba(138, 21, 198, 0.08)");   // Less bright magenta center
                coreGradient.addColorStop(0.3, "rgba(107, 15, 153, 0.05)"); // Mid magenta fade
                coreGradient.addColorStop(1, "rgba(61, 9, 130, 0.03)");     // Outer magenta fade
                
                ctx.fillStyle = coreGradient;
                ctx.fillRect(0, 0, width, height);
                
                // Add pulsing energy orbs
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 * i) / 6;
                    const distance = Math.max(width, height) * 0.25;
                    const x = width/2 + Math.cos(angle) * distance;
                    const y = height/2 + Math.sin(angle) * distance;
                    
                    const orbGradient = ctx.createRadialGradient(
                        x, y, 0,
                        x, y, 100
                    );
                    orbGradient.addColorStop(0, "rgba(138, 21, 198, 0.08)");   // Less bright magenta
                    orbGradient.addColorStop(0.5, "rgba(107, 15, 153, 0.04)"); // Mid magenta
                    orbGradient.addColorStop(1, "rgba(61, 9, 130, 0)");        // Dark magenta
                    
                    ctx.fillStyle = orbGradient;
                    ctx.beginPath();
                    ctx.arc(x, y, 100, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Add pulsing energy rings
                for (let i = 0; i < 5; i++) {
                    const ringGradient = ctx.createRadialGradient(
                        width/2, height/2, 0,
                        width/2, height/2, Math.max(width, height) * 0.4
                    );
                    ringGradient.addColorStop(0, `rgba(138, 21, 198, ${0.1 - i * 0.015})`);   // Less bright magenta
                    ringGradient.addColorStop(0.4, `rgba(107, 15, 153, ${0.07 - i * 0.01})`); // Mid magenta
                    ringGradient.addColorStop(1, "rgba(61, 9, 130, 0)");                      // Dark magenta
                    
                    ctx.fillStyle = ringGradient;
                    ctx.beginPath();
                    ctx.arc(width/2, height/2, Math.max(width, height) * (0.2 + i * 0.15), 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Add sharp energy lines radiating from center
                for (let i = 0; i < 12; i++) {
                    const angle = (Math.PI * 2 * i) / 12;
                    const length = Math.max(width, height) * 0.6;
                    
                    const lineGradient = ctx.createLinearGradient(
                        width/2, height/2,
                        width/2 + Math.cos(angle) * length,
                        height/2 + Math.sin(angle) * length
                    );
                    lineGradient.addColorStop(0, "rgba(138, 21, 198, 0.08)");  // Less bright magenta
                    lineGradient.addColorStop(1, "rgba(61, 9, 130, 0)");       // Dark magenta
                    
                    ctx.strokeStyle = lineGradient;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(
                        width/2 + Math.cos(angle) * 30,
                        height/2 + Math.sin(angle) * 30
                    );
                    ctx.lineTo(
                        width/2 + Math.cos(angle) * length,
                        height/2 + Math.sin(angle) * length
                    );
                    ctx.stroke();
                }
            } else if (this.levelValue === 2) {
                // Level 2: Mystic Energy Vortex
                const centerX = width/2;
                const centerY = height/2;
                
                // Create swirling base gradient
                const baseGradient = ctx.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, Math.max(width, height)
                );
                baseGradient.addColorStop(0, "#400969");  // Brighter purple core
                baseGradient.addColorStop(0.3, "#2d0669"); // Mid-bright purple
                baseGradient.addColorStop(0.6, "#250555"); // Mid purple
                baseGradient.addColorStop(1, "#1e0441");   // Deep purple
                
                ctx.fillStyle = baseGradient;
                ctx.fillRect(0, 0, width, height);
                
                // Add swirling energy streams
                for (let i = 0; i < 12; i++) {
                    const angle = (Math.PI * 2 * i) / 12;
                    const spiralPoints = [];
                    const spirals = 3;
                    const maxRadius = Math.max(width, height) * 0.4;
                    
                    // Create spiral path
                    for (let t = 0; t <= 1; t += 0.01) {
                        const radius = t * maxRadius;
                        const theta = angle + t * Math.PI * 2 * spirals;
                        spiralPoints.push({
                            x: centerX + Math.cos(theta) * radius,
                            y: centerY + Math.sin(theta) * radius
                        });
                    }
                    
                    // Draw spiral
                    const spiralGradient = ctx.createLinearGradient(
                        centerX, centerY,
                        centerX + Math.cos(angle) * maxRadius,
                        centerY + Math.sin(angle) * maxRadius
                    );
                    spiralGradient.addColorStop(0, "rgba(180, 32, 220, 0.12)");  // Slightly brighter magenta
                    spiralGradient.addColorStop(0.5, "rgba(160, 20, 200, 0.08)"); // Mid magenta
                    spiralGradient.addColorStop(1, "rgba(140, 10, 180, 0)");      // Dark magenta
                    
                    ctx.strokeStyle = spiralGradient;
                    ctx.lineWidth = 15;
                    ctx.beginPath();
                    ctx.moveTo(spiralPoints[0].x, spiralPoints[0].y);
                    for (let j = 1; j < spiralPoints.length; j++) {
                        ctx.lineTo(spiralPoints[j].x, spiralPoints[j].y);
                    }
                    ctx.stroke();
                }
                
                // Add pulsing energy nodes
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i) / 8;
                    const distance = Math.max(width, height) * 0.35;
                    const x = centerX + Math.cos(angle) * distance;
                    const y = centerY + Math.sin(angle) * distance;
                    
                    // Create main node
                    const nodeGradient = ctx.createRadialGradient(
                        x, y, 0,
                        x, y, 150
                    );
                    nodeGradient.addColorStop(0, "rgba(180, 32, 220, 0.15)");   // Slightly brighter magenta
                    nodeGradient.addColorStop(0.4, "rgba(160, 20, 200, 0.1)");  // Mid magenta
                    nodeGradient.addColorStop(1, "rgba(140, 10, 180, 0)");      // Dark magenta
                    
                    ctx.fillStyle = nodeGradient;
                    ctx.beginPath();
                    ctx.arc(x, y, 150, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Add intense central core
                const coreGradient = ctx.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, 250
                );
                coreGradient.addColorStop(0, "rgba(180, 32, 220, 0.18)");   // Slightly brighter magenta
                coreGradient.addColorStop(0.3, "rgba(160, 20, 200, 0.12)"); // Mid magenta
                coreGradient.addColorStop(1, "rgba(140, 10, 180, 0)");      // Dark magenta
                
                ctx.fillStyle = coreGradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, 250, 0, Math.PI * 2);
                ctx.fill();
            } else { // Level 3
                // Level 3: Radiant Power Grid
                const centerX = width/2;
                const centerY = height/2;
                
                // Create base gradient
                const baseGradient = ctx.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, Math.max(width, height)
                );
                baseGradient.addColorStop(0, "#5a0a82");  // Less bright magenta
                baseGradient.addColorStop(0.4, "#4a0872"); // Mid magenta
                baseGradient.addColorStop(0.7, "#3a0662"); // Deep magenta
                baseGradient.addColorStop(1, "#2a0452");   // Dark magenta
                
                ctx.fillStyle = baseGradient;
                ctx.fillRect(0, 0, width, height);
                
                // Create hexagonal grid
                const hexRadius = 120;
                const hexHeight = hexRadius * Math.sqrt(3);
                const cols = Math.ceil(width / (hexRadius * 3)) + 2;
                const rows = Math.ceil(height / hexHeight) + 2;
                const offsetX = -hexRadius;
                const offsetY = -hexHeight;
                
                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < cols; col++) {
                        const x = offsetX + col * hexRadius * 3 + (row % 2) * hexRadius * 1.5;
                        const y = offsetY + row * hexHeight;
                        
                        // Draw hexagon
                        const hexGradient = ctx.createRadialGradient(
                            x, y, 0,
                            x, y, hexRadius
                        );
                        hexGradient.addColorStop(0, "rgba(160, 25, 200, 0.12)");   // Less bright magenta
                        hexGradient.addColorStop(0.5, "rgba(140, 20, 180, 0.08)"); // Mid magenta
                        hexGradient.addColorStop(1, "rgba(120, 15, 160, 0)");      // Dark magenta
                        
                        ctx.fillStyle = hexGradient;
                        ctx.beginPath();
                        for (let i = 0; i < 6; i++) {
                            const angle = (Math.PI / 3) * i;
                            const hx = x + hexRadius * Math.cos(angle);
                            const hy = y + hexRadius * Math.sin(angle);
                            if (i === 0) ctx.moveTo(hx, hy);
                            else ctx.lineTo(hx, hy);
                        }
                        ctx.closePath();
                        ctx.fill();
                        
                        // Draw connections
                        if (col < cols - 1) {
                            const nextX = x + hexRadius * 3;
                            const connectionGradient = ctx.createLinearGradient(x, y, nextX, y);
                            connectionGradient.addColorStop(0, "rgba(160, 25, 200, 0.1)");   // Less bright magenta
                            connectionGradient.addColorStop(0.5, "rgba(140, 20, 180, 0.05)"); // Mid magenta
                            connectionGradient.addColorStop(1, "rgba(160, 25, 200, 0.1)");   // Less bright magenta
                            
                            ctx.strokeStyle = connectionGradient;
                            ctx.lineWidth = 4;
                            ctx.beginPath();
                            ctx.moveTo(x + hexRadius, y);
                            ctx.lineTo(nextX - hexRadius, y);
                            ctx.stroke();
                        }
                    }
                }
                
                // Add power nodes at intersections
                const nodeRadius = 40;
                for (let row = 0; row < rows; row += 2) {
                    for (let col = 0; col < cols; col += 2) {
                        const x = offsetX + col * hexRadius * 3 + (row % 2) * hexRadius * 1.5;
                        const y = offsetY + row * hexHeight;
                        
                        const nodeGradient = ctx.createRadialGradient(
                            x, y, 0,
                            x, y, nodeRadius
                        );
                        nodeGradient.addColorStop(0, "rgba(160, 25, 200, 0.15)");   // Less bright magenta
                        nodeGradient.addColorStop(0.5, "rgba(140, 20, 180, 0.1)");  // Mid magenta
                        nodeGradient.addColorStop(1, "rgba(120, 15, 160, 0)");      // Dark magenta
                        
                        ctx.fillStyle = nodeGradient;
                        ctx.beginPath();
                        ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                
                // Add central power core
                const coreGradient = ctx.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, 300
                );
                coreGradient.addColorStop(0, "rgba(160, 25, 200, 0.15)");   // Less bright magenta
                coreGradient.addColorStop(0.4, "rgba(140, 20, 180, 0.1)");  // Mid magenta
                coreGradient.addColorStop(1, "rgba(120, 15, 160, 0)");      // Dark magenta
                
                ctx.fillStyle = coreGradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, 300, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Add common effects
            this.addEnergyField(ctx, width, height);
            this.addIntensityParticles(ctx, width, height);
            
            gradientCanvas.refresh();
        }
    
        this.background = this.add.image(0, 0, gradientTextureKey)
            .setOrigin(0)
            .setDisplaySize(width, height)
            .setDepth(-1);
    
        // More aggressive animations
        this.tweens.add({
            targets: this.background,
            alpha: { from: 0.9, to: 1 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        this.tweens.add({
            targets: this.background,
            scaleX: { from: 1, to: 1.12 },
            scaleY: { from: 1, to: 1.12 },
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // More intense rotation
        this.tweens.add({
            targets: this.background,
            angle: { from: -2, to: 2 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }

    addEnergyField(ctx, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Add energy beams radiating from center
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            const beamGradient = ctx.createLinearGradient(
                centerX, centerY,
                centerX + Math.cos(angle) * width,
                centerY + Math.sin(angle) * height
            );
            // Adjust beam colors based on level
            if (this.levelValue === 1) {
                beamGradient.addColorStop(0, "rgba(138, 21, 198, 0.06)");  // Less bright magenta
                beamGradient.addColorStop(1, "rgba(61, 9, 130, 0)");       // Dark magenta
            } else if (this.levelValue === 2) {
                beamGradient.addColorStop(0, "rgba(160, 25, 200, 0.08)");  // Slightly brighter magenta
                beamGradient.addColorStop(1, "rgba(120, 10, 160, 0)");     // Dark magenta
            } else {
                beamGradient.addColorStop(0, "rgba(140, 20, 180, 0.1)");   // Moderately bright magenta
                beamGradient.addColorStop(1, "rgba(100, 10, 140, 0)");     // Dark magenta
            }
            
            ctx.fillStyle = beamGradient;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, Math.max(width, height),
                   angle - 0.1, angle + 0.1);
            ctx.lineTo(centerX, centerY);
            ctx.fill();
        }
        
        // Add pulsing core
        const coreGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, 150
        );
        // Adjust core colors based on level
        if (this.levelValue === 1) {
            coreGradient.addColorStop(0, "rgba(138, 21, 198, 0.08)");   // Less bright magenta
            coreGradient.addColorStop(0.6, "rgba(107, 15, 153, 0.05)"); // Mid magenta
            coreGradient.addColorStop(1, "rgba(61, 9, 130, 0)");        // Dark magenta
        } else if (this.levelValue === 2) {
            coreGradient.addColorStop(0, "rgba(160, 25, 200, 0.1)");    // Slightly brighter magenta
            coreGradient.addColorStop(0.6, "rgba(140, 20, 180, 0.06)"); // Mid magenta
            coreGradient.addColorStop(1, "rgba(120, 10, 160, 0)");      // Dark magenta
        } else {
            coreGradient.addColorStop(0, "rgba(140, 20, 180, 0.12)");   // Moderately bright magenta
            coreGradient.addColorStop(0.6, "rgba(120, 15, 160, 0.08)"); // Mid magenta
            coreGradient.addColorStop(1, "rgba(100, 10, 140, 0)");      // Dark magenta
        }
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
        ctx.fill();
    }

    addIntensityParticles(ctx, width, height) {
        // Add subtle glow particles
        for (let i = 0; i < 36; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 1.2 + 0.4;
            const alpha = Math.random() * 0.3 + 0.1;
            
            // Create layered glow effect
            const gradient = ctx.createRadialGradient(
                x, y, 0,
                x, y, size * 40
            );
            // Adjust particle colors based on level
            if (this.levelValue === 1) {
                gradient.addColorStop(0, `rgba(138, 21, 198, ${alpha * 0.8})`);    // Less bright magenta core
                gradient.addColorStop(0.1, `rgba(138, 21, 198, ${alpha * 0.4})`);  // Inner magenta glow
                gradient.addColorStop(0.2, `rgba(107, 15, 153, ${alpha * 0.25})`); // Mid magenta glow
                gradient.addColorStop(0.4, `rgba(84, 12, 120, ${alpha * 0.12})`);  // Outer magenta glow
                gradient.addColorStop(0.6, `rgba(61, 9, 130, ${alpha * 0.06})`);   // Far magenta glow
                gradient.addColorStop(0.8, `rgba(45, 6, 95, ${alpha * 0.03})`);    // Edge magenta glow
                gradient.addColorStop(1, `rgba(30, 4, 65, 0)`);                    // Fade out
            } else if (this.levelValue === 2) {
                gradient.addColorStop(0, `rgba(180, 32, 220, ${alpha * 0.8})`);    // Slightly brighter magenta core
                gradient.addColorStop(0.1, `rgba(180, 32, 220, ${alpha * 0.4})`);  // Inner magenta glow
                gradient.addColorStop(0.2, `rgba(160, 20, 200, ${alpha * 0.3})`);  // Mid magenta glow
                gradient.addColorStop(0.4, `rgba(140, 10, 180, ${alpha * 0.15})`); // Outer magenta glow
                gradient.addColorStop(0.6, `rgba(120, 8, 160, ${alpha * 0.08})`);  // Far magenta glow
                gradient.addColorStop(0.8, `rgba(100, 6, 140, ${alpha * 0.04})`);  // Edge magenta glow
                gradient.addColorStop(1, `rgba(80, 4, 120, 0)`);                   // Fade out
            } else {
                gradient.addColorStop(0, `rgba(160, 25, 200, ${alpha * 0.8})`);    // Less bright magenta core
                gradient.addColorStop(0.1, `rgba(160, 25, 200, ${alpha * 0.4})`);  // Inner magenta glow
                gradient.addColorStop(0.2, `rgba(140, 20, 180, ${alpha * 0.3})`);  // Mid magenta glow
                gradient.addColorStop(0.4, `rgba(120, 15, 160, ${alpha * 0.15})`); // Outer magenta glow
                gradient.addColorStop(0.6, `rgba(100, 10, 140, ${alpha * 0.08})`); // Far magenta glow
                gradient.addColorStop(0.8, `rgba(80, 8, 120, ${alpha * 0.04})`);   // Edge magenta glow
                gradient.addColorStop(1, `rgba(60, 6, 100, 0)`);                   // Fade out
            }
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size * 40, 0, Math.PI * 2);
            ctx.fill();
        }
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
        if (this.particleContainer) {
            this.particleContainer.destroy();
        }
        this.particleContainer = this.add.container(0, 0);
        this.particleContainer.setDepth(-0.5);

        // Level-specific particle configurations
        const levelConfigs = {
            1: {
                count: 30,
                baseSize: { min: 0.4, max: 1.0 },
                alpha: { min: 0.15, max: 0.25 },
                movement: {
                    range: 60,
                    duration: { min: 6000, max: 9000 }
                },
                colors: {
                    core: 0x8a15c6,    // Less bright magenta (matching other level 1 elements)
                    mid: 0x6b0f99,     // Mid magenta
                    outer: 0x3d0982    // Dark magenta
                }
            },
            2: {
                count: 45,
                baseSize: { min: 0.5, max: 1.4 },
                alpha: { min: 0.2, max: 0.3 },
                movement: {
                    range: 100,
                    duration: { min: 4000, max: 7000 }
                },
                colors: {
                    core: 0xb420dc,    // Slightly brighter magenta
                    mid: 0xa014c8,     // Mid magenta
                    outer: 0x8c0ab4    // Dark magenta
                }
            },
            3: {
                count: 60,
                baseSize: { min: 0.6, max: 1.8 },
                alpha: { min: 0.25, max: 0.35 },
                movement: {
                    range: 140,
                    duration: { min: 3000, max: 5000 }
                },
                colors: {
                    core: 0xa019c8,    // Less bright magenta
                    mid: 0x8c14b4,     // Mid magenta
                    outer: 0x780fa0    // Dark magenta
                }
            }
        };

        const config = levelConfigs[this.levelValue];
        
        // Create energy particles
        for (let i = 0; i < config.count; i++) {
            const x = Math.random() * this.cameras.main.width;
            const y = Math.random() * this.cameras.main.height;
            const baseSize = Math.random() * (config.baseSize.max - config.baseSize.min) + config.baseSize.min;
            const alpha = Math.random() * (config.alpha.max - config.alpha.min) + config.alpha.min;
            
            const particleGroup = this.add.container(x, y);
            
            // Create particle layers with level-specific colors
            const core = this.add.graphics();
            core.fillStyle(config.colors.core, alpha);
            core.fillCircle(0, 0, baseSize);
            
            const layers = [];
            const layerCount = 6;
            for (let j = 0; j < layerCount; j++) {
                const layer = this.add.graphics();
                const layerSize = baseSize * Math.pow(2, j + 2);
                const layerAlpha = alpha * (1 - (j / layerCount));
                
                if (j < layerCount / 2) {
                    layer.fillStyle(config.colors.mid, layerAlpha);
                } else {
                    layer.fillStyle(config.colors.outer, layerAlpha);
                }
                
                layer.fillCircle(0, 0, layerSize);
                layers.unshift(layer);
            }
            
            particleGroup.add([...layers, core]);
            this.particleContainer.add(particleGroup);
            
            // Level-specific movement patterns
            const baseDelay = Math.random() * 1000;
            const range = config.movement.range;
            const duration = Math.random() * (config.movement.duration.max - config.movement.duration.min) + config.movement.duration.min;
            
            // More dynamic movement for higher levels
            if (this.levelValue > 1) {
                // Circular motion
                const radius = range / 2;
                const angularSpeed = (2 * Math.PI) / duration;
                const startAngle = Math.random() * Math.PI * 2;
                
                this.tweens.add({
                    targets: particleGroup,
                    x: {
                        value: x + radius * Math.cos(startAngle),
                        ease: (v) => x + radius * Math.cos(angularSpeed * duration * v + startAngle)
                    },
                    y: {
                        value: y + radius * Math.sin(startAngle),
                        ease: (v) => y + radius * Math.sin(angularSpeed * duration * v + startAngle)
                    },
                    duration: duration,
                    repeat: -1
                });
            } else {
                // Simple movement for level 1
                this.tweens.add({
                    targets: particleGroup,
                    x: x + (Math.random() * range - range/2),
                    y: y + (Math.random() * range - range/2),
                    duration: duration,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.InOut',
                    delay: baseDelay
                });
            }
            
            // Rotation and scaling effects
            const rotationSpeed = this.levelValue > 1 ? 10 : 5;
            this.tweens.add({
                targets: particleGroup,
                angle: { from: -rotationSpeed, to: rotationSpeed },
                scaleX: { from: 1, to: this.levelValue > 1 ? 1.3 : 1.1 },
                scaleY: { from: 1, to: this.levelValue > 1 ? 1.3 : 1.1 },
                duration: duration * 0.8,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: baseDelay
            });
        }

    }

    createEnergyArcs() {
        const arcCount = this.levelValue === 2 ? 4 : 6;
        const arcDuration = this.levelValue === 2 ? 2000 : 1500;
        
        for (let i = 0; i < arcCount; i++) {
            const startX = Math.random() * this.cameras.main.width;
            const startY = Math.random() * this.cameras.main.height;
            const endX = startX + (Math.random() * 200 - 100);
            const endY = startY + (Math.random() * 200 - 100);
            
            const arc = this.add.graphics();
            this.particleContainer.add(arc);
            
            const drawArc = () => {
                arc.clear();
                
                // Draw main arc
                // Adjust arc color based on level
                const arcColor = this.levelValue === 1 ? 0x8a15c6 : 0xff00ff; // Less bright for level 1
                arc.lineStyle(3, arcColor, this.levelValue === 1 ? 0.6 : 0.8);
                const path = new Phaser.Curves.Path(startX, startY);
                
                const controlPoint1X = startX + (endX - startX) * 0.5 + (Math.random() * 40 - 20);
                const controlPoint1Y = startY + (Math.random() * 40 - 20);
                const controlPoint2X = startX + (endX - startX) * 0.5 + (Math.random() * 40 - 20);
                const controlPoint2Y = endY + (Math.random() * 40 - 20);
                
                path.cubicBezierTo(endX, endY, controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y);
                path.draw(arc);
                
                // Add glow effect
                arc.lineStyle(6, arcColor, this.levelValue === 1 ? 0.2 : 0.3);  // Less bright glow for level 1
                path.draw(arc);
            };
            
            // Animate arc
            const animate = () => {
                if (this.scene.isTransitioning) return;
                
                this.tweens.add({
                    targets: arc,
                    alpha: { from: 0.8, to: 0.2 },
                    duration: arcDuration,
                    onUpdate: drawArc,
                    onComplete: () => {
                        arc.clear();
                        animate();
                    }
                });
            };
            
            animate();
        }
    }
}
