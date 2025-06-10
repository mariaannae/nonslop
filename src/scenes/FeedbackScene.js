import { BASIC_COLORS_HEX, EASY_COLORS_HEX, HARD_COLORS_HEX, BASIC_COLORS_TEXT, EASY_COLORS_TEXT, HARD_COLORS_TEXT, DESIGN, THEMES } from "../config/design.js";
import { saveInteraction } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import { createBackground } from "../backgrounds/createBackground.js";
import { ScalingManager } from "../config/scaling.js";

// DESIGN.UI.OUTLINE.WIDTH, DESIGN.UI.OUTLINE.CORNER_RADIUS, DESIGN.UI.BUTTON.HEIGHT, DESIGN.UI.BUTTON.SPACING, DESIGN.UI.BUTTON.WIDTH

export default class FeedbackScene extends Phaser.Scene {
    constructor() {
        super({ key: 'FeedbackScene' });
        this.mode = null;
        this.userInput = '';
        this.levelValue = 1;
        this.COLORS_HEX = BASIC_COLORS_HEX;
        this.COLORS_TEXT = BASIC_COLORS_TEXT;
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
            // Use green for "NEXT", red for "feedback"
            const label = button.list?.find(obj => obj.text)?.text?.toUpperCase?.() || "";
            const color = label === "NEXT" ? 0x43ea5e : (label.includes("FEEDBACK") ? 0xff1744 : undefined);
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
                // Call the appropriate button function based on button type
                this.onDoneButtonClick();
              }
            });
          });
        });
    }
      
    createButtonClickParticles(x, y, color) {
        return ButtonFactory.createClickParticles(this, x, y, color);
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
            levelValue: this.levelValue, // Preserve current level
            topKValue: this.topKValue, // Preserve current topK
            wordCount: 0,
            originalWordCount: 0,
            aiWordCount: 0,
            totalWordCount: 0,
            requiresReset: true // Flag to indicate this is a reset from FeedbackScene
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

    createInputTextBox() {    
        const textBoxWidth = this.uiBoxWidth;
        const textBoxHeight = 240;
        const padding = 30;
    
        // Input Text Border
        if (this.inputTextBorder) {
            this.inputTextBorder.destroy();
        }
        this.inputTextBorder = this.add.graphics();
        this.inputTextBorder.fillStyle(0xffffff, 1);
        this.inputTextBorder.fillRoundedRect(
            this.cameras.main.centerX - textBoxWidth / 2,
            this.cameras.main.centerY - textBoxHeight / 2,
            textBoxWidth,
            textBoxHeight,
            DESIGN.UI.OUTLINE.CORNER_RADIUS
        );
        this.inputTextBorder.lineStyle(DESIGN.UI.OUTLINE.WIDTH, this.COLORS_HEX.ACCENT, 1);
        this.inputTextBorder.strokeRoundedRect(
            this.cameras.main.centerX - textBoxWidth / 2,
            this.cameras.main.centerY - textBoxHeight / 2,
            textBoxWidth,
            textBoxHeight,
            DESIGN.UI.OUTLINE.CORNER_RADIUS
        );
        this.inputTextBorder.setDepth(100).setVisible(true);

        // Make input area interactive for mobile typing
        this.inputTextBorder.setInteractive(
            new Phaser.Geom.Rectangle(
                this.cameras.main.centerX - textBoxWidth / 2,
                this.cameras.main.centerY - textBoxHeight / 2,
                textBoxWidth,
                textBoxHeight
            ),
            Phaser.Geom.Rectangle.Contains
        ).on('pointerdown', () => {
            this.focusHiddenInput();
        });

        // Input Text
        if (this.inputText) {
            this.inputText.destroy();
        }
        this.userInput = "";
        this.cursorVisible = true;

        this.inputText = this.add.text(
            this.cameras.main.centerX - textBoxWidth / 2 + padding,
            this.cameras.main.centerY - textBoxHeight / 2 + padding,
            "_",
            {
                fontFamily: "IBM Plex Mono",
                fontSize: `${DESIGN.UI.TEXTBOX_FONT_SIZE}px`,
                fill: "#000000",
                wordWrap: { width: textBoxWidth - padding * 2 },
                align: "left",
                padding: { x: padding, y: 10 }
            }
        )
        .setOrigin(0, 0)
        .setAlpha(1)
        .setVisible(true)
        .setDepth(101);  // highest depth clearly above input border

        this.inputText.updateText(); // Force redraw explicitly

        // Set up hidden input for mobile typing
        this.setupHiddenInput();

        // Cursor blinking timer
        if (this.cursorTimer) this.cursorTimer.remove();
        this.cursorTimer = this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
                this.cursorVisible = !this.cursorVisible;
                this.updateCursor();
            }
        });

        // Final cursor update
        this.updateCursor();
    }

    setupHiddenInput() {
        // Remove any previous input
        if (this._hiddenInput) {
            document.body.removeChild(this._hiddenInput);
            this._hiddenInput = null;
        }
        // Create hidden input
        const input = document.createElement('input');
        input.type = 'text';
        input.autocapitalize = 'sentences';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.maxLength = 500;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        input.style.pointerEvents = 'auto';
        input.style.left = '0';
        input.style.top = '0';
        input.style.width = '1px';
        input.style.height = '1px';
        input.value = this.userInput;

        // Sync input to Phaser text
        input.addEventListener('input', () => {
            console.log('[FeedbackScene] Hidden input value:', input.value);
            this.userInput = input.value;
            this.updateCursor();
        });

        // On blur, set inputActive to false and update cursor
        input.addEventListener('blur', () => {
            this.inputActive = false;
            this.updateCursor();
        });

        document.body.appendChild(input);
        this._hiddenInput = input;
    }

    focusHiddenInput() {
        console.log('[FeedbackScene] focusHiddenInput called');
        if (!this._hiddenInput) this.setupHiddenInput();
        this._hiddenInput.value = this.userInput;
        this._hiddenInput.focus();
        this.inputActive = true;
        // Move cursor to end
        this._hiddenInput.setSelectionRange(this._hiddenInput.value.length, this._hiddenInput.value.length);
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
        const defaultText = "Thank you for playing! Please use the below space to provide all your gripes and helpful ideas, and hit 'DONE' to return to your game. Be honest. We won't be mad, we promise...";
        this.promptText = this.add.text(
            this.cameras.main.centerX, 
            0, // Y will be adjusted later
            defaultText,
            {
                fontFamily: "IBM Plex Mono",
                fontSize: `${DESIGN.UI.TEXTBOX_FONT_SIZE}px`,
                color: this.COLORS_TEXT.PRIMARY,
                wordWrap: { width: this.uiBoxWidth - padding * 2 },
                align: "center"
            }
        ).setOrigin(0.5, 0);
    
        // ✅ Ensure text box height dynamically adjusts
        const textHeight = this.promptText.height + padding * 2;
    
        // ✅ Create the Prompt Background Box
        this.promptTextBox.fillStyle(this.COLORS_HEX.BACKGROUND, 1);
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

    // === Helper Function to Update Text with Blinking Cursor ===
    updateCursor() {
        if (!this.inputText) return;
        
        // Update the main input text with cursor
        if (this.inputActive) {
            // Active state - block cursor
            this.inputText.setText(this.userInput + (this.cursorVisible ? "_" : " "));
        } else {
            // Default state - underscore cursor
            this.inputText.setText(this.userInput + (this.cursorVisible ? "_" : ""));
        }
        
        // Force a proper re-render of the text
        this.inputText.updateText();
        
        // Use the raw text width without the cursor for more accurate positioning
        const rawTextWidth = this.inputText.width - (this.cursorVisible ? 10 : 0);

        // Ensure both text objects are visible and at the correct depth
        this.inputText.setVisible(true)//.setDepth(101);
    }

    setupKeyboardInput() {
        this._feedbackKeydownHandler = (event) => {
            // Allow printable characters (letters, numbers, punctuation, space)
            if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
                if (this.userInput.length < 500) {
                    this.userInput += event.key;
                    this.updateCursor();
                }
            } else if (event.key === 'Backspace') {
                this.userInput = this.userInput.slice(0, -1);
                this.updateCursor();
            } else if (event.key === 'Enter') {
                this.onDoneButtonClick();
            }
        };
        this.input.keyboard.on('keydown', this._feedbackKeydownHandler);
    }
   
    init(data) {
        if (!data.mode) {
            console.error("Error: No mode received in FeedbackScene.");
        } else {
            console.log("mode successfully received in FeedbackScene.");
        }
        this.mode = data.mode || null;
        this.levelValue = data.levelValue || 1;
        this.topKValue = data.topKValue || null;

        // Set colors based on the mode
        if (this.mode === "easy") {
            this.COLORS_HEX = EASY_COLORS_HEX;
            this.COLORS_TEXT = EASY_COLORS_TEXT;
        } else if (this.mode === "hard") {
            this.COLORS_HEX = HARD_COLORS_HEX;
            this.COLORS_TEXT = HARD_COLORS_TEXT;
        } else {
            this.COLORS_HEX = BASIC_COLORS_HEX;
            this.COLORS_TEXT = BASIC_COLORS_TEXT;
        }

        // Reset key scene elements to ensure proper initialization when returning from other scenes
        this.promptTextBox = null;
        this.promptText = null;
    }


    async create() {
        this.cameras.main.scrollY = 0;

        // Initialize scaling manager for responsive UI
        this.scalingManager = new ScalingManager(this);

        // Create the appropriate background based on mode
        let backgroundConfig;
        if (this.mode === "easy") {
            backgroundConfig = THEMES.easy.background;
        } else if (this.mode === "hard") {
            backgroundConfig = THEMES.hard.background;
        } else {
            backgroundConfig = THEMES.basic.background;
        }

        // Create background with the appropriate theme and level
        createBackground(this, backgroundConfig, this.levelValue);

        // Input Box Creation
        this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        this.createInputTextBox();
        this.createPromptTextBox();

        // Ensure visibility and layering explicitly
        this.inputTextBorder.setDepth(100).setAlpha(1).setVisible(true);
        this.inputText.setDepth(101).setAlpha(1).setVisible(true);

        // Button positioning correctly relative to input box
        const inputBoxX = this.cameras.main.centerX;
        const inputBoxY = this.cameras.main.centerY;
        const buttonCenterX = inputBoxX + this.uiBoxWidth / 2 - DESIGN.UI.BUTTON.WIDTH - 20;
        const outlineWidth = DESIGN.UI.OUTLINE.WIDTH;
        const buttonCenterY = inputBoxY + 170 + outlineWidth / 2 + DESIGN.UI.BUTTON.BELOW_TEXTBOX_GAP; // 170 = half height of input box (340/2), configurable gap below

        // Now create the button using ButtonFactory
        this.doneButton = this.createButton("DONE", () => this.onDoneButtonClick(), buttonCenterX, buttonCenterY, {
            depth: 102 // ensure button is visible
        });

        this.addButtonClickEffects();
        this.inputActive = false;

        // Setup keyboard input for desktop typing
        this.setupKeyboardInput();

        // Update cursor explicitly at end
        this.updateCursor();
    }
}
