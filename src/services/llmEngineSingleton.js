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
      runtime: "webgpu"
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
