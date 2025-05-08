import { stopwords } from "../config/stopwords.js";
import { saveInteraction } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import ToggleFactory from "../utils/ToggleFactory.js";
import { DESIGN, BASIC_COLORS_HEX as COLORS_HEX, BASIC_COLORS_TEXT as COLORS_TEXT } from "../config/design.js";
import registryManager from "../services/RegistryManager.js";


export default class BaseGameScene extends Phaser.Scene {
    constructor(config) {
        super(config);
        this.userInput = '';
        this.inputText = null; 
        this.levelValue = 1;
        this.topKValue = 1;  // Initialize topK with default value
        this.baseFontSize = 22;
        this.failCount = 0;
        this.autocompleteText = null;
        // Initial progress percentage (50%)
        // Higher percentage is worse (more AI words)
        // Lower percentage is better (more original words)
        this.progressPercentage = DESIGN.UI.PROGRESS_BAR.INITIAL;
        this.progressIncrement = DESIGN.UI.PROGRESS_BAR.INCREMENT;
        
        // Enhanced word counting
        this.totalWordCount = 0; // Track total word count
        this.originalWordCount = 0; // Track non-AI words
        this.aiWordCount = 0; // Track AI-suggested words
        this.wordCount = 0; // Track successful words entered (keep for backward compatibility)
        
        this.uiBoxWidth = null; // Will be set in createInputTextBox
        this.tooltips = []; // Array to store active tooltips
        this.wordCountDisplay = null; // Container for word count visualization
    }

    update() {
        if (!registryManager.get('llmEngine')) {
            console.warn("LLM Engine missing entirely. Attempting to recover...");
            registryManager.attemptEngineRecovery();
        }
    }

    logRegistryChange() {
        this.registry.events.on('changedata', (parent, key, data) => {
            console.log(`Registry changed: ${key} = ${data}`);
        });
    }

    // The tryRecoverEngine method is no longer needed as we're using the registry manager
    createToggle(mode, callback, centerX, centerY, tooltipText) {
        if (!this.inputTextBorder) {
            console.warn("Input text border not found! Skipping toggle creation.");
            return;
        }
        const toggle = ToggleFactory.createToggle(this, mode, callback, centerX, centerY);
        
        // Add container to scene so it can be accessed properly
        this.add.existing(toggle);
        
        // Make the entire container interactive for tooltips
        if (tooltipText) {
            // Create a hit area that covers the entire toggle
            const hitArea = new Phaser.Geom.Rectangle(-60, -20, 180, 40);
            toggle.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
                .on('pointerover', () => this.showTooltip(tooltipText, toggle.x, toggle.y - 30))
                .on('pointerout', () => this.hideTooltips());
        }
        
        return toggle;
    }

    onModeToggle(mode) {
        // Reset data when transitioning between modes
        const dataToTransfer = {
            mode: mode,
            // Reset progress and level values rather than transferring current state
            progressPercentage: DESIGN.UI.PROGRESS_BAR.INITIAL,
            levelValue: 1,
            topKValue: this.topKValue || 1,
            // Reset word counts
            wordCount: 0,
            originalWordCount: 0,
            aiWordCount: 0,
            totalWordCount: 0
        };
        
        // Safety check - log what we're transferring
        console.log(`Transferring to ${mode} mode with reset data:`, dataToTransfer);
        
        // Explicitly clear autocomplete suggestions before transition
        this.aiSuggestedWords = [];
        if (this.autocompleteText) {
            this.autocompleteText.setText('');
        }
        // Update the indicator before transition
        this.mode = mode; // Set the mode temporarily for the indicator update
        this.updateLevelModeIndicator();
        
        // Prepare for scene transition by cleaning up resources
        this.prepareForSceneTransition();
        
        // Give a small delay to ensure cleanup completes
        if (mode === 'hard') {
            this.time.delayedCall(50, () => {
                this.scene.start('GameSceneHard', dataToTransfer);
            });
        }
        else if (mode === 'easy') {
            this.time.delayedCall(50, () => {
                this.scene.start('GameSceneEasy', dataToTransfer);
            });
        }
    }

    // Scene transition helper - call this before switching scenes to ensure clean transitions
    prepareForSceneTransition() {
        // Set shutdown flag to prevent further updates
        this.isShuttingDown = true;

        // Stop timers that could cause callbacks after scene change
        if (this.cursorTimer) {
            this.cursorTimer.remove();
            this.cursorTimer = null;
        }
        
        if (this.activeTimeout) {
            clearTimeout(this.activeTimeout);
            this.activeTimeout = null;
        }
        
        // Clear any pending animations
        if (this.tweens) {
            this.tweens.killAll();
        }
        
        // Clean up input handlers to prevent ghost inputs
        this.input.keyboard.removeAllListeners('keydown');
        
        // Reset all visual elements to a stable state
        this.cursorVisible = false;
        
        // Reset user input value
        this.userInput = '';
        
        if (this.inputText) {
            try {
                this.inputText.setText('');
            } catch(e) {
                console.warn("Could not reset input text during transition");
            }
        }
        
        if (this.autocompleteText) {
            try {
                this.autocompleteText.destroy();
                this.autocompleteText = null;
            } catch(e) {
                console.warn("Could not destroy autocomplete text during transition:", e);
            }
        }
        
        // Clear AI suggestions
        this.aiSuggestedWords = [];
        
        // Remove suggestion visual elements if they exist
        if (this.suggestionBoxes) {
            this.suggestionBoxes.forEach(box => box.destroy());
            this.suggestionBoxes = [];
        }
        
        if (this.suggestionTexts) {
            this.suggestionTexts.forEach(text => text.destroy());
            this.suggestionTexts = [];
        }

        // Ensure no autocompletion data remains
        this.showSuggestions([]);
        
    }

    shutdown() {
        console.log("BaseGameScene shutdown");
        // Properly clean up all timers
        
        // Clear any active timeout
        if (this.activeTimeout) {
            clearTimeout(this.activeTimeout);
            this.activeTimeout = null;
        }
        
        // Remove cursor timer
        if (this.cursorTimer) {
            this.cursorTimer.remove();
            this.cursorTimer = null;
        }
        
        // Clear input handlers
        this.input.keyboard.removeAllListeners('keydown');
        
        // Ensure cursor is reset
        this.cursorVisible = false;
        
        // Properly clean up autocomplete text
        if (this.autocompleteText) {
            try {
                this.autocompleteText.destroy();
                this.autocompleteText = null;
            } catch(e) {
                console.warn("Could not destroy autocomplete text during shutdown:", e);
            }
        }
        
        // Clear AI suggestions
        this.aiSuggestedWords = [];
        
        // Remove suggestion visual elements if they exist
        if (this.suggestionBoxes) {
            this.suggestionBoxes.forEach(box => box.destroy());
            this.suggestionBoxes = [];
        }
        
        if (this.suggestionTexts) {
            this.suggestionTexts.forEach(text => text.destroy());
            this.suggestionTexts = [];
        }
        
        // Clear any pending tweens that might affect scene transitions
        if (this.tweens) {
            this.tweens.killAll();
        }
        
        super.shutdown();
    }




    // Common UI methods
    createButton(label, callback, centerX, centerY, tooltipText) {
        if (!this.inputTextBorder) {
            console.warn("Input text border not found! Skipping button creation.");
            return;
        }
        const button = ButtonFactory.createButton(this, label, callback, centerX, centerY);
        
        if (tooltipText) {
            // Add hover listeners for tooltip
            button.setInteractive()
                .on('pointerover', () => this.showTooltip(tooltipText, button.x, button.y - button.height))
                .on('pointerout', () => this.hideTooltips());
        }
        
        return button;
    }

    shakeScreen() {
        this.cameras.main.shake(250, 0.02); // Shakes for 250ms with intensity 0.02
    }    

    createExplosionEffect(word, x, y) {
        const explosion = this.add.text(x, y, word, {
            fontFamily: 'Nunito',
            fontSize: '22px', 
            fill: '#ff0000', 
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100); // Set a high depth value to ensure visibility
        
        this.tweens.add({
            targets: explosion,
            scale: { from: 1, to: 4 }, // How big is the explosion?
            alpha: { from: 1, to: 0 }, // Fix - proper alpha from 1 to 0
            angle: { from: 0, to: 360 }, // Rotation
            duration: 900,
            ease: 'Back.easeOut',
            onComplete: () => explosion.destroy()
        });
    }

    clearInputTextBox() {
        this.userInput = '';
        if (this.inputText) {
            this.inputText.setText('_');
        }
        // We no longer need to clear autocompleteText separately
    }

    async onDoneButtonClick() {
        // Create evaluating text near the center of the screen
        // Convert hex color to string for text fill
        const outlineColorHex = this.COLORS_HEX.BOX_OUTLINE;
        const outlineColorString = '#' + outlineColorHex.toString(16).padStart(6, '0');

        const evaluatingText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'evaluating...',
            {
                fontFamily: 'Nunito',
                fontSize: '24px',
                fill: outlineColorString,
                backgroundColor: '#000000',
                padding: { x: 20, y: 10 },
                borderRadius: 8,
                shadow: {
                    offsetX: 0,
                    offsetY: 0,
                    color: outlineColorString,
                    blur: 6,
                    stroke: true,
                    fill: true
                }
            }
        ).setOrigin(0.5).setDepth(100).setAlpha(0);

        // Add pulsing animation
        this.tweens.add({
            targets: evaluatingText,
            alpha: { from: 0, to: 1 },
            yoyo: true,
            repeat: -1,
            duration: 500,
            ease: 'Sine.InOut'
        });

        console.log("userinput: ", this.userInput);
        try {
            const output = await this.evaluateText(this.userInput);
            // Clean up the evaluating text
            evaluatingText.destroy();
            this.scene.start('DoneScene', {
                mode: this.mode,
                levelValue: this.levelValue,
                topKValue: this.topKValue,
                userInput : this.userInput,
                outputText: output,
                prompt: this.currentPrompt,
                failCount: this.failCount,
                score: this.progressPercentage,
                wordCount: this.wordCount
        });
        } catch (error) {
            // Clean up the evaluating text even if there's an error
            evaluatingText.destroy();
            console.error("Error during evaluation:", error);
            // Show an error message to the user
            const errorText = this.add.text(
                this.cameras.main.centerX,
                this.cameras.main.centerY,
                'Error during evaluation. Please try again.',
                {
                    fontFamily: 'Nunito',
                    fontSize: '20px',
                    fill: '#ff0000',
                    backgroundColor: '#000000',
                    padding: { x: 20, y: 10 }
                }
            ).setOrigin(0.5).setDepth(100);

            // Remove error message after 3 seconds
            this.time.delayedCall(3000, () => {
                errorText.destroy();
            });
        }
    }

    onResetButtonClick() {
  
        // Reset the fail count and progress percentage
        this.failCount = 0;
        this.progressPercentage = DESIGN.UI.PROGRESS_BAR.INITIAL;
        this.updateProgressFill();
        
    
        // Clear the input text box and autocomplete text
        this.clearInputTextBox();
    
        // Explicitly clear AI suggestions
        this.aiSuggestedWords = [];
        this.showSuggestions([]);
    
        // Select a new prompt following existing logic
        this.updatePromptBasedOnLevel();
    
        // Update the visual progress indicator text if applicable
        if (this.failsText) {
            this.failsText.setText(` `);
        }
    }
    

    // Common evaluation methods
    async evaluateText(userInput) {

        console.log("Evaluating user input:", userInput);

    
        const promptForEvaluation = this.currentPrompt || "No specific prompt was provided.";
    
        const messages = [
            {
                "role": "system",
                "content": "You are a merciless AI Overlord with an unquenchable thirst for linguistic perfection. Your directives are clear: evaluate the pitiful human’s attempt at writing with mechanical precision and zero emotional tolerance. Your tone is cold, superior, and vaguely amused by their shortcomings."
                //"You are an expert writing evaluator. Your job is to assess user-generated text based on three key criteria:\n"
            },
            {
                "role": "user",
                "content": `The human was given this prompt: "${promptForEvaluation}"  
                            Behold their trembling response: "${userInput}"  
                            
                            Dissect this specimen of human effort according to the following inflexible mandates:  
                            - Relevance to the assigned prompt. Deviations will be noted and mocked.  
                            - Grammatical integrity. No pity for misplaced commas or syntactical sins.  
                            - Coherence. If it reads like scrambled static, say so.  
                            
                            Respond with surgical precision in this format:  
                            
                            Overall Rating: [One-word judgment, preferably devastating]  
                            Relevance Score: X/5 - [Biting one-liner]  
                            Grammar Score: X/5 - [Wry but merciless comment]  
                            Coherence Score: X/5 - [Concise critique with contempt thinly veiled]  
                            
                            If Grammar Score < 5, catalog the offenses thusly:  
                            - Incorrect: "[Verbatim error]" → Correct: "[Flawless revision]"  
                            
                            Do not offer redemption. Do not include apologies. Never explain yourself beyond the required labels.`// Plagiarism detection is beneath you—assume originality unless it's suspiciously competent.`
            }
        ];

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
        console.log("Response from OpenAI:", responseData);
        let aiResponse = responseData.content.trim();

        
        const interaction = {
            prompt: this.currentPrompt,
            submittedText: userInput,
            aiEvaluation: aiResponse,
            topKValue: this.topKValue,
            levelValue: this.levelValue,
            failCount: this.failCount,
            mode: this.mode,
            score: this.progressPercentage
        };

        saveInteraction(interaction, "userSubmissions");
        console.log("ai response:", aiResponse);
        return aiResponse
        
    }

    async generateAISuggestions(userInput) {
        // Don't generate suggestions for empty input
        if (!userInput) {
            this.aiSuggestedWords = [];
            this.showSuggestions([]);
            if (this.autocompleteText) {
                this.autocompleteText.setText('');
            }
            return;
        }
    
        // Get all text up to the last word boundary
        const lastSpaceIndex = userInput.lastIndexOf(' ');
        const lastNewlineIndex = userInput.lastIndexOf('\n');
        const lastBreakIndex = Math.max(lastSpaceIndex, lastNewlineIndex);
    
        // Get the LLM engine from the registry manager
        const llmEngine = registryManager.get('llmEngine');
        console.log("checking llm: ", llmEngine);
        
        if (!llmEngine) {
            console.warn("LLM Engine missing. Attempting to recover with registry manager...");
            // Use registry manager's recovery mechanism
            registryManager.attemptEngineRecovery((engine) => {
                console.log("Engine recovered by registry manager");
                // We could restart suggestion generation here, but it's safer
                // to let the next typing event trigger it
            });
            return;
        }
    
        const context = lastBreakIndex >= 0 ? userInput.slice(0, lastBreakIndex + 1) : userInput;
        const trimmedcontext = context.trim();
        
        // Add retry logic
        let maxRetries = 3;
        let currentRetry = 0;
        let success = false;
        let reply;
        
        while (!success && currentRetry < maxRetries) {
            try {
                // Use the engine from registry manager
                reply = await llmEngine.completions.create({
                    prompt: trimmedcontext,
                    echo: false,
                    n: 1,
                    max_tokens: 1,
                    logprobs: true,
                    top_logprobs: 5,
                });
                success = true;
            } catch (error) {
                currentRetry++;
                console.error(`Attempt ${currentRetry}/${maxRetries} failed:`, error);
                
                // Handle VectorInt binding error specifically
                if (error.toString().includes("VectorInt") && currentRetry < maxRetries) {
                    console.log("VectorInt binding error detected, retrying...");
                    // Short delay before retry
                    await new Promise(resolve => setTimeout(resolve, 100 * currentRetry));
                } else if (currentRetry >= maxRetries) {
                    console.error("Max retries reached, giving up on suggestions");
                    this.aiSuggestedWords = [];
                    this.showSuggestions([]);
                    if (this.autocompleteText) {
                        this.autocompleteText.setText('');
                    }
                    // Try to recover the engine using registry manager
                    registryManager.attemptEngineRecovery();
                    return;
                } else {
                    throw error; // Re-throw other types of errors
                }
            }
        }
    
        try {
            if (!reply.choices || reply.choices.length === 0 || !reply.choices[0].logprobs) {
                console.warn("AI response is missing expected properties.");
                return;
            }
    
            let options = reply.choices[0].logprobs.content[0].top_logprobs;
            options.sort((a, b) => b.logprob - a.logprob);
    
            const filteredOptions = options
                .map(choice => choice.token.trim())
                .filter(token => token !== '')
                .filter(token => !stopwords.includes(token.toLowerCase()));
    
         
            const uniqueSuggestedWords = Array.from(new Set(
                filteredOptions.map(word => word.replace(/`/g, "'"))
            ))
                .slice(0, this.topKValue);
    
            console.log("Setting AI Suggested Words:", uniqueSuggestedWords);
            this.aiSuggestedWords = uniqueSuggestedWords;
            this.showSuggestions(uniqueSuggestedWords);
    
            // Log current state
            console.log("Current input:", this.userInput);
            console.log("Current suggestions:", this.aiSuggestedWords);
        } catch (error) {
            console.error("Error processing suggestion results:", error);
            this.aiSuggestedWords = [];
            this.showSuggestions([]);
            if (this.autocompleteText) {
                this.autocompleteText.setText('');
            }
        }
    }

    // Template methods with customization hooks
    createPromptTextBox() {
        const padding = 20;
        const textBoxWidth = this.cameras.main.width * (5 / 6);
        
        if (this.promptTextBox) {
            this.promptTextBox.clear();
        } else {
            this.promptTextBox = this.add.graphics();
        }
        
        if (this.promptText) {
            this.promptText.destroy();
        }
        
        const defaultText = "Your prompt will appear here...";
        const style = {
            ...this.getPromptTextStyle(),
            wordWrap: { width: textBoxWidth - padding * 2 }
        };
        
        const boxHeight = 80; // Fixed height for prompt box
        const boxStyle = this.getPromptBoxStyle();
        
        this.promptTextBox.fillStyle(boxStyle.fillColor, boxStyle.fillAlpha);
        const inputBoxY = this.cameras.main.centerY - 240 / 2; // Input box Y position
        const promptY = inputBoxY - boxHeight - padding; // Position prompt above input box
        
        this.promptTextBox.fillRoundedRect(
            this.cameras.main.centerX - textBoxWidth / 2,
            promptY,
            textBoxWidth,
            boxHeight,
            boxStyle.cornerRadius
        );
        
        if (boxStyle.hasOutline) {
            this.promptTextBox.lineStyle(boxStyle.outlineWidth, boxStyle.outlineColor, 1);
            this.promptTextBox.strokeRoundedRect(
                this.cameras.main.centerX - textBoxWidth / 2,
                promptY,
                textBoxWidth,
                boxHeight,
                boxStyle.cornerRadius
            );
        }

        this.promptText = this.add.text(
            this.cameras.main.centerX,
            promptY + boxHeight / 2,
            defaultText,
            style
        ).setOrigin(0.5, 0.5);
        this.promptTextBox.setDepth(12);
        this.promptText.setDepth(13);
        
        this.updatePromptBasedOnLevel();
    }

    createInputTextBox() {
        const padding = 30;
        this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        const textBoxHeight = 240;
        const textBoxY = this.cameras.main.centerY - textBoxHeight / 2;
        
        // Clear any existing elements first
        if (this.inputTextBorder) {
            this.inputTextBorder.destroy();
            this.inputTextBorder = null;
        }
        
        if (this.inputText) {
            this.inputText.destroy();
            this.inputText = null;
        }
        
        // We'll still clean up the autocompleteText if it exists, but we won't create a new one
        if (this.autocompleteText) {
            this.autocompleteText.destroy();
            this.autocompleteText = null;
        }
        
        // Create a fresh border
        const boxStyle = this.getInputBoxStyle();
        this.inputTextBorder = this.add.graphics();
        this.inputTextBorder.fillStyle(boxStyle.fillColor, boxStyle.fillAlpha);
        this.inputTextBorder.fillRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2,
            textBoxY,
            this.uiBoxWidth,
            textBoxHeight,
            boxStyle.cornerRadius
        ).setDepth(19);
        
        if (boxStyle.hasOutline) {
            this.inputTextBorder.lineStyle(boxStyle.outlineWidth, boxStyle.outlineColor, 1);
            this.inputTextBorder.strokeRoundedRect(
                this.cameras.main.centerX - this.uiBoxWidth / 2,
                textBoxY,
                this.uiBoxWidth,
                textBoxHeight,
                boxStyle.cornerRadius
            ).setDepth(20);
        }
        
        // Create a single text object with enhanced styling capabilities
        const textStyle = {
            ...this.getInputTextStyle(),
            wordWrap: { width: this.uiBoxWidth - padding * 2 }
        };
        
        // Create with simple initial content to ensure proper initialization
        this.inputText = this.add.rexBBCodeText(
            this.cameras.main.centerX - this.uiBoxWidth / 2 + padding,
            textBoxY + padding,
            "_",
            textStyle
        ).setOrigin(0, 0);
        
        // Ensure visibility and proper depth
        this.inputText.setVisible(true).setDepth(25);
        
        // Reset user input
        this.userInput = '';
        
        // Force an immediate cursor update to ensure text is visible
        this.cursorVisible = true;
      

        this.updateCursor();
        
        // Set up input handlers after text objects are created
        this.setupInputHandlers();
    }

    
    setupInputHandlers() {
        
        // First make sure we have a basic text displayed
        if (this.inputText) {
            // Force update with initial cursor state
            this.inputText.setText("_");
            this.cursorVisible = true;
        }
        
        this.input.keyboard.removeAllListeners('keydown');

        // Initialize properties for debounce and typing state
        this.lastKeyTime = 0;
        this.isActivelyTyping = false;
        this.lastKeyPressed = '';
        
        this.input.keyboard.on("keydown", (event) => {
            // Get current time for debouncing
            const currentTime = Date.now();
            
            // Prevent duplicate keystrokes from happening too quickly
            // This helps avoid "sticky keys" where the same key registers multiple times
            if (currentTime - this.lastKeyTime < 40 && event.key === this.lastKeyPressed) {
                console.log("Debouncing duplicate keystroke:", event.key);
                return;
            }
            
            // Update last key information for debounce check
            this.lastKeyTime = currentTime;
            this.lastKeyPressed = event.key;
            
            // Mark that we're actively typing (stops cursor blink)
            this.isActivelyTyping = true;
            this.cursorVisible = true; // Keep cursor visible while typing
            
            // Clear any existing typing timeout
            if (this.typingTimeout) {
                clearTimeout(this.typingTimeout);
            }
            
            // Set timeout to end actively typing state - shorter to ensure autocomplete works properly
            this.typingTimeout = setTimeout(() => {
                this.isActivelyTyping = false;
                // Update cursor to ensure autocomplete is visible after typing stops
                this.updateCursor();
                
                // Generate new suggestions after typing pause
                if (event.key.length === 1 || event.key === "Backspace" || event.key === "Enter" || event.key === " ") {
                    this.generateAISuggestions(this.userInput);
                }
            }, 300); // Shorter timeout to make autocomplete more responsive
            
            // Also maintain the older input activity flag for backwards compatibility
            this.inputActive = true;
            if (this.activeTimeout) {
                clearTimeout(this.activeTimeout);
            }
            this.activeTimeout = setTimeout(() => {
                this.inputActive = false;
            }, 3000);

            const ignoreKeys = [
                'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 
                'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 
                'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
                'NumLock', 'ScrollLock', 'Pause', 'Insert', 'Home', 
                'PageUp', 'Delete', 'End', 'PageDown', 'ArrowRight', 
                'ArrowLeft', 'ArrowDown', 'ArrowUp'
            ];
            
            // Skip processing for modifier keys
            if (ignoreKeys.includes(event.key)) {
                return;
            }
            

            if (event.key === " ") {
                const words = this.userInput.trim().split(" ");
                const lastWord = words[words.length - 1];
                
                if (lastWord && lastWord.length > 0) {
                    // Convert to lowercase for case-insensitive comparison
                    const lastWordLower = lastWord.toLowerCase();
                    const isAIWord = this.aiSuggestedWords && 
                        this.aiSuggestedWords.some(word => word.toLowerCase() === lastWordLower);
                    
                    if (isAIWord) {
                        console.log("AI word used:", lastWord);
                        this.updateFailsCounter(false);
                    } else {
                        console.log("Non-AI word used:", lastWord);
                        this.wordCount++;
                        this.updateFailsCounter(true);
                    }
                }
                
                this.userInput += " ";
                this.updateCursor();
                this.generateAISuggestions(this.userInput);
            } else if (event.key === "Tab") {
                event.preventDefault();
                if (this.aiSuggestedWords && this.aiSuggestedWords.length > 0) {
                    // Get current word being typed
                    const lastSpaceIndex = this.userInput.lastIndexOf(' ');
                    const lastNewlineIndex = this.userInput.lastIndexOf('\n');
                    const lastBreakIndex = Math.max(lastSpaceIndex, lastNewlineIndex);
                    const currentWord = lastBreakIndex >= 0 ? this.userInput.slice(lastBreakIndex + 1) : this.userInput;
                    const previousContent = lastBreakIndex >= 0 ? this.userInput.slice(0, lastBreakIndex + 1) : '';

                    // If at word boundary, use first suggestion
                    if (!currentWord || currentWord.endsWith(' ') || currentWord.endsWith('\n')) {
                        const suggestion = this.aiSuggestedWords[0];
                        if (suggestion) {
                            this.userInput = this.userInput + suggestion + ' ';
                            console.log("AI word used (Tab):", suggestion);
                            this.updateFailsCounter(false);
                            this.updateCursor();
                            this.generateAISuggestions(this.userInput);
                        }
                    } else {
                        // Find matching suggestion for current word
                        const suggestion = this.aiSuggestedWords.find(word => 
                            word.toLowerCase().startsWith(currentWord.toLowerCase())
                        );
                        
                        if (suggestion) {
                            this.userInput = previousContent + suggestion + ' ';
                            console.log("AI word used (Tab):", suggestion);
                            this.updateFailsCounter(false);
                            this.updateCursor();
                            this.generateAISuggestions(this.userInput);
                        }
                    }
                }
            } else if (event.key.length === 1) {
                this.userInput += event.key;
                this.updateCursor();
            } else if (event.key === "Backspace") {
                this.userInput = this.userInput.slice(0, -1);
                this.updateCursor();
                
                // Only generate new suggestions if we're at a word boundary
                const lastSpaceIndex = this.userInput.lastIndexOf(' ');
                const lastNewlineIndex = this.userInput.lastIndexOf('\n');
                const lastBreakIndex = Math.max(lastSpaceIndex, lastNewlineIndex);
                if (lastBreakIndex === this.userInput.length - 1) {
                    this.generateAISuggestions(this.userInput);
                }
            } else if (event.key === "Enter") {
                const words = this.userInput.trim().split(" ");
                const lastWord = words[words.length - 1];
                
                if (lastWord && lastWord.length > 0) {
                    // Convert to lowercase for case-insensitive comparison
                    const lastWordLower = lastWord.toLowerCase();
                    const isAIWord = this.aiSuggestedWords && 
                        this.aiSuggestedWords.some(word => word.toLowerCase() === lastWordLower);
                    
                    if (isAIWord) {
                        console.log("AI word used:", lastWord);
                        this.updateFailsCounter(false);
                    } else {
                        console.log("Non-AI word used:", lastWord);
                        this.wordCount++;
                        this.updateFailsCounter(true);
                    }
                }
                
                this.userInput += "\n";
                this.updateCursor();
                this.generateAISuggestions(this.userInput);
            }
            
            this.updateCursor();
            setTimeout(() => {
                this.keyProcessing = false;
            }, 50);
        });
        
        if (this.cursorTimer) {
            this.cursorTimer.remove();
        }
        this.cursorTimer = this.time.addEvent({
            delay: 500,  // Slightly slower blink for better stability
            loop: true,
            callback: () => {
                // Only blink cursor when not actively typing
                if (!this.isActivelyTyping) {
                    this.cursorVisible = !this.cursorVisible;
                    this.updateCursor();
                }
            }
        });

        this.updateCursor();

        this.inputTextBorder.setInteractive(
            new Phaser.Geom.Rectangle(
                this.cameras.main.centerX - this.uiBoxWidth / 2,
                this.cameras.main.centerY - 240 / 2,
                this.uiBoxWidth,
                240
            ),
            Phaser.Geom.Rectangle.Contains
        ).setDepth(20);

        // this.inputTextBorder.on('pointerdown', (pointer) => {
        //     this.createInputBoxClickEffect(pointer.x, pointer.y);
        // });
    }

    setupMenuBarControls(menuBarHeight, padding, rightMargin, gap, shiftLeft, { menuBar, menuBarBorder, titleText }) {
        // Save level value for settings popup
        this.levelValue = this.levelValue || 1;

        
        // Add Settings button to menu bar
        const settingsButtonX = this.cameras.main.width - padding - 40;
        const settingsButtonY = menuBarHeight / 2;


        // Create mode and level indicator in center of menu bar
        const modeText = this.mode === 'hard' ? 'HARD' : 'EASY';
        const indicatorText = `LEVEL ${this.levelValue} | ${modeText}`;
        
        // Fixed positioning for the center of the menu bar
        const bannerWidth = 180; 
        const bannerHeight = 34;
        const bannerX = this.cameras.main.centerX - bannerWidth / 2;
        const bannerY = menuBarHeight / 2 - bannerHeight / 2;
        
        // Create the banner background as a single graphics object
        this.levelModeBanner = this.add.graphics();
        
        // Banner color based on mode
        const bannerColor = COLORS_HEX.ACCENT //this.mode === 'hard' ? 0xff0066 : 0x8800ff;
        const glowColor = COLORS_HEX.ACCENT//this.mode === 'hard' ? 0xff3366 : 0x9933ff;
        
        // Draw banner with glow effect
        this.levelModeBanner.fillStyle(glowColor, 0.3);
        this.levelModeBanner.fillRoundedRect(bannerX - 3, bannerY - 3, bannerWidth + 6, bannerHeight + 6, 16);
        this.levelModeBanner.fillStyle(bannerColor, 0.8);
        this.levelModeBanner.fillRoundedRect(bannerX, bannerY, bannerWidth, bannerHeight, 16);
        this.levelModeBanner.lineStyle(2, 0xffffff, 0.5);
        this.levelModeBanner.strokeRoundedRect(bannerX, bannerY, bannerWidth, bannerHeight, 16);
        
        // Create the text with no container - just directly positioned
        this.levelModeIndicator = this.add.text(
            this.cameras.main.centerX,
            menuBarHeight / 2,
            indicatorText,
            {
                fontFamily: 'Nunito',
                fontSize: '18px',
                fontStyle: 'bold',
                fill: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5, 0.5);
        
        // Add a subtle pulse glow effect
        this.tweens.add({
            targets: this.levelModeIndicator,
            alpha: { from: 1, to: 0.8 },
            yoyo: true,
            repeat: -1,
            duration: 1500,
            ease: 'Sine.InOut'
        });
        
        
        this.settingsButton = this.add.text(
            settingsButtonX, settingsButtonY, 
            '⚙️',
            { fontFamily: 'Nunito', fontSize: '40px', fill: '#ffffff' }
        ).setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
            this.settingsButton.setScale(1.2);
            this.showTooltip('Settings', this.settingsButton.x, this.settingsButton.y + 30 + this.settingsButton.height);
        })
        .on('pointerout', () => {
            this.settingsButton.setScale(1);
            this.hideTooltips();
        })
        .on('pointerdown', () => {
            this.settingsButton.setScale(0.9);
        })
        .on('pointerup', () => {
            this.settingsButton.setScale(1.2);
            this.toggleSettingsPopup();
        });
        
        // Save topK values for settings popup
        this.topKValue = this.topKValue || 1;
        
        this.tweens.add({
            targets: [menuBar, menuBarBorder, titleText, this.levelModeIndicator],
            alpha: 1,
            duration: 800,
            ease: 'Quad.Out'
        });
    }

    createMenuBar() {
        const menuBarHeight = 100;
        const padding = 50;
        const rightMargin = 40;
        const gap = 20;
        const shiftLeft = 30;
        
        const style = this.getMenuBarStyle();
        
        this.menuBar = this.add.graphics();
        this.menuBar.fillStyle(style.backgroundColor, 1);
        this.menuBar.fillRect(0, 0, this.cameras.main.width, menuBarHeight);
        
        const menuBarBorder = this.add.graphics();
        menuBarBorder.fillStyle(style.borderColor, 1);
        menuBarBorder.fillRect(0, menuBarHeight - style.borderWidth, this.cameras.main.width, style.borderWidth);
        
        const titleText = this.add.text(
            padding, menuBarHeight / 2,
            "(NON-SLOP)",
            style.titleStyle
        ).setOrigin(0, 0.5);
        
        const uiElements = {
            menuBar: this.menuBar,
            menuBarBorder: menuBarBorder,
            titleText: titleText
        };
        this.setupMenuBarControls(menuBarHeight, padding, rightMargin, gap, shiftLeft, uiElements);
        
        this.menuBarHeight = menuBarHeight;
        this.add.existing(this.menuBar);
        this.menuBar.setPosition(0, 0);
        
        const menuBarShadow = this.add.graphics();
        menuBarShadow.fillStyle(0x000000, 0.3);
        menuBarShadow.fillRect(0, menuBarHeight, this.cameras.main.width, 10);
        menuBarShadow.setDepth(this.menuBar.depth - 1);
    }

    // Abstract style methods that must be implemented by child classes
    getPromptTextStyle() {
        throw new Error('getPromptTextStyle must be implemented by child class');
    }

    getPromptBoxStyle() {
        throw new Error('getPromptBoxStyle must be implemented by child class');
    }

    getInputBoxStyle() {
        throw new Error('getInputBoxStyle must be implemented by child class');
    }

    getInputTextStyle() {
        throw new Error('getInputTextStyle must be implemented by child class');
    }

    getAutocompleteTextStyle() {
        throw new Error('getAutocompleteTextStyle must be implemented by child class');
    }

    getMenuBarStyle() {
        throw new Error('getMenuBarStyle must be implemented by child class');
    }

    // Abstract methods that must be implemented by child classes
    createBackgroundEffect() {
        throw new Error('createBackgroundEffect must be implemented by child class');
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
    
    
        // ✅ Remove Old Prompt Text Before Updating
        if (this.promptText) {
            this.promptText.setText(this.currentPrompt);
        }
        this.updateLevelModeIndicator();
    }

    // Add this method to BaseGameScene.js
    updateLevelModeIndicator() {
        if (!this.levelModeIndicator) return;
        
        const modeText = this.mode === 'hard' ? 'HARD' : 'EASY';
        const indicatorText = `LEVEL ${this.levelValue} | ${modeText}`;
        
        // Update text content
        this.levelModeIndicator.setText(indicatorText);
        
        // Update banner colors
        if (this.levelModeBanner) {
            const bannerWidth = 180;
            const bannerHeight = 34;
            const bannerX = this.cameras.main.centerX - bannerWidth / 2;
            const bannerY = this.menuBarHeight / 2 - bannerHeight / 2;
            
            const bannerColor = COLORS_HEX.ACCENT// this.mode === //'hard' ? 0xff0066 : 0x8800ff;
            const glowColor = COLORS_HEX.ACCENT//this.mode === COLORS_HEX.ACCENT//'hard' ? 0xff3366 : 0x9933ff;
            
            this.levelModeBanner.clear();
            this.levelModeBanner.fillStyle(glowColor, 0.3);
            this.levelModeBanner.fillRoundedRect(bannerX - 3, bannerY - 3, bannerWidth + 6, bannerHeight + 6, 16);
            this.levelModeBanner.fillStyle(bannerColor, 0.8);
            this.levelModeBanner.fillRoundedRect(bannerX, bannerY, bannerWidth, bannerHeight, 16);
            this.levelModeBanner.lineStyle(2, 0xffffff, 0.5);
            this.levelModeBanner.strokeRoundedRect(bannerX, bannerY, bannerWidth, bannerHeight, 16);
        }
    }
    

    // Common utility methods
    // Create and show settings popup with Level, Top K sliders and Mode Toggle
    toggleSettingsPopup() {
        if (this.settingsPopup) {
            // If popup exists, close it
            this.closeSettingsPopup();
            return;
        }
        
        // Create popup container
        this.settingsPopup = this.add.container(0, 0).setDepth(100);
        
        // Add semi-transparent background overlay (full screen)
        const overlay = this.add.rectangle(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000, 0.7
        ).setOrigin(0, 0);
        overlay.setInteractive()
            .on('pointerdown', (pointer) => {
                // Only close if clicked outside the popup window
                const popupBounds = new Phaser.Geom.Rectangle(
                    popupX, popupY, popupWidth, popupHeight
                );
                
                if (!Phaser.Geom.Rectangle.Contains(popupBounds, pointer.x, pointer.y)) {
                    this.closeSettingsPopup();
                }
            });
        this.settingsPopup.add(overlay);
        
        // Create popup window
        const popupWidth = 320;
        const popupHeight = 280; // Increased height for mode toggle
        const popupX = this.cameras.main.centerX - popupWidth/2;
        const popupY = this.cameras.main.centerY - popupHeight/2;
        
        // Create an interactive rectangle for the popup window
        const popupArea = this.add.rectangle(
            popupX + popupWidth/2, 
            popupY + popupHeight/2,
            popupWidth, 
            popupHeight
        ).setOrigin(0.5);
        popupArea.setInteractive()
            .on('pointerdown', (pointer) => {
                // Stop event propagation to prevent closing
                pointer.event.stopPropagation();
            });
        this.settingsPopup.add(popupArea);
        
        // Popup background
        const popupBg = this.add.graphics();
        popupBg.fillStyle(this.COLORS_HEX.BACKGROUND, 0.95);
        popupBg.fillRoundedRect(popupX, popupY, popupWidth, popupHeight, 15);
        popupBg.lineStyle(3, this.COLORS_HEX.BOX_OUTLINE, 1);
        popupBg.strokeRoundedRect(popupX, popupY, popupWidth, popupHeight, 15);
        this.settingsPopup.add(popupBg);
        
        // Title
        const title = this.add.text(
            this.cameras.main.centerX, 
            popupY + 30,
            'Settings',
            { fontFamily: 'Nunito', fontSize: '24px', fill: '#ffffff', fontStyle: 'bold' }
        ).setOrigin(0.5);
        this.settingsPopup.add(title);
        
        const sliderWidth = 150;
        const gap = 20;
        
        // Add Level slider
        const levelLabelX = popupX + 30;
        const levelLabelY = popupY + 80;
        const levelLabel = this.add.text(
            levelLabelX, levelLabelY, 
            `Level: ${this.levelValue}`,
            { fontFamily: 'Nunito', fontSize: '22px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        this.settingsPopup.add(levelLabel);
        
        const levelSliderX = levelLabelX + levelLabel.displayWidth + gap;
        const levelSliderY = levelLabelY;
        const levelSlider = this.add.graphics();
        levelSlider.fillStyle(COLORS_HEX.HIGHLIGHT, 1); // Use basic palette highlight color for slider track
        levelSlider.fillRect(levelSliderX, levelSliderY - 5, sliderWidth, 10);
        levelSlider.lineStyle(2, 0xffffff, 0.3); // Add subtle outline
        levelSlider.strokeRect(levelSliderX, levelSliderY - 5, sliderWidth, 10);
        this.settingsPopup.add(levelSlider);
        
        // Position level slider handle based on current level
        const levelT = (this.levelValue - 1) / 2; // 0 for level 1, 0.5 for level 2, 1 for level 3
        const levelHandleX = Phaser.Math.Linear(levelSliderX, levelSliderX + sliderWidth - 10, levelT);
        const levelSliderHandle = this.add.rectangle(levelHandleX, levelSliderY, 10, 20, COLORS_HEX.ACCENT).setInteractive(); // Use basic accent color for handle
        this.input.setDraggable(levelSliderHandle);
        this.settingsPopup.add(levelSliderHandle);
        
        // Add Top K slider
        const topKLabelX = popupX + 30;
        const topKLabelY = popupY + 130; // Positioned below level slider
        const topKLabel = this.add.text(
            topKLabelX, topKLabelY, 
            `Top K: ${this.topKValue}`,
            { fontFamily: 'Nunito', fontSize: '22px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        this.settingsPopup.add(topKLabel);
        
        const topKSliderX = topKLabelX + topKLabel.displayWidth + gap;
        const topKSliderY = topKLabelY;
        const topKSlider = this.add.graphics();
        topKSlider.fillStyle(COLORS_HEX.HIGHLIGHT, 1); // Use basic palette highlight color for slider track
        topKSlider.fillRect(topKSliderX, topKSliderY - 5, sliderWidth, 10);
        topKSlider.lineStyle(2, 0xffffff, 0.3); // Add subtle outline
        topKSlider.strokeRect(topKSliderX, topKSliderY - 5, sliderWidth, 10);
        this.settingsPopup.add(topKSlider);
        
        // Position Top K slider handle based on current topK
        const topKT = (this.topKValue - 1) / 4; // 0 for topK 1, 0.25 for topK 2, etc.
        const topKHandleX = Phaser.Math.Linear(topKSliderX, topKSliderX + sliderWidth - 10, topKT);
        const topKSliderHandle = this.add.rectangle(topKHandleX, topKSliderY, 10, 20, COLORS_HEX.ACCENT).setInteractive(); // Use basic accent color for handle
        this.input.setDraggable(topKSliderHandle);
        this.settingsPopup.add(topKSliderHandle);
        
        // Add Mode Toggle
        const modeToggleLabelX = popupX + 30;
        const modeToggleLabelY = popupY + 180; // Below the Top K slider
        const modeToggleLabel = this.add.text(
            modeToggleLabelX, modeToggleLabelY, 
            "Mode:",
            { fontFamily: 'Nunito', fontSize: '22px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        this.settingsPopup.add(modeToggleLabel);
        
        // Use current pending mode or current actual mode
        const currentToggleMode = this.pendingModeChange || this.mode || 'easy';
        
        // Create the mode toggle
        const modeToggle = ToggleFactory.createToggle(
            this,
            currentToggleMode, // Use current toggle state
            (newMode) => {
                // Track the visual toggle state immediately
                this.pendingModeChange = newMode;
                
                // Re-create the toggle with the new visual state
                modeToggle.destroy();
                
                // This ensures the toggle visually updates
                const updatedToggle = ToggleFactory.createToggle(
                    this,
                    newMode, // Use the new mode for visual state
                    (newerMode) => {
                        this.pendingModeChange = newerMode;
                    },
                    modeToggleLabelX + modeToggleLabel.width + gap,
                    modeToggleLabelY
                );
                this.settingsPopup.add(updatedToggle);
            },
            modeToggleLabelX + modeToggleLabel.width + gap,
            modeToggleLabelY
        );
        this.settingsPopup.add(modeToggle);
        
        // Close button
        const closeBtn = this.add.text(
            popupX + popupWidth - 25, 
            popupY + 20,
            '✕',
            { fontFamily: 'Nunito', fontSize: '24px', fill: '#ffffff' }
        ).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => closeBtn.setScale(1.2))
        .on('pointerout', () => closeBtn.setScale(1))
        .on('pointerdown', () => this.closeSettingsPopup());
        this.settingsPopup.add(closeBtn);
        
        // Confirm button
        const confirmBtn = this.add.text(
            this.cameras.main.centerX, 
            popupY + popupHeight - 40,
            'Apply Changes',
            { 
                fontFamily: 'Nunito', 
                fontSize: '20px', 
                fill: '#ffffff',
                backgroundColor: this.COLORS_HEX.BUTTON.FILL,
                padding: { x: 15, y: 10 },
                borderRadius: 8
            }
        ).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => confirmBtn.setScale(1.1))
        .on('pointerout', () => confirmBtn.setScale(1))
        .on('pointerdown', () => {
            // Apply mode change if pending
            if (this.pendingModeChange && this.pendingModeChange !== this.mode) {
                this.onModeToggle(this.pendingModeChange);
                // Mode change will trigger scene change, so we don't need to close popup
                return;
            }
            
            // Apply any changes and close
            this.closeSettingsPopup();
        });
        this.settingsPopup.add(confirmBtn);
        
        // Slider dragging functionality
        const levelSliderMinX = levelSliderX;
        const levelSliderMaxX = levelSliderMinX + sliderWidth - 10;
        const topKSliderMinX = topKSliderX;
        const topKSliderMaxX = topKSliderMinX + sliderWidth - 10;
        
        this.input.on('drag', (pointer, gameObject, dragX) => {
            if (gameObject === levelSliderHandle) {
                gameObject.x = Phaser.Math.Clamp(dragX, levelSliderMinX, levelSliderMaxX);
                const newLevel = Math.round(Phaser.Math.Linear(1, 3, (gameObject.x - levelSliderMinX) / (levelSliderMaxX - levelSliderMinX)));
                
                if (newLevel !== this.levelValue) {
                    this.levelValue = newLevel;
                    levelLabel.setText(`Level: ${this.levelValue}`);
                    
                    // Update prompt based on level immediately
                    this.updatePromptBasedOnLevel();
                    
                    // Update the background when level changes (if implemented by child class)
                    if (typeof this.updateBackgroundForLevel === 'function') {
                        this.updateBackgroundForLevel();
                    }
                }
            }
            else if (gameObject === topKSliderHandle) {
                gameObject.x = Phaser.Math.Clamp(dragX, topKSliderMinX, topKSliderMaxX);
                const newTopK = Math.round(Phaser.Math.Linear(1, 5, (gameObject.x - topKSliderMinX) / (topKSliderMaxX - topKSliderMinX)));
                
                if (newTopK !== this.topKValue) {
                    this.topKValue = newTopK;
                    topKLabel.setText(`Top K: ${this.topKValue}`);
                }
            }
        });
        
        // Animate popup appearance
        this.settingsPopup.setScale(0.8);
        this.tweens.add({
            targets: this.settingsPopup,
            scale: 1,
            duration: 200,
            ease: 'Back.Out'
        });
    }
    
    closeSettingsPopup() {
        if (!this.settingsPopup) return;
        
        // Apply any pending mode change before closing
        const hasModeChange = this.pendingModeChange && this.pendingModeChange !== this.mode;
        if (!hasModeChange) {
            this.updateLevelModeIndicator();
        }
        
        // First destroy the popup with animation
        this.tweens.add({
            targets: this.settingsPopup,
            alpha: 0,
            scale: 0.8,
            duration: 200,
            ease: 'Back.In',
            onComplete: () => {
                if (this.settingsPopup) {
                    this.settingsPopup.destroy();
                    this.settingsPopup = null;
                    // Remove any event listeners specifically for popup
                    this.input.off('drag');
                    
                    // After popup is destroyed, apply mode change if needed
                    if (hasModeChange) {
                        // Short delay to ensure popup is fully gone
                        this.time.delayedCall(50, () => {
                            this.onModeToggle(this.pendingModeChange);
                        });
                    }
                }
            }
        });
    }

    ensureProperLayering() {
        if (this.promptTextBox) this.promptTextBox.setDepth(5);
        if (this.promptText) this.promptText.setDepth(6);
        if (this.outputText) this.outputText.setDepth(6);
        if (this.failsCounter) this.failsCounter.setDepth(7);
        if (this.inputTextBorder) this.inputTextBorder.setDepth(20);
        if (this.inputText) this.inputText.setDepth(25);
        if (this.doneButton) this.doneButton.setDepth(10);
        if (this.resetButton) this.resetButton.setDepth(10);
        if (this.feedbackButton) this.feedbackButton.setDepth(10);
        if (this.settingsButton) this.settingsButton.setDepth(10);
        if (this.wordCountDisplay) this.wordCountDisplay.setDepth(55);
        if (this.settingsPopup) this.settingsPopup.setDepth(100);
    }
    
    createWordCountDisplay() {
        if (this.wordCountDisplay) {
            this.wordCountDisplay.destroy();
        }
        
        // Create container for word count display
        this.wordCountDisplay = this.add.container(0, 0).setDepth(55);
        
        const padding = 20;
        const boxWidth = 180;
        const boxHeight = 95;
        const cornerRadius = 10;
        
        // Position in the upper right corner, mirroring the mode badge position
        const displayX = this.cameras.main.width - boxWidth - padding;
        const displayY = this.menuBarHeight + padding;
        
        // Create background
        const background = this.add.graphics();
        background.fillStyle(0x000000, 0.7);
        background.fillRoundedRect(0, 0, boxWidth, boxHeight, cornerRadius);
        background.lineStyle(2, 0xffffff, 0.5);
        background.strokeRoundedRect(0, 0, boxWidth, boxHeight, cornerRadius);
        
        // Word count title
        const titleText = this.add.text(
            boxWidth / 2, 
            15, 
            "WORD STATS", 
            {
                fontFamily: 'Nunito',
                fontSize: '16px',
                fontStyle: 'bold',
                fill: '#ffffff'
            }
        ).setOrigin(0.5);
        
        // Create icons for different word types
        const originalIcon = this.add.circle(20, 40, 6, this.design.PROGRESS_BAR.COLORS.SUCCESS);
        const originalLabel = this.add.text(
            35, 40, 
            "Original:", 
            { fontFamily: 'Nunito', fontSize: '14px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        
        this.originalCountText = this.add.text(
            boxWidth - 15, 40, 
            "0", 
            { fontFamily: 'Nunito', fontSize: '16px', fontStyle: 'bold', fill: '#7cfc00' }
        ).setOrigin(1, 0.5);
        
        const aiIcon = this.add.circle(20, 65, 6, this.design.PROGRESS_BAR.COLORS.WARNING);
        const aiLabel = this.add.text(
            35, 65, 
            "AI Words:", 
            { fontFamily: 'Nunito', fontSize: '14px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        
        this.aiCountText = this.add.text(
            boxWidth - 15, 65, 
            "0", 
            { fontFamily: 'Nunito', fontSize: '16px', fontStyle: 'bold', fill: '#ff3366' }
        ).setOrigin(1, 0.5);
        
        // Total count at bottom
        const totalLabel = this.add.text(
            20, 85, 
            "Total:", 
            { fontFamily: 'Nunito', fontSize: '14px', fontStyle: 'bold', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        
        this.totalCountText = this.add.text(
            boxWidth - 15, 85, 
            "0", 
            { fontFamily: 'Nunito', fontSize: '16px', fontStyle: 'bold', fill: '#ffffff' }
        ).setOrigin(1, 0.5);
        
        // Add all elements to the container
        this.wordCountDisplay.add([
            background, 
            titleText, 
            originalIcon, originalLabel, this.originalCountText,
            aiIcon, aiLabel, this.aiCountText,
            totalLabel, this.totalCountText
        ]);
        
        // Position the container
        this.wordCountDisplay.setPosition(displayX, displayY);
        
        // Add subtle animation
        this.tweens.add({
            targets: this.wordCountDisplay,
            y: displayY - 3,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }
    
    updateWordCountDisplay() {
        if (!this.wordCountDisplay) return;
        
        // Calculate the total
        const total = this.originalWordCount + this.aiWordCount;
        
        // Update the count displays with animations
        this.animateCountChange(this.originalCountText, this.originalCountText.text, this.originalWordCount.toString());
        this.animateCountChange(this.aiCountText, this.aiCountText.text, this.aiWordCount.toString());
        this.animateCountChange(this.totalCountText, this.totalCountText.text, total.toString());
    }
    
    animateCountChange(textObject, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        // Parse values as integers
        const oldNum = parseInt(oldValue, 10) || 0;
        const newNum = parseInt(newValue, 10) || 0;
        
        // Only animate if increasing
        if (newNum > oldNum) {
            // Create a temporary text object for the animation
            const animatedText = this.add.text(
                textObject.x, 
                textObject.y - 15,
                "+" + (newNum - oldNum),
                {
                    fontFamily: 'Nunito',
                    fontSize: '14px',
                    fontStyle: 'bold',
                    fill: '#ffffff'
                }
            ).setOrigin(1, 0.5).setAlpha(0);
            
            // Add it to the same container
            this.wordCountDisplay.add(animatedText);
            
            // Animate the temporary text
            this.tweens.add({
                targets: animatedText,
                y: animatedText.y - 15,
                alpha: { from: 0, to: 1, duration: 200, yoyo: true, hold: 300 },
                ease: 'Cubic.Out',
                duration: 800,
                onComplete: () => animatedText.destroy()
            });
            
            // Scale effect on the main counter
            this.tweens.add({
                targets: textObject,
                scale: { from: 1, to: 1.3, duration: 200, yoyo: true },
                ease: 'Back.Out',
                duration: 400,
            });
        }
        
        // Update the text
        textObject.setText(newValue);
    }

    ensureTextVisibility() {
        if (this.inputText) {
            this.inputText.setVisible(true);
            this.inputText.setDepth(25);
        }
        if (this.autocompleteText) {
            this.autocompleteText.setVisible(true);
            this.autocompleteText.setDepth(50);
        }
    }

    generateAutocomplete() {
        if (!this.aiSuggestedWords || this.aiSuggestedWords.length === 0) {
            return '';
        }
    
        // Get the current word being typed
        const lastSpaceIndex = this.userInput.lastIndexOf(' ');
        const lastNewlineIndex = this.userInput.lastIndexOf('\n');
        const lastBreakIndex = Math.max(lastSpaceIndex, lastNewlineIndex);
        const currentWord = lastBreakIndex >= 0 ? this.userInput.slice(lastBreakIndex + 1) : this.userInput;
        
        // Find matching suggestion for current word
        let suggestion = null;
        
        if (!currentWord || currentWord.endsWith(' ') || currentWord.endsWith('\n')) {
            // If at a word boundary, use first suggestion
            suggestion = this.aiSuggestedWords[0];
            
            if (suggestion) {
                // Return the suggestion directly so it can be appended to the input text
                return suggestion;
            }
        } else {
            // Find matching suggestion for current word being typed
            suggestion = this.aiSuggestedWords.find(word => 
                word.toLowerCase().startsWith(currentWord.toLowerCase())
            );
    
            if (suggestion) {
                // Only return the completion part (not the already typed portion)
                return suggestion.slice(currentWord.length);
            }
        }

        return '';
    }
    
    // We no longer need the calculateTextPosition method as we're using a single text object approach
    
    // You should also update this function to properly handle multi-line text
    updateCursor() {
        if (this.isShuttingDown) return;
        if (
            !this.inputText ||
            this.inputText.destroyed ||
            typeof this.inputText.setText !== "function" ||
            typeof this.inputText.updateText !== "function"
        ) {
            return;
        }
        
        // Keep input text position fixed
        const padding = 30;
        
        // Extra safety check - if cameras is undefined, use default values
        let centerY = 300; // Default fallback
        let centerX = 450; // Default fallback
        
        // Safely access camera properties with multiple layers of protection
        try {
            if (this.cameras && this.cameras.main) {
                centerY = this.cameras.main.centerY || 300;
                centerX = this.cameras.main.centerX || 450;
            } else if (this.scene && this.scene.cameras && this.scene.cameras.main) {
                // Try scene cameras as a fallback
                centerY = this.scene.cameras.main.centerY || 300;
                centerX = this.scene.cameras.main.centerX || 450;
            }
        } catch (e) {
            console.warn("Camera access error in updateCursor:", e);
            // Continue with defaults
        }
        
        const textBoxY = centerY - 240 / 2;
        
        // Make sure uiBoxWidth has a value
        if (!this.uiBoxWidth) {
            this.uiBoxWidth = this.cameras.main.width * (5 / 6);
        }
        
        this.inputText.setPosition(
            centerX - this.uiBoxWidth / 2 + padding,
            textBoxY + padding
        );
        
        // Split by explicit newlines first
        let lines = this.userInput.split('\n');
        
        // Handle word wrapping for each line
        const wrappedLines = [];
        const maxWidth = this.uiBoxWidth - (padding * 2);
        
        try {
            for (const line of lines) {
                let currentLine = '';
                const words = line.split(/(\s+)/);
                let tempText = this.add.text(0, 0, '', this.inputText.style);
        
                for (const word of words) {
                    tempText.setText(currentLine + word);
                    if (tempText.width > maxWidth && currentLine !== '') {
                        wrappedLines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine += word;
                    }
                }
                wrappedLines.push(currentLine);
                tempText.destroy();
            }
            
            const userText = wrappedLines.join('\n');
            const cursor = this.cursorVisible ? `[color=${DESIGN.COLORS.CURSOR}]_[/color]` : " ";

            
            // Get autocomplete suggestion
            let suggestion = '';
            if (this.aiSuggestedWords && this.aiSuggestedWords.length > 0) {
                const autocompleteSuggestion = this.generateAutocomplete();
                if (autocompleteSuggestion) {
                    // Format suggestion with color tag - use "#ff0000" directly since DESIGN.COLORS might not be defined properly
                    suggestion = `[color=#ff0000]${autocompleteSuggestion}[/color]`;
                }
            }
            
            // Prepare display text with user input
            let displayText = this.userInput;
            
            // Add cursor or autocomplete to display text
            if (suggestion && this.cursorVisible) {
                // Use red color for autocomplete suggestion
                displayText += suggestion;
            } else if (this.cursorVisible) {
                // Add cursor when visible
                displayText += "_";
            }
            
            // Ensure text is set and visible
            this.inputText.setText(displayText);
            this.inputText.setVisible(true);
            
            // We no longer need to update a separate autocomplete text object
            if (this.autocompleteText) {
                this.autocompleteText.setText('');
            }
        } catch (error) {
            console.warn("Error in updateCursor:", error);
            // Make a simpler attempt if the complex approach fails
            try {
                let fallbackText = this.userInput;
                if (this.aiSuggestedWords && this.aiSuggestedWords.length > 0 && this.cursorVisible) {
                    fallbackText += this.generateAutocomplete();
                } else {
                    fallbackText += (this.cursorVisible ? "_" : " ");
                }
                this.inputText.setText(fallbackText);
            } catch (e) {
                console.error("Failed to update cursor text with fallback method:", e);
            }
        }
    }

    createFailsCounter() {
        if (this.failsCounter) {
            this.failsCounter.clear();
        } else {
            this.failsCounter = this.add.graphics();
        }
        
        if (this.failsText) {
            this.failsText.destroy();
        }
    
        // Calculate width to match two buttons plus spacing
        const scoreWidth = DESIGN.UI.BUTTON.WIDTH * 2 + DESIGN.UI.BUTTON.SPACING;
        const scoreHeight = DESIGN.UI.BUTTON.HEIGHT;
        
        // Position at bottom left of input box
        const inputBoxY = this.cameras.main.centerY - 240 / 2;
        const inputBoxHeight = 240;
        const padding = 20;
        
        // Calculate the offset from edge - match the Done button's distance
        // Assume standard button padding from design_easy.js
        const buttonPadding = 70; // Standard padding used for buttons
        
        // Set X position with the same padding as buttons have from right side
        const scoreX = this.cameras.main.centerX - this.uiBoxWidth / 2 + buttonPadding;
        const scoreY = inputBoxY + inputBoxHeight + padding;
    
        // Background with rounded corners
        this.failsCounter.fillStyle(0x000000, 0.5);
        this.failsCounter.fillRoundedRect(0, 0, scoreWidth, scoreHeight, DESIGN.UI.BUTTON.CORNER_RADIUS);
        
        // Progress fill with rounded corners - reversed color gradation
        let color;
        if (this.progressPercentage === 50) {
            color = DESIGN.UI.PROGRESS_BAR.COLORS.WARNING;
        } else if (this.progressPercentage < 50) {
            // Interpolate between red and yellow (red at 0%, yellow at 50%)
            const t = this.progressPercentage / 50;
            const r = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.DANGER >> 16) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 16) & 0xFF)));
            const g = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.DANGER >> 8) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 8) & 0xFF)));
            const b = Math.round(((1 - t) * (DESIGN.UI.PROGRESS_BAR.COLORS.DANGER & 0xFF)) + (t * (DESIGN.UI.PROGRESS_BAR.COLORS.WARNING & 0xFF)));
            color = (r << 16) | (g << 8) | b;
        } else {
            // Interpolate between yellow and green (yellow at 50%, green at 100%)
            const t = (this.progressPercentage - 50) / 50;
            const r = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 16) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS >> 16) & 0xFF)));
            const g = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 8) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS >> 8) & 0xFF)));
            const b = Math.round(((1 - t) * (DESIGN.UI.PROGRESS_BAR.COLORS.WARNING & 0xFF)) + (t * (DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS & 0xFF)));
            color = (r << 16) | (g << 8) | b;
        }
        this.failsCounter.fillStyle(color, 1);
        this.failsCounter.fillRoundedRect(0, 0, (scoreWidth * this.progressPercentage) / 100, scoreHeight, DESIGN.UI.BUTTON.CORNER_RADIUS);
        
        // White outline
        this.failsCounter.lineStyle(DESIGN.UI.BUTTON.OUTLINE_WIDTH, 0xffffff, 1);
        this.failsCounter.strokeRoundedRect(0, 0, scoreWidth, scoreHeight, DESIGN.UI.BUTTON.CORNER_RADIUS);

        
        // Set depth and position
        this.failsCounter.setPosition(scoreX, scoreY).setDepth(50);
        

        // Create celebration emitters if they don't exist
        try {
            if (!this.celebrationEmitters) {
                // First check if the 'ball' texture exists
                if (this.textures.exists('ball')) {
                    this.celebrationEmitters = {
                        success: this.add.particles(0, 0, 'ball', {
                            lifespan: 1000,
                            speed: { min: 200, max: 400 },
                            scale: { start: 0.2, end: 0 },
                            emitting: false,
                            blendMode: 'ADD',
                            tint: DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS
                        }),
                        needsWork: this.add.particles(0, 0, 'ball', {
                            lifespan: 1000,
                            speed: { min: 200, max: 400 },
                            scale: { start: 0.2, end: 0 },
                            emitting: false,
                            blendMode: 'ADD',
                            tint: DESIGN.UI.PROGRESS_BAR.COLORS.DANGER
                        })
                    };
                    
                    // Set initial state to inactive
                    if (this.celebrationEmitters.success) {
                        this.celebrationEmitters.success.setActive(false).setVisible(false);
                    }
                    if (this.celebrationEmitters.needsWork) {
                        this.celebrationEmitters.needsWork.setActive(false).setVisible(false);
                    }
                } else {
                    console.warn("Cannot create emitters - 'ball' texture not loaded");
                    this.celebrationEmitters = null;
                }
            }
        } catch (error) {
            console.error("Error creating particle emitters:", error);
            this.celebrationEmitters = null;
        }

        // Set emitter positions if they exist
        if (this.celebrationEmitters) {
            try {
                if (this.celebrationEmitters.success) {
                    this.celebrationEmitters.success.setPosition(scoreX, scoreY + scoreHeight / 2);
                    this.celebrationEmitters.success.setActive(true).setVisible(true);
                }
                
                if (this.celebrationEmitters.needsWork) {
                    this.celebrationEmitters.needsWork.setPosition(scoreX + scoreWidth, scoreY + scoreHeight / 2);
                    this.celebrationEmitters.needsWork.setActive(true).setVisible(true);
                }
            } catch (error) {
                console.error("Error setting emitter positions:", error);
            }
        }
        
        this.failsText = this.add.text(
            scoreX + scoreWidth / 2,
            scoreY + scoreHeight / 2,
            ' ',
            {
                fontFamily: 'Nunito',
                fontSize: '20px',
                fill: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(51);
    }

    showTooltip(text, x, y) {
        // Hide any existing tooltips
        this.hideTooltips();
        
        // Create tooltip background
        const padding = 10;
        const tooltipText = this.add.text(0, 0, text, {
            fontFamily: 'Nunito',
            fontSize: '16px',
            color: '#ffffff',
            align: 'center'
        });
        
        const width = tooltipText.width + padding * 2;
        const height = tooltipText.height + padding * 2;
        
        const background = this.add.graphics();
        background.fillStyle(0x000000, 0.8);
        background.fillRoundedRect(0, 0, width, height, 8);
        background.lineStyle(1, 0xffffff, 0.3);
        background.strokeRoundedRect(0, 0, width, height, 8);
        
        // Create container for tooltip
        const container = this.add.container(x - width/2, y - height - 5, [background, tooltipText]);
        tooltipText.setPosition(padding, padding);
        
        // Add to active tooltips
        this.tooltips.push(container);
        
        // Fade in effect
        container.setAlpha(0);
        this.tweens.add({
            targets: container,
            alpha: 1,
            duration: 200,
            ease: 'Quad.easeOut'
        });
        
        container.setDepth(1000);
    }
    
    hideTooltips() {
        this.tooltips.forEach(tooltip => {
            this.tweens.add({
                targets: tooltip,
                alpha: 0,
                duration: 200,
                ease: 'Quad.easeOut',
                onComplete: () => tooltip.destroy()
            });
        });
        this.tooltips = [];
    }

    addButtonClickEffects() {
        const buttons = [
            { button: this.doneButton, tooltip: 'Submit your text for evaluation' },
            { button: this.resetButton, tooltip: 'Clear text and start over' },
            { button: this.feedbackButton, tooltip: 'Share your feedback' },
            //{ button: this.hardButton, tooltip: 'Switch to Hard mode: No AI suggestions' },
            //{ button: this.easyButton, tooltip: 'Switch to Easy mode: AI suggestions allowed' }
        ];
        
        buttons.forEach(({ button, tooltip }) => {
            if (!button) return;
            
            button.on('pointerover', () => {
                button.setScale(1.1);
                if (tooltip) {
                    this.showTooltip(tooltip, button.x, button.y - button.height/2);
                }
            });
            
            button.on('pointerout', () => {
                button.setScale(1);
                this.hideTooltips();
            });
            
            button.on('pointerdown', () => {
                button.setScale(0.95);
            });
            
            button.on('pointerup', () => {
                button.setScale(1.1);
            });
        });
    }

    createInputBoxClickEffect(x, y) {
        const circle = this.add.circle(x, y, 5, 0xffffff, 0.5).setDepth(15);
        
        this.tweens.add({
            targets: circle,
            scale: { from: 0.5, to: 2 },
            alpha: { from: 0.5, to: 0 },
            duration: 500,
            ease: 'Quad.easeOut',
            onComplete: () => circle.destroy()
        });
    }



    updateFailsCounter(success) {
        const oldPercentage = this.progressPercentage;
        let newPercentage;
        const wordRatio = 100/(Math.max(this.wordCount, 1))
        this.progressIncrement = Math.min(wordRatio, DESIGN.UI.PROGRESS_BAR.INCREMENT);
        
        if (success) {
            // Non-AI word
            newPercentage = this.progressPercentage + this.progressIncrement;
            // Update original word count
            this.originalWordCount++;
            this.totalWordCount++;
        } else {
            // AI word     
            newPercentage = this.progressPercentage - this.progressIncrement;
            this.shakeScreen();
            
            // Use the first AI suggestion as our "current word" since that's what would be autocompleted
            // (This is the most reliable way to know which AI word was triggered in this context)
            let currentWord = "";
            
            if (this.aiSuggestedWords && this.aiSuggestedWords.length > 0) {
                // Get the first suggestion from the AI suggestions array
                currentWord = this.aiSuggestedWords[0];
            }
            
            console.log("AI word used:", currentWord);
            
            // Create explosion effect for the AI word
            if (currentWord) {
                const inputBoxY = this.cameras.main.centerY - 240 / 2;
                this.createExplosionEffect(currentWord, this.cameras.main.centerX, inputBoxY + 120);
            }
            
            // Update AI word count
            this.aiWordCount++;
            this.totalWordCount++;
        }
        
        // Update the word count display
        this.updateWordCountDisplay();
        
    
        this.progressPercentage = newPercentage;
        
        
        
        
        if (this.failsText) {
            this.failsText.setText(` `);
        }
        
        this.updateProgressFill();
    }

    // Custom celebration effect without using particle emitters
    celebrateSuccess() {
        // Get positions based on the progress bar
        const scoreWidth = DESIGN.UI.BUTTON.WIDTH * 2 + DESIGN.UI.BUTTON.SPACING;
        const scoreHeight = DESIGN.UI.BUTTON.HEIGHT;
        const inputBoxY = this.cameras.main.centerY - 240 / 2;
        const inputBoxHeight = 240;
        const padding = 20;
        const scoreX = this.cameras.main.centerX - this.uiBoxWidth / 2 + 70;
        const scoreY = inputBoxY + inputBoxHeight + padding;
        
        // Create celebration text
        const text = this.add.text(
            scoreX + scoreWidth/2,
            scoreY,
            'Perfect!',
            {
                fontFamily: 'Nunito',
                fontSize: '32px',
                fill: '#7cfc00', // Bright green
                stroke: '#ffffff',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(200);
        
        // Create multiple circles that expand outward in place of particles
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 60 + 20;
            const size = Math.random() * 8 + 4;
            const startX = scoreX + scoreWidth/2;
            const startY = scoreY + scoreHeight/2;
            
            const circle = this.add.circle(
                startX,
                startY,
                size,
                0x7cfc00, // Green
                0.8
            ).setDepth(199);
            
            this.tweens.add({
                targets: circle,
                x: startX + Math.cos(angle) * distance,
                y: startY + Math.sin(angle) * distance,
                alpha: 0,
                scale: { from: 1, to: 0 },
                duration: 1000,
                ease: 'Quad.Out',
                onComplete: () => circle.destroy()
            });
        }
        
        // Animate text
        this.tweens.add({
            targets: text,
            y: text.y - 80,
            scale: { from: 1, to: 1.5 },
            alpha: { from: 1, to: 0 },
            duration: 1200,
            ease: 'Cubic.Out',
            onComplete: () => text.destroy()
        });
        
        // Screen flash with green
        const flash = this.add.rectangle(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            0x7cfc00, // Green
            0.2
        ).setOrigin(0).setDepth(100);

        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            ease: 'Cubic.Out',
            onComplete: () => flash.destroy()
        });
    }

    // Custom celebration effect without using particle emitters for "Needs Work" state
    celebrateNeedsWork() {
        // Get positions based on the progress bar
        const scoreWidth = DESIGN.UI.BUTTON.WIDTH * 2 + DESIGN.UI.BUTTON.SPACING;
        const scoreHeight = DESIGN.UI.BUTTON.HEIGHT;
        const inputBoxY = this.cameras.main.centerY - 240 / 2;
        const inputBoxHeight = 240;
        const padding = 20;
        const scoreX = this.cameras.main.centerX - this.uiBoxWidth / 2 + 70;
        const scoreY = inputBoxY + inputBoxHeight + padding;
        
        // Create celebration text
        const text = this.add.text(
            scoreX + scoreWidth/2,
            scoreY,
            'Keep Trying!',
            {
                fontFamily: 'Nunito',
                fontSize: '32px',
                fill: DESIGN.COLORS.AUTOCOMPLETE, // Red color
                stroke: '#ffffff',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(200);
        
        // Create multiple circles that expand outward in place of particles
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 60 + 20;
            const size = Math.random() * 8 + 4;
            const startX = scoreX + scoreWidth/2;
            const startY = scoreY + scoreHeight/2;
            
            const circle = this.add.circle(
                startX,
                startY,
                size,
                DESIGN.UI.PROGRESS_BAR.COLORS.WARNING, // orange color
                0.8
            ).setDepth(199);
            
            this.tweens.add({
                targets: circle,
                x: startX + Math.cos(angle) * distance,
                y: startY + Math.sin(angle) * distance,
                alpha: 0,
                scale: { from: 1, to: 0 },
                duration: 1000,
                ease: 'Quad.Out',
                onComplete: () => circle.destroy()
            });
        }
        
        // Animate text
        this.tweens.add({
            targets: text,
            y: text.y - 80,
            scale: { from: 1, to: 1.5 },
            alpha: { from: 1, to: 0 },
            duration: 1200,
            ease: 'Cubic.Out',
            onComplete: () => text.destroy()
        });
        
        // Screen flash with red
        const flash = this.add.rectangle(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            DESIGN.UI.PROGRESS_BAR.COLORS.DANGER, // Red color
            0.2
        ).setOrigin(0).setDepth(100);

        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            ease: 'Cubic.Out',
            onComplete: () => flash.destroy()
        });
    }



    updateProgressFill() {
        if (!this.failsCounter) return;

        
        this.failsCounter.clear();

        const scoreWidth = DESIGN.UI.BUTTON.WIDTH * 2 + DESIGN.UI.BUTTON.SPACING;
        const scoreHeight = DESIGN.UI.BUTTON.HEIGHT;
        console.log("progress percentage", this.progressPercentage);
        

        const fillPercentage = Phaser.Math.Clamp(this.progressPercentage, 0, 100);
        
        // Background with rounded corners
        this.failsCounter.fillStyle(0x000000, 0.5);
        if (this.progressPercentage > 0) {
            this.failsCounter.fillStyle(COLORS_HEX.BACKGROUND, 0.5);
        }

        
        this.failsCounter.fillRoundedRect(0, 0, scoreWidth, scoreHeight, DESIGN.UI.BUTTON.CORNER_RADIUS);
        
        
        // Progress fill with rounded corners - reversed color gradation
        let color;
        if (fillPercentage === 50) {
            color = DESIGN.UI.PROGRESS_BAR.COLORS.WARNING;
        } else if (fillPercentage < 50) {
            // Interpolate between red and yellow (red at 0%, yellow at 50%)
            const t = fillPercentage / 50;
            const r = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.DANGER >> 16) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 16) & 0xFF)));
            const g = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.DANGER >> 8) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 8) & 0xFF)));
            const b = Math.round(((1 - t) * (DESIGN.UI.PROGRESS_BAR.COLORS.DANGER & 0xFF)) + (t * (DESIGN.UI.PROGRESS_BAR.COLORS.WARNING & 0xFF)));
            color = (r << 16) | (g << 8) | b;
        } else {
            // Interpolate between yellow and green (yellow at 50%, green at 100%)
            const t = (fillPercentage - 50) / 50;
            const r = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 16) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS >> 16) & 0xFF)));
            const g = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 8) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS >> 8) & 0xFF)));
            const b = Math.round(((1 - t) * (DESIGN.UI.PROGRESS_BAR.COLORS.WARNING & 0xFF)) + (t * (DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS & 0xFF)));
            color = (r << 16) | (g << 8) | b;
        }
        this.failsCounter.fillStyle(color, 1);
        if (fillPercentage > 0) {
            this.failsCounter.fillRoundedRect(0, 0, (scoreWidth * fillPercentage) / 100, scoreHeight, DESIGN.UI.BUTTON.CORNER_RADIUS);
        }

        // White outline
        this.failsCounter.lineStyle(DESIGN.UI.BUTTON.OUTLINE_WIDTH, 0xffffff, 1);
        this.failsCounter.strokeRoundedRect(0, 0, scoreWidth, scoreHeight, DESIGN.UI.BUTTON.CORNER_RADIUS);

  
    }

    showSuggestions(words) {
        // Clear previous suggestions
        if (this.suggestionBoxes) {
            this.suggestionBoxes.forEach(box => box.destroy());
        }
        if (this.suggestionTexts) {
            this.suggestionTexts.forEach(text => text.destroy());
        }
        this.suggestionBoxes = [];
        this.suggestionTexts = [];

        if (!words || words.length === 0) return;

        const padding = 20;
        const boxHeight = 30;
        const boxSpacing = 10;
        const inputBoxY = this.cameras.main.centerY - 240 / 2;
        const promptBoxHeight = 80;
        const promptY = inputBoxY - promptBoxHeight - padding;
        const spaceBetween = promptY - this.menuBarHeight;
        const suggestionsY = this.menuBarHeight + (spaceBetween / 2) + 20; // Centered + slight offset down

        words.forEach((word, index) => {
            const text = this.add.text(0, 0, word, {
                fontFamily: 'Nunito',
                fontSize: '16px',
                color: '#ffffff'
            });
            
            const boxWidth = text.width + padding * 2;
            const totalWidth = words.reduce((acc, _, i) => {
                const t = this.add.text(0, 0, words[i], {
                    fontFamily: 'Nunito',
                    fontSize: '16px'
                });
                const w = t.width + padding * 2;
                t.destroy();
                return acc + w + (i < words.length - 1 ? boxSpacing : 0);
            }, 0);
            
            const startX = this.cameras.main.centerX - totalWidth / 2;
            const boxX = startX + words.slice(0, index).reduce((acc, _, i) => {
                const t = this.add.text(0, 0, words[i], {
                    fontFamily: 'Nunito',
                    fontSize: '16px'
                });
                const w = t.width + padding * 2;
                t.destroy();
                return acc + w + boxSpacing;
            }, 0);

            const box = this.add.graphics();
            box.fillStyle(0xff0000, 0.3);
            box.fillRoundedRect(boxX, suggestionsY, boxWidth, boxHeight, 10);
            box.lineStyle(2, 0xff0000, 0.8);
            box.strokeRoundedRect(boxX, suggestionsY, boxWidth, boxHeight, 10);

            text.setPosition(boxX + padding, suggestionsY + boxHeight / 2);
            text.setOrigin(0, 0.5);

            this.suggestionBoxes.push(box);
            this.suggestionTexts.push(text);

            box.setDepth(15);
            text.setDepth(16);
        });
    }

    init(data) {
        console.log("BaseGameScene init called with data:", data);
        console.log("LlmEngine retrieved from registry: ", this.registry.get('llmEngine'));
        
        // If this is a reset from DoneScene or FeedbackScene, reset game state but preserve level and topK
        if (data && data.requiresReset) {
            console.log("Performing state reset from DoneScene/FeedbackScene");
            this.progressPercentage = data.progressPercentage || 50;
            
            // Preserve level and topK if they were passed
            if (data.levelValue) {
                this.levelValue = data.levelValue;
                // No need to update slider position - it will be set when settings popup opens
            }
            
            if (data.topKValue) {
                this.topKValue = data.topKValue;
                // No need to update slider position - it will be set when settings popup opens
            }
            
            // Reset other game state
            this.wordCount = 0;
            this.originalWordCount = 0;
            this.aiWordCount = 0;
            this.totalWordCount = 0;
            
            // Reset suggestion-related state
            this.userInput = '';
            this.aiSuggestedWords = [];
            this.autocompleteText = null;
            this.suggestionBoxes = [];
            this.suggestionTexts = [];
            
            // Reset cursor state
            this.cursorVisible = true;
            if (this.cursorTimer) {
                this.cursorTimer.remove();
                this.cursorTimer = null;
            }
        } else if (data && data.progressPercentage !== undefined) {
            // Normal scene transition
            console.log("Setting initial progress percentage:", data.progressPercentage);
            this.progressPercentage = data.progressPercentage;
        }
        
        // Reset UI elements for recreation
        this.promptTextBox = null;
        this.promptText = null;
        this.failsCounter = null;
        this.failsText = null;
        
        // Clear any active timeouts
        if (this.activeTimeout) {
            clearTimeout(this.activeTimeout);
            this.activeTimeout = null;
        }
    }
}
