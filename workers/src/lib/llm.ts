import { ChatBedrockConverse } from '@langchain/aws';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';

// Model configuration
const DEFAULT_MODEL = 'us.anthropic.claude-opus-4-6-v1';
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_MAX_TOKENS = 4096;

export interface LLMConfig {
  model?: string;
  region?: string;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMClient {
  private model: ChatBedrockConverse;

  constructor(config: LLMConfig = {}) {
    this.model = new ChatBedrockConverse({
      model: config.model || DEFAULT_MODEL,
      region: config.region || DEFAULT_REGION,
      maxTokens: config.maxTokens || DEFAULT_MAX_TOKENS,
    });
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    console.log('[LLM] Invoking model with', messages.length, 'messages');

    // Convert messages to LangChain format
    const langchainMessages = messages.map((msg) => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        default:
          return new HumanMessage(msg.content);
      }
    });

    // Invoke model
    const response = await this.model.invoke(langchainMessages);

    // Extract text content
    const content = typeof response.content === 'string'
      ? response.content
      : Array.isArray(response.content)
        ? (response.content[0] as any)?.text || ''
        : '';

    console.log('[LLM] Response received, length:', content.length);

    return content;
  }

  async singlePrompt(systemPrompt: string, userPrompt: string): Promise<string> {
    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
  }

  // Easy model switching - can be called to change models at runtime
  switchModel(model: string) {
    console.log(`[LLM] Switching model from ${this.model} to ${model}`);
    this.model = new ChatBedrockConverse({
      model,
      region: DEFAULT_REGION,
      maxTokens: DEFAULT_MAX_TOKENS,
    });
  }
}

// Export a default client instance
export const defaultLLMClient = new LLMClient();
