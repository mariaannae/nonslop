import { DESIGN, HARD_COLORS_HEX, HARD_COLORS_TEXT, EASY_COLORS_TEXT, EASY_COLORS_HEX, THEMES } from "../config/design.js";
import { saveInteraction, isHighScore } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import SceneTransitionManager from "../utils/SceneTransitionManager.js";
import { createBackground } from "../backgrounds/createBackground.js";
import { ScalingManager } from "../config/scaling.js";

//, DESIGN.UI.BUTTON.HEIGHT, DESIGN.UI.BUTTON.SPACING, colors_hex, colors_text, DESIGN.UI.BUTTON.WIDTH

export default class DoneScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DoneScene' });
        this.mode = null;
        this.userInput = '';
        this.tooltips = []; // For tooltips like in BaseGameScene
    }

    onFeedbackClick() {
        this.scene.start('FeedbackScene', {mode: this.mode});
    }
    
    showLeaderboard() {
        this.scene.start('LeaderboardScene', {
            mode: this.mode,
            levelValue: this.levelValue,
            previousScene: 'DoneScene',
            score: this.totalScore
        });
    }

    createOutputTextBox() {
        const outputBoxWidth = this.uiBoxWidth - 30;
        const padding = 30;

        // Use stored input box position
        const inputBoxBottom = this.inputBoxY + this.inputBoxHeight;

        // Output box: top edge 30px below input box bottom
        const outputBoxY = inputBoxBottom + padding;


        // Create text first to measure its height
        this.outputText = this.add.text(
            0, 0,
            this.evaluation || "",
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: `${DESIGN.UI.MONO_FONT_SIZE}px`,
                fill: '#ffffff',
                wordWrap: { width: outputBoxWidth - padding * 2 },
                align: 'left',
                lineSpacing: 5
            }
        ).setOrigin(0, 0);
        this.outputText.y = 0;

        // Calculate dynamic height based on text content
        let outputBoxHeight = this.outputText.height + padding * 2;

        // --- CAP HEIGHT SO BUTTON IS AT LEAST 30PX FROM CANVAS BOTTOM ---
        const canvasHeight = this.cameras.main.height;
        const buttonMargin = 30;
        // button is placed 30px below output box, then DESIGN.UI.BUTTON.HEIGHT/2 to center, then DESIGN.UI.BUTTON.HEIGHT/2 to bottom
        // So: outputBoxY + outputBoxHeight + 30 + DESIGN.UI.BUTTON.HEIGHT <= canvasHeight - 30
        // => outputBoxHeight <= canvasHeight - 30 - outputBoxY - 30 - DESIGN.UI.BUTTON.HEIGHT
        const maxOutputBoxHeight = canvasHeight - buttonMargin - outputBoxY - 30 - DESIGN.UI.BUTTON.HEIGHT - (buttonMargin * 2);
        let capped = false;
        if (outputBoxHeight > maxOutputBoxHeight) {
            outputBoxHeight = maxOutputBoxHeight;
            capped = true;
        }

        // Create new output box with rounded corners
        const boxStyle = this.getPromptBoxStyle();
        this.outputTextBox = this.add.graphics();
        this.outputTextBox.fillStyle(boxStyle.fillColor, boxStyle.fillAlpha);
        this.outputTextBox.fillRoundedRect(
            this.cameras.main.centerX - outputBoxWidth / 2,
            outputBoxY,
            outputBoxWidth,
            outputBoxHeight,
            boxStyle.cornerRadius
        );
        this.outputTextBox.lineStyle(boxStyle.outlineWidth, boxStyle.outlineColor, 1);
        this.outputTextBox.strokeRoundedRect(
            this.cameras.main.centerX - outputBoxWidth / 2,
            outputBoxY,
            outputBoxWidth,
            outputBoxHeight,
            boxStyle.cornerRadius
        );
        this.add.existing(this.outputTextBox);

        // Create a container for the text (add mask if capped)
        const textAreaX = this.cameras.main.centerX - outputBoxWidth / 2 + padding;
        const textAreaY = outputBoxY + padding;
        this.outputTextContainer = this.add.container(textAreaX, textAreaY);
        this.outputTextContainer.add(this.outputText);

        if (capped) {
            // Add a mask to the text so it doesn't overflow the box
            // The mask must be positioned at the same global coordinates as the text
            const maskShape = this.make.graphics({ x: textAreaX, y: textAreaY, add: false });
            maskShape.fillStyle(0xffffff);
            maskShape.fillRect(0, 0, outputBoxWidth - padding * 2, outputBoxHeight - padding * 2);
            const mask = maskShape.createGeometryMask();
            this.outputText.setMask(mask);

            // Store info for scroll helpers
            this.outputBoxInfo = {
                y: outputBoxY,
                height: outputBoxHeight,
                padding: padding
            };

            // Use the user's scroll event and indicator helpers
            this.addScrollEvent();
            this.addScrollIndicator();
        }

        // Store output box position and height for button placement
        this.outputBoxY = outputBoxY;
        this.outputBoxHeight = outputBoxHeight;

        // Set depth
        this.outputTextBox.setDepth(9);
        this.outputTextContainer.setDepth(10);

        // Set initial state
        this.tweens.add({
            targets: [this.outputTextBox, this.outputTextContainer],
            alpha: 1,
            duration: 500,
            ease: 'Sine.InOut'
        });
    }

    // User's scroll event: attaches wheel event to scene input, scrolls outputText (not container)
    addScrollEvent() {
        // Remove any existing event
        if (this.scrollWheelEvent) {
            this.input.off('wheel', this.scrollWheelEvent);
        }

        // Define the scroll event handler
        this.scrollWheelEvent = (pointer, gameObjects, deltaX, deltaY) => {
            if (!this.outputText || !this.outputBoxInfo) return;

            const textHeight = this.outputText.height;
            const boxHeight = this.outputBoxInfo.height - (this.outputBoxInfo.padding * 2);

            if (textHeight <= boxHeight) return;

            // Calculate min and max scroll positions
            const minScroll = 0;
            const maxScroll = textHeight - boxHeight;

            // Store current scroll position (default 0)
            if (typeof this._outputTextScrollY !== "number") this._outputTextScrollY = 0;

            // Apply scroll movement (negative deltaY means scroll down)
            this._outputTextScrollY = Phaser.Math.Clamp(
                this._outputTextScrollY + deltaY * 0.5,
                0,
                maxScroll
            );
            this.outputText.y = -this._outputTextScrollY;
        };

        // Add the event listener
        this.input.on('wheel', this.scrollWheelEvent);
    }

    // User's scroll indicator: text label at bottom of output box
    addScrollIndicator() {
        // Remove any existing indicator
        if (this.scrollIndicator) {
            this.scrollIndicator.destroy();
        }

        // Create scroll indicator
        this.scrollIndicator = this.add.text(
            this.cameras.main.centerX,
            this.outputBoxInfo.y + this.outputBoxInfo.height - 15,
            "▼ Scroll for more ▼",
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: '16px',
                fill: '#ffffff',
                backgroundColor: '#4b237a',
                padding: { x: 8, y: 4 }
            }
        ).setOrigin(0.5, 0.5)
         .setDepth(11)
         .setAlpha(0.8);

        // Add animation to make it more noticeable
        this.tweens.add({
            targets: this.scrollIndicator,
            alpha: { from: 0.8, to: 1 },
            y: '+=5',
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }




    
    addButtonClickEffects() {
        // Apply to all buttons
        console.log("Adding button click effects");
        
        // Define the click handler function - separate from the button setup
        const addClickEffect = (button, callback) => {
            if (!button) return;
            
            // Add click listener for particle effect
            button.setInteractive();
            
            // Replace any existing click handlers with a new one that includes particles
            button.off('pointerdown');
            button.on('pointerdown', (pointer) => {
                console.log("Button clicked:", button.name || "unnamed button");
                
                // Create the particle effect
                // Use green for "NEXT"/"DONE", red for "feedback"
                const label = button.list?.find(obj => obj.text)?.text?.toUpperCase?.() || "";
                const color = (label === "NEXT" || label === "DONE") ? 0x43ea5e : (label.includes("FEEDBACK") ? 0xff1744 : undefined);
                this.createButtonClickParticles(button.x, button.y, color);
                
                // Simulate button press animation
                this.tweens.add({
                    targets: button,
                    scaleX: 0.95,
                    scaleY: 0.95,
                    duration: 100,
                    yoyo: true,
                    ease: "Quad.Out",
                    onComplete: () => {
                        // Call the provided callback
                        if (typeof callback === 'function') {
                            callback();
                        }
                    }
                });
            });
        };
        
        // Apply to each button with its own callback
        addClickEffect(this.doneButton, () => this.onDoneButtonClick());
        addClickEffect(this.feedbackButton, () => this.onFeedbackClick());
    }
      
    createButtonClickParticles(x, y, color) {
        return ButtonFactory.createClickParticles(this, x, y, color);
    }

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
    
            let grd = ctx.createLinearGradient(0, 0, width, height);
            grd.addColorStop(0, '#' + this.COLORS_HEX.BACKGROUND.toString(16).padStart(6, '0'));
            grd.addColorStop(1, '#' + this.COLORS_HEX.BACKGROUND_MID.toString(16).padStart(6, '0'));
    
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, width, height);
            gradientCanvas.refresh();
        }
    
        this.background = this.add.image(0, 0, gradientTextureKey)
            .setOrigin(0)
            .setDisplaySize(width, height)
            .setDepth(-1);
    
        this.tweens.add({
            targets: this.background,
            alpha: { from: 0.8, to: 1 },
            duration: 4000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }    

    createButton(label, callback, centerX, centerY, options = {}) {
        // Ensure scalingManager is passed for responsive sizing
        return ButtonFactory.createButton(
            this,
            label,
            callback,
            centerX,
            centerY,
            { ...options, scalingManager: this.scalingManager }
        );
    }
    
    testUsernameScene() {
        // Direct test function to go to username scene
        console.log("TEST: Directly starting UsernameScene with test data");
        
        // Create minimal test data
        const testScoreData = {
            score: 100,
            mode: this.mode || 'easy',
            level: this.levelValue || 1,
            prompt: "Test prompt",
            inputText: "Test input"
        };
        
        this.scene.start('UsernameScene', {
            mode: this.mode || 'easy',
            scoreData: testScoreData,
            levelValue: this.levelValue || 1
        });
    }
    
    async onDoneButtonClick() {
        // (Removed redundant isTransitioning guard; handled by SceneTransitionManager)

        // Save the user input before clearing it
        const userInputCopy = this.userInput;
        
        const interaction = userInputCopy;
        saveInteraction(interaction, 'userSubmissions');
        
        // Log user input before clearing
        console.log("User input before clearing:", userInputCopy);
        
        // Clean up resources before transitioning
        this.clearInputTextBox();
        if (this.cursorTimer) {
            this.cursorTimer.remove();
            this.cursorTimer = null;
        }
        
        if (this.activeTimeout) {
            clearTimeout(this.activeTimeout);
            this.activeTimeout = null;
        }
        console.log("Initial levelvalue: ", this.levelValue);
        
        // Store the original level value before updating it
        const originalLevelValue = this.levelValue;
        
        // Determine transition context based on score
        let transitionContext = SceneTransitionManager.CONTEXT.NORMAL;
        let transitionColor = this.mode === "hard" ? '#400045' : '#003450';
        
        if (this.totalScore >= 10) {
            this.levelValue = Math.min(this.levelValue + 1, );
            transitionContext = SceneTransitionManager.CONTEXT.LEVEL_UP;
            transitionColor = this.mode === "hard" ? '#600065' : '#004565'; // Brighter colors for success
        } else if (this.totalScore <= 5) {
            this.levelValue = Math.max(this.levelValue - 1, 1);
            transitionContext = SceneTransitionManager.CONTEXT.LOW_SCORE;
            transitionColor = this.mode === "hard" ? '#200025' : '#001620'; // Darker colors for low score
        } 
        
        // Prepare reset data for game scene, preserving level and topK
        console.log("level_value", this.levelValue);
        const resetData = {
            progressPercentage: 50, // Reset to initial value
            levelValue: this.levelValue, // Preserve current level
            topKValue: this.topKValue, // Preserve current topK
            wordCount: 0,
            originalWordCount: 0,
            aiWordCount: 0,
            totalWordCount: 0,
            requiresReset: true // Flag to indicate this is a reset from DoneScene
        };
        
        // Check if this is a high score
        const scoreData = {
            score: this.totalScore,
            mode: this.mode,
            level: originalLevelValue, // Use the original level value, not the updated one
            failCount: this.failCount,
            totalWordCount: this.totalWordCount,
            originalWordCount: this.originalWordCount || (this.totalWordCount - this.failCount),
            prompt: this.prompt,
            response: userInputCopy,  // Use the saved copy, not this.userInput which is now cleared
            inputText: userInputCopy  // Use the saved copy, not this.userInput which is now cleared
        };
        
        // Debug log to verify the data
        console.log("scoreData before high score check:", JSON.stringify(scoreData, null, 2));
        
        try {
            // Add loading indicator while checking
            const outlineColorString = '#' + this.COLORS_HEX.BOX_OUTLINE.toString(16).padStart(6, '0');
            const loadingText = this.add.text(
                this.cameras.main.centerX,
                this.cameras.main.centerY,
                'Checking scores...',
                {
                    fontFamily: 'IBM Plex Mono',
                    fontSize: '32px',
                    fill: outlineColorString,
                    backgroundColor: '#000000',
                    padding: { x: 20, y: 10 },
                    borderRadius: 8,
                    shadow: {
                        offsetX: 0,
                        offsetY: 0,
                        color: outlineColorString,
                        blur: 6,
                        stroke: true,
                        fill: true
                    }
                }
            ).setOrigin(0.5).setDepth(1000);
            
            console.log("About to check if high score:", this.totalScore, this.mode);

            // LOG: Before isHighScore
            console.log("[DEBUG] Before isHighScore");
            const isHighScoreResult = await isHighScore(this.totalScore, this.mode);
            // LOG: After isHighScore
            console.log("[DEBUG] After isHighScore, result:", isHighScoreResult);

            // Remove loading text
            loadingText.destroy();
            console.log("scoredata: ", scoreData);
            console.log("Is high score result:", isHighScoreResult);
            
            // LOG: Before prepareTransition
            console.log("[DEBUG] Before prepareTransition");
            await SceneTransitionManager.prepareTransition(this);
            // LOG: After prepareTransition
            console.log("[DEBUG] After prepareTransition");

            if (isHighScoreResult) {
                // It's a high score! Go to the username entry scene with a cool radial transition
                console.log("High score achieved! Going to username entry");
                console.log("Passing to UsernameScene - Mode:", this.mode, "Level:", originalLevelValue);
                
                // Use the radial transition for high scores - it creates an expanding circle effect
                SceneTransitionManager.radialTransition(this, 'UsernameScene', {
                    mode: this.mode,
                    scoreData: scoreData,
                    levelValue: this.levelValue // Pass updated levelValue
                }, 800, transitionColor, true); // true = expanding circle
            } else {
                // Not a high score, go to the leaderboard with a transition
                console.log("Not a high score, going to leaderboard");
                
                // LOG: Before transition to LeaderboardScene
                console.log("[DEBUG] Before SceneTransitionManager.transition to LeaderboardScene");
                // Use a transition based on score context
                SceneTransitionManager.transition(this, 'LeaderboardScene', 
                    {
                        mode: this.mode,
                        levelValue: this.levelValue, // Pass updated levelValue
                        score: this.totalScore
                    },
                    transitionContext,
                    {
                        duration: 700,
                        color: transitionColor
                    }
                );
                // LOG: After transition to LeaderboardScene
                console.log("[DEBUG] After SceneTransitionManager.transition to LeaderboardScene");
            }
        } catch (error) {
            console.error("Error checking high score:", error);
            // In case of error, use glitch transition to indicate error
            
            // Prepare transition
            await SceneTransitionManager.prepareTransition(this);
            
            // Use glitch transition for error cases
            const targetScene = this.mode === "easy" ? 'GameSceneEasy' : 'GameSceneHard';
            SceneTransitionManager.glitchTransition(this, targetScene, resetData, 600, '#ff0000', 5);
        }
    }

    createInputTextBox(y) {    
        const textBoxWidth = this.uiBoxWidth;
        const padding = 30;
        const minHeight = 60; // Minimum height for the input box

        // Input Text
        if (this.inputText) {
            this.inputText.destroy();
        }

        const displayText = "Prompt: " + this.prompt + "\n" +
            "Response: " + this.userInput;
        this.cursorVisible = true;
        this.inputText = this.add.text(
            0, 0,
            displayText,
            {
                fontFamily: "IBM Plex Mono",
                fontSize: `${DESIGN.UI.MONO_FONT_SIZE}px`,
                fill: "#000000",
                wordWrap: { width: textBoxWidth - padding * 2 },
                align: "left"
            }
        )
        .setOrigin(0, 0)
        .setAlpha(1)
        .setVisible(true)
        .setDepth(101);  // highest depth clearly above input border

        this.inputText.updateText(); // Force redraw explicitly

        // Calculate dynamic height based on text content
        const dynamicHeight = Math.max(this.inputText.height + padding * 2, minHeight);

        // Use provided y or center vertically if not provided
        const boxX = this.cameras.main.centerX - textBoxWidth / 2;
        const boxY = (typeof y === "number") ? y : (this.cameras.main.centerY - dynamicHeight / 2);

        // Always store the actual y and height for later use
        this.inputBoxY = boxY;
        this.inputBoxHeight = dynamicHeight;

        // Input Text Border
        if (this.inputTextBorder) {
            this.inputTextBorder.destroy();
        }
        this.inputTextBorder = this.add.graphics();
        this.inputTextBorder.fillStyle(0xffffff, 1);
        this.inputTextBorder.fillRoundedRect(
            boxX,
            boxY,
            textBoxWidth,
            dynamicHeight,
            DESIGN.UI.OUTLINE.CORNER_RADIUS
        );
        this.inputTextBorder.lineStyle(DESIGN.UI.OUTLINE.WIDTH, this.COLORS_HEX.ACCENT, 1);
        this.inputTextBorder.strokeRoundedRect(
            boxX,
            boxY,
            textBoxWidth,
            dynamicHeight,
            DESIGN.UI.OUTLINE.CORNER_RADIUS
        );
        this.inputTextBorder.setDepth(100).setVisible(true);

        // Position text inside the box with padding
        this.inputText.setPosition(
            boxX + padding,
            boxY + padding
        );
    }
    
    createPromptTextBox() {
        this.promptBoxY = 130;
    
        this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        const padding = 30;
    
        // Clear existing prompt box graphics if it exists
        if (this.promptTextBox) {
            this.promptTextBox.clear();
        } else {
            this.promptTextBox = this.add.graphics();
        }
    
        // Clear existing prompt text if it exists
        if (this.promptText) {
            this.promptText.destroy();
        }

        
        
        let defaultText;
        if (this.mode === "hard") {
            //defaultText = `Total Words: ${this.totalWordCount - this.failCount}\n` + `Unoriginal Words Attempted: ${this.failCount}\nAI Overlord's Assessment: ${this.aiScore}/15\nTotal Score: ${this.totalScore}/15`;
            defaultText =`Unoriginal Words Attempted: ${this.failCount}\nAI Overlord's Assessment: ${this.aiScore}/15\nTotal Score: ${this.totalScore}/15`;

        }
        else if (this.mode === "easy") {
            //defaultText = `Total Words: ${this.totalWordCount}\n` + `Unoriginal Words Attempted: ${this.failCount}\nAI Overlord's Assessment: ${this.aiScore}/15\nTotal Score: ${this.totalScore}/15`;
            defaultText = `Unoriginal Words Attempted: ${this.failCount}\nAI Overlord's Assessment: ${this.aiScore}/15\nTotal Score: ${this.totalScore}/15`;
        }


        // Position the text at the left side with the same padding as outputbox
        const textX = this.cameras.main.centerX - this.uiBoxWidth / 2 + padding;
        
        this.promptText = this.add.text(
            textX, 
            0, // Y will be adjusted later
            defaultText,
            {
                fontFamily: "IBM Plex Mono",
                fontSize: `${DESIGN.UI.MONO_FONT_SIZE}px`,
                color: this.COLORS_TEXT.PRIMARY,
                wordWrap: { width: this.uiBoxWidth - padding * 2 },
                align: "left",
                lineSpacing: 5
            }
        ).setOrigin(0, 0);
    
        // ✅ Ensure text box height dynamically adjusts
        const textHeight = this.promptText.height + padding * 2;
    
        // ✅ Create the Prompt Background Box
        this.promptTextBox.fillStyle(this.COLORS_HEX.BOX_FILL, 1);
        this.promptTextBox.fillRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2, 
            this.promptBoxY,
            this.uiBoxWidth,
            textHeight,
            DESIGN.UI.OUTLINE.CORNER_RADIUS
        );
    
        // ✅ Add Outline to Match Output Box
        this.promptTextBox.lineStyle(DESIGN.UI.OUTLINE.WIDTH, this.COLORS_HEX.BOX_OUTLINE, 1);
        this.promptTextBox.strokeRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2, 
            this.promptBoxY,
            this.uiBoxWidth,
            textHeight,
            DESIGN.UI.OUTLINE.CORNER_RADIUS
        );
    
        // ✅ Position the Text inside the Box
        this.promptText.setY(this.promptBoxY + padding);
    
        // ✅ Ensure Prompt Box Appears Above Other UI Elements
        this.promptTextBox.setDepth(102);
        this.promptText.setDepth(103);
    }
    
    // Fixed clearInputTextBox method
    clearInputTextBox() {
        this.userInput = '';
        if (this.inputText) {
            this.inputText.setText('_');
        }
        if (this.autocompleteText) {
            this.autocompleteText.setText('');
        }
    }

     // Style methods
     getPromptTextStyle() {
        return {
            fontFamily: "IBM Plex Mono",
            fontSize: `${DESIGN.UI.MONO_FONT_SIZE}px`,
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
            fillColor: this.COLORS_HEX.BOX_FILL,
            fillAlpha: 0.5,
            hasOutline: true,
            outlineWidth: DESIGN.UI.OUTLINE.WIDTH,
            outlineColor: this.COLORS_HEX.BOX_OUTLINE,
            cornerRadius: DESIGN.UI.OUTLINE.CORNER_RADIUS
        };
    }
   
    init(data) {
        // Always reset transition flag on scene entry
        this.isTransitioning = false;

        if (!data.mode) {
            console.error("Error: No data received in DoneScene.");
        } else {
            console.log("Data successfully received in DoneScene.");
        }
        this.mode = data.mode || null;
        this.levelValue = data.levelValue || null;
        this.userInput = data.userInput || '';
        this.topKValue = data.topKValue || null;
        this.evaluation = data.outputText || null;
        this.failCount = data.failCount || 0;
        this.totalWordCount = data.totalWordCount || 0;
        this.prompt = data.prompt;
        this.score = data.score || null;
        //this.wordCount = data.wordCount || 0;
        console.log("DoneScene initialized with mode:", this.mode, "levelValue:", this.levelValue, "topKValue:", this.topKValue, "score:", this.score);

        if (this.mode === "easy") {
            this.COLORS_HEX = EASY_COLORS_HEX;
            this.COLORS_TEXT = EASY_COLORS_TEXT;
        }
        else if (this.mode === "hard") {
            this.COLORS_HEX = HARD_COLORS_HEX;
            this.COLORS_TEXT = HARD_COLORS_TEXT;
        } else {
            console.error("Error: Invalid mode in DoneScene.");
        }

        // Reset key scene elements to ensure proper initialization when returning from other scenes
        this.promptTextBox = null;
        this.promptText = null;
    }

    createBackgroundPattern() {
        const patternKey = 'patternCanvas';
        
        // ✅ Check if texture already exists and remove it before recreating
        if (this.textures.exists(patternKey)) {
            this.textures.remove(patternKey);
        }
        // Create pattern texture
        const pattern = this.textures.createCanvas(patternKey, 100, 100);
        const ctx = pattern.getContext();
        
        // Draw pattern (dots, stars, or any subtle pattern)
        ctx.fillStyle = '#' + this.COLORS_HEX.BACKGROUND.toString(16).padStart(6, '0');
        ctx.fillRect(0, 0, 100, 100);
        
        for (let i = 0; i < 10; i++) {
          ctx.fillStyle = '#' + this.COLORS_HEX.BACKGROUND_MID.toString(16).padStart(6, '0');
          ctx.beginPath();
          ctx.arc(Math.random() * 100, Math.random() * 100, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        pattern.refresh();
        
        // Add pattern as background
        const bg = this.add.tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, patternKey)
          .setOrigin(0)
          .setDepth(-2);
          
        // Add subtle movement
        this.tweens.add({
          targets: bg,
          tilePositionX: { from: 0, to: 100 },
          tilePositionY: { from: 0, to: 100 },
          duration: 20000,
          repeat: -1
        });
    }


    async create() {
        this.cameras.main.scrollY = 0;

        // Initialize scaling manager for responsive UI
        this.scalingManager = new ScalingManager(this);

        // Use the same background based on mode and level
        if (this.mode === "easy") {
            createBackground(this, THEMES.easy.background, this.levelValue);
        } else if (this.mode === "hard") {
            createBackground(this, THEMES.hard.background, this.levelValue);
        } else {
            // Fallback to the old background effect if mode is invalid
            this.createBackgroundEffect();
        }

        // Extract all digits X in the form X/5 from this.evaluation, in order
        let xOver5Digits = [];
        if (typeof this.evaluation === "string") {
            const regex = /\b(\d)\/5\b/g;
            let match;
            while ((match = regex.exec(this.evaluation)) !== null) {
                xOver5Digits.push(match[1]);
            }
            console.log("Digits in X/5 form:", xOver5Digits);
        }
        function sumArray(arr) {
          return arr.reduce((acc, val) => acc + Number(val), 0);
        }
        this.aiScore = sumArray(xOver5Digits);
        //const wordCountScore = Math.min(this.totalWordCount, 20);
        this.failCountScore = Math.min(this.failCount, 15);
        this.totalScore = this.aiScore  - this.failCountScore

        // Ensure score is 0 if userInput is empty or only whitespace
        if (typeof this.userInput === "string" && this.userInput.trim() === "") {
            this.totalScore = 0;
        }

        // Input Box Creation
        this.uiBoxWidth = this.cameras.main.width * (5 / 6);

        // Create prompt first so we can position input box relative to it
        this.createPromptTextBox();

        // Calculate y for input box: bottom of prompt box + 30px
        const promptPadding = 30;
        const promptBottom = this.promptBoxY + this.promptText.height + promptPadding * 2;
        const inputBoxY = promptBottom + 30;

        // Create input text box and get its height
        this.createInputTextBox(inputBoxY);
        // inputTextBorder is the border, its y and height are used for placement

        // Debug: log inputBoxY and inputBoxHeight
        if (typeof this.inputBoxY !== "undefined" && typeof this.inputBoxHeight !== "undefined") {
            console.log("inputBoxY:", this.inputBoxY, "inputBoxHeight:", this.inputBoxHeight);
        } else {
            console.warn("inputBoxY or inputBoxHeight not defined before createOutputTextBox");
        }

        this.createOutputTextBox();

        // Ensure visibility and layering explicitly
        this.inputTextBorder.setDepth(100).setAlpha(1).setVisible(true);
        this.inputText.setDepth(101).setAlpha(1).setVisible(true);

        // Button positioning: 30px below output box bottom
        const buttonCenterX = this.cameras.main.centerX + this.uiBoxWidth / 2 - DESIGN.UI.BUTTON.WIDTH - 20;
        const outlineWidth = DESIGN.UI.OUTLINE.WIDTH;
        const buttonCenterY = this.outputBoxY + this.outputBoxHeight + outlineWidth / 2 + DESIGN.UI.BUTTON.BELOW_TEXTBOX_GAP + DESIGN.UI.BUTTON.HEIGHT / 2;
        this.doneButton = this.createButton("NEXT", null, buttonCenterX, buttonCenterY, {
            depth: 102, // ensure button is visible
            name: 'doneButton'
        });
        // Set the name on the Game Object for debugging
        this.doneButton.name = 'doneButton';

        // Tooltip on hover (match BaseGameScene style)
        this.doneButton.setInteractive()
            .on('pointerover', () => this.showTooltip("try another prompt", this.doneButton.x, this.doneButton.y - DESIGN.UI.BUTTON.HEIGHT))
            .on('pointerout', () => this.hideTooltips());

const padding = 30;
// Calculate safe area insets for mobile (if available)
let safeAreaLeft = 0, safeAreaBottom = 0;
if (typeof window !== "undefined" && window.CSS && window.CSS.supports && window.CSS.supports("padding-bottom: env(safe-area-inset-bottom)")) {
    // Try to read the safe area insets from CSS environment variables
    safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--satmp-safe-area-inset-left') || 0, 10);
    safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--satmp-safe-area-inset-bottom') || 0, 10);
    // Fallback: try direct env() if custom properties not set
    if (!safeAreaLeft) {
        safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('padding-left') || 0, 10);
    }
    if (!safeAreaBottom) {
        safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('padding-bottom') || 0, 10);
    }
}
// Default to 0 if not found
safeAreaLeft = isNaN(safeAreaLeft) ? 0 : safeAreaLeft;
safeAreaBottom = isNaN(safeAreaBottom) ? 0 : safeAreaBottom;
const leftPadding = Math.max(30, safeAreaLeft);
const bottomPadding = Math.max(30, safeAreaBottom);

this.feedbackButton = this.createButton(
    "FEEDBACK",
    () => this.onFeedbackClick(),
    DESIGN.UI.BUTTON.WIDTH / 2 + padding,
    this.scale.height - DESIGN.UI.BUTTON.HEIGHT / 2 - padding,
    'Share your feedback'
);
        
        // Test button removed as requested

        
        

   
        

        this.addButtonClickEffects();

        if (this.totalScore >= 10) {
            this.createScoreRewardEffect();
          } else if (this.totalScore < 5) {
            this.createLowScoreWarning();
          } else {
            this.createMidScoreEffect();
          }
    
    }

    // Tooltip methods (copied and adapted from BaseGameScene)
    showTooltip(text, x, y) {
        this.hideTooltips();
        const padding = 10;
        const tooltipText = this.add.text(0, 0, text, {
            fontFamily: 'IBM Plex Mono',
            fontSize: '16px',
            color: '#ffffff',
            align: 'center'
        });
        const width = tooltipText.width + padding * 2;
        const height = tooltipText.height + padding * 2;
        const background = this.add.graphics();
        background.fillStyle(0x000000, 0.8);
        background.fillRoundedRect(0, 0, width, height, 8);
        background.lineStyle(1, 0xffffff, 0.3);
        background.strokeRoundedRect(0, 0, width, height, 8);
        const container = this.add.container(x - width/2, y - height - 5, [background, tooltipText]);
        tooltipText.setPosition(padding, padding);
        this.tooltips.push(container);
        container.setAlpha(0);
        this.tweens.add({
            targets: container,
            alpha: 1,
            duration: 200,
            ease: 'Quad.easeOut'
        });
        container.setDepth(1000);
    }

    hideTooltips() {
        this.tooltips.forEach(tooltip => {
            this.tweens.add({
                targets: tooltip,
                alpha: 0,
                duration: 200,
                ease: 'Quad.easeOut',
                onComplete: () => tooltip.destroy()
            });
        });
        this.tooltips = [];
    }



createLowScoreWarning() {
    if (this.totalScore < 5) {
      // Create red warning overlay
      const warningOverlay = this.add.rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        this.cameras.main.width,
        this.cameras.main.height,
        0xFF0000, // Red
        0.2
      ).setDepth(200);
      
      // Flash warning
      this.tweens.add({
        targets: warningOverlay,
        alpha: { from: 0.2, to: 0 },
        duration: 200,
        repeat: 5,
        onComplete: () => warningOverlay.destroy()
      });
      
      // Create error messages that appear like terminal errors
      const errorMessages = [
        "ERROR: AI DETECTION TRIGGERED",
        "WARNING: HUMAN TEXT COEFFICIENT LOW",
        "SYSTEM FAILURE: CREATIVITY NOT FOUND",
        "CRITICAL: TOO PREDICTABLE"
      ];
      
      errorMessages.forEach((msg, index) => {
        const errorText = this.add.text(
          20,
          30 + (index * 40),
          "",
          {
            fontFamily: "Courier Prime",
            fontSize: "20px",
            color: "#FF0000",
            stroke: "#000000",
            strokeThickness: 2
          }
        ).setDepth(201);
        
        // Typewriter effect for error
        let currentChar = 0;
        
        this.time.addEvent({
          delay: 30,
          repeat: msg.length - 1,
          callback: () => {
            errorText.text += msg[currentChar];
            currentChar++;
            // Add glitch occasionally
            if (Phaser.Math.Between(0, 10) > 8) {
              const tempChar = msg[currentChar];
              errorText.text = errorText.text.slice(0, -1) + '@#%';
              this.time.delayedCall(50, () => {
                errorText.text = errorText.text.slice(0, -3) + (tempChar || '');
              });
            }
          },
          onComplete: () => {
            // Shake the text
            this.tweens.add({
              targets: errorText,
              x: "+=10",
              duration: 50,
              yoyo: true,
              repeat: 3
            });
          }
        });
        
        // Fade out after delay
        this.time.delayedCall(4000, () => {
          this.tweens.add({
            targets: errorText,
            alpha: 0,
            duration: 300,
            onComplete: () => errorText.destroy()
          });
        });
      });
      
      // Add screen corruption effect
      this.time.delayedCall(500, () => this.createScreenCorruptionEffect());
    }
  }
  
  createScreenCorruptionEffect() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Create screen distortion lines
    for (let i = 0; i < 10; i++) {
      const y = Phaser.Math.Between(0, height);
      const lineHeight = Phaser.Math.Between(2, 10);
      
      const line = this.add.rectangle(
        width / 2,
        y,
        width,
        lineHeight,
        0xFFFFFF,
        0.7
      ).setDepth(198);
      
      // Animate the glitch line
      this.tweens.add({
        targets: line,
        x: { from: -width/2, to: width*1.5 },
        duration: Phaser.Math.Between(200, 800),
        onComplete: () => line.destroy()
      });
    }
    
    // Create a few larger block corruptions
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const blockWidth = Phaser.Math.Between(20, 100);
      const blockHeight = Phaser.Math.Between(10, 30);
      
      const block = this.add.rectangle(
        x,
        y,
        blockWidth,
        blockHeight,
        0xFF0000,
        0.5
      ).setDepth(197);
      
      this.tweens.add({
        targets: block,
        alpha: 0,
        duration: Phaser.Math.Between(300, 1000),
        onComplete: () => block.destroy()
      });
    }
    
    // Schedule another round of corruption
    this.time.delayedCall(Phaser.Math.Between(300, 700), () => {
      if (Phaser.Math.Between(0, 10) > 5) {
        this.createScreenCorruptionEffect();
      }
    });
  }

  createScoreRewardEffect() {
    if (this.totalScore >= 10) {
      // Create the level up text with full content immediately
      const levelUpText = this.add.text(
        this.cameras.main.centerX,
        60,
        "NOT BAD, HUMAN",
        {
          fontFamily: "Courier Prime",
          fontSize: "60px",
          color: "#33FF33", // Terminal green
          stroke: "#000000",
          strokeThickness: 4,
          shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 5, fill: true }
        }
      ).setOrigin(0.5).setDepth(201);
      
      // Add pulsing glow effect to the text
      const glowFX = levelUpText.postFX.addGlow(0xffffff, 0, 0, false, 0.1, 24);
      
      // Create a pulsing effect for the glow
      this.tweens.add({
        targets: glowFX,
        outerStrength: 4,
        yoyo: true,
        loop: -1,
        ease: 'sine.inout',
        duration: 1000
      });
      
      // Add a subtle scaling animation for the text
      this.tweens.add({
        targets: levelUpText,
        scale: { from: 1, to: 1.1 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inout'
      });
      
      // Create a subtle background effect
      const glowBackground = this.add.rectangle(
        this.cameras.main.centerX,
        60,
        levelUpText.width + 100,
        levelUpText.height + 30,
        0x33FF33, // Terminal green
        0.1
      ).setDepth(200);
      
      // Add pulsing effect to the background
      this.tweens.add({
        targets: glowBackground,
        alpha: { from: 0.1, to: 0.2 },
        width: { from: levelUpText.width + 100, to: levelUpText.width + 120 },
        height: { from: levelUpText.height + 30, to: levelUpText.height + 40 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inout'
      });
      
      // Remove only background effect after 5 seconds, keep text visible
      this.time.delayedCall(5000, () => {
        // Fade out only the background effect
        this.tweens.add({
          targets: glowBackground,
          alpha: 0,
          duration: 800,
          onComplete: () => {
            glowBackground.destroy();
          }
        });
        
        // Keep the text but stop its animations
        this.tweens.killTweensOf(levelUpText);
        // Reset scale to normal
        levelUpText.setScale(1);
      });
    }
  }
  
  createMidScoreEffect() {
    if (this.totalScore >= 5 && this.totalScore < 10) {
      // Create a mild amber overlay
      const warningOverlay = this.add.rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        this.cameras.main.width,
        this.cameras.main.height,
        EASY_COLORS_HEX.WARNING, // Amber
        0.1
      ).setDepth(200);
      
      // Gentle flash warning
      this.tweens.add({
        targets: warningOverlay,
        alpha: { from: 0.1, to: 0 },
        duration: 300,
        repeat: 1,
        onComplete: () => warningOverlay.destroy()
      });
      
      // Create the text immediately with complete content
      const notQuiteText = this.add.text(
        this.cameras.main.centerX,
        60,
        "NOT QUITE",
        {
          fontFamily: "Courier Prime",
          fontSize: "60px",
          color: EASY_COLORS_HEX.WARNING, 
          stroke: "#000000",
          strokeThickness: 3,
          shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 3, fill: true }
        }
      ).setOrigin(0.5).setDepth(201);
      
      // Remember original position and text
      const originalX = notQuiteText.x;
      const originalY = notQuiteText.y;
      const fullText = "NOT QUITE";
      
      // Hide text initially - we'll show it with the typewriter effect
      notQuiteText.setText("");
      
      // Typewriter animation
      let currentChar = 0;
      
      const typewriterTimer = this.time.addEvent({
        delay: 80,
        repeat: fullText.length - 1,
        callback: () => {
          notQuiteText.text += fullText[currentChar];
          currentChar++;
        },
        callbackScope: this
      });
      
      // Calculate when typewriter will be complete
      const typewriterDuration = 80 * fullText.length;
      
      // Start flickering after typewriter completes
      this.time.delayedCall(typewriterDuration + 100, () => {
        let flickerCount = 0;
        const maxFlickers = 16; // More flickers for a longer effect
        
        // Create a realistic flicker sequence with randomness
        const createFlickerEffect = () => {
          if (flickerCount >= maxFlickers) {
            // End of flicker effect - ensure text is visible and in original position
            notQuiteText.setText(fullText);
            notQuiteText.setPosition(originalX, originalY);
            notQuiteText.setColor("#FFAA00"); // Reset to original color
            return;
          }
          
          flickerCount++;
          
          // Choose a random flicker effect for this cycle
          const effectType = Phaser.Math.Between(0, 7);
          
          switch (effectType) {
            case 0: // Completely off
              notQuiteText.setText("");
              break;
              
            case 1: // Partially garbled text
              let garbled = "";
              for (let i = 0; i < fullText.length; i++) {
                if (Math.random() > 0.3) {
                  garbled += fullText[i];
                } else {
                  garbled += " ";
                }
              }
              notQuiteText.setText(garbled);
              break;
              
            case 2: // Text with random position shift
              notQuiteText.setText(fullText);
              notQuiteText.setPosition(
                originalX + Phaser.Math.Between(-4, 4),
                originalY + Phaser.Math.Between(-2, 2)
              );
              break;
              
            case 3: // Text with color change
              notQuiteText.setText(fullText);
              notQuiteText.setColor("#FFFFFF"); // Flash to white
              break;
              
            case 4: // Normal text (brief stability in the flicker)
              notQuiteText.setText(fullText);
              notQuiteText.setPosition(originalX, originalY);
              notQuiteText.setColor("#FFAA00");
              break;
              
            case 5: // Corrupted text (with symbols)
              let corrupted = "";
              for (let i = 0; i < fullText.length; i++) {
                if (Math.random() > 0.2) {
                  corrupted += fullText[i];
                } else {
                  corrupted += ".#@*"[Math.floor(Math.random() * 4)];
                }
              }
              notQuiteText.setText(corrupted);
              break;
              
            case 6: // Doubled text (brief artifact)
              notQuiteText.setText(fullText);
              const ghostText = this.add.text(
                originalX + 2,
                originalY + 2,
                fullText,
                {
                  fontFamily: "IBM Plex Mono",
                  fontSize: "40px",
                  color: "#FFFFFF",
                  alpha: 0.4
                }
              ).setOrigin(0.5).setDepth(200);
              
              this.time.delayedCall(60, () => {
                ghostText.destroy();
              });
              break;
              
            case 7: // Dimmer text
              notQuiteText.setText(fullText);
              notQuiteText.setAlpha(0.5);
              break;
          }
          
          // Schedule next flicker with irregular timing
          const nextDelay = Phaser.Math.Between(30, 150);
          this.time.delayedCall(nextDelay, createFlickerEffect, [], this);
          
          // Occasionally reset back to normal between effects
          if (Math.random() > 0.7) {
            this.time.delayedCall(Phaser.Math.Between(10, 30), () => {
              notQuiteText.setText(fullText);
              notQuiteText.setPosition(originalX, originalY);
              notQuiteText.setColor("#FFAA00");
              notQuiteText.setAlpha(1);
            });
          }
        };
        
        // Start the flickering effect
        createFlickerEffect();
      });
    }
  }

  
  createMatrixRainEffect() {
    const drops = [];
    const fontSize = 14;
    const columns = Math.floor(this.cameras.main.width / fontSize);
    
    // Create text objects for each column
    for (let i = 0; i < columns; i++) {
      // Random starting position
      const y = Phaser.Math.Between(-500, -50);
      const char = String.fromCharCode(Phaser.Math.Between(33, 126));
      
      const drop = this.add.text(
        i * fontSize, 
        y,
        char,
        {
          fontFamily: 'Courier Prime',
          fontSize: `${fontSize}px`,
          color: '#33FF33'
        }
      ).setDepth(198).setAlpha(0.8);
      
      drops.push({
        text: drop,
        speed: Phaser.Math.FloatBetween(3, 15),
        length: Phaser.Math.Between(5, 30)
      });
    }
    
    // Update function to animate drops
    this.matrixTimer = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        drops.forEach(drop => {
          // Move drop down
          drop.text.y += drop.speed;
          
          // Change character randomly sometimes
          if (Phaser.Math.Between(0, 10) > 8) {
            drop.text.setText(String.fromCharCode(Phaser.Math.Between(33, 126)));
          }
          
          // Reset if off screen
          if (drop.text.y > this.cameras.main.height + 50) {
            drop.text.y = Phaser.Math.Between(-200, -50);
            drop.speed = Phaser.Math.FloatBetween(3, 15);
          }
        });
      },
      callbackScope: this
    });
    
    // Stop the effect after 3 seconds
    this.time.delayedCall(3000, () => {
      this.matrixTimer.remove();
      drops.forEach(drop => {
        this.tweens.add({
          targets: drop.text,
          alpha: 0,
          duration: 500,
          onComplete: () => drop.text.destroy()
        });
      });
    });
  }

}
