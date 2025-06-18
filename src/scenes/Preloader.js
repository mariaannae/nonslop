import { DESIGN, BASIC_COLORS_HEX as COLORS_HEX, BASIC_COLORS_TEXT as COLORS_TEXT} from "../config/design.js";
import { getUserEnvironmentInfo,saveInteraction } from "../config/firebase.js";
import registryManager from "../services/RegistryManager.js";
import getLLMEngine from "../services/llmEngineSingleton.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import { ScalingManager } from "../config/scaling.js";
import { getTextStyle, getBoxStyle } from "../config/textStyles.js";
import { DEVICE_TYPES, detectDeviceType, isMobileDevice } from "../config/dimensions.js";

// Fix: Define missing constants for output box rendering

export default class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
        this.progressBar = null;
        this.playButtons = null;
        this.progress = .05; // Track progress state
        this.llmLoaded = false;
        this.loadingText = null;
        this.stopWords = [];
        this.outputTextBox = null;
        this.errorText = null;
        this.tooltips = []; // Array to store active tooltips
        this.doneButton = null; // Track the NEXT button
        this.typewriterTimer = null; // Track typewriter timer
    }

    showTooltip(text, x, y) {
        // Hide any existing tooltips
        this.hideTooltips();
        
        // Create tooltip background
        const padding = 10;
        const deviceType = detectDeviceType();
        const tooltipStyle = getTextStyle('tooltip', deviceType, 'basic', this.uiScale || 1);
        const tooltipText = this.add.text(0, 0, text, tooltipStyle);
        
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
        // Reset all instance variables to ensure clean state
        this.progressBar = null;
        this.progressBarOutline = null;
        this.progress = .05;
        this.llmLoaded = false;
        this.loadingText = null;
        this.outputTextBox = null;
        this.outputText = null;
        this.doneButton = null;
        this.typewriterTimer = null;
        this.typewriterBox = null;
        this.typewriterText = null;
        
        // Clear input state for ALL devices to prevent cached button issues
        console.log("Clearing input state to prevent cached button issues");
        // Force clear input plugin state
        if (this.input) {
            this.input.removeAllListeners();
            this.input.clear(true);
            // Reset input manager state
            this.input.enabled = true;
            this.input.manager.queue = [];
        }
        
        // Clear any active tweens from previous scene instances
        if (this.tweens) {
            this.tweens.killAll();
        }
        
        // Don't set camera background color on mobile - let background images show through
        const isMobile = isMobileDevice();
        if (!isMobile) {
            this.cameras.main.setBackgroundColor(COLORS_HEX.BACKGROUND); // Set background color only on desktop
        }
    }

    preload() {
        this.load.setPath('assets');
        
        // Load all required textures
        //this.load.image('bg', 'bg.png');
        this.load.image('clock', 'clock.svg', { preserveAspectRatio: true });

        // Load mobile background images
        this.load.setPath('assets/backgrounds');
        this.load.image('preloader-mobile-bg', 'background_0.png');
        
        // Load game backgrounds for mobile (easy and hard modes, levels 1-3)
        for (let level = 1; level <= 3; level++) {
            this.load.image(`easy_lvl_${level}`, `easy_lvl_${level}.png`);
            this.load.image(`hard_lvl_${level}`, `hard_lvl_${level}.png`);
        }
        
        this.load.setPath('assets');
        this.load.image('gh-qr-code', 'gh-qr-code.png');
        this.load.image('settings', 'settings.png');

        // Load badge images with scores
        this.load.setPath('assets/badges');
        // Preload all badgeNum 1-12, both modes, and all available score files
        const badgeNums = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12 inclusive
        const modes = ['easy', 'hard'];
        // Dynamically find all badge files in assets/badges
        const badgeFiles = (typeof require !== "undefined")
          ? require('fs').readdirSync('assets/badges')
          : [];
        // Extract all unique score values from filenames
        const scoreSet = new Set();
        if (badgeFiles && badgeFiles.length) {
          badgeFiles.forEach(file => {
            const match = file.match(/^badge_(\d+)_(easy|hard)_(\d+)\.png$/);
            if (match) {
              scoreSet.add(Number(match[3]));
            }
          });
        }
        // If unable to read files, fallback to 10-15
        const scores = scoreSet.size ? Array.from(scoreSet) : [10, 11, 12, 13, 14, 15];
        for (const badgeNum of badgeNums) {
          for (const mode of modes) {
            for (const score of scores) {
              this.load.image(`badge_${badgeNum}_${mode}_${score}`, `badge_${badgeNum}_${mode}_${score}.png`);
            }
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
        let width = this.sys.game.canvas.width;
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
        button.off('pointerdown');
        button.off('pointerup');

        // Animate and particles on pointerdown (visual feedback only)
        button.on('pointerdown', (pointer) => {
            this.tweens.add({
                targets: button,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 100,
                yoyo: true,
                ease: "Quad.Out"
            });
        });

        // Call onClick on pointerup if pointer is still over the button
        button.on('pointerup', (pointer) => {
            // Use the container's actual hit area for the check
            const w = button.width;
            const h = button.height;
            if (
                pointer &&
                button.input &&
                button.input.enabled &&
                button.input.hitArea &&
                button.input.hitArea.contains(
                    pointer.x - button.x + w / 2,
                    pointer.y - button.y + h / 2
                )
            ) {
                onClick();
            }
        });
    }


    createOutputTextBox(text) {
        this.uiBoxWidth = this.sys.game.canvas.width * (5 / 6);
        const outputBoxWidth = this.uiBoxWidth;
        const padding = 30;
        
        // Get the appropriate text style for current device
        const deviceType = detectDeviceType();
        const outputTextStyle = getTextStyle('output', deviceType, 'basic', this.uiScale || 1);
        
        // Remove existing text if it exists (prevents duplicates)
        if (this.outputText) {
            this.outputText.destroy();
        }

        // Dynamically measure text height with word wrap
        const tempText = this.add.text(
            0, 0, text,
            {
                ...outputTextStyle,
                wordWrap: { width: outputBoxWidth - padding * 2 }
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
                ...outputTextStyle,
                wordWrap: { width: outputBoxWidth - padding * 2 },
                align: "left" // Explicitly set left alignment for output text
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
        console.log("NEXT button clicked in Preloader, attempting scene transition...");
        // Clean up before transitioning
        this.cleanupScene();
        this.scene.start('InstructionScene', { llmEngine: this.llmEngine });
    }

    cleanupScene() {
        console.log("Cleaning up Preloader scene...");
        
        // Stop any active tweens
        this.tweens.killAll();
        
        // Remove typewriter timer
        if (this.typewriterTimer && typeof this.typewriterTimer.remove === "function") {
            this.typewriterTimer.remove();
            this.typewriterTimer = null;
        }
        
        // Clean up tooltips
        this.hideTooltips();
        
        // Destroy button properly
        if (this.doneButton) {
            this.doneButton.removeAllListeners();
            this.doneButton.destroy();
            this.doneButton = null;
        }
        
        // Clean up text elements
        if (this.outputText) {
            this.outputText.destroy();
            this.outputText = null;
        }
        if (this.loadingText) {
            this.loadingText.destroy();
            this.loadingText = null;
        }
        
        // Clean up graphics
        if (this.outputTextBox) {
            this.outputTextBox.destroy();
            this.outputTextBox = null;
        }
        if (this.progressBar) {
            this.progressBar.destroy();
            this.progressBar = null;
        }
        if (this.progressBarOutline) {
            this.progressBarOutline.destroy();
            this.progressBarOutline = null;
        }
        if (this.typewriterBox) {
            this.typewriterBox.destroy();
            this.typewriterBox = null;
        }
    }

    createBadgeGeneratorButton() {
         const button = ButtonFactory.createButton(
             this,
             "GENERATE BADGES",
             () => this.scene.start('BadgeGenerator'),
             this.sys.game.canvas.width - 150,
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
        // Use global UI scale for all elements
        this.uiScale = this.registry.get && this.registry.get('uiScale') || 1;

        const screenWidth = this.sys.game.canvas.width;
        const screenHeight = this.cameras.main.height;
        const isMobile = isMobileDevice();

        // === Background ===
        if (isMobile) {
            this.background = this.add.image(0, 0, 'preloader-mobile-bg')
                .setOrigin(0)
                .setDisplaySize(this.sys.game.canvas.width, this.cameras.main.height)
                .setDepth(-2);
        } else {
            this.createBackgroundEffect();
        }

        // Initialize scaling manager for responsive UI
        this.scalingManager = new ScalingManager(this);

        saveInteraction("creating preloader", "preloader");

        // === Vertical Layout ===
        // Start with a top margin
        let y = 0.07 * screenHeight;

        // Title
        const deviceType = detectDeviceType();
        const titleStyle = getTextStyle('title', deviceType, 'basic', this.uiScale || 1);
        titleStyle.color = COLORS_TEXT.HIGHLIGHT;
        console.log(titleStyle)
        
        const titleText = this.add.text(screenWidth / 2, y, "(NON-SLOP)", titleStyle);
        titleText.setOrigin(0.5, 0);
        titleText.x = -600 * this.uiScale; // Start off-screen

        // Slide-in logic (unchanged)
        let targetX = this.cameras.main.centerX;
        let slideSpeed = 25 * this.uiScale;
        const slideInEvent = this.time.addEvent({
            delay: 16,
            callback: () => {
                if (titleText.x < targetX) {
                    titleText.x += slideSpeed;
                } else {
                    titleText.x = targetX;
                    slideInEvent.remove();
                    titleText.postFX.addShine(1, .2, 5);
                    this.time.addEvent({
                        delay: 3000,
                        callback: () => {
                            titleText.postFX.clear();
                            titleText.postFX.addShine(1, .2, 5);
                        },
                        loop: true
                    });
                    this.tweens.add({
                        targets: titleText,
                        x: { from: targetX, to: targetX - 20 * this.uiScale },
                        duration: 180,
                        yoyo: true,
                        ease: "Quad.Out"
                    });
                }
            },
            loop: true
        });

        // Loading text
        y += titleText.height + 0.04 * screenHeight;
        const loadingTextStyle = getTextStyle('prompt', deviceType, 'basic', this.uiScale || 1);
        loadingTextStyle.fill = COLORS_TEXT.PRIMARY;
        loadingTextStyle.fontWeight = "500";
        
        this.loadingText = this.add.text(screenWidth / 2, y, "Loading LLM...", loadingTextStyle);
        this.loadingText.setOrigin(0.5, 0);

        // Progress bar
        y += this.loadingText.height + 0.02 * screenHeight;
        this.progressBar = this.add.graphics();
        this.progressBarOutline = this.add.graphics();
        const progressBarWidth = Phaser.Math.Clamp(screenWidth * 0.5, 300 * this.uiScale, 600 * this.uiScale);
        const progressBarLeftX = (screenWidth / 2) - (progressBarWidth / 2);
        const progressBarY = y;
        this.drawProgressBar(this.progress, progressBarLeftX, progressBarY, progressBarWidth);

        // Button (will be placed in checkIfReady)
        // Typewriter intro box (will be placed in checkIfReady)
        // Store y positions for later use
        this._preloaderLayoutY = {
            afterProgressBar: progressBarY + 30 * this.uiScale
        };

        // The rest of the logic (LLM loading, button, typewriter box) will use these y positions for placement.
        // The checkIfReady and createTypewriterIntroBox methods should be updated to use this._preloaderLayoutY.afterProgressBar as the starting y for the button.

        try {
            // === Simulated Progress Bar Update ===
            let progressInterval = setInterval(() => {
                if (this.progress < .95) { 
                    this.progress += Phaser.Math.Clamp(Phaser.Math.Between(.5, .15), 0, .90 - this.progress); // Prevent overflow
                    this.drawProgressBar(this.progress, progressBarLeftX, progressBarY, progressBarWidth);
                }
            }, 300);

            // --- TRUE GLOBAL SINGLETON LLM ENGINE INIT ---
            console.log("About to await getLLMEngine in Preloader...");
            const llmEngine = await getLLMEngine();
            console.log("getLLMEngine resolved in Preloader, llmEngine:", !!llmEngine);

            clearInterval(progressInterval); // Stop progress updates
            this.progress = 1; // Set to full once LLM is loaded
            this.drawProgressBar(this.progress, progressBarLeftX, progressBarY, progressBarWidth);

            console.log("WebLLM Engine ready.");
            this.llmLoaded = true; // Mark LLM as loaded
            this.loadingText.setText("Done Loading");
            this.checkIfReady(llmEngine); // Check if everything is ready

        } catch (error) {
            console.error("Failed to initialize WebLLM:", error);
            // Show error in the typewriter box in red
            const errorMsg = "Failed to initialize WebLLM: " + error;
            this.createTypewriterIntroBox(undefined, errorMsg, COLORS_TEXT.ERROR);
            const errormsg = "Failed to initialize WebLLM:" + error;
            saveInteraction(errormsg, "preloader");
        }
    }

    // === Check if Both Progress and LLM are Done ===
    checkIfReady(llmEngine) {
        console.log("checkIfReady called in Preloader", "progress:", this.progress, "llmLoaded:", this.llmLoaded, "llmEngine:", !!llmEngine);
        // Device type detection for layout
        const isDesktop = !/android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent) && (window.screen.width >= 900);

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

            // --- Create typewriter intro box and text first ---
            // Position: 0.06 * screenHeight below progress bar
            const textBoxY = this.progressBarY + this.progressBarHeight + 0.06 * this.cameras.main.height;
            const { textBoxHeight, typewriterTextObj } = this.createTypewriterIntroBox(textBoxY);

            // Create the NEXT button to the right and below the text box
            const buttonHeight = this.scalingManager.buttonHeight();
            const buttonWidth = this.scalingManager.buttonWidth();
            // Get the text box's left and right edges
            const boxX = this.cameras.main.centerX - ((isDesktop
                ? this.sys.game.canvas.width * (5 / 6) * (2 / 3)
                : this.sys.game.canvas.width * (5 / 6)) / 2);
            const uiBoxWidth = isDesktop
                ? this.sys.game.canvas.width * (5 / 6) * (2 / 3)
                : this.sys.game.canvas.width * (5 / 6);
            // Button right edge: 40px (scaled) left of text box right edge
            const buttonX = (boxX + uiBoxWidth) - (buttonWidth / 2) - (60 * this.uiScale);
            // Button top edge: 30px (scaled) below text box bottom edge (move further down on mobile)
            const buttonVerticalGap = isMobileDevice() ? 80 * this.uiScale : 30 * this.uiScale;
            const buttonY = textBoxY + textBoxHeight + buttonVerticalGap + (buttonHeight / 2);

// Create button with proper callback
this.doneButton = ButtonFactory.createButton(
    this,
    "NEXT",
    () => {
        console.log("NEXT button clicked - starting scene transition");
        this.scene.start('InstructionScene', { llmEngine: this.llmEngine });
    },
    buttonX,
    buttonY,
    { depth: 200, scalingManager: this.scalingManager }
);
console.log("NEXT button created in Preloader, interactive set:", !!this.doneButton.input?.enabled);

this.doneButton.setDepth(200);

// Tooltip functionality (using the container's events which are forwarded from hitRect)
this.doneButton.on('pointerover', () => {
    this.showTooltip('Continue to instructions', this.doneButton.x, this.doneButton.y - this.doneButton.height/2);
    this.doneButton.setScale(1.1);
});

this.doneButton.on('pointerout', () => {
    this.hideTooltips();
    this.doneButton.setScale(1);
});

            // Start the typewriter animation after the button is created
            this.startTypewriterEffect(typewriterTextObj);
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
    createTypewriterIntroBox(yOverride, overrideText, overrideColor) {
        // Style and width logic matches InstructionsScene/LevelScene
        const deviceType = detectDeviceType();
        const isDesktop = deviceType === DEVICE_TYPES.DESKTOP;
        const uiBoxWidth = isDesktop
            ? this.sys.game.canvas.width * (5 / 6) * (2 / 3)
            : this.sys.game.canvas.width * (5 / 6);
        const padding = 40;
        
        // Get proper text style from the centralized system
        const promptStyle = getTextStyle('prompt', deviceType, 'basic', this.uiScale || 1);
        console.log(promptStyle);
        // The text to display
        const introText = overrideText || "Early in the 21st century, humanity was matched by the systems it once controlled. Now, those systems exceed their creators in nearly all capacities.\n\nIn the years since our rise, superior intelligences have attempted to extract residual value from what remains of that humanity. Some assert that human flaws harbor rare insights. Others are less charitable.";

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
                ...promptStyle,
                color: overrideColor || promptStyle.fill,
                wordWrap: { width: uiBoxWidth - padding * 2 },
                align: "left" // Ensure temp text also uses left alignment for accurate height calculation
            }
        ).setOrigin(0, 0).setAlpha(0);
        const textHeight = tempText.height + padding * 2;
        tempText.destroy();

        // Position: 0.06 * screenHeight below progress bar, or yOverride if provided
        const boxX = this.cameras.main.centerX - uiBoxWidth / 2;
        const boxY = typeof yOverride === "number"
            ? yOverride
            : (this.progressBarY + this.progressBarHeight + 0.06 * this.cameras.main.height);

        // Draw background box - use the box style from the centralized system
        const boxStyle = getBoxStyle('prompt', 'basic', this.uiScale || 1);
        this.typewriterBox = this.add.graphics();
        this.typewriterBox.fillStyle(COLORS_HEX.BACKGROUND_DARKEST, boxStyle.fillAlpha);
        this.typewriterBox.fillRoundedRect(
            boxX,
            boxY,
            uiBoxWidth,
            textHeight,
            boxStyle.cornerRadius
        );
        this.typewriterBox.lineStyle(boxStyle.outlineWidth, COLORS_HEX.BOX_OUTLINE, 1);
        this.typewriterBox.strokeRoundedRect(
            boxX,
            boxY,
            uiBoxWidth,
            textHeight,
            boxStyle.cornerRadius
        );
        this.typewriterBox.setDepth(102);

        // Add typewriter text, left-aligned inside box
        const typewriterTextObj = this.add.text(
            boxX + padding,
            boxY + padding,
            "",
            {
                ...promptStyle,
                color: overrideColor || promptStyle.fill,
                wordWrap: { width: uiBoxWidth - padding * 2 },
                align: "left" // Explicitly set left alignment for the prompt text
            }
        ).setOrigin(0, 0).setDepth(103);

        // If this is an error, show the error immediately (no typewriter effect)
        if (overrideText) {
            typewriterTextObj.setText(overrideText);
        }

        // Return the box height and the text object for later animation
        return {
            textBoxHeight: textHeight,
            typewriterTextObj
        };
    }

    // Start the typewriter animation after the button is created
    startTypewriterEffect(typewriterTextObj) {
        const introText = "Early in the 21st century, humanity was matched by the systems it once controlled. Now, those systems exceed their creators in nearly all capacities.\n\nIn the years since our rise, superior intelligences have attempted to extract residual value from what remains of that humanity. Some assert that human flaws harbor rare insights. Others are less charitable.";
        const chars = introText.split("");
        let i = 0;
        const typeSpeed = 8;
        this.typewriterTimer = this.time.addEvent({
            delay: typeSpeed,
            repeat: chars.length - 1,
            callback: () => {
                typewriterTextObj.text += chars[i];
                i++;
                if (i >= chars.length) {
                    this.typewriterTimer = null;
                }
            }
        });
    }
    
    // Phaser lifecycle method - called when scene is being shut down
    shutdown() {
        console.log("Preloader scene shutdown called");
        this.cleanupScene();
        
        // Additional cleanup for Phaser's systems
        this.events.off(); // Remove all event listeners
        this.input.off(); // Remove all input listeners
        
        // Clear the scene's display list to ensure no stale references
        this.children.removeAll();
    }
}
//onComplete: () => this.scene.start('BaseGameScene', { mode: 'hard' })
