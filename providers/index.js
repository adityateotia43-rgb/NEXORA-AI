/**
 * ProviderManager — AI Provider Abstraction & Orchestration Engine
 * 
 * Central registry managing LLM providers (Gemini, OpenAI, Anthropic, Groq, Ollama, Simulation),
 * dynamic routing, model selection, graceful fallback cascade, and unified SSE streaming.
 */

const BaseProvider = require('./BaseProvider');
const SimulationProvider = require('./SimulationProvider');
const GeminiProvider = require('./GeminiProvider');
const OpenAIProvider = require('./OpenAIProvider');
const AnthropicProvider = require('./AnthropicProvider');
const GroqProvider = require('./GroqProvider');
const OllamaProvider = require('./OllamaProvider');

class ProviderManager {
  constructor() {
    this.providers = new Map();
    this.simulationProvider = new SimulationProvider();

    // Register built-in providers
    this.registerProvider(this.simulationProvider);
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new AnthropicProvider());
    this.registerProvider(new GroqProvider());
    this.registerProvider(new OllamaProvider());
  }

  /**
   * Register a new provider
   * @param {BaseProvider} provider
   */
  registerProvider(provider) {
    if (!provider || !(provider instanceof BaseProvider)) {
      throw new Error('Provider must be an instance of BaseProvider');
    }
    this.providers.set(provider.id, provider);
  }

  /**
   * Retrieve provider by ID
   * @param {string} id
   * @returns {BaseProvider|undefined}
   */
  getProvider(id) {
    return this.providers.get(id);
  }

  /**
   * Get list of all registered providers
   * @returns {BaseProvider[]}
   */
  getAllProviders() {
    return Array.from(this.providers.values());
  }

  /**
   * Get list of providers that have valid credentials configured
   * @param {Object} config
   * @returns {BaseProvider[]}
   */
  getConfiguredProviders(config) {
    return this.getAllProviders().filter(p => p.isConfigured(config));
  }

  /**
   * Resolve which provider to execute for a query
   * Priority:
   * 1. Per-request override (if valid and configured, or simulation)
   * 2. Configured AI_PROVIDER environment variable
   * 3. Automatic detection (Gemini -> OpenAI -> Anthropic -> Groq -> Ollama -> Simulation)
   * 
   * @param {Object} options
   * @param {string} [options.requestedProvider]
   * @param {Object} options.config
   * @returns {BaseProvider}
   */
  resolveProvider({ requestedProvider, config }) {
    // 1. Explicit request from frontend
    if (requestedProvider) {
      const p = this.getProvider(requestedProvider);
      if (p && (p.isConfigured(config) || p.id === 'simulation')) {
        return p;
      }
    }

    // 2. Configured AI_PROVIDER environment variable
    const envProviderId = (config.aiProvider || 'auto').toLowerCase();
    if (envProviderId !== 'auto') {
      const p = this.getProvider(envProviderId);
      if (p && p.isConfigured(config)) {
        return p;
      }
    }

    // 3. Automatic priority fallback
    const priorityList = ['gemini', 'openai', 'anthropic', 'groq', 'ollama'];
    for (const id of priorityList) {
      const p = this.getProvider(id);
      if (p && p.isConfigured(config)) {
        return p;
      }
    }

    // Default to Simulation Engine
    return this.simulationProvider;
  }

  /**
   * Stream a chat request with unified SSE and auto-fallback
   * 
   * @param {Object} params
   * @param {string} params.userMessage
   * @param {string} params.topic
   * @param {string} params.tier
   * @param {string} params.language
   * @param {string} [params.requestedProvider]
   * @param {string} [params.requestedModel]
   * @param {Object} params.config
   * @param {import('http').ServerResponse} params.res
   * @param {AbortSignal} [params.abortSignal]
   * @param {'study'|'music'|'movies'|string} [params.domain]
   */
  async streamChat({ userMessage, topic, tier, language, requestedProvider, requestedModel, config, res, abortSignal, domain = 'study' }) {
    const provider = this.resolveProvider({ requestedProvider, config });
    const model = requestedModel || (provider.id === requestedProvider ? requestedModel : undefined);

    // Create client disconnect controller
    const clientController = new AbortController();
    const onClientClose = () => {
      clientController.abort(new Error('Client closed connection'));
    };
    res.on('close', onClientClose);

    const effectiveAbortSignal = abortSignal || clientController.signal;

    try {
      return await provider.streamChat({
        userMessage,
        topic,
        tier,
        language,
        model,
        config,
        res,
        abortSignal: effectiveAbortSignal,
        domain
      });
    } catch (err) {
      if (effectiveAbortSignal.aborted && res.writableEnded) {
        // Client intentionally disconnected; no need to fallback
        return null;
      }

      console.error(`[ProviderManager] Error streaming via ${provider.name} (${provider.id}):`, err.message);

      // If the failing provider wasn't simulation, fall back gracefully to simulation
      if (provider.id !== 'simulation') {
        const isTimeout = err.message && (err.message.includes('timed out') || err.message.includes('timeout'));
        console.warn(`[ProviderManager] Gracefully falling back to Cognitive Simulation Engine (${isTimeout ? 'Timeout' : 'Error'}): "${userMessage.slice(0, 40)}..."`);
        
        // Notify client of graceful fallback via SSE chunk if stream is still open
        try {
          if (!res.writableEnded) {
            const fallbackReason = isTimeout ? 'response timed out' : 'encountered an upstream service issue';
            res.write(`data: ${JSON.stringify({ 
              chunk: `\n\n*(Notice: ${provider.name} ${fallbackReason}. Nexora Cognitive Simulation Engine has seamlessly engaged.)*\n\n`,
              done: false 
            })}\n\n`);
          }
        } catch (e) {}

        return await this.simulationProvider.streamChat({
          userMessage,
          topic,
          tier,
          language,
          model: this.simulationProvider.defaultModel,
          config,
          res,
          abortSignal: effectiveAbortSignal,
          domain
        });
      } else {
        throw err;
      }
    } finally {
      res.removeListener('close', onClientClose);
    }
  }

  /**
   * Return metadata for client UI consumption
   * @param {Object} config
   * @returns {Object}
   */
  getPublicProvidersInfo(config) {
    const activeProvider = this.resolveProvider({ config });
    const providers = this.getAllProviders().map(p => ({
      id: p.id,
      name: p.name,
      defaultModel: p.defaultModel,
      isConfigured: p.isConfigured(config),
      models: p.availableModels
    }));

    return {
      activeProvider: {
        id: activeProvider.id,
        name: activeProvider.name,
        defaultModel: activeProvider.defaultModel
      },
      providers
    };
  }
}

// Singleton instance
const providerManager = new ProviderManager();

module.exports = {
  providerManager,
  ProviderManager,
  BaseProvider: require('./BaseProvider'),
  SimulationProvider,
  GeminiProvider,
  OpenAIProvider,
  AnthropicProvider,
  GroqProvider,
  OllamaProvider
};
