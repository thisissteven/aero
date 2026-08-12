// server/adapters/claude/client.ts
import Anthropic from '@anthropic-ai/sdk';

let clientInstance: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!clientInstance) {
    clientInstance = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 60 * 1000,
      maxRetries: 3,
    });
  }
  return clientInstance;
}
