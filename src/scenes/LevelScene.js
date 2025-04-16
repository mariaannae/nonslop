import { COLORS_HEX, COLORS_TEXT, OUTLINE_WIDTH, CORNER_RADIUS, buttonHeight, buttonSpacing, buttonWidth} from "../config/design_hard.js";
import { saveInteraction } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";

export default class LevelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelScene' });
        this.mode = null;
        //this.userInput = '';
        this.llmEngine = null;     
    }

    update() {
        if (!this.llmEngine) {
            console.warn("LLM Engine lost from scene. Attempting recovery from registry...");
            this.llmEngine = this.registry.get('llmEngine');
    
            if (!this.llmEngine) {
                console.warn("LLM Engine missing entirely. Returning to Preloader...");
                this.scene.start('PreloaderScene');
            } else {
                console.log("Successfully recovered LLM Engine from registry.");
            }
        }
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
    
    addButtonClickEffects() {
        // Apply to all buttons
        const buttons = [this.playButton];
        
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

    createButton(label, callback, centerX, centerY, options = {}) {
        return ButtonFactory.createButton(this, label, callback, centerX, centerY, options);
    }
    
    createPromptTextBox() {
        this.promptBoxY = 50;
    
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
        const defaultText = "Easy: You can use AI-suggested words, but you'll lose points. Your score will be based on the percentage of typed words that were AI-suggested.\n\nHard: You can only use your own words. No AI suggestions allowed. Your score will be based on the number of times you attempt to use an AI-suggested word.\n\nMake your choice.";

        this.promptText = this.add.text(
            this.cameras.main.centerX, 
            0, // Y will be adjusted later
            defaultText,
            {
                fontFamily: "Nunito",
                fontSize: "22px",
                color: COLORS_TEXT.WHITE,
                wordWrap: { width: this.uiBoxWidth - padding * 2 },
                align: "left]nter"
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

    init(data) {
        if (!data.llmEngine) {
            console.error("Error: No llmEngine received in FeedbackScene.");
        } else {
            console.log("llmEngine successfully received in FeedbackScene.");
        }
        this.llmEngine = data.llmEngine || null;
        // Reset key scene elements to ensure proper initialization when returning from other scenes
        this.promptTextBox = null;
        this.promptText = null;
    }

    showPlayButtons(llmEngine) {
        if (this.playButton) return; // Prevent duplicate buttons

        const buttonWidth = Phaser.Math.Clamp(this.cameras.main.width * 0.1, this.cameras.main.width * 0.07, 220); // 10% of screen width
        const buttonHeight = buttonWidth * 0.4; // Maintain aspect ratio
        const buttonSpacing = buttonWidth * 1.1;

        // Calculate button positions
        const centerX = this.cameras.main.centerX;
        
        // Use the same positioning logic as InstructionsScene
        const boxY = this.promptBoxY;
        const boxHeight = this.promptText.height + 80; // padding (40 top + 40 bottom)
        const buttonPaddingY = 20;
        
        // Position the buttons below the prompt text box
        const centerY = boxY + boxHeight + buttonPaddingY + buttonHeight / 2;
        
        // Create the two difficulty buttons using the ButtonFactory
        const easyButton = ButtonFactory.createFancyButton(
            this, 
            "EASY", 
            () => this.startGame(llmEngine, "easy"),
            centerX,
            -buttonWidth/2 - buttonSpacing / 2,
            centerY,
            { fadeIn: true }
        );
        
        const hardButton = ButtonFactory.createFancyButton(
            this, 
            "HARD", 
            () => this.startGame(llmEngine, "hard"),
            centerX,
            buttonWidth/2 + buttonSpacing / 2,
            centerY,
            { fadeIn: true }
        );
    
        this.playButtons = [easyButton, hardButton];
    }

    // === Start Game Function (Handles Difficulty) ===
    startGame(llmEngine, difficulty) {
        this.registry.set('llmEngine', llmEngine);
        console.log(`Starting GameSceneHard in ${difficulty} mode...`);
        if (difficulty === "hard") {
            this.scene.start('GameSceneHard', {llmEngine: llmEngine });
        }
        else if (difficulty === "easy") {
            this.scene.start('GameSceneEasy', {llmEngine: llmEngine });
        }
    }

    async create() {
        this.cameras.main.scrollY = 0; 
        this.createBackgroundEffect();
    
        this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        this.createPromptTextBox();
    
        // Show the play buttons
        this.showPlayButtons(this.llmEngine);
        this.addButtonClickEffects();
        
        this.inputActive = false;
    }
}
