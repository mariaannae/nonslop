import { BASIC_COLORS_HEX as COLORS_HEX, BASIC_COLORS_TEXT as COLORS_TEXT, DESIGN} from "../config/design.js";

export default class ToggleFactory {
    /**
     * Creates a styled toggle switch with labels
     * @param {Phaser.Scene} scene - The scene to add the toggle to
     * @param {string} mode - Current mode ('easy' or 'hard')
     * @param {function} callback - The function to call when toggle is flipped
     * @param {number} centerX - X position (center) of the toggle
     * @param {number} centerY - Y position (center) of the toggle
     * @param {Object} options - Optional customization parameters
     * @returns {Phaser.GameObjects.Container} The toggle container
     */
    static createToggle(scene, mode, callback, leftX, centerY, options = {}) {
        const easyLabel = scene.add.text(0, 0, 'EASY', {
            fontFamily: 'Nunito',
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(1, 0.5);
        
        const hardLabel = scene.add.text(0, 0, 'HARD', {
            fontFamily: 'Nunito',
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0, 0.5);
        
        // Create toggle background
        const toggleBg = scene.add.rectangle(0, 0, DESIGN.UI.TOGGLE.WIDTH, DESIGN.UI.TOGGLE.HEIGHT, COLORS_HEX.HIGHLIGHT)
            .setStrokeStyle(2, COLORS_HEX.HIGHLIGHT)
            .setInteractive({ useHandCursor: true });

        
        // Create toggle circle
        const toggleCircle = scene.add.circle(0, 0, DESIGN.UI.TOGGLE.HEIGHT, COLORS_HEX.ACCENT);
        
        // Calculate responsive spacing based on label widths
        const easyWidth = easyLabel.width;
        const hardWidth = hardLabel.width;
        const spacing = 15; // Space between labels and toggle
        const centerX = leftX + (DESIGN.UI.TOGGLE.WIDTH + easyWidth + hardWidth + spacing * 2) / 2; // Center the toggle
        
        // Position labels relative to toggle for proper centering
        easyLabel.x = -DESIGN.UI.TOGGLE.WIDTH/2 - spacing;
        hardLabel.x = DESIGN.UI.TOGGLE.WIDTH/2 + spacing;
        toggleBg.x = 0; // Center the toggle
        
        // Container for alignment
        const toggleContainer = scene.add.container(centerX, centerY, [easyLabel, toggleBg, toggleCircle, hardLabel]);
        
        if (mode === 'hard') {
            toggleCircle.x = DESIGN.UI.TOGGLE.WIDTH/2; // Start in HARD mode (toggleBg.x is now 0)
        }
        else if (mode === 'easy') {
            toggleCircle.x = -DESIGN.UI.TOGGLE.WIDTH/2; // Start in EASY mode (toggleBg.x is now 0)
        }
        else {
            console.error('Invalid mode. Defaulting to EASY.');
            toggleCircle.x = -DESIGN.UI.TOGGLE.WIDTH/2; // Default to EASY mode
        }
        
        // Toggle mode interaction
        toggleBg.on('pointerdown', () => {
            if (mode === 'hard') {
                // Switch to hard mode
                scene.tweens.add({
                    targets: toggleCircle,
                    x: DESIGN.UI.TOGGLE.WIDTH/2, // toggleBg.x is now 0
                    duration: 100,
                    ease: 'Power2',
                    onComplete: () => callback('easy')
                });
            } else if (mode === 'easy') {
                // Switch to easy mode
                scene.tweens.add({
                    targets: toggleCircle,
                    x: -DESIGN.UI.TOGGLE.WIDTH/2, // toggleBg.x is now 0
                    duration: 100,
                    ease: 'Power2',
                    onComplete: () => callback('hard')
                });
            }
        });
        
        return toggleContainer;
    }
}
