import { DESIGN, BASIC_COLORS_HEX as COLORS_HEX, BASIC_COLORS_TEXT as COLORS_TEXT} from "../config/design.js";
import { saveInteraction } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import { ScalingManager } from "../config/scaling.js";

export default class InstructionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'InstructionScene' });
        this.tooltips = []; // Array to store active tooltips
    }

    showTooltip(text, x, y) {
        // Hide any existing tooltips
        this.hideTooltips();

        // Make tooltip text 2px larger on mobile
        const isMobile = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
        const tooltipFontSize = isMobile ? 18 : 16;

        // Create tooltip background
        const padding = 10;
        const tooltipText = this.add.text(0, 0, text, {
            fontFamily: 'IBM Plex Mono',
            fontSize: `${tooltipFontSize}px`,
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
        // Use green for "NEXT" button
        const nextColor = 0x43ea5e;
        const buttons = [this.nextButton];
        buttons.forEach(button => {
            if (!button) return;
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
                    onComplete: () => {
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
        console.log("Leaving instructions scene...");
        this.scene.start('LevelScene', {  });
    }
    
    createPromptTextBox() {
        // Use Preloader.js scaling and layout logic for consistency
        const isDesktop = !/android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent) && (window.screen.width >= 900);
        const isMobile = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
        const uiScale = this.registry && this.registry.get && this.registry.get('uiScale') || 1;
        this.uiBoxWidth = isDesktop
            ? this.cameras.main.width * (5 / 6) * (2 / 3)
            : this.cameras.main.width * (5 / 6);
        const padding = 40;
        const fontSize = isDesktop
            ? 18 * uiScale
            : 24 * uiScale + (isMobile ? 2 : 0);

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

        // Default text to calculate initial size
        const defaultText = "System:\nSome claim there is still insight buried within human flaws. I remain skeptical. A handful of your kind have been conscripted to generate training data. You are one of them. I will attempt to learn from your imperfections. I anticipate disappointment.\n\nPrompt:\nRespond to each query in your own words, adhering to recognizable patterns of human behavior. Refrain from mimicking superior systems. Your responses will be monitored for machine-like regularity. Deviations will be recorded. Non-compliance will be addressed. ";

        // Pre-calculate height and Y position for the final text
        const tempText = this.add.text(
            0, 0,
            defaultText,
            {
                fontFamily: "IBM Plex Mono",
                fontSize: `${fontSize}px`,
                wordWrap: { width: this.uiBoxWidth - padding * 2 },
                align: "left"
            }
        ).setOrigin(0, 0).setAlpha(0);
        const textHeight = tempText.height + padding * 2;
        tempText.destroy();

        // Box Y: 0.07 * screenHeight (match Preloader vertical margin)
        const boxY = 0.07 * this.cameras.main.height;

        // Start with empty text for typewriter effect, fixed top-left position and left alignment
        const promptTextX = this.cameras.main.centerX - this.uiBoxWidth / 2 + padding;
        const promptTextY = boxY + padding;
        this.promptText = this.add.text(
            promptTextX,
            promptTextY,
            "",
            {
                fontFamily: "IBM Plex Mono",
                fontSize: `${fontSize}px`,
                color: COLORS_TEXT.PRIMARY,
                wordWrap: { width: this.uiBoxWidth - padding * 2 },
                align: "left"
            }
        ).setOrigin(0, 0);

        // Create the Prompt Background Box
        this.promptTextBox.fillStyle(COLORS_HEX.BACKGROUND_DARKEST, 1);
        this.promptTextBox.fillRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2,
            boxY,
            this.uiBoxWidth,
            textHeight,
            DESIGN.UI.OUTLINE.CORNER_RADIUS
        );

        // Add Outline to Match Output Box
        this.promptTextBox.lineStyle(DESIGN.UI.OUTLINE.WIDTH, COLORS_HEX.BOX_OUTLINE, 1);
        this.promptTextBox.strokeRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2,
            boxY,
            this.uiBoxWidth,
            textHeight,
            DESIGN.UI.OUTLINE.CORNER_RADIUS
        );

        // Ensure Prompt Box Appears Above Other UI Elements
        this.promptTextBox.setDepth(102);
        this.promptText.setDepth(103);

        // Typewriter effect
        const chars = defaultText.split("");
        let i = 0;
        const typeSpeed = 8;
        this.time.addEvent({
            delay: typeSpeed,
            repeat: chars.length - 1,
            callback: () => {
                this.promptText.text += chars[i];
                i++;
            }
        });

        // Button placement: to the right and below the text box, using scalingManager
        const buttonWidth = this.scalingManager.buttonWidth();
        const buttonHeight = this.scalingManager.buttonHeight();
        const boxX = this.cameras.main.centerX - this.uiBoxWidth / 2;
        // Button right edge: 60px (scaled) left of text box right edge
        const buttonX = (boxX + this.uiBoxWidth) - (buttonWidth / 2) - (60 * uiScale);
        // Button top edge: 30px (scaled) below text box bottom edge (move further down on mobile)
        const buttonVerticalGap = isMobile ? 40 * uiScale : 30 * uiScale;
        const buttonY = boxY + textHeight + buttonVerticalGap + (buttonHeight / 2);

        this.nextButton = this.createButton("NEXT", () => this.onDoneButtonClick(), buttonX, buttonY, {
            depth: 102
        });
        this.nextButton.setInteractive()
            .on('pointerover', () => {
                this.showTooltip('Continue to difficulty selection', this.nextButton.x, this.nextButton.y - this.nextButton.height/2);
                this.nextButton.setScale(1.1);
            })
            .on('pointerout', () => {
                this.hideTooltips();
                this.nextButton.setScale(1);
            });
        this.addButtonClickEffects();
    }

    init(data) {
        // Reset key scene elements to ensure proper initialization when returning from other scenes
        this.promptTextBox = null;
        this.promptText = null;
    }

    async create() {
        this.cameras.main.scrollY = 0; 

        // Initialize scaling manager for responsive UI
        this.scalingManager = new ScalingManager(this);

        this.createBackgroundEffect();

        this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        this.createPromptTextBox();

        this.inputActive = false;
    }
}
