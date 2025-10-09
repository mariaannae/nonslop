/**
 * Global singleton for transformers.js engine (using GPT-2).
 * Ensures only one context is ever created, even across scene reloads.
 * Usage: import getLLMEngine from './llmEngineSingleton.js'; then await getLLMEngine();
 */

let enginePromise = null;

function loadTransformersScript() {
  return new Promise((resolve, reject) => {
    if (window.transformers) {
      resolve(window.transformers);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.0/dist/transformers.min.js';
    script.async = true;
    script.onload = () => {
      if (window.transformers) {
        resolve(window.transformers);
      } else {
        reject(new Error('transformers.js did not attach to window'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load transformers.js'));
    document.head.appendChild(script);
  });
}

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
      runtime: "webgpu",
      useIndexedDBCache: false
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
