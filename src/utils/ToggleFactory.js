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
     * @returns {Phaser.GameObjects.Container} The toggle container with added methods for state update
     */
    static createToggle(scene, mode, callback, leftX, centerY, options = {}) {
        // Store current mode in a variable that can be updated
        let currentMode = mode;
        
        // Create toggle background with color based on mode
        const bgColor = currentMode === 'hard' ? COLORS_HEX.HIGHLIGHT : 0x333333; // Grey for easy mode
        const toggleBg = scene.add.rectangle(0, 0, DESIGN.UI.TOGGLE.WIDTH, DESIGN.UI.TOGGLE.HEIGHT, bgColor)
            .setStrokeStyle(2, COLORS_HEX.HIGHLIGHT)
            .setInteractive({ useHandCursor: true });
        
        // Create toggle circle
        const toggleCircle = scene.add.circle(0, 0, DESIGN.UI.TOGGLE.HEIGHT, COLORS_HEX.ACCENT);
        
        // Without labels, center is simpler
        const centerX = leftX + DESIGN.UI.TOGGLE.WIDTH / 2;
        
        // Container for alignment
        const toggleContainer = scene.add.container(centerX, centerY, [toggleBg, toggleCircle]);
        
        // Position the toggle circle based on mode
        const updateTogglePosition = (mode) => {
            if (mode === 'hard') {
                toggleCircle.x = DESIGN.UI.TOGGLE.WIDTH/2 - DESIGN.UI.TOGGLE.HEIGHT/2; // HARD mode position
                toggleBg.fillColor = COLORS_HEX.HIGHLIGHT;
            }
            else if (mode === 'easy') {
                toggleCircle.x = -DESIGN.UI.TOGGLE.WIDTH/2 + DESIGN.UI.TOGGLE.HEIGHT/2; // EASY mode position
                toggleBg.fillColor = 0x333333; // Grey for easy mode
            }
            else {
                console.error('Invalid mode. Defaulting to EASY.');
                toggleCircle.x = -DESIGN.UI.TOGGLE.WIDTH/2 + DESIGN.UI.TOGGLE.HEIGHT/2; // Default to EASY
                toggleBg.fillColor = 0x333333;
            }
        };
        
        // Initial position setup
        updateTogglePosition(currentMode);
        
        // Toggle mode interaction
        toggleBg.on('pointerdown', () => {
            const newMode = currentMode === 'hard' ? 'easy' : 'hard';
            
            // Animate the toggle switch
            scene.tweens.add({
                targets: toggleCircle,
                x: newMode === 'hard' 
                    ? DESIGN.UI.TOGGLE.WIDTH/2 - DESIGN.UI.TOGGLE.HEIGHT/2 
                    : -DESIGN.UI.TOGGLE.WIDTH/2 + DESIGN.UI.TOGGLE.HEIGHT/2,
                duration: 100,
                ease: 'Power2',
                onUpdate: () => {
                    // Update color during animation
                    toggleBg.fillColor = newMode === 'hard' 
                        ? COLORS_HEX.HIGHLIGHT 
                        : 0x333333;
                },
                onComplete: () => {
                    // Update internal state and trigger callback
                    currentMode = newMode;
                    callback(newMode);
                }
            });
        });
        
        // Add method to update toggle state externally
        toggleContainer.updateState = (newMode) => {
            // Only update if the mode actually changed
            if (newMode !== currentMode) {
                currentMode = newMode;
                updateTogglePosition(currentMode);
            }
        };
        
        return toggleContainer;
    }
}
