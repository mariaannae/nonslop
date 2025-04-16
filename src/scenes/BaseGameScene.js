import { stopwords } from "../config/stopwords.js";
import { saveInteraction } from "../config/firebase.js";
import ButtonFactory from "../utils/ButtonFactory.js";
import { buttonWidth, buttonSpacing, buttonHeight, BUTTON_CORNER_RADIUS, BUTTON_OUTLINE_WIDTH, PROGRESS_BAR } from "../config/design_easy.js";

export default class BaseGameScene extends Phaser.Scene {
    constructor(config) {
        super(config);
        this.llmEngine = null;
        this.userInput = '';
        this.inputText = null; 
        this.levelValue = 1;
        this.baseFontSize = 22;
        this.failCount = 0;
        this.autocompleteText = null;
        // Initial progress percentage (50%)
        // Higher percentage is worse (more AI words)
        // Lower percentage is better (more original words)
        this.progressPercentage = PROGRESS_BAR.INITIAL;
        this.wordCount = 0; // Track successful words entered
        this.uiBoxWidth = null; // Will be set in createInputTextBox
    }

    update() {
        if (!this.llmEngine) {
            console.warn("LLM Engine lost from scene. Attempting recovery from registry...");
            this.llmEngine = this.registry.get('llmEngine');
    
            if (!this.llmEngine) {
                console.warn("LLM Engine missing entirely. Returning to Preloader...");
                this.scene.start('PreloaderScene');
            } else {
                console.log("Successfully recovered LLM Engine from registry.");
            }
        }
    }

    shutdown() {
        if (this.scrollWheelEvent) {
            this.input.off('wheel', this.scrollWheelEvent);
        }
        super.shutdown();
    }

    // Common UI methods
    createButton(label, callback, centerX, centerY) {
        if (!this.inputTextBorder) {
            console.warn("Input text border not found! Skipping button creation.");
            return;
        }
        return ButtonFactory.createButton(this, label, callback, centerX, centerY);
    }

    clearInputTextBox() {
        this.userInput = '';
        if (this.inputText) {
            this.inputText.setText('_');
        }
        if (this.autocompleteText) {
            this.autocompleteText.setText('');
        }
    }

    onDoneButtonClick() {
        console.log("Done button clicked! Evaluating text...");
        
        if (!this.outputTextBox) {
            this.createOutputTextBox();
        }
    
        this.outputText.setText("Evaluating...");
        this.evaluateText(this.userInput);
    }

    onResetButtonClick() {
        console.log("Reset button clicked! Clearing text...");
        this.failCount = 0;
        this.progressPercentage = PROGRESS_BAR.INITIAL;
        this.updateProgressFill();
        
        this.clearInputTextBox();
        this.updateOutputText("Press 'DONE' to see how you did.");
        this.updatePromptBasedOnLevel();
        
        if (this.failsText) {
            this.failsText.setText(`${Math.round(this.progressPercentage)}%`);
        }
    }

    // Common evaluation methods
    async evaluateText(userInput) {
        console.log("Evaluating user input:", userInput);
        this.updateOutputText("Evaluating...");
    
        const promptForEvaluation = this.currentPrompt || "No specific prompt was provided.";
    
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
        let aiResponse = responseData.content.trim();
        
        this.updateOutputText(aiResponse);
        const boxStyle = this.getPromptBoxStyle();
        this.outputTextBox.setAlpha(boxStyle.fillAlpha);
        this.outputText.setAlpha(1);
        
        const interaction = {
            prompt: this.currentPrompt,
            submittedText: userInput,
            aiEvaluation: aiResponse,
            k: this.topKValue,
            level: this.levelValue,
            failCount: this.failCount,
            mode: this.mode,
            score: this.progressPercentage
        };

        saveInteraction(interaction, "userSubmissions");
    }

    async generateAISuggestions(userInput) {
        // Clear suggestions for empty input or just spaces
        if (!userInput || !userInput.trim()) {
            this.aiSuggestedWords = [];
            this.showSuggestions([]);
            if (this.autocompleteText) {
                this.autocompleteText.setText('');
            }
            return;
        }

        // Get the last word being typed
        const words = userInput.trim().split(" ");
        const currentWord = words[words.length - 1];
        if (!currentWord) {
            this.aiSuggestedWords = [];
            this.showSuggestions([]);
            if (this.autocompleteText) {
                this.autocompleteText.setText('');
            }
            return;
        }

        if (!this.llmEngine) {
            console.warn("LLM Engine lost from scene. Attempting recovery from registry...");
            this.llmEngine = this.registry.get('llmEngine');
    
            if (!this.llmEngine) {
                console.warn("LLM Engine missing entirely. Returning to Preloader...");
                this.scene.start('PreloaderScene');
                return;
            }
        }
    
        console.log("Generating AI suggestions for:", userInput);

        const reply = await this.llmEngine.completions.create({
            prompt: userInput,
            echo: false,
            n: 1,
            max_tokens: 1,
            logprobs: true,
            top_logprobs: 5,
        });

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

        console.log("topk: ", this.topKValue);
        const uniqueSuggestedWords = Array.from(new Set(filteredOptions))
            .slice(0, this.topKValue);

        console.log("Setting AI Suggested Words:", uniqueSuggestedWords);
        this.aiSuggestedWords = uniqueSuggestedWords;
        this.showSuggestions(uniqueSuggestedWords);

        // Log current state
        console.log("Current input:", this.userInput);
        console.log("Current suggestions:", this.aiSuggestedWords);
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
        
        if (this.inputTextBorder) {
            this.inputTextBorder.destroy();
        }
        
        const boxStyle = this.getInputBoxStyle();
        this.inputTextBorder = this.add.graphics();
        this.inputTextBorder.fillStyle(boxStyle.fillColor, boxStyle.fillAlpha);
        this.inputTextBorder.fillRoundedRect(
            this.cameras.main.centerX - this.uiBoxWidth / 2,
            textBoxY,
            this.uiBoxWidth,
            textBoxHeight,
            boxStyle.cornerRadius
        );
        
        if (boxStyle.hasOutline) {
            this.inputTextBorder.lineStyle(boxStyle.outlineWidth, boxStyle.outlineColor, 1);
            this.inputTextBorder.strokeRoundedRect(
                this.cameras.main.centerX - this.uiBoxWidth / 2,
                textBoxY,
                this.uiBoxWidth,
                textBoxHeight,
                boxStyle.cornerRadius
            );
        }
        
        if (this.inputText) {
            this.inputText.destroy();
        }
        if (this.autocompleteText) {
            this.autocompleteText.destroy();
        }
        
        const textStyle = {
            ...this.getInputTextStyle(),
            wordWrap: { width: this.uiBoxWidth - padding * 2 }
        };
        const autocompleteStyle = {
            ...this.getAutocompleteTextStyle(),
            wordWrap: { width: this.uiBoxWidth - padding * 2 }
        };
        
        this.inputText = this.add.text(
            this.cameras.main.centerX - this.uiBoxWidth / 2 + padding,
            textBoxY + padding,
            "_",
            textStyle
        ).setOrigin(0, 0);
        
        this.autocompleteText = this.add.text(
            this.cameras.main.centerX - this.uiBoxWidth / 2 + padding,
            textBoxY + padding,
            "",
            { ...autocompleteStyle, fill: '#ff0000' }
        ).setOrigin(0, 0);
        
        this.inputText.setDepth(25);
        this.autocompleteText.setDepth(26);
        
        this.setupInputHandlers();
    }

    setupInputHandlers() {
        this.input.keyboard.removeAllListeners('keydown');
        this.input.keyboard.on("keydown", (event) => {
            this.inputActive = true;

            if(this.activeTimeout) {
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
            
            if (ignoreKeys.includes(event.key)) {
                return;
            }

            if (event.key === " ") {
                const words = this.userInput.trim().split(" ");
                const lastWord = words[words.length - 1];
                
                if (lastWord && lastWord.length > 0) {
                    console.log("Word check:", {
                        lastWord,
                        suggestions: this.aiSuggestedWords,
                        suggestionType: typeof this.aiSuggestedWords,
                        suggestionArray: Array.isArray(this.aiSuggestedWords),
                        suggestionLength: this.aiSuggestedWords ? this.aiSuggestedWords.length : 0
                    });

                    // Convert to lowercase for case-insensitive comparison
                    const lastWordLower = lastWord.toLowerCase();
                    const isAIWord = this.aiSuggestedWords && 
                        this.aiSuggestedWords.some(word => word.toLowerCase() === lastWordLower);
                    
                    console.log("AI word check:", {
                        isAIWord,
                        lastWordLower,
                        suggestions: this.aiSuggestedWords ? 
                            this.aiSuggestedWords.map(w => w.toLowerCase()) : []
                    });
                    
                    if (isAIWord) {
                        // AI suggested word - decrease score (worse)
                        console.log("AI word used:", lastWord, "- decreasing score (worse)");
                        this.updateFailsCounter(false);
                    } else {
                        // Non-AI word - increase score (better)
                        console.log("Non-AI word used:", lastWord, "- increasing score (better)");
                        this.wordCount++;
                        this.updateFailsCounter(true);
                    }
                    this.userInput += " ";
                } else {
                    this.userInput += " ";
                }
                
                this.updateCursor();
                // Only show suggestions for the current word being typed
                const currentWords = this.userInput.trim().split(" ");
                const currentTypingWord = currentWords[currentWords.length - 1];
                if (currentTypingWord && currentTypingWord.length > 0) {
         
         
                    this.generateAISuggestions(currentTypingWord);
                } else {
                    this.aiSuggestedWords = [];
                    this.showSuggestions([]);
                    if (this.autocompleteText) {
                        this.autocompleteText.setText('');
                    }
                }
            } else if (event.key === "Tab") {
                event.preventDefault();
                const autocomplete = this.generateAutocomplete();
                if (autocomplete) {
                    // Replace current word with full suggestion
                    const words = this.userInput.trim().split(" ");
                    const currentWord = words[words.length - 1] || "";
                    // Convert to lowercase for case-insensitive comparison
                    const currentWordLower = currentWord.toLowerCase();
                    const fullWord = this.aiSuggestedWords.find(word => 
                        word.toLowerCase().startsWith(currentWordLower)
                    );
                    if (fullWord) {
                        // Remove current word and add the full word with space
                        this.userInput = this.userInput.slice(0, -currentWord.length) + fullWord + ' ';
                        // Since this is an AI word, decrease score (making it worse)
                        console.log("AI word used (Tab):", fullWord, "- decreasing score (worse)");
                        this.updateFailsCounter(false);
                        this.updateCursor();
                        // Only show suggestions for the current word being typed
                        const words = this.userInput.trim().split(" ");
                        const currentWord = words[words.length - 1];
                        if (currentWord && currentWord.length > 0) {
                            this.generateAISuggestions(currentWord);
                        } else {
                            this.aiSuggestedWords = [];
                            this.showSuggestions([]);
                            if (this.autocompleteText) {
                                this.autocompleteText.setText('');
                            }
                        }
                    }
                }
            } else if (event.key.length === 1) {
                this.userInput += event.key;
            } else if (event.key === "Backspace") {
                this.userInput = this.userInput.slice(0, -1);
                this.aiSuggestedWords = [];
                this.showSuggestions([]);
                if (this.autocompleteText) {
                    this.autocompleteText.setText('');
                }
            } else if (event.key === "Enter") {
                const words = this.userInput.trim().split(" ");
                const lastWord = words[words.length - 1];
                
                if (lastWord && lastWord.length > 0) {
                    console.log("Word check:", {
                        lastWord,
                        suggestions: this.aiSuggestedWords,
                        suggestionType: typeof this.aiSuggestedWords,
                        suggestionArray: Array.isArray(this.aiSuggestedWords),
                        suggestionLength: this.aiSuggestedWords ? this.aiSuggestedWords.length : 0
                    });

                    // Convert to lowercase for case-insensitive comparison
                    const lastWordLower = lastWord.toLowerCase();
                    const isAIWord = this.aiSuggestedWords && 
                        this.aiSuggestedWords.some(word => word.toLowerCase() === lastWordLower);
                    
                    console.log("AI word check:", {
                        isAIWord,
                        lastWordLower,
                        suggestions: this.aiSuggestedWords ? 
                            this.aiSuggestedWords.map(w => w.toLowerCase()) : []
                    });
                    
                    if (isAIWord) {
                        // AI suggested word - decrease score (worse)
                        console.log("AI word used:", lastWord, "- decreasing score (worse)");
                        this.updateFailsCounter(false);
                    } else {
                        // Non-AI word - increase score (better)
                        console.log("Non-AI word used:", lastWord, "- increasing score (better)");
                        this.wordCount++;
                        this.updateFailsCounter(true);
                    }
                    this.userInput += "\n";
                } else {
                    this.userInput += "\n";
                }
                
                this.updateCursor();
                // Only show suggestions for the current word being typed
                const currentWords = this.userInput.trim().split(" ");
                const currentTypingWord = currentWords[currentWords.length - 1];
                if (currentTypingWord && currentTypingWord.length > 0) {
                    this.generateAISuggestions(currentTypingWord);
                } else {
                    this.aiSuggestedWords = [];
                    this.showSuggestions([]);
                    if (this.autocompleteText) {
                        this.autocompleteText.setText('');
                    }
                }
            }
            
            this.updateCursor();
        });
        
        if (this.cursorTimer) {
            this.cursorTimer.remove();
        }
        this.cursorTimer = this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
                this.cursorVisible = !this.cursorVisible;
                
                if (this.inputActive) {
                    setTimeout(() => {
                        if (this.inputActive) {
                            this.cursorVisible = !this.cursorVisible;
                            this.updateCursor();
                        }
                    }, 250);
                }
                
                this.updateCursor();
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
        );

        this.inputTextBorder.on('pointerdown', (pointer) => {
            this.createInputBoxClickEffect(pointer.x, pointer.y);
        });
    }

    setupMenuBarControls(menuBarHeight, padding, rightMargin, gap, shiftLeft, { menuBar, menuBarBorder, titleText }) {
        this.levelValue = 1;
        const levelLabelX = this.cameras.main.centerX - 120;
        const levelLabel = this.add.text(
            levelLabelX, menuBarHeight / 2, 
            `Prompt Level: ${this.levelValue}`, 
            { fontFamily: 'Nunito', fontSize: '22px', fill: '#ffffff' }
        ).setOrigin(0, 0.5);
    
        const levelSliderWidth = 120;
        const levelSliderX = levelLabelX + levelLabel.displayWidth + gap;
        const levelSliderY = menuBarHeight / 2;
    
        const levelSlider = this.add.graphics();
        levelSlider.fillStyle(0xffffff, 1);
        levelSlider.fillRect(levelSliderX, levelSliderY - 5, levelSliderWidth, 10);
    
        this.levelSliderHandle = this.add.rectangle(levelSliderX, levelSliderY, 10, 20, 0xffaa00).setInteractive();
        this.input.setDraggable(this.levelSliderHandle);
    
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
    
        const topKLabelX = this.cameras.main.width - padding - rightMargin - 180 - shiftLeft;
        const topKLabelY = menuBarHeight / 2;
        this.topKValue = 1;
    
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
    
        const sliderMinX = sliderX;
        const sliderMaxX = sliderMinX + sliderWidth - 5;
    
        this.input.on('drag', (pointer, gameObject, dragX) => {
            if (gameObject === this.sliderHandle) {
                gameObject.x = Phaser.Math.Clamp(dragX, sliderMinX, sliderMaxX);
                const newTopK = Math.round(Phaser.Math.Linear(1, 5, (gameObject.x - sliderMinX) / (sliderMaxX - sliderMinX)));
    
                if (newTopK !== this.topKValue) {
                    this.topKValue = newTopK;
                    topKLabel.setText(`Top K: ${this.topKValue}`);
                }
            }
        });
    
        this.tweens.add({
            targets: [menuBar, menuBarBorder, titleText, levelLabel, levelSlider, this.levelSliderHandle, topKLabel, slider, this.sliderHandle],
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
        throw new Error('updatePromptBasedOnLevel must be implemented by child class');
    }

    // Common utility methods
    ensureProperLayering() {
        if (this.promptTextBox) this.promptTextBox.setDepth(5);
        if (this.promptText) this.promptText.setDepth(6);
        if (this.outputTextBox) this.outputTextBox.setDepth(5);
        if (this.outputText) this.outputText.setDepth(6);
        if (this.failsCounter) this.failsCounter.setDepth(7);
        if (this.inputTextBorder) this.inputTextBorder.setDepth(8);
        if (this.inputText) this.inputText.setDepth(9);
        if (this.doneButton) this.doneButton.setDepth(10);
        if (this.resetButton) this.resetButton.setDepth(10);
        if (this.feedbackButton) this.feedbackButton.setDepth(10);
    }

    ensureTextVisibility() {
        if (this.inputText) {
            this.inputText.setVisible(true);
            this.inputText.setDepth(25);
        }
        if (this.autocompleteText) {
            this.autocompleteText.setVisible(true);
            this.autocompleteText.setDepth(26);
        }
    }

    generateAutocomplete() {
        if (!this.aiSuggestedWords || this.aiSuggestedWords.length === 0) {
            if (this.autocompleteText) {
                this.autocompleteText.setText('');
            }
            return null;
        }

        // Get the first suggestion if no input
        if (!this.userInput.trim() && this.aiSuggestedWords.length > 0) {
            const suggestion = this.aiSuggestedWords[0];
            if (this.autocompleteText) {
                const metrics = this.inputText.getTextMetrics();
                const cursorX = this.inputText.x + metrics.width;
                const cursorY = this.inputText.y;
                this.autocompleteText.setPosition(cursorX - 1, cursorY);
                this.autocompleteText.setText(suggestion);
                this.autocompleteText.setVisible(true);
            }
            return suggestion;
        }

        // Find matching suggestion for current word
        const words = this.userInput.trim().split(" ");
        const currentWord = words[words.length - 1] || "";
        
        for (const suggestion of this.aiSuggestedWords) {
            // Convert to lowercase for case-insensitive comparison
            const currentWordLower = currentWord.toLowerCase();
            if (suggestion.toLowerCase().startsWith(currentWordLower)) {
                const completion = suggestion.slice(currentWord.length);
                if (this.autocompleteText) {
                    const metrics = this.inputText.getTextMetrics();
                    const cursorX = this.inputText.x + metrics.width;
                    const cursorY = this.inputText.y;
                    this.autocompleteText.setPosition(cursorX - 1, cursorY);
                    this.autocompleteText.setText(completion);
                    this.autocompleteText.setVisible(true);
                }
                return completion;
            }
        }
        
        if (this.autocompleteText) {
            this.autocompleteText.setText('');
        }
        return null;
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
        const scoreWidth = buttonWidth * 2 + buttonSpacing;
        const scoreHeight = buttonHeight;
        
        // Position at bottom left of input box
        const inputBoxY = this.cameras.main.centerY - 240 / 2; // Input box Y position
        const inputBoxHeight = 240;
        const padding = 20;
        const scoreX = this.cameras.main.centerX - this.uiBoxWidth / 2;
        const scoreY = inputBoxY + inputBoxHeight + padding;

        // Background with rounded corners
        this.failsCounter.fillStyle(0x000000, 0.5);
        this.failsCounter.fillRoundedRect(0, 0, scoreWidth, scoreHeight, BUTTON_CORNER_RADIUS);
        
        // Progress fill with rounded corners
        // 0% = red (bad), 50% = yellow, 100% = green (good)
        let color;
        if (this.progressPercentage === 50) {
            color = PROGRESS_BAR.YELLOW;
        } else if (this.progressPercentage < 50) {
            // Interpolate between red and yellow
            const t = this.progressPercentage / 50;
            const r = Math.round(((1 - t) * ((PROGRESS_BAR.RED >> 16) & 0xFF)) + (t * ((PROGRESS_BAR.YELLOW >> 16) & 0xFF)));
            const g = Math.round(((1 - t) * ((PROGRESS_BAR.RED >> 8) & 0xFF)) + (t * ((PROGRESS_BAR.YELLOW >> 8) & 0xFF)));
            const b = Math.round(((1 - t) * (PROGRESS_BAR.RED & 0xFF)) + (t * (PROGRESS_BAR.YELLOW & 0xFF)));
            color = (r << 16) | (g << 8) | b;
        } else {
            // Interpolate between yellow and green
            const t = (this.progressPercentage - 50) / 50;
            const r = Math.round(((1 - t) * ((PROGRESS_BAR.YELLOW >> 16) & 0xFF)) + (t * ((PROGRESS_BAR.GREEN >> 16) & 0xFF)));
            const g = Math.round(((1 - t) * ((PROGRESS_BAR.YELLOW >> 8) & 0xFF)) + (t * ((PROGRESS_BAR.GREEN >> 8) & 0xFF)));
            const b = Math.round(((1 - t) * (PROGRESS_BAR.YELLOW & 0xFF)) + (t * (PROGRESS_BAR.GREEN & 0xFF)));
            color = (r << 16) | (g << 8) | b;
        }
        this.failsCounter.fillStyle(color, 1);
        this.failsCounter.fillRoundedRect(0, 0, (scoreWidth * this.progressPercentage) / 100, scoreHeight, BUTTON_CORNER_RADIUS);
        
        // White outline
        this.failsCounter.lineStyle(BUTTON_OUTLINE_WIDTH, 0xffffff, 1);
        this.failsCounter.strokeRoundedRect(0, 0, scoreWidth, scoreHeight, BUTTON_CORNER_RADIUS);
        
        this.failsCounter.setPosition(scoreX, scoreY);
        
        this.failsText = this.add.text(
            scoreX + scoreWidth / 2,
            scoreY + scoreHeight / 2,
            `${Math.round(this.progressPercentage)}%`,
            {
                fontFamily: 'Nunito',
                fontSize: '20px',
                fill: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);
    }

    addButtonClickEffects() {
        const buttons = [this.doneButton, this.resetButton, this.feedbackButton];
        if (this.hardButton) buttons.push(this.hardButton);
        if (this.easyButton) buttons.push(this.easyButton);
        
        buttons.forEach(button => {
            if (!button) return;
            
            button.on('pointerover', () => {
                button.setScale(1.1);
            });
            
            button.on('pointerout', () => {
                button.setScale(1);
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
        const circle = this.add.circle(x, y, 5, 0xffffff, 0.5);
        
        this.tweens.add({
            targets: circle,
            scale: { from: 0.5, to: 2 },
            alpha: { from: 0.5, to: 0 },
            duration: 500,
            ease: 'Quad.easeOut',
            onComplete: () => circle.destroy()
        });
    }

    createOutputTextBox() {
        const padding = 20;
        const textBoxWidth = this.cameras.main.width * (5 / 6);
        const textBoxHeight = 120;
        const textBoxY = this.cameras.main.height - textBoxHeight - padding - 80; // Move up to avoid button overlap
        
        if (this.outputTextBox) {
            this.outputTextBox.clear();
        } else {
            this.outputTextBox = this.add.graphics();
        }
        
        if (this.outputText) {
            this.outputText.destroy();
        }
        
        const boxStyle = this.getPromptBoxStyle();
        this.outputTextBox.fillStyle(boxStyle.fillColor, boxStyle.fillAlpha);
        this.outputTextBox.fillRoundedRect(
            this.cameras.main.centerX - textBoxWidth / 2,
            textBoxY,
            textBoxWidth,
            textBoxHeight,
            boxStyle.cornerRadius
        );

        if (boxStyle.hasOutline) {
            this.outputTextBox.lineStyle(boxStyle.outlineWidth, boxStyle.outlineColor, 1);
            this.outputTextBox.strokeRoundedRect(
                this.cameras.main.centerX - textBoxWidth / 2,
                textBoxY,
                textBoxWidth,
                textBoxHeight,
                boxStyle.cornerRadius
            );
        }
        
        const style = {
            ...this.getPromptTextStyle(),
            wordWrap: { width: textBoxWidth - padding * 2 }
        };
        
        this.outputText = this.add.text(
            this.cameras.main.centerX,
            textBoxY + textBoxHeight / 2,
            "Press 'DONE' to see how you did.",
            style
        ).setOrigin(0.5, 0.5);
        
        this.outputTextBox.setAlpha(boxStyle.fillAlpha);
        this.outputText.setAlpha(1);
    }

    updateFailsCounter(success) {
        // success = true means it was a non-AI word, so increment (better)
        // success = false means it was an AI word, so decrement (worse)
        console.log("updateFailsCounter called with success =", success);
        console.log("Current progressPercentage =", this.progressPercentage);
        console.log("PROGRESS_BAR.DECREMENT =", PROGRESS_BAR.DECREMENT);
        console.log("PROGRESS_BAR.INCREMENT =", PROGRESS_BAR.INCREMENT);
        
        let newPercentage;
        if (success) {
            // Non-AI word - increase score (making it better)
            newPercentage = Math.max(0, this.progressPercentage - PROGRESS_BAR.DECREMENT);
            console.log("Non-AI word used, increasing score by", PROGRESS_BAR.DECREMENT);
        } else {
            // AI word - decrease score (making it worse)
            newPercentage = Math.min(100, this.progressPercentage + PROGRESS_BAR.INCREMENT);
            console.log("AI word used, decreasing score by", PROGRESS_BAR.INCREMENT);
        }
        
        console.log(`Score update: ${this.progressPercentage} -> ${newPercentage}`);
        this.progressPercentage = newPercentage;
        
        if (this.failsText) {
            this.failsText.setText(`${Math.round(this.progressPercentage)}%`);
        }
        
        this.updateProgressFill();
    }

    updateOutputText(text) {
        if (!this.outputText) return;
        this.outputText.setText(text);
    }

    updateProgressFill() {
        if (!this.failsCounter) return;
        
        this.failsCounter.clear();

        const scoreWidth = buttonWidth * 2 + buttonSpacing;
        const scoreHeight = buttonHeight;
        
        // Background with rounded corners
        this.failsCounter.fillStyle(0x000000, 0.5);
        this.failsCounter.fillRoundedRect(0, 0, scoreWidth, scoreHeight, BUTTON_CORNER_RADIUS);
        
        // Progress fill with rounded corners
        // 0% = red (bad), 50% = yellow, 100% = green (good)
        let color;
        if (this.progressPercentage === 50) {
            color = PROGRESS_BAR.YELLOW;
        } else if (this.progressPercentage > 50) {
            // Interpolate between yellow and red
            const t = (this.progressPercentage - 50) / 50;
            const r = Math.round(((1 - t) * ((PROGRESS_BAR.YELLOW >> 16) & 0xFF)) + (t * ((PROGRESS_BAR.RED >> 16) & 0xFF)));
            const g = Math.round(((1 - t) * ((PROGRESS_BAR.YELLOW >> 8) & 0xFF)) + (t * ((PROGRESS_BAR.RED >> 8) & 0xFF)));
            const b = Math.round(((1 - t) * (PROGRESS_BAR.YELLOW & 0xFF)) + (t * (PROGRESS_BAR.RED & 0xFF)));
            color = (r << 16) | (g << 8) | b;
        } else {
            // Interpolate between green and yellow
            const t = this.progressPercentage / 50;
            const r = Math.round(((1 - t) * ((PROGRESS_BAR.GREEN >> 16) & 0xFF)) + (t * ((PROGRESS_BAR.YELLOW >> 16) & 0xFF)));
            const g = Math.round(((1 - t) * ((PROGRESS_BAR.GREEN >> 8) & 0xFF)) + (t * ((PROGRESS_BAR.YELLOW >> 8) & 0xFF)));
            const b = Math.round(((1 - t) * (PROGRESS_BAR.GREEN & 0xFF)) + (t * (PROGRESS_BAR.YELLOW & 0xFF)));
            color = (r << 16) | (g << 8) | b;
        }
        this.failsCounter.fillStyle(color, 1);
        this.failsCounter.fillRoundedRect(0, 0, (scoreWidth * this.progressPercentage) / 100, scoreHeight, BUTTON_CORNER_RADIUS);
        
        // White outline
        this.failsCounter.lineStyle(BUTTON_OUTLINE_WIDTH, 0xffffff, 1);
        this.failsCounter.strokeRoundedRect(0, 0, scoreWidth, scoreHeight, BUTTON_CORNER_RADIUS);
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

    updateCursor() {
        if (!this.inputText) return;
        
        // Keep input text position fixed
        const padding = 30;
        const textBoxY = this.cameras.main.centerY - 240 / 2;
        this.inputText.setPosition(
            this.cameras.main.centerX - this.uiBoxWidth / 2 + padding,
            textBoxY + padding
        );
        
        // Calculate text metrics before any changes
        const metrics = this.inputText.getTextMetrics();
        const cursorX = this.inputText.x + metrics.width;
        
        // Update text with cursor
        const displayText = this.userInput + (this.cursorVisible ? "_" : " ");
        this.inputText.setText(displayText);
        
        // Update autocomplete at exact cursor position
        if (this.aiSuggestedWords && this.aiSuggestedWords.length > 0) {
            this.autocompleteText.setPosition(cursorX - 1, this.inputText.y);
            this.generateAutocomplete();
        }
    }

    init(data) {
        if (!data.llmEngine) {
            console.error("Error: No llmEngine received in scene.");
        } else {
            console.log("llmEngine successfully received in scene.");
        }
        this.llmEngine = data.llmEngine || null;
        
        this.promptTextBox = null;
        this.promptText = null;
        this.outputTextBox = null;
        this.outputText = null;
    }
}
