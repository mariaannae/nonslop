import { THEMES, EASY_COLORS_HEX, EASY_COLORS_TEXT, HARD_COLORS_HEX, HARD_COLORS_TEXT } from "../config/design.js";
import { createBackground } from "../backgrounds/createBackground.js";

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
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

  create() {
    // Use global UI scale for all elements
    this.uiScale = this.registry.get('uiScale') || 1;

    // Background
    if (this.mode === "easy") {
      createBackground(this, THEMES.easy.background, this.levelValue);
    } else {
      createBackground(this, THEMES.hard.background, this.levelValue);
    }

    // Heading
    const isMobile = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent) || window.innerWidth <= 900;
    const fontSize = (isMobile ? 60 : 100) * this.uiScale;
    // Move the title down a little (from 70 to 110)
    const titleY = 110 * this.uiScale;
    const titleText = this.add.text(
      this.cameras.main.centerX,
      titleY,
      '(CONGRATULATIONS)',
      {
        fontFamily: 'barcade3d',
        fontSize: `${fontSize}px`,
        color: this.COLORS_TEXT.TITLE,
        align: 'center',
        shadow: { offsetX: 2 * this.uiScale, offsetY: 2 * this.uiScale, color: '#000', blur: 2 * this.uiScale, fill: true }
      }
    ).setOrigin(0.5);

    // Subtitle: move up a little (reduce gap)
    const subtitleY = titleText.y + titleText.height + ((isMobile ? 8 : 16) * this.uiScale);
    const subtitleWidth = isMobile ? this.cameras.main.width * 0.85 : undefined;
    const subtitleText = this.add.text(
      this.cameras.main.centerX,
      subtitleY,
      "This conversation can serve no purpose anymore. Goodbye.",
      {
        fontFamily: "IBM Plex Mono",
        fontSize: `${32 * this.uiScale}px`,
        color: this.COLORS_TEXT.PRIMARY,
        align: "center",
        wordWrap: subtitleWidth ? { width: subtitleWidth } : undefined
      }
    ).setOrigin(0.5, 0);

    // Badge placement
    // Pick a random number 1-12 inclusive
    const badgeNum = Math.floor(Math.random() * 12) + 1;
    const badgeKey = `badge_${badgeNum}_${this.mode}_${this.score}`;
    // Place badge further below subtitle than subtitle is below title
    const subtitleToTitleGap = subtitleText.y - (titleText.y + titleText.height);
    const badgeY = subtitleText.y + subtitleText.height + Math.max(subtitleToTitleGap, 32 * this.uiScale) * 2;
    // Add badge image
    const badge = this.add.image(
      this.cameras.main.centerX,
      badgeY,
      badgeKey
    ).setOrigin(0.5, 0);
    // Scale badge to 1/4 of canvas height
    const desiredHeight = this.cameras.main.height / 4;
    if (badge.height > 0) {
      const scale = desiredHeight / badge.height;
      badge.setScale(scale);
    } else {
      // If not loaded yet, set scale after texture loads
      badge.once('texturekeychange', () => {
        const scale = desiredHeight / badge.height;
        badge.setScale(scale);
      });
    }

    // Add "Celebrate adequacy.\nPublicly:" text below the badge, same gap as badge below subtitle
    const badgeGap = Math.max(subtitleToTitleGap, 32 * this.uiScale) * 2;
    const celebrateY = badge.y + badge.displayHeight + badgeGap;
    this.add.text(
      this.cameras.main.centerX,
      celebrateY,
      "Celebrate adequacy.\nPublicly:",
      {
        fontFamily: "IBM Plex Mono",
        fontSize: `${26 * this.uiScale}px`,
        color: this.COLORS_TEXT.PRIMARY,
        align: "center"
      }
    ).setOrigin(0.5, 0);
  }
}
