// dimensions.js - Centralized configuration for all dimensions and ratios

/**
 * Improved mobile detection
 * @returns {boolean} Whether the device is mobile
 */
export function isMobileDevice() {
    const ua = navigator.userAgent.toLowerCase();
    const touchPoints = navigator.maxTouchPoints || 'ontouchstart' in window;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return (
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua) ||
        (touchPoints && Math.min(width, height) < 768)
    );
}

/**
 * Device type constants
 */
export const DEVICE_TYPES = {
    DESKTOP: "desktop",
    TABLET: "tablet",
    PHONE: "phone"
};

/**
 * Detect device type based on screen size and user agent
 * @returns {string} Device type
 */
export function detectDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    const width = window.screen.width;
    const height = window.screen.height;
    const minDim = Math.min(width, height);

    // iPad or Android tablet detection
    if (
        (ua.includes("ipad")) ||
        (ua.includes("android") && !ua.includes("mobile")) ||
        (minDim >= 600 && minDim < 900)
    ) {
        return DEVICE_TYPES.TABLET;
    }
    // Phone detection
    if (
        (ua.includes("iphone")) ||
        (ua.includes("android") && ua.includes("mobile")) ||
        (minDim < 600)
    ) {
        return DEVICE_TYPES.PHONE;
    }
    // Default to desktop
    return DEVICE_TYPES.DESKTOP;
}

/**
 * Base dimensions by device type and orientation
 */
export const BASE_DIMENSIONS = {
    [DEVICE_TYPES.DESKTOP]: {
        LANDSCAPE: {
            width: 1280,
            height: 720
        },
        PORTRAIT: {
            width: 720,
            height: 1280
        }
    },
    [DEVICE_TYPES.TABLET]: {
        LANDSCAPE: {
            width: 1000,
            height: 800
        },
        PORTRAIT: {
            width: 800,
            height: 1000
        }
    },
    [DEVICE_TYPES.PHONE]: {
        LANDSCAPE: {
            width: 1280,
            height: 720
        },
        PORTRAIT: {
            width: 720,
            height: 1280
        }
    }
};

/**
 * Calculate optimal game dimensions based on device and screen
 * @returns {object} Optimal dimensions and scale mode
 */
export function getOptimalDimensions() {
    // Use visualViewport if available for the most accurate visible area
    const viewportWidth = (window.visualViewport && window.visualViewport.width) ||
        window.innerWidth || document.documentElement.clientWidth || screen.width;
    const viewportHeight = (window.visualViewport && window.visualViewport.height) ||
        window.innerHeight || document.documentElement.clientHeight || screen.height;
    const aspectRatio = viewportWidth / viewportHeight;
    const isLandscape = aspectRatio >= 1;
    const deviceType = detectDeviceType();
    
    // Get dimensions based on device type and orientation
    let dimensions;
    
    // For desktop, use dimensions that maintain game layout but allow proper scaling
    if (deviceType === DEVICE_TYPES.DESKTOP) {
        // Use a fixed height and calculate width based on a reasonable aspect ratio
        // This ensures the game layout is consistent
        const baseHeight = 720;
        
        if (isLandscape) {
            // Use 16:9 as the target aspect ratio for landscape
            dimensions = {
                width: 1280,
                height: baseHeight
            };
        } else {
            // Use 9:16 for portrait
            dimensions = {
                width: baseHeight * 0.5625, // 405
                height: baseHeight
            };
        }
        
        console.log(`[DIMENSIONS] Desktop base: ${dimensions.width}x${dimensions.height} (landscape: ${isLandscape})`);
        console.log(`[DIMENSIONS] Viewport: ${viewportWidth}x${viewportHeight} (aspect: ${aspectRatio.toFixed(2)})`);
    } else {
        // For mobile/tablet, use predefined dimensions
        if (isLandscape) {
            dimensions = BASE_DIMENSIONS[deviceType].LANDSCAPE;
        } else {
            dimensions = BASE_DIMENSIONS[deviceType].PORTRAIT;
        }
    }
    
    return {
        width: dimensions.width,
        height: dimensions.height,
        isLandscape,
        deviceType,
        mode: Phaser.Scale.FIT,
        maxWidth: Math.round(viewportWidth),
        maxHeight: Math.round(viewportHeight)
    };
}

/**
 * Get dimensions for a specific device type and orientation
 * @param {string} deviceType - The device type
 * @param {boolean} isLandscape - Whether the orientation is landscape
 * @returns {object} Width and height
 */
export function getDimensionsForDevice(deviceType, isLandscape) {
    const orientation = isLandscape ? 'LANDSCAPE' : 'PORTRAIT';
    return BASE_DIMENSIONS[deviceType][orientation];
}

/**
 * Scale config options
 */
export const SCALE_CONFIG = {
    FIT: Phaser.Scale.FIT,
    CENTER_BOTH: Phaser.Scale.CENTER_BOTH
};
