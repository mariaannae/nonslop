/**
 * Global singleton for MLC/WebLLM engine.
 * Ensures only one WASM context is ever created, even across scene reloads.
 * Usage: import getLLMEngine from './llmEngineSingleton.js'; then await getLLMEngine();
 */

let enginePromise = null;

export default async function getLLMEngine() {
  if (window.llmEngine) {
    return window.llmEngine;
  }
  if (enginePromise) {
    return enginePromise;
  }
  enginePromise = (async () => {
    const WebLLM = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm');
    const { CreateMLCEngine } = WebLLM;
    const model_id = "Qwen2.5-0.5B-Instruct-q0f32-MLC";

    // Detect WebGPU support
    let runtime = "webgpu";
    let model_lib = WebLLM.modelLibURLPrefix +
      WebLLM.modelVersion +
      "/Qwen2-0.5B-Instruct-q0f32-ctx4k_cs1k-webgpu.wasm";

    if (!navigator.gpu) {
      // Try WebGL fallback if available
      if (WebLLM.supportedRuntimes && WebLLM.supportedRuntimes.includes("webgl")) {
        runtime = "webgl";
        // Try to use a WebGL-compatible model_lib if available
        // This is a guess; you must ensure the model actually exists at this path
        model_lib = WebLLM.modelLibURLPrefix +
          WebLLM.modelVersion +
          "/Qwen2-0.5B-Instruct-q0f32-ctx4k_cs1k-webgl.wasm";
        // Immediately throw a clear error for users if running on WebGL (iOS Safari, etc.)
        throw new Error("This model is not available for your device/browser. Please use a device with WebGPU support (e.g., recent Chrome/Edge on desktop). iOS Safari and most mobile browsers do not support WebGPU, and this model does not have a WebGL-compatible version.");
      } else {
        throw new Error("This device/browser does not support WebGPU or WebGL. Please use a modern browser that supports WebGPU or WebGL.");
      }
    }

    const appConfig = {
      model_list: [
        {
          model: "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q0f32-MLC",
          model_id: model_id,
          model_lib: model_lib,
          overrides: {
            context_window_size: 4096,
          },
        },
      ],
      runtime: runtime
    };
    const llmEngine = await CreateMLCEngine(model_id, {
      appConfig: appConfig,
      logLevel: "INFO",
    });
    window.llmEngine = llmEngine;
    return llmEngine;
  })();
  return enginePromise;
}
