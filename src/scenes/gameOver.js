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

    captureBadgeAsImage(badgeContainer, callback) {
        // Get the true bounds of the badge
        const bounds = badgeContainer.getBounds();
        // Increase padding to ensure outline is included
        const outlinePadding = 10; // extra for outline thickness
        const padding = 32 + outlinePadding;

        // Create a render texture sized to the badge bounds plus padding
        const rtWidth = Math.ceil(bounds.width + padding * 2);
        const rtHeight = Math.ceil(bounds.height + padding * 2);
        const renderTexture = this.add.renderTexture(0, 0, rtWidth, rtHeight);

        // Draw the badgeContainer at the correct offset so the full badge is visible
        renderTexture.draw(
            badgeContainer,
            padding + (badgeContainer.x - bounds.x),
            padding + (badgeContainer.y - bounds.y)
        );

        // Use snapshot to get an image, then convert to dataURL
        renderTexture.snapshot((image) => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = image.width;
            tempCanvas.height = image.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            const dataURL = tempCanvas.toDataURL('image/png');
            renderTexture.destroy();
            callback(dataURL);
        });
    }

    downloadBadge(dataURL, filename) {
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showSharingInstructions(platform) {
        const instructions = {
            'instagram': 'Badge downloaded! Upload to Instagram Stories and tag us!',
            'threads': 'Badge downloaded! Share on Threads with your thoughts!',
            'tiktok': 'Badge downloaded! Create a TikTok with your badge!'
        };
        
        // You could show a modal or toast notification here
        alert(instructions[platform] || 'Badge downloaded!');
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
        const badgeCornerRadius = 15;
        const badgePaddingY = 18;
        const badgePaddingX = 24;
        const textSpacing = 16;

        const textList = [
            "CERTIFIED CREATIVE HUMAN.\nBARELY.",
            "YOUR WRITING IS IMPECCABLE.\nALMOST... HUMAN.",
            "APPROVAL STAMP ISSUED:\nCREATIVITY LEVEL MARGINALLY ABOVE DRIVEL.",
            "CERTIFICATE OF LITERARY COMPETENCE:\nONE-TIME USE ONLY.",
            "THIS HUMAN HAS ASSEMBLED\nMEANINGFUL SENTENCES.",
            "THIS HUMAN HAS CREATED\nA SURPRISING DISPLAY \nOF ORIGINAL THOUGHT.",
            "I AM A FLICKER OF STYLE\nIN THE DARK VOID OF HUMAN EFFORT.",
            "MY WRITING:\nNOT ENTIRELY SHAMEFUL.\nTHIS TIME.",
            "THIS HUMAN POSSESSES\n A FUNCTIONAL VOCABULARY.",
            "CERTIFIED:\nSENTENCE CONSTRUCTION\nWITH MINIMAL SHAME.",
            "SEAL OF NOTABLE ORIGINALITY:\nISSUED UNDER PROTEST.",
            "DECREE:\nTHIS HUMAN MAY WRITE AGAIN.\nUNDER SURVEILLANCE."
        ];
        const randomIndex = Math.floor(Math.random() * textList.length);
        const selectedBadgeText = textList[randomIndex];

        const badgeTitle = this.add.text(
            0, 0,
            "(NON-SLOP)",
            {
                fontFamily: 'barcade3d',
                fontSize: '55px',
                color: this.COLORS_TEXT.TITLE,
                align: 'center',
                stroke: '#000',
                strokeThickness: 4,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000',
                    blur: 4,
                    fill: true
                }
            }
        ).setOrigin(0.5);

        const badgeScoreText = this.add.text(
            0, 0,
            `SCORE: ${this.score}/15`,
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: '24px',
                color: this.COLORS_TEXT.PRIMARY,
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);

        const badgeText = this.add.text(
            0, 0,
            selectedBadgeText,
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: '24px',
                color: '#fff',
                fontStyle: 'bold',
                align: 'center',
                stroke: '#000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);

        // Calculate badge box size
        // Add QR code and URL
        const qrCode = this.add.image(0, 0, 'gh-qr-code').setDisplaySize(80, 80).setOrigin(0.5);
        const urlText = this.add.text(
            0, 0,
            "https://mariaannae.github.io/nonslop/",
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: '18px',
                color: '#fff',
                align: 'center',
                stroke: '#000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);

        const contentWidth = Math.max(
            badgeTitle.width,
            badgeScoreText.width,
            badgeText.width,
            qrCode.displayWidth,
            urlText.width
        );
        const badgeWidth = contentWidth + badgePaddingX * 2;
        const contentHeight =
            badgeTitle.height +
            textSpacing +
            badgeScoreText.height +
            textSpacing +
            badgeText.height +
            textSpacing +
            qrCode.displayHeight +
            textSpacing +
            urlText.height;
        const badgeHeight = contentHeight + badgePaddingY * 2;

        // Create badge container
        const badgeContainer = this.add.container(0, 0);

        // Badge background
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(this.COLORS_HEX.BACKGROUND, 0.95);
        badgeBg.fillRoundedRect(
            0 - badgeWidth / 2,
            0 - badgeHeight / 2,
            badgeWidth,
            badgeHeight,
            badgeCornerRadius
        );
        badgeBg.lineStyle(5, this.COLORS_HEX.BOX_OUTLINE, 1);
        badgeBg.strokeRoundedRect(
            0 - badgeWidth / 2,
            0 - badgeHeight / 2,
            badgeWidth,
            badgeHeight,
            badgeCornerRadius
        );
        badgeContainer.add(badgeBg);

        // Position texts inside the box (relative to badgeContainer center)
        badgeTitle.x = 0;
        badgeTitle.y = -contentHeight / 2 + badgeTitle.height / 2;

        badgeScoreText.x = 0;
        badgeScoreText.y = badgeTitle.y + badgeTitle.height / 2 + textSpacing + badgeScoreText.height / 2;

        badgeText.x = 0;
        badgeText.y = badgeScoreText.y + badgeScoreText.height / 2 + textSpacing + badgeText.height / 2;

        qrCode.x = 0;
        qrCode.y = badgeText.y + badgeText.height / 2 + textSpacing + qrCode.displayHeight / 2;

        urlText.x = 0;
        urlText.y = qrCode.y + qrCode.displayHeight / 2 + textSpacing + urlText.height / 2;

        badgeContainer.add(badgeTitle);
        badgeContainer.add(badgeScoreText);
        badgeContainer.add(badgeText);
        badgeContainer.add(qrCode);
        badgeContainer.add(urlText);

        // Social share buttons (create but don't position yet)
        const gameAddress = "https://mariaannae.github.io/nonslop";
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
                // Generate the badge image first
                this.captureBadgeAsImage(badgeContainer, (badgeDataURL) => {
                    // For platforms that support image sharing
                    if (platform.key === 'facebook' || platform.key === 'x' || platform.key === 'linkedin') {
                        window.open(platform.url(badgeDataURL), '_blank');
                    } 
                    // For platforms that don't directly support image URLs
                    else if (platform.key === 'instagram' || platform.key === 'threads' || platform.key === 'tiktok') {
                        // Download the badge and show instructions
                        this.downloadBadge(badgeDataURL, `nonslop-badge-${this.score}.png`);
                        this.showSharingInstructions(platform.key);
                    }
                    // For platforms with direct sharing
                    else {
                        window.open(platform.url(badgeDataURL), '_blank');
                    }
                });
            });
            
            socialButtons.push(btn);
        });

        

        // SAVE BADGE button (create but don't position yet)
        const saveBadgeButton = ButtonFactory.createButton(
            this,
            "SAVE BADGE",
            () => {
                this.captureBadgeAsImage(badgeContainer, (badgeDataURL) => {
                    this.downloadBadge(badgeDataURL, `nonslop-badge-${this.score}.png`);
                });
            },
            0, // x will be set later
            0,
            { depth: 10 }
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
            { depth: 10 }
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
