/**
 * Global singleton for transformers.js engine (using Qwen1.5-0.5B).
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
    let pipeline;
    // Try dynamic import first
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.0/dist/transformers.min.js');
      pipeline = mod.pipeline || (window.transformers && window.transformers.pipeline);
    } catch (e) {
      // Fallback to script tag
      const transformers = await loadTransformersScript();
      pipeline = transformers.pipeline;
    }
    if (!pipeline) {
      throw new Error('Failed to load transformers.js pipeline');
    }
    // Load the Qwen model for text generation
    const generator = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B');
    window.llmEngine = generator;
    return generator;
  })();
  return enginePromise;
}
