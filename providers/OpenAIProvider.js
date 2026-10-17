/**
 * OpenAIProvider — OpenAI Chat Completions API Provider
 * 
 * Supports streaming responses from OpenAI models (gpt-4o, gpt-4o-mini, o3-mini)
 * using standard server-sent events.
 */

const BaseProvider = require('./BaseProvider');

class OpenAIProvider extends BaseProvider {
  constructor() {
    super({
      id: 'openai',
      name: 'OpenAI GPT',
      defaultModel: 'gpt-4o-mini',
      availableModels: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Affordable)' },
        { id: 'gpt-4o', name: 'GPT-4o (High Intelligence)' },
        { id: 'o3-mini', name: 'o3-mini (Advanced Reasoning)' }
      ]
    });
  }

  isConfigured(config) {
    return Boolean(config && config.openaiApiKey && config.openaiApiKey.trim().length > 0);
  }

  async streamChat({ userMessage, topic, tier, language, model, config, res, abortSignal, domain = 'study' }) {
    const activeModel = model || config.openaiModel || this.defaultModel;
    const apiKey = config.openaiApiKey;
    const systemPrompt = this.buildSystemPrompt({ topic, tier, language, domain });
    const baseUrl = (config.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const timeoutMs = config.providerTimeoutMs || 18000;
    const { signal, cleanup } = this.createFetchSignal(timeoutMs, abortSignal);

    let apiRes;
    try {
      apiRes = await fetch(`${baseUrl}/chat/completions`, {
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
        throw new Error(`OpenAI API timed out after ${timeoutMs}ms`);
      }
      throw fetchErr;
    }

    if (!apiRes.ok || !apiRes.body) {
      cleanup();
      throw new Error(`OpenAI API returned status ${apiRes.status} (${apiRes.statusText})`);
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
          // ignore transient malformed chunks
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
      source: 'openai-live-stream',
      provider: this.id,
      model: activeModel,
      domain
    })}\n\n`);
    res.end();

    return { fullText: accumulatedText, modelUsed: activeModel };
  }
}

module.exports = OpenAIProvider;
