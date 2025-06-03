import { BASIC_COLORS_HEX as COLORS_HEX, BASIC_COLORS_TEXT as COLORS_TEXT, DESIGN} from "../config/design.js";
import { saveInteraction } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import { ScalingManager } from "../config/scaling.js";

//, , DESIGN.UI.BUTTON.WIDTH

export default class LevelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelScene' });
        this.mode = null;
        this.tooltips = []; // Array to store active tooltips
    }

    showTooltip(text, x, y) {
        // Hide any existing tooltips
        this.hideTooltips();
        
        // Create tooltip background
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
        
        // Create container for tooltip
        const container = this.add.container(x - width/2, y - height - 5, [background, tooltipText]);
        tooltipText.setPosition(padding, padding);
        
        // Add to active tooltips
        this.tooltips.push(container);
        
        // Fade in effect
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
            const hexToString = (hex) => '#' + hex.toString(16).padStart(6, '0');

            let grd = ctx.createLinearGradient(0, 0, width, height);
            grd.addColorStop(0, hexToString(COLORS_HEX.BACKGROUND_MID));
            grd.addColorStop(1, hexToString(COLORS_HEX.BACKGROUND));
    
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
    
    createPromptTextBox() {
        this.promptBoxY = 80;
    
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
        const defaultText = "Easy: \nYou may use AI-suggested words, but you'll lose points. \n\nHard: \nNo AI-suggested words may be used. You will be penalized for each attempt.";

        this.promptText = this.add.text(
            this.cameras.main.centerX, 
            0, // Y will be adjusted later
            defaultText,
            {
                fontFamily: "IBM Plex Mono",
                fontSize: `${DESIGN.UI.TEXTBOX_FONT_SIZE}px`,
                color: COLORS_TEXT.PRIMARY,
                wordWrap: { width: this.uiBoxWidth - padding * 2 },
                align: "left]nter"
            }
        ).setOrigin(0.5, 0);
    
        // ✅ Ensure text box height dynamically adjusts
        const textHeight = this.promptText.height + padding * 2;
    
        // ✅ Create the Prompt Background Box
        this.promptTextBox.fillStyle(COLORS_HEX.BACKGROUND_DARKEST, 1);
        this.promptTextBox.fillRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2, 
            this.promptBoxY,
            this.uiBoxWidth,
            textHeight,
            DESIGN.UI.OUTLINE.CORNER_RADIUS
        );
    
        // ✅ Add Outline to Match Output Box
        this.promptTextBox.lineStyle(DESIGN.UI.OUTLINE.WIDTH, COLORS_HEX.BOX_OUTLINE, 1);
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

    init(data) {

        // Reset key scene elements to ensure proper initialization when returning from other scenes
        this.promptTextBox = null;
        this.promptText = null;
    }

    showPlayButtons(llmEngine) {
        if (this.playButton) return; // Prevent duplicate buttons

        // Calculate button positions
        const centerX = this.cameras.main.centerX;
        
        // Use the same positioning logic as InstructionsScene
        const boxY = this.promptBoxY;
        const boxHeight = this.promptText.height + 80; // padding (40 top + 40 bottom)
        const buttonPaddingY = DESIGN.UI.BUTTON.BELOW_TEXTBOX_GAP;
        
        // Position the buttons below the prompt text box
        const outlineWidth = DESIGN.UI.OUTLINE.WIDTH;
        const centerY = boxY + boxHeight + outlineWidth / 2 + buttonPaddingY + DESIGN.UI.BUTTON.HEIGHT / 2;

        // Ensure scalingManager is passed for responsive sizing
        const easyButton = ButtonFactory.createButton(
            this, 
            "EASY", 
            () => this.startGame("easy"),
            centerX - DESIGN.UI.BUTTON.WIDTH * .85,
            centerY,
            { scalingManager: this.scalingManager }
        );
        
        const hardButton = ButtonFactory.createButton(
            this, 
            "HARD", 
            () => this.startGame("hard"),
            centerX + DESIGN.UI.BUTTON.WIDTH * .85,
            centerY,
            { scalingManager: this.scalingManager }
        );

        // Add tooltip functionality
        easyButton.setInteractive()
            .on('pointerover', () => {
                this.showTooltip('AI suggestions penalized', easyButton.x, easyButton.y - easyButton.height/2);
                easyButton.setScale(1.1);
            })
            .on('pointerout', () => {
                this.hideTooltips();
                easyButton.setScale(1);
            });

        hardButton.setInteractive()
            .on('pointerover', () => {
                this.showTooltip('AI suggestions blocked', hardButton.x, hardButton.y - hardButton.height/2);
                hardButton.setScale(1.1);
            })
            .on('pointerout', () => {
                this.hideTooltips();
                hardButton.setScale(1);
            });
    
        this.playButtons = [easyButton, hardButton];
    }

    // === Start Game Function (Handles Difficulty) ===
    startGame(difficulty) {
        console.log("LLM Engine retrieved from registry:", this.registry.get('llmEngine'));

        console.log(`Starting GameScenein ${difficulty} mode...`);
        if (difficulty === "hard") {
            this.scene.start('GameSceneHard', { });
        }
        else if (difficulty === "easy") {
            this.scene.start('GameSceneEasy', { });
        }
    }

    async create() {
        this.cameras.main.scrollY = 0; 

        // Initialize scaling manager for responsive UI
        this.scalingManager = new ScalingManager(this);

        this.createBackgroundEffect();

        this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        this.createPromptTextBox();

        // Show the play buttons
        this.showPlayButtons();
        this.addButtonClickEffects();
        
        this.inputActive = false;
    }
}
