import { DESIGN, EASY_COLORS_HEX, EASY_COLORS_TEXT, HARD_COLORS_HEX, HARD_COLORS_TEXT } from "../config/design.js";
import { saveHighScore } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";

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
        this.level = data.level || 1;
        console.log("UsernameScene initialized with mode:", this.mode);
        console.log("UsernameScene score data:", this.scoreData);
        console.log("UsernameScene level:", this.level);

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
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        
        let gradientTextureKey = 'gradientUsernameBackground';
    
        if (!this.textures.exists(gradientTextureKey)) {
            let gradientCanvas = this.textures.createCanvas(gradientTextureKey, width, height);
            let ctx = gradientCanvas.getContext();
    
            if (!ctx) {
                console.error("Failed to get canvas context for background effect.");
                return;
            }
    
            let grd = ctx.createLinearGradient(0, 0, width, height);
            grd.addColorStop(0, '#' + this.COLORS_HEX.BACKGROUND.toString(16).padStart(6, '0'));
            grd.addColorStop(1, '#' + this.COLORS_HEX.BACKGROUND_MID.toString(16).padStart(6, '0'));
    
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, width, height);
            gradientCanvas.refresh();
        }
    
        this.background = this.add.image(0, 0, gradientTextureKey)
            .setOrigin(0)
            .setDisplaySize(width, height)
            .setDepth(-1);
    }

    createTitle() {
        // Create a title for entering username
        const titleStyle = {
            fontFamily: 'barcade3d',
            fontSize: '40px',
            color: this.COLORS_TEXT.PRIMARY,
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
            fontFamily: 'Nunito',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center'
        };

        this.add.text(
            this.cameras.main.centerX,
            140,
            'Enter your name for the leaderboard:',
            subtitleStyle
        ).setOrigin(0.5);
    }

    createInputField() {
        const width = this.cameras.main.width * 0.6;
        const height = 60;
        const x = this.cameras.main.centerX - width / 2;
        const y = this.cameras.main.centerY - 30;

        // Create input field background
        this.inputBg = this.add.graphics();
        this.inputBg.fillStyle(0xffffff, 1);
        this.inputBg.fillRoundedRect(x, y, width, height, 10);
        this.inputBg.lineStyle(3, this.COLORS_HEX.ACCENT, 1);
        this.inputBg.strokeRoundedRect(x, y, width, height, 10);

        // Create text field
        this.inputText = this.add.text(
            x + 20,
            y + height / 2,
            this.username || '',
            {
                fontFamily: 'Nunito',
                fontSize: '24px',
                color: '#000000'
            }
        ).setOrigin(0, 0.5);

        // Create cursor
        this.cursor = this.add.text(
            this.inputText.x + this.inputText.width + 2,
            y + height / 2,
            '|',
            {
                fontFamily: 'Nunito',
                fontSize: '24px',
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
        // Setup keyboard input for name entry
        this.input.keyboard.on('keydown', (event) => {
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
        });
    }

    createButtons() {
        // Create submit button
        this.submitButton = this.createButton(
            "SUBMIT",
            () => this.submitUsername(),
            this.cameras.main.centerX,
            this.cameras.main.centerY + 80
        );

        // Create skip button (anonymous)
        this.skipButton = this.createButton(
            "SKIP",
            () => this.skipUsername(),
            this.cameras.main.centerX,
            this.cameras.main.centerY + 140
        );
        
        // Add hover effects to buttons
        [this.submitButton, this.skipButton].forEach(button => {
            button.setInteractive()
                .on('pointerover', () => button.setScale(1.1))
                .on('pointerout', () => button.setScale(1));
        });
    }

    createButton(label, callback, centerX, centerY, options = {}) {
        return ButtonFactory.createButton(this, label, callback, centerX, centerY, options);
    }

    showCongratulations() {
        // Create celebration effects for high score
        this.createCelebrationEffect();
        
        // Show score value
        const scoreText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100,
            `Score: ${this.scoreData?.score || 0}`,
            {
                fontFamily: 'Nunito',
                fontSize: '32px',
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
        // Create particle emitters for celebration
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Left side confetti
        for (let i = 0; i < 20; i++) {
            const x = Phaser.Math.Between(0, width / 3);
            const y = -20;
            const size = Phaser.Math.Between(5, 15);
            const color = Phaser.Math.RND.pick([0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff]);
            
            const confetti = this.add.graphics();
            confetti.fillStyle(color, 0.8);
            confetti.fillRect(0, 0, size, size);
            confetti.rotation = Phaser.Math.Between(0, Math.PI * 2);
            confetti.setPosition(x, y);
            
            this.tweens.add({
                targets: confetti,
                x: x + Phaser.Math.Between(-100, 100),
                y: height + 50,
                rotation: Phaser.Math.Between(Math.PI * 4, Math.PI * 8),
                duration: Phaser.Math.Between(3000, 6000),
                delay: Phaser.Math.Between(0, 2000),
                ease: 'Quad.Out',
                onComplete: () => confetti.destroy()
            });
        }
        
        // Right side confetti
        for (let i = 0; i < 20; i++) {
            const x = Phaser.Math.Between(width * 2/3, width);
            const y = -20;
            const size = Phaser.Math.Between(5, 15);
            const color = Phaser.Math.RND.pick([0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff]);
            
            const confetti = this.add.graphics();
            confetti.fillStyle(color, 0.8);
            confetti.fillRect(0, 0, size, size);
            confetti.rotation = Phaser.Math.Between(0, Math.PI * 2);
            confetti.setPosition(x, y);
            
            this.tweens.add({
                targets: confetti,
                x: x + Phaser.Math.Between(-100, 100),
                y: height + 50,
                rotation: Phaser.Math.Between(Math.PI * 4, Math.PI * 8),
                duration: Phaser.Math.Between(3000, 6000),
                delay: Phaser.Math.Between(0, 2000),
                ease: 'Quad.Out',
                onComplete: () => confetti.destroy()
            });
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
                // Add console log to debug score data
                console.log("About to save score data:", JSON.stringify(this.scoreData));
                
                this.scoreData.username = username;
                // Make sure level is set in scoreData (in case it wasn't passed correctly)
                if (!this.scoreData.level && this.level) {
                    this.scoreData.level = this.level;
                }
                
                await saveHighScore(this.scoreData);
                
                // Navigate to leaderboard
                this.hideLoadingIndicator();
                this.scene.start('LeaderboardScene', {
                    mode: this.mode,
                    level: this.level,
                    
                });
            } catch (error) {
                console.error("Error saving high score:", error);
                this.hideLoadingIndicator();
                this.showErrorMessage();
            }
        } else {
            console.error("No score data found");
            this.hideLoadingIndicator();
            this.showErrorMessage();
        }
    }
    
    skipUsername() {
        // When user chooses to skip, don't save the score at all
        // and navigate directly to the leaderboard
        this.hideLoadingIndicator();
        this.scene.start('LeaderboardScene', {
            mode: this.mode,
            level: this.level,
            
        });
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
            fontFamily: 'Nunito',
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
    
    showErrorMessage() {
        const errorContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
        
        // Create a graphics object for the rounded rectangle background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.fillRoundedRect(-200, -100, 400, 200, 10);
        
        const text = this.add.text(0, -30, 'Error saving score', {
            fontFamily: 'Nunito',
            fontSize: '24px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        const subtext = this.add.text(0, 10, 'Please try again or continue without saving.', {
            fontFamily: 'Nunito',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        const okButton = this.createButton(
            "OK",
            () => {
                errorContainer.destroy();
                this.scene.start('LeaderboardScene', {
                    mode: this.mode,
                    previousScene: 'DoneScene'
                });
            },
            0, 60
        );
        
        errorContainer.add([bg, text, subtext, okButton]);
        errorContainer.setDepth(100);
    }
}
