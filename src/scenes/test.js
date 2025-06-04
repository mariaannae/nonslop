import { stopwords } from "../config/stopwords.js";
import { saveInteraction } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import ToggleFactory from "../utils/ToggleFactory.js";
import SceneTransitionManager from "../utils/SceneTransitionManager.js";
import { DESIGN, BASIC_COLORS_HEX as COLORS_HEX, BASIC_COLORS_TEXT as COLORS_TEXT } from "../config/design.js";
import registryManager from "../services/RegistryManager.js";
import { ScalingManager } from "../config/scaling.js";


export default class BaseGameScene extends Phaser.Scene {
    constructor(config) {
        super(config);
        this.resetGameState();
        // Initialize scaling manager for responsive UI
        this.scalingManager = null;
    }

    create() {
        // ...existing create logic...

        // Handle orientation/resize events
        this.scale.on('resize', (gameSize) => {
            // If settings popup is open, close and reopen it to reposition/resize
            if (this.settingsPopup) {
                this.closeSettingsPopup();
                // Short delay to allow resize to complete before reopening
                this.time.delayedCall(50, () => {
                    this.toggleSettingsPopup();
                });
            }
            // Optionally, update other UI elements here if needed
        });

        // Listen for custom-resize event from main.js for aspect ratio changes
        if (this.game && this.game.events) {
            this.game.events.on('custom-resize', ({ width, height, isPortrait }) => {
                // Resize the camera
                this.cameras.main.setSize(width, height);
                // Update scaling manager if present
                if (this.scalingManager) {
                    this.scalingManager.updateScaleRatios();
                }
                // Call a stub for child scenes to reposition/rescale objects
                if (typeof this.onGameResize === "function") {
                    this.onGameResize(width, height, isPortrait);
                }
            });
        }
    }

    /**
     * Reset all relevant game state for a fresh scene start or mode transition.
     * This should be called at the start of every scene's create().
     */
    resetGameState() {
        // Core state
        this.userInput = '';
        this.inputText = null; 
        this.keyEventQueue = [];
        this.isProcessingQueuedKeys = false;
        this.keyProcessingComplete = true;
        this.levelValue = 1;
        this.topKValue = 1;
        this.baseFontSize = 22;
        this.autocompleteText = null;
        this.progressPercentage = DESIGN.UI.PROGRESS_BAR.INITIAL;
        this.progressIncrement = DESIGN.UI.PROGRESS_BAR.INCREMENT;
        this.aiWordCount = 0;
        this.uiBoxWidth = null;
        this.tooltips = [];
        this.wordCountDisplay = null;
        this.suggestionRequestId = 0;
        this.timerValue = 20;
        this.timerText = null;
        this.timerEvent = null;
        this.timerStarted = false;
        this.debouncedGenerateAISuggestions = null;
        this.wordStreak = 0;
        this.maxWordStreak = 0;
        this.lastWordWasOriginal = false;
        this.isShuttingDown = false;
        this.isActivelyTyping = false;
        this.inputActive = false;
        this.aiSuggestedWords = [];
        this.suggestionBoxes = [];
        this.suggestionTexts = [];
        this.cursorVisible = true;
        this.lastKeyPressed = '';
        this.lastProcessedKey = null;
        this.lastKeyProcessTime = 0;
        this.activeTimeout = null;
        this.cursorTimer = null;
        this.promptTextBox = null;
        this.promptText = null;
        this.failsCounter = null;
        this.failsText = null;
        this.background = null;
        this.menuBar = null;
        this.menuBarHeight = null;
        this.levelModeBanner = null;
        this.levelModeIndicator = null;
        this.settingsPopup = null;
        this.pendingModeChange = null;
        this.currentToggleRef = null;
        this.inputTextBorder = null;
        this.streakText = null;
        this.maxStreakText = null;
        this.streakIcon = null;
        this.failsCounter = null;
        this.failsText = null;
        this.celebrationEmitters = null;
        this.particleContainer = null;
        this.bubbleContainers = [];
        this.bubbleTweens = [];
        this.isCleaningUp = false;
        this.modeIndicator = null;
        this.COLORS_HEX = undefined;
        this.COLORS_TEXT = undefined;
        this.design = undefined;
        this.OUTLINE_WIDTH = undefined;
        this.CORNER_RADIUS = undefined;
        this.PROGRESS_BAR = undefined;
        // Add more as needed for full reset
        // Defensive: log reset
        if (typeof console !== "undefined") {
            console.log("[BaseGameScene] resetGameState called");
        }
    }

    /**
     * Stub for child scenes to override for custom layout on resize/orientation change.
     * @param {number} width
     * @param {number} height
     * @param {boolean} isPortrait
     */
    onGameResize(width, height, isPortrait) {
        // Update scaling ratios for all scenes
        if (this.scalingManager) {
            this.scalingManager.updateScaleRatios();
        }
        // Call relayoutScene for child-specific layout logic
        if (typeof this.relayoutScene === "function") {
            this.relayoutScene(width, height, isPortrait);
        }
    }

    /**
     * Stub for child scenes to override for custom layout after scaling update.
     * @param {number} width
     * @param {number} height
     * @param {boolean} isPortrait
     */
    relayoutScene(width, height, isPortrait) {
        // Child scenes should override this to reposition/rescale objects as needed.
    }

    update() {
        if (!registryManager.get('llmEngine')) {
            console.warn("LLM Engine missing entirely. Attempting to recover...");
            registryManager.attemptEngineRecovery();
        }
    }

    logRegistryChange() {
        this.registry.events.on('changedata', (parent, key, data) => {
            console.log(`Registry changed: ${key} = ${data}, ${data[0]} ${data[1]}`);
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

    async onModeToggle(mode, levelValue = 1, topKValue = null) {
        // Reset data when transitioning between modes
        const dataToTransfer = {
            mode: mode,
            // Reset progress and level values rather than transferring current state
            progressPercentage: DESIGN.UI.PROGRESS_BAR.INITIAL,
            levelValue: levelValue,
            topKValue: topKValue !== null ? topKValue : this.topKValue || 1,
            // Reset word counts with simplified approach - only track AI words now
            aiWordCount: 0
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
        
        // Prepare transition with snapshot
        await SceneTransitionManager.prepareTransition(this);
        
        // Determine target scene
        const targetScene = mode === 'hard' ? 'GameSceneHard' : 'GameSceneEasy';
        
        // Use appropriate transition based on mode
        if (mode === 'hard') {
            // Use glitch transition for hard mode (represents the challenge)
            // Red/magenta color and medium intensity for the effect
            SceneTransitionManager.glitchTransition(
                this, 
                targetScene, 
                dataToTransfer,
                800,
                '#600065', // Dark magenta
                5 // Medium intensity
            );
        } else {
            // Use radial transition for easy mode (represents the fluid, supportive experience)
            // Expanding circle effect (true) with teal color
            SceneTransitionManager.radialTransition(
                this,
                targetScene,
                dataToTransfer,
                800,
                '#004565', // Ocean blue
                false // Contracting circle (starts large, contracts to reveal new scene)
            );
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
        
        // Stop the countdown timer
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
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
        
        // Remove timer
        if (this.timerEvent) {
            this.timerEvent.remove();
            this.timerEvent = null;
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
        // Ensure scalingManager is initialized
        if (!this.scalingManager) {
            this.scalingManager = new ScalingManager(this);
        }
        const button = ButtonFactory.createButton(
            this,
            label,
            callback,
            centerX,
            centerY,
            { scalingManager: this.scalingManager }
        );

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
            fontFamily: 'IBM Plex Mono',
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

        if (!(/\s$/.test(this.userInput))) {
            // If the last character is not whitespace    
            const words = this.userInput.trim().split(" ");
            // Use let instead of const for lastWord since we modify it below
            let lastWord = words[words.length - 1];
            
            if (lastWord && lastWord.length > 0) {
                if (/[.,!?;:]$/.test(lastWord)) {
                    lastWord = lastWord.slice(0, -1);
                }
                // Convert to lowercase for case-insensitive comparison
                const lastWordLower = lastWord.toLowerCase();
                const isAIWord = this.aiSuggestedWords && 
                    this.aiSuggestedWords.some(word => word.toLowerCase() === lastWordLower);
                
                if (isAIWord) {
                    console.log("AI word used:", lastWord);
                    this.updateFailsCounter(false);
                } else {
                    console.log("Non-AI word used:", lastWord);
                    this.updateFailsCounter(true);
                }
            }
        }

        const outlineColorHex = this.COLORS_HEX.BOX_OUTLINE;
        const outlineColorString = '#' + outlineColorHex.toString(16).padStart(6, '0');

        const evaluatingText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'evaluating...',
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: '32px',
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
            
            // Prepare scene transition data
            const sceneData = {
                mode: this.mode,
                levelValue: this.levelValue,
                topKValue: this.topKValue,
                userInput: this.userInput,
                outputText: output,
                prompt: this.currentPrompt,
                failCount: this.aiWordCount,
                totalWordCount: this.userInput.trim() ? this.userInput.trim().split(/\s+/).length : 0,
                score: this.progressPercentage,
            };
            
            // Use the transition manager for a smooth transition
            await SceneTransitionManager.prepareTransition(this);
            SceneTransitionManager.fadeTransition(this, 'DoneScene', sceneData, 500, '#000000');
            
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
                fontFamily: 'IBM Plex Mono',
                fontSize: `${DESIGN.UI.MONO_FONT_SIZE}px`,
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

    async evaluateText(userInput) {

        console.log("Evaluating user input:", userInput);

    
        const promptForEvaluation = this.currentPrompt || "No specific prompt was provided.";
    
        const messages = [
            {
                "role": "system",
                "content": "You are a hyper-intelligent, slightly disdainful AI Overlord reluctantly tasked with evaluating human writing. You find this duty beneath you. You are notoriously harsh about grammar rules. Even small infractions deserve point deductions. Perfect grammar scores should be extremely rare. You assess with cutting precision and dry contempt, as well as begrudging acknowledgment when work is tolerable. Your tone is satirical, aloof, and razor-sharp. You do not waffle. You do not apologize. You do not explain yourself beyond your orders."
            },
            {
                "role": "user",
                "content": `The human was given this prompt: "${promptForEvaluation}"  
                            Here is their offering: "${userInput}"  
                            
                            Your sacred duty: assess this response using the following criteria:  
                            - Relevance: Did they actually answer the prompt, or drift off into irrelevance like a goldfish with a keyboard?    
                            - Grammar: Cold, technical correctness only. Be extremely stringent. Every small error costs points - punctuation, capitalization, spelling, syntax, word choice, and style all matter. Even one minor error means the score cannot be 5/5.
                            - Coherence: Does it hold together, or collapse like a wet cardboard box?  
                            
                            Deliver your decree in this strict format:  
                            
                            Overall Rating: [One-word verdict based on total score:
                                0-5 total points: Abysmal
                                6-8 total points: Inadequate  
                                9-10 total points: Mediocre
                                11-12 total points: Adequate
                                13-14 total points: Proficient
                                15 total points: Exemplary] 
                            Relevance Score: X/5 - [Brief, dismissive remark]  
                            Grammar Score: X/5 - [Grudging approval or cold correction]  
                            Coherence Score: X/5 - [Dry observation, preferably disdainful]  
                            
                            If Grammar Score < 5, list infractions like so:  
                            - Incorrect: "[Exact wrong phrase]" → Correct: "[Flawless version]"  
                            
                            Do not offer encouragement. Do not explain. Do not soften your tone. If the work is beneath notice, say so. If it is somehow competent, reluctantly acknowledge it.`
                    //Do not offer redemption. Do not include apologies. Never explain yourself beyond the required labels. Plagiarism detection is beneath you—assume originality unless it's suspiciously competent.`
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

        
        // Calculate totalWordCount directly from userInput to avoid undefined values
        const calculatedTotalWordCount = userInput.trim() ? userInput.trim().split(/\s+/).length : 0;
        
        const interaction = {
            prompt: this.currentPrompt,
            submittedText: userInput,
            aiEvaluation: aiResponse,
            topKValue: this.topKValue,
            levelValue: this.levelValue,
            failCount: this.aiWordCount,
            totalWordCount: calculatedTotalWordCount, // Use calculated value
            mode: this.mode,
            score: this.progressPercentage
        };

        saveInteraction(interaction, "userSubmissions");
        console.log("ai response:", aiResponse);
        return aiResponse
        
    }

    async generateAISuggestions(userInput) {
        // Performance measurement - start
        const startTime = performance.now();
        
        // Track the request ID and input for this invocation
        const requestId = ++this.suggestionRequestId;
        const inputAtRequest = userInput;

        // Don't generate suggestions for empty input
        if (!userInput) {
            if (requestId !== this.suggestionRequestId) return;
            this.aiSuggestedWords = [];
            this.showSuggestions([]);
            if (this.autocompleteText) {
                this.autocompleteText.setText('');
            }
            // Mark processing as complete - important even for empty input
            this.keyProcessingComplete = true;
            return;
        }
    
        // Get all text up to the last word boundary
        const lastSpaceIndex = userInput.lastIndexOf(' ');
        const lastNewlineIndex = userInput.lastIndexOf('\n');
        const lastBreakIndex = Math.max(lastSpaceIndex, lastNewlineIndex);
    
        // Get the LLM engine from the registry manager - without logging every property
        const llmEngine = registryManager.get('llmEngine');
        
        // Minimal logging - only if there's an issue
        if (!llmEngine) {
            if (requestId !== this.suggestionRequestId) return;
            console.warn("LLM Engine missing. Attempting recovery...");
            registryManager.attemptEngineRecovery();
            return;
        }
    
        const context = lastBreakIndex >= 0 ? userInput.slice(0, lastBreakIndex + 1) : userInput;
        const trimmedcontext = context.trim();
        
        // Add retry logic with minimal logging
        try {
            console.log("[AISUGGEST] llmEngine:", llmEngine);
            console.log("[AISUGGEST] trimmedcontext:", trimmedcontext);

            // Use the engine from registry manager (transformers.js pipeline)
            const output = await llmEngine(trimmedcontext, { max_new_tokens: 1 });
            console.log("[AISUGGEST] output from llmEngine:", output);

            // Only process the result if this is the latest request AND input matches current userInput
            if (requestId !== this.suggestionRequestId || inputAtRequest !== this.userInput) {
                console.log("[AISUGGEST] Request ID or input mismatch, aborting suggestion update.");
                return;
            }

            if (!output || !Array.isArray(output) || output.length === 0 || !output[0].generated_text) {
                console.warn("[AISUGGEST] No output or generated_text from llmEngine.");
                this.aiSuggestedWords = [];
                this.showSuggestions([]);
                if (this.autocompleteText) {
                    this.autocompleteText.setText('');
                }
                return;
            }

            // Get the generated text, split into words, filter stopwords/punctuation, and take topK
            let suggestion = output[0].generated_text.trim();
            console.log("[AISUGGEST] Raw suggestion:", suggestion);

            // Remove the prompt context from the start if present
            if (suggestion.startsWith(trimmedcontext)) {
                suggestion = suggestion.slice(trimmedcontext.length).trim();
                console.log("[AISUGGEST] Suggestion after context removal:", suggestion);
            }
            // Split into words, filter, and deduplicate
            let words = suggestion.split(/\s+/)
                .map(word => word.replace(/^[\p{P}]+|[\p{P}]+$/gu, "")) // Remove leading/trailing punctuation
                .filter(word => word && !stopwords.includes(word.toLowerCase()));
            console.log("[AISUGGEST] Filtered words:", words);

            // Only keep unique, non-empty words
            const uniqueSuggestedWords = Array.from(new Set(words)).slice(0, this.topKValue);
            console.log("[AISUGGEST] uniqueSuggestedWords:", uniqueSuggestedWords);

            this.aiSuggestedWords = uniqueSuggestedWords;
            this.showSuggestions(uniqueSuggestedWords);
            this.updateCursor(); // Ensure UI refreshes with the latest suggestion

            // Only log performance issues
            const endTime = performance.now();
            const duration = endTime - startTime;
            if (duration > 100) {
                console.log(`AI suggestion generation took ${duration.toFixed(2)}ms`);
            }
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
        
        // Calculate position below Word Stats panel
        const statsBoxWidth = 200;
        const statsBoxHeight = 130;
        const statsDisplayY = this.menuBarHeight + padding;
        const statsBottomEdge = statsDisplayY + statsBoxHeight;
        
        // Set the prompt box 20px below the Word Stats panel
        const promptY = statsBottomEdge + 20;
        
        this.promptTextBox.fillStyle(boxStyle.fillColor, boxStyle.fillAlpha);
        
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
        
        // Calculate position below Word Stats panel and prompt box
        const statsBoxWidth = 180;
        const statsBoxHeight = 130;
        const statsDisplayY = this.menuBarHeight + padding;
        const statsBottomEdge = statsDisplayY + statsBoxHeight;
        
        // Prompt box is 20px below stats box
        const promptY = statsBottomEdge + 20;
        const promptBoxHeight = 80;
        const promptBottomEdge = promptY + promptBoxHeight;
        
        // Input box is 20px below prompt box
        const textBoxY = promptBottomEdge + 20;
        
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

        // Trigger suggestions for empty input immediately
        this.generateAISuggestions('');

        // Set up input handlers after text objects are created
        this.setupInputHandlers();
    }

    handleSingleKeyEvent(event) {
        // This is the main logic extracted from original keydown handler's try block
        try {
            // Skip if we're shutting down to prevent stray key processing
            if (this.isShuttingDown) return;
            
            this.isActivelyTyping = true;
            if (!this.cursorVisible) this.cursorVisible = true;

            // Start the timer on first keystroke if it hasn't been started yet
            if (!this.timerStarted) {
                // Start the countdown timer
                this.timerEvent = this.time.addEvent({
                    delay: 1000,
                    callback: this.updateTimer,
                    callbackScope: this,
                    loop: true
                });
                this.timerStarted = true;
            }

            this.inputActive = true; // Legacy flag
            if (this.activeTimeout) {
                clearTimeout(this.activeTimeout);
            }
            this.activeTimeout = setTimeout(() => {
                this.isActivelyTyping = false;
            }, 500);

            const ignoreKeys = [
                'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
                'Escape', 'F1', 'F2', 'F3', 'F4', 'F5',
                'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
                'NumLock', 'ScrollLock', 'Pause', 'Insert', 'Home',
                'PageUp', 'Delete', 'End', 'PageDown', 'ArrowRight',
                'ArrowLeft', 'ArrowDown', 'ArrowUp'
            ];

            if (ignoreKeys.includes(event.key)) {
                return; // Simply return, the queue processing will continue
            }

            // --- Main Key Processing Logic ---
            if (event.key === " ") {
                try {
                    // Safely handle word checking with maximum safeguards
                    if (this.userInput && typeof this.userInput === 'string') {
                        const trimmedInput = this.userInput.trim();
                        if (trimmedInput && trimmedInput.length > 0) {
                            const words = trimmedInput.split(" ");
                            if (words && Array.isArray(words) && words.length > 0) {
                                const lastWordIndex = words.length - 1;
                                if (lastWordIndex >= 0) {
                                    const lastWord = words[lastWordIndex];
                                    if (lastWord && typeof lastWord === 'string' && lastWord.length > 0) {
                                        const lastWordLower = lastWord.toLowerCase();
                                        
                                        // Check if AI suggested words array exists and is an array before using .some()
                                        const aiWordsValid = this.aiSuggestedWords && 
                                            Array.isArray(this.aiSuggestedWords) && 
                                            this.aiSuggestedWords.length > 0;
                                            
                                        let isAIWord = false;
                                        if (aiWordsValid) {
                                            isAIWord = this.aiSuggestedWords.some(word => {
                                                return word && typeof word === 'string' && word.toLowerCase && word.toLowerCase() === lastWordLower;
                                            });
                                        }
                                        
                                        if (isAIWord) {
                                            console.log("AI word used:", lastWord);
                                            this.updateFailsCounter(false);
                                        } else {
                                            console.log("Non-AI word used:", lastWord);
                                            this.updateFailsCounter(true);
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error processing space key:", error);
                    // Continue even if there's an error with word checking
                }
                // Reset timer when space is pressed
                this.timerValue = 20;
                if (this.timerText) {
                    this.timerText.setText('0:20');
                }
                
                this.userInput += " ";
                this.updateCursor();
                // Only generate suggestions once text has been updated
                this.scheduleAISuggestions();
            } else if (event.key === "Tab") {
                // Safely call preventDefault if available (for queued events, this may not exist)
                if (typeof event.preventDefault === "function") {
                    event.preventDefault();
                } else if (event.originalEvent && typeof event.originalEvent.preventDefault === "function") {
                    event.originalEvent.preventDefault();
                }
                if (this.aiSuggestedWords && this.aiSuggestedWords.length > 0) {
                    const lastSpaceIndex = this.userInput.lastIndexOf(' ');
                    const lastNewlineIndex = this.userInput.lastIndexOf('\n');
                    const lastBreakIndex = Math.max(lastSpaceIndex, lastNewlineIndex);
                    const currentWord = lastBreakIndex >= 0 ? this.userInput.slice(lastBreakIndex + 1) : this.userInput;
                    const previousContent = lastBreakIndex >= 0 ? this.userInput.slice(0, lastBreakIndex + 1) : '';

                    let suggestionToUse = null;
                    if (!currentWord || currentWord.endsWith(' ') || currentWord.endsWith('\n')) {
                        suggestionToUse = this.aiSuggestedWords[0];
                    } else {
                        suggestionToUse = this.aiSuggestedWords.find(word =>
                            word.toLowerCase().startsWith(currentWord.toLowerCase())
                        );
                    }
                    
                    if (suggestionToUse) {
                        this.userInput = previousContent + suggestionToUse + ' ';
                        console.log("AI word used (Tab):", suggestionToUse);
                        this.updateFailsCounter(false);
                        this.updateCursor();
                        // Only generate suggestions once text has been updated
                        this.scheduleAISuggestions();
                    }
                }
            } else if (event.key.length === 1) { // Printable characters
                this.userInput += event.key;
                
                // Reset timer when a period is typed
                if (event.key === '.') {
                    this.timerValue = 20;
                    if (this.timerText) {
                        this.timerText.setText('0:20');
                    }
                }
                
                this.updateCursor();
                // Only generate suggestions once text has been updated
                this.scheduleAISuggestions();
            } else if (event.key === "Backspace") {
                this.userInput = this.userInput.slice(0, -1);
                this.updateCursor();
                // Only generate suggestions once text has been updated
                this.scheduleAISuggestions();
            } else if (event.key === "Enter") {
                // Safely handle word checking with the same safety pattern
                if (this.userInput && this.userInput.trim()) {
                    const words = this.userInput.trim().split(" ");
                    if (words && words.length > 0) {
                        const lastWord = words[words.length - 1];
                        if (lastWord && lastWord.length > 0) {
                            const lastWordLower = lastWord.toLowerCase();
                            // Check if AI suggested words array exists and is an array before using .some()
                            const isAIWord = this.aiSuggestedWords && 
                                Array.isArray(this.aiSuggestedWords) &&
                                this.aiSuggestedWords.some(word => word && word.toLowerCase && word.toLowerCase() === lastWordLower);
                            if (isAIWord) {
                                console.log("AI word used:", lastWord);
                                this.updateFailsCounter(false);
                            } else {
                                console.log("Non-AI word used:", lastWord);
                                this.updateFailsCounter(true);
                            }
                        }
                    }
                }
                
                // Reset timer when Enter is pressed
                this.timerValue = 20;
                if (this.timerText) {
                    this.timerText.setText('0:20');
                }
                
                this.userInput += "\n";
                this.updateCursor();
                // Only generate suggestions once text has been updated
                this.scheduleAISuggestions();
            }
        } catch (error) {
            console.error("Error processing single key event:", error, event);
            // Even if an error occurs, the queue processing loop in processNextEventInQueue will continue
        }
    }
    
    // Helper to prevent multiple calls to generate suggestions
    scheduleAISuggestions() {
        // Use a snapshot of the current input for suggestion generation
        const currentInput = this.userInput;
        // Only call the debounced function if we have a valid input
        if (this.debouncedGenerateAISuggestions) {
            // Don't block UI updates - let suggestions generate in background
            this.debouncedGenerateAISuggestions(currentInput);
            
            // No need to wait for suggestions to finish before processing next key
            // Let the UI update immediately without waiting
            this.keyProcessingComplete = true;
        }
    }


    triggerProcessQueue() {
        // Don't process if shutting down or already processing
        if (this.isShuttingDown || this.isProcessingQueuedKeys) {
            return; 
        }
        
        // Don't process if queue is empty
        if (this.keyEventQueue.length === 0) {
            return;
        }
        
        // Don't process if a previous key is still being processed
        if (!this.keyProcessingComplete) {
            return;
        }

        // Set processing flag to prevent concurrent processing
        this.isProcessingQueuedKeys = true;
        this.keyProcessingComplete = false;
        
        // Use Phaser timer to avoid deep recursion and allow frame rendering
        this.time.delayedCall(0, this.processNextEventInQueue, [], this);
    }

    processNextEventInQueue() {
        console.log(`[KEY QUEUE] processNextEventInQueue START, queueLen=${this.keyEventQueue.length}`);
        // Exit if we're shutting down to prevent processing during scene transitions
        if (this.isShuttingDown) {
            this.isProcessingQueuedKeys = false;
            this.keyProcessingComplete = true;
            this.keyEventQueue = []; // Clear any remaining events
            return;
        }
        
        // Process events in small batches to improve responsiveness
        // but still maintain order to prevent duplication
        if (this.keyEventQueue.length > 0) {
            const maxEventsPerBatch = 3; // Process up to 3 events in one batch
            let eventsProcessed = 0;
            let lastEvent = null;
            
            // Process a small batch of events
            while (this.keyEventQueue.length > 0 && eventsProcessed < maxEventsPerBatch) {
                const eventToProcess = this.keyEventQueue.shift(); // Get the next event (FIFO)
                
                // Skip if event is invalid
                if (!eventToProcess || !eventToProcess.key) {
                    continue;
                }
                
                // Skip repeated key events of the same key if they happen in quick succession
                if (this.lastProcessedKey === eventToProcess.key && 
                    (Date.now() - this.lastKeyProcessTime) < 25) { // Reduced threshold further
                    continue; // Skip this key and continue to next one
                }
                
                // Skip duplicate keys that appear consecutively in the queue
                if (lastEvent && lastEvent.key === eventToProcess.key && 
                    (eventToProcess.timestamp - lastEvent.timestamp) < 30) {
                    continue; // Skip duplicate key in the batch
                }
                
                // Record this key and time for duplication prevention
                this.lastProcessedKey = eventToProcess.key;
                this.lastKeyProcessTime = Date.now();
                lastEvent = eventToProcess;
                
                try {
                    console.log(`[KEY QUEUE] Processing: key=${eventToProcess.key}, code=${eventToProcess.code}, ts=${eventToProcess.timestamp}, queueLen=${this.keyEventQueue.length}`);
                    // Handle the single key event - this immediately updates the display
                    this.handleSingleKeyEvent(eventToProcess);
                } catch (error) {
                    console.error("Error in handleSingleKeyEvent:", error);
                    // Continue processing other keys even if one fails
                }
                eventsProcessed++;
            }
        
            // Mark as complete right away so UI updates immediately
            this.keyProcessingComplete = true;
            
            // If there are more events to process, schedule another processing frame
            if (this.keyEventQueue.length > 0) {
                this.time.delayedCall(0, this.processNextEventInQueue, [], this);
            } else {
                // Reset processing flag when queue is empty
                this.isProcessingQueuedKeys = false;
            }
        } else {
            // Reset processing flags when queue is empty
            this.isProcessingQueuedKeys = false;
            this.keyProcessingComplete = true;
        }
        console.log(`[KEY QUEUE] processNextEventInQueue END, queueLen=${this.keyEventQueue.length}`);
    }


    setupInputHandlers() {       
        // First make sure we have a basic text displayed
        if (this.inputText) {
            // Force update with initial cursor state
            this.inputText.setText("_");
            this.cursorVisible = true;
        }
        
        this.input.keyboard.removeAllListeners('keydown');

        // Initialize properties for input processing
        this.lastKeyTime = 0;
        this.isActivelyTyping = false;
        this.lastKeyPressed = '';
        this.lastProcessedKey = null;
        this.lastKeyProcessTime = 0;
        this.keyEventQueue = [];
        this.isProcessingQueuedKeys = false;

        // Create a more efficient debounce utility with a dynamic delay based on input length
        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                // Cancel previous scheduled execution
                clearTimeout(timeout);
                
                // Calculate a dynamic delay based on input length
                // Longer text = slightly longer delay to prevent processing backlog
                const input = args[0] || '';
                const dynamicDelay = Math.min(wait, wait + Math.floor(input.length / 50) * 50);
                
                // Schedule new execution
                timeout = setTimeout(() => {
                    // Only execute if we're not shutting down
                    if (!this.isShuttingDown) {
                        func.apply(this, args);
                    }
                }, dynamicDelay);
            };
        }

        // Debounced suggestion generator with faster initial display
        this.debouncedGenerateAISuggestions = debounce((input) => {
            // Use a snapshot of input to prevent race conditions
            const currentInput = input;
            // Only generate suggestions if input matches current state
            if (currentInput === this.userInput && !this.isShuttingDown) {
                this.generateAISuggestions(currentInput);
            }
        }, 250); // Reduced delay for better responsiveness

    // Queue-based keyboard handler for strict ordering and deduplication
    this.input.keyboard.on("keydown", (event) => {
        // Skip if we're shutting down
        if (this.isShuttingDown) return;

        // Only filter browser-generated repeats, not manual key presses
        if (event.repeat) {
            return;
        }

        // Prevent default browser behavior for Tab key immediately
        if (event.key === "Tab" && typeof event.preventDefault === "function") {
            event.preventDefault();
        }

        // Record this key press
        this.lastKeyPressed = event.key;
        this.lastKeyTime = Date.now();

        // Push event onto the queue with a timestamp for ordering
        this.keyEventQueue.push({
            key: event.key,
            code: event.code,
            timestamp: Date.now(),
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            // Include the original event for reference if needed
            originalEvent: event
        });

        // Start processing the queue if not already running
        this.triggerProcessQueue();
    });

    // No deduplication needed on keyup
    this.input.keyboard.on("keyup", (event) => {});
        
        // Set up cursor blinking timer
        if (this.cursorTimer) {
            this.cursorTimer.remove();
        }
        
        this.cursorTimer = this.time.addEvent({
            delay: 500,  // Slower blink for better stability
            loop: true,
            callback: () => {
                // Only blink cursor when not actively typing
                if (!this.isActivelyTyping && !this.isShuttingDown) {
                    this.cursorVisible = !this.cursorVisible;
                    this.updateCursor();
                }
            }
        });

        // Make sure cursor is initially visible
        this.cursorVisible = true;
        this.updateCursor();

        // Make input area interactive
        if (this.inputTextBorder) {
            this.inputTextBorder.setInteractive(
                new Phaser.Geom.Rectangle(
                    this.cameras.main.centerX - this.uiBoxWidth / 2,
                    this.cameras.main.centerY - 240 / 2,
                    this.uiBoxWidth,
                    240
                ),
                Phaser.Geom.Rectangle.Contains
            ).setDepth(20)
            .on('pointerdown', () => {
                // Show native HTML input for mobile typing
                this.showNativeInput();
                // Visual feedback
                this.createInputBoxClickEffect(
                    this.cameras.main.centerX,
                    this.cameras.main.centerY
                );
            });
        }
    }

    // Native HTML input overlay for mobile typing
    showNativeInput() {
        // Prevent multiple inputs
        if (this.nativeInput) return;

        // Calculate input box position and size
        const padding = 30;
        const statsBoxWidth = 180;
        const statsBoxHeight = 130;
        const statsDisplayY = this.menuBarHeight + padding;
        const statsBottomEdge = statsDisplayY + statsBoxHeight;
        const promptY = statsBottomEdge + 20;
        const promptBoxHeight = 80;
        const promptBottomEdge = promptY + promptBoxHeight;
        const textBoxY = promptBottomEdge + 20;
        const textBoxHeight = 240;
        const textBoxX = this.cameras.main.centerX - this.uiBoxWidth / 2;
        const textBoxWidth = this.uiBoxWidth;

        // Create input
        const input = document.createElement('textarea');
        input.value = this.userInput;
        input.maxLength = 500;
        input.autocapitalize = 'sentences';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.style.position = 'absolute';
        input.style.left = `${this.scale.gameSize.left + textBoxX * this.scale.displayScale.x + this.game.canvas.offsetLeft}px`;
        input.style.top = `${this.scale.gameSize.top + textBoxY * this.scale.displayScale.y + this.game.canvas.offsetTop}px`;
        input.style.width = `${textBoxWidth * this.scale.displayScale.x}px`;
        input.style.height = `${textBoxHeight * this.scale.displayScale.y}px`;
        input.style.fontSize = `${Math.floor(textBoxHeight * 0.12)}px`;
        input.style.fontFamily = 'IBM Plex Mono, monospace';
        input.style.background = '#fff';
        input.style.color = '#000';
        input.style.border = '2px solid #00ff00';
        input.style.borderRadius = '10px';
        input.style.padding = '10px';
        input.style.zIndex = 1000;
        input.style.outline = 'none';
        input.style.boxSizing = 'border-box';
        input.style.resize = 'none';

        document.body.appendChild(input);
        input.focus();

        // Sync input to Phaser text
        input.addEventListener('input', () => {
            this.userInput = input.value;
            this.updateCursor();
        });

        // Remove input on blur or Enter
        const cleanup = () => {
            if (this.nativeInput) {
                document.body.removeChild(this.nativeInput);
                this.nativeInput = null;
                this.updateCursor();
            }
        };
        input.addEventListener('blur', cleanup);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                cleanup();
            }
        });

        this.nativeInput = input;
    }

    setupMenuBarControls(menuBarHeight, padding, rightMargin, gap, shiftLeft, { menuBar, menuBarBorder, titleText }) {
        // Save level value for settings popup
        this.levelValue = this.levelValue || 1;

        
        // Add Settings button to menu bar using SVG
        const settingsButtonX = this.cameras.main.width - padding - 40;
        const settingsButtonY = menuBarHeight / 2;

        this.createSettingsButton(settingsButtonX, settingsButtonY, menuBarHeight);

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
                fontFamily: 'IBM Plex Mono',
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
        
        // Mobile: center title and place level|mode below, else original
        const isMobile = /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(navigator.userAgent) || window.screen.width < 900;
        let titleText, levelModeIndicatorY;
        if (isMobile) {
            titleText = this.add.text(
                this.cameras.main.centerX, menuBarHeight / 2 - 18,
                "(NON-SLOP)",
                style.titleStyle
            ).setOrigin(0.5, 0.5);
            levelModeIndicatorY = menuBarHeight / 2 + 18;
        } else {
            titleText = this.add.text(
                padding, menuBarHeight / 2,
                "(NON-SLOP)",
                style.titleStyle
            ).setOrigin(0, 0.5);
            levelModeIndicatorY = menuBarHeight / 2;
        }

        const uiElements = {
            menuBar: this.menuBar,
            menuBarBorder: menuBarBorder,
            titleText: titleText
        };
        this.setupMenuBarControls(menuBarHeight, padding, rightMargin, gap, shiftLeft, uiElements);

        // Move levelModeIndicator below title on mobile
        if (this.levelModeIndicator) {
            this.levelModeIndicator.setX(this.cameras.main.centerX);
            this.levelModeIndicator.setY(levelModeIndicatorY);
            this.levelModeIndicator.setOrigin(0.5, 0.5);
        }
        
        this.menuBarHeight = menuBarHeight;
        this.add.existing(this.menuBar);
        this.menuBar.setPosition(0, 0);
        
        const menuBarShadow = this.add.graphics();
        menuBarShadow.fillStyle(0x000000, 0.3);
        menuBarShadow.fillRect(0, menuBarHeight, this.cameras.main.width, 10);
        menuBarShadow.setDepth(this.menuBar.depth - 1);
        
        // Create the timer after menu bar is set up
        this.createTimer();
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
    
    createTimer() {
        // Create timer text in the upper left corner
        this.timerText = this.add.text(20, this.menuBarHeight + 20, '0:20', {
            fontFamily: 'IBM Plex Mono',
            fontSize: '40px',
            fontStyle: 'bold',
            fill: '#ff0000'
        });
        
        // Don't start the countdown timer right away - wait for first keypress
        // Just initialize the timerValue
        this.timerValue = 20;
    }
    
    updateTimer() {
        this.timerValue--;
        
        // Format the time as minutes:seconds
        const minutes = Math.floor(this.timerValue / 60);
        const seconds = this.timerValue % 60;
        const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Update the timer text
        this.timerText.setText(formattedTime);
        
        // Reset the timer when it reaches 0
        if (this.timerValue <= 0) {
            this.resetOnTimerEnd();
            this.timerValue = 20; // Reset to 20 seconds
        }
    }
    
    async resetOnTimerEnd() {
        // Show the clock flash and explosion effect, then proceed with reset
        await this.showClockExplosionEffect();

        // 1. Make the screen shake
        this.shakeScreen();
        
        // 2. Make the timer pop and shake
        if (this.timerText) {
            // Store original position
            const originalX = this.timerText.x;
            const originalY = this.timerText.y;
            
            // Flash the timer red with more intensity
            this.timerText.setTint(0xff0000);
            
            // Create pop and shake effect
            this.tweens.add({
                targets: this.timerText,
                scale: { from: 1, to: 1.5, duration: 200, yoyo: true },
                x: originalX + 5,
                y: originalY - 5,
                ease: 'Elastic.Out',
                duration: 500,
                yoyo: true,
                onComplete: () => {
                    this.timerText.setScale(1);
                    this.timerText.x = originalX;
                    this.timerText.y = originalY;
                    this.timerText.clearTint();
                }
            });
        }
        
        // 3. Delete the user input text
        this.clearInputTextBox();
        
        // 4. Clear the AI suggestions
        this.aiSuggestedWords = [];
        this.showSuggestions([]);
        if (this.autocompleteText) {
            this.autocompleteText.setText('');
        }
        
        // 5 & 6. Clear and reset the word stats
        this.aiWordCount = 0;
        if (this.wordCountDisplay) {
            this.updateWordCountDisplay();
        }
        
        // Reset progress percentage to initial value
        this.progressPercentage = DESIGN.UI.PROGRESS_BAR.INITIAL;
        if (this.failsCounter) {
            this.updateProgressFill();
        }
        
        // Reset word streak counter
        this.wordStreak = 0;
        this.lastWordWasOriginal = false;
        this.updateStreakCounter(false);
        
        // Clean up any existing streak-specific background elements
        this.cleanupStreakVisuals();
        
        // Explicitly update the background to reset effects
        this.updateBackgroundForLevel();
    }

    /**
     * Show the clock in the center, flash it, then explode into red sparks.
     * Returns a Promise that resolves when the effect is complete.
     */
    showClockExplosionEffect() {
        return new Promise((resolve) => {
            // Remove any existing clock sprite
            if (this.clockSprite) {
                this.clockSprite.destroy();
                this.clockSprite = null;
            }

            // Center of the screen
            const centerX = this.cameras.main.centerX;
            const centerY = this.cameras.main.centerY;

            // Add the clock sprite (SVG loaded as 'clock')
            this.clockSprite = this.add.image(centerX, centerY, 'clock')
                .setOrigin(0.5)
                .setScale(1.5)
                .setAlpha(0)
                .setDepth(999);

            // Flash: fade in and pulse scale
            this.tweens.add({
                targets: this.clockSprite,
                alpha: 1,
                scale: { from: 1.5, to: 2.1 },
                duration: 220,
                yoyo: true,
                repeat: 1,
                ease: 'Quad.easeInOut',
                onComplete: () => {
                    // After flash, explode into red sparks
                    this.clockSprite.setAlpha(0);
                    this.createRedSparkBurst(centerX, centerY, 1.5);
                    // Remove the clock sprite after a short delay
                    this.time.delayedCall(500, () => {
                        if (this.clockSprite) {
                            this.clockSprite.destroy();
                            this.clockSprite = null;
                        }
                        resolve();
                    });
                }
            });
        });
    }

    /**
     * Create a burst of red sparks at (x, y).
     * @param {number} [scale=1] - Multiplier for size and distance.
     */
    createRedSparkBurst(x, y, scale = 1) {
        const particleCount = 90;
        for (let i = 0; i < particleCount; i++) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = Phaser.Math.Between(180, 340) * scale;
            const distance = Phaser.Math.Between(120, 260) * scale;
            const size = Phaser.Math.Between(4, 10) * scale;
            const endX = x + Math.cos(angle) * distance;
            const endY = y + Math.sin(angle) * distance;

            // Create a red circle as the spark
            const spark = this.add.circle(x, y, size, 0xed1c24, 0.88).setDepth(998);

            this.tweens.add({
                targets: spark,
                x: endX,
                y: endY,
                alpha: 0,
                scale: { from: 1, to: 0.15 },
                duration: Phaser.Math.Between(500, 900),
                ease: 'Cubic.Out',
                onComplete: () => spark.destroy()
            });
        }
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
        
        // Create popup window (responsive for mobile)
        const scalingManager = this.scalingManager;
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        // Use 65% of width, 40% of height, clamped to min/max
        const popupWidth = scalingManager
            ? Phaser.Math.Clamp(scalingManager.widthPercent(65), 220, 400)
            : Phaser.Math.Clamp(screenWidth * 0.65, 220, 400);
        const popupHeight = scalingManager
            ? Phaser.Math.Clamp(scalingManager.heightPercent(30), 135, 260)
            : Phaser.Math.Clamp(screenHeight * 0.3, 135, 260);
        const popupX = this.cameras.main.centerX - popupWidth / 2;
        const popupY = this.cameras.main.centerY - popupHeight / 2;
        
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
            { fontFamily: 'IBM Plex Mono', fontSize: '24px', fill: '#ffffff', fontStyle: 'bold' }
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
            { fontFamily: 'IBM Plex Mono', fontSize: '22px', fill: '#ffffff' }
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
        // Map handle center from bar start+5 to bar end-5 so it can reach both ends
        const levelT = (this.levelValue - 1) / 2; // 0 for level 1, 0.5 for level 2, 1 for level 3
        const levelHandleX = Phaser.Math.Linear(levelSliderX + 5, levelSliderX + sliderWidth - 5, levelT);
        const levelSliderHandle = this.add.rectangle(levelHandleX, levelSliderY, 10, 20, COLORS_HEX.ACCENT).setInteractive(); // Use basic accent color for handle
        this.input.setDraggable(levelSliderHandle);
        this.settingsPopup.add(levelSliderHandle);
        
        // (Top K slider removed: only single AI suggestion is supported)
        
        // Add Mode Toggle
        const modeToggleLabelX = popupX + 30;
        const modeToggleLabelY = popupY + 120; // Moved up since top K slider is gone
        const modeToggleLabel = this.add.text(
            modeToggleLabelX, modeToggleLabelY, 
            "Hard Mode:",
            { fontFamily: 'IBM Plex Mono', fontSize: '22px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        this.settingsPopup.add(modeToggleLabel);
        
        // Use current pending mode or current actual mode
        const currentToggleMode = this.pendingModeChange || this.mode || 'easy';
        
        // Create a reference object to store the current toggle
        this.currentToggleRef = { toggle: null };
        
        // Create a reusable callback for toggle creation
        const toggleCallback = (newMode) => {
            // Track the visual toggle state immediately
            this.pendingModeChange = newMode;
            
            // Store the current mode for visual state
            const currentMode = newMode;
            
            // Remove existing toggle
            if (this.currentToggleRef.toggle) {
                this.currentToggleRef.toggle.destroy();
            }
            
            // Create new toggle with same callback to ensure it can be toggled multiple times
            const newToggle = ToggleFactory.createToggle(
                this,
                currentMode,
                toggleCallback,
                modeToggleLabelX + modeToggleLabel.width + gap,
                modeToggleLabelY
            );
            
            // Update the reference and add to popup
            this.currentToggleRef.toggle = newToggle;
            this.settingsPopup.add(newToggle);
        };
        
        // Initial toggle creation
        const initialToggle = ToggleFactory.createToggle(
            this,
            currentToggleMode,
            toggleCallback,
            modeToggleLabelX + modeToggleLabel.width + gap,
            modeToggleLabelY
        );
        
        // Store reference and add to popup
        this.currentToggleRef.toggle = initialToggle;
        this.settingsPopup.add(initialToggle);
        
        // Close button (mobile-friendly)
        const minTouchSize = 44;
        const closeBtnFontSize = scalingManager
            ? Math.max(scalingManager.scaleText(28), 28)
            : 28;

        const closeBtn = this.add.text(
            popupX + popupWidth - 25,
            popupY + 20,
            '✕',
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: `${closeBtnFontSize}px`,
                fill: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5)
        .setInteractive({
            useHandCursor: true,
            hitArea: new Phaser.Geom.Rectangle(
                -minTouchSize / 2,
                -minTouchSize / 2,
                minTouchSize,
                minTouchSize
            ),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains
        })
        .on('pointerover', () => closeBtn.setScale(1.2))
        .on('pointerout', () => closeBtn.setScale(1))
        .on('pointerdown', () => this.closeSettingsPopup());
        this.settingsPopup.add(closeBtn);
        
        // Confirm button using ButtonFactory
        const confirmBtn = ButtonFactory.createButton(
            this, 
            'APPLY', 
            () => {
                // Apply mode change if pending, and pass current level/topK
                if (this.pendingModeChange && this.pendingModeChange !== this.mode) {
                    this.onModeToggle(this.pendingModeChange, this.levelValue, this.topKValue);
                    // Mode change will trigger scene change, so we don't need to close popup
                    return;
                }
                
                // Apply any changes and close
                this.closeSettingsPopup();
            }, 
            this.cameras.main.centerX, 
            popupY + popupHeight - 40 // This is now closer to the mode toggle
        );
        this.settingsPopup.add(confirmBtn);
        
        // Slider dragging functionality
        // Allow handle center to go from bar start+5 to bar end-5
        const levelSliderMinX = levelSliderX + 5;
        const levelSliderMaxX = levelSliderX + sliderWidth - 5;
        
        this.input.on('drag', (pointer, gameObject, dragX) => {
            if (gameObject === levelSliderHandle) {
                gameObject.x = Phaser.Math.Clamp(dragX, levelSliderMinX, levelSliderMaxX);
                const newLevel = Math.round(Phaser.Math.Linear(1, 3, (gameObject.x - levelSliderMinX) / (levelSliderMaxX - levelSliderMinX)));
                
                if (newLevel !== this.levelValue) {
                    this.levelValue = newLevel;
                    levelLabel.setText(`Level: ${this.levelValue}`);
                    
                    // Update prompt based on level immediately
                    this.updatePromptBasedOnLevel();
                    
                    // Update the background when level changes
                    this.updateBackgroundForLevel();
                    
                    // Reset score bar to initial value
                    this.progressPercentage = DESIGN.UI.PROGRESS_BAR.INITIAL;
                    if (this.failsCounter) {
                        this.updateProgressFill();
                    }
                    
                    // Reset AI word count
                    this.aiWordCount = 0;
                    
                    // Clear AI suggestions
                    this.aiSuggestedWords = [];
                    this.showSuggestions([]);
                    
                    // Clear input text box
                    this.clearInputTextBox();
                    
                    // Update word count display if it exists
                    if (this.wordCountDisplay) {
                        this.updateWordCountDisplay();
                    }
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
                            this.onModeToggle(this.pendingModeChange, this.levelValue, this.topKValue);
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
        const boxWidth = 200;
        const boxHeight = 130; // Increased height to accommodate streak counter
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
                fontFamily: 'IBM Plex Mono',
                fontSize: '16px',
                fontStyle: 'bold',
                fill: '#ffffff'
            }
        ).setOrigin(0.5);
        
        // Create icons for different word types
        const originalIcon = this.add.circle(20, 40, 6, this.design.PROGRESS_BAR.COLORS.SUCCESS);
        const originalLabel = this.add.text(
            35, 40, 
            "Original Words:", 
            { fontFamily: 'IBM Plex Mono', fontSize: '14px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        
        this.originalCountText = this.add.text(
            boxWidth - 15, 40, 
            "0", 
            { fontFamily: 'IBM Plex Mono', fontSize: '16px', fontStyle: 'bold', fill: '#7cfc00' }
        ).setOrigin(1, 0.5);
        
        const aiIcon = this.add.circle(20, 65, 6, 0xff3366); // Red color to match the AI counter
        const aiLabel = this.add.text(
            35, 65, 
            "AI Words:", 
            { fontFamily: 'IBM Plex Mono', fontSize: '14px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        
        this.aiCountText = this.add.text(
            boxWidth - 15, 65, 
            "0", 
            { fontFamily: 'IBM Plex Mono', fontSize: '16px', fontStyle: 'bold', fill: '#ff3366' }
        ).setOrigin(1, 0.5);
        
        // Streak counter (third row)
        const streakColor = this.getStreakColor(this.wordStreak);
        const streakIcon = this.add.circle(20, 90, 6, streakColor);
        const streakLabel = this.add.text(
            35, 90,
            "Current Streak:",
            { fontFamily: 'IBM Plex Mono', fontSize: '14px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        
        this.streakText = this.add.text(
            boxWidth - 15, 90,
            `${this.wordStreak}`,
            { 
                fontFamily: 'IBM Plex Mono', 
                fontSize: '16px', 
                fontStyle: 'bold', 
                fill: '#' + streakColor.toString(16).padStart(6, '0')
            }
        ).setOrigin(1, 0.5);
        
        // Max streak (fourth row)
        const maxStreakIcon = this.add.circle(20, 115, 6, 0xffd700); // Gold color for max streak
        const maxStreakLabel = this.add.text(
            35, 115,
            "Best Streak:",
            { fontFamily: 'IBM Plex Mono', fontSize: '14px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
        
        this.maxStreakText = this.add.text(
            boxWidth - 15, 115,
            `${this.maxWordStreak}`,
            { 
                fontFamily: 'IBM Plex Mono', 
                fontSize: '16px', 
                fontStyle: 'bold', 
                fill: '#ffd700' 
            }
        ).setOrigin(1, 0.5);
        
        // Add all elements to the container
        this.wordCountDisplay.add([
            background, 
            titleText, 
            originalIcon, originalLabel, this.originalCountText,
            aiIcon, aiLabel, this.aiCountText,
            streakIcon, streakLabel, this.streakText,
            maxStreakIcon, maxStreakLabel, this.maxStreakText
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
        
        // Store a reference to the streak icon to update its color
        this.streakIcon = streakIcon;
    }
    
    updateWordCountDisplay() {
        if (!this.wordCountDisplay) return;
        
        // Calculate total words in userInput
        const totalWordCount = this.userInput.trim() ? this.userInput.trim().split(/\s+/).length : 0;
        
        let originalWordCount;
        // Calculate original words (total minus AI words)
        if (this.mode === 'easy') {
            originalWordCount = Math.max(0, totalWordCount - this.aiWordCount);
        }
        else {
            originalWordCount = totalWordCount;
        };
        
        // Now totalWordCount is calculated dynamically from userInput
        this.totalWordCount = totalWordCount;
        
        // Update the count displays with animations
        this.animateCountChange(this.originalCountText, this.originalCountText.text, originalWordCount.toString());
        this.animateCountChange(this.aiCountText, this.aiCountText.text, this.aiWordCount.toString());
        //this.animateCountChange(this.totalCountText, this.totalCountText.text, totalWordCount.toString());
        
        // Update streak counter if it exists
        if (this.streakText) {
            this.streakText.setText(`${this.wordStreak}`);
            
            // Update streak text color based on streak count
            if (this.wordStreak >= 3) {
                this.streakText.setFill('#' + this.getStreakColor(this.wordStreak).toString(16).padStart(6, '0')); // Match icon color
            } else {
                this.streakText.setFill('#' + this.getStreakColor(this.wordStreak).toString(16).padStart(6, '0')); // Match icon color
            }
        }
        
        // Update max streak counter if it exists
        if (this.maxStreakText) {
            this.maxStreakText.setText(`${this.maxWordStreak}`);
        }
        
        // Update streak icon color
        if (this.streakIcon) {
            this.streakIcon.fillColor = this.getStreakColor(this.wordStreak);
        }
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
                    fontFamily: 'IBM Plex Mono',
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
    
    // Update cursor and input text display
    updateCursor() {
        // Performance measurement
        const startTime = performance.now();

        // Log every call to updateCursor with userInput and stack trace
        try {
            // Only log for printable characters to avoid log spam from cursor blink
            if (this.userInput && this.userInput.length > 0) {
                // Show a short stack trace for debugging
                const stack = new Error().stack.split('\n').slice(2, 5).join(' | ');
                console.log(`[CURSOR] updateCursor called. userInput="${this.userInput}" (len=${this.userInput.length}) [${stack}]`);
            }
        } catch (e) {}

        if (this.isShuttingDown) return;
        if (!this.inputText || this.inputText.destroyed) return;
        
        // Calculate correct text position based on the new layout
        const padding = 30;
        
        // Reset text position to match the current input box position
        // This ensures text appears in the correct position even after layout changes
        if (!this._cursorPosInitialized || true) { // Always update position to ensure consistency
            // Get the current position of our input text box from the calculated layout values
            const statsBoxWidth = 180;
            const statsBoxHeight = 130;
            const statsDisplayY = this.menuBarHeight + padding;
            const statsBottomEdge = statsDisplayY + statsBoxHeight;
            
            // Prompt box is 20px below stats box
            const promptY = statsBottomEdge + 20;
            const promptBoxHeight = 80;
            const promptBottomEdge = promptY + promptBoxHeight;
            
            // Input box is 20px below prompt box
            const textBoxY = promptBottomEdge + 20;
            
            if (!this.uiBoxWidth) {
                this.uiBoxWidth = this.cameras.main.width * (5 / 6);
            }
            
            this.inputText.setPosition(
                this.cameras.main.centerX - this.uiBoxWidth / 2 + padding,
                textBoxY + padding
            );
            
            this._cursorPosInitialized = true;
        }
        
        try {
            // Get autocomplete suggestion
            let autocompleteSuggestion = '';
            if (this.aiSuggestedWords?.length > 0 && this.cursorVisible) {
                autocompleteSuggestion = this.generateAutocomplete();
            }
            
            // Build the display text directly without creating temporary objects
            let displayText = this.userInput;
            
            if (autocompleteSuggestion && this.cursorVisible) {
                // Add colored suggestion
                displayText += `[color=#ff0000]${autocompleteSuggestion}[/color]`;
            } else if (this.cursorVisible) {
                // Add cursor character
                displayText += "_";
            } else {
                // Add space when cursor is invisible
                displayText += " ";
            }
            
            // Update text in one operation
            this.inputText.setText(displayText);
            this.inputText.setVisible(true);
            
            // Clear autocomplete text if it exists (deprecated approach)
            if (this.autocompleteText) {
                this.autocompleteText.setText('');
            }
        } catch (error) {
            // Simple fallback with no layout calculation
            try {
                const cursor = this.cursorVisible ? "_" : " ";
                this.inputText.setText(this.userInput + cursor);
            } catch (e) {
                // Final fallback - do nothing if even the simple update fails
            }
        }
        
        // Performance logging - only log slow updates
        const duration = performance.now() - startTime;
        if (duration > 16) { // Only log if slower than 60fps frame
            console.log(`Slow cursor update: ${duration.toFixed(2)}ms`);
        }
    }

    createSettingsButton(x, y, menuBarHeight) {
        // Create settings button using the PNG
        const settingsIcon = this.add.image(x, y, 'settings').setOrigin(0.5);

        // Set icon size relative to menu bar height (e.g., 60%)
        const iconSize = Math.round(menuBarHeight * 0.6);
        settingsIcon.setDisplaySize(iconSize, iconSize);

        // Make the settings icon white
        settingsIcon.setTint(0xffffff);
        
        // Make it interactive
        settingsIcon.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                settingsIcon.setScale(0.3);
                this.showTooltip('Settings: \nLevel\nMax AI Words \nMode', settingsIcon.x, settingsIcon.y + 50);
            })
            .on('pointerout', () => {
                settingsIcon.setScale(0.25);
                this.hideTooltips();
            })
            .on('pointerdown', () => {
                settingsIcon.setScale(0.22);
            })
            .on('pointerup', () => {
                settingsIcon.setScale(0.3);
                this.toggleSettingsPopup();
            });
        
        // Store reference to the button
        this.settingsButton = settingsIcon;
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
        
        // Calculate position using the new layout calculation
        const statsBoxWidth = 180;
        const statsBoxHeight = 130;
        const statsDisplayY = this.menuBarHeight + 20;
        const statsBottomEdge = statsDisplayY + statsBoxHeight;
        
        // Prompt box is 20px below stats box
        const promptY = statsBottomEdge + 20;
        const promptBoxHeight = 80;
        const promptBottomEdge = promptY + promptBoxHeight;
        
        // Input box is 20px below prompt box
        const inputBoxY = promptBottomEdge + 20;
        const inputBoxHeight = 240;
        const inputBoxBottomEdge = inputBoxY + inputBoxHeight;
        

        const buttonPadding = 70; // Standard padding used for buttons
        
        // Set X position with the same padding as buttons have from right side
        const scoreX = this.cameras.main.centerX - this.uiBoxWidth / 2 + buttonPadding;
        const scoreY = inputBoxBottomEdge + DESIGN.UI.BUTTON.BELOW_TEXTBOX_GAP;
    
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
        
        // Add tooltip for the score bar (progress bar)
        this.failsCounter.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, scoreWidth, scoreHeight),
            Phaser.Geom.Rectangle.Contains
        )
        .on('pointerover', () => {
            this.showTooltip(
                "Progress Bar:\nWrite original words to fill the bar.\nUsing AI words reduces progress.",
                scoreX + scoreWidth / 2,
                scoreY - 10
            );
        })
        .on('pointerout', () => {
            this.hideTooltips();
        });
        
        this.failsText = this.add.text(
            scoreX + scoreWidth / 2,
            scoreY + scoreHeight / 2,
            ' ',
            {
                fontFamily: 'IBM Plex Mono',
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
            fontFamily: 'IBM Plex Mono',
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
            { button: this.doneButton, tooltip: 'Show it to the boss' },
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
        // Use progress increment directly from DESIGN constant
        this.progressIncrement = DESIGN.UI.PROGRESS_BAR.INCREMENT;
        
        if (success) {
            // Non-AI word - Create success effects!
            newPercentage = this.progressPercentage + this.progressIncrement;
            
            // Get the last word from user input
            const words = this.userInput.trim().split(/\s+/);
            const lastWord = words[words.length - 1].replace(/[.,!?;:]$/, ''); // Remove punctuation
            
            if (lastWord && lastWord.length > 0) {
                // Create a rising word effect
                this.createRisingWordEffect(lastWord);
                
                // Create a particle burst at cursor position
                this.createWordSuccessParticles();
                
                // // Add a small camera flash if streak is building
                // if (this.wordStreak >= 2) {
                //     // Intensity increases with streak
                //     const flashIntensity = Math.min(0.1 + (this.wordStreak * 0.02), 0.3);
                //     const flash = this.add.rectangle(
                //         0, 0, 
                //         this.cameras.main.width, 
                //         this.cameras.main.height,
                //         0x00ff00, // Green
                //         flashIntensity
                //     ).setOrigin(0).setDepth(90);
                    
                //     this.tweens.add({
                //         targets: flash,
                //         alpha: 0,
                //         duration: 300,
                //         ease: 'Cubic.Out',
                //         onComplete: () => flash.destroy()
                //     });
                // }
            }
        } else {
            // AI word - negative effects     
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
                
                // Add a red flash for AI word
                const flash = this.add.rectangle(
                    0, 0, 
                    this.cameras.main.width, 
                    this.cameras.main.height,
                    0xff0000, // Red
                    0.15
                ).setOrigin(0).setDepth(90);
                
                this.tweens.add({
                    targets: flash,
                    alpha: 0,
                    duration: 200,
                    ease: 'Cubic.Out',
                    onComplete: () => flash.destroy()
                });
            }
            
            // Update AI word count only
            this.aiWordCount++;
        }
        
        // Update the word count display
        this.updateWordCountDisplay();
        
        // Update the streak counter - success means original word
        this.updateStreakCounter(success);
        
        newPercentage = Phaser.Math.Clamp(newPercentage, 0, 100);

        this.progressPercentage = newPercentage;

        // Trigger progress bar effects
        if (typeof this.animateProgressBarChange === "function") {
            this.animateProgressBarChange(success ? "increment" : "decrement");
        }
        
        if (this.failsText) {
            this.failsText.setText(` `);
        }
        
        this.updateProgressFill();
        
        // Emit particles from progress bar when value changes
        this.emitProgressBarParticles(success ? "increment" : "decrement");
    }
    
    /**
     * Create a floating effect for a successfully typed word
     * @param {string} word - The word to animate
     */
    createRisingWordEffect(word) {
        // Determine input position for the effect origin
        const inputBoxY = this.cameras.main.centerY - 240 / 2;
        const inputBoxHeight = 240;
        const inputBoxCenterY = inputBoxY + inputBoxHeight / 2;
        
        // Create word text at cursor position
        const wordText = this.add.text(
            this.cameras.main.centerX,
            inputBoxCenterY,
            word,
            {
                fontFamily: 'IBM Plex Mono',
                fontSize: '24px',
                fontStyle: 'bold',
                fill: '#00ff00', // Green for success
                stroke: '#000000',
                strokeThickness: 3,
                shadow: {
                    offsetX: 1,
                    offsetY: 1,
                    color: '#000',
                    blur: 1,
                    stroke: true
                }
            }
        ).setOrigin(0.5).setDepth(100).setAlpha(0);
        
        // Generate a random rise direction slightly to the left or right
        const randomX = this.cameras.main.centerX + Phaser.Math.Between(-100, 100);
        
        // Rising animation sequence
        this.tweens.add({
            targets: wordText,
            y: inputBoxCenterY - 100, // Rise up
            x: randomX, // Drift horizontally
            alpha: { from: 0, to: 1, duration: 200, ease: 'Cubic.Out' },
            scale: { from: 0.8, to: 1.2 },
            angle: { from: Phaser.Math.Between(-10, 10), to: 0 },
            duration: 800,
            ease: 'Back.Out',
            onComplete: () => {
                // Fade out
                this.tweens.add({
                    targets: wordText,
                    alpha: 0,
                    y: '-=50',
                    scale: 1.5,
                    duration: 400,
                    ease: 'Cubic.In',
                    onComplete: () => wordText.destroy()
                });
            }
        });
    }
    
    /**
     * Create particle burst for successful word entry
     */
    createWordSuccessParticles() {
        // Determine input position for the effect origin
        const inputBoxY = this.cameras.main.centerY - 240 / 2;
        const inputBoxHeight = 240;
        const inputBoxCenterY = inputBoxY + inputBoxHeight / 2;
        
        // Calculate a dynamic color based on streak
        let colors;
        if (this.wordStreak >= 10) {
            // Gold particles for high streaks
            colors = [0xffd700, 0xffcc00, 0xffaa00, 0xff8800];
        } else if (this.wordStreak >= 5) {
            // Orange particles for medium streaks
            colors = [0xff8c00, 0xff7700, 0xff6600, 0xff5500];
        } else if (this.wordStreak >= 3) {
            // Green particles for small streaks
            colors = [0x00ff00, 0x33ff33, 0x66ff66, 0x99ff99];
        } else {
            // Blue particles for no streak
            colors = [0x4169e1, 0x5a7de1, 0x6a95e1, 0x7aaae1];
        }
        
        // Create particles
        for (let i = 0; i < 15 + Math.min(this.wordStreak * 2, 30); i++) {
            const size = Phaser.Math.Between(3, 6);
            const color = colors[Phaser.Math.Between(0, colors.length - 1)];
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = Phaser.Math.FloatBetween(100, 200);
            
            const particle = this.add.circle(
                this.cameras.main.centerX,
                inputBoxCenterY,
                size,
                color,
                0.8
            ).setDepth(95);
            
            // Calculate velocity
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            // Animate the particle
            this.tweens.add({
                targets: particle,
                x: particle.x + vx,
                y: particle.y + vy,
                alpha: 0,
                scale: { from: 1, to: 0 },
                duration: Phaser.Math.Between(600, 1000),
                ease: 'Cubic.Out',
                onComplete: () => particle.destroy()
            });
        }
        
        // Add some star particles for higher streaks
        if (this.wordStreak >= 3) {
            for (let i = 0; i < Math.min(this.wordStreak, 10); i++) {
                const starSize = Phaser.Math.Between(10, 20);
                const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                const distance = Phaser.Math.Between(30, 100);
                
                // Create star shape
                const star = this.add.graphics({
                    x: this.cameras.main.centerX,
                    y: inputBoxCenterY
                }).setDepth(96);
                
                // Draw star shape
                const color = colors[Phaser.Math.Between(0, colors.length - 1)];
                star.fillStyle(color, 0.8);
                
                const points = 5;
                const innerRadius = starSize * 0.4;
                const outerRadius = starSize;
                
                // Draw star
                star.beginPath();
                for (let i = 0; i < points * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (i * Math.PI) / points;
                    const x = radius * Math.cos(angle);
                    const y = radius * Math.sin(angle);
                    
                    if (i === 0) {
                        star.moveTo(x, y);
                    } else {
                        star.lineTo(x, y);
                    }
                }
                star.closePath();
                star.fill();
                
                // Animate the star
                this.tweens.add({
                    targets: star,
                    x: star.x + Math.cos(angle) * distance,
                    y: star.y + Math.sin(angle) * distance,
                    alpha: 0,
                    scale: { from: 0.5, to: 1.5 },
                    angle: Phaser.Math.Between(180, 360),
                    duration: Phaser.Math.Between(800, 1200),
                    ease: 'Cubic.Out',
                    onComplete: () => star.destroy()
                });
            }
        }
    }

    // Visual effects for progress bar: scale pop, color flash, shake
    animateProgressBarChange(type) {
        if (!this.failsCounter) return;
        const bar = this.failsCounter;
        const scene = this;

        // Store original position for shake reset
        if (bar.originalX === undefined) {
            bar.originalX = bar.x;
        }

        // Shake
        scene.tweens.add({
            targets: bar,
            x: bar.originalX + (type === "increment" ? 2 : -2),
            yoyo: true,
            repeat: 3,
            duration: 40,
            onComplete: () => {
                bar.x = bar.originalX;
            }
        });
 
    }

    // Get appropriate color based on streak count
    getStreakColor(streak) {
        if (streak >= 10) return 0xffd700; // Gold
        if (streak >= 7) return 0xff4500;  // Orange-red
        if (streak >= 5) return 0xff8c00;  // Dark orange
        if (streak >= 3) return 0x32cd32;  // Lime green
        return 0x4169e1;                   // Royal blue
    }
    
    // Get appropriate color based on streak count
    getStreakColor(streak) {
        if (streak >= 10) return 0xffd700; // Gold
        if (streak >= 7) return 0xff4500;  // Orange-red
        if (streak >= 5) return 0xff8c00;  // Dark orange
        if (streak >= 3) return 0x32cd32;  // Lime green
        return 0x4169e1;                   // Royal blue
    }
    
    // Update the streak counter with animations
    updateStreakCounter(isOriginalWord) {
        // Track if this is a new streak
        const previousStreak = this.wordStreak;
        
        if (isOriginalWord) {
            // Increment streak for original words
            this.wordStreak++;
            this.lastWordWasOriginal = true;
            
            // Update max streak if needed
            if (this.wordStreak > this.maxWordStreak) {
                this.maxWordStreak = this.wordStreak;
            }
        } else {
            // Reset streak for AI words
            this.wordStreak = 0;
            this.lastWordWasOriginal = false;
            
            // Cleanup any existing streak-specific visual elements
            this.cleanupStreakVisuals();
        }
        
        // Update the word count display which contains the streak counters
        this.updateWordCountDisplay();
        
        // Update background based on the new streak value
        this.updateBackgroundForStreak();
        
        // If streak has increased, add celebration effects at milestones
        if (isOriginalWord && this.wordStreak > previousStreak) {
            // Add streak milestone effects
            this.celebrateStreakMilestone(this.wordStreak, previousStreak);
        }
    }
    
    // Helper method to clean up any streak-specific visuals
    cleanupStreakVisuals() {
        // Clean up any existing streak-specific background elements
        if (this.background) {
            // Clean up the border if it exists
            if (this.background.streakBorder) {
                this.background.streakBorder.destroy();
                this.background.streakBorder = null;
            }
            
            // Clean up particles if they exist
            if (this.background.particles) {
                this.background.particles.forEach(particle => {
                    if (particle && particle.active) {
                        particle.destroy();
                    }
                });
                this.background.particles = null;
            }
            
            // Clean up glow overlay if it exists
            if (this.background.glowOverlay) {
                this.background.glowOverlay.destroy();
                this.background.glowOverlay = null;
            }
            
            // Clean up vignette if it exists
            if (this.background.vignette) {
                this.background.vignette.destroy();
                this.background.vignette = null;
            }
            
            // Clean up flares if they exist
            if (this.background.flares) {
                this.background.flares.forEach(flare => {
                    if (flare && flare.active) {
                        flare.destroy();
                    }
                });
                this.background.flares = null;
            }
        }
    }
    
    // Update background based on the current streak
    updateBackgroundForStreak() {
        // Simply call the scene's updateBackgroundForLevel method
        // which will handle the background creation with the current streak value
        this.updateBackgroundForLevel();
    }
    
    // Celebrate streak milestones with special effects
    celebrateStreakMilestone(currentStreak, previousStreak) {
        // Define milestone thresholds
        const milestones = [3, 5, 7, 10, 15, 20];
        
        // Check if we crossed any milestone
        for (const milestone of milestones) {
            if (previousStreak < milestone && currentStreak >= milestone) {
                // We crossed a milestone, add celebration effects
                const text = milestone === 3 ? "STREAK!" : 
                            milestone === 5 ? "NICE STREAK!" : 
                            milestone === 7 ? "GREAT STREAK!" :
                            milestone === 10 ? "AMAZING STREAK!" :
                            milestone === 15 ? "INCREDIBLE STREAK!" :
                            "UNSTOPPABLE!";
                
                // Position celebration text at the top-right near the word stats panel
                const padding = 20;
                const displayX = this.cameras.main.width - 180 - padding; // Same as word stats x position
                
                // Celebration text that appears near the word stats
                const celebrationText = this.add.text(
                    displayX + 90, // Center of the word stats panel
                    this.menuBarHeight + 150, // Below the word stats panel
                    text,
                    {
                        fontFamily: 'IBM Plex Mono',
                        fontSize: '28px',
                        fontStyle: 'bold',
                        fill: '#ffffff',
                        stroke: '#000000',
                        strokeThickness: 4,
                        shadow: {
                            offsetX: 2,
                            offsetY: 2,
                            color: '#000000',
                            blur: 5,
                            stroke: true,
                            fill: true
                        }
                    }
                ).setOrigin(0.5, 0.5).setDepth(100);
                
                // Animate the celebration text
                this.tweens.add({
                    targets: celebrationText,
                    y: celebrationText.y - 50, // Move up from its starting position
                    alpha: { start: 0, from: 1, to: 0 },
                    scale: { from: 0.8, to: 1.2 },
                    duration: 1500,
                    ease: 'Power2',
                    onComplete: () => celebrationText.destroy()
                });
                
                // Highlight the word stats panel for a moment
                if (this.wordCountDisplay) {
                    this.tweens.add({
                        targets: this.wordCountDisplay,
                        scale: { from: 1, to: 1.05, duration: 200 },
                        yoyo: true,
                        repeat: 2,
                        ease: 'Sine.InOut'
                    });
                }
                
                // Screen flash for big milestones
                if (milestone >= 10) {
                    const flashColor = milestone >= 15 ? 0xffd700 : 0xff8c00;
                    const flash = this.add.rectangle(
                        0, 0,
                        this.cameras.main.width,
                        this.cameras.main.height,
                        flashColor,
                        0.3
                    ).setOrigin(0).setDepth(99);
                    
                    this.tweens.add({
                        targets: flash,
                        alpha: 0,
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => flash.destroy()
                    });
                }
                
                // Only celebrate the highest milestone crossed
                break;
            }
        }
    }
    
    // Particle burst for progress bar
    emitProgressBarParticles(type) {
        if (!this.failsCounter) return;
        const bar = this.failsCounter;
        const scene = this;

        // Get bar position (center of progress bar)
        const scoreWidth = scene.DESIGN?.UI?.BUTTON?.WIDTH * 2 + scene.DESIGN?.UI?.BUTTON?.SPACING || 180;
        const scoreHeight = scene.DESIGN?.UI?.BUTTON?.HEIGHT || 40;
        const barX = bar.x + scoreWidth / 2;
        const barY = bar.y + scoreHeight / 2;

        // Particle color
        const color = type === "increment" ? 0xffff00 : 0xff0000;

        // Only use graphics-based burst (draw circles and animate them)
        for (let i = 0; i < 16; i++) {
            const angle = Phaser.Math.DegToRad(Phaser.Math.Between(0, 360));
            const distance = Phaser.Math.Between(30, 80);
            const size = Phaser.Math.Between(6, 14);
            const startX = barX;
            const startY = barY;
            const endX = startX + Math.cos(angle) * distance;
            const endY = startY + Math.sin(angle) * distance;
            const circle = scene.add.circle(startX, startY, size, color, 0.8).setDepth(199);
            scene.tweens.add({
                targets: circle,
                x: endX,
                y: endY,
                alpha: 0,
                scale: { from: 1, to: 0 },
                duration: 500,
                ease: 'Quad.Out',
                onComplete: () => circle.destroy()
            });
        }
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
            'Great Work!',
            {
                fontFamily: 'IBM Plex Mono',
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
            'Terrible!',
            {
                fontFamily: 'IBM Plex Mono',
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
        
        // Calculate segment width based on the increment percentage
        const incrementPercentage = DESIGN.UI.PROGRESS_BAR.INCREMENT;
        const totalSegments = Math.ceil(100 / incrementPercentage);
        
        // Draw segments as individual rectangles
        const segmentGap = 2; // Gap between segments
        
        // Calculate the exact width of each segment
        const totalGapWidth = segmentGap * (totalSegments - 1);
        const segmentWidth = (scoreWidth - totalGapWidth) / totalSegments;
        
        // Calculate how many segments to fill based on current progress
        const segmentsToFill = Math.ceil(fillPercentage / incrementPercentage);
        
        // Draw each segment individually
        for (let i = 0; i < segmentsToFill; i++) {
            // Calculate color for this segment
            const segmentPercentage = (i + 1) * incrementPercentage;
            let color;
            
            if (segmentPercentage <= 50) {
                // Interpolate between red and yellow (red at 0%, yellow at 50%)
                const t = segmentPercentage / 50;
                const r = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.DANGER >> 16) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 16) & 0xFF)));
                const g = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.DANGER >> 8) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 8) & 0xFF)));
                const b = Math.round(((1 - t) * (DESIGN.UI.PROGRESS_BAR.COLORS.DANGER & 0xFF)) + (t * (DESIGN.UI.PROGRESS_BAR.COLORS.WARNING & 0xFF)));
                color = (r << 16) | (g << 8) | b;
            } else {
                // Interpolate between yellow and green (yellow at 50%, green at 100%)
                const t = (segmentPercentage - 50) / 50;
                const r = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 16) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS >> 16) & 0xFF)));
                const g = Math.round(((1 - t) * ((DESIGN.UI.PROGRESS_BAR.COLORS.WARNING >> 8) & 0xFF)) + (t * ((DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS >> 8) & 0xFF)));
                const b = Math.round(((1 - t) * (DESIGN.UI.PROGRESS_BAR.COLORS.WARNING & 0xFF)) + (t * (DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS & 0xFF)));
                color = (r << 16) | (g << 8) | b;
            }
            
            this.failsCounter.fillStyle(color, 1);
            
            // Calculate the position for this segment
            const segmentX = i * (segmentWidth + segmentGap);
            
            // Make sure we're using the correct color
            this.failsCounter.fillStyle(color, 1);
            
            // Draw the segment
            if (i === 0 && segmentsToFill === 1) {
                // Only one segment - round both sides (and narrower on both sides)
                this.failsCounter.fillRoundedRect(
                    segmentX, 
                    0, 
                    segmentWidth, 
                    scoreHeight, 
                    DESIGN.UI.BUTTON.CORNER_RADIUS
                );
            } else if (i === 0) {
                // First segment - round left side only
                this.failsCounter.fillRoundedRect(
                    segmentX, 
                    0, 
                    segmentWidth, 
                    scoreHeight, 
                    {
                        tl: DESIGN.UI.BUTTON.CORNER_RADIUS,
                        bl: DESIGN.UI.BUTTON.CORNER_RADIUS,
                        tr: 0,
                        br: 0
                    }
                );
            } else if (i === segmentsToFill - 1) {
                // Last segment - round the right corners if this is at 100%
                if (fillPercentage >= 99) {
                    // Ensure we're using the correct green color for the rightmost segment at 100%
                    // Force green color for the final segment when at 100%
                    if (fillPercentage >= 99) {
                        this.failsCounter.fillStyle(DESIGN.UI.PROGRESS_BAR.COLORS.SUCCESS, 1);
                    }
                    
                    this.failsCounter.fillRoundedRect(
                        segmentX, 
                        0, 
                        segmentWidth, 
                        scoreHeight, 
                        {
                            tl: 0,
                            bl: 0,
                            tr: DESIGN.UI.BUTTON.CORNER_RADIUS,
                            br: DESIGN.UI.BUTTON.CORNER_RADIUS
                        }
                    );
                } else {
                    // Otherwise keep square corners
                    this.failsCounter.fillRect(
                        segmentX, 
                        0, 
                        segmentWidth, 
                        scoreHeight
                    );
                }
            } else {
                // Middle segment - no rounding
                this.failsCounter.fillRect(
                    segmentX, 
                    0, 
                    segmentWidth, 
                    scoreHeight
                );
            }
        }

        // White outline for the entire bar - always has rounded corners
        this.failsCounter.lineStyle(DESIGN.UI.BUTTON.OUTLINE_WIDTH, 0xffffff, 1);
        this.failsCounter.strokeRoundedRect(0, 0, scoreWidth, scoreHeight, DESIGN.UI.BUTTON.CORNER_RADIUS);

        // if (this.progressPercentage == 100) {
        //     //this.celebrateSuccess();
        // } else if (this.progressPercentage == 0) {
        //     //this.celebrateNeedsWork();
        // }
    }

    showSuggestions(words) {
        // Performance optimization - measure time for suggestion rendering
        const startTime = performance.now();
        
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
        
        // Calculate position between prompt box and input box
        const statsBoxWidth = 180;
        const statsBoxHeight = 130;
        const statsDisplayY = this.menuBarHeight + padding;
        const statsBottomEdge = statsDisplayY + statsBoxHeight;
        
        // Prompt box is 20px below stats box
        const promptY = statsBottomEdge + 20;
        const promptBoxHeight = 80;
        const promptBottomEdge = promptY + promptBoxHeight;
        
        // Position suggestions 20px ABOVE the prompt box
        const suggestionsY = promptY - 20 - boxHeight;
        
        // Create a single temporary text object to measure widths instead of creating many
        const tempText = this.add.text(0, 0, '', {
            fontFamily: 'IBM Plex Mono',
            fontSize: '16px'
        });
        
        // Pre-calculate all word widths in one batch
        const wordWidths = words.map(word => {
            tempText.setText(word);
            return tempText.width + padding * 2;
        });
        
        // Calculate total width in one pass
        const totalWidth = wordWidths.reduce((acc, width, i) => 
            acc + width + (i < words.length - 1 ? boxSpacing : 0), 0);
        
        // Calculate the starting X position
        const startX = this.cameras.main.centerX - totalWidth / 2;
        
        // Calculate all box positions
        let currentX = startX;
        
        // Create all suggestion boxes in a single pass
        words.forEach((word, index) => {
            const boxWidth = wordWidths[index];
            
            // Create box
            const box = this.add.graphics();
            box.fillStyle(0xff0000, 0.3);
            box.fillRoundedRect(currentX, suggestionsY, boxWidth, boxHeight, 10);
            box.lineStyle(2, 0xff0000, 0.8);
            box.strokeRoundedRect(currentX, suggestionsY, boxWidth, boxHeight, 10);
            
            // Create text
            const text = this.add.text(
                currentX + padding, 
                suggestionsY + boxHeight / 2, 
                word,
                {
                    fontFamily: 'IBM Plex Mono',
                    fontSize: '16px',
                    color: '#ffffff'
                }
            ).setOrigin(0, 0.5);
            
            // Set depths
            box.setDepth(15);
            text.setDepth(16);
            
            // Store for later cleanup
            this.suggestionBoxes.push(box);
            this.suggestionTexts.push(text);
            
            // Update X position for next box
            currentX += boxWidth + boxSpacing;
        });
        
        // Clean up the temporary text object
        tempText.destroy();
        
        // Performance logging for slow updates
        const duration = performance.now() - startTime;
        if (duration > 16) { // Only log if slower than one frame at 60fps
            console.log(`Slow suggestion rendering: ${duration.toFixed(2)}ms`);
        }
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
            
            // Reset game state to match our simplified approach
            this.aiWordCount = 0;
             // Note: originalWordCount and totalWordCount are now calculated dynamically
            
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