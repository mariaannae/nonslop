// textStyles.js - Centralized configuration for all text styles based on device and mode

import { DEVICE_TYPES, detectDeviceType } from './dimensions.js';
import { BASIC_COLORS_HEX, BASIC_COLORS_TEXT, EASY_COLORS_HEX, EASY_COLORS_TEXT, HARD_COLORS_HEX, HARD_COLORS_TEXT, DESIGN } from './design.js';

/**
 * Get text style for specific text type, device type, and game mode
 * @param {string} textType - Type of text (title, input, output, prompt, tooltip, effect)
 * @param {string} deviceType - Device type (desktop, tablet, phone)
 * @param {string} mode - Game mode (basic, easy, hard)
 * @param {number} uiScale - UI scaling factor (default: 1)
 * @returns {object} Text style object
 */
export function getTextStyle(textType, deviceType = null, mode = 'basic', uiScale = 1) {
    // If device type not provided, detect it
    if (!deviceType) {
        deviceType = detectDeviceType();
    }

    // Get colors based on mode
    let COLORS_TEXT;
    switch (mode) {
        case 'easy':
            COLORS_TEXT = EASY_COLORS_TEXT;
            break;
        case 'hard':
            COLORS_TEXT = HARD_COLORS_TEXT;
            break;
        default:
            COLORS_TEXT = BASIC_COLORS_TEXT;
    }

    // Base font sizes for each device type
    const BASE_FONT_SIZES = {
        [DEVICE_TYPES.DESKTOP]: {
            title: 50,
            menuTitle: 80,
            prompt: 16,
            input: 16,
            output: 16,
            tooltip: 14,
            effect: 18,
            button: 16,
            fancyButton: 16
        },
        [DEVICE_TYPES.TABLET]: {
            title: 50,
            menuTitle: 55,
            prompt: 18,
            input: 18,
            output: 18,
            tooltip: 16,
            effect: 20,
            button: 18,
            fancyButton: 18
        },
        [DEVICE_TYPES.PHONE]: {
            title: 40,
            menuTitle: 40,
            prompt: 24,
            input: 24,
            output: 24,
            tooltip: 18,
            effect: 24,
            button: 24,
            fancyButton: 24
        }
    };

    // Get base font size for device and text type
    const baseFontSize = BASE_FONT_SIZES[deviceType][textType] || 
                         BASE_FONT_SIZES[DEVICE_TYPES.DESKTOP][textType];
    
    // Scale font size based on UI scale
    const fontSize = baseFontSize * uiScale;

    // Base styles for each text type
    const baseStyles = {
        title: {
            fontFamily: 'barcade3d',
            fontSize: `${fontSize}px`,
            color: COLORS_TEXT.TITLE || COLORS_TEXT.PRIMARY,
            shadow: {
                offsetX: 2 * uiScale,
                offsetY: 2 * uiScale,
                color: '#000',
                blur: 2 * uiScale,
                fill: true
            }
        },
        button: {
            fontFamily: 'VT323',
            fontSize: `${fontSize}px`,
            fontWeight: "700",
            color: COLORS_TEXT.PRIMARY,
            align: 'center',
            lineSpacing: 10 * uiScale
        },
        fancyButton: {
            fontFamily: 'VT323',
            fontSize: `${fontSize}px`,
            color: COLORS_TEXT.WHITE,
            align: 'center'
        },
        menuTitle: {
            fontFamily: 'barcade3d',
            fontSize: `${fontSize}px`,
            color: COLORS_TEXT.TITLE || COLORS_TEXT.PRIMARY,
            shadow: {
                offsetX: mode === 'hard' ? 3 * uiScale : 2 * uiScale,
                offsetY: mode === 'hard' ? 3 * uiScale : 2 * uiScale,
                color: '#000',
                blur: mode === 'hard' ? 3 * uiScale : 2 * uiScale,
                fill: true
            }
        },
        prompt: {
            fontFamily: 'IBM Plex Mono',
            fontSize: `${fontSize}px`,
            fill: COLORS_TEXT.PRIMARY,
            align: 'center',
            lineSpacing: 6 * uiScale
        },
        input: {
            fontFamily: 'IBM Plex Mono',
            fontSize: `${fontSize}px`,
            fill: '#000',
            align: 'left',
            lineSpacing: 6 * uiScale
        },
        output: {
            fontFamily: 'IBM Plex Mono',
            fontSize: `${fontSize}px`,
            fill: COLORS_TEXT.PRIMARY,
            align: 'left',
            lineSpacing: 6 * uiScale
        },
        tooltip: {
            fontFamily: 'IBM Plex Mono',
            fontSize: `${fontSize}px`,
            color: '#ffffff',
            align: 'center'
        },
        effect: {
            fontFamily: 'IBM Plex Mono',
            fontSize: `${fontSize}px`,
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }
    };

    // Add mode-specific styling modifications
    if (mode === 'hard' && textType === 'prompt') {
        baseStyles.prompt.shadow = {
            offsetX: 1 * uiScale,
            offsetY: 1 * uiScale,
            color: '#000',
            blur: 2 * uiScale,
            fill: true
        };
    }

    if (textType === 'input' && mode === 'hard') {
        baseStyles.input.shadow = {
            offsetX: 0,
            offsetY: 1 * uiScale,
            color: '#fff',
            blur: 0,
            fill: true
        };
    }

    return baseStyles[textType] || baseStyles.prompt;
}

/**
 * Get box style for specific box type and game mode
 * @param {string} boxType - Type of box (prompt, input, output)
 * @param {string} mode - Game mode (basic, easy, hard)
 * @param {number} uiScale - UI scaling factor (default: 1)
 * @returns {object} Box style object
 */
export function getBoxStyle(boxType, mode = 'basic', uiScale = 1) {
    // Default styles based on UI configuration
    const outline = DESIGN.UI.OUTLINE;
    
    // Get color configuration based on mode
    let COLORS_HEX;
    switch (mode) {
        case 'easy':
            COLORS_HEX = EASY_COLORS_HEX;
            break;
        case 'hard':
            COLORS_HEX = HARD_COLORS_HEX;
            break;
        default:
            COLORS_HEX = BASIC_COLORS_HEX;
    }
    
    // Base styles for each box type
    const baseStyles = {
        prompt: {
            fillColor: COLORS_HEX.BACKGROUND_DARKEST || COLORS_HEX.BACKGROUND || 0x000000,
            fillAlpha: mode === 'hard' ? 0.5 : 0.8,
            hasOutline: true,
            outlineWidth: outline.WIDTH,
            outlineColor: COLORS_HEX.BOX_OUTLINE || COLORS_HEX.ACCENT || 0xffffff,
            cornerRadius: outline.CORNER_RADIUS
        },
        input: {
            fillColor: mode === 'hard' ? 0xffffff : (COLORS_HEX.TEXT || 0xffffff),
            fillAlpha: mode === 'hard' ? 0.9 : 0.95,
            hasOutline: true,
            outlineWidth: outline.WIDTH,
            outlineColor: COLORS_HEX.ACCENT || 0x00ff00,
            cornerRadius: outline.CORNER_RADIUS
        },
        output: {
            fillColor: COLORS_HEX.BOX_FILL || COLORS_HEX.BACKGROUND || 0x000000,
            fillAlpha: 0.8,
            hasOutline: true,
            outlineWidth: outline.WIDTH,
            outlineColor: COLORS_HEX.BOX_OUTLINE || COLORS_HEX.ACCENT || 0xffffff,
            cornerRadius: outline.CORNER_RADIUS
        }
    };
    
    return baseStyles[boxType] || baseStyles.prompt;
}

/**
 * Get autocomplete text style for game mode
 * @param {string} deviceType - Device type (desktop, tablet, phone)
 * @param {string} mode - Game mode (basic, easy, hard)
 * @param {number} uiScale - UI scaling factor (default: 1)
 * @param {number} boxWidth - Width of containing box
 * @returns {object} Autocomplete text style
 */
export function getAutocompleteTextStyle(deviceType = null, mode = 'basic', uiScale = 1, boxWidth = 0) {
    // If device type not provided, detect it
    if (!deviceType) {
        deviceType = detectDeviceType();
    }
    
    // Base font sizes for each device type
    const BASE_FONT_SIZES = {
        [DEVICE_TYPES.DESKTOP]: 14,
        [DEVICE_TYPES.TABLET]: 18,
        [DEVICE_TYPES.PHONE]: 24
    };
    
    const baseFontSize = BASE_FONT_SIZES[deviceType] || BASE_FONT_SIZES[DEVICE_TYPES.DESKTOP];
    const fontSize = baseFontSize * uiScale;
    
    // Calculate word wrap width if box width is provided
    const wordWrapConfig = boxWidth > 0 ? { width: (boxWidth - 60) * uiScale } : null;
    
    return {
        fontFamily: "IBM Plex Mono",
        fontSize: `${fontSize}px`,
        fill: "#ff0000",
        align: "left",
        alpha: 0.7,
        wordWrap: wordWrapConfig
    };
}

/**
 * Get menu bar style for game mode
 * @param {string} mode - Game mode (basic, easy, hard)
 * @param {number} uiScale - UI scaling factor (default: 1)
 * @returns {object} Menu bar style
 */
export function getMenuBarStyle(mode = 'basic', uiScale = 1) {
    // Get color configuration based on mode
    let COLORS_HEX, COLORS_TEXT;
    switch (mode) {
        case 'easy':
            COLORS_HEX = EASY_COLORS_HEX;
            COLORS_TEXT = EASY_COLORS_TEXT;
            break;
        case 'hard':
            COLORS_HEX = HARD_COLORS_HEX;
            COLORS_TEXT = HARD_COLORS_TEXT;
            break;
        default:
            COLORS_HEX = BASIC_COLORS_HEX;
            COLORS_TEXT = BASIC_COLORS_TEXT;
    }
    
    // Get device type for responsive title size
    const deviceType = detectDeviceType();
    
    // Base font sizes for each device type
    const TITLE_FONT_SIZES = {
        [DEVICE_TYPES.DESKTOP]: 80,
        [DEVICE_TYPES.TABLET]: 55,
        [DEVICE_TYPES.PHONE]: 40
    };
    
    const titleFontSize = TITLE_FONT_SIZES[deviceType] || TITLE_FONT_SIZES[DEVICE_TYPES.DESKTOP];
    
    return {
        backgroundColor: COLORS_HEX.BACKGROUND || 0x000000,
        borderColor: mode === 'hard' 
            ? (COLORS_HEX.BOX_OUTLINE || COLORS_HEX.ACCENT || 0xffffff) 
            : (COLORS_HEX.ACCENT || 0x00ff00),
        borderWidth: DESIGN.UI.OUTLINE.WIDTH * uiScale,
        titleStyle: {
            fontFamily: 'barcade3d',
            fontSize: `${titleFontSize * uiScale}px`,
            color: COLORS_TEXT.TITLE || COLORS_TEXT.PRIMARY || '#ffffff',
            shadow: {
                offsetX: mode === 'hard' ? 3 * uiScale : 2 * uiScale,
                offsetY: mode === 'hard' ? 3 * uiScale : 2 * uiScale,
                color: '#000',
                blur: mode === 'hard' ? 3 * uiScale : 2 * uiScale,
                fill: true
            }
        }
    };
}
