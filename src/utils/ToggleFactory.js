import { BASIC_COLORS_HEX as COLORS_HEX, BASIC_COLORS_TEXT as COLORS_TEXT, DESIGN} from "../config/design.js";

export default class ToggleFactory {
    /**
     * Creates a styled toggle switch without labels
     * @param {Phaser.Scene} scene - The scene to add the toggle to
     * @param {string} mode - Current mode ('easy' or 'hard')
     * @param {function} callback - The function to call when toggle is flipped
     * @param {number} leftX - X position (left) of the toggle
     * @param {number} centerY - Y position (center) of the toggle
     * @param {Object} options - Optional customization parameters
     * @returns {Phaser.GameObjects.Container} The toggle container
     */
    static createToggle(scene, mode, callback, leftX, centerY, options = {}) {
        // Create toggle background with color based on mode
        const bgColor = mode === 'hard' ? COLORS_HEX.HIGHLIGHT : 0x333333; // Grey for easy mode
        const toggleBg = scene.add.rectangle(0, 0, DESIGN.UI.TOGGLE.WIDTH, DESIGN.UI.TOGGLE.HEIGHT, bgColor)
            .setStrokeStyle(2, COLORS_HEX.HIGHLIGHT)
            .setInteractive({ useHandCursor: true });
        
        // Create toggle circle
        const toggleCircle = scene.add.circle(0, 0, DESIGN.UI.TOGGLE.HEIGHT, COLORS_HEX.ACCENT);
        
        // Without labels, center is simpler
        const centerX = leftX + DESIGN.UI.TOGGLE.WIDTH / 2;
        
        // Container for alignment
        const toggleContainer = scene.add.container(centerX, centerY, [toggleBg, toggleCircle]);
        
        if (mode === 'hard') {
            toggleCircle.x = DESIGN.UI.TOGGLE.WIDTH/2 - DESIGN.UI.TOGGLE.HEIGHT/2; // Start in HARD mode
        }
        else if (mode === 'easy') {
            toggleCircle.x = -DESIGN.UI.TOGGLE.WIDTH/2 + DESIGN.UI.TOGGLE.HEIGHT/2; // Start in EASY mode
        }
        else {
            console.error('Invalid mode. Defaulting to EASY.');
            toggleCircle.x = -DESIGN.UI.TOGGLE.WIDTH/2 + DESIGN.UI.TOGGLE.HEIGHT/2; // Default to EASY mode
        }
        
        // Toggle mode interaction
        toggleBg.on('pointerdown', () => {
            if (mode === 'hard') {
                // Switch to easy mode
                toggleBg.fillColor = 0x333333; // Grey for easy mode
                scene.tweens.add({
                    targets: toggleCircle,
                    x: -DESIGN.UI.TOGGLE.WIDTH/2 + DESIGN.UI.TOGGLE.HEIGHT/2,
                    duration: 100,
                    ease: 'Power2',
                    onComplete: () => callback('easy')
                });
            } else if (mode === 'easy') {
                // Switch to hard mode
                toggleBg.fillColor = COLORS_HEX.HIGHLIGHT;
                scene.tweens.add({
                    targets: toggleCircle,
                    x: DESIGN.UI.TOGGLE.WIDTH/2 - DESIGN.UI.TOGGLE.HEIGHT/2,
                    duration: 100,
                    ease: 'Power2',
                    onComplete: () => callback('hard')
                });
            }
        });
        
        return toggleContainer;
    }
}
