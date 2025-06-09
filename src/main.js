//import Phaser from 'phaser';

import GameSceneHard from "./scenes/GameSceneHard.js";
import Boot from "./scenes/Boot.js";
import Preloader from "./scenes/Preloader.js";
import GameSceneEasy from "./scenes/GameSceneEasy.js";
import FeedbackScene from "./scenes/FeedbackScene.js";
import InstructionScene from "./scenes/InstructionsScene.js";  
import LevelScene from "./scenes/LevelScene.js";
import DoneScene from "./scenes/DoneScene.js";
import LeaderboardScene from "./scenes/LeaderboardScene.js";
import UsernameScene from "./scenes/UsernameScene.js";
import gameOver from "./scenes/gameOver.js";
import BadgeGenerator from "./scenes/BadgeGenerator.js";

// Improved mobile detection
function isMobileDevice() {
    const ua = navigator.userAgent.toLowerCase();
    const touchPoints = navigator.maxTouchPoints || 'ontouchstart' in window;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return (
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua) ||
        (touchPoints && Math.min(width, height) < 768)
    );
}

// Calculate optimal game dimensions
function getOptimalDimensions() {
    const isMobile = isMobileDevice();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const aspectRatio = screenWidth / screenHeight;
    
    // Define base resolutions for different orientations and devices
    if (isMobile) {
        // Portrait mode (most common for mobile)
        if (aspectRatio < 1) {
            return {
                width: 720,
                height: 1280,
                mode: Phaser.Scale.FIT
            };
        }
        // Landscape mode
        else {
            return {
                width: 1280,
                height: 720,
                mode: Phaser.Scale.FIT
            };
        }
    } else {
        // Desktop - use a 16:9 aspect ratio as base
        return {
            width: 1920,
            height: 1080,
            mode: Phaser.Scale.FIT
        };
    }
}

const dimensions = getOptimalDimensions();

const config = {
    type: Phaser.AUTO,
    scene: [
        Boot, 
        Preloader, 
        InstructionScene, 
        LevelScene, 
        GameSceneHard, 
        GameSceneEasy, 
        DoneScene, 
        FeedbackScene, 
        LeaderboardScene, 
        UsernameScene, 
        gameOver, 
        BadgeGenerator
    ],
    physics: { 
        default: 'arcade', 
        arcade: { 
            debug: false 
        } 
    },
    plugins: {
        global: [{
            key: 'rexBBCodeTextPlugin',
            plugin: rexbbcodetextplugin,
            start: true
        }]
    },
    scale: {
        mode: dimensions.mode,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: dimensions.width,
        height: dimensions.height,
        // Additional scale options for better mobile support
        parent: 'game-container', // Make sure you have a div with this ID
        expandParent: false,
        // Handle device pixel ratio for sharp rendering
        resolution: window.devicePixelRatio || 1,
        // Prevent sub-pixel rendering issues
        autoRound: true
    },
    render: {
        pixelArt: false,
        antialias: true,
        // Additional render options for better performance
        powerPreference: 'high-performance',
        transparent: false
    },
    // Input configuration for better mobile support
    input: {
        activePointers: 3, // Support multi-touch
        smoothFactor: 0.5 // Smooth input on mobile
    },
    // DOM configuration
    dom: {
        createContainer: true
    }
};

const game = new Phaser.Game(config);

// Handle orientation changes and resize events
window.addEventListener('resize', () => {
    // Let Phaser's scale manager handle the resize
    if (game.scale) {
        game.scale.refresh();
    }
});

// Handle orientation change specifically for mobile
if (isMobileDevice()) {
    window.addEventListener('orientationchange', () => {
        // Small delay to ensure new dimensions are available
        setTimeout(() => {
            if (game.scale) {
                game.scale.refresh();
            }
        }, 100);
    });
}

// Prevent default touch behaviors on mobile (like pull-to-refresh)
document.addEventListener('touchmove', (e) => {
    if (e.target.closest('#game-container')) {
        e.preventDefault();
    }
}, { passive: false });

// Export game instance if needed by other modules
export default game;