import { HARD_COLORS_HEX as COLORS_HEX, HARD_COLORS_TEXT as COLORS_TEXT, OUTLINE_WIDTH, BUTTON_OUTLINE_WIDTH, CORNER_RADIUS, BUTTON_CORNER_RADIUS, buttonHeight, buttonWidth} from "../config/design.js";
import { getUserEnvironmentInfo,saveInteraction } from "../config/firebase.js";

const loadWebLLM = async () => {
    const WebLLM = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm');
    return WebLLM;
};

export default class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
        this.progressBar = null;
        this.playButtons = null;
        this.progress = 0; // Track progress state
        this.llmLoaded = false;
        this.loadingText = null;
        this.stopWords = [];
        this.outputTextBox = null;
        this.errorText = null;
        this.tooltips = []; // Array to store active tooltips
    }

    showTooltip(text, x, y) {
        // Hide any existing tooltips
        this.hideTooltips();
        
        // Create tooltip background
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

    init() {
        this.cameras.main.setBackgroundColor(COLORS_TEXT.BACKGROUND); // Set background color
    }

    preload() {
        this.load.setPath('assets');
        
        // Load all required textures
        this.load.image('ball', 'ball.png');
        this.load.image('bg', 'bg.png');
        this.load.image('dball', 'dball.png');
        
        // We don't need to explicitly preload fonts as they're included via CSS
        // Reset path for other assets
        this.load.setPath('assets');
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
        const button = this.doneButton;
        
 
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
            this.scene.start('InstructionScene', {llmEngine: this.llmEngine });
            }
        });
        });
     
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


    createOutputTextBox(text) {
        this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        const outputBoxWidth = this.uiBoxWidth;
        const lineHeight = 24;
        const numLines = 17;
        const padding = 30;
        const outputBoxHeight = numLines * lineHeight + padding * 2;
        
        
        const outputBoxY = this.errorText.y + outputBoxHeight/2 + 70;// - outputBoxHeight - 10;
    
        // ✅ Remove existing box if it exists (prevents duplicate rendering)
        if (this.outputTextBox) {
            this.outputTextBox.destroy();
        }
    
        // ✅ Create new output box with rounded corners
        this.outputTextBox = this.add.graphics();
        this.outputTextBox.fillStyle(COLORS_HEX.BACKGROUND, 1);
        this.outputTextBox.fillRoundedRect(
            this.cameras.main.centerX - outputBoxWidth / 2,
            outputBoxY - outputBoxHeight / 2,
            outputBoxWidth,
            outputBoxHeight,
            CORNER_RADIUS
        );
        this.outputTextBox.lineStyle(OUTLINE_WIDTH, COLORS_HEX.BLUE, 1);
        this.outputTextBox.strokeRoundedRect(
            this.cameras.main.centerX - outputBoxWidth / 2,
            outputBoxY - outputBoxHeight / 2,
            outputBoxWidth,
            outputBoxHeight,
            CORNER_RADIUS
        );
        this.add.existing(this.outputTextBox); // Ensure it is added to the scene
    
        // ✅ Remove existing text if it exists (prevents duplicates)
        if (this.outputText) {
            this.outputText.destroy();
        }
    
        // ✅ Create output text inside the box
        this.outputText = this.add.text(
            this.cameras.main.centerX - outputBoxWidth / 2 + padding,
            outputBoxY - outputBoxHeight / 2 + padding,
            text,
            {
                fontFamily: 'Nunito',
                fontSize: `${lineHeight}px`,
                fill: '#ffffff',
                wordWrap: { width: outputBoxWidth - padding * 2 },
                align: 'left',
                lineSpacing: 5
            }
        ).setOrigin(0, 0);
    
        // ✅ Slide-in Animation
        this.tweens.add({
            targets: [this.outputTextBox, this.outputText],
            alpha: 1,
            duration: 500,
            ease: 'Sine.InOut'
        });
        // ✅ Force Phaser to recognize this object
        this.add.existing(this.outputTextBox);
        this.outputTextBox.setDepth(100);
        this.outputText.setDepth(101);
    }

    onDoneButtonClick() {

      
        this.scene.start('InstructionScene', { llmEngine: this.llmEngine });

    }

    async create() {
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const margin = 100;
        this.createBackgroundEffect();

        //window.addEventListener("resize", () => this.resizeUI());

        saveInteraction("creating preloader", "preloader");


        //const titleSize = Math.max(this.cameras.main.width * 0.1, 80); // Dynamic font size (10% of screen width, min 80px)
        const titleSize = 120;

        const titleText = this.add.text(screenWidth / 2, screenHeight*.15, "(NON-SLOP)", { 
            fontFamily: 'barcade3d',
            fontSize: `${titleSize}px`, 
            color: COLORS_TEXT.YELLOW
        });
        
        titleText.setOrigin(0.5, 0);
        titleText.x = -600; // Start off-screen
        
        // ✅ Adjust slide speed based on screen width
        let targetX = this.cameras.main.centerX;
        let slideSpeed = 25;//Math.max(this.cameras.main.width * 0.02, 15); // Adjust speed dynamically
        
        // ✅ Smooth Slide-in Effect
        this.time.addEvent({
            delay: 16,
            callback: () => {
                if (titleText.x < targetX) {
                    titleText.x += slideSpeed;
                } else {
                    titleText.x = targetX;
                    this.tweens.add({
                        targets: titleText,
                        x: { from: targetX, to: targetX - 20 },
                        duration: 180,
                        yoyo: true,
                        ease: "Quad.Out"
                    });
                }
            },
            loop: true
        });
        




        // // === Flash Effect (Refined) ===
        // this.tweens.add({
        //     targets: titleText,
        //     alpha: { from: 0, to: 1 },
        //     duration: 200,
        //     ease: 'Sine.InOut',
        //     repeat: 1,
        //     yoyo: true,
        //     onComplete: () => {
        //         titleText.setAlpha(1);
        //     }
        // });
        
        //const loadingFontSize = Math.max(this.cameras.main.width * 0.02, 20); // 2% of width, min 20px
        const loadingFontSize = 22; // 2% of width, min 20px
        this.loadingText = this.add.text(screenWidth / 2, titleText.y + titleText.height + margin, "Loading LLM...", {
            fontFamily: 'Nunito',
            fontSize: `${loadingFontSize}px`,
            fontWeight: "500",
            fill: COLORS_TEXT.WHITE
        });
        
        this.loadingText.setOrigin(0.5, 0);


        // === Create Progress Bar ===

        this.progressBar = this.add.graphics();
        this.progressBarOutline = this.add.graphics();
        

        const progressBarWidth = Phaser.Math.Clamp(screenWidth * 0.5, 300, 600);
        const progressBarLeftX = (screenWidth/ 2) - (progressBarWidth / 2);

        const progressBarY = this.loadingText.y + this.loadingText.height + this.cameras.main.width*.02; // Position below loading text
        


        //this.drawProgressBarOutline(progressBarX, progressBarY, this.progressBarLeftX);
        this.drawProgressBar(this.progress, progressBarLeftX, progressBarY, progressBarWidth);


        const offset = 150;
        // === WebGPU Support Check ===
        if (!navigator.gpu) {
            this.errorText = this.add.text(screenWidth / 2, margin + 50 + offset, "WebGPU is required but not enabled/supported.", {
                fontFamily: 'Nunito',
                fontSize: "50px",
                fontWeight: "500",
                fill: "#ff0000"
            });
            this.errorText.setOrigin(0.5, 0);
            console.error("WebGPU is required but not enabled/supported.");
            //return;

            
            const { os, browser, userAgent } = getUserEnvironmentInfo();
            if (browser === 'Safari') {
                const text = "Safari does not natively support WebGPU. We recommend using Chrome for the best experience. You may be able to enable WebGPU for Safari as follows:\n\n1. Go to 'Safari' > 'Preferences'.\n2. Click on the 'Advanced' tab.\n3. Check the box next to 'Show Develop menu in menu bar'.\n4. Close the Preferences window.\n5. Click on 'Develop' in the menu bar.\n6. Click on 'Feature Flags'.\n7. Check the box next to 'WebGPU'.\n\nAfter enabling WebGPU, please reload the page.";
                this.createOutputTextBox(text)
            }
            else {
                const text = "Your browser does not support WebGPU, or WebGPU is not enabled. Please enable WebGPU if possible, or try another browser. We recommend using Chrome for the best experience.";
                this.createOutputTextBox(text);
            }
            saveInteraction("WebGPU load failure", "preloader");
            return;
        }

    

        try {
            // Load WebLLM dynamically
            const WebLLM = await loadWebLLM();
            const { CreateMLCEngine } = await loadWebLLM();

            const model_id = "Qwen2.5-0.5B-Instruct-q0f32-MLC";

            const appConfig = {
                model_list: [
                    {
                        model: "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q0f32-MLC",
                        model_id: model_id,
                        model_lib: WebLLM.modelLibURLPrefix +
                                   WebLLM.modelVersion + 
                                   "/Qwen2-0.5B-Instruct-q0f32-ctx4k_cs1k-webgpu.wasm",
                        overrides: {
                            context_window_size: 4096,
                        },
                    },
                ],
                runtime: "webgpu"
            };

            // === Simulated Progress Bar Update ===
            let progressInterval = setInterval(() => {
                if (this.progress < .9) { 
                    this.progress += Phaser.Math.Clamp(Phaser.Math.Between(.5, .15), 0, .90 - this.progress); // Prevent overflow
                    this.drawProgressBar(this.progress, progressBarLeftX, progressBarY, progressBarWidth);
                }
            }, 300);

            // Initialize WebLLM Engine
            const llmEngine = await CreateMLCEngine(model_id, {
                appConfig: appConfig,
                logLevel: "INFO",
            });

            clearInterval(progressInterval); // Stop progress updates
            this.progress = 1; // Set to full once LLM is loaded
            this.drawProgressBar(this.progress, progressBarLeftX, progressBarY, progressBarWidth);

            console.log("WebLLM Engine initialized with WebGPU.");
            this.llmLoaded = true; // Mark LLM as loaded
            this.loadingText.setText("Done loading");
            this.checkIfReady(llmEngine); // Check if everything is ready


        } catch (error) {
            console.error("Failed to initialize WebLLM:", error);
            const errorText = this.add.text(screenWidth / 2, margin + 70 + offset, "Failed to initialize WebLLM", {
                fontFamily: 'Nunito',
                fontSize: "50px",
                fontWeight: "500",
                fill: COLORS_TEXT.ERROR,
            });
            errorText.setOrigin(0.5, 0);
            const errormsg = "Failed to initialize WebLLM:" + error;
            saveInteraction(errormsg, "preloader");
        }
    }

    

    // === Check if Both Progress and LLM are Done ===
    checkIfReady(llmEngine) {

        if (this.progress >= 1 && this.llmLoaded) {
            saveInteraction("LLM successfully loaded", "preloader");
            console.log(this);
            
            
            this.llmEngine = llmEngine;
            this.registry.set('llmEngine', llmEngine);
            console.log("LLM Engine saved to registry:", this.registry.get('llmEngine'));

            
            // Center the button horizontally
            const buttonCenterX = this.cameras.main.centerX;
            
            // Calculate the distance between loading text and progress bar (this is the same value used in create())
            const textToBarDistance = this.cameras.main.width * 0.02;
            
            // Position the button below the progress bar by the same distance as loading text is above it
            const buttonCenterY = this.progressBarY + this.progressBarHeight + textToBarDistance + buttonHeight / 2 +10;
    
            
            console.log("about to create donebutton");
            console.log(buttonCenterX, buttonCenterY);
            // Create the button
            
            this.doneButton = this.createButton("NEXT", () => this.onDoneButtonClick(), buttonCenterX, buttonCenterY);
            this.doneButton.setDepth(102);

            // Add tooltip functionality
            this.doneButton.setInteractive()
                .on('pointerover', () => {
                    this.showTooltip('Continue to instructions', this.doneButton.x, this.doneButton.y - this.doneButton.height/2);
                    this.doneButton.setScale(1.1);
                })
                .on('pointerout', () => {
                    this.hideTooltips();
                    this.doneButton.setScale(1);
                });

            this.addButtonClickEffects();
        }
    }





    drawProgressBar(progress, progressBarLeftX, y, width) {
        const barHeight = 30;
        
        // Store the Y position of the progress bar for reference elsewhere
        this.progressBarY = y;
        this.progressBarHeight = barHeight;

        if (!this.progressBarOutline) {
            this.progressBarOutline = this.add.graphics();
        } else {
            this.progressBarOutline.clear();
        }
    
        this.progressBarOutline.lineStyle(BUTTON_OUTLINE_WIDTH, COLORS_HEX.YELLOW, 1);
    
        // ✅ Store the correct left-edge position
        
    
        this.progressBarOutline.strokeRoundedRect(
            progressBarLeftX, // ✅ Use stored left-edge position
            y,
            width,
            barHeight,
            10
        );
    
        if (!this.progressBar) {
            this.progressBar = this.add.graphics();
        } else {
            this.progressBar.clear();
        }
          
        this.progressBar.fillStyle(COLORS_HEX.TURQUOISE, 1); // ✅ Use correct color
    
        // ✅ Fix width scaling: Ensure fill fully extends when at 100%
        const fillWidth = Phaser.Math.Clamp(width * progress, 1, width); // ✅ Ensure width matches the outline
    

        this.progressBar.fillRoundedRect(
            progressBarLeftX, // ✅ Keep fill aligned with the left edge of the outline
            y, // ✅ Ensure fill is aligned with the outline (not too high)
            fillWidth, // ✅ Fix width scaling issue
            barHeight, // ✅ Ensure height matches the outline
            10
        );
       
        
    }
    
    

    

    
}
//onComplete: () => this.scene.start('GameSceneHard', llmEngine)
