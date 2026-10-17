/**
 * GeminiProvider — Google Gemini Generative AI Provider
 * 
 * Supports streaming responses via Google Gemini REST SSE endpoint
 * with support for gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash.
 */

const BaseProvider = require('./BaseProvider');

class GeminiProvider extends BaseProvider {
  constructor() {
    super({
      id: 'gemini',
      name: 'Google Gemini',
      defaultModel: 'gemini-1.5-flash',
      availableModels: [
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast & Efficient)' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Deep Reasoning)' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Next-Gen)' }
      ]
    });
  }

  isConfigured(config) {
    return Boolean(config && config.geminiApiKey && config.geminiApiKey.trim().length > 0);
  }

  async streamChat({ userMessage, topic, tier, language, model, config, res, abortSignal, domain = 'study' }) {
    const activeModel = model || config.geminiModel || this.defaultModel;
    const apiKey = config.geminiApiKey;
    const systemPrompt = this.buildSystemPrompt({ topic, tier, language, domain });
    const timeoutMs = config.providerTimeoutMs || 18000;
    const { signal, cleanup } = this.createFetchSignal(timeoutMs, abortSignal);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:streamGenerateContent?key=${apiKey}&alt=sse`;

    let apiRes;
    try {
      apiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nStudent Query: ${userMessage}` }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024
          }
        })
      });
    } catch (fetchErr) {
      cleanup();
      if (fetchErr.name === 'AbortError' || fetchErr.name === 'TimeoutError' || signal.aborted) {
        throw new Error(`Google Gemini API timed out after ${timeoutMs}ms`);
      }
      throw fetchErr;
    }

    if (!apiRes.ok || !apiRes.body) {
      cleanup();
      throw new Error(`Gemini API returned status ${apiRes.status} (${apiRes.statusText})`);
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
          const candidate = parsed.candidates?.[0];
          const textPart = candidate?.content?.parts?.[0]?.text;
          if (textPart) {
            accumulatedText += textPart;
            res.write(`data: ${JSON.stringify({ chunk: textPart, done: false })}\n\n`);
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
      source: 'gemini-live-stream',
      provider: this.id,
      model: activeModel,
      domain
    })}\n\n`);
    res.end();

    return { fullText: accumulatedText, modelUsed: activeModel };
  }
}

module.exports = GeminiProvider;
