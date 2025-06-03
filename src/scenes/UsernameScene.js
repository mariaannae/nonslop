import { DESIGN, EASY_COLORS_HEX, EASY_COLORS_TEXT, HARD_COLORS_HEX, HARD_COLORS_TEXT, THEMES } from "../config/design.js";
import { saveHighScore } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import SceneTransitionManager from "../utils/SceneTransitionManager.js";
import { createBackground } from "../backgrounds/createBackground.js";
import { ScalingManager } from "../config/scaling.js";

export default class UsernameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UsernameScene' });
        this.username = '';
        this.scoreData = null;
        this.mode = 'easy';
        this.cursorVisible = true;
        this.cursorTimer = null;
    }

    init(data) {
        console.log("UsernameScene init called with data:", JSON.stringify(data));
        this.mode = data.mode || 'easy';
        this.scoreData = data.scoreData || null;
        this.username = data.username || '';
        this.levelValue = data.levelValue || 1;
        console.log("UsernameScene initialized with mode:", this.mode);
        console.log("UsernameScene score data:", this.scoreData);
        console.log("UsernameScene levelValue:", this.levelValue);

        // Set colors based on mode
        if (this.mode === "easy") {
            this.COLORS_HEX = EASY_COLORS_HEX;
            this.COLORS_TEXT = EASY_COLORS_TEXT;
        } else {
            this.COLORS_HEX = HARD_COLORS_HEX;
            this.COLORS_TEXT = HARD_COLORS_TEXT;
        }
    }

    create() {
        // Create background
        this.createBackgroundEffect();

        // Initialize scaling manager for responsive UI
        this.scalingManager = new ScalingManager(this);

        // Create title and explanation
        this.createTitle();

        // Create input field
        this.createInputField();

        // Create buttons
        this.createButtons();

        // Setup keyboard input
        this.setupKeyboardInput();

        // Show congratulations message
        this.showCongratulations();
    }

    createBackgroundEffect() {
        // Get the appropriate background configuration based on mode
        const themeConfig = this.mode === 'easy' ? THEMES.easy : THEMES.hard;
        
        // Use the createBackground function from the imported module
        // This will create the appropriate background based on mode and levelValue
        createBackground(this, themeConfig.background, this.levelValue);
    }

    createTitle() {
        // Create a title for entering username
        const titleStyle = {
            fontFamily: 'barcade3d',
            fontSize: '60px',
            color: this.COLORS_TEXT.TITLE,
            align: 'center',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000',
                blur: 2,
                fill: true
            }
        };

        this.add.text(
            this.cameras.main.centerX,
            80,
            '(NEW HIGH SCORE)',
            titleStyle
        ).setOrigin(0.5);

        // Add explanation text
        const subtitleStyle = {
            fontFamily: 'IBM Plex Mono',
            fontSize: '28px',
            color: '#ffffff',
            align: 'center'
        };

        this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100,
            'Enter your name for the leaderboard:',
            subtitleStyle
        ).setOrigin(0.5);
    }

    createInputField() {
        const width = this.cameras.main.width * 0.6;
        const height = 60;
        const x = this.cameras.main.centerX - width / 2;
        const y = this.cameras.main.centerY - 50;

        // Create input field background
        this.inputBg = this.add.graphics();
        this.inputBg.fillStyle(0xffffff, 1);
        this.inputBg.fillRoundedRect(x, y, width, height, 10);
        this.inputBg.lineStyle(3, this.COLORS_HEX.BOX_OUTLINE, 1);
        this.inputBg.strokeRoundedRect(x, y, width, height, 10);

        // Create text field
        this.inputText = this.add.text(
            x + 20,
            y + height / 2,
            this.username || '',
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: `${DESIGN.UI.TEXTBOX_FONT_SIZE}px`,
                color: '#000000'
            }
        ).setOrigin(0, 0.5);

        // Create cursor
        this.cursor = this.add.text(
            this.inputText.x + this.inputText.width + 2,
            y + height / 2,
            '|',
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: `${DESIGN.UI.TEXTBOX_FONT_SIZE}px`,
                color: '#000000'
            }
        ).setOrigin(0, 0.5);

        // Start cursor blinking
        this.cursorTimer = this.time.addEvent({
            delay: 500,
            callback: () => {
                this.cursorVisible = !this.cursorVisible;
                this.cursor.setVisible(this.cursorVisible);
            },
            loop: true
        });

        // Make input field interactive
        this.inputBg.setInteractive(
            new Phaser.Geom.Rectangle(x, y, width, height),
            Phaser.Geom.Rectangle.Contains
        ).on('pointerdown', () => {
            // This doesn't actually focus a real input field, but it's a visual cue
            this.inputBg.clear();
            this.inputBg.fillStyle(0xffffff, 1);
            this.inputBg.fillRoundedRect(x, y, width, height, 10);
            this.inputBg.lineStyle(3, 0x00ff00, 1);
            this.inputBg.strokeRoundedRect(x, y, width, height, 10);
        });
    }

    updateInputText() {
        this.inputText.setText(this.username);
        this.cursor.setPosition(this.inputText.x + this.inputText.width + 2, this.cursor.y);
        
        // Reset cursor blink
        this.cursorVisible = true;
        this.cursor.setVisible(true);
        
        if (this.cursorTimer) {
            this.cursorTimer.reset({
                delay: 500,
                callback: () => {
                    this.cursorVisible = !this.cursorVisible;
                    this.cursor.setVisible(this.cursorVisible);
                },
                loop: true
            });
        }
    }

    setupKeyboardInput() {
        // Store the handler reference so we can remove it later
        this._usernameKeydownHandler = (event) => {
            // Allow only letters, numbers, and spaces
            if (/^[a-zA-Z0-9 ]$/.test(event.key)) {
                if (this.username.length < 20) { // Set a reasonable maximum length
                    this.username += event.key;
                    this.updateInputText();
                }
            }
            // Handle backspace
            else if (event.key === 'Backspace') {
                this.username = this.username.slice(0, -1);
                this.updateInputText();
            }
            // Handle enter key
            else if (event.key === 'Enter') {
                this.submitUsername();
            }
        };
        this.input.keyboard.on('keydown', this._usernameKeydownHandler);
    }

    shutdown() {
        // Remove the keydown handler to prevent interference with other scenes
        if (this._usernameKeydownHandler) {
            this.input.keyboard.off('keydown', this._usernameKeydownHandler);
            this._usernameKeydownHandler = null;
        }
        // Call parent shutdown if needed
        if (super.shutdown) {
            super.shutdown();
        }
    }

    destroy() {
        // Also remove the keydown handler on destroy
        if (this._usernameKeydownHandler) {
            this.input.keyboard.off('keydown', this._usernameKeydownHandler);
            this._usernameKeydownHandler = null;
        }
        if (super.destroy) {
            super.destroy();
        }
    }

    createButtons() {
        // Input box layout
        const inputBoxY = this.cameras.main.centerY - 50;
        const inputBoxHeight = 60;
        const inputBoxBottomEdge = inputBoxY + inputBoxHeight;
        const buttonGap = DESIGN.UI.BUTTON.BELOW_TEXTBOX_GAP;
        const buttonHeight = DESIGN.UI.BUTTON.HEIGHT;

        // Submit button: 30px below input box, centered at that Y
        const outlineWidth = DESIGN.UI.OUTLINE.WIDTH;
        const submitButtonY = inputBoxBottomEdge + outlineWidth / 2 + buttonGap + buttonHeight / 2;

        // Skip button: 2/3 * gap (20px) below submit button, centered at that Y
        const skipButtonGap = (2 / 3) * buttonGap;
        const skipButtonY = submitButtonY + buttonHeight + skipButtonGap;

        // Create submit button
        this.submitButton = this.createButton(
            "SUBMIT",
            () => this.submitUsername(),
            this.cameras.main.centerX,
            submitButtonY
        );

        // Create skip button (anonymous)
        this.skipButton = this.createButton(
            "SKIP",
            () => this.skipUsername(),
            this.cameras.main.centerX,
            skipButtonY
        );
        
        // Add hover effects to buttons
        [this.submitButton, this.skipButton].forEach(button => {
            button.setInteractive()
                .on('pointerover', () => button.setScale(1.1))
                .on('pointerout', () => button.setScale(1));
        });
    }

    createButton(label, callback, centerX, centerY, options = {}) {
        // Ensure scalingManager is passed for responsive sizing
        return ButtonFactory.createButton(
            this,
            label,
            callback,
            centerX,
            centerY,
            { ...options, scalingManager: this.scalingManager }
        );
    }

    showCongratulations() {
        // Create celebration effects for high score
        this.createCelebrationEffect();
        
        // Show score value
        const scoreText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 150,
            `Score: ${this.scoreData?.score || 0}`,
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: '28px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        
        // Add glow effect to score
        this.tweens.add({
            targets: scoreText,
            scale: { from: 1, to: 1.1 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }

    createCelebrationEffect() {
        // Create a star texture dynamically for particles
        this.createStarTexture();
        
        // Create particle emitters for celebration
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Define color palettes for different modes
        let particleTints;
        
        if (this.mode === 'easy') {
            // Purple/pink colors for easy mode
            particleTints = [
                0xff80ff,  // Light pink
                0xcc66cc,  // Medium pink
                0xaa55dd,  // Purple-pink
                0xdd44dd,  // Bright pink
                0xd020d0   // Deep pink
            ];
        } else {
            // Yellow/white spark colors for hard mode
            particleTints = [
                0xffffff,  // Pure white
                0xffffaa,  // Pale yellow
                0xffff80,  // Light yellow
                0xffdd55,  // Golden yellow
                0xffcc00   // Deep gold
            ];
        }
        
        // Create a single central point for confetti throwing
        const centerX = width/2;
        const centerY = height/2 - 30;
        
        // Create the main thrown confetti effect
        const mainEmitter = this.add.particles(centerX, centerY, 'star', {
            // Upward initial velocity for thrown effect
            speed: { min: 300, max: 500 },
            // Angle is mostly upward with some spread
            angle: { min: 230, max: 310 },
            // Longer lifespan for full arc motion
            lifespan: { min: 3000, max: 5000 },
            // Strong gravity to create arcing path
            gravityY: 300,
            // Initial burst
            quantity: 30,
            frequency: -1,
            // Good size range for visibility
            scale: { min: 0.3, max: 0.6 },
            alpha: { min: 0.7, max: 1.0 },
            // Fast rotation for tumbling confetti effect
            rotate: { start: 0, end: 600, ease: 'Sine.easeInOut' },
            tint: particleTints,
            blendMode: 'SCREEN',
            // Add drag to slow particles naturally
            drag: { x: 20, y: 10 },
            // Add some turbulence
            accelerationX: { min: -50, max: 50 },
            // Wide emit cone for hand-thrown appearance
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Circle(0, 0, 15),
                quantity: 30
            }
        });
        
        // Explode all at once for thrown appearance
        mainEmitter.explode(40, 0, 0);
        
        // Create a secondary delayed throw
        this.time.delayedCall(200, () => {
            const secondaryEmitter = this.add.particles(centerX + 20, centerY + 10, 'star', {
                speed: { min: 300, max: 450 },
                angle: { min: 220, max: 320 },
                lifespan: { min: 3000, max: 4500 },
                gravityY: 300,
                quantity: 20,
                frequency: -1,
                scale: { min: 0.25, max: 0.5 },
                alpha: { min: 0.7, max: 1.0 },
                rotate: { start: 0, end: 600, ease: 'Sine.easeInOut' },
                tint: particleTints,
                blendMode: 'SCREEN',
                drag: { x: 20, y: 10 },
                accelerationX: { min: -30, max: 30 }
            });
            
            secondaryEmitter.explode(25, 0, 0);
        });
        
        // Add a third burst for more volume
        this.time.delayedCall(400, () => {
            const thirdEmitter = this.add.particles(centerX - 15, centerY - 5, 'star', {
                speed: { min: 250, max: 400 },
                angle: { min: 210, max: 330 }, // Wider angle for more spread
                lifespan: { min: 3000, max: 4000 },
                gravityY: 300,
                quantity: 15,
                frequency: -1,
                scale: { min: 0.2, max: 0.5 },
                alpha: { min: 0.7, max: 1.0 },
                rotate: { start: 0, end: 500, ease: 'Sine.easeInOut' },
                tint: particleTints,
                blendMode: 'SCREEN',
                drag: { x: 20, y: 10 },
                accelerationX: { min: -40, max: 40 }
            });
            
            thirdEmitter.explode(20, 0, 0);
        });
        
        // Add continuous emitters around the edges for sustained effect
        const positions = [
            { x: width/4, y: height/4 },
            { x: width*3/4, y: height/4 },
            { x: width/4, y: height*3/4 - 100 },
            { x: width*3/4, y: height*3/4 - 100 }
        ];
        
        positions.forEach(pos => {
            const emitter = this.add.particles(pos.x, pos.y, 'star', {
                angle: { min: 0, max: 360 },
                speed: { min: 50, max: 100 },
                lifespan: { min: 2000, max: 3000 },
                gravityY: 40,
                quantity: 1,
                frequency: 500,
                scale: { min: 0.3, max: 0.5 },
                alpha: { min: 0.7, max: 0.9 },
                rotate: { min: 0, max: 360 },
                tint: particleTints,
                blendMode: 'SCREEN'
            });
            
            emitter.particleBringToTop = false;
        });
    }
    
    createStarTexture() {
        // Create a sharper glowing dot texture if it doesn't exist
        if (!this.textures.exists('star')) {
            const size = 48; // Slightly smaller for sharper dots
            const canvas = this.textures.createCanvas('star', size, size);
            const ctx = canvas.getContext('2d');
            
            // Clear the canvas
            ctx.clearRect(0, 0, size, size);
            
            const centerX = size / 2;
            const centerY = size / 2;
            const radius = size / 6; // Slightly larger core for sharper appearance
            
            // Create a radial gradient with more distinct steps for the glow effect
            const gradient = ctx.createRadialGradient(
                centerX, centerY, radius * 0.5,
                centerX, centerY, size / 2
            );
            
            if (this.mode === 'easy') {
                // Purple/pink gradient for easy mode
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');    // Bright white center
                gradient.addColorStop(0.1, 'rgba(255, 210, 255, 1)');  // Near-white pink
                gradient.addColorStop(0.3, 'rgba(240, 150, 255, 0.9)'); // Vibrant pink
                gradient.addColorStop(0.6, 'rgba(220, 100, 255, 0.6)'); // Purple-pink
                gradient.addColorStop(0.8, 'rgba(200, 70, 220, 0.2)');  // Faded edge
                gradient.addColorStop(1, 'rgba(180, 70, 220, 0)');      // Transparent edge
            } else {
                // Yellow/white spark gradient for hard mode
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');     // Bright white center
                gradient.addColorStop(0.1, 'rgba(255, 255, 230, 1)');   // Near-white yellow
                gradient.addColorStop(0.3, 'rgba(255, 255, 180, 0.9)'); // Pale yellow
                gradient.addColorStop(0.5, 'rgba(255, 230, 120, 0.7)'); // Yellow
                gradient.addColorStop(0.7, 'rgba(255, 200, 60, 0.4)');  // Golden yellow
                gradient.addColorStop(0.9, 'rgba(255, 180, 0, 0.2)');   // Deep gold
                gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');       // Transparent edge
            }
            
            // Draw the core (brighter center)
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw the glowing dot with gradient
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            canvas.refresh();
        }
    }

    async submitUsername() {
        // Show loading indicator
        this.showLoadingIndicator();

        // Make sure there's a valid username (or use "Anonymous Player")
        const username = this.username.trim() || "Anonymous Player";

        // Save the high score with the username
        if (this.scoreData) {
            try {
                console.log("[submitUsername] Step 1: Preparing score data", JSON.stringify(this.scoreData));
                this.scoreData.username = username;
                if (!this.scoreData.level && this.levelValue) {
                    this.scoreData.level = this.levelValue;
                }

                console.log("[submitUsername] Step 2: Calling saveHighScore");
                await saveHighScore(this.scoreData);
                console.log("[submitUsername] Step 3: saveHighScore complete");

                this.hideLoadingIndicator();

                console.log("[submitUsername] Step 4: Preparing transition snapshot");
                await SceneTransitionManager.prepareTransition(this);
                console.log("[submitUsername] Step 5: Snapshot ready, starting transition");

                SceneTransitionManager.transition(this, 'LeaderboardScene',
                    {
                        mode: this.mode,
                        levelValue: this.levelValue,
                        score: this.scoreData?.score
                    },
                    SceneTransitionManager.CONTEXT.HIGH_SCORE,
                    {
                        duration: 800,
                        color: this.mode === 'hard' ? '#400045' : '#004565'
                    }
                );
                console.log("[submitUsername] Step 6: Transition triggered");
            } catch (error) {
                console.error("[submitUsername] ERROR:", error);
                this.hideLoadingIndicator();
                this.showErrorMessage("Error saving score or transitioning. Please check your connection and try again.");
            }
        } else {
            console.error("[submitUsername] ERROR: No score data found");
            this.hideLoadingIndicator();
            this.showErrorMessage("No score data found. Please try again.");
        }
    }
    
    async skipUsername() {
        try {
            this.hideLoadingIndicator();
            console.log("[skipUsername] Step 1: Preparing transition snapshot");
            await SceneTransitionManager.prepareTransition(this);
            console.log("[skipUsername] Step 2: Snapshot ready, starting pixel dissolve transition");

            SceneTransitionManager.pixelDissolveTransition(this, 'LeaderboardScene',
                {
                    mode: this.mode,
                    levelValue: this.levelValue,
                    score: this.scoreData?.score
                },
                700,
                this.mode === 'hard' ? '#200025' : '#002435',
                'grid'
            );
            console.log("[skipUsername] Step 3: Transition triggered");
        } catch (error) {
            console.error("[skipUsername] ERROR:", error);
            this.showErrorMessage("Error skipping to leaderboard. Please try again.");
        }
    }
    
    showLoadingIndicator() {
        // Disable buttons
        if (this.submitButton) this.submitButton.disableInteractive();
        if (this.skipButton) this.skipButton.disableInteractive();
        
        // Create loading spinner
        this.loadingContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
        
        // Create a graphics object for the rounded rectangle background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-100, -50, 200, 100, 10);
        
        const text = this.add.text(0, 0, 'Saving...', {
            fontFamily: 'IBM Plex Mono',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        this.loadingContainer.add([bg, text]);
        this.loadingContainer.setDepth(100);
        
        // Add spinner animation
        const spinner = this.add.graphics();
        spinner.lineStyle(3, 0xffffff, 1);
        spinner.beginPath();
        spinner.arc(0, 30, 20, 0, Math.PI);
        spinner.strokePath();
        this.loadingContainer.add(spinner);
        
        this.tweens.add({
            targets: spinner,
            rotation: Math.PI * 2,
            duration: 1000,
            repeat: -1
        });
    }
    
    hideLoadingIndicator() {
        // Re-enable buttons
        if (this.submitButton) this.submitButton.setInteractive();
        if (this.skipButton) this.skipButton.setInteractive();
        
        // Remove loading spinner
        if (this.loadingContainer) {
            this.loadingContainer.destroy();
        }
    }
    
    showErrorMessage(message = "Error saving score") {
        const errorContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);

        // Create a graphics object for the rounded rectangle background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.fillRoundedRect(-200, -100, 400, 200, 10);

        const text = this.add.text(0, -30, message, {
            fontFamily: 'IBM Plex Mono',
            fontSize: '24px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const subtext = this.add.text(0, 10, 'Please try again or continue without saving.', {
            fontFamily: 'IBM Plex Mono',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const okButton = this.createButton(
            "OK",
            async () => {
                errorContainer.destroy();

                try {
                    await SceneTransitionManager.prepareTransition(this);
                    SceneTransitionManager.glitchTransition(this, 'LeaderboardScene',
                        {
                            mode: this.mode,
                            levelValue: this.levelValue,
                            previousScene: 'DoneScene'
                        },
                        600,
                        '#ff0000',
                        7
                    );
                } catch (error) {
                    console.error("[showErrorMessage] ERROR during glitch transition:", error);
                }
            },
            0, 60
        );

        errorContainer.add([bg, text, subtext, okButton]);
        errorContainer.setDepth(100);
    }
}
