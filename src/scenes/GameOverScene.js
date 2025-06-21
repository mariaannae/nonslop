import { THEMES, EASY_COLORS_HEX, EASY_COLORS_TEXT, HARD_COLORS_HEX, HARD_COLORS_TEXT } from "../config/design.js";
import { createBackground } from "../backgrounds/createBackground.js";
import { ScalingManager } from "../config/scaling.js";
import { getTextStyle } from "../config/textStyles.js";
import { detectDeviceType } from "../config/dimensions.js";

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
    // Initialize scaling manager
    this.scalingManager = new ScalingManager(this);
    
    // Use global UI scale for all elements
    this.uiScale = this.registry.get('uiScale') || 1;
    
    // Get device type
    this.deviceType = detectDeviceType();

    // Background
    if (this.mode === "easy") {
      createBackground(this, THEMES.easy.background, this.levelValue);
    } else {
      createBackground(this, THEMES.hard.background, this.levelValue);
    }

    // Heading - using consistent scaling patterns from Preloader
    const titleY = this.scalingManager.heightPercent(15);
    const titleStyle = getTextStyle('title', this.deviceType, this.mode, this.uiScale);
    titleStyle.align = 'center';
    
    const titleText = this.add.text(
      this.scalingManager.centerX(),
      titleY,
      '(CONGRATULATIONS)',
      titleStyle
    ).setOrigin(0.5);

    // Subtitle with proper spacing using ScalingManager
    const subtitleY = titleText.y + titleText.height + this.scalingManager.scaleValue(16);
    const subtitleStyle = getTextStyle('prompt', this.deviceType, this.mode, this.uiScale);
    subtitleStyle.align = 'center';
    subtitleStyle.wordWrap = { width: this.scalingManager.widthPercent(85) };
    
    const subtitleText = this.add.text(
      this.scalingManager.centerX(),
      subtitleY,
      "This conversation can serve no purpose anymore. Goodbye.",
      subtitleStyle
    ).setOrigin(0.5, 0);

    // Badge placement - using ScalingManager for consistent sizing
    // Pick a random number 1-12 inclusive
    const badgeNum = Math.floor(Math.random() * 12) + 1;
    const badgeKey = `badge_${badgeNum}_${this.mode}_${this.score}`;
    
    // Use scaling manager for consistent spacing
    const badgeY = subtitleText.y + subtitleText.displayHeight + this.scalingManager.scaleValue(64);
    
    // Add badge image
    const badge = this.add.image(
      this.scalingManager.centerX(),
      badgeY,
      badgeKey
    ).setOrigin(0.5, 0);
    
    // Scale badge using ScalingManager approach - consistent with other scenes
    // Use heightPercent for responsive badge sizing instead of hardcoded fraction
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

    // Add "Celebrate adequacy.\nPublicly:" text below the badge using ScalingManager
    const celebrateY = badge.y + badge.displayHeight + this.scalingManager.scaleValue(64);
    const celebrateStyle = getTextStyle('prompt', this.deviceType, this.mode, this.uiScale);
    celebrateStyle.align = 'center';
    
    this.add.text(
      this.scalingManager.centerX(),
      celebrateY,
      "Celebrate adequacy.\nPublicly:",
      celebrateStyle
    ).setOrigin(0.5, 0);
  }
}
