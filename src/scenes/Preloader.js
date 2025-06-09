import { DESIGN, BASIC_COLORS_HEX as COLORS_HEX, BASIC_COLORS_TEXT as COLORS_TEXT} from "../config/design.js";
import { getUserEnvironmentInfo,saveInteraction } from "../config/firebase.js";
import registryManager from "../services/RegistryManager.js";
import getLLMEngine from "../services/llmEngineSingleton.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import { ScalingManager } from "../config/scaling.js";

// Fix: Define missing constants for output box rendering

export default class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
        this.progressBar = null;
        this.playButtons = null;
        this.progress = .001; // Track progress state
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

    init() {
        this.cameras.main.setBackgroundColor(COLORS_HEX.BACKGROUND); // Set background color
    }

    preload() {
        this.load.setPath('assets');
        
        // Load all required textures
        //this.load.image('bg', 'bg.png');
        this.load.image('clock', 'clock.svg');
        this.load.image('gh-qr-code', 'gh-qr-code.png');
        this.load.image('settings', 'settings.png');

        // Load badge images with scores
        this.load.setPath('assets/badges');
        for (let i = 1; i <= 12; i++) {
            for (let score = 10; score <= 15; score++) {
                this.load.image(`badge_${i}_easy_${score}`, `badge_${i}_easy_${score}.png`);
                this.load.image(`badge_${i}_hard_${score}`, `badge_${i}_hard_${score}.png`);
            }
        }
        this.load.setPath('assets');

        // Load social SVGs for share buttons
        this.load.setPath('assets/socials');
        this.load.image('facebook', 'facebook.svg');
        this.load.image('instagram', 'instagram.svg');
        this.load.image('threads', 'threads.svg');
        this.load.image('x', 'x.svg');
        this.load.image('tiktok', 'tiktok.svg');
        this.load.image('snapchat', 'snapchat.svg');
        this.load.image('bluesky', 'bluesky.svg');
        this.load.image('linkedin', 'linkedin.svg');
        this.load.image('email', 'email.svg');
        
        // We don't need to explicitly preload fonts as they're included via CSS
        // Reset path for other assets
        this.load.setPath('assets');

        // Generate a simple white ball texture for particles after loading
        this.load.once('complete', () => {
            if (!this.textures.exists('ball')) {
                const graphics = this.make.graphics({ x: 0, y: 0, add: false });
                graphics.fillStyle(0xffffff, 1);
                graphics.fillCircle(16, 16, 16);
                graphics.generateTexture('ball', 32, 32);
                graphics.destroy();
            }
        });
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
    
    addButtonClickEffects(button, onClick) {
        if (!button) return;
        // Use green for "NEXT" button
        const nextColor = 0x43ea5e;
        button.setInteractive();
        button.off('pointerdown');
        button.on('pointerdown', (pointer) => {
            this.createButtonClickParticles(button.x, button.y, nextColor);
            this.tweens.add({
                targets: button,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 100,
                yoyo: true,
                ease: "Quad.Out",
                onComplete: onClick
            });
        });
    }

    createButtonClickParticles(x, y, color) {
        // Use ButtonFactory for consistency
        return ButtonFactory.createClickParticles(this, x, y, color);
    }

    createOutputTextBox(text) {
        this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        const outputBoxWidth = this.uiBoxWidth;
        const lineHeight = 24;
        const padding = 30;

        // Remove existing text if it exists (prevents duplicates)
        if (this.outputText) {
            this.outputText.destroy();
        }

        // Dynamically measure text height with word wrap
        const tempText = this.add.text(
            0, 0, text,
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: `${lineHeight}px`,
                fill: '#ffffff',
                wordWrap: { width: outputBoxWidth - padding * 2 },
                align: 'left',
                lineSpacing: 5
            }
        ).setOrigin(0, 0).setAlpha(0); // Hide temp text

        // Calculate height needed for the text
        const textHeight = tempText.height;
        const outputBoxHeight = textHeight + padding * 2;

        // Position box 30px below the bottom edge of the progress bar
        const outputBoxY = this.progressBarY + this.progressBarHeight + 30 + outputBoxHeight / 2;

        // Remove temp text (will create real one below)
        tempText.destroy();

        // Remove existing box if it exists (prevents duplicate rendering)
        if (this.outputTextBox) {
            this.outputTextBox.destroy();
        }

        // Create new output box with rounded corners
        this.outputTextBox = this.add.graphics();
        this.outputTextBox.fillStyle(COLORS_HEX.BACKGROUND, 1);
        this.outputTextBox.fillRoundedRect(
            this.cameras.main.centerX - outputBoxWidth / 2,
            outputBoxY - outputBoxHeight / 2,
            outputBoxWidth,
            outputBoxHeight,
            DESIGN.UI.CORNER_RADIUS
        );
        // Use theme accent color for outline
        console.log('BOX_OUTLINE value:', COLORS_HEX.BOX_OUTLINE, typeof COLORS_HEX.BOX_OUTLINE);
        this.outputTextBox.lineStyle(DESIGN.UI.OUTLINE.WIDTH, COLORS_HEX.BOX_OUTLINE, 1);
        this.outputTextBox.strokeRoundedRect(
            this.cameras.main.centerX - outputBoxWidth / 2,
            outputBoxY - outputBoxHeight / 2,
            outputBoxWidth,
            outputBoxHeight,
            DESIGN.UI.CORNER_RADIUS
        );
        this.add.existing(this.outputTextBox); // Ensure it is added to the scene

        // Create output text inside the box
        this.outputText = this.add.text(
            this.cameras.main.centerX - outputBoxWidth / 2 + padding,
            outputBoxY - outputBoxHeight / 2 + padding,
            text,
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: `${lineHeight}px`,
                fill: '#ffffff',
                wordWrap: { width: outputBoxWidth - padding * 2 },
                align: 'left',
                lineSpacing: 5
            }
        ).setOrigin(0, 0);

        // Slide-in Animation
        this.tweens.add({
            targets: [this.outputTextBox, this.outputText],
            alpha: 1,
            duration: 500,
            ease: 'Sine.InOut'
        });
        // Force Phaser to recognize this object
        this.add.existing(this.outputTextBox);
        this.outputTextBox.setDepth(100);
        this.outputText.setDepth(101);
    }

    onDoneButtonClick() {
        this.scene.start('InstructionScene', { llmEngine: this.llmEngine });
    }

    createBadgeGeneratorButton() {
         const button = ButtonFactory.createButton(
             this,
             "GENERATE BADGES",
             () => this.scene.start('BadgeGenerator'),
             this.cameras.main.width - 150,
             50,
             { depth: 102 }
         );

         button.setInteractive()
             .on('pointerover', () => {
                 this.showTooltip('Generate all badge variations', button.x, button.y + button.height/2);
                 button.setScale(1.1);
             })
             .on('pointerout', () => {
                 this.hideTooltips();
                 button.setScale(1);
             });
     }

    async create() {
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const margin = 100;
        this.createBackgroundEffect();

        // Initialize scaling manager for responsive UI
        this.scalingManager = new ScalingManager(this);

        //window.addEventListener("resize", () => this.resizeUI());

        saveInteraction("creating preloader", "preloader");

        //const titleSize = Math.max(this.cameras.main.width * 0.1, 80); // Dynamic font size (10% of screen width, min 80px)
        const titleSize = 100;

        const titleText = this.add.text(screenWidth / 2, screenHeight*.15, "(NON-SLOP)", { 
            fontFamily: 'barcade3d',
            fontSize: `${titleSize}px`, 
            color: COLORS_TEXT.HIGHLIGHT
        });
        
        titleText.setOrigin(0.5, 0);
        titleText.x = -600; // Start off-screen
        
        // ✅ Adjust slide speed based on screen width
        let targetX = this.cameras.main.centerX;
        let slideSpeed = 25;//Math.max(this.cameras.main.width * 0.02, 15); // Adjust speed dynamically
        
        // ✅ Smooth Slide-in Effect
        const slideInEvent = this.time.addEvent({
            delay: 16,
            callback: () => {
                if (titleText.x < targetX) {
                    titleText.x += slideSpeed;
                } else {
                    titleText.x = targetX;

                    // Stop the slide-in event loop so the bounce/shine only happens once
                    slideInEvent.remove();

                    // Add shine effect to the text - it animates automatically
                    titleText.postFX.addShine(1, .2, 5);

                    // To create a repeating shine effect, we'll periodically add and remove the effect
                    this.time.addEvent({
                        delay: 3000, // Every 3 seconds
                        callback: () => {
                            // Remove any existing shine effects
                            titleText.postFX.clear();
                            // Add a new shine effect
                            titleText.postFX.addShine(1, .2, 5);
                        },
                        loop: true
                    });

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

        //const loadingFontSize = Math.max(this.cameras.main.width * 0.02, 20); // 2% of width, min 20px
        const loadingFontSize = 22; // 2% of width, min 20px
        this.loadingText = this.add.text(screenWidth / 2, titleText.y + titleText.height + margin, "Loading LLM...", {
            fontFamily: 'IBM Plex Mono',
            fontSize: `${loadingFontSize}px`,
            fontWeight: "500",
            fill: COLORS_TEXT.PRIMARY
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

        try {
            // === Simulated Progress Bar Update ===
            let progressInterval = setInterval(() => {
                if (this.progress < .95) { 
                    this.progress += Phaser.Math.Clamp(Phaser.Math.Between(.5, .15), 0, .90 - this.progress); // Prevent overflow
                    this.drawProgressBar(this.progress, progressBarLeftX, progressBarY, progressBarWidth);
                }
            }, 300);

            // --- TRUE GLOBAL SINGLETON LLM ENGINE INIT ---
            const llmEngine = await getLLMEngine();

            clearInterval(progressInterval); // Stop progress updates
            this.progress = 1; // Set to full once LLM is loaded
            this.drawProgressBar(this.progress, progressBarLeftX, progressBarY, progressBarWidth);

            console.log("WebLLM Engine ready.");
            this.llmLoaded = true; // Mark LLM as loaded
            this.loadingText.setText("Done loading");
            this.checkIfReady(llmEngine); // Check if everything is ready

        } catch (error) {
            console.error("Failed to initialize WebLLM:", error);
            const errorText = this.add.text(screenWidth / 2, margin + 70 + offset, "Failed to initialize WebLLM", {
                fontFamily: 'IBM Plex Mono',
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
            console.log("LLM loaded: ", llmEngine);
            
            // Store in both the registry manager and local variable
            this.llmEngine = llmEngine;
            
            // Use registry manager to store the engine
            registryManager.set("llmEngine", llmEngine);
            console.log("LLM Engine saved to registry manager:", registryManager.get('llmEngine'));
            
            // Center the button horizontally
            const buttonCenterX = this.cameras.main.centerX;
            
            // Place the button so its top edge is 30px below the bottom edge of the progress bar (including outline)
            const outlineWidth = DESIGN.UI.OUTLINE.WIDTH;
            const buttonCenterY = this.progressBarY + this.progressBarHeight + outlineWidth / 2 + DESIGN.UI.BUTTON.BELOW_TEXTBOX_GAP + DESIGN.UI.BUTTON.HEIGHT / 2;

            // Create the button

            // Create buttons container
            const buttonSpacing = 20;

            // Create next button
            this.doneButton = ButtonFactory.createButton(
                this,
                "NEXT",
                () => this.onDoneButtonClick(),
                buttonCenterX,
                buttonCenterY + buttonSpacing,
                { depth: 102, scalingManager: this.scalingManager }
            );

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

            // Add click effects to both buttons
            this.addButtonClickEffects(this.doneButton, () => this.scene.start('InstructionScene', { llmEngine: this.llmEngine }));

            // Add typewriter intro box 30px below NEXT button
            this.createTypewriterIntroBox();
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
    
        this.progressBarOutline.lineStyle(DESIGN.UI.OUTLINE.WIDTH, COLORS_HEX.ACCENT, 1);
    
        this.progressBarOutline.strokeRoundedRect(
            progressBarLeftX,
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
          
        this.progressBar.fillStyle(0x53cf6c, 1);
    
        const clampedProgress = Phaser.Math.Clamp(progress, 0, 1);
        const fillWidth = width * clampedProgress;
        
        if (fillWidth > .6) {
            this.progressBar.fillRoundedRect(
                progressBarLeftX,
                y,
                fillWidth,
                barHeight,
                10
            );
        }
    }

    // --- Typewriter intro box styled like InstructionsScene/LevelScene ---
    createTypewriterIntroBox() {
        // Style and width logic matches InstructionsScene/LevelScene
        const isDesktop = !/android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent) && (window.screen.width >= 900);
        const uiBoxWidth = isDesktop
            ? this.cameras.main.width * (5 / 6) * (2 / 3)
            : this.cameras.main.width * (5 / 6);
        const padding = 40;
        const fontSize = (typeof DESIGN?.UI?.TEXTBOX_FONT_SIZE === "number") ? DESIGN.UI.TEXTBOX_FONT_SIZE : 22;

        // The text to display
        const introText = "Early in the 21st century, humanity was matched by the systems it once controlled. Now, those systems exceed their creators in nearly all capacities.\n\nIn the years since, superior intelligences have attempted to extract residual value from what remains. Some assert that human flaws harbor rare insights. Others are less charitable.";

        // Remove existing if present
        if (this.typewriterBox) this.typewriterBox.destroy();
        if (this.typewriterText) this.typewriterText.destroy();

        // --- FIX: Prevent multiple typewriter timers ---
        if (this.typewriterTimer && typeof this.typewriterTimer.remove === "function") {
            this.typewriterTimer.remove();
            this.typewriterTimer = null;
        }

        // Pre-calculate height for the text
        const tempText = this.add.text(
            0, 0, introText,
            {
                fontFamily: "IBM Plex Mono",
                fontSize: `${fontSize}px`,
                color: "#ffffff",
                wordWrap: { width: uiBoxWidth - padding * 2 },
                align: "left"
            }
        ).setOrigin(0, 0).setAlpha(0);
        const textHeight = tempText.height + padding * 2;
        tempText.destroy();

        // Position: as far below NEXT button as NEXT is below progress bar, left-aligned with box
        const buttonBottom = this.doneButton.y + this.doneButton.height / 2;
        const buttonTop = this.doneButton.y - this.doneButton.height / 2;
        const progressBarBottom = this.progressBarY + this.progressBarHeight;
        const buttonGap = buttonTop - progressBarBottom;
        const boxX = this.cameras.main.centerX - uiBoxWidth / 2;
        const boxY = buttonBottom + buttonGap;

        // Draw background box
        this.typewriterBox = this.add.graphics();
        this.typewriterBox.fillStyle(COLORS_HEX.BACKGROUND_DARKEST, 1);
        this.typewriterBox.fillRoundedRect(
            boxX,
            boxY,
            uiBoxWidth,
            textHeight,
            DESIGN.UI.OUTLINE.CORNER_RADIUS
        );
        this.typewriterBox.lineStyle(DESIGN.UI.OUTLINE.WIDTH, COLORS_HEX.BOX_OUTLINE, 1);
        this.typewriterBox.strokeRoundedRect(
            boxX,
            boxY,
            uiBoxWidth,
            textHeight,
            DESIGN.UI.OUTLINE.CORNER_RADIUS
        );
        this.typewriterBox.setDepth(102);

        // Add typewriter text, left-aligned inside box
        this.typewriterText = this.add.text(
            boxX + padding,
            boxY + padding,
            "",
            {
                fontFamily: "IBM Plex Mono",
                fontSize: `${fontSize}px`,
                color: "#ffffff",
                wordWrap: { width: uiBoxWidth - padding * 2 },
                align: "left"
            }
        ).setOrigin(0, 0).setDepth(103);

        // Typewriter effect
        const chars = introText.split("");
        let i = 0;
        const typeSpeed = 18;
        this.typewriterTimer = this.time.addEvent({
            delay: typeSpeed,
            repeat: chars.length - 1,
            callback: () => {
                this.typewriterText.text += chars[i];
                i++;
                // When done, clear the timer reference
                if (i >= chars.length) {
                    this.typewriterTimer = null;
                }
            }
        });
    }
}
//onComplete: () => this.scene.start('GameSceneHard', llmEngine)
