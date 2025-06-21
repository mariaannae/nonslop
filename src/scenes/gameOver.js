import { DESIGN, EASY_COLORS_HEX, EASY_COLORS_TEXT, HARD_COLORS_HEX, HARD_COLORS_TEXT, THEMES } from "../config/design.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import { createBackground } from "../backgrounds/createBackground.js";
import { ScalingManager } from "../config/scaling.js";
import { getTextStyle } from "../config/textStyles.js";
import { detectDeviceType } from "../config/dimensions.js";

export default class gameOver extends Phaser.Scene {
    constructor() {
        super({ key: 'gameOver' });
        this.mode = null;
        this.levelValue = null;
    }

    init(data) {
        this.mode = data.mode || 'easy';
        this.levelValue = data.levelValue || 1;
        this.score = data.score || 0;

        if (this.mode === "easy") {
            this.COLORS_HEX = EASY_COLORS_HEX;
            this.COLORS_TEXT = EASY_COLORS_TEXT;
        } else {
            this.COLORS_HEX = HARD_COLORS_HEX;
            this.COLORS_TEXT = HARD_COLORS_TEXT;
        }
    }

    getBadgeKey() {
        // Return the badge key in the format that matches the actual files: badge_1_easy_10.png
        return `badge_${this.currentBadgeIndex + 1}_${this.mode}_${this.score}`;
    }

    showSharingInstructions(platform) {
        const instructions = {
            'instagram': 'Share to Instagram Stories and tag us!',
            'threads': 'Share on Threads with your thoughts!',
            'tiktok': 'Create a TikTok with your badge!'
        };
        
        this.showToast(instructions[platform] || 'Share your badge!');
    }

    showToast(message) {
        // Remove any existing toast
        if (this.toastText) {
            this.toastText.destroy();
        }
        const toastStyle = {
            fontFamily: 'IBM Plex Mono',
            fontSize: '28px',
            color: '#fff',
            backgroundColor: '#222',
            padding: { x: 24, y: 12 },
            align: 'center',
            stroke: '#000',
            strokeThickness: 4,
            fixedWidth: this.sys.game.canvas.width * 0.8,
            wordWrap: { width: this.sys.game.canvas.width * 0.8 }
        };
        this.toastText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.height - 80,
            message,
            toastStyle
        ).setOrigin(0.5).setDepth(1000);

        this.tweens.add({
            targets: this.toastText,
            alpha: 0,
            duration: 2000,
            delay: 2500,
            onComplete: () => {
                if (this.toastText) {
                    this.toastText.destroy();
                    this.toastText = null;
                }
            }
        });
    }

    create() {
        // Initialize scaling manager
        this.scalingManager = new ScalingManager(this);
        
        // Use global UI scale for all elements
        this.uiScale = this.registry.get('uiScale') || 1;
        
        // Get device type
        this.deviceType = this.scalingManager.deviceType;

        // Set background based on mode and level
        if (this.mode === "easy") {
            createBackground(this, THEMES.easy.background, this.levelValue);
        } else {
            createBackground(this, THEMES.hard.background, this.levelValue);
        }

        // --- SIMPLIFIED VERTICAL LAYOUT USING SCALINGMANAGER ---

        // Title - using centralized text styling
        const titleStyle = getTextStyle('title', this.deviceType, this.mode, this.uiScale);
        titleStyle.align = 'center';
        titleStyle.wordWrap = { width: this.scalingManager.widthPercent(90) };

        const winText = this.add.text(
            this.scalingManager.centerX(),
            this.scalingManager.heightPercent(10),
            "(CONGRATULATIONS)",
            titleStyle
        ).setOrigin(0.5);

        // Start tiny for pop effect
        winText.setScale(0.01);

        // Subtext - using centralized text styling
        const subtextStyle = getTextStyle('prompt', this.deviceType, this.mode, this.uiScale);
        subtextStyle.align = 'center';
        subtextStyle.wordWrap = { width: this.scalingManager.widthPercent(90) };

        const subText = this.add.text(
            this.scalingManager.centerX(),
            winText.y + winText.height + this.scalingManager.scaleValue(20),
            "This conversation can serve no purpose anymore. Goodbye.",
            subtextStyle
        ).setOrigin(0.5, 0);

        // Badge - using ScalingManager for consistent sizing
        // Randomly select a badge index (0-11)
        this.currentBadgeIndex = Math.floor(Math.random() * 12);
        
        // Load the pre-generated badge image
        const badgeKey = this.getBadgeKey();
        const badge = this.add.image(
            this.scalingManager.centerX(),
            subText.y + subText.displayHeight + this.scalingManager.scaleValue(40),
            badgeKey
        ).setOrigin(0.5, 0);

        // Scale badge using ScalingManager approach - consistent with GameOverScene
        const desiredHeight = this.scalingManager.heightPercent(25); // 25% of screen height
        if (badge.height > 0) {
            const scale = this.scalingManager.scaleValue(desiredHeight) / badge.height;
            badge.setScale(scale);
        } else {
            // If not loaded yet, set scale after texture loads
            badge.once('texturekeychange', () => {
                const scale = this.scalingManager.scaleValue(desiredHeight) / badge.height;
                badge.setScale(scale);
            });
        }

        // Get badge dimensions for layout
        const badgeHeight = badge.displayHeight;

        // Create "Celebrate adequacy.\nPublicly:" text using centralized text styling
        const celebrateStyle = getTextStyle('prompt', this.deviceType, this.mode, this.uiScale);
        celebrateStyle.align = 'center';
        celebrateStyle.wordWrap = { width: this.scalingManager.widthPercent(90) };

        const celebrateText = this.add.text(
            this.scalingManager.centerX(),
            badge.y + badge.displayHeight + this.scalingManager.scaleValue(40),
            "Celebrate adequacy.\nPublicly:",
            celebrateStyle
        ).setOrigin(0.5, 0);

        // Social share buttons - simplified layout using ScalingManager
        const gameAddress = "nonslop.app";
        const socialPlatforms = [
            { key: "facebook", url: () => "https://www.facebook.com/" },
            { key: "instagram", url: () => "https://www.instagram.com/" },
            { key: "threads", url: () => "https://www.threads.net/" },
            { key: "x", url: () => "https://x.com/" },
            { key: "tiktok", url: () => "https://www.tiktok.com/" },
            { key: "snapchat", url: () => "https://www.snapchat.com/" },
            { key: "bluesky", url: () => "https://bsky.app/" },
            { key: "linkedin", url: () => "https://www.linkedin.com/" },
            { key: "email", url: () => "mailto:" }
        ];

        const buttonSize = this.scalingManager.scaleValue(DESIGN.UI.BUTTON.WIDTH);
        const spacing = this.scalingManager.scaleValue(24);
        const socialY = celebrateText.y + celebrateText.displayHeight + this.scalingManager.scaleValue(40);

        // Create social buttons with consistent scaling
        const socialButtons = [];
        const platformTooltips = {
            facebook: "Share on Facebook",
            instagram: "Share on Instagram", 
            threads: "Share on Threads",
            x: "Share on X (Twitter)",
            tiktok: "Share on TikTok",
            snapchat: "Share on Snapchat",
            bluesky: "Share on Bluesky",
            linkedin: "Share on LinkedIn",
            email: "Share via Email"
        };

        // Position social buttons in a grid layout for mobile, single row for desktop
        const isMobile = this.deviceType === "phone";
        if (isMobile) {
            // Two rows for mobile
            const buttonsPerRow = Math.ceil(socialPlatforms.length / 2);
            socialPlatforms.forEach((platform, i) => {
                const row = Math.floor(i / buttonsPerRow);
                const col = i % buttonsPerRow;
                const rowWidth = Math.min(buttonsPerRow, socialPlatforms.length - row * buttonsPerRow) * buttonSize + 
                                (Math.min(buttonsPerRow, socialPlatforms.length - row * buttonsPerRow) - 1) * spacing;
                const startX = this.scalingManager.centerX() - rowWidth / 2 + buttonSize / 2;
                
                const btn = this.add.image(
                    startX + col * (buttonSize + spacing),
                    socialY + row * (buttonSize + spacing),
                    platform.key
                )
                .setDisplaySize(buttonSize, buttonSize)
                .setInteractive({ useHandCursor: true })
                .setDepth(10)
                .setTint(0xffffff);

                btn.on('pointerdown', () => {
                    window.open(platform.url(), '_blank', 'noopener,noreferrer');
                });

                socialButtons.push(btn);
            });
        } else {
            // Single row for desktop
            const totalWidth = socialPlatforms.length * buttonSize + (socialPlatforms.length - 1) * spacing;
            const startX = this.scalingManager.centerX() - totalWidth / 2 + buttonSize / 2;
            
            socialPlatforms.forEach((platform, i) => {
                const btn = this.add.image(
                    startX + i * (buttonSize + spacing),
                    socialY,
                    platform.key
                )
                .setDisplaySize(buttonSize, buttonSize)
                .setInteractive({ useHandCursor: true })
                .setDepth(10)
                .setTint(0xffffff);

                // Add tooltip for desktop
                let tooltip = null;
                btn.on('pointerover', () => {
                    tooltip = this.add.text(
                        btn.x,
                        btn.y - buttonSize / 2 - this.scalingManager.scaleValue(18),
                        platformTooltips[platform.key] || platform.key,
                        {
                            fontFamily: 'IBM Plex Mono',
                            fontSize: this.scalingManager.scaleText(20) + 'px',
                            color: '#fff',
                            backgroundColor: '#222',
                            padding: { 
                                x: this.scalingManager.scaleValue(12), 
                                y: this.scalingManager.scaleValue(6) 
                            },
                            align: 'center',
                            stroke: '#000',
                            strokeThickness: this.scalingManager.scaleValue(3)
                        }
                    ).setOrigin(0.5).setDepth(1001);
                });
                
                btn.on('pointerout', () => {
                    if (tooltip) {
                        tooltip.destroy();
                        tooltip = null;
                    }
                });

                btn.on('pointerdown', () => {
                    window.open(platform.url(), '_blank', 'noopener,noreferrer');
                });

                socialButtons.push(btn);
            });
        }

        // Action buttons - positioned below social buttons using ScalingManager
        const actionButtonY = socialY + (isMobile ? buttonSize * 2 + spacing : buttonSize) + this.scalingManager.scaleValue(40);

        // COPY LINK button
        const copyLinkButton = ButtonFactory.createButton(
            this,
            "COPY LINK",
            () => {
                const gameUrl = window.location.origin || gameAddress;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(gameUrl).then(() => {
                        this.showToast("Game link copied to clipboard!");
                    }).catch(() => {
                        this.showToast("Failed to copy link.");
                    });
                } else {
                    // Fallback for older browsers
                    const textarea = document.createElement('textarea');
                    textarea.value = gameUrl;
                    document.body.appendChild(textarea);
                    textarea.select();
                    try {
                        document.execCommand('copy');
                        this.showToast("Game link copied to clipboard!");
                    } catch {
                        this.showToast("Failed to copy link.");
                    }
                    document.body.removeChild(textarea);
                }
            },
            this.scalingManager.centerX(),
            actionButtonY,
            { 
                depth: 10,
                scalingManager: this.scalingManager
            }
        );

        // SAVE BADGE button
        const saveBadgeButton = ButtonFactory.createButton(
            this,
            "SAVE BADGE",
            () => {
                const badgeUrl = `assets/badges/${this.getBadgeKey()}.png`;
                // Create a temporary anchor to trigger download
                const a = document.createElement('a');
                a.href = badgeUrl;
                a.download = badgeUrl.split('/').pop() || 'badge.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            },
            this.scalingManager.centerX() - this.scalingManager.scaleValue(80),
            actionButtonY + this.scalingManager.scaleValue(60),
            { 
                depth: 10,
                scalingManager: this.scalingManager
            }
        );

        // PLAY AGAIN button
        const playAgainButton = ButtonFactory.createButton(
            this,
            "PLAY AGAIN",
            () => {
                this.scene.start('Boot');
            },
            this.scalingManager.centerX() + this.scalingManager.scaleValue(80),
            actionButtonY + this.scalingManager.scaleValue(60),
            { 
                depth: 10,
                scalingManager: this.scalingManager
            }
        );

        // Add hover effects to buttons
        [copyLinkButton, saveBadgeButton, playAgainButton].forEach(button => {
            button.setInteractive()
                .on('pointerover', () => button.setScale(1.1))
                .on('pointerout', () => button.setScale(1));
        });

        // Add title pop effect animation
        this.time.delayedCall(10, () => {
            const screenWidth = this.sys.game.canvas.width;
            const targetWidth = (7 / 8) * screenWidth;
            const baseWidth = winText.width;
            const targetScale = targetWidth / baseWidth;
            this.tweens.add({
                targets: winText,
                scale: targetScale,
                duration: 350,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: winText,
                        scale: 1,
                        duration: 350,
                        ease: 'Back.easeIn'
                    });
                }
            });
        });
    }
}
