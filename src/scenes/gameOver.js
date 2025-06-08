import { DESIGN, EASY_COLORS_HEX, EASY_COLORS_TEXT, HARD_COLORS_HEX, HARD_COLORS_TEXT, THEMES } from "../config/design.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import { createBackground } from "../backgrounds/createBackground.js";

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
        
        alert(instructions[platform] || 'Share your badge!');
    }

    create() {
        // Set background based on mode and level
        if (this.mode === "easy") {
            createBackground(this, THEMES.easy.background, this.levelValue);
        } else {
            createBackground(this, THEMES.hard.background, this.levelValue);
        }

        // --- EVEN VERTICAL SPACING REFACTOR ---

        // 1. Create all elements at (0,0) or with temporary y, measure heights

        // Title
        const winText = this.add.text(
            this.cameras.main.centerX,
            0,
            "(CONGRATULATIONS)",
            {
                fontFamily: 'barcade3d',
                fontSize: '80px',
                color: this.COLORS_TEXT.TITLE,
                align: 'center',
                stroke: '#000',
                strokeThickness: 8,
                shadow: {
                    offsetX: 4,
                    offsetY: 4,
                    color: '#000',
                    blur: 8,
                    fill: true
                }
            }
        ).setOrigin(0.5);

        // Start tiny for pop effect
        winText.setScale(0.01);

        // Subtext
        const subText = this.add.text(
            this.cameras.main.centerX,
            0,
            "This conversation can serve no purpose anymore. Goodbye.",
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: '32px',
                color: this.COLORS_TEXT.PRIMARY,
                align: 'center'
            }
        ).setOrigin(0.5);

        // Badge
        const textSpacing = 16;

        // Randomly select a badge index (0-11)
        this.currentBadgeIndex = Math.floor(Math.random() * 12);
        
        // Load the pre-generated badge image
        const badgeKey = this.getBadgeKey();
        const badge = this.add.image(0, 0, badgeKey).setOrigin(0.5);
        
        // Create badge container and add badge
        const badgeContainer = this.add.container(0, 0);
        badgeContainer.add(badge);

        // Get badge dimensions for layout
        const badgeHeight = badge.displayHeight;

        // Social share buttons (create but don't position yet)
        const gameAddress = "nonslop.app";
        const socialPlatforms = [
            {
                key: "facebook",
                url: (badgeImageUrl) => {
                    const shareText = encodeURIComponent("Would you like to play a game?");
                    const gameUrl = encodeURIComponent(window.location.origin || gameAddress);
                    return `https://www.facebook.com/sharer/sharer.php?u=${gameUrl}&quote=${shareText}`;
                }
            },
            {
                key: "instagram",
                url: () => `https://www.instagram.com/`
            },
            {
                key: "threads",
                url: () => `https://www.threads.net/`
            },
            {
                key: "x",
                url: (badgeImageUrl) => {
                    const shareText = encodeURIComponent("Would you like to play a game?");
                    const gameUrl = encodeURIComponent(window.location.origin || gameAddress);
                    return `https://twitter.com/intent/tweet?text=${shareText}&url=${gameUrl}`;
                }
            },
            {
                key: "tiktok",
                url: () => `https://www.tiktok.com/`
            },
            {
                key: "snapchat",
                url: (badgeImageUrl) => {
                    const shareText = encodeURIComponent("Would you like to play a game?");
                    const gameUrl = encodeURIComponent(window.location.origin || gameAddress);
                    return `https://www.snapchat.com/create?text=${shareText}&url=${gameUrl}`;
                }
            },
            {
                key: "bluesky",
                url: (badgeImageUrl) => {
                    const shareText = encodeURIComponent("Would you like to play a game?");
                    const gameUrl = encodeURIComponent(window.location.origin || gameAddress);
                    return `https://bsky.app/intent/compose?text=${shareText}%20${gameUrl}`;
                }
            },
            {
                key: "linkedin",
                url: (badgeImageUrl) => {
                    const shareText = encodeURIComponent("Would you like to play a game?");
                    const gameUrl = encodeURIComponent(window.location.origin || gameAddress);
                    return `https://www.linkedin.com/sharing/share-offsite/?url=${gameUrl}&summary=${shareText}`;
                }
            },
            {
                key: "email",
                url: (badgeImageUrl) => {
                    const subject = encodeURIComponent("Would you like to play a game?");
                    const body = encodeURIComponent(
                        "Would you like to play a game?\n\n" +
                        "Check out NON-SLOP: " + (window.location.origin || gameAddress)
                    );
                    return `mailto:?subject=${subject}&body=${body}`;
                }
            }
        ];

        const buttonSize = 56;
        const spacing = 24;
        const totalWidth = socialPlatforms.length * buttonSize + (socialPlatforms.length - 1) * spacing;
        const startX = this.cameras.main.centerX - totalWidth / 2 + buttonSize / 2;

        const badgeImageUrl = window.location.origin
            ? window.location.origin + "/thumbnail.png"
            : gameAddress + '/thumbnail.png';

        // Create social buttons, store in array for later positioning
        const socialButtons = [];
        socialPlatforms.forEach((platform, i) => {
            const btn = this.add.image(0, 0, platform.key)
                .setDisplaySize(buttonSize, buttonSize)
                .setInteractive({ useHandCursor: true })
                .setDepth(10)
                .setTint(0xffffff);
            
            btn.on('pointerdown', () => {
                // Get the badge URL with the correct format
                const badgeUrl = `assets/badges/${this.getBadgeKey()}.png`;
                
                // For platforms that support direct sharing
                if (platform.key === 'facebook' || platform.key === 'x' || platform.key === 'linkedin' || platform.key === 'email' || platform.key === 'bluesky' || platform.key === 'snapchat') {
                    window.open(platform.url(badgeUrl), '_blank');
                }
                // For platforms that need manual sharing
                else if (platform.key === 'instagram' || platform.key === 'threads' || platform.key === 'tiktok') {
                    window.open(badgeUrl, '_blank');
                    this.showSharingInstructions(platform.key);
                }
            });
            
            socialButtons.push(btn);
        });

        

        // SAVE BADGE button (create but don't position yet)
        const saveBadgeButton = ButtonFactory.createButton(
            this,
            "SAVE BADGE",
            () => {
                const badgeUrl = `assets/badges/${this.getBadgeKey()}.png`;
                window.open(badgeUrl, '_blank');
            },
            0, // x will be set later
            0,
            { 
              depth: 10,
              width: DESIGN.UI.BUTTON.WIDTH,
              height: DESIGN.UI.BUTTON.HEIGHT
            }
        );
        saveBadgeButton.setInteractive()
            .on('pointerover', () => saveBadgeButton.setScale(1.1))
            .on('pointerout', () => saveBadgeButton.setScale(1));

        // Play Again button (create but don't position yet)
        const playAgainButton = ButtonFactory.createButton(
            this,
            "PLAY AGAIN",
            () => {
                this.scene.start('Boot');
            },
            0, // x will be set later
            0,
            { 
              depth: 10,
              width: DESIGN.UI.BUTTON.WIDTH,
              height: DESIGN.UI.BUTTON.HEIGHT
            }
        );
        playAgainButton.setInteractive()
            .on('pointerover', () => playAgainButton.setScale(1.1))
            .on('pointerout', () => playAgainButton.setScale(1));

        // 2. Measure heights of all elements
        // For social row, use buttonSize as height
        // For badge, use badgeHeight
        // For playAgainButton and saveBadgeButton, use their heights

        // 3. Calculate total content height and gap
        const elements = [
            { obj: winText, height: winText.height },
            { obj: subText, height: subText.height },
            { obj: badgeContainer, height: badgeHeight },
            { obj: null, height: buttonSize }, // social row
            { obj: null, height: Math.max(playAgainButton.height, saveBadgeButton.height) }
        ];

        const totalContentHeight =
            elements.reduce((sum, el) => sum + el.height, 0);

        const screenHeight = this.cameras.main.height;
        const topMargin = 40;
        const bottomMargin = 40;
        const availableHeight = screenHeight - topMargin - bottomMargin;
        const gap = (availableHeight - totalContentHeight) / (elements.length - 1);

        // 4. Position elements vertically with even spacing
        let currentY = topMargin + elements[0].height / 2;
        // Title
        winText.y = currentY;
        winText.x = this.cameras.main.centerX;

        // Pop effect (delayed so width is correct)
        this.time.delayedCall(10, () => {
            const screenWidth = this.cameras.main.width;
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

        // Subtext
        currentY += winText.height / 2 + gap + subText.height / 2;
        subText.y = currentY;
        subText.x = this.cameras.main.centerX;

        // Badge
        currentY += subText.height / 2 + gap + badgeHeight / 2;
        badgeContainer.x = this.cameras.main.centerX;
        badgeContainer.y = currentY;

        // Social row
        currentY += badgeHeight / 2 + gap + buttonSize / 2;
        // Position social buttons horizontally centered at currentY
        socialButtons.forEach((btn, i) => {
            btn.x = startX + i * (buttonSize + spacing);
            btn.y = currentY;
        });

        // Play Again and Save Badge buttons
        currentY += buttonSize / 2 + gap + Math.max(playAgainButton.height, saveBadgeButton.height) / 2;
        // Place SAVE BADGE to the left of PLAY AGAIN, with spacing
        const buttonSpacing = 32;
        const totalButtonWidth = playAgainButton.width + saveBadgeButton.width + buttonSpacing;
        playAgainButton.x = this.cameras.main.centerX + (totalButtonWidth / 2 - playAgainButton.width / 2);
        saveBadgeButton.x = this.cameras.main.centerX - (totalButtonWidth / 2 - saveBadgeButton.width / 2);
        playAgainButton.y = currentY;
        saveBadgeButton.y = currentY;

        // --- END EVEN VERTICAL SPACING REFACTOR ---
    }
}
