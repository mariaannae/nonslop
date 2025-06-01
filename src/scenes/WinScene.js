import { DESIGN, EASY_COLORS_HEX, EASY_COLORS_TEXT, HARD_COLORS_HEX, HARD_COLORS_TEXT, THEMES } from "../config/design.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import { createBackground } from "../backgrounds/createBackground.js";

export default class WinScene extends Phaser.Scene {
    constructor() {
        super({ key: 'winScene' });
        this.mode = null;
        this.levelValue = null;
    }

    init(data) {
        this.mode = data.mode || 'easy';
        this.levelValue = data.levelValue || 1;

        if (this.mode === "easy") {
            this.COLORS_HEX = EASY_COLORS_HEX;
            this.COLORS_TEXT = EASY_COLORS_TEXT;
        } else {
            this.COLORS_HEX = HARD_COLORS_HEX;
            this.COLORS_TEXT = HARD_COLORS_TEXT;
        }
    }

    create() {
        // Set background based on mode and level
        if (this.mode === "easy") {
            createBackground(this, THEMES.easy.background, this.levelValue);
        } else {
            createBackground(this, THEMES.hard.background, this.levelValue);
        }

        // "You Win" Title with pop effect
        const winText = this.add.text(
            this.cameras.main.centerX,
            120,
            "(YOU WIN!)",
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

        // Start tiny
        winText.setScale(0.01);

        // Calculate target scale for 7/8 screen width
        this.time.delayedCall(10, () => {
            const screenWidth = this.cameras.main.width;
            const targetWidth = (7 / 8) * screenWidth;
            const baseWidth = winText.width;
            const targetScale = targetWidth / baseWidth;

            // Pop up to target scale, then return to normal using chained tweens
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
        this.add.text(
            this.cameras.main.centerX,
            220,
            "Congratulations on finishing the game!",
            {
                fontFamily: 'Nunito',
                fontSize: '32px',
                color: this.COLORS_TEXT.PRIMARY,
                align: 'center'
            }
        ).setOrigin(0.5);


        // Badge graphic (simple circle with "WINNER" text)
        const badgeY = 370;
        const badge = this.add.graphics();
        const badgeRadius = 60;
        badge.fillStyle(0xffd700, 1); // Gold color
        badge.fillCircle(this.cameras.main.centerX, badgeY, badgeRadius);
        badge.lineStyle(6, 0xffffff, 1);
        badge.strokeCircle(this.cameras.main.centerX, badgeY, badgeRadius);

        this.add.text(
            this.cameras.main.centerX,
            badgeY,
            "WINNER",
            {
                fontFamily: 'Nunito',
                fontSize: '28px',
                color: '#000',
                fontStyle: 'bold',
                align: 'center'
            }
        ).setOrigin(0.5);

        // Social share buttons
        const socialPlatforms = [
            {
                key: "facebook",
                url: (badgeImageUrl) => {
                    const shareText = encodeURIComponent(
                        "I just won! 🏆 Play this game and earn your badge! " + badgeImageUrl
                    );
                    const gameUrl = encodeURIComponent(window.location.origin || "https://yourgameurl.com");
                    return `https://www.facebook.com/sharer/sharer.php?u=${gameUrl}&quote=${shareText}`;
                }
            },
            {
                key: "instagram",
                url: () => {
                    // Instagram does not support direct web sharing, so open Instagram homepage
                    return `https://www.instagram.com/`;
                }
            },
            {
                key: "threads",
                url: () => {
                    // Threads does not have a public web share intent, so open homepage
                    return `https://www.threads.net/`;
                }
            },
            {
                key: "x",
                url: (badgeImageUrl) => {
                    const shareText = encodeURIComponent(
                        "I just won! 🏆 Play this game and earn your badge! " + badgeImageUrl
                    );
                    const gameUrl = encodeURIComponent(window.location.origin || "https://yourgameurl.com");
                    return `https://twitter.com/intent/tweet?text=${shareText}&url=${gameUrl}`;
                }
            },
            {
                key: "tiktok",
                url: () => {
                    // TikTok does not support direct web sharing, so open homepage
                    return `https://www.tiktok.com/`;
                }
            },
            {
                key: "snapchat",
                url: (badgeImageUrl) => {
                    // Snapchat web share
                    const attachmentUrl = encodeURIComponent(badgeImageUrl);
                    return `https://www.snapchat.com/scan?attachmentUrl=${attachmentUrl}`;
                }
            },
            {
                key: "bluesky",
                url: (badgeImageUrl) => {
                    const shareText = encodeURIComponent(
                        "I just won! 🏆 Play this game and earn your badge! " + badgeImageUrl
                    );
                    const gameUrl = encodeURIComponent(window.location.origin || "https://yourgameurl.com");
                    return `https://bsky.app/intent/compose?text=${shareText}%20${gameUrl}`;
                }
            },
            {
                key: "linkedin",
                url: (badgeImageUrl) => {
                    // LinkedIn does not support custom text, but we can append the badge image to the URL
                    const gameUrl = encodeURIComponent(window.location.origin || "https://yourgameurl.com");
                    const badgeUrl = encodeURIComponent(badgeImageUrl);
                    return `https://www.linkedin.com/sharing/share-offsite/?url=${gameUrl}%20${badgeUrl}`;
                }
            },
            {
                key: "email",
                url: (badgeImageUrl) => {
                    const subject = encodeURIComponent("I just won this game!");
                    const body = encodeURIComponent(
                        "I just won! 🏆 Play this game and earn your badge: " +
                        (window.location.origin || "https://yourgameurl.com") +
                        "\n\nBadge image: " + badgeImageUrl
                    );
                    return `mailto:?subject=${subject}&body=${body}`;
                }
            }
        ];

        // Layout: horizontal row, centered
        const buttonSize = 56;
        const spacing = 24;
        const totalWidth = socialPlatforms.length * buttonSize + (socialPlatforms.length - 1) * spacing;
        const startX = this.cameras.main.centerX - totalWidth / 2 + buttonSize / 2;
        // Position social buttons so their bottom edge is 50px above the PLAY AGAIN button
        const playAgainY = this.cameras.main.height - 120;
        const socialY = playAgainY - 50 - buttonSize / 2;

        // Badge image URL for sharing
        const badgeImageUrl = window.location.origin
            ? window.location.origin + "/thumbnail.png"
            : "https://yourgameurl.com/thumbnail.png";

        socialPlatforms.forEach((platform, i) => {
            const x = startX + i * (buttonSize + spacing);
            const btn = this.add.image(x, socialY, platform.key)
                .setDisplaySize(buttonSize, buttonSize)
                .setInteractive({ useHandCursor: true })
                .setDepth(10)
                .setTint(0xffffff); // Make the button white

            btn.on('pointerdown', () => {
                window.open(platform.url(badgeImageUrl), '_blank');
            });
            // No pop/scale effect on hover
        });



        // Button to return to main menu or restart
        const button = ButtonFactory.createButton(
            this,
            "PLAY AGAIN",
            () => {
                this.scene.start('Boot');
            },
            this.cameras.main.centerX,
            this.cameras.main.height - 120,
            { depth: 10 }
        );
        button.setInteractive()
            .on('pointerover', () => button.setScale(1.1))
            .on('pointerout', () => button.setScale(1));
    }
}
