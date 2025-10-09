// src/services/RegistryManager.js

/**
 * Global Registry Manager - Singleton to manage shared game resources
 * Provides centralized access to resources like the llmEngine with robust recovery mechanisms
 */
class RegistryManager {
    constructor() {
        this.resources = new Map();
        
        // Flag to track if the manager has been initialized
        this._initialized = false;
    }

    /**
     * Initialize with any game-wide registry references
     * @param {Phaser.Registry} registry - The game's registry object
     */
    init(registry) {
        if (this._initialized) return;
        
        // Store registry reference for any scene-based operations
        this._registry = registry;
        
        // Try to load engine from window/registry 
        if (window.llmEngine) {
            this.set('llmEngine', window.llmEngine);
            console.log("Registry Manager: Loaded llmEngine from window");
        } else if (registry && registry.get('llmEngine')) {
            this.set('llmEngine', registry.get('llmEngine'));
            console.log("Registry Manager: Loaded llmEngine from registry");
        }
        
        this._initialized = true;
        console.log("Registry Manager initialized");
    }

    /**
     * Get a resource with fallback/recovery options
     * @param {string} key - The resource key
     * @param {*} fallbackValue - Optional fallback value if resource is not found
     * @returns {*} The requested resource or fallback value
     */
    get(key, fallbackValue = null) {
        // First check our internal map
        if (this.resources.has(key)) {
            return this.resources.get(key);
        }

        // Try to recover engine if that's what's being requested
        if (key === 'llmEngine') {
            return this.recoverEngine() || fallbackValue;
        }

        return fallbackValue;
    }

    /**
     * Create or get the LLM engine (async).
     * If already loaded, returns it. Otherwise, loads and stores it.
     * @returns {Promise<Object>} The LLM engine instance
     */
    async createOrGetEngine() {
        if (this.resources.has('llmEngine')) {
            return this.resources.get('llmEngine');
        }
        if (this._enginePromise) {
            return this._enginePromise;
        }
        this._enginePromise = (async () => {
            const WebLLM = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm');
            const { CreateMLCEngine } = WebLLM;
            const model_id = "Qwen2.5-0.5B-Instruct-q0f32-MLC";
            const appConfig = {
                model_list: [
                    {
                        model: "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q0f32-MLC",
                        model_id: model_id,
                        model_lib: WebLLM.modelLibURLPrefix +
                            WebLLM.modelVersion +
                            "/Qwen2-0.5B-Instruct-q0f32-ctx4k_cs1k-webgpu.wasm",
                        overrides: {
                            context_window_size: 4096,
                        },
                    },
                ],
                runtime: "webgpu",
                useIndexedDBCache: false
            };
            const llmEngine = await CreateMLCEngine(model_id, {
                appConfig: appConfig,
                logLevel: "INFO",
            });
            this.set('llmEngine', llmEngine);
            return llmEngine;
        })();
        return this._enginePromise;
    }

    /**
     * Set a resource value
     * @param {string} key - The resource key
     * @param {*} value - The resource value
     * @returns {*} The value that was set
     */
    set(key, value) {
        this.resources.set(key, value);

        // Also set in Phaser registry if possible
        if (this._registry && key === 'llmEngine') {
            this._registry.set(key, value);
        }

        return value;
    }

    /**
     * Special method for engine recovery
     * @returns {Object|null} The recovered engine or null
     */
    recoverEngine() {
        // Try Phaser registry
        if (this._registry && this._registry.get('llmEngine')) {
            console.log("Registry Manager: Recovered llmEngine from registry");
            this.set('llmEngine', this._registry.get('llmEngine'));
            return this._registry.get('llmEngine');
        }

        console.warn("Registry Manager: Engine recovery failed - no backup found");
        return null;
    }

    /**
     * Attempt to reinitialize the engine specifically
     * @param {Function} callback - Optional callback when recovery succeeds
     */
    attemptEngineRecovery(callback) {
        console.log("Registry Manager: Attempting engine recovery...");
        
        // Try immediate recovery
        const engine = this.recoverEngine();
        if (engine && typeof engine === 'function') {
            console.log("Registry Manager: Immediate recovery successful");
            if (callback && typeof callback === 'function') {
                try {
                    callback(engine);
                } catch (error) {
                    console.error("Registry Manager: Error in recovery callback:", error);
                }
            }
            return engine;
        }
        
        // Set up retries with better timing
        const maxRetries = 5; // Increased from 3
        let currentRetry = 0;
        
        const attemptRecovery = () => {
            currentRetry++;
            console.log(`Registry Manager: Recovery attempt ${currentRetry}/${maxRetries}`);
            
            const recoveredEngine = this.recoverEngine();
            
            if (recoveredEngine && typeof recoveredEngine === 'function') {
                console.log("Registry Manager: Engine recovery successful on attempt", currentRetry);
                if (callback && typeof callback === 'function') {
                    try {
                        // Use setTimeout to ensure callback executes in next tick
                        setTimeout(() => {
                            callback(recoveredEngine);
                        }, 10);
                    } catch (error) {
                        console.error("Registry Manager: Error in recovery callback:", error);
                    }
                }
                return recoveredEngine;
            }
            
            if (currentRetry >= maxRetries) {
                console.error("Registry Manager: Engine recovery failed after", maxRetries, "attempts");
                return null;
            }
            
            // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
            const delay = Math.min(100 * Math.pow(2, currentRetry - 1), 1600);
            console.log(`Registry Manager: Retrying in ${delay}ms...`);
            setTimeout(attemptRecovery, delay);
            return null;
        };
        
        // Start the retry process
        setTimeout(attemptRecovery, 100);
        return null;
    }

    /**
     * Clear a specific resource or all resources
     * @param {string|null} key - The resource key to clear, or null to clear all
     */
    clear(key = null) {
        if (key) {
            this.resources.delete(key);
        } else {
            this.resources.clear();
        }
    }
}

// Create and export the singleton instance
const registryManager = new RegistryManager();
export default registryManager;
