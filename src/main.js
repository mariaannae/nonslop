window.onerror = function(message, source, lineno, colno, error) {
    alert("Global error: " + message + " at " + source + ":" + lineno + ":" + colno);
    console.error("Global error:", message, source, lineno, colno, error);
};
window.onunhandledrejection = function(event) {
    // Suppress alert for known IndexedDB/Firestore errors on mobile
    const reason = event.reason && event.reason.message ? event.reason.message : (event.reason || "");
    const knownIndexedDBErrorPatterns = [
        "Error looking up record in object store by key range",
        "UnknownError",
        "A mutation operation was attempted on a database that did not allow mutations"
    ];
    const isKnownIndexedDBError = knownIndexedDBErrorPatterns.some(pattern =>
        reason && reason.toString().includes(pattern)
    );
    if (isKnownIndexedDBError) {
        // Log to console, but do not alert
        console.warn("Suppressed IndexedDB/Firestore error:", reason);
        return;
    }
    alert("Unhandled promise rejection: " + reason);
    console.error("Unhandled promise rejection:", reason);
};

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
import BadgeGenerator from "./scenes/BadgeGenerator.js";
import GameOverScene from "./scenes/GameOverScene.js";

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
    // Use visualViewport if available for the most accurate visible area
    const viewportWidth = (window.visualViewport && window.visualViewport.width) ||
        window.innerWidth || document.documentElement.clientWidth || screen.width;
    const viewportHeight = (window.visualViewport && window.visualViewport.height) ||
        window.innerHeight || document.documentElement.clientHeight || screen.height;
    const aspectRatio = viewportWidth / viewportHeight;

    // Always use design resolution, scale to fit viewport, preserve aspect ratio
    let width, height;
    if (aspectRatio < 1) {
        // Portrait
        width = 720;
        height = 1280;
    } else {
        // Landscape
        width = 1280;
        height = 720;
    }
    return {
        width,
        height,
        mode: Phaser.Scale.FIT,
        maxWidth: Math.round(viewportWidth),
        maxHeight: Math.round(viewportHeight)
    };
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
        GameOverScene, 
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
            width: isMobile ? dimensions.width : 800,
            height: isMobile ? dimensions.height : 600
        },
        max: {
            width: isMobile ? dimensions.maxWidth : (dimensions.maxWidth || dimensions.width),
            height: isMobile ? dimensions.maxHeight : (dimensions.maxHeight || dimensions.height)
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

// Helper to compute and store the current scale factor in the registry
function updateUIScale() {
    // The scale factor is the ratio between the actual canvas size and the design resolution
    const scaleWidth = game.scale.displaySize.width / game.scale.gameSize.width;
    const scaleHeight = game.scale.displaySize.height / game.scale.gameSize.height;
    // Use the smaller scale to ensure everything fits
    const uiScale = Math.min(scaleWidth, scaleHeight);
    game.registry.set('uiScale', uiScale);
}

// Store device type and base dimensions globally for scenes to access
game.registry.set('isMobile', isMobile);
game.registry.set('baseWidth', dimensions.width);
game.registry.set('baseHeight', dimensions.height);
updateUIScale();

// Handle window resize events
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (game.scale) {
            // Recompute optimal dimensions for new viewport
            const newDimensions = getOptimalDimensions();
            // Resize the game world (design resolution stays the same)
            game.scale.resize(newDimensions.width, newDimensions.height);
            // Update maxWidth/maxHeight for scale manager
            game.scale.maxWidth = newDimensions.maxWidth;
            game.scale.maxHeight = newDimensions.maxHeight;
            // Update UI scale factor
            updateUIScale();
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

    // Mobile-specific: prevent unwanted mobile behaviors
    if (isMobile) {
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

        // Fix: Resume audio context on first user gesture to prevent AudioContext error
        const unlockAudio = () => {
            if (game.sound && typeof game.sound.unlock === 'function') {
                game.sound.unlock();
            }
            // For extra safety, also try to resume the context directly if available
            if (game.sound && game.sound.context && game.sound.context.state === 'suspended') {
                game.sound.context.resume();
            }
            document.removeEventListener('touchstart', unlockAudio, true);
            document.removeEventListener('mousedown', unlockAudio, true);
        };
        document.addEventListener('touchstart', unlockAudio, true);
        document.addEventListener('mousedown', unlockAudio, true);
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
