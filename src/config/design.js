// Unified design configuration file for both Easy and Hard modes

// Common settings shared by all modes
const COMMON = {
  OUTLINE_WIDTH: 4,
  BUTTON_OUTLINE_WIDTH: 2,
  CORNER_RADIUS: 40,
  BUTTON_CORNER_RADIUS: 10,
  buttonWidth: 100,
  buttonHeight: 40,
  buttonSpacing: 40,
  PROGRESS_BAR: {
    INITIAL: 50,
    INCREMENT: 5,
    DECREMENT: 5,
    GREEN: 0x00cc00,
    YELLOW: 0xffd866,
    RED: 0xff0000
  }
};

// Easy mode specific settings
const EASY = {
  COLORS_HEX: {
    BACKGROUND: 0x13091e,
    BOXOUTLINE: 0x81d4fa,
    BLUE_BACKGROUND: 0x2a1646,
    MIDPURPLE: 0x7b56a5,
    RED: 0xff5d8f,
    YELLOW: 0xffd866,
    WHITE: 0xffffff,
    BUTTONFILL: 0xD12390,
    BUTTONOVERLAY: 0xe056fd,
  },
  COLORS_TEXT: {
    WHITE: '#ffffff',
    OFFWHITE: '#e0e0e0',
    YELLOW: '#ffd866',
    HIGHLIGHT: '#ffe7aa',
    SUCCESS: '#64d2ba'
  }
};

// Hard mode specific settings
const HARD = {
  COLORS_HEX: {
    BACKGROUND: 0x1a0933,
    BUTTONFILL: 0xD12390,
    BUTTONOVERLAY: 0xe056fd,
    PURPLE: 0x311648,
    LIGHTPINK: 0xE3B6B0,
    TURQUOISE: 0x44C4C4,
    PERIWINKLE: 0x7158e2,
    PINK: 0xD12390,
    MIDPURPLE: 0x9b59b6,
    YELLOW: 0xEBE34D,
    ERROR: 0xFF0000,
    WHITE: 0xFFFFFF,
    BLACK: 0x000000,
    RED: 0xff0000,
    BLUE: 0x00bcd4,
    BLUE_BACKGROUND: 0x0a1b29
  },
  COLORS_TEXT: {
    BACKGROUND: '#1a0933',
    BUTTONFILL: "#D12390",
    BUTTONOVERLAY: '#e056fd',
    PURPLE: '#311648',
    LIGHTPINK: '#E3B6B0',
    TURQUOISE: '#44C4C4',
    PERIWINKLE: '#7158e2',
    PINK: '#D12390',
    MIDPURPLE: '#9b59b6',
    YELLOW: '#EBE34D',
    ERROR: '#FF0000',
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    RED: '#ff0000',
    BLUE: '#00bcd4',
    BLUE_BACKGROUND: "#0a1b29"
  }
};

// Function to get the design config for a specific mode
export function getDesign(mode = 'easy') {
  const modeConfig = mode === 'easy' ? EASY : HARD;
  
  // Merge common settings with mode-specific settings
  return {
    ...COMMON,
    ...modeConfig
  };
}

// Export individual constants and objects for backward compatibility
export const OUTLINE_WIDTH = COMMON.OUTLINE_WIDTH;
export const BUTTON_OUTLINE_WIDTH = COMMON.BUTTON_OUTLINE_WIDTH;
export const CORNER_RADIUS = COMMON.CORNER_RADIUS;
export const BUTTON_CORNER_RADIUS = COMMON.BUTTON_CORNER_RADIUS;
export const buttonWidth = COMMON.buttonWidth;
export const buttonHeight = COMMON.buttonHeight;
export const buttonSpacing = COMMON.buttonSpacing;
export const PROGRESS_BAR = COMMON.PROGRESS_BAR;

// Export complete configurations for easy and hard modes
export const EASY_CONFIG = { ...COMMON, ...EASY };
export const HARD_CONFIG = { ...COMMON, ...HARD };

// Export color configurations for each mode for direct imports
export const EASY_COLORS_HEX = EASY.COLORS_HEX;
export const EASY_COLORS_TEXT = EASY.COLORS_TEXT;
export const HARD_COLORS_HEX = HARD.COLORS_HEX;
export const HARD_COLORS_TEXT = HARD.COLORS_TEXT;
