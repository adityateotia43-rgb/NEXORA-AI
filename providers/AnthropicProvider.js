/**
 * AnthropicProvider — Anthropic Claude API Provider
 * 
 * Supports streaming responses from Claude 3.5 Sonnet, Claude 3.5 Haiku, etc.
 * using Anthropic's Messages SSE streaming protocol.
 */

const BaseProvider = require('./BaseProvider');

class AnthropicProvider extends BaseProvider {
  constructor() {
    super({
      id: 'anthropic',
      name: 'Anthropic Claude',
      defaultModel: 'claude-3-5-sonnet-20241022',
      availableModels: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (State of the Art)' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Lightning Fast)' }
      ]
    });
  }

  isConfigured(config) {
    return Boolean(config && config.anthropicApiKey && config.anthropicApiKey.trim().length > 0);
  }

  async streamChat({ userMessage, topic, tier, language, model, config, res, abortSignal, domain = 'study' }) {
    const activeModel = model || config.anthropicModel || this.defaultModel;
    const apiKey = config.anthropicApiKey;
    const systemPrompt = this.buildSystemPrompt({ topic, tier, language, domain });
    const timeoutMs = config.providerTimeoutMs || 18000;
    const { signal, cleanup } = this.createFetchSignal(timeoutMs, abortSignal);

    let apiRes;
    try {
      apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        signal,
        body: JSON.stringify({
          model: activeModel,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          stream: true
        })
      });
    } catch (fetchErr) {
      cleanup();
      if (fetchErr.name === 'AbortError' || fetchErr.name === 'TimeoutError' || signal.aborted) {
        throw new Error(`Anthropic Claude API timed out after ${timeoutMs}ms`);
      }
      throw fetchErr;
    }

    if (!apiRes.ok || !apiRes.body) {
      cleanup();
      throw new Error(`Anthropic API returned status ${apiRes.status} (${apiRes.statusText})`);
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

        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            const textChunk = parsed.delta.text;
            accumulatedText += textChunk;
            res.write(`data: ${JSON.stringify({ chunk: textChunk, done: false })}\n\n`);
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
      source: 'anthropic-live-stream',
      provider: this.id,
      model: activeModel,
      domain
    })}\n\n`);
    res.end();

    return { fullText: accumulatedText, modelUsed: activeModel };
  }
}

module.exports = AnthropicProvider;
