import { DESIGN, EASY_COLORS_HEX as COLORS_HEX, EASY_COLORS_TEXT as COLORS_TEXT } from "../config/design.js";
import ToggleFactory from "../utils/ToggleFactory.js";
import BaseGameScene from "./BaseGameScene.js";

//this.colors_hex, this.colors_text, 

export default class GameSceneEasy extends BaseGameScene {
    constructor() {
        super({ key: 'GameSceneEasy' });
        this.mode = 'easy';
        // Get design configuration for easy mode
        this.design = DESIGN.UI;
        console.log('Design UI:', this.design);
        // Extract needed values for easier access
        this.COLORS_HEX = COLORS_HEX;
        this.COLORS_TEXT = COLORS_TEXT;
        console.log('Easy Mode Colors:', {
            accent: this.COLORS_HEX.ACCENT,
            background: this.COLORS_HEX.BACKGROUND,
            text: this.COLORS_HEX.TEXT
        });
        this.OUTLINE_WIDTH = this.design.OUTLINE.WIDTH;
        this.CORNER_RADIUS = this.design.OUTLINE.CORNER_RADIUS;
    }

    // Mode-specific word processing
    processSuggestedWord(word) {
        // In easy mode, we still allow the word but don't add it again
        // since it was already added in checkAndExplodeWord
        this.updateCursor();
    }

    

    onFeedbackClick() {
        this.scene.start('FeedbackScene', {mode: this.mode});
    }

    // Mode-specific scene setup
    create(data) {
        // Log the data received from other mode for debugging
        console.log("GameSceneEasy received data:", data);
        
        super.create && super.create();
        
        // Apply data passed from other modes if available
        if (data && data.progressPercentage !== undefined) {
            this.progressPercentage = data.progressPercentage;
            console.log("Setting progress percentage to:", this.progressPercentage);
        }
        if (data && data.levelValue !== undefined) {
            this.levelValue = data.levelValue;
        }
        if (data && data.topKValue !== undefined) {
            this.topKValue = data.topKValue;
        }
        if (data && data.originalWordCount !== undefined) {
            this.originalWordCount = data.originalWordCount;
        }
        if (data && data.aiWordCount !== undefined) {
            this.aiWordCount = data.aiWordCount;
        }
        if (data && data.totalWordCount !== undefined) {
            this.totalWordCount = data.totalWordCount;
        }
        if (data && data.wordCount !== undefined) {
            this.wordCount = data.wordCount;
        }
        
        this.cameras.main.scrollY = 0;
        this.createEasyModeBackground();
        this.createFloatingParticles();
        this.createMenuBar();
        this.createPromptTextBox();
        this.createInputTextBox();
        this.updatePromptBasedOnLevel();

        const inputBoxX = this.cameras.main.centerX;
        const inputBoxY = this.cameras.main.centerY;
        const inputBoxWidth = this.cameras.main.width * (5 / 6);
        const inputBoxHeight = 240;
        const buttonCenterX = inputBoxX + inputBoxWidth / 2 - this.design.BUTTON.WIDTH - 20;
        const buttonCenterY = inputBoxY + inputBoxHeight / 2 + this.design.BUTTON.SPACING;
        const padding = 20;

        // Create buttons with tooltips
        this.doneButton = this.createButton(
            "DONE", 
            () => this.onDoneButtonClick(), 
            buttonCenterX, 
            buttonCenterY,
            'Submit your text for evaluation'
        );
        
        this.resetButton = this.createButton(
            "RESET", 
            () => this.onResetButtonClick(), 
            buttonCenterX - 120, 
            buttonCenterY,
            'Clear text and start over'
        );
        

        this.feedbackButton = this.createButton(
            "FEEDBACK", 
            () => this.onFeedbackClick(), 
            this.design.BUTTON.WIDTH / 2 + padding, 
            this.cameras.main.height - this.design.BUTTON.HEIGHT / 2 - padding,
            'Share your feedback'
        );
        
        // Create a mode toggle switch in the top left where the indicator was
        this.modeToggle = ToggleFactory.createToggle(
            this,
            this.mode,
            (newMode) => this.scene.start('GameSceneHard', { // Switch to hard mode
                progressPercentage: this.progressPercentage,
                levelValue: this.levelValue,
                topKValue: this.topKValue,
                originalWordCount: this.originalWordCount,
                aiWordCount: this.aiWordCount,
                totalWordCount: this.totalWordCount,
                wordCount: this.wordCount
            }),
            padding,
            this.menuBarHeight + padding
        );

        // Initialize the progress bar with the percentage passed from the other mode
        this.createFailsCounter();
        console.log("EasyMode: Created fails counter with progress:", this.progressPercentage);
        this.updateProgressFill();
        

        
        // Create word count display
        this.createWordCountDisplay();
        
        this.inputActive = false;
        this.addButtonClickEffects();
        this.ensureProperLayering();
        this.ensureTextVisibility();
        this.updateCursor();
        
        // (Mode indicator replaced by toggle)
    }

    // Style methods
    getPromptTextStyle() {
        return {
            fontFamily: "Nunito",
            fontSize: "22px",
            fill: this.COLORS_TEXT.PRIMARY,
            align: "center",
            lineSpacing: 6
        };
    }

    getPromptBoxStyle() {
        return {
            fillColor: this.COLORS_HEX.BACKGROUND,
            fillAlpha: 0.8,
            hasOutline: true,
            outlineWidth: this.OUTLINE_WIDTH,
            outlineColor: this.COLORS_HEX.BOX_OUTLINE,
            cornerRadius: this.CORNER_RADIUS
        };
    }

    getInputBoxStyle() {
        return {
            fillColor: this.COLORS_HEX.TEXT,
            fillAlpha: 0.95,
            hasOutline: true,
            outlineWidth: this.OUTLINE_WIDTH,
            outlineColor: this.COLORS_HEX.ACCENT,
            cornerRadius: this.CORNER_RADIUS
        };
    }

    getInputTextStyle() {
        return {
            fontFamily: "Nunito",
            fontSize: "22px",
            fill: "#000",
            align: "left",
            lineSpacing: 6,
            wordWrap: { width: this.uiBoxWidth - 60 } // Add word wrap
        };
    }

    getAutocompleteTextStyle() {
        return {
            fontFamily: "Nunito",
            fontSize: "22px",
            fill: "#ff0000",
            align: "left",
            alpha: 0.7, // Make slightly transparent
            wordWrap: { width: this.uiBoxWidth - 60 } // Add word wrap
        };
    }

    getMenuBarStyle() {
        return {
            backgroundColor: this.COLORS_HEX.BACKGROUND,
            borderColor: this.COLORS_HEX.ACCENT,
            borderWidth: this.OUTLINE_WIDTH,
            titleStyle: {
                fontFamily: 'barcade3d',
                fontSize: '50px',
                color: this.COLORS_TEXT.TITLE,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000',
                    blur: 2,
                    fill: true
                }
            }
        };
    }

    // Mode-specific background methods
    createEasyModeBackground() {
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        
        // Create a gradient texture key based on the current level
        let gradientTextureKey = `easyModeBackground_level_${this.levelValue}`;
    
        if (!this.textures.exists(gradientTextureKey)) {
            let gradientCanvas = this.textures.createCanvas(gradientTextureKey, width, height);
            let ctx = gradientCanvas.getContext();
    
            if (!ctx) {
                console.error("Failed to get canvas context for background effect.");
                return;
            }
    
            // Create level-specific backgrounds
            if (this.levelValue === 1) {
                // Level 1: Calm Ocean Depths
                const gradient = ctx.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, "#001620");    // Deep ocean blue
                gradient.addColorStop(0.3, "#002435");  // Midnight ocean
                gradient.addColorStop(0.7, "#003450");  // Ocean blue
                gradient.addColorStop(1, "#004565");    // Teal blue
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
                
                // Add gentle waves
                for (let i = 0; i < 8; i++) {
                    const waveGradient = ctx.createLinearGradient(0, 0, width, 0);
                    waveGradient.addColorStop(0, `rgba(0, 22, 32, ${0.15 - i * 0.015})`);   // Deep ocean
                    waveGradient.addColorStop(0.5, `rgba(0, 69, 101, ${0.2 - i * 0.015})`); // Bright ocean
                    waveGradient.addColorStop(1, `rgba(0, 22, 32, ${0.15 - i * 0.015})`);   // Deep ocean
                    
                    ctx.strokeStyle = waveGradient;
                    ctx.lineWidth = 2;
                    
                    const yOffset = height * (i / 8);
                    ctx.beginPath();
                    for (let x = 0; x < width; x++) {
                        const y = yOffset + Math.sin(x * 0.01 + i) * 20;
                        if (x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
                
                // Add soft glow areas
                const glowPoints = [
                    { x: width * 0.2, y: height * 0.3, size: 200 },
                    { x: width * 0.8, y: height * 0.4, size: 180 },
                    { x: width * 0.3, y: height * 0.7, size: 220 }
                ];
                
                glowPoints.forEach(point => {
                    const glow = ctx.createRadialGradient(
                        point.x, point.y, 0,
                        point.x, point.y, point.size
                    );
                    glow.addColorStop(0, 'rgba(0, 229, 255, 0.12)');   // Bright teal
                    glow.addColorStop(0.5, 'rgba(0, 69, 101, 0.06)');  // Ocean blue
                    glow.addColorStop(1, 'rgba(0, 22, 32, 0)');        // Fade out
                    
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
                    ctx.fill();
                });
            } else if (this.levelValue === 2) {
                // Level 2: Ethereal Currents
                const centerX = width/2;
                const centerY = height/2;
                
                const baseGradient = ctx.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, Math.max(width, height)
                );
                baseGradient.addColorStop(0, "#002435");  // Midnight ocean
                baseGradient.addColorStop(0.4, "#003450"); // Ocean blue
                baseGradient.addColorStop(0.7, "#004565"); // Teal blue
                baseGradient.addColorStop(1, "#001620");  // Deep ocean
                
                ctx.fillStyle = baseGradient;
                ctx.fillRect(0, 0, width, height);
                
                // Define radius for both currents and orbs
                const radius = Math.min(width, height) * 0.4;
                
                // Add flowing currents
                for (let i = 0; i < 12; i++) {
                    const angle = (Math.PI * 2 * i) / 12;
                    const curve = new Path2D();
                    curve.moveTo(centerX, centerY);
                    curve.quadraticCurveTo(
                        centerX + Math.cos(angle) * radius * 0.5,
                        centerY + Math.sin(angle) * radius * 0.5,
                        centerX + Math.cos(angle) * radius,
                        centerY + Math.sin(angle) * radius
                    );
                    
                    const currentGradient = ctx.createLinearGradient(
                        centerX, centerY,
                        centerX + Math.cos(angle) * radius,
                        centerY + Math.sin(angle) * radius
                    );
                    currentGradient.addColorStop(0, 'rgba(0, 229, 255, 0.15)');   // Bright teal
                    currentGradient.addColorStop(1, 'rgba(0, 69, 101, 0)');       // Fade to ocean
                    
                    ctx.strokeStyle = currentGradient;
                    ctx.lineWidth = 15;
                    ctx.stroke(curve);
                }
                
                // Add ethereal orbs
                for (let i = 0; i < 5; i++) {
                    const x = centerX + Math.cos(i * Math.PI * 0.4) * radius * 0.6;
                    const y = centerY + Math.sin(i * Math.PI * 0.4) * radius * 0.6;
                    
                    const orbGradient = ctx.createRadialGradient(x, y, 0, x, y, 80);
                    orbGradient.addColorStop(0, 'rgba(0, 255, 255, 0.18)');  // Glowing teal
                    orbGradient.addColorStop(0.5, 'rgba(0, 229, 255, 0.12)');  // Bright teal
                    orbGradient.addColorStop(1, 'rgba(0, 69, 101, 0)');        // Fade to ocean
                    
                    ctx.fillStyle = orbGradient;
                    ctx.beginPath();
                    ctx.arc(x, y, 80, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else { // Level 3
                // Level 3: Luminous Depths
                const centerX = width/2;
                const centerY = height/2;
                
                // Create base gradient with subtle movement
                const baseGradient = ctx.createConicGradient(0, centerX, centerY);
                baseGradient.addColorStop(0, "#001620");    // Deep ocean
                baseGradient.addColorStop(0.25, "#002435"); // Midnight ocean
                baseGradient.addColorStop(0.5, "#003450");  // Ocean blue
                baseGradient.addColorStop(0.75, "#004565"); // Teal blue
                baseGradient.addColorStop(1, "#001620");    // Deep ocean
                
                ctx.fillStyle = baseGradient;
                ctx.fillRect(0, 0, width, height);
                
                // Add luminous rings
                for (let i = 0; i < 4; i++) {
                    const ringGradient = ctx.createRadialGradient(
                        centerX, centerY, Math.max(width, height) * (i * 0.2),
                        centerX, centerY, Math.max(width, height) * (i * 0.2 + 0.15)
                    );
                    ringGradient.addColorStop(0, `rgba(0, 229, 255, ${0.15 - i * 0.025})`);  // Bright teal
                    ringGradient.addColorStop(0.5, `rgba(0, 69, 101, ${0.12 - i * 0.025})`); // Ocean blue
                    ringGradient.addColorStop(1, 'rgba(0, 22, 32, 0)');                      // Fade out
                    
                    ctx.fillStyle = ringGradient;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, Math.max(width, height) * (i * 0.2 + 0.15), 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Add luminous paths
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i) / 8;
                    const path = new Path2D();
                    
                    path.moveTo(centerX, centerY);
                    path.lineTo(
                        centerX + Math.cos(angle) * width,
                        centerY + Math.sin(angle) * height
                    );
                    
                    const pathGradient = ctx.createLinearGradient(
                        centerX, centerY,
                        centerX + Math.cos(angle) * width * 0.5,
                        centerY + Math.sin(angle) * height * 0.5
                    );
                    pathGradient.addColorStop(0, 'rgba(0, 255, 255, 0.12)');   // Glowing teal
                    pathGradient.addColorStop(1, 'rgba(0, 69, 101, 0)');       // Fade to ocean
                    
                    ctx.strokeStyle = pathGradient;
                    ctx.lineWidth = 10;
                    ctx.stroke(path);
                }
            }
            
            // Add common effects
            this.addEnhancedNoise(ctx, width, height, 0.02);
            
            gradientCanvas.refresh();
        }
    
        this.background = this.add.image(0, 0, gradientTextureKey)
            .setOrigin(0)
            .setDisplaySize(width, height)
            .setDepth(-1);
    
        // Smoother, more subtle animations
        this.tweens.add({
            targets: this.background,
            alpha: { from: 0.95, to: 1 },
            duration: 8000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        this.tweens.add({
            targets: this.background,
            scaleX: { from: 1, to: 1.02 },
            scaleY: { from: 1, to: 1.02 },
            duration: 12000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }

    addSoftGlow(ctx, width, height) {
        const glowPoints = [
            { x: width * 0.2, y: height * 0.2, size: 200 },
            { x: width * 0.8, y: height * 0.3, size: 180 },
            { x: width * 0.3, y: height * 0.7, size: 220 },
            { x: width * 0.7, y: height * 0.8, size: 190 },
            { x: width * 0.5, y: height * 0.5, size: 250 }
        ];

        glowPoints.forEach(point => {
            const glow = ctx.createRadialGradient(
                point.x, point.y, 0,
                point.x, point.y, point.size
            );
            glow.addColorStop(0, 'rgba(2, 5, 29, 0.15)');   // Deep midnight blue
            glow.addColorStop(0.5, 'rgba(3, 6, 45, 0.1)');  // Dark navy
            glow.addColorStop(1, 'rgba(1, 2, 19, 0)');      // Transparent nearly black

            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    addFlowingPatterns(ctx, width, height) {
        const patternCount = 8;
        for (let i = 0; i < patternCount; i++) {
            const startX = Math.random() * width;
            const startY = Math.random() * height;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            // Create flowing curve
            const cp1x = startX + Math.random() * 200 - 100;
            const cp1y = startY + Math.random() * 200 - 100;
            const cp2x = startX + Math.random() * 200 - 100;
            const cp2y = startY + Math.random() * 200 - 100;
            const endX = startX + Math.random() * 200 - 100;
            const endY = startY + Math.random() * 200 - 100;
            
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            
            const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, 'rgba(2, 5, 29, 0.05)');   // Deep midnight blue
            gradient.addColorStop(1, 'rgba(5, 26, 47, 0.03)');  // Dark teal-navy
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = Math.random() * 3 + 1;
            ctx.stroke();
        }
    }
    
    addEnhancedNoise(ctx, width, height, opacity) {
        for (let x = 0; x < width; x += 3) {
            for (let y = 0; y < height; y += 3) {
                if (Math.random() > 0.95) {  // Reduce frequency
                    const alpha = Math.random() * (opacity * 0.3);  // Reduce opacity
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }
    
    addModerateDensityParticles(ctx, width, height) {
        for (let i = 0; i < 85; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 1.8 + 0.4;
            const alpha = Math.random() * 0.2 + 0.1;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    addSubtleGlowAreas(ctx, width, height) {
        const glowPositions = [
            {x: width * 0.2, y: height * 0.2, size: 120, color: [2, 5, 29]},    // Deep midnight blue
            {x: width * 0.8, y: height * 0.3, size: 150, color: [3, 6, 45]},    // Dark navy
            {x: width * 0.3, y: height * 0.7, size: 130, color: [5, 26, 47]},   // Dark teal-navy
            {x: width * 0.7, y: height * 0.8, size: 140, color: [1, 2, 19]},    // Nearly black
            {x: width * 0.5, y: height * 0.5, size: 180, color: [2, 5, 29]},    // Deep midnight blue
        ];
        
        glowPositions.forEach(glow => {
            const alpha = Math.random() * 0.06 + 0.04;
            
            const gradientGlow = ctx.createRadialGradient(
                glow.x, glow.y, 0, 
                glow.x, glow.y, glow.size
            );
            gradientGlow.addColorStop(0, `rgba(${glow.color[0]}, ${glow.color[1]}, ${glow.color[2]}, ${alpha})`);
            gradientGlow.addColorStop(1, `rgba(${glow.color[0]}, ${glow.color[1]}, ${glow.color[2]}, 0)`);
            
            ctx.fillStyle = gradientGlow;
            ctx.beginPath();
            ctx.arc(glow.x, glow.y, glow.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Update background when level changes
    updateBackgroundForLevel() {
        
        // Destroy existing background
        if (this.background) {
            this.background.destroy();
        }
        
        // Recreate background with the current level colors
        this.createEasyModeBackground();
        
        // Update mode indicator badge if it exists
        if (this.modeIndicator) {
            this.modeIndicator.destroy();
        }
        
        // Recreate mode indicator with current level styling
        //this.addModeIndicator('EASY', 0x64d2ba);
    }
    
    createFloatingParticles() {
        if (this.particleContainer) {
            this.particleContainer.destroy();
        }
        this.particleContainer = this.add.container(0, 0);
        this.particleContainer.setDepth(-0.5);

        // Level-specific particle configurations
        const levelConfigs = {
            1: {
                count: 24,
                baseSize: { min: 0.3, max: 0.8 },
                alpha: { min: 0.1, max: 0.2 },
                movement: {
                    range: 40,
                    duration: { min: 8000, max: 12000 }
                },
                colors: {
                    core: 0x00ced1,
                    mid: 0x3a9ea1,
                    outer: 0x1a4547
                }
            },
            2: {
                count: 36,
                baseSize: { min: 0.4, max: 1.2 },
                alpha: { min: 0.15, max: 0.25 },
                movement: {
                    range: 80,
                    duration: { min: 6000, max: 9000 }
                },
                colors: {
                    core: 0x00e5e8,
                    mid: 0x45b5b7,
                    outer: 0x256668
                }
            },
            3: {
                count: 48,
                baseSize: { min: 0.5, max: 1.5 },
                alpha: { min: 0.2, max: 0.3 },
                movement: {
                    range: 120,
                    duration: { min: 4000, max: 7000 }
                },
                colors: {
                    core: 0x00ffff,
                    mid: 0x50c8c8,
                    outer: 0x307777
                }
            }
        };

        const config = levelConfigs[this.levelValue];
        
        // Create particles based on level configuration
        for (let i = 0; i < config.count; i++) {
            const x = Math.random() * this.cameras.main.width;
            const y = Math.random() * this.cameras.main.height;
            const baseSize = Math.random() * (config.baseSize.max - config.baseSize.min) + config.baseSize.min;
            const alpha = Math.random() * (config.alpha.max - config.alpha.min) + config.alpha.min;
            
            const particleGroup = this.add.container(x, y);
            
            // Create particle layers with level-specific colors
            const core = this.add.graphics();
            core.fillStyle(config.colors.core, alpha);
            core.fillCircle(0, 0, baseSize);
            
            const layers = [];
            const layerCount = 6;
            for (let j = 0; j < layerCount; j++) {
                const layer = this.add.graphics();
                const layerSize = baseSize * Math.pow(2, j + 2);
                const layerAlpha = alpha * (1 - (j / layerCount));
                
                if (j < layerCount / 2) {
                    layer.fillStyle(config.colors.mid, layerAlpha);
                } else {
                    layer.fillStyle(config.colors.outer, layerAlpha);
                }
                
                layer.fillCircle(0, 0, layerSize);
                layers.unshift(layer);
            }
            
            particleGroup.add([...layers, core]);
            this.particleContainer.add(particleGroup);
            
            // Level-specific movement patterns
            const baseDelay = Math.random() * 1000;
            const range = config.movement.range;
            const duration = Math.random() * (config.movement.duration.max - config.movement.duration.min) + config.movement.duration.min;
            
            // Vertical movement
            this.tweens.add({
                targets: particleGroup,
                y: y + (Math.random() * range - range/2),
                duration: duration,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: baseDelay
            });
            
            // Horizontal movement
            this.tweens.add({
                targets: particleGroup,
                x: x + (Math.random() * range - range/2),
                duration: duration * 1.2,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: baseDelay
            });
            
            // Rotation (only in higher levels)
            if (this.levelValue > 1) {
                this.tweens.add({
                    targets: particleGroup,
                    angle: { from: -5, to: 5 },
                    duration: duration * 0.8,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.InOut',
                    delay: baseDelay
                });
            }
            
            // Scale pulsing
            const pulseConfig = {
                targets: particleGroup,
                scaleX: { from: 1, to: 1.1 },
                scaleY: { from: 1, to: 1.1 },
                duration: duration,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: baseDelay
            };
            
            // More intense pulsing for higher levels
            if (this.levelValue > 1) {
                pulseConfig.scaleX.to = 1.2;
                pulseConfig.scaleY.to = 1.2;
                pulseConfig.duration *= 0.8;
            }
            
            this.tweens.add(pulseConfig);
        }

        // Add bubble effects for higher levels
        if (this.levelValue > 1) {
            this.createBubbleEffects();
        }
    }

    createBubbleEffects() {
        const bubbleCount = this.levelValue === 2 ? 15 : 25;
        
        for (let i = 0; i < bubbleCount; i++) {
            const x = Math.random() * this.cameras.main.width;
            const y = this.cameras.main.height + 50;
            const size = Math.random() * (this.levelValue === 2 ? 8 : 12) + 4;
            
            const bubble = this.add.graphics();
            bubble.lineStyle(2, 0x00ffff, 0.3);
            bubble.strokeCircle(0, 0, size);
            
            const highlight = this.add.graphics();
            highlight.fillStyle(0xffffff, 0.2);
            highlight.fillCircle(-size/3, -size/3, size/4);
            
            const bubbleContainer = this.add.container(x, y, [bubble, highlight]);
            this.particleContainer.add(bubbleContainer);
            
            const duration = (Math.random() * 5000 + 5000) / (this.levelValue === 3 ? 1.5 : 1);
            const targetX = x + (Math.random() * 100 - 50);
            
            this.tweens.add({
                targets: bubbleContainer,
                y: -50,
                x: targetX,
                duration: duration,
                ease: 'Sine.InOut',
                onComplete: () => {
                    bubbleContainer.destroy();
                    if (!this.scene.isTransitioning) {
                        this.createBubbleEffects();
                    }
                }
            });
            
            // Wobble effect
            this.tweens.add({
                targets: bubbleContainer,
                angle: { from: -15, to: 15 },
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        }
    }
}
