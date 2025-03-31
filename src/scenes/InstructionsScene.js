import { COLORS_HEX, COLORS_TEXT, OUTLINE_WIDTH, BUTTON_OUTLINE_WIDTH, CORNER_RADIUS, BUTTON_CORNER_RADIUS, buttonHeight, buttonSpacing, buttonWidth} from "../config/design_hard.js";
import { saveInteraction } from "../config/firebase.js";



export default class InstructionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'InstructionScene' });
        this.mode = null;
        //this.userInput = '';
        this.llmEngine = null;       
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
    // Number of particles
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
        // Create a particle
        const particle = this.add.circle(x, y, 3, 0xffffff, 0.8);
        
        // Random angle for particle direction
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        const distance = 30 + Math.random() * 30;
        
        // Randomize particle color based on easy mode theme
        const colors = [0x90caf9, 0xffd700, 0xffb6c1]; // Blue, gold, pink
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.setFillStyle(color, 0.8);
        
        // Set particle depth above buttons
        particle.setDepth(20);
        
        // Animate the particle
        this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: { from: 1, to: 0.1 },
        duration: 600 + Math.random() * 400,
        ease: 'Quad.Out',
        onComplete: () => {
            particle.destroy();
        }
        });
    }
    }

    createButton(label, callback, centerX, centerY) {

        // ✅ Create button container
        const buttonContainer = this.add.container(centerX, centerY);
    
        // === Button Background ===
        const buttonBackground = this.add.graphics();
        buttonBackground.fillStyle(COLORS_HEX.BUTTONFILL, 1);
        buttonBackground.fillRoundedRect(
            -buttonWidth / 2, -buttonHeight / 2, 
            buttonWidth, buttonHeight, BUTTON_CORNER_RADIUS
        );
    
        // === Button Outline ===
        const buttonOutline = this.add.graphics();
        buttonOutline.lineStyle(BUTTON_OUTLINE_WIDTH, 0xffffff, 1);
        buttonOutline.strokeRoundedRect(
            -buttonWidth / 2, -buttonHeight / 2, 
            buttonWidth, buttonHeight, BUTTON_CORNER_RADIUS
        );
    
        // === Gradient Overlay (Lighter Top) ===
        const gradientOverlay = this.add.graphics();
        gradientOverlay.fillStyle(COLORS_HEX.BUTTONOVERLAY, 0.7);
        gradientOverlay.fillRoundedRect(
            -buttonWidth / 2, -buttonHeight / 2, 
            buttonWidth, buttonHeight / 2, BUTTON_CORNER_RADIUS
        );
    
        // === Highlight Effect (Shiny Reflection) ===
        const buttonHighlight = this.add.graphics();
        buttonHighlight.fillStyle(0xffffff, 0.4);
        buttonHighlight.fillRoundedRect(
            -buttonWidth / 2 + 5, -buttonHeight / 2 + 2, 
            buttonWidth - 10, buttonHeight / 3, BUTTON_CORNER_RADIUS
        );

        // === Button Text ===
        const buttonText = this.add.text(0, 0, label, {
            fontFamily: 'Fredoka',
            fontSize: '22px',
            fontWeight: "700",
            color: COLORS_TEXT.WHITE,
            align: 'center'
        }).setOrigin(0.5, 0.5);
    
        // ✅ Ensure button is interactive
        buttonContainer.setSize(buttonWidth, buttonHeight);
        buttonContainer.setInteractive();
        buttonContainer.on("pointerdown", () => {
            this.tweens.add({
                targets: buttonContainer,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 100,
                yoyo: true,
                ease: "Quad.Out"
            });
    
            this.time.delayedCall(100, callback);
        });

        
    
        // ✅ Add to scene
        buttonContainer.add([buttonOutline, buttonBackground, gradientOverlay, buttonHighlight, buttonText]);
        this.add.existing(buttonContainer);
    
        return buttonContainer;
    }
    
    onDoneButtonClick() {
        console.log("Leaving instructions scene...");

        if (this.mode === "easy") {
            this.scene.start('GameSceneEasy', { llmEngine: this.llmEngine });
        }
        else if (this.mode === "hard") {
            this.scene.start('GameSceneHard', { llmEngine: this.llmEngine });
        }
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
        const defaultText = "Welcome to NON-SLOP. This game is designed to help us examine the way we work with AI writing assistants, and encourage us to use them to become more unique rather than more generic. You already know what easy and hard mode are. On the next page, you'll find the following elements:\n\n-Text box where you can enter your input. This input should be a response to the prompt provided. It be evaluated for relevance.\n\n- Suggested text. This is provided by Qwen 2.5 0.5B, using in-browser inference. You're supposed to avoid it. You know, to be unique.\n- 'DONE' button to submit your input. This will send your input to chatGPT-4o-mini for feedback, and provide scores for grammar, relevance, and general coherence.\n- 'RESET' button to clear your text and start over, possibly with a new prompt.\n- 'Prompt Level' slider - the prompts get harder as the level goes up.\n- 'Top K' slider - this controls the number of AI suggestions you have to avoid when writing.\n- 'Feedback' button - please use it! Log bugs, give suggestions!\n-Button to switch between easy and hard modes. Self explanatory.\n\nWe should also tell you that the AI suggestions are filtered for stopwords using the NLTK list. So you can write 'and' as many times as you want. But every now and then, the AI only suggests stopwords and they're all filtered out, so you don't have to avoid any words at all. Lucky you.\n\n\nDisclaimer: Any and all input can and will be stored and used for research. But don't worry, it's completely anonymous, so nobody will come for you if you're a terrible writer. With these restrictions, you probably will be.";

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
        if (!data.mode) {
            console.error("Error: No mode received in FeedbackScene.");
        } else {
            console.log("mode successfully received in FeedbackScene.");
        }
        this.mode = data.mode || null;
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


    async create() {
        this.cameras.main.scrollY = 0; 
        this.createBackgroundEffect();
    
        this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        this.createPromptTextBox();
    
        
        // Compute text box dimensions clearly
        const boxX = this.cameras.main.centerX - this.uiBoxWidth / 2;
        const boxY = this.promptBoxY;
        const boxHeight = this.promptText.height + 80; // padding (40 top + 40 bottom)

        // Padding between button and text box edges
        const buttonPaddingX = 20;
        const buttonPaddingY = 20;

        // Position the DONE button at the bottom-right corner
        const buttonCenterX = boxX + this.uiBoxWidth - buttonPaddingX - buttonWidth / 2;
        const buttonCenterY = boxY + boxHeight + buttonPaddingY + buttonHeight / 2;

        // Create the button
        this.doneButton = this.createButton("PLAY", () => this.onDoneButtonClick(), buttonCenterX, buttonCenterY);
        this.doneButton.setDepth(102);

        this.addButtonClickEffects();
        
        this.inputActive = false;
    
        
    }
    

    
    
}

