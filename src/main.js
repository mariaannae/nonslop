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



function isMobileDevice() {
    const ua = navigator.userAgent.toLowerCase();
    const width = window.screen.width;
    const height = window.screen.height;
    // Basic check: user agent or small screen
    return (
        /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/.test(ua) ||
        Math.min(width, height) < 800
    );
}

const isMobile = isMobileDevice();

const config = {
    type: Phaser.AUTO,
    width: isMobile ? 393 : 1920,
    height: isMobile ? 400 : 900,
    scene: [Boot, Preloader, InstructionScene, LevelScene, GameSceneHard, GameSceneEasy, DoneScene, FeedbackScene, LeaderboardScene, UsernameScene, gameOver, BadgeGenerator],
    physics: { default: 'arcade', arcade: { debug: false } },
    plugins: {
        global: [{
            key: 'rexBBCodeTextPlugin',
            plugin: rexbbcodetextplugin, // Defined globally by the script you added above
            start: true
        }]
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: isMobile ? 640 : 1920,
        height: isMobile ? 1136 : 1080
    },
    render: {
        pixelArt: false,
        antialias: true,
    }
};

const game = new Phaser.Game(config);

/* 
// --- Responsive resizing for orientation/aspect ratio ---
// This logic is now removed to let Phaser's Scale Manager handle scaling automatically.
*/
