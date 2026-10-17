/**
 * GroqProvider — Ultra-Fast Inference via Groq LPU Engine
 * 
 * Supports streaming from Llama 3.3, Llama 3.1, Mixtral with near-instant token generation.
 */

const BaseProvider = require('./BaseProvider');

class GroqProvider extends BaseProvider {
  constructor() {
    super({
      id: 'groq',
      name: 'Groq Cloud LPU',
      defaultModel: 'llama-3.3-70b-versatile',
      availableModels: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Ultra Fast & Capable)' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Blazing Fast)' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Large Context)' }
      ]
    });
  }

  isConfigured(config) {
    return Boolean(config && config.groqApiKey && config.groqApiKey.trim().length > 0);
  }

  async streamChat({ userMessage, topic, tier, language, model, config, res, abortSignal, domain = 'study' }) {
    const activeModel = model || config.groqModel || this.defaultModel;
    const apiKey = config.groqApiKey;
    const systemPrompt = this.buildSystemPrompt({ topic, tier, language, domain });
    const timeoutMs = config.providerTimeoutMs || 18000;
    const { signal, cleanup } = this.createFetchSignal(timeoutMs, abortSignal);

    let apiRes;
    try {
      apiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        signal,
        body: JSON.stringify({
          model: activeModel,
          stream: true,
          temperature: 0.7,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        })
      });
    } catch (fetchErr) {
      cleanup();
      if (fetchErr.name === 'AbortError' || fetchErr.name === 'TimeoutError' || signal.aborted) {
        throw new Error(`Groq LPU API timed out after ${timeoutMs}ms`);
      }
      throw fetchErr;
    }

    if (!apiRes.ok || !apiRes.body) {
      cleanup();
      throw new Error(`Groq API returned status ${apiRes.status} (${apiRes.statusText})`);
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
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            accumulatedText += delta;
            res.write(`data: ${JSON.stringify({ chunk: delta, done: false })}\n\n`);
          }
        } catch (e) {
          // ignore transient chunks
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
      source: 'groq-live-stream',
      provider: this.id,
      model: activeModel,
      domain
    })}\n\n`);
    res.end();

    return { fullText: accumulatedText, modelUsed: activeModel };
  }
}

module.exports = GroqProvider;
