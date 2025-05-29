import { DESIGN, EASY_COLORS_HEX, EASY_COLORS_TEXT, HARD_COLORS_HEX, HARD_COLORS_TEXT, THEMES } from "../config/design.js";
import { getTopScores } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import ToggleFactory from "../utils/ToggleFactory.js";
import { createBackground } from "../backgrounds/createBackground.js";

export default class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LeaderboardScene' });
        this.scores = [];
        this.mode = 'easy'; // Default mode
        this.leaderboardEntries = [];
        this.isLoading = false;
    }

    init(data) {
        this.mode = data.mode || 'easy';
        this.level = data.level || 1;
        //this.previousScene = data.previousScene || 'DoneScene';

        // Set colors based on mode
        if (this.mode === "easy") {
            this.COLORS_HEX = EASY_COLORS_HEX;
            this.COLORS_TEXT = EASY_COLORS_TEXT;
        } else {
            this.COLORS_HEX = HARD_COLORS_HEX;
            this.COLORS_TEXT = HARD_COLORS_TEXT;
        }
    }

    async create() {
        // Create background based on mode and level
        if (this.mode === "easy") {
            createBackground(this, THEMES.easy.background, this.level);
        } else {
            createBackground(this, THEMES.hard.background, this.level);
        }

        // Create title
        this.createTitle();

        // Create mode toggle
        this.createModeToggle();

        // Show loading indicator
        this.showLoadingIndicator();

        // Load scores
        await this.loadScores();

        // Hide loading indicator and show scores
        this.hideLoadingIndicator();
        this.displayScores();

        // Create back button
        this.createBackButton();
    }

    createBackgroundEffect() {
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        
        let gradientTextureKey = 'gradientLeaderboardBackground';
    
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
    
        this.tweens.add({
            targets: this.background,
            alpha: { from: 0.8, to: 1 },
            duration: 4000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }

    createTitle() {
        // Create a title for the leaderboard
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
            70,
            '(LEADERBOARD)',
            titleStyle
        ).setOrigin(0.5);
    }

    createModeToggle() {
        // Create a container for the toggle and labels
        this.modeToggleContainer = this.add.container(this.cameras.main.centerX, 140);
        
        // Add labels for the toggle
        const easyLabel = this.add.text(-50, 0, "EASY", {
            fontFamily: 'Nunito',
            fontSize: '20px',
            color: this.mode === 'easy' ? this.COLORS_TEXT.HIGHLIGHT : '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(1, 0.5);
        
        const hardLabel = this.add.text(50, 0, "HARD", {
            fontFamily: 'Nunito',
            fontSize: '20px',
            color: this.mode === 'hard' ? this.COLORS_TEXT.HIGHLIGHT : '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        
        // Create the toggle switch
        const toggleLeftX = -20; // Position relative to center
        this.modeToggle = ToggleFactory.createToggle(
            this,
            this.mode,
            this.changeMode.bind(this),
            toggleLeftX,
            0
        );
        
        // Add elements to the container
        this.modeToggleContainer.add([easyLabel, hardLabel, this.modeToggle]);
        
        // Update the label colors based on current mode
        this.updateModeLabels();
    }
    
    updateModeLabels() {
        // Update label colors based on the current mode
        const children = this.modeToggleContainer.getAll();
        
        // First child is the "EASY" label
        children[0].setColor(this.mode === 'easy' ? this.COLORS_TEXT.HIGHLIGHT : '#ffffff');
        
        // Second child is the "HARD" label
        children[1].setColor(this.mode === 'hard' ? this.COLORS_TEXT.HIGHLIGHT : '#ffffff');
    }

    createButton(label, callback, centerX, centerY, options = {}) {
        return ButtonFactory.createButton(this, label, callback, centerX, centerY, options);
    }

    async changeMode(mode) {
        if (this.mode === mode) return;
        this.mode = mode;

        // Clear existing scores
        this.clearScoreDisplay();

        // Show loading indicator
        this.showLoadingIndicator();

        // Load scores for the new mode
        await this.loadScores();

        // Hide loading and display new scores
        this.hideLoadingIndicator();
        this.displayScores();
        
        // Update the toggle labels to reflect the current mode
        this.updateModeLabels();
        
        // Make sure the toggle's visual state matches the mode
        if (this.modeToggle && this.modeToggle.updateState) {
            this.modeToggle.updateState(mode);
        }

        // Update UI colors based on mode
        if (this.mode === "easy") {
            this.COLORS_HEX = EASY_COLORS_HEX;
            this.COLORS_TEXT = EASY_COLORS_TEXT;
        } else {
            this.COLORS_HEX = HARD_COLORS_HEX;
            this.COLORS_TEXT = HARD_COLORS_TEXT;
        }

        // Recreate the background with the new colors and level
        if (this.mode === "easy") {
            createBackground(this, THEMES.easy.background, this.level);
        } else {
            createBackground(this, THEMES.hard.background, this.level);
        }
    }

    showLoadingIndicator() {
        this.isLoading = true;
        this.loadingText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'Loading scores...',
            {
                fontFamily: 'Nunito',
                fontSize: '24px',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        // Add a spinning animation
        this.tweens.add({
            targets: this.loadingText,
            rotation: Math.PI * 2,
            duration: 2000,
            repeat: -1
        });
    }

    hideLoadingIndicator() {
        this.isLoading = false;
        if (this.loadingText) {
            this.tweens.killTweensOf(this.loadingText);
            this.loadingText.destroy();
        }
    }

    async loadScores() {
        try {
            // Get scores for the current mode
            this.scores = await getTopScores(this.mode, 10);
            console.log("Loaded scores:", this.scores);
        } catch (error) {
            console.error("Error loading scores:", error);
            this.scores = [];
        }
    }

    clearScoreDisplay() {
        // Remove all existing score entries
        if (this.leaderboardEntries) {
            this.leaderboardEntries.forEach(entry => {
                if (entry.container) {
                    entry.container.destroy();
                }
            });
            this.leaderboardEntries = [];
        }

        // Remove table header if it exists
        if (this.tableHeader) {
            this.tableHeader.destroy();
        }

        // Remove no scores message if it exists
        if (this.noScoresText) {
            this.noScoresText.destroy();
        }
    }

    displayScores() {
        this.clearScoreDisplay();
        
        const startY = 200;
        const spacing = 45;
        const width = this.cameras.main.width * 0.8;
        
        // Create table header
        this.createTableHeader(startY, width);
        
        if (this.scores.length === 0) {
            this.noScoresText = this.add.text(
                this.cameras.main.centerX,
                startY + 100,
                'No scores yet. Be the first!',
                {
                    fontFamily: 'Nunito',
                    fontSize: '24px',
                    color: '#ffffff'
                }
            ).setOrigin(0.5);
            return;
        }
        
        // Create a container for each score entry with a staggered appearance
        this.scores.forEach((score, index) => {
            const y = startY + spacing * (index + 1);
            
            // Calculate the medal color (gold, silver, bronze for top 3)
            let medalColor;
            if (index === 0) medalColor = 0xFFD700;      // Gold
            else if (index === 1) medalColor = 0xC0C0C0;  // Silver
            else if (index === 2) medalColor = 0xCD7F32;  // Bronze
            else medalColor = 0x444444;                   // Dark gray for the rest
            
            // Create the entry container
            const container = this.createScoreEntry(index + 1, score, y, width, medalColor);
            
            // Add entry animation
            container.setAlpha(0);
            this.tweens.add({
                targets: container,
                alpha: 1,
                y: y,
                duration: 200,
                delay: index * 100,
                ease: 'Power1'
            });
            
            this.leaderboardEntries.push({ score, container });
        });
    }

    createTableHeader(y, width) {
        const padding = 20;
        const boxHeight = 40;

        // Create a rounded rectangle for the header background
        const headerGraphics = this.add.graphics();
        headerGraphics.fillStyle(this.COLORS_HEX.ACCENT, 0.7);
        headerGraphics.fillRoundedRect(
            this.cameras.main.centerX - width / 2,
            y,
            width,
            boxHeight,
            8
        );
        headerGraphics.lineStyle(2, 0xffffff, 0.8);
        headerGraphics.strokeRoundedRect(
            this.cameras.main.centerX - width / 2,
            y,
            width,
            boxHeight,
            8
        );

        // Create column headers
        const headerStyle = {
            fontFamily: 'Nunito',
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold'
        };

        const rankText = this.add.text(
            this.cameras.main.centerX - width / 2 + padding + 10,
            y + boxHeight / 2,
            'RANK',
            headerStyle
        ).setOrigin(0, 0.5);

        const nameText = this.add.text(
            this.cameras.main.centerX - width / 2 + padding + 80,
            y + boxHeight / 2,
            'NAME',
            headerStyle
        ).setOrigin(0, 0.5);

        const levelText = this.add.text(
            this.cameras.main.centerX - 50,
            y + boxHeight / 2,
            'LEVEL',
            headerStyle
        ).setOrigin(0, 0.5);

        const scoreText = this.add.text(
            this.cameras.main.centerX + 50,
            y + boxHeight / 2,
            'SCORE',
            headerStyle
        ).setOrigin(0, 0.5);

        const dateText = this.add.text(
            this.cameras.main.centerX + width / 2 - padding - 10,
            y + boxHeight / 2,
            'DATE',
            headerStyle
        ).setOrigin(1, 0.5);

        // Store the header elements in a container
        this.tableHeader = this.add.container(0, 0, [
            headerGraphics,
            rankText,
            nameText,
            levelText,
            scoreText,
            dateText
        ]);
    }

    createScoreEntry(rank, score, y, width, medalColor) {
        const padding = 20;
        const boxHeight = 40;
        
        // Create container to hold all the elements
        const container = this.add.container(0, y);
        
        // Create row background
        const rowBg = this.add.graphics();
        rowBg.fillStyle(this.COLORS_HEX.BOX_FILL, 0.3);
        rowBg.fillRoundedRect(
            this.cameras.main.centerX - width / 2,
            0,
            width,
            boxHeight,
            8
        );
        
        // Add subtle glow effect for top ranks
        if (rank <= 3) {
            rowBg.lineStyle(2, medalColor, 0.8);
            rowBg.strokeRoundedRect(
                this.cameras.main.centerX - width / 2,
                0,
                width,
                boxHeight,
                8
            );
        }
        
        container.add(rowBg);
        
        // Format date
        const date = new Date(score.timestamp);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
        
        // Add rank with medal
        const rankText = this.add.text(
            this.cameras.main.centerX - width / 2 + padding + 10,
            boxHeight / 2,
            `${rank}`,
            {
                fontFamily: 'Nunito',
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0, 0.5);
        container.add(rankText);
        
        // Add medal icon for top 3
        if (rank <= 3) {
            const medalIcon = this.add.graphics();
            medalIcon.fillStyle(medalColor, 1);
            medalIcon.fillCircle(
                this.cameras.main.centerX - width / 2 + padding + 30, 
                boxHeight / 2,
                8
            );
            medalIcon.lineStyle(1, 0xffffff, 0.8);
            medalIcon.strokeCircle(
                this.cameras.main.centerX - width / 2 + padding + 30,
                boxHeight / 2,
                8
            );
            container.add(medalIcon);
        }
        
        // Add username
        const nameText = this.add.text(
            this.cameras.main.centerX - width / 2 + padding + 80,
            boxHeight / 2,
            score.username || "Anonymous Player",
            {
                fontFamily: 'Nunito',
                fontSize: '18px',
                color: '#ffffff'
            }
        ).setOrigin(0, 0.5);
        container.add(nameText);
        
        // Add level with special styling
        const levelValue = score.level || 1;
        const levelColor = this.getLevelColor(levelValue);
        const levelText = this.add.text(
            this.cameras.main.centerX - 50,
            boxHeight / 2,
            `${levelValue}`,
            {
                fontFamily: 'Nunito',
                fontSize: '18px',
                color: levelColor,
                fontStyle: 'bold'
            }
        ).setOrigin(0, 0.5);
        container.add(levelText);
        
        // Add score
        const scoreText = this.add.text(
            this.cameras.main.centerX + 50,
            boxHeight / 2,
            `${score.score}`,
            {
                fontFamily: 'Nunito',
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0, 0.5);
        container.add(scoreText);
        
        // Add date
        const dateText = this.add.text(
            this.cameras.main.centerX + width / 2 - padding - 10,
            boxHeight / 2,
            formattedDate,
            {
                fontFamily: 'Nunito',
                fontSize: '16px',
                color: '#cccccc'
            }
        ).setOrigin(1, 0.5);
        container.add(dateText);
        
        // Make row interactive
        rowBg.setInteractive(
            new Phaser.Geom.Rectangle(
                this.cameras.main.centerX - width / 2,
                0,
                width,
                boxHeight
            ),
            Phaser.Geom.Rectangle.Contains
        )
        .on('pointerover', () => {
            rowBg.clear();
            rowBg.fillStyle(this.COLORS_HEX.BOX_FILL, 0.6);
            rowBg.fillRoundedRect(
                this.cameras.main.centerX - width / 2,
                0,
                width,
                boxHeight,
                8
            );
            if (rank <= 3) {
                rowBg.lineStyle(2, medalColor, 1);
                rowBg.strokeRoundedRect(
                    this.cameras.main.centerX - width / 2,
                    0,
                    width,
                    boxHeight,
                    8
                );
            }
        })
        .on('pointerout', () => {
            rowBg.clear();
            rowBg.fillStyle(this.COLORS_HEX.BOX_FILL, 0.3);
            rowBg.fillRoundedRect(
                this.cameras.main.centerX - width / 2,
                0,
                width,
                boxHeight,
                8
            );
            if (rank <= 3) {
                rowBg.lineStyle(2, medalColor, 0.8);
                rowBg.strokeRoundedRect(
                    this.cameras.main.centerX - width / 2,
                    0,
                    width,
                    boxHeight,
                    8
                );
            }
        })
        .on('pointerdown', () => {
            this.showScoreDetails(score);
        });
        
        return container;
    }

    showScoreDetails(score) {
        // Create a modal popup with more score details
        if (this.detailsModal) {
            this.detailsModal.destroy();
        }
        
        const width = this.cameras.main.width * 0.7;
        // Start with a minimum height - will adjust based on content
        let minHeight = this.cameras.main.height * 0.6;
        const x = this.cameras.main.centerX - width / 2;
        const y = this.cameras.main.centerY - minHeight / 2;
        
        // Container for all modal elements
        this.detailsModal = this.add.container(0, 0);
        
        // Add dark overlay
        const overlay = this.add.rectangle(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000, 0.7
        ).setOrigin(0);
        
        // We'll create the background after measuring content
        let modalBg;
        
        // Add title
        const titleText = this.add.text(
            this.cameras.main.centerX,
            y + 30,
            'Score Details',
            {
                fontFamily: 'Nunito',
                fontSize: '28px',
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        
        // Format date
        const date = new Date(score.timestamp);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
        const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        console.log("Score: ", score);
        // Create score details content
        const details = [
            { label: "Player:", value: score.username || "Anonymous Player" },
            { label: "Score:", value: score.score },
            { label: "Level:", value: score.level || 1, customColor: this.getLevelColor(score.level || 1) },
            { label: "Mode:", value: score.mode === 'easy' ? 'Easy' : 'Hard' },
            { label: "Prompt:", value: score.prompt || "No prompt available", isLongText: true },
            { label: "Input Text:", value: score.inputText || "No input text available", isLongText: true },
            { label: "Original Words:", value: score.originalWordCount || 0 },
            { label: "AI Words Used:", value: score.aiWordCount || 0 },
            { label: "Total Words:", value: score.wordCount || 0 },
            { label: "Date:", value: `${formattedDate} at ${formattedTime}` }
        ];
        
        // Calculate available width for text wrapping
        const textWrapWidth = width - 270; // Space for the value text considering margins
        
        const detailsContainer = this.add.container(0, 0);
        let currentY = y + 100;
        
        details.forEach((detail) => {
            // Configure text style with word wrap for value text
            const textStyle = {
                fontFamily: 'Nunito',
                fontSize: '18px',
                color: detail.customColor || '#ffffff',
                fontStyle: 'bold',
                wordWrap: { width: textWrapWidth, useAdvancedWrap: true }
            };
            
            // Create value text first to measure its height
            const valueText = this.add.text(
                x + 220,
                0, // Temporary y-position, will adjust based on alignment
                detail.value.toString(),
                textStyle
            ).setOrigin(0, 0); // Top-left aligned
            
            // Determine if this will be a multi-line text based on width vs available space
            const isMultiLine = valueText.width > textWrapWidth || detail.isLongText;
            
            // Calculate label Y position based on whether value is multi-line
            const labelY = isMultiLine ? currentY : currentY;
            
            // Create label text
            const labelText = this.add.text(
                x + 50,
                labelY,
                detail.label,
                {
                    fontFamily: 'Nunito',
                    fontSize: '18px',
                    color: '#cccccc'
                }
            ).setOrigin(0, 0); // Top-left aligned to match valueText
            
            // Position value text at the same y as the label (top-aligned)
            valueText.setY(labelY);
            
            detailsContainer.add([labelText, valueText]);
            
            // For both regular and long text fields, spacing is determined by:
            // 1. The height of the value text (to accommodate wrapping)
            // 2. A consistent padding between rows (40px for all fields)
            
            // Get the actual height of the value text (minimum 20px)
            const textHeight = Math.max(valueText.height, 20);
            
            // For all fields, use the text height plus standard spacing
            currentY += textHeight + 20; // 20px consistent padding between all rows
        });
        
        // Calculate the actual height needed based on content
        // Add extra space for the title at the top and close button at the bottom
        const contentHeight = currentY - y;  // currentY now contains the bottom of the content
        const totalHeight = Math.max(minHeight, contentHeight + 120); // 80px for title + bottom padding
        
        // Create modal background with the calculated height
        modalBg = this.add.graphics();
        modalBg.fillStyle(this.COLORS_HEX.BACKGROUND, 0.95);
        modalBg.fillRoundedRect(x, y, width, totalHeight, 16);
        modalBg.lineStyle(3, this.COLORS_HEX.ACCENT, 1);
        modalBg.strokeRoundedRect(x, y, width, totalHeight, 16);
        
        // Add close button at the bottom of the modal
        const closeButton = this.createButton(
            "CLOSE",
            () => {
                this.tweens.add({
                    targets: this.detailsModal,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => this.detailsModal.destroy()
                });
            },
            this.cameras.main.centerX,
            y + totalHeight - 40 // Position from the bottom of the new calculated height
        );
        
        // Add elements to modal container
        this.detailsModal.add([
            overlay,
            modalBg,
            titleText,
            detailsContainer,
            closeButton
        ]);
        
        // Animation for modal appearance
        this.detailsModal.setScale(0.8);
        this.detailsModal.setAlpha(0);
        this.tweens.add({
            targets: this.detailsModal,
            scale: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.Out'
        });
        
        // Make overlay interactive to close on click outside
        overlay.setInteractive()
            .on('pointerdown', () => {
                this.tweens.add({
                    targets: this.detailsModal,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => this.detailsModal.destroy()
                });
            });
    }

    createBackButton() {
        const button = this.createButton(
            "DONE",
            () => this.goBack(),
            this.cameras.main.width / 2,
            this.cameras.main.height - 60
        );
        
        // Add hover effect
        button.setInteractive()
            .on('pointerover', () => button.setScale(1.1))
            .on('pointerout', () => button.setScale(1));
            
        return button;
    }

    // Helper method to get color based on level
    getLevelColor(level) {
        switch(Number(level)) {
            case 1:
                return '#42f5a1'; // Light green
            case 2:
                return '#42c5f5'; // Light blue
            case 3:
                return '#f542c5'; // Pink
            default:
                return '#ffffff'; // White
        }
    }
    
    goBack() {
        // Prepare reset data for game scene, preserving level but resetting progress
        const resetData = {
            progressPercentage: 50, // Reset to initial value
            levelValue: this.level, // Preserve current level
            wordCount: 0,
            originalWordCount: 0,
            aiWordCount: 0,
            totalWordCount: 0,
            requiresReset: true // Flag to indicate this is a reset from LeaderboardScene
        };
        
        if (this.mode == 'easy')
            this.scene.start('GameSceneEasy', resetData);
        else
            this.scene.start('GameSceneHard', resetData);
    }
}
