import { HARD_COLORS_HEX as COLORS_HEX, HARD_COLORS_TEXT as COLORS_TEXT, OUTLINE_WIDTH, CORNER_RADIUS, buttonHeight, buttonSpacing, buttonWidth} from "../config/design.js";
import { saveInteraction } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";

export default class DoneScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DoneScene' });
        this.mode = null;
        this.userInput = '';
        this.tooltips = []; // For tooltips like in BaseGameScene
    }

    
    createOutputTextBox() {
        const outputBoxWidth = this.uiBoxWidth;
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
                fontFamily: 'Nunito',
                fontSize: "24px",
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
        // button is placed 30px below output box, then buttonHeight/2 to center, then buttonHeight/2 to bottom
        // So: outputBoxY + outputBoxHeight + 30 + buttonHeight <= canvasHeight - 30
        // => outputBoxHeight <= canvasHeight - 30 - outputBoxY - 30 - buttonHeight
        const maxOutputBoxHeight = canvasHeight - buttonMargin - outputBoxY - 30 - buttonHeight;
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
                fontFamily: 'Nunito',
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
        const buttons = [this.doneButton];
        
        buttons.forEach(button => {
          if (!button) return;
          
          // Add click listener for particle effect
          button.setInteractive();
          
          // Replace any existing click handlers with a new one that includes particles
          button.off('pointerdown');
          button.on('pointerdown', (pointer) => {
            // Create the particle effect
            this.createButtonClickParticles(button.x, button.y);
            
            // Simulate button press animation
            this.tweens.add({
              targets: button,
              scaleX: 0.95,
              scaleY: 0.95,
              duration: 100,
              yoyo: true,
              ease: "Quad.Out",
              onComplete: () => {
                // Call the appropriate button function based on button type
                this.onDoneButtonClick();
              }
            });
          });
        });
    }
      
    createButtonClickParticles(x, y) {
        return ButtonFactory.createClickParticles(this, x, y);
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
            grd.addColorStop(0, "#13091e");
            grd.addColorStop(1, "#3a1f5d");
    
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
        return ButtonFactory.createButton(this, label, callback, centerX, centerY, options);
    }
    
    onDoneButtonClick() {
        const interaction = this.userInput;
        saveInteraction(interaction, 'feedback');
        
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
        
        // Add a small delay to ensure cleanup completes
        // Prepare reset data for game scene, preserving level and topK
        const resetData = {
            progressPercentage: 50, // Reset to initial value
            levelValue: this.levelValue || this.level, // Preserve current level
            topKValue: this.topKValue || this.topK, // Preserve current topK
            wordCount: 0,
            originalWordCount: 0,
            aiWordCount: 0,
            totalWordCount: 0,
            requiresReset: true // Flag to indicate this is a reset from DoneScene
        };

        this.time.delayedCall(50, () => {
            if (this.mode === "easy") {
                this.scene.start('GameSceneEasy', resetData);
            }
            else if (this.mode === "hard") {
                this.scene.start('GameSceneHard', resetData);
            }
        });
    }

    createInputTextBox(y) {    
        const textBoxWidth = this.uiBoxWidth;
        const padding = 40;
        const minHeight = 60; // Minimum height for the input box

        // Input Text
        if (this.inputText) {
            this.inputText.destroy();
        }
        this.cursorVisible = true;
        this.inputText = this.add.text(
            0, 0,
            this.userInput,
            {
                fontFamily: "Nunito",
                fontSize: "20px",
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
            CORNER_RADIUS
        );
        this.inputTextBorder.lineStyle(OUTLINE_WIDTH, COLORS_HEX.MIDPURPLE, 1);
        this.inputTextBorder.strokeRoundedRect(
            boxX,
            boxY,
            textBoxWidth,
            dynamicHeight,
            CORNER_RADIUS
        );
        this.inputTextBorder.setDepth(100).setVisible(true);

        // Position text inside the box with padding
        this.inputText.setPosition(
            boxX + padding,
            boxY + padding
        );
    }
    
    createPromptTextBox() {
        this.promptBoxY = 110;
    
        this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        const padding = 40;
    
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
    
        // ✅ Default text to calculate initial size
        const defaultText = this.prompt;
        this.promptText = this.add.text(
            this.cameras.main.centerX, 
            0, // Y will be adjusted later
            defaultText,
            {
                fontFamily: "Nunito",
                fontSize: "22px",
                color: COLORS_TEXT.WHITE,
                wordWrap: { width: this.uiBoxWidth - padding * 2 },
                align: "center"
            }
        ).setOrigin(0.5, 0);
    
        // ✅ Ensure text box height dynamically adjusts
        const textHeight = this.promptText.height + padding * 2;
    
        // ✅ Create the Prompt Background Box
        this.promptTextBox.fillStyle(COLORS_HEX.BLUE_BACKGROUND, 1);
        this.promptTextBox.fillRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2, 
            this.promptBoxY,
            this.uiBoxWidth,
            textHeight,
            CORNER_RADIUS
        );
    
        // ✅ Add Outline to Match Output Box
        this.promptTextBox.lineStyle(OUTLINE_WIDTH, COLORS_HEX.MIDPURPLE, 1);
        this.promptTextBox.strokeRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2, 
            this.promptBoxY,
            this.uiBoxWidth,
            textHeight,
            CORNER_RADIUS
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
            fillColor: COLORS_HEX.BACKGROUND,
            fillAlpha: 0.5,
            hasOutline: true,
            outlineWidth: OUTLINE_WIDTH,
            outlineColor: COLORS_HEX.BLUE,
            cornerRadius: CORNER_RADIUS
        };
    }
   
    init(data) {
        if (!data.mode) {
            console.error("Error: No data received in DoneScene.");
        } else {
            console.log("Data successfully received in DoneScene.");
        }
        this.mode = data.mode || null;
        this.level = data.level || null;
        this.userInput = data.userInput || '';
        this.topK = data.topK || null;
        this.evaluation = data.outputText || null;
        this.failCount = data.failCount || null;
        this.prompt = data.prompt;

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
        ctx.fillStyle = '#2c1155';
        ctx.fillRect(0, 0, 100, 100);
        
        for (let i = 0; i < 10; i++) {
          ctx.fillStyle = '#4b237a';
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
        this.createBackgroundEffect();

        // Input Box Creation
        this.uiBoxWidth = this.cameras.main.width * (5 / 6);

        // Create prompt first so we can position input box relative to it
        this.createPromptTextBox();

        // Calculate y for input box: bottom of prompt box + 30px
        const promptPadding = 40;
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
        const buttonCenterX = this.cameras.main.centerX + this.uiBoxWidth / 2 - buttonWidth - 20;
        const buttonCenterY = this.outputBoxY + this.outputBoxHeight + 30 + buttonHeight / 2;
        this.doneButton = this.createButton("NEXT", () => this.onDoneButtonClick(), buttonCenterX, buttonCenterY, {
            depth: 102 // ensure button is visible
        });

        // Tooltip on hover (match BaseGameScene style)
        this.doneButton.setInteractive()
            .on('pointerover', () => this.showTooltip("try another prompt", this.doneButton.x, this.doneButton.y - buttonHeight))
            .on('pointerout', () => this.hideTooltips());

        this.addButtonClickEffects();
    }

    // Tooltip methods (copied and adapted from BaseGameScene)
    showTooltip(text, x, y) {
        this.hideTooltips();
        const padding = 10;
        const tooltipText = this.add.text(0, 0, text, {
            fontFamily: 'Nunito',
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
}
