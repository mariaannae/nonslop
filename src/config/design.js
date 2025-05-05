// Unified design configuration file for both Easy and Hard modes

// Our color palette
const palette_16 = {
  background_darkest: 0x00060f, //almost_black
  background_darker: 0x03062D,//dark purple
  background_darkish: 0x170548, //less dark purple
  background_mid: 0x3d3648,//mid purple
  secondark_dark: 0x7a0782, //magenta
  secondary: 0x9e0e77,//pink
  secondary_mid: 0xb91255,// reddish pink
  secondary_red: 0xd71a27,//orangish red
  secondary_dark_orange: 0xf35a23, //orange
  secondary_orange: 0xf8ac3a, //lightorange
  teal: 0x56d0ae,//teal
  highlights_yellow: 0xfbf056,//yellow
  highlights_greenish: 0xdaff77,//light green
  highlights_green: 0xbfff95,//green
  highlights_light_green: 0xb4ffae,//light green
  light_green: 0xcdffda,//lighter green
  lightest_green: 0xebfff7,//lightest green
 
};

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
    GREEN: palette_16.highlights_green,
    YELLOW: palette_16.highlights_yellow,
    RED: palette_16.secondary_red
  }
};

// Easy mode specific settings
const EASY = {
  COLORS_HEX: {
    BACKGROUND: palette_16.background_darkest,
    BOXOUTLINE: palette_16.secondary_dark_orange,
    BLUE_BACKGROUND: palette_16.background_darker,
    MIDPURPLE: palette_16.background_mid,
    RED: palette_16.secondary_red,
    YELLOW: palette_16.highlights_yellow,
    WHITE: palette_16.lightest_green,
    BUTTONFILL: palette_16.secondary,
    BUTTONOVERLAY: palette_16.secondary_mid,
  },
  COLORS_TEXT: {
    WHITE: '#' + palette_16.lightest_green.toString(16).padStart(6, '0'),
    OFFWHITE: '#' + palette_16.light_green.toString(16).padStart(6, '0'),
    YELLOW: '#' + palette_16.highlights_yellow.toString(16).padStart(6, '0'),
    HIGHLIGHT: '#' + palette_16.highlights_greenish.toString(16).padStart(6, '0'),
    SUCCESS: '#' + palette_16.highlights_green.toString(16).padStart(6, '0')
  }
};

// Hard mode specific settings
const HARD = {
  COLORS_HEX: {
    BACKGROUND: palette_16.background_darkest,
    BUTTONFILL: palette_16.secondary,
    BUTTONOVERLAY: palette_16.secondary_mid,
    PURPLE: palette_16.background_darkish,
    LIGHTPINK: palette_16.secondary_orange,
    TURQUOISE: palette_16.highlights_light_green,
    PERIWINKLE: palette_16.secondark_dark,
    PINK: palette_16.secondary,
    MIDPURPLE: palette_16.background_mid,
    YELLOW: palette_16.highlights_yellow,
    ERROR: palette_16.secondary_red,
    WHITE: palette_16.lightest_green,
    BLACK: palette_16.background_darkest,
    RED: palette_16.secondary_red,
    BLUE: palette_16.highlights_greenish,
    BLUE_BACKGROUND: palette_16.background_darker,
    SLIDER_HANDLE: palette_16.secondary_orange,
  },
  COLORS_TEXT: {
    BACKGROUND: '#' + palette_16.background_darkest.toString(16).padStart(6, '0'),
    BUTTONFILL: '#' + palette_16.secondary.toString(16).padStart(6, '0'),
    BUTTONOVERLAY: '#' + palette_16.secondary_mid.toString(16).padStart(6, '0'),
    PURPLE: '#' + palette_16.background_darkish.toString(16).padStart(6, '0'),
    LIGHTPINK: '#' + palette_16.secondary_orange.toString(16).padStart(6, '0'),
    TURQUOISE: '#' + palette_16.highlights_light_green.toString(16).padStart(6, '0'),
    PERIWINKLE: '#' + palette_16.secondark_dark.toString(16).padStart(6, '0'),
    PINK: '#' + palette_16.secondary.toString(16).padStart(6, '0'),
    MIDPURPLE: '#' + palette_16.background_mid.toString(16).padStart(6, '0'),
    YELLOW: '#' + palette_16.highlights_yellow.toString(16).padStart(6, '0'),
    ERROR: '#' + palette_16.secondary_red.toString(16).padStart(6, '0'),
    WHITE: '#' + palette_16.lightest_green.toString(16).padStart(6, '0'),
    BLACK: '#' + palette_16.background_darkest.toString(16).padStart(6, '0'),
    RED: '#' + palette_16.secondary_red.toString(16).padStart(6, '0'),
    BLUE: '#' + palette_16.highlights_greenish.toString(16).padStart(6, '0'),
    BLUE_BACKGROUND: '#' + palette_16.background_darker.toString(16).padStart(6, '0')
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

export const cursorColor = '#' + palette_16.background_darkest.toString(16).padStart(6, '0');
export const autocompleteColor = '#' + palette_16.secondary_red.toString(16).padStart(6, '0');
export const inputColor = '#' + palette_16.background_darkest.toString(16).padStart(6, '0');

export const toggleWidth = 40;
export const toggleHeight = 12;

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
