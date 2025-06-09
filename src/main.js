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

// Calculate optimal game dimensions based on device and screen
function getOptimalDimensions() {
    const isMobile = isMobileDevice();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const aspectRatio = screenWidth / screenHeight;
    
    if (isMobile) {
        // Mobile configurations
        if (aspectRatio < 1) {
            // Portrait mode
            return {
                width: 720,
                height: 1280,
                mode: Phaser.Scale.FIT,
                maxWidth: 540,
                maxHeight: 960
            };
        } else {
            // Landscape mode
            return {
                width: 1280,
                height: 720,
                mode: Phaser.Scale.FIT,
                maxWidth: 960,
                maxHeight: 540
            };
        }
    } else {
        // Desktop configurations - more sophisticated approach
        const maxGameWidth = Math.min(screenWidth * 0.9, 1920);
        const maxGameHeight = Math.min(screenHeight * 0.9, 1080);
        
        // For ultra-wide monitors, constrain to 16:9
        if (aspectRatio > 2) {
            return {
                width: 1920,
                height: 1080,
                mode: Phaser.Scale.FIT,
                maxWidth: maxGameHeight * (16/9),
                maxHeight: maxGameHeight
            };
        }
        
        // For standard desktop displays
        if (screenWidth >= 1920 && screenHeight >= 1080) {
            // Full HD or higher - use optimal gaming resolution
            return {
                width: 1920,
                height: 1080,
                mode: Phaser.Scale.FIT,
                maxWidth: maxGameWidth,
                maxHeight: maxGameHeight
            };
        } else if (screenWidth >= 1366) {
            // HD displays
            return {
                width: 1366,
                height: 768,
                mode: Phaser.Scale.FIT,
                maxWidth: screenWidth * 0.9,
                maxHeight: screenHeight * 0.9
            };
        } else {
            // Smaller desktop displays
            return {
                width: 1280,
                height: 720,
                mode: Phaser.Scale.FIT,
                maxWidth: screenWidth * 0.9,
                maxHeight: screenHeight * 0.9
            };
        }
    }
}

const dimensions = getOptimalDimensions();
const isMobile = isMobileDevice();

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
            debug: false,
            // Adjust physics for desktop (higher precision)
            fps: isMobile ? 60 : 120,
            timeScale: 1,
            gravity: { y: 0 }
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
        min: {
            width: isMobile ? 320 : 800,
            height: isMobile ? 480 : 600
        },
        max: {
            width: dimensions.maxWidth || dimensions.width,
            height: dimensions.maxHeight || dimensions.height
        },
        parent: 'game-container',
        expandParent: false,
        resolution: window.devicePixelRatio || 1,
        autoRound: true
    },
    render: {
        pixelArt: false,
        antialias: true,
        powerPreference: isMobile ? 'default' : 'high-performance',
        transparent: false,
        // Better rendering for desktop
        mipmapFilter: 'LINEAR',
        roundPixels: false,
        // Enable if you have text-heavy scenes
        batchSize: isMobile ? 2048 : 4096
    },
    input: {
        activePointers: isMobile ? 3 : 1,
        smoothFactor: isMobile ? 0.5 : 0,
        // Enable keyboard for desktop
        keyboard: {
            target: window
        },
        // Mouse settings for desktop
        mouse: {
            preventDefaultWheel: true,
            preventDefaultDown: false,
            preventDefaultUp: false,
            preventDefaultMove: false
        }
    },
    fps: {
        // Higher FPS target for desktop
        target: isMobile ? 60 : 120,
        min: 30,
        forceSetTimeOut: false
    },
    dom: {
        createContainer: true
    },
    // Audio settings optimized per platform
    audio: {
        disableWebAudio: false,
        noAudio: false
    },
    // Disable context menu on right-click for desktop
    disableContextMenu: !isMobile
};

const game = new Phaser.Game(config);

// Store device type globally for scenes to access
game.registry.set('isMobile', isMobile);
game.registry.set('baseWidth', dimensions.width);
game.registry.set('baseHeight', dimensions.height);

// Handle window resize events
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (game.scale) {
            game.scale.refresh();
            
            // Emit custom resize event for scenes
            game.events.emit('resize', game.scale.width, game.scale.height);
        }
    }, 100);
});

// Desktop-specific: fullscreen handling
if (!isMobile) {
    // F11 or custom fullscreen toggle
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F11') {
            e.preventDefault();
            if (game.scale.isFullscreen) {
                game.scale.stopFullscreen();
            } else {
                game.scale.startFullscreen();
            }
        }
    });
    
    // ESC key handling for menus/pause
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            game.events.emit('toggle-pause');
        }
    });
}

// Mobile-specific: orientation and touch handling
if (isMobile) {
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (game.scale) {
                // Recalculate dimensions on orientation change
                const newDimensions = getOptimalDimensions();
                game.scale.resize(newDimensions.width, newDimensions.height);
                game.events.emit('orientation-change', window.orientation);
            }
        }, 100);
    });
    
    // Prevent unwanted mobile behaviors
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#game-container')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

 // Performance monitoring for optimization
if (
    !isMobile &&
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV === 'development'
) {
    // Add FPS display for development
    game.events.on('postrender', () => {
        // Your FPS monitoring code here
    });
}

// Visibility change handling (pause when tab is hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        game.events.emit('game-blur');
        if (game.sound) {
            game.sound.pauseAll();
        }
    } else {
        game.events.emit('game-focus');
        if (game.sound) {
            game.sound.resumeAll();
        }
    }
});

// Export game instance
export default game;
