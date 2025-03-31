import { COLORS_HEX, COLORS_TEXT, OUTLINE_WIDTH, BUTTON_OUTLINE_WIDTH, CORNER_RADIUS, BUTTON_CORNER_RADIUS, buttonHeight, buttonSpacing, buttonWidth} from "../config/design_easy.js";
import { stopwords } from "../config/stopwords.js";
import { saveInteraction} from "../config/firebase.js";



export default class GameSceneEasy extends Phaser.Scene {
    constructor() {
        super({ key: 'GameSceneEasy' });
        this.mode = 'easy';
        this.llmEngine = null;
        this.userInput = '';
        this.inputText = null; 
        this.levelValue = 1;
        this.baseFontSize = 22;
        this.failCount = 0;
        this.autocompleteText = null; 
        
    }



    // Add this method if it doesn't exist
    shutdown() {
        // Clean up event listeners
        if (this.scrollWheelEvent) {
            this.input.off('wheel', this.scrollWheelEvent);
        }
        
        // Clean up any other resources
        super.shutdown();
    }


    // Method to create the fails counter
    createFailsCounter() {
        // Use the imported constants instead of local variables
        const failBoxWidth = 320; // TO DO: DYNAMIC
        
        // Get input box dimensions and position
        const inputBoxWidth = this.uiBoxWidth;
        const inputBoxX = this.cameras.main.centerX - inputBoxWidth / 2; // Left edge of input box
        
        // Position: below input box, same distance from left as DONE button is from right
        const boxX = inputBoxX + failBoxWidth/2 + buttonSpacing;
        const boxY = this.doneButton.y; // Same Y position as buttons
        
        // Create container
        const counterContainer = this.add.container(boxX, boxY);
        
        // Background with red fill
        const counterBackground = this.add.graphics();
        counterBackground.fillStyle(0xff0000, 1); // Red background
        counterBackground.fillRoundedRect(
            -failBoxWidth / 2, -buttonHeight / 2, 
            failBoxWidth, buttonHeight, 
            BUTTON_CORNER_RADIUS
        );
        
        // Border
        const counterOutline = this.add.graphics();
        counterOutline.lineStyle(OUTLINE_WIDTH, 0xffffff, 1);
        counterOutline.strokeRoundedRect(
            -failBoxWidth / 2, -buttonHeight / 2, 
            failBoxWidth, buttonHeight, 
            BUTTON_CORNER_RADIUS
        );
        
        // // Gradient Overlay (Lighter Top) like the buttons
        // const gradientOverlay = this.add.graphics();
        // gradientOverlay.fillStyle(0xff3333, 0.7); // Lighter red
        // gradientOverlay.fillRoundedRect(
        //     -failBoxWidth / 2, -buttonHeight / 2, 
        //     failBoxWidth, buttonHeight / 2, 
        //     BUTTON_CORNER_RADIUS
        // );
        
        // // Highlight Effect (Shiny Reflection) like the buttons
        // const buttonHighlight = this.add.graphics();
        // buttonHighlight.fillStyle(0xffffff, 0.4);
        // buttonHighlight.fillRoundedRect(
        //     -failBoxWidth / 2 + 5, -buttonHeight / 2 + 2, 
        //     failBoxWidth - 10, buttonHeight / 3, 
        //     BUTTON_CORNER_RADIUS
        // );
        


        // Calculate initial score (should be 0 since no input initially)
        const initialScore = 0;
        // Text display
        this.failsText = this.add.text(0, 0, `SCORE: ${initialScore}`, {
            foFamily: 'Fredoka',
            fontSize: '22px',
            fontWeight: "700",
            color: COLORS_TEXT.WHITE,
            align: 'center'
        }).setOrigin(0.5, 0.5);
        
        // Add all elements to container in proper order
        //counterContainer.add([counterBackground, gradientOverlay, buttonHighlight, counterOutline, this.failsText]);
        counterContainer.add([counterBackground, counterOutline, this.failsText]);
        
        // Add to scene
        this.add.existing(counterContainer);
        this.scoreDisplay = counterContainer;
    }

    // Add this method to update the counter
    updateFailsCounter() {

        if (!this.scoreDisplay) {
            this.createFailsCounter();
        }

        // Get the word count from the input text
        const wordsInInput = this.userInput.trim().split(/\s+/).filter(word => word.length > 0).length;
        const percentage = 100-(this.failCount / wordsInInput * 100).toFixed(2);
        
        // Calculate score using the formula: (words_in_input - fails) * 10 - fails^10
        //const score = (wordsInInput - this.failCount) * 10 - (this.failCount * 10);


        if (this.failsText) {
            this.failsText.setText(`SCORE: -${this.failCount} (${percentage}%)`);
            this.tweens.add({
                targets: this.scoreDisplay,
                scaleX: { from: 1, to: 1.2 },
                scaleY: { from: 1, to: 1.2 },
                duration: 150,
                yoyo: true,
                ease: 'Cubic.Out',
                onComplete: () => {
                    // Shake effect after the flash
                    this.tweens.add({
                        targets: this.scoreDisplay,
                        x: { from: this.scoreDisplay.x - 5, to: this.scoreDisplay.x + 5 },
                        duration: 50,
                        yoyo: true,
                        repeat: 3,
                        ease: 'Sine.InOut'
                    });
                }
            });
            
            // Also flash the text to a brighter color
            if (this.failsText) {
                const originalColor = this.failsText.style.color;
                this.failsText.setColor('#FFFFFF');
                
                this.time.delayedCall(300, () => {
                    this.failsText.setColor(originalColor);
                });
            }
        }
    }

    createEasyModeBackground() {
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        
        let gradientTextureKey = 'easyModeBackground';
    
        if (!this.textures.exists(gradientTextureKey)) {
            let gradientCanvas = this.textures.createCanvas(gradientTextureKey, width, height);
            let ctx = gradientCanvas.getContext();
    
            if (!ctx) {
                console.error("Failed to get canvas context for background effect.");
                return;
            }
    
            // Enhanced diagonal gradient with more color variation
            let grd = ctx.createLinearGradient(0, 0, width, height);
            grd.addColorStop(0, "#251a3f");   // Slightly darker start
            grd.addColorStop(0.3, "#2d1f4c");  // Mid-purple
            grd.addColorStop(0.7, "#362758");  // Mid-to-light purple
            grd.addColorStop(1, "#3d2c64");   // Slightly lighter end
            
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, width, height);
            
            // Add more noticeable but still subtle noise texture
            this.addEnhancedNoise(ctx, width, height, 0.04);
            
            // Add more stars/particles
            this.addModerateDensityParticles(ctx, width, height);
            
            // Add several subtle glow areas
            this.addSubtleGlowAreas(ctx, width, height);
            
            gradientCanvas.refresh();
        }
    
        this.background = this.add.image(0, 0, gradientTextureKey)
            .setOrigin(0)
            .setDisplaySize(width, height)
            .setDepth(-1);
    
        // More noticeable animation
        this.tweens.add({
            targets: this.background,
            alpha: { from: 0.95, to: 1 },
            duration: 6000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // Slight breathing effect for the background
        this.tweens.add({
            targets: this.background,
            scaleX: { from: 1, to: 1.03 },
            scaleY: { from: 1, to: 1.03 },
            duration: 8000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // Add dynamic floating particles on top of the background
        this.createDynamicFloatingParticles();
    }
    
    // Add slightly more visible noise
    addEnhancedNoise(ctx, width, height, opacity) {
        for (let x = 0; x < width; x += 3) {
            for (let y = 0; y < height; y += 3) {
                if (Math.random() > 0.93) {  // Slightly more noise points
                    const alpha = Math.random() * opacity;
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }
    
    // Add moderate density particles (more than before, but not overwhelming)
    addModerateDensityParticles(ctx, width, height) {
        // Add 75-90 stars (more than before)
        for (let i = 0; i < 85; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 1.8 + 0.4;  // Slightly larger
            const alpha = Math.random() * 0.2 + 0.1;  // Slightly more visible
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Add several subtle glow areas for visual interest
    addSubtleGlowAreas(ctx, width, height) {
        // Add 4-6 larger glow areas
        const glowPositions = [
            {x: width * 0.2, y: height * 0.2, size: 120, color: [180, 200, 255]},  // Top left
            {x: width * 0.8, y: height * 0.3, size: 150, color: [190, 170, 255]},  // Top right
            {x: width * 0.3, y: height * 0.7, size: 130, color: [200, 180, 255]},  // Bottom left
            {x: width * 0.7, y: height * 0.8, size: 140, color: [170, 190, 255]},  // Bottom right
            {x: width * 0.5, y: height * 0.5, size: 180, color: [190, 190, 255]},  // Center
        ];
        
        glowPositions.forEach(glow => {
            const alpha = Math.random() * 0.06 + 0.04;  // Slightly more visible
            
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
    
    // Add dynamic floating particles
    createDynamicFloatingParticles() {
        // Create a particle container
        this.particleContainer = this.add.container(0, 0);
        this.particleContainer.setDepth(-0.5);
        
        // Create 15-20 particles
        for (let i = 0; i < 18; i++) {
            const x = Math.random() * this.cameras.main.width;
            const y = Math.random() * this.cameras.main.height;
            const size = Math.random() * 3 + 1.5;
            const alpha = Math.random() * 0.3 + 0.1;
            
            const particle = this.add.graphics();
            particle.fillStyle(0x90caf9, alpha * 0.7);  // Match with UI outline color for cohesion
            particle.fillCircle(0, 0, size);
            
            const glow = this.add.graphics();
            glow.fillStyle(0x90caf9, alpha * 0.3);
            glow.fillCircle(0, 0, size * 2);
            
            const particleContainer = this.add.container(x, y, [glow, particle]);
            this.particleContainer.add(particleContainer);
            
            // Add gentle floating animation
            this.tweens.add({
                targets: particleContainer,
                y: y + (Math.random() * 70 - 35),
                x: x + (Math.random() * 70 - 35),
                alpha: { from: alpha, to: alpha * 0.6 },
                duration: 7000 + Math.random() * 8000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                delay: Math.random() * 3000
            });
        }
    }

    onFeedbackClick(){
        this.scene.start('FeedbackScene', {mode: this.mode, llmEngine: this.llmEngine});
    }
    
    onHardModeClick() {
        this.scene.start('GameSceneHard', {mode: 'hard', llmEngine: this.llmEngine});
    }

    createButton(label, callback, centerX, centerY) {

    
        // ✅ Ensure input box exists before positioning the button
        if (!this.inputTextBorder) {
            console.warn("Input text border not found! Skipping button creation.");
            return;
        }
    

    
        // ✅ Create button container
        const buttonContainer = this.add.container(centerX, centerY);
    
        // === Button Background ===
        const buttonBackground = this.add.graphics();
        buttonBackground.fillStyle(COLORS_HEX.BUTTONFILL, 1);
        buttonBackground.fillRoundedRect(
            -buttonWidth / 2, -buttonHeight / 2, 
            buttonWidth, buttonHeight, BUTTON_CORNER_RADIUS
        );
    
        // === Button Outline ===
        const buttonOutline = this.add.graphics();
        buttonOutline.lineStyle(BUTTON_OUTLINE_WIDTH, 0xffffff, 1);
        buttonOutline.strokeRoundedRect(
            -buttonWidth / 2, -buttonHeight / 2, 
            buttonWidth, buttonHeight, BUTTON_CORNER_RADIUS
        );
    
        // === Gradient Overlay (Lighter Top) ===
        const gradientOverlay = this.add.graphics();
        gradientOverlay.fillStyle(COLORS_HEX.BUTTONOVERLAY, 0.7);
        gradientOverlay.fillRoundedRect(
            -buttonWidth / 2, -buttonHeight / 2, 
            buttonWidth, buttonHeight / 2, BUTTON_CORNER_RADIUS
        );
    
        // === Highlight Effect (Shiny Reflection) ===
        const buttonHighlight = this.add.graphics();
        buttonHighlight.fillStyle(0xffffff, 0.4);
        buttonHighlight.fillRoundedRect(
            -buttonWidth / 2 + 5, -buttonHeight / 2 + 2, 
            buttonWidth - 10, buttonHeight / 3, BUTTON_CORNER_RADIUS
        );

        // === Button Text ===
        const buttonText = this.add.text(0, 0, label, {
            fontFamily: 'Fredoka',
            fontSize: '18px',
            fontWeight: "700",
            color: COLORS_TEXT.WHITE,
            align: 'center'
        }).setOrigin(0.5, 0.5);
    
        // ✅ Ensure button is interactive
        buttonContainer.setSize(buttonWidth, buttonHeight);
        buttonContainer.setInteractive();
        buttonContainer.on("pointerdown", () => {
            this.tweens.add({
                targets: buttonContainer,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 100,
                yoyo: true,
                ease: "Quad.Out"
            });
    
            this.time.delayedCall(100, callback);
        });

        
    
        // ✅ Add to scene
        buttonContainer.add([buttonOutline, buttonBackground, gradientOverlay, buttonHighlight, buttonText]);
        this.add.existing(buttonContainer);
    
        return buttonContainer;
    }
    
    
  
    onDoneButtonClick() {
        console.log("Done button clicked! Evaluating text...");
        
        if (typeof this.createOutputTextBox !== "function") {
            console.error("Error: createOutputTextBox() is not defined.");
            return;
        }

    
        // ✅ Ensure Output Box Exists BEFORE Calling LLM
        if (!this.outputTextBox) {
            this.createOutputTextBox();
        }
    
        // ✅ Update the text to "Evaluating..." before making the request
        this.outputText.setText("Evaluating...");
    
        // ✅ Call LLM Function (evaluateText)
        this.evaluateText(this.userInput);

        // ✅ Select a new prompt before evaluation
        //this.updatePromptBasedOnLevel();
    }

    // Updated clearInputTextBox method
    clearInputTextBox() {
        this.userInput = '';
        if (this.inputText) {
            this.inputText.setText('_');
        }
        if (this.autocompleteText) {
            this.autocompleteText.setText('');
        }
    }

    onResetButtonClick() {
        console.log("Reset button clicked! Clearing text...");
        this.failCount = 0;
        
        if (typeof this.clearInputTextBox !== "function") {
            console.error("Error: clearInputTextBox() is not defined."); 
            return;
        }   

        this.clearInputTextBox();
        this.updateOutputText("Press 'DONE' to see how you did.");

        // ✅ Select a new prompt before evaluation
        this.updatePromptBasedOnLevel();
    }
        

    async evaluateText(userInput) {
        console.log("Evaluating user input:", userInput);
    

        // ✅ Show "Evaluating..." While Waiting for Response
        this.updateOutputText("Evaluating...");
    
        // ✅ Ensure currentPrompt is set (fallback to generic)
        const promptForEvaluation = this.currentPrompt || "No specific prompt was provided.";
    
        // **Updated Chat Prompt Format**
        // **Updated Chat Prompt Format**
        const messages = [
            {
                "role": "system",
                "content": "You are an expert writing evaluator. Your job is to assess user-generated text based on three key criteria:\n"
            },
            {
                "role": "user",
                "content": `User was given the prompt: "${promptForEvaluation}"  
                            Here is their response: "${userInput}"  
                            
                            Evaluate the response based on:  
                            - Relevance to the given prompt.  
                            - Grammatical correctness. Please consider only technical correctness and not stylistic choices.
                            - General coherence. Does this writing make sense?
                            
                            Provide output in this strict format:  
                            
                            Overall Rating: [One-word summary]  
                            Relevance Score: X/5 - [Short reason]  
                            Grammar Score: X/5 - [Short reason]  
                            Coherence Score: X/5 - [Short reason]  
                            
                            If Grammar Score < 5, list grammar mistakes in this format:  
                            - Incorrect: "[Exact incorrect phrase]" → Correct: "[Corrected version]"  
                            
                            Only return the labeled scores and grammar corrections if applicable. Do not include explanations beyond the given format. Do not perform a plagiarism check. Be sure to give at least one specific example if there are grammar errors. You can even just quote it.`
            }
        ];


        //try {
            // Make the API call to OpenAI
            const response = await fetch("https://openai-proxy.nonslop.workers.dev", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt: messages,
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.statusText}`);
            }
            
            const responseData = await response.json();
            console.log(responseData)
        
            let aiResponse = responseData.content.trim();
            console.log("AI Evaluation:", aiResponse);
    
            // ✅ Ensure text is visible
            this.updateOutputText(aiResponse);
            this.outputTextBox.setAlpha(1);
            this.outputText.setAlpha(1);
            
             // Example interaction data structure
            const interaction = {
                prompt: this.currentPrompt,
                submittedText: userInput,
                aiEvaluation: aiResponse,
                k: this.topKValue,
                level: this.levelValue,
                failCount: this.failCount,
                mode: this.mode
            };

            saveInteraction(interaction, "userSubmissions"); // save interaction to Firebase
    }

    addScrollIndicator() {
        // Remove any existing indicator
        if (this.scrollIndicator) {
            this.scrollIndicator.destroy();
        }
        
        // Create scroll indicator
        this.scrollIndicator = this.add.text(
            this.cameras.main.centerX,
            this.outputBoxInfo.y + this.outputBoxInfo.height - 15,
            "▼ Scroll for more ▼",
            {
                fontFamily: 'Nunito',
                fontSize: '16px',
                fill: '#ffffff',
                backgroundColor: '#4b237a',
                padding: { x: 8, y: 4 }
            }
        ).setOrigin(0.5, 0.5)
         .setDepth(11)
         .setAlpha(0.8);
        
        // Add animation to make it more noticeable
        this.tweens.add({
            targets: this.scrollIndicator,
            alpha: { from: 0.8, to: 1 },
            y: '+=5',
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    }



    addScrollEvent() {
        // Remove any existing event
        if (this.scrollWheelEvent) {
            this.input.off('wheel', this.scrollWheelEvent);
        }
        
        // Define the scroll event handler
        this.scrollWheelEvent = (pointer, gameObjects, deltaX, deltaY) => {
            // Only scroll if we have enough content to scroll
            if (!this.outputText || !this.outputBoxInfo) return;
            
            const textHeight = this.outputText.height;
            const boxHeight = this.outputBoxInfo.height - (this.outputBoxInfo.padding * 2);
            
            if (textHeight <= boxHeight) return;
            
            // Calculate min and max scroll positions
            const minY = this.outputBoxInfo.y + this.outputBoxInfo.padding;
            const maxY = minY - (textHeight - boxHeight);
            
            // Apply scroll movement (negative deltaY means scroll down)
            this.outputTextContainer.y -= deltaY * 0.5; // adjust speed
            
            // Clamp position
            this.outputTextContainer.y = Phaser.Math.Clamp(
                this.outputTextContainer.y,
                maxY,
                minY
            );
        };
        
        // Add the event listener
        this.input.on('wheel', this.scrollWheelEvent);
    }


    updateOutputText(responseText) {
        if (!this.outputTextBox) {
            this.createOutputTextBox();
        }
    
        // Update the text content
        if (this.outputText) {
            this.outputText.setText(responseText);
            
            // Calculate if scrolling is needed
            const textHeight = this.outputText.height;
            const boxHeight = this.outputBoxInfo.height - (this.outputBoxInfo.padding * 2);
            const needsScrolling = textHeight > boxHeight;
            
            // Make all elements visible
            this.outputTextBox.setAlpha(1);
            this.outputTextContainer.setAlpha(1);
            
            // Show scroll indicator if needed
            if (needsScrolling) {
                this.addScrollIndicator();
            } else if (this.scrollIndicator) {
                this.scrollIndicator.destroy();
                this.scrollIndicator = null;
            }
            
            // Reset scroll position
            this.outputTextContainer.y = this.outputBoxInfo.y + this.outputBoxInfo.padding;
        } else {
            // If output text doesn't exist, recreate the output box
            this.createOutputTextBox();
            this.outputText.setText(responseText);
        }
    }
    
    createOutputTextBox() {
        // Clear any existing output box and text container
        if (this.outputTextBox) {
            this.outputTextBox.destroy();
        }
        if (this.outputTextContainer) {
            this.outputTextContainer.destroy();
        }
        if (this.outputText) {
            this.outputText.destroy();
        }
        if (this.scrollMask) {
            this.scrollMask.destroy();
        }
    
        const outputBoxWidth = this.uiBoxWidth;
        const lineHeight = 24;
        const numLines = 4;
        const padding = 30;
        const outputBoxHeight = numLines * lineHeight + padding * 2;
        
        // Position calculation
        let outputBoxY = this.doneButton 
            ? this.doneButton.y + this.doneButton.displayHeight / 2 + 40 + outputBoxHeight / 2
            : this.cameras.main.height - outputBoxHeight - 40;
    
        // Create new output box with rounded corners
        this.outputTextBox = this.add.graphics();
        this.outputTextBox.fillStyle(COLORS_HEX.BACKGROUND, 1);
        this.outputTextBox.fillRoundedRect(
            this.cameras.main.centerX - outputBoxWidth / 2,
            outputBoxY - outputBoxHeight / 2,
            outputBoxWidth,
            outputBoxHeight,
            CORNER_RADIUS
        );
        this.outputTextBox.lineStyle(OUTLINE_WIDTH, COLORS_HEX.BOXOUTLINE, 1);
        this.outputTextBox.strokeRoundedRect(
            this.cameras.main.centerX - outputBoxWidth / 2,
            outputBoxY - outputBoxHeight / 2,
            outputBoxWidth,
            outputBoxHeight,
            CORNER_RADIUS
        );
        this.add.existing(this.outputTextBox);
        
        // Create a container for scrollable content
        this.outputTextContainer = this.add.container(
            this.cameras.main.centerX - outputBoxWidth / 2 + padding,
            outputBoxY - outputBoxHeight / 2 + padding
        );
        
        // Create text inside container
        this.outputText = this.add.text(
            0, 0,
            "Press 'DONE' to see how you did.",
            {
                fontFamily: 'Nunito',
                fontSize: `${lineHeight}px`,
                fill: '#ffffff',
                wordWrap: { width: outputBoxWidth - padding * 2 },
                align: 'left',
                lineSpacing: 5
            }
        ).setOrigin(0, 0);
        
        // Add text to container
        this.outputTextContainer.add(this.outputText);
        
        // Create mask for clipping text that goes outside the box
        const maskGraphics = this.make.graphics();
        maskGraphics.fillRect(
            this.cameras.main.centerX - outputBoxWidth / 2 + 5,
            outputBoxY - outputBoxHeight / 2 + 5,
            outputBoxWidth - 10,
            outputBoxHeight - 10
        );
        this.scrollMask = maskGraphics.createGeometryMask();
        this.outputTextContainer.setMask(this.scrollMask);
        
        // Store reference to box position and dimensions for scrolling
        this.outputBoxInfo = {
            x: this.cameras.main.centerX - outputBoxWidth / 2,
            y: outputBoxY - outputBoxHeight / 2,
            width: outputBoxWidth,
            height: outputBoxHeight,
            padding: padding
        };
        
        // Set depth
        this.outputTextBox.setDepth(9);
        this.outputTextContainer.setDepth(10);
        
        // Set initial state
        this.tweens.add({
            targets: [this.outputTextBox, this.outputTextContainer],
            alpha: 1,
            duration: 500,
            ease: 'Sine.InOut'
        });
        
        // Add wheel event for scrolling (only active when needed)
        this.addScrollEvent();
    }
    
    
    addButtonParticles(button) {
        const particles = this.add.particles(button.x, button.y, 'particle', {
          speed: 50,
          scale: { start: 0.2, end: 0 },
          blendMode: 'ADD',
          lifespan: 1000,
          frequency: 200,
          tint: 0xff9955
        });
        particles.setDepth(button.depth - 1);
        return particles;
      }
    // Add this method to your Easy mode scene
    enhanceEasyModeButtons() {
        // Apply to all buttons in the scene
        const buttons = [this.resetButton, this.doneButton, this.hardButton, this.feedbackButton];
        
        buttons.forEach(button => {
        if (!button) return; // Skip if button doesn't exist
        
        // Find button background graphics in the container
        const buttonBg = button.list.find(item => item.type === 'Graphics' && item.fillStyle);
        if (!buttonBg) return;
        
        // Create a new gradient overlay graphic
        const glowOverlay = this.add.graphics();
        
        // Get button dimensions (assuming buttonWidth and buttonHeight are available)
        const width = buttonWidth;
        const height = buttonHeight;
        
        // Create gradient with golden glow
        glowOverlay.fillStyle(0xffd700, 0.5); // Gold color with low opacity
        glowOverlay.fillRoundedRect(
            -width / 2, -height / 2, 
            width, height / 1.5, // Cover top portion for gradient effect
            BUTTON_CORNER_RADIUS
        );
        
        // Add subtle animation
        this.tweens.add({
            targets: glowOverlay,
            alpha: { from: 0.2, to: 0.4 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // Add to button container at position 2 (above background, below text)
        button.addAt(glowOverlay, 2);
        });
    }
    
    // Call this in your create() method after creating all buttons
    

    createMenuBar() {
        const menuBarHeight = 100;
        const padding = 50;
        const rightMargin = 40;
        const gap = 20;
        const shiftLeft = 30; // Shift elements left for better fit
    
        // === Create Menu Bar Background ===
        this.menuBar = this.add.graphics();
        this.menuBar.fillStyle(COLORS_HEX.BACKGROUND, 1);
        this.menuBar.fillRect(0, 0, this.cameras.main.width, menuBarHeight);
    
        // === Add Bottom Border ===
        const menuBarBorder = this.add.graphics();
        menuBarBorder.fillStyle(COLORS_HEX.MIDPURPLE, 1);
        menuBarBorder.fillRect(0, menuBarHeight - OUTLINE_WIDTH, this.cameras.main.width, OUTLINE_WIDTH);
    
        // === Add Title ("(NON-SLOP)") to the Left ===
        const titleText = this.add.text(
            padding, menuBarHeight / 2, 
            "(NON-SLOP)", 
            { fontFamily: 'barcade3d', fontSize: '50px', color: COLORS_TEXT.YELLOW }
        ).setOrigin(0, 0.5);
    
        // === Level Slider (Centered) ===
        this.levelValue = 1;
        const levelLabelX = this.cameras.main.centerX - 120; // Shift left slightly for spacing
        const levelLabel = this.add.text(
            levelLabelX, menuBarHeight / 2, 
            `Prompt Level: ${this.levelValue}`, 
            { fontFamily: 'Nunito', fontSize: '22px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
    
        const levelSliderWidth = 120;
        const levelSliderX = levelLabelX + levelLabel.displayWidth + gap;
        const levelSliderY = menuBarHeight / 2;
    
        // Slider Bar
        const levelSlider = this.add.graphics();
        levelSlider.fillStyle(0xffffff, 1);
        levelSlider.fillRect(levelSliderX, levelSliderY - 5, levelSliderWidth, 10);
    
        // Slider Handle
        this.levelSliderHandle = this.add.rectangle(levelSliderX, levelSliderY, 10, 20, 0xffaa00).setInteractive();
        this.input.setDraggable(this.levelSliderHandle);
    
        // Prevent Slider from Hitting Right Edge
        const levelSliderMinX = levelSliderX;
        const levelSliderMaxX = levelSliderMinX + levelSliderWidth - 5;
    
        this.input.on('drag', (pointer, gameObject, dragX) => {
            if (gameObject === this.levelSliderHandle) {
                gameObject.x = Phaser.Math.Clamp(dragX, levelSliderMinX, levelSliderMaxX);
                const newLevel = Math.round(Phaser.Math.Linear(1, 3, (gameObject.x - levelSliderMinX) / (levelSliderMaxX - levelSliderMinX)));
    
                if (newLevel !== this.levelValue) {
                    this.levelValue = newLevel;
                    levelLabel.setText(`Prompt Level: ${this.levelValue}`);
                    this.updatePromptBasedOnLevel();
                }
            }
        });
    
        // === Top K Slider (Repositioned to the Right) ===
        const topKLabelX = this.cameras.main.width - padding - rightMargin - 180 - shiftLeft; // Shifted slightly left
        const topKLabelY = menuBarHeight / 2;
        this.topKValue = 1; // Default value
    
        const topKLabel = this.add.text(
            topKLabelX, topKLabelY, 
            `Top K: ${this.topKValue}`,
            { fontFamily: 'Nunito', fontSize: '22px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
    
        const sliderWidth = 120;
        const sliderX = topKLabelX + topKLabel.displayWidth + gap;
        const sliderY = menuBarHeight / 2;
        const slider = this.add.graphics();
        slider.fillStyle(0xffffff, 1);
        slider.fillRect(sliderX, sliderY - 5, sliderWidth, 10);
    
        this.sliderHandle = this.add.rectangle(sliderX, sliderY, 10, 20, 0xffaa00).setInteractive();
        this.input.setDraggable(this.sliderHandle);
    
        // Prevent Top K Slider from Hitting Right Edge
        const sliderMinX = sliderX;
        const sliderMaxX = sliderMinX + sliderWidth - 5;
    
        this.input.on('drag', (pointer, gameObject, dragX) => {
            if (gameObject === this.sliderHandle) {
                gameObject.x = Phaser.Math.Clamp(dragX, sliderMinX, sliderMaxX);
                const newTopK = Math.round(Phaser.Math.Linear(1, 5, (gameObject.x - sliderMinX) / (sliderMaxX - sliderMinX)));
    
                if (newTopK !== this.topKValue) {
                    this.topKValue = newTopK;
                    topKLabel.setText(`Top K: ${this.topKValue}`,);
                }
            }
        });
    
        // === Slide-in Animation for Menu Bar ===
        this.tweens.add({
            targets: [this.menuBar, menuBarBorder, titleText, levelLabel, levelSlider, this.levelSliderHandle, topKLabel, slider, this.sliderHandle],
            alpha: 1,
            duration: 800,
            ease: 'Quad.Out'
        });

        this.menuBarHeight = menuBarHeight;
        this.add.existing(this.menuBar);

        this.menuBar.setPosition(0, 0);
  
        // Add a slight shadow to the menu bar for depth
        const menuBarShadow = this.add.graphics();
        menuBarShadow.fillStyle(0x000000, 0.3);
        menuBarShadow.fillRect(0, menuBarHeight, this.cameras.main.width, 10);
        menuBarShadow.setDepth(this.menuBar.depth - 1);
    }
    addMenuDivider() {
        // Create gradient for divider line
        const divider = this.add.graphics();
        
        // Get screen width
        const width = this.cameras.main.width;
        
        // Create a gradient line that fades at the edges
        const lineY = this.menuBarHeight; // Position below menu bar
        
        // First create a thin solid line
        divider.lineStyle(2, 0x90caf9, 0.7); // Match your Easy mode blue color
        divider.beginPath();
        divider.moveTo(0, lineY);
        divider.lineTo(width, lineY);
        divider.strokePath();
        
        // Add decorative accents (small dots) along the line
        for (let x = width * 0.1; x < width * 0.9; x += width / 15) {
          divider.fillStyle(0xffd700, 0.6); // Gold accent dots
          divider.fillCircle(x, lineY, 1.5);
        }
        
        // Add larger accent at center
        divider.fillStyle(0xffd700, 0.8);
        divider.fillCircle(width / 2, lineY, 2.5);
        
        // Add subtle animation
        this.tweens.add({
          targets: divider,
          alpha: { from: 0.7, to: 1 },
          duration: 3000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut'
        });
      }


    createPromptTextBox() {
        this.promptBoxY = 240;
    
        this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        const padding = 20;
    
        // Clear existing prompt box graphics if it exists
        if (this.promptTextBox) {
            this.promptTextBox.clear();
        } else {
            this.promptTextBox = this.add.graphics();
        }
    
        // Clear existing prompt text if it exists
        if (this.promptText) {
            this.promptText.destroy();
        }
    
        // ✅ Default text to calculate initial size
        const defaultText = "Your prompt will appear here...";
        this.promptText = this.add.text(
            this.cameras.main.centerX, 
            0, // Y will be adjusted later
            defaultText,
            {
                fontFamily: "Nunito",
                fontSize: "22px",
                color: COLORS_TEXT.WHITE,
                wordWrap: { width: this.uiBoxWidth - padding * 2 },
                align: "center"
            }
        ).setOrigin(0.5, 0);
    
        // ✅ Ensure text box height dynamically adjusts
        const textHeight = this.promptText.height + padding * 2;
    
        // ✅ Create the Prompt Background Box
        this.promptTextBox.fillStyle(COLORS_HEX.BACKGROUND, 1);
        this.promptTextBox.fillRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2, 
            this.promptBoxY,
            this.uiBoxWidth,
            textHeight,
            CORNER_RADIUS
        );
    
        // ✅ Add Outline to Match Output Box
        this.promptTextBox.lineStyle(OUTLINE_WIDTH, COLORS_HEX.BOXOUTLINE, 1);
        this.promptTextBox.strokeRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2, 
            this.promptBoxY,
            this.uiBoxWidth,
            textHeight,
            CORNER_RADIUS
        );
    
        // ✅ Position the Text inside the Box
        this.promptText.setY(this.promptBoxY + padding);





    
        // ✅ Ensure Prompt Box Appears Above Other UI Elements
        this.promptTextBox.setDepth(102);
        this.promptText.setDepth(103);
    
    
        this.updatePromptBasedOnLevel();
    }
    
    
    adjustPromptBoxSize() {
        if (!this.promptTextBox || !this.promptText) {
            console.warn("Prompt box or text not initialized.");
            return;
        }
    
        const padding = 20;
        const promptBoxWidth = this.uiBoxWidth
        const promptBoxHeight = this.promptText.height + padding * 2; // ✅ Adjust height dynamically
    

    
        // ✅ Redraw the Box with the Updated Height
        this.promptTextBox.clear();
        this.promptTextBox.fillStyle(COLORS_HEX.BACKGROUND, 1);
        this.promptTextBox.fillRoundedRect(
            this.cameras.main.centerX - promptBoxWidth / 2, 
            this.promptBoxY,
            promptBoxWidth,
            promptBoxHeight,
            BUTTON_CORNER_RADIUS
        );
    
        this.promptTextBox.lineStyle(BUTTON_OUTLINE_WIDTH, COLORS_HEX.WHITE, 1);
        this.promptTextBox.strokeRoundedRect(
            this.cameras.main.centerX - promptBoxWidth / 2, 
            this.promptBoxY,
            promptBoxWidth,
            promptBoxHeight,
            BUTTON_CORNER_RADIUS
        );
    
        // ✅ Reposition Text
        this.promptText.setY(this.promptBoxY + padding);
    }
    

    updatePromptBasedOnLevel() {
        const promptLevels = {
            1: [
                "What do you want to have for dinner today?", 
                "Describe what you see around you right now.",
                "Who is your favorite musical artist and why? ",
                "Describe your living room.",
                "Describe the sky right now.",
                ],
            2: [
                "Why do polar bears not eat penguins?",
                "What is the difference between a chair and a stool?",
                "What did young you want to do when you grew up?",
                "Who was Thomas Edison?",
                "What is an interest rate?",
                ],
            3: [
                "Write a two-line poem that rhymes.",
                "Write a haiku.",
                "What do you think beauty is?",
                "What makes something art or not?",
                "Write a coherent sentence where three consecutive words start with the same letter.",
                "Write a very short story about a woman and her pet lion."
            ],
        };
    
        // ✅ Select a Prompt Based on the Level
        const selectedPrompts = promptLevels[this.levelValue] || promptLevels[1];
        const randomIndex = Math.floor(Math.random() * selectedPrompts.length);
        this.currentPrompt = selectedPrompts[randomIndex];
    
        // Skip recreating the prompt if we haven't initialized the box yet
        if (!this.promptTextBox) {
            return;
        }
    
        // ✅ Remove Old Prompt Text Before Updating
        if (this.promptText) {
            this.promptText.destroy();
        }
    
        // ✅ Create and Display New Prompt Text
        this.promptText = this.add.text(
            this.cameras.main.centerX, 
            this.promptBoxY + 20, // ✅ Keep inside the box
            this.currentPrompt,
            {
                fontFamily: "Nunito",
                fontSize: "22px",
                color: COLORS_TEXT.WHITE,
                wordWrap: { width: this.uiBoxWidth - 40 },
                align: "center"
            }
        ).setOrigin(0.5, 0);
    
        // ✅ Adjust the Box Height Based on Text
        const padding = 20;
        const newHeight = this.promptText.height + padding * 2;
    
        this.promptTextBox.clear();
        this.promptTextBox.fillStyle(COLORS_HEX.BACKGROUND, 1);
        this.promptTextBox.fillRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2, 
            this.promptBoxY,
            this.uiBoxWidth,
            newHeight,
            CORNER_RADIUS
        );
    
        this.promptTextBox.lineStyle(OUTLINE_WIDTH, COLORS_HEX.BOXOUTLINE, 1);
        this.promptTextBox.strokeRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2, 
            this.promptBoxY,
            this.uiBoxWidth,
            newHeight,
            CORNER_RADIUS
        );
    
        // ✅ Ensure Prompt Box and Text Are Layered Properly
        this.promptTextBox.setDepth(102);
        this.promptText.setDepth(103);
    }
    
    
    

    checkAndExplodeWord() {
        console.log(this.aiSuggestedWords);
        if (!this.aiSuggestedWords || this.aiSuggestedWords.length === 0) {
            return;
        }
        let words = this.userInput.trim().split(" ");
        let lastWord = words[words.length - 1];
    
        if (this.aiSuggestedWords.includes(lastWord)) {
            console.log(`Exploding word: ${lastWord}`);
    
            // ✅ Find explosion position (last word in input box)
            let wordX = this.inputText.x + this.inputText.displayWidth - 20;
            let wordY = this.inputText.y + this.inputText.displayHeight - 20;
    
            // ✅ Trigger explosion effect
            this.createExplosionEffect(lastWord, wordX, wordY);
    
            // ✅ Shake screen
            this.shakeScreen();
    
    
            this.updateCursor();

            // Increment fail counter
            this.failCount++;
            this.updateFailsCounter();
        }
         // Example interaction data structure
         const interaction = {
            prompt: this.currentPrompt,
            suggestedWords: this.aiSuggestedWords,
            chosenWord: lastWord,
            submittedText: this.userInput,
            k: this.topKValue,
            level: this.levelValue,
            failCount: this.failCount,
            mode: this.mode
        };

        saveInteraction(interaction, "userInteractions"); // save interaction to Firebase
    }
    // Method to generate autocomplete suggestion
    generateAutocomplete() {
        if (!this.aiSuggestedWords || this.aiSuggestedWords.length === 0) {
            return "";
        }
        
        // If last character is space or enter, show first suggestion
        const lastChar = this.userInput.slice(-1);
        if (lastChar === " " || lastChar === "\n") {
            return this.aiSuggestedWords[0];
        }
        
        // If user is typing a word, try to autocomplete it
        const words = this.userInput.split(" ");
        const currentWord = words[words.length - 1].toLowerCase();
        
        // If current word is empty, don't autocomplete
        if (!currentWord) {
            return "";
        }
        
        // Find a matching word from suggestions
        for (const suggestion of this.aiSuggestedWords) {
            if (suggestion.toLowerCase().startsWith(currentWord)) {
                // Return only the part that would complete the word
                return suggestion.slice(currentWord.length);
            }
        }
        
        return "";
    }
    
    createInputTextBox() {
        const textBoxWidth = this.uiBoxWidth;
        const textBoxHeight = 240;
        const padding = 30; // margin in text box
        
        // Ensure prompt is updated before rendering
        this.updatePromptBasedOnLevel();
        


        // Ensure text box exists and has rounded corners
        if (this.inputTextBorder) {
            this.inputTextBorder.destroy();
        }
        this.inputTextBorder = this.add.graphics();
        this.inputTextBorder.fillStyle(0xffffff, 1);
        this.inputTextBorder.fillRoundedRect(
            this.cameras.main.centerX - textBoxWidth / 2,
            this.cameras.main.centerY - textBoxHeight / 2,
            textBoxWidth,
            textBoxHeight,
            CORNER_RADIUS
        );
        this.inputTextBorder.lineStyle(OUTLINE_WIDTH, COLORS_HEX.MIDPURPLE, 1);
        this.inputTextBorder.strokeRoundedRect(
            this.cameras.main.centerX - textBoxWidth / 2,
            this.cameras.main.centerY - textBoxHeight / 2,
            textBoxWidth,
            textBoxHeight,
            CORNER_RADIUS
        );
        
        this.add.existing(this.inputTextBorder);
        
        // Clear existing text objects
        if (this.inputText) {
            this.inputText.destroy();
        }
        if (this.autocompleteText) {
            this.autocompleteText.destroy();
        }
        
        this.userInput = "";
        this.cursorVisible = true;
        
        // Create the main input text (black)
        this.inputText = this.add.text(
            this.cameras.main.centerX - textBoxWidth / 2 + padding,
            this.cameras.main.centerY - textBoxHeight / 2 + padding,
            "_",
            {
                fontFamily: "Nunito",
                fontSize: "22px",
                fill: "#000",
                wordWrap: { width: textBoxWidth - padding * 2 },
                align: "left"
            }
        ).setOrigin(0, 0);
        
        // Create the autocomplete text (red)
        this.autocompleteText = this.add.text(
            this.cameras.main.centerX - textBoxWidth / 2 + padding,
            this.cameras.main.centerY - textBoxHeight / 2 + padding,
            "",
            {
                fontFamily: "Nunito",
                fontSize: "22px",
                fill: "#ff0000", // Red color
                wordWrap: { width: textBoxWidth - padding * 2 },
                align: "left"
            }
        ).setOrigin(0, 0);
        
        // Set very high depth for both text objects to ensure visibility
        this.inputText.setDepth(25);
        this.autocompleteText.setDepth(25);
        
        // Force visibility
        this.inputText.setVisible(true);
        this.autocompleteText.setVisible(true);
        
        // Keyboard event handler
        this.input.keyboard.removeAllListeners('keydown'); // Prevent duplicate handlers
        this.input.keyboard.on("keydown", (event) => {
            this.inputActive = true;
    
            if(this.activeTimeout) {
                clearTimeout(this.activeTimeout);
            }
    
            // Set timeout to revert to inactive state after 3 seconds
            this.activeTimeout = setTimeout(() => {
                this.inputActive = false;
            }, 3000);


            // Check for special keys that should be ignored
            const ignoreKeys = [
                'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 
                'Tab', 'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 
                'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
                'NumLock', 'ScrollLock', 'Pause', 'Insert', 'Home', 
                'PageUp', 'Delete', 'End', 'PageDown', 'ArrowRight', 
                'ArrowLeft', 'ArrowDown', 'ArrowUp'
            ];
            
            if (ignoreKeys.includes(event.key)) {
                // Ignore these keys entirely
                return;
            }
    
            if (event.key === " ") {
                if (!this.userInput.trim()) return;
                this.userInput += " ";
                // Check for AI-suggested word match
                this.checkAndExplodeWord();
                this.generateAISuggestions(this.userInput.trim());
            } else if (event.key === "Tab") {
                // Accept autocomplete suggestion

                const autocomplete = this.generateAutocomplete();
                if (autocomplete) {
                    this.userInput += autocomplete.trim();
                    this.failCount += 1;
                    this.updateFailsCounter();
                    event.preventDefault(); // Prevent default tab behavior
                    
                    
                    this.generateAISuggestions(this.userInput.trim());
                }
            } else if (event.key.length === 1) {
                this.userInput += event.key;
            } else if (event.key === "Backspace") {
                this.userInput = this.userInput.slice(0, -1);
            } else if (event.key === "Enter") {
                this.userInput += "\n";
                // Check for AI-suggested word match
                this.checkAndExplodeWord();
                this.generateAISuggestions(this.userInput.trim());
            }
            
            this.updateCursor();
        });
        
        // Cursor blinking timer
        if (this.cursorTimer) {
            this.cursorTimer.remove();
        }
        this.cursorTimer = this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
                this.cursorVisible = !this.cursorVisible;
                
                // If active, blink faster
                if (this.inputActive) {
                    setTimeout(() => {
                        if (this.inputActive) {
                            this.cursorVisible = !this.cursorVisible;
                            this.updateCursor();
                        }
                    }, 250); // Half-cycle for faster blink
                }
                
                this.updateCursor();
            }
        });
    
        // Initialize with cursor and autocomplete
        this.updateCursor();
    
        // Make the input box interactive
        this.inputTextBorder.setInteractive(
            new Phaser.Geom.Rectangle(
                this.cameras.main.centerX - this.uiBoxWidth / 2,
                this.cameras.main.centerY - 240 / 2,
                this.uiBoxWidth,
                240
            ),
            Phaser.Geom.Rectangle.Contains
        );
    
        // Add click/tap effect
        this.inputTextBorder.on('pointerdown', (pointer) => {
            // Create ripple effect at click position
            this.createInputBoxClickEffect(pointer.x, pointer.y);
        });
    }
    

    // New method to create the click effect
    createInputBoxClickEffect(x, y) {
        // Create a circle at click position
        const ripple = this.add.circle(x, y, 5, COLORS_HEX.YELLOW, 0.7);
        ripple.setDepth(20); // Above input box
        
        // Animate the ripple
        this.tweens.add({
            targets: ripple,
            radius: 80,
            alpha: 0,
            duration: 800,
            ease: 'Quad.Out',
            onComplete: () => {
                ripple.destroy();
            }
        });
        
        // Add a quick flash to the border
        const textBoxWidth = this.uiBoxWidth;
        const textBoxHeight = 240;
        const cornerRadius = CORNER_RADIUS;
        
        // Create flash effect
        const flash = this.add.graphics();
        flash.lineStyle(OUTLINE_WIDTH + 2, 0xffffff, 0.8);
        flash.strokeRoundedRect(
            this.cameras.main.centerX - textBoxWidth / 2,
            this.cameras.main.centerY - textBoxHeight / 2,
            textBoxWidth, 
            textBoxHeight,
            cornerRadius
        );
        flash.setDepth(this.inputTextBorder.depth + 1);
        
        // Animate the flash
        this.tweens.add({
            targets: flash,
            alpha: { from: 0.8, to: 0 },
            duration: 500, 
            ease: 'Cubic.Out',
            onComplete: () => {
                flash.destroy();
            }
        });
    }
    
    updateCursor() {
        if (!this.inputText || !this.autocompleteText) return;
        try {
            // Get autocomplete suggestion
            const autocomplete = this.generateAutocomplete();
            
            // Update main input text with cursor
            // We'll use a consistent text without the cursor for measurements
            const userInputOnly = this.userInput;
            this.inputText.setText(this.userInput + (this.cursorVisible ? "_" : ""));
            
            // Hide autocomplete text by default
            this.autocompleteText.setVisible(false).setText("");
            
            if (autocomplete && autocomplete.length > 0) {
                // Get wordWrap width from inputText style
                const wrapWidth = this.inputText.style.wordWrapWidth;
                const fontSize = parseInt(this.inputText.style.fontSize, 10);
                const lineHeight = fontSize * 1.2;
                const inputX = this.inputText.x;
                const inputY = this.inputText.y;
                
                // Split text manually into wrapped lines - using userInputOnly for consistent measurement
                const words = userInputOnly.split(/(\s+)/);
                const lines = [];
                let currentLine = "";
                
                // Create temporary text for measurement
                let tempText = this.add.text(0, 0, "", {
                    fontFamily: this.inputText.style.fontFamily,
                    fontSize: this.inputText.style.fontSize,
                }).setVisible(false);
                
                // Calculate wrapped lines
                words.forEach(word => {
                    const testLine = currentLine + word;
                    tempText.setText(testLine);
                    if (tempText.width > wrapWidth && currentLine !== "") {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                });
                lines.push(currentLine);
                tempText.destroy();
                
                // Get cursor position (end of last wrapped line)
                const cursorLineIndex = lines.length - 1;
                const cursorY = inputY + cursorLineIndex * lineHeight;
                
                // Measure width of last line - this is the key part that needs to be stable
                const measureText = this.add.text(0, 0, lines[cursorLineIndex], {
                    fontFamily: this.inputText.style.fontFamily,
                    fontSize: this.inputText.style.fontSize,
                }).setVisible(false);
                let cursorX = inputX + measureText.width;
                measureText.destroy();
                
                // If cursorX exceeds wrapWidth, move to next line
                if (cursorX - inputX >= wrapWidth) {
                    cursorX = inputX;
                    cursorY += lineHeight;
                }
                
                // Store the position for stability - this prevents recalculation on every frame
                if (!this._lastCursorPos || 
                    this._lastUserInput !== userInputOnly) {
                    this._lastCursorPos = { x: cursorX, y: cursorY };
                    this._lastUserInput = userInputOnly;
                }
                
                // Use stored position instead of recalculating every time
                this.autocompleteText.setPosition(
                    this._lastCursorPos.x, 
                    this._lastCursorPos.y
                );
                this.autocompleteText.setText(autocomplete);
                this.autocompleteText.setVisible(true);
            } else {
                // Clear cached position when no autocomplete
                this._lastCursorPos = null;
                this._lastUserInput = null;
            }
        } catch (error) {
            console.error("Error in updateCursor:", error);
        }
    }
    

    showSuggestions(words) {
        // Clear any existing word objects
        if (this.currentWordObjects) {
            this.currentWordObjects.forEach(wordObj => wordObj.destroy());
        }
        this.currentWordObjects = [];
        
        // Get words (limit to topK value)
        words = Array.isArray(words) ? words.slice(0, this.topKValue) : [];
        if (words.length === 0) return;
        
        // POSITIONING: Move suggestions closer to the prompt box
        const startY = this.promptBoxY - 40; // Position between menu and prompt box
        
        // Calculate total width needed
        const baseSpacing = 20;
        let totalWidth = 0;
        let wordObjects = words.map(word => {
            let tempText = this.add.text(0, 0, word, { fontSize: "22px", fontFamily: "Nunito" }).setVisible(false);
            let boxWidth = tempText.width + 20;
            tempText.destroy();
            totalWidth += boxWidth + baseSpacing;
            return { word, width: boxWidth };
        });
        
        totalWidth -= baseSpacing; // Remove last spacing
        const startX = this.cameras.main.centerX - totalWidth / 2;
        let currentX = startX;
        
        // Create word container
        const wordContainer = this.add.container(0, startY);
        
        // Add each word with dynamic styling
        wordObjects.forEach(({ word, width }, index) => {
            // Create colored box with simple color (no conversion)
            let wordBox = this.add.graphics();
            wordBox.fillStyle(COLORS_HEX.RED, 1);
            wordBox.fillRoundedRect(-width / 2, -20, width, 40, 10);
            
            // Add border
            let wordOutline = this.add.graphics();
            wordOutline.lineStyle(BUTTON_OUTLINE_WIDTH, 0xffffff, 1);
            wordOutline.strokeRoundedRect(-width / 2, -20, width, 40, 10);
            
            // Text
            let wordText = this.add.text(0, 0, word, {
                fontFamily: "Nunito",
                fontSize: "24px",
                fill: "#ffffff",
                align: "center"
            }).setOrigin(0.5, 0.5);
            
            // Create container for this word
            let wordItem = this.add.container(currentX + width / 2, 0, [wordBox, wordOutline, wordText]);
            
            // Add to main container
            wordContainer.add(wordItem);
            this.currentWordObjects.push(wordItem);
            currentX += width + baseSpacing;
            
            // DYNAMIC ANIMATION: Staggered bounce-in effect
            wordItem.setScale(0, 0); // Start tiny
            this.tweens.add({
                targets: wordItem,
                scaleX: 1,
                scaleY: 1,
                duration: 110,
                delay: index * 50, // Stagger each word
                ease: 'Back.out(1.7)', // Bouncy overshoot effect
                onComplete: () => {
                    // Add subtle hover effect
                    this.tweens.add({
                        targets: wordItem,
                        y: { from: 0, to: -3 },
                        duration: 1200 + (index * 200), // Slightly different timing per word
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.InOut'
                    });
                }
            });
        });
        
        // Add the container to the scene
        this.add.existing(wordContainer);
        wordContainer.setDepth(15);
    }
    


    createExplosionEffect(word, x, y) {
        const explosion = this.add.text(x, y, word, {
            fontFamily: 'Nunito',
            fontSize: '22px', 
            fill: '#ff0000', 
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: explosion,
            scale: { from: 1, to: 4 }, //how big is the explosion?
            alpha: { from: 9, to: 0 }, //transparency of exploding word
            angle: { from: 0, to: 360 }, //rotation
            duration: 900,
            ease: 'Back.easeOut', //'Cubic.easeOut', //how fast does it go?
            onComplete: () => explosion.destroy()
        });
    }
 
    shakeScreen() {
        this.cameras.main.shake(250, 0.02); // Shakes for 250ms with intensity 0.02
    }    

    init(data) {
        if (!data.llmEngine) {
            console.error("Error: No llmEngine received in GameSceneEasy.");
        } else {
            console.log("llmEngine successfully received in GameSceneEasy.");
        }
        this.llmEngine = data.llmEngine || null;
        
        // Reset key scene elements to ensure proper initialization when returning from other scenes
        this.promptTextBox = null;
        this.promptText = null;
        this.outputTextBox = null;
        this.outputText = null;
    }


      
    // Add this to your create() method after creating all elements
    ensureProperLayering() {
        // Make sure prompt box is visible with proper depth
        if (this.promptTextBox) {
            this.promptTextBox.setDepth(5);
        }
        if (this.promptText) {
            this.promptText.setDepth(6);
        }
        
        // Make sure output box is visible with proper depth
        if (this.outputTextBox) {
            this.outputTextBox.setDepth(5);
        }
        if (this.outputText) {
            this.outputText.setDepth(6);
        }
        
        // Ensure fails counter doesn't overlap with other elements
        if (this.scoreDisplay) {
            this.scoreDisplay.setDepth(7);
        }
        
        // Input box should be above everything
        if (this.inputTextBorder) {
            this.inputTextBorder.setDepth(8);
        }
        if (this.inputText) {
            this.inputText.setDepth(9);
        }
        
        // Buttons should be on top
        if (this.doneButton) {
            this.doneButton.setDepth(10);
        }
        if (this.resetButton) {
            this.resetButton.setDepth(10);
        }
        if (this.feedbackButton) {
            this.feedbackButton.setDepth(10);
        }
        if (this.easyButton) {
            this.easyButton.setDepth(10);
        }
        
    }

    // Add this to your create method for debugging if needed
    ensureTextVisibility() {
        if (this.inputText) {
            this.inputText.setVisible(true);
            this.inputText.setDepth(25);
        }
        if (this.autocompleteText) {
            this.autocompleteText.setVisible(true);
            this.autocompleteText.setDepth(25);
        }
    }

    addButtonClickEffects() {
        // Apply to all buttons
        const buttons = [this.resetButton, this.doneButton, this.hardButton, this.feedbackButton];
        
        buttons.forEach(button => {
          if (!button) return;
          
          // Add click listener for particle effect
          button.setInteractive();
          
          // Replace any existing click handlers with a new one that includes particles
          button.off('pointerdown');
          button.on('pointerdown', (pointer) => {
            // Create the particle effect
            this.createButtonClickParticles(button.x, button.y);
            
            // Simulate button press animation
            this.tweens.add({
              targets: button,
              scaleX: 0.95,
              scaleY: 0.95,
              duration: 100,
              yoyo: true,
              ease: "Quad.Out",
              onComplete: () => {
                // Call the appropriate button function based on button type
                if (button === this.resetButton) this.onResetButtonClick();
                else if (button === this.doneButton) this.onDoneButtonClick();
                else if (button === this.hardButton) this.onHardModeClick();
                else if (button === this.feedbackButton) this.onFeedbackClick();
              }
            });
          });
        });
      }
      
      createButtonClickParticles(x, y) {
        // Number of particles
        const particleCount = 12;
        
        for (let i = 0; i < particleCount; i++) {
          // Create a particle
          const particle = this.add.circle(x, y, 3, 0xffffff, 0.8);
          
          // Random angle for particle direction
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 3;
          const distance = 30 + Math.random() * 30;
          
          // Randomize particle color based on easy mode theme
          const colors = [0x90caf9, 0xffd700, 0xffb6c1]; // Blue, gold, pink
          const color = colors[Math.floor(Math.random() * colors.length)];
          particle.setFillStyle(color, 0.8);
          
          // Set particle depth above buttons
          particle.setDepth(20);
          
          // Animate the particle
          this.tweens.add({
            targets: particle,
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            alpha: 0,
            scale: { from: 1, to: 0.1 },
            duration: 600 + Math.random() * 400,
            ease: 'Quad.Out',
            onComplete: () => {
              particle.destroy();
            }
          });
        }
      }

    async create() {
        this.cameras.main.scrollY = 0; // ✅ Ensures the camera starts at the top
        //this.createBackgroundEffect();
        //this.createFloatingParticles();

        // Clear any existing background elements
        if (this.background) this.background.destroy();
        if (this.particleContainer) this.particleContainer.destroy();
        this.createEasyModeBackground();
        //this.createEasyModeFloatingParticles();
        //this.createSubtleFloatingParticles();

        const margin = 100;
        const titleSize = '120px';
        const numerictitleSize = parseInt(titleSize);
        const offset = numerictitleSize + margin;

        
        this.createMenuBar();
        this.addMenuDivider();
        
        // Clear existing prompt box if it exists
        if (this.promptTextBox) {
            console.log("clearing prompt box");
            this.promptTextBox.clear();
        }
        // Always recreate the prompt text box
        this.createPromptTextBox();
        
        
        // Create a white rectangle as the input box
        this.createInputTextBox();
        this.updatePromptBasedOnLevel();


        // ✅ Manually track input box position
        const inputBoxX = this.cameras.main.centerX;
        const inputBoxY = this.cameras.main.centerY;
        const inputBoxWidth = this.cameras.main.width * (5 / 6);
        const inputBoxHeight = 240;
    
        // ✅ Correct positioning relative to the input box
        const buttonCenterX = inputBoxX + inputBoxWidth / 2 - buttonWidth - 20;
        const buttonCenterY = inputBoxY + inputBoxHeight / 2 + buttonSpacing;


        this.doneButton = this.createButton("DONE", () => this.onDoneButtonClick(), buttonCenterX, buttonCenterY);
        this.resetButton = this.createButton("RESET", () => this.onResetButtonClick(), buttonCenterX - 120, buttonCenterY);
        // Calculate position for bottom-right corner button
        const padding = 20;
        const newButtonX = this.cameras.main.width - buttonWidth / 2 - padding;
        const newButtonY = this.cameras.main.height - buttonHeight / 2 - padding;

        // Create your new button
        this.feedbackButton = this.createButton(
            "FEEDBACK", 
            () => this.onFeedbackClick(), 
            newButtonX, 
            newButtonY
        );

        // Calculate position for bottom-left corner button (mirroring feedback button)
        const hardButtonX = buttonWidth / 2 + padding;
        const hardButtonY = this.cameras.main.height - buttonHeight / 2 - padding;

        // Create the Easy Mode button
        this.hardButton = this.createButton(
            "HARD", 
            () => this.onHardModeClick(), 
            hardButtonX, 
            hardButtonY
        );

        



        this.createFailsCounter();

        this.createOutputTextBox(); //
        this.createB

        this.inputActive = false;

        
        // Ensure all elements are properly visible
        this.ensureProperLayering();
        this.ensureTextVisibility(); 
        this.enhanceEasyModeButtons();
        this.addButtonClickEffects(); // Add click effects to buttons
    }


    
    handleUserInput() {
        if (!this.llmEngine || !this.userInput.trim()) {
            console.error('LLM not loaded yet or input is empty');
            return;
        }
    
        const text = this.userInput.trim();
        const lastWord = text.split(' ').pop();
    
        // Ensure the system recognizes last word and processes it correctly
        if (this.currentWordObjects) {
            const wordTexts = this.currentWordObjects.map(obj => obj.list[1].text);
            if (wordTexts.includes(lastWord)) {
                const wordX = this.inputText.x + this.inputText.displayWidth - 20;
                const wordY = this.inputText.y + this.inputText.displayHeight - 20;
                this.createExplosionEffect(lastWord, wordX, wordY);
                this.shakeScreen();
    
                this.userInput = this.userInput.split(' ').slice(0, -2).join(' ') + ' ';
                this.inputText.setText(this.userInput || '_');
                return;
            }
        }
    
        // ✅ Generate AI suggestions
        this.generateAISuggestions(text);
    }
    
    async generateAISuggestions(userInput) {
        if (!userInput.trim()) {
            console.warn("Skipping AI suggestion generation: Empty input.");
            return; // ✅ Prevents function from running on empty input
        }
    
        console.log("Generating AI suggestions for:", userInput);
    
        //try {
            const reply = await this.llmEngine.completions.create({
                prompt: userInput,
                echo: false,
                n: 1,
                max_tokens: 1,
                logprobs: true,
                top_logprobs: 5, //this.topKValue,
                //logit_bias: stopword_bias, not implemented for this model
            });
    
            if (!reply.choices || reply.choices.length === 0 || !reply.choices[0].logprobs) {
                console.warn("AI response is missing expected properties.");
                return;
            }

            let options = reply.choices[0].logprobs.content[0].top_logprobs;
            
            options.sort((a, b) => b.logprob - a.logprob);

            const filteredOptions = options
                .map(choice => choice.token.trim())            // Trim whitespace
                .filter(token => token !== '')                 // Remove empty strings (including just spaces)
                .filter(token => !stopwords.includes(token.toLowerCase())); // Remove stopwords

            // Deduplicate words (ensure uniqueness)
            const uniqueSuggestedWords = Array.from(new Set(filteredOptions))
                .slice(0, this.topKValue);  // Limit to top K after deduplication

    
            console.log("AI Suggested Words:", uniqueSuggestedWords);

            this.aiSuggestedWords = uniqueSuggestedWords;
    
            this.showSuggestions(uniqueSuggestedWords);
        // } catch (error) {
        //     console.error("Error generating text:", error);
        // }
    }
    
    
    
    
    
}

