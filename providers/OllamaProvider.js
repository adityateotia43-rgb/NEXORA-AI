/**
 * OllamaProvider — Local Self-Hosted LLM Provider (Ollama)
 * 
 * Enables completely private, zero-subscription local AI inference
 * using models such as Llama 3.2, Mistral, DeepSeek-R1, and Phi-3.
 */

const BaseProvider = require('./BaseProvider');

class OllamaProvider extends BaseProvider {
  constructor() {
    super({
      id: 'ollama',
      name: 'Ollama (Local LLM)',
      defaultModel: 'llama3.2',
      availableModels: [
        { id: 'llama3.2', name: 'Llama 3.2 (Local)' },
        { id: 'deepseek-r1', name: 'DeepSeek-R1 (Local Reasoning)' },
        { id: 'mistral', name: 'Mistral 7B (Local)' },
        { id: 'phi3', name: 'Phi-3 Mini (Local)' }
      ]
    });
  }

  isConfigured(config) {
    // Enabled if explicit OLLAMA_BASE_URL or AI_PROVIDER === 'ollama'
    return Boolean(config && (config.ollamaBaseUrl || process.env.ENABLE_OLLAMA === 'true'));
  }

  async streamChat({ userMessage, topic, tier, language, model, config, res, abortSignal, domain = 'study' }) {
    const activeModel = model || config.ollamaModel || this.defaultModel;
    const baseUrl = (config.ollamaBaseUrl || 'http://localhost:11434').replace(/\/+$/, '');
    const systemPrompt = this.buildSystemPrompt({ topic, tier, language, domain });
    const timeoutMs = config.providerTimeoutMs || 18000;
    const { signal, cleanup } = this.createFetchSignal(timeoutMs, abortSignal);

    let apiRes;
    try {
      apiRes = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          model: activeModel,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        })
      });
    } catch (fetchErr) {
      cleanup();
      if (fetchErr.name === 'AbortError' || fetchErr.name === 'TimeoutError' || signal.aborted) {
        throw new Error(`Ollama Local API timed out after ${timeoutMs}ms. Verify Ollama is running at ${baseUrl}.`);
      }
      throw fetchErr;
    }

    if (!apiRes.ok || !apiRes.body) {
      cleanup();
      throw new Error(`Ollama returned status ${apiRes.status} (${apiRes.statusText})`);
    }

    const reader = apiRes.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          const chunk = parsed.message?.content;
          if (chunk) {
            accumulatedText += chunk;
            res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
          }
        } catch (e) {
          // ignore malformed NDJSON lines
        }
      }
    }

    const widgets = this.synthesizeEducationalWidgets(userMessage, topic, tier, domain);

    res.write(`data: ${JSON.stringify({
      done: true,
      fullText: accumulatedText,
      title: domain === 'music' ? 'Music Flow Synthesis' : (domain === 'movies' ? 'Cinema Pulse Synthesis' : `Step 1: ${topic} Concept Breakdown`),
      equation: widgets.equation,
      flashcard: widgets.flashcard,
      source: 'ollama-local-stream',
      provider: this.id,
      model: activeModel,
      domain
    })}\n\n`);
    res.end();

    return { fullText: accumulatedText, modelUsed: activeModel };
  }
}

module.exports = OllamaProvider;
