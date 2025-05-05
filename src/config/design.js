// Design configuration file for game modes and UI elements

/**
 * Base color palette with semantic naming
 */
const PALETTE = {
  // Dark theme colors
  BACKGROUND: {
    DARKEST: 0x00060f,    // Almost black
    DARKER: 0x03062D,     // Dark purple
    DARK: 0x170548,       // Less dark purple
    MID: 0x3d0364,        // Mid purple
    // Serene colors for GameSceneEasy
    EASY_DARKEST: 0x001620,    // Deep ocean blue
    EASY_DARKER: 0x002435,     // Midnight ocean
    EASY_DARK: 0x003450,       // Ocean blue
    EASY_MID: 0x004565,        // Teal blue
    // Intense colors for GameSceneHard
    HARD_DARKEST: 0x200025,    // Deep magenta
    HARD_DARKER: 0x400045,     // Rich magenta
    HARD_DARK: 0x600065,       // Vibrant magenta
    HARD_MID: 0x800085,        // Electric magenta
  },
  // Accent colors
  ACCENT: {
    MAGENTA: 0x7a0782,
    PINK: 0x9e0e77,
    PINK_RED: 0xb91255,
    RED: 0xd71a27,
    ORANGE_DARK: 0xf35a23,
    ORANGE_LIGHT: 0xf8ac3a,
  },
  // Special colors
  TEAL: {
    MAIN: 0x00e5ff,    // Brighter teal for easy mode
    DARK: 0x00292a,
    GLOW: 0x00ffff,    // Glowing teal for effects
  },
  MAGENTA: {           // New magenta palette for hard mode
    MAIN: 0xff00ff,
    DARK: 0x800080,
    GLOW: 0xff40ff,
  },
  // Highlight colors
  HIGHLIGHT: {
    YELLOW: 0xfbf056,
    GREEN_LIGHT: 0xdaff77,
    GREEN_YELLOW: 0xbfff95,
    GREEN: 0xb4ffae,
    GREEN_LIGHTER: 0xcdffda,
    GREEN_LIGHTEST: 0xebfff7,
  }
};

/**
 * Utility function to convert hex color to CSS string
 */
const hexToString = (hex) => '#' + hex.toString(16).padStart(6, '0');

/**
 * Common UI element dimensions and properties
 */
const UI = {
  BUTTON: {
    WIDTH: 100,
    HEIGHT: 40,
    SPACING: 40,
    OUTLINE_WIDTH: 2,
    CORNER_RADIUS: 10
  },
  OUTLINE: {
    WIDTH: 4,
    CORNER_RADIUS: 40
  },
  TOGGLE: {
    WIDTH: 40,
    HEIGHT: 12
  },
  PROGRESS_BAR: {
    INITIAL: 50,
    INCREMENT: 5,
    DECREMENT: 5,
    COLORS: {
      SUCCESS: PALETTE.HIGHLIGHT.GREEN,
      WARNING: PALETTE.HIGHLIGHT.YELLOW,
      DANGER: PALETTE.ACCENT.RED
    }
  }
};

/**
 * Basic mode color configuration
 */
const BASIC = {
  COLORS: {
    BACKGROUND: PALETTE.BACKGROUND.DARKER,
    BACKGROUND_LESS_DARK: PALETTE.BACKGROUND.DARK,
    BOX_OUTLINE: PALETTE.TEAL.MAIN,
    BOX_FILL: PALETTE.BACKGROUND.DARKEST,
    BACKGROUND_MID: PALETTE.BACKGROUND.MID,
    BACKGROUND_ALT: PALETTE.TEAL.DARK,
    ACCENT: PALETTE.ACCENT.PINK,
    HIGHLIGHT: PALETTE.HIGHLIGHT.GREEN_LIGHT,
    TEXT: PALETTE.HIGHLIGHT.GREEN_LIGHTEST,
    GREEN: PALETTE.HIGHLIGHT.GREEN,
    BUTTON: {
      FILL: PALETTE.ACCENT.PINK,
      OVERLAY: PALETTE.ACCENT.PINK_RED
    }
  },
  TEXT_COLORS: {
    PRIMARY: hexToString(PALETTE.HIGHLIGHT.GREEN_LIGHTEST),
    SECONDARY: hexToString(PALETTE.TEAL.MAIN),
    HIGHLIGHT: hexToString(PALETTE.HIGHLIGHT.YELLOW),
    ACCENT: hexToString(PALETTE.ACCENT.ORANGE_LIGHT),
    SUCCESS: hexToString(PALETTE.HIGHLIGHT.GREEN_YELLOW),
    ERROR: hexToString(PALETTE.ACCENT.RED),
    DARKEST: hexToString(PALETTE.BACKGROUND.DARKEST)
  }
};

/**
 * Easy mode color configuration
 */
const EASY = {
  COLORS: {
    BACKGROUND: PALETTE.BACKGROUND.EASY_DARKEST,
    BOX_OUTLINE: PALETTE.ACCENT.PINK,
    BACKGROUND_ALT: PALETTE.BACKGROUND.EASY_DARKER,
    BACKGROUND_MID: PALETTE.BACKGROUND.EASY_MID,
    ACCENT: PALETTE.TEAL.MAIN,
    HIGHLIGHT: PALETTE.HIGHLIGHT.YELLOW,
    TEXT: PALETTE.HIGHLIGHT.GREEN_LIGHTEST,
    BUTTON: {
      FILL: PALETTE.ACCENT.PINK,
      OVERLAY: PALETTE.ACCENT.PINK_RED
    }
  },
  TEXT_COLORS: {
    PRIMARY: hexToString(PALETTE.HIGHLIGHT.GREEN_LIGHTEST),
    SECONDARY: hexToString(PALETTE.HIGHLIGHT.GREEN_LIGHTER),
    HIGHLIGHT: hexToString(PALETTE.HIGHLIGHT.YELLOW),
    ACCENT: hexToString(PALETTE.HIGHLIGHT.GREEN_LIGHT),
    SUCCESS: hexToString(PALETTE.HIGHLIGHT.GREEN_YELLOW),
    ERROR: hexToString(PALETTE.ACCENT.RED),
    TITLE: hexToString(PALETTE.HIGHLIGHT.YELLOW),
  }
};

/**
 * Hard mode color configuration
 */
const HARD = {
  COLORS: {
    BACKGROUND: PALETTE.BACKGROUND.HARD_DARKEST,
    BACKGROUND_ALT: PALETTE.BACKGROUND.HARD_DARKER,
    BACKGROUND_MID: PALETTE.BACKGROUND.HARD_MID,
    BOX_OUTLINE: PALETTE.TEAL.MAIN,
    ACCENT: PALETTE.ACCENT.MAGENTA,
    HIGHLIGHT: PALETTE.BACKGROUND.HARD_DARK,
    ERROR: PALETTE.ACCENT.RED,
    TEXT: PALETTE.HIGHLIGHT.GREEN_LIGHTEST,
    BUTTON: {
      FILL: PALETTE.ACCENT.MAGENTA,
      OVERLAY: PALETTE.ACCENT.PINK_RED
    },
    SLIDER: {
      HANDLE: PALETTE.ACCENT.ORANGE_LIGHT
    }
  },
  TEXT_COLORS: {
    PRIMARY: hexToString(PALETTE.HIGHLIGHT.GREEN_LIGHTEST),
    SECONDARY: hexToString(PALETTE.BACKGROUND.DARKEST),
    ACCENT: hexToString(PALETTE.ACCENT.PINK),
    HIGHLIGHT: hexToString(PALETTE.HIGHLIGHT.GREEN_LIGHT),
    ERROR: hexToString(PALETTE.ACCENT.RED),
    BACKGROUND: hexToString(PALETTE.BACKGROUND.DARKER),
    ERROR: hexToString(PALETTE.ACCENT.RED),
    TITLE: hexToString(PALETTE.HIGHLIGHT.YELLOW),
  }
};


// Export consolidated design objects
export const DESIGN = {
  UI,
  BASIC: { ...UI, ...BASIC },
  EASY: { ...UI, ...EASY },
  HARD: { ...UI, ...HARD },
  COLORS: {
    CURSOR: hexToString(PALETTE.BACKGROUND.DARKEST),
    AUTOCOMPLETE: hexToString(PALETTE.ACCENT.RED),
    INPUT: hexToString(PALETTE.BACKGROUND.DARKEST)
  }
};

// Export individual constants for backward compatibility
export const {
  BUTTON: { WIDTH: buttonWidth, HEIGHT: buttonHeight, SPACING: buttonSpacing },
  OUTLINE: { WIDTH: OUTLINE_WIDTH, CORNER_RADIUS },
  BUTTON: { OUTLINE_WIDTH: BUTTON_OUTLINE_WIDTH, CORNER_RADIUS: BUTTON_CORNER_RADIUS },
  TOGGLE: { WIDTH: toggleWidth, HEIGHT: toggleHeight },
  PROGRESS_BAR
} = UI;

// Export color configurations for direct imports
export const {
  COLORS: BASIC_COLORS_HEX,
  TEXT_COLORS: BASIC_COLORS_TEXT
} = BASIC;

export const {
  COLORS: EASY_COLORS_HEX,
  TEXT_COLORS: EASY_COLORS_TEXT
} = EASY;

export const {
  COLORS: HARD_COLORS_HEX,
  TEXT_COLORS: HARD_COLORS_TEXT
} = HARD;
