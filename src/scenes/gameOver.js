import { DESIGN, EASY_COLORS_HEX, EASY_COLORS_TEXT, HARD_COLORS_HEX, HARD_COLORS_TEXT, THEMES } from "../config/design.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import { createBackground } from "../backgrounds/createBackground.js";
import { ScalingManager } from "../config/scaling.js";

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
            fixedWidth: this.cameras.main.width * 0.8,
            wordWrap: { width: this.cameras.main.width * 0.8 }
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
        // Responsive scaling for non-button elements
        this.scalingManager = new ScalingManager(this);

        // Set background based on mode and level
        if (this.mode === "easy") {
            createBackground(this, THEMES.easy.background, this.levelValue);
        } else {
            createBackground(this, THEMES.hard.background, this.levelValue);
        }

        // --- EVEN VERTICAL SPACING REFACTOR ---

        // 1. Create all elements at (0,0) or with temporary y, measure heights

        // Determine if device is mobile/tablet
        const isMobile = this.scalingManager.deviceType === "phone" || this.scalingManager.deviceType === "tablet";

        // Title
        const winText = this.add.text(
            this.cameras.main.centerX,
            0,
            "(CONGRATULATIONS)",
            {
                fontFamily: 'barcade3d',
                fontSize: isMobile ? `${this.scalingManager.scaleText(60)}px` : '80px',
                color: this.COLORS_TEXT.TITLE,
                align: 'center',
                stroke: '#000',
                strokeThickness: isMobile ? this.scalingManager.scaleValue(8) : 8,
                shadow: {
                    offsetX: isMobile ? this.scalingManager.scaleValue(4) : 4,
                    offsetY: isMobile ? this.scalingManager.scaleValue(4) : 4,
                    color: '#000',
                    blur: isMobile ? this.scalingManager.scaleValue(8) : 8,
                    fill: true
                },
                fixedWidth: isMobile ? this.cameras.main.width * 0.9 : undefined,
                wordWrap: isMobile ? { width: this.cameras.main.width * 0.9 } : undefined
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
                fontSize: isMobile ? `${this.scalingManager.scaleText(32)}px` : '32px',
                color: this.COLORS_TEXT.PRIMARY,
                align: 'center',
                fixedWidth: isMobile ? this.cameras.main.width * 0.9 : undefined,
                wordWrap: isMobile ? { width: this.cameras.main.width * 0.9 } : undefined
            }
        ).setOrigin(0.5);

        // Badge
        const textSpacing = isMobile ? this.scalingManager.scaleValue(16) : 16;

        // Randomly select a badge index (0-11)
        this.currentBadgeIndex = Math.floor(Math.random() * 12);
        
        // Load the pre-generated badge image
        const badgeKey = this.getBadgeKey();
        const badge = this.add.image(0, 0, badgeKey).setOrigin(0.5);

        // Set uniform badge height (reduce by 20px from original)
        const maxBadgeWidth = isMobile ? this.cameras.main.width * 0.6 : undefined;
        const maxBadgeHeight = isMobile ? this.cameras.main.height * 0.25 : undefined;
        const ORIGINAL_BADGE_HEIGHT = badge.displayHeight;
        let BADGE_TARGET_HEIGHT = isMobile ? this.scalingManager.scaleValue(ORIGINAL_BADGE_HEIGHT - 100) : (ORIGINAL_BADGE_HEIGHT - 100);
        if (isMobile && BADGE_TARGET_HEIGHT > maxBadgeHeight) BADGE_TARGET_HEIGHT = maxBadgeHeight;
        // Maintain aspect ratio: set height, then if width is too large, set width and let height auto-adjust
        badge.displayHeight = BADGE_TARGET_HEIGHT;
        if (isMobile && badge.displayWidth > maxBadgeWidth) {
            badge.displayWidth = maxBadgeWidth;
            // Do NOT set displayHeight again; let Phaser auto-scale height to preserve aspect ratio
        }
        // This ensures the badge is never distorted on mobile

        // Create badge container and add badge
        const badgeContainer = this.add.container(0, 0);
        badgeContainer.add(badge);

        // Get badge dimensions for layout
        const badgeHeight = badge.displayHeight;

        // Social share buttons (create but don't position yet)
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

const buttonSize = DESIGN.UI.BUTTON.WIDTH;
        const spacing = isMobile ? this.scalingManager.scaleValue(24) : 24;
const totalWidth = socialPlatforms.length * buttonSize + (socialPlatforms.length - 1) * spacing;
const startX = this.cameras.main.centerX - totalWidth / 2 + buttonSize / 2;

        const badgeImageUrl = window.location.origin
            ? window.location.origin + "/thumbnail.png"
            : gameAddress + '/thumbnail.png';

        // Create social buttons, store in array for later positioning
        const socialButtons = [];
        // Tooltip text for accessibility and UX
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

        socialPlatforms.forEach((platform, i) => {
            const btn = this.add.image(0, 0, platform.key)
                .setDisplaySize(buttonSize, buttonSize)
                .setInteractive({ useHandCursor: true })
                .setDepth(10)
                .setTint(0xffffff);

            // Tooltip logic
            let tooltip = null;
            btn.on('pointerover', () => {
                tooltip = this.add.text(
                    btn.x,
                    btn.y - buttonSize / 2 - (isMobile ? this.scalingManager.scaleValue(18) : 18),
                    platformTooltips[platform.key] || platform.key,
                    {
                        fontFamily: 'IBM Plex Mono',
                        fontSize: isMobile ? `${this.scalingManager.scaleText(20)}px` : '20px',
                        color: '#fff',
                        backgroundColor: '#222',
                        padding: { x: isMobile ? this.scalingManager.scaleValue(12) : 12, y: isMobile ? this.scalingManager.scaleValue(6) : 6 },
                        align: 'center',
                        stroke: '#000',
                        strokeThickness: isMobile ? this.scalingManager.scaleValue(3) : 3
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

            // For accessibility: add a custom property for aria-label (if using custom accessibility system)
            btn.ariaLabel = platformTooltips[platform.key] || platform.key;

            socialButtons.push(btn);
        });

        

        // SAVE BADGE button (create but don't position yet)
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

        // 3. Create "Celebrate adequacy.\nPublicly:" and COPY LINK button (but don't position yet)
        const celebrateText = this.add.text(
            this.cameras.main.centerX,
            0,
            "Celebrate adequacy.\nPublicly:",
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: isMobile ? `${this.scalingManager.scaleText(26)}px` : '26px',
                color: this.COLORS_TEXT.PRIMARY,
                align: 'center',
                fixedWidth: isMobile ? this.cameras.main.width * 0.9 : undefined,
                wordWrap: isMobile ? { width: this.cameras.main.width * 0.9 } : undefined
            }
        ).setOrigin(0.5);

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
            this.cameras.main.centerX,
            0,
            { 
                depth: 10,
                width: DESIGN.UI.BUTTON.WIDTH,
                height: DESIGN.UI.BUTTON.HEIGHT
            }
        );
        copyLinkButton.setInteractive()
            .on('pointerover', () => copyLinkButton.setScale(1.1))
            .on('pointerout', () => copyLinkButton.setScale(1));

        // 4. Calculate total content height and gap, including all vertical elements
        const elements = [
            { obj: winText, height: winText.height },
            { obj: subText, height: subText.height },
            { obj: badgeContainer, height: badgeHeight },
            { obj: celebrateText, height: celebrateText.height },
            { obj: copyLinkButton, height: copyLinkButton.height },
            { obj: null, height: buttonSize }, // social row
            { obj: null, height: Math.max(playAgainButton.height, saveBadgeButton.height) }
        ];

        const totalContentHeight =
            elements.reduce((sum, el) => sum + el.height, 0);

        const screenHeight = this.cameras.main.height;
        const topMargin = isMobile ? this.scalingManager.scaleValue(40) : 40;
        const bottomMargin = isMobile ? this.scalingManager.scaleValue(40) : 40;
        const availableHeight = screenHeight - topMargin - bottomMargin;
        let gap = (availableHeight - totalContentHeight) / (elements.length - 1);

        // --- MOBILE OVERFLOW FIX: SCALE DOWN IF NEEDED ---
        let scaleFactor = 1;
        if (isMobile && totalContentHeight + (elements.length - 1) * gap > availableHeight) {
            // Calculate scale factor so everything fits, allow as small as needed (but not zero)
            scaleFactor = availableHeight / (totalContentHeight + (elements.length - 1) * gap);
            scaleFactor = Math.max(scaleFactor, 0.1);
        }

        // 5. Position elements vertically with even spacing, scaling if needed

        // Move badge up slightly (e.g., 32px)
        let badgeUpOffset = isMobile ? this.scalingManager.scaleValue(32) : 32;
        // Move celebrateText up (closer to badge) (e.g., 24px)
        let celebrateUpOffset = isMobile ? this.scalingManager.scaleValue(24) : 24;

        // Apply scale to offsets if scaling
        badgeUpOffset *= scaleFactor;
        celebrateUpOffset *= scaleFactor;

        // Scale element heights for positioning
        const scaledElements = elements.map(el => ({
            ...el,
            height: el.height * scaleFactor
        }));

        let currentY = topMargin + scaledElements[0].height / 2;
        // Title
        winText.y = currentY;
        winText.x = this.cameras.main.centerX;
        winText.setScale(winText.scaleX * scaleFactor, winText.scaleY * scaleFactor);

        // Pop effect (delayed so width is correct)
        this.time.delayedCall(10, () => {
            const screenWidth = this.cameras.main.width;
            const targetWidth = (7 / 8) * screenWidth;
            const baseWidth = winText.width;
            const targetScale = (targetWidth / baseWidth) * scaleFactor;
            this.tweens.add({
                targets: winText,
                scale: targetScale,
                duration: 350,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: winText,
                        scale: scaleFactor,
                        duration: 350,
                        ease: 'Back.easeIn'
                    });
                }
            });
        });

        // Subtext
        currentY += scaledElements[0].height / 2 + gap * scaleFactor + scaledElements[1].height / 2;
        subText.y = currentY;
        subText.x = this.cameras.main.centerX;
        subText.setScale(subText.scaleX * scaleFactor, subText.scaleY * scaleFactor);

        // Badge (move up by badgeUpOffset)
        currentY += scaledElements[1].height / 2 + gap * scaleFactor + scaledElements[2].height / 2 - badgeUpOffset;
        badgeContainer.x = this.cameras.main.centerX;
        badgeContainer.y = currentY;
        badgeContainer.setScale(scaleFactor);

        // Celebrate text (move up by celebrateUpOffset)
        currentY += scaledElements[2].height / 2 + gap * scaleFactor + scaledElements[3].height / 2 - celebrateUpOffset;
        celebrateText.y = currentY;
        celebrateText.x = this.cameras.main.centerX;
        celebrateText.setScale(celebrateText.scaleX * scaleFactor, celebrateText.scaleY * scaleFactor);

        // Move copyLinkButton up closer to celebrateText (e.g., 24px)
        let copyLinkUpOffset = isMobile ? this.scalingManager.scaleValue(24) : 0;
        copyLinkUpOffset *= scaleFactor;

        // Position copyLinkButton closer to celebrateText
        currentY += scaledElements[3].height / 2 + gap * scaleFactor + scaledElements[4].height / 2 - copyLinkUpOffset;
        copyLinkButton.y = currentY;
        copyLinkButton.x = this.cameras.main.centerX;
        copyLinkButton.setScale(copyLinkButton.scaleX * scaleFactor, copyLinkButton.scaleY * scaleFactor);

        // Now, evenly distribute the elements below copyLinkButton:
        // These are: social row, playAgainButton/saveBadgeButton
        const elementsBelow = [
            { obj: null, height: buttonSize * scaleFactor }, // social row
            { obj: null, height: Math.max(playAgainButton.height, saveBadgeButton.height) * scaleFactor }
        ];

        const bottomY = screenHeight - bottomMargin;
        const usedY = currentY + scaledElements[4].height / 2;
        const belowContentHeight = elementsBelow.reduce((sum, el) => sum + el.height, 0);
        const belowGap = (bottomY - usedY - belowContentHeight) / (elementsBelow.length);

        let belowY = usedY + belowGap + elementsBelow[0].height / 2;

        // Social row (MOBILE: two lines, same size, no tweens/effects)
        if (isMobile) {
            // Remove any scale effects from previous layout
            socialButtons.forEach(btn => btn.setScale(1));

            // Split into two rows: 5 on first, 4 on second
            const firstRowCount = 5;
            const secondRowCount = socialButtons.length - firstRowCount;
            const rowSpacing = this.scalingManager.scaleValue(18) * scaleFactor;
            const row1Y = belowY - (buttonSize / 2 + rowSpacing / 2);
            const row2Y = belowY + (buttonSize / 2 + rowSpacing / 2);

            // Center both rows
            const row1TotalWidth = firstRowCount * buttonSize + (firstRowCount - 1) * spacing;
            const row2TotalWidth = secondRowCount * buttonSize + (secondRowCount - 1) * spacing;
            const row1StartX = this.cameras.main.centerX - row1TotalWidth / 2 + buttonSize / 2;
            const row2StartX = this.cameras.main.centerX - row2TotalWidth / 2 + buttonSize / 2;

            socialButtons.forEach((btn, i) => {
                if (i < firstRowCount) {
                    btn.x = row1StartX + i * (buttonSize + spacing);
                    btn.y = row1Y;
                } else {
                    btn.x = row2StartX + (i - firstRowCount) * (buttonSize + spacing);
                    btn.y = row2Y;
                }
                btn.setScale(1); // Ensure all are the same size
            });
        } else {
            // Desktop/tablet: single row, scaled as before
            socialButtons.forEach((btn, i) => {
                btn.x = startX + i * (buttonSize + spacing) * scaleFactor;
                btn.y = belowY;
                btn.setScale(scaleFactor);
            });
        }

        // Play Again and Save Badge buttons
        belowY += elementsBelow[0].height / 2 + belowGap + elementsBelow[1].height / 2;
        const buttonSpacing = (isMobile ? this.scalingManager.scaleValue(32) : 32) * scaleFactor;
        const totalButtonWidth = (playAgainButton.width + saveBadgeButton.width) * scaleFactor + buttonSpacing;
        playAgainButton.x = this.cameras.main.centerX + (totalButtonWidth / 2 - playAgainButton.width * scaleFactor / 2);
        saveBadgeButton.x = this.cameras.main.centerX - (totalButtonWidth / 2 - saveBadgeButton.width * scaleFactor / 2);
        playAgainButton.y = belowY;
        saveBadgeButton.y = belowY;
        playAgainButton.setScale(scaleFactor);
        saveBadgeButton.setScale(scaleFactor);

        // --- FINAL SAFETY: If last element is still out of bounds, compress all elements further ---
        if (isMobile) {
            // Find the bottom-most element (playAgainButton or saveBadgeButton)
            const lastY = belowY + Math.max(playAgainButton.height, saveBadgeButton.height) * scaleFactor / 2;
            if (lastY > screenHeight - bottomMargin) {
                // Compute a final compression factor
                const totalHeightUsed = lastY - topMargin;
                const finalScale = (screenHeight - topMargin - bottomMargin) / totalHeightUsed;
                // Apply this final scale to all elements
                [winText, subText, badgeContainer, celebrateText, copyLinkButton, ...socialButtons, playAgainButton, saveBadgeButton].forEach(el => {
                    if (el && el.setScale) {
                        el.setScale(el.scaleX * finalScale, el.scaleY * finalScale);
                    }
                });
                // Re-run vertical positioning with the new scale
                let y = topMargin + (winText.height * winText.scaleY) / 2;
                winText.y = y;
                y += (winText.height * winText.scaleY) / 2 + gap * finalScale + (subText.height * subText.scaleY) / 2;
                subText.y = y;
                y += (subText.height * subText.scaleY) / 2 + gap * finalScale + (badgeContainer.height * badgeContainer.scaleY) / 2 - badgeUpOffset * finalScale;
                badgeContainer.y = y;
                y += (badgeContainer.height * badgeContainer.scaleY) / 2 + gap * finalScale + (celebrateText.height * celebrateText.scaleY) / 2 - celebrateUpOffset * finalScale;
                celebrateText.y = y;
                y += (celebrateText.height * celebrateText.scaleY) / 2 + gap * finalScale + (copyLinkButton.height * copyLinkButton.scaleY) / 2 - copyLinkUpOffset * finalScale;
                copyLinkButton.y = y;
                // Social row
                y += (copyLinkButton.height * copyLinkButton.scaleY) / 2 + belowGap * finalScale + (buttonSize * scaleFactor * finalScale) / 2;
                socialButtons.forEach((btn, i) => {
                    btn.x = startX + i * (buttonSize + spacing) * scaleFactor * finalScale;
                    btn.y = y;
                });
                // Play Again and Save Badge buttons
                y += (buttonSize * scaleFactor * finalScale) / 2 + belowGap * finalScale + (Math.max(playAgainButton.height, saveBadgeButton.height) * scaleFactor * finalScale) / 2;
                playAgainButton.y = y;
                saveBadgeButton.y = y;
                const totalButtonWidthFinal = (playAgainButton.width + saveBadgeButton.width) * scaleFactor * finalScale + buttonSpacing * finalScale;
                playAgainButton.x = this.cameras.main.centerX + (totalButtonWidthFinal / 2 - playAgainButton.width * scaleFactor * finalScale / 2);
                saveBadgeButton.x = this.cameras.main.centerX - (totalButtonWidthFinal / 2 - saveBadgeButton.width * scaleFactor * finalScale / 2);
            }
        }
        // --- END EVEN VERTICAL SPACING REFACTOR ---
    }
}
