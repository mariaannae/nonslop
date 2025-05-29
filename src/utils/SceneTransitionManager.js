/**
 * Scene Transition Manager for smooth transitions between scenes
 * Provides methods for creating fade transitions and other visual effects
 */
export default class SceneTransitionManager {
    /**
     * Create a more dramatic fade transition between scenes
     * @param {Phaser.Scene} fromScene - The current scene
     * @param {string} toSceneKey - Key of the scene to transition to
     * @param {object} sceneData - Data to pass to the next scene
     * @param {number} duration - Transition duration in milliseconds
     * @param {string} color - Fade color (hex string with #)
     */
    static fadeTransition(fromScene, toSceneKey, sceneData = {}, duration = 800, color = '#000000') {
        console.log("⭐ Starting scene transition from", fromScene.scene.key, "to", toSceneKey);
        
        // Don't allow transition if one is already in progress
        if (fromScene.isTransitioning) {
            console.log("Transition already in progress, aborting");
            return;
        }
        
        fromScene.isTransitioning = true;
        
        // Create an overlay for the transition that covers everything
        const overlay = fromScene.add.rectangle(
            0, 0, 
            fromScene.cameras.main.width,
            fromScene.cameras.main.height,
            Phaser.Display.Color.HexStringToColor(color).color
        ).setOrigin(0).setDepth(9999).setAlpha(0);
        
        // Add dramatic wipe effect - starts at full width but zero height
        const wipeEffect = fromScene.add.rectangle(
            0, 0,
            fromScene.cameras.main.width,
            0,
            0xffffff
        ).setOrigin(0).setDepth(9998).setAlpha(0.2);
        
        // First animate the wipe effect downward
        fromScene.tweens.add({
            targets: wipeEffect,
            height: fromScene.cameras.main.height,
            duration: duration / 3,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                // Then fade in the overlay
                fromScene.tweens.add({
                    targets: overlay,
                    alpha: 1,
                    duration: duration / 3,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        // Remove the wipe effect once overlay is visible
                        wipeEffect.destroy();
                        
                        // Launch the new scene
                        fromScene.scene.launch(toSceneKey, sceneData);
                        
                        // Get reference to new scene
                        const toScene = fromScene.scene.get(toSceneKey);
                        
                        // Set up the fade-in for the new scene
                        toScene.events.once('create', () => {
                            console.log("⭐ New scene created, setting up fade-in");
                            
                            // Create a camera fade effect in the new scene
                            toScene.cameras.main.fadeIn(duration / 3, 0, 0, 0);
                            
                            // Wait for the camera fade to complete
                            toScene.time.delayedCall(duration / 2, () => {
                                // Stop the old scene
                                fromScene.scene.stop();
                                fromScene.isTransitioning = false;
                                console.log("⭐ Transition complete");
                            });
                        });
                    }
                });
            }
        });
    }
    
    /**
     * Take a snapshot of the current scene
     * This should be called before starting a transition
     * @param {Phaser.Scene} scene - The scene to snapshot
     */
    static takeSnapshot(scene) {
        return new Promise(resolve => {
            scene.game.renderer.snapshot((snapshot) => {
                // If a previous snapshot exists, destroy it
                if (scene.textures.exists('snapshot')) {
                    scene.textures.remove('snapshot');
                }
                scene.textures.addImage('snapshot', snapshot);
                resolve();
            });
        });
    }
    
    /**
     * Prepare a scene for transition by taking a snapshot
     * and setting up transition properties
     * @param {Phaser.Scene} scene - The scene to prepare
     */
    static async prepareTransition(scene) {
        console.log("⭐ Preparing scene transition");
        await this.takeSnapshot(scene);
        
        // Small delay to ensure snapshot is created
        return new Promise(resolve => {
            scene.time.delayedCall(50, resolve);
        });
    }
    
    /**
     * Perform a scene transition with snapshot effect
     * @param {Phaser.Scene} fromScene - Current scene
     * @param {string} toSceneKey - Key of target scene
     * @param {object} sceneData - Data to pass to new scene
     * @param {number} duration - Transition duration
     */
    static async transitionWithSnapshot(fromScene, toSceneKey, sceneData = {}, duration = 800) {
        await this.prepareTransition(fromScene);
        this.fadeTransition(fromScene, toSceneKey, sceneData, duration);
    }
}
