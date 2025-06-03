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
    if (!navigator.gpu) {
      // Try WebGL fallback if available
      if (WebLLM.supportedRuntimes && WebLLM.supportedRuntimes.includes("webgl")) {
        runtime = "webgl";
      } else {
        throw new Error("This device/browser does not support WebGPU or WebGL. Please use a modern browser that supports WebGPU or WebGL.");
      }
    }

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
