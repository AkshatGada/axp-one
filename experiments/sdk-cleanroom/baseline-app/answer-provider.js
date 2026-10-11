/**
 * Server-owned answer-provider interface. Providers implement:
 * answer({ messages }): Promise<string>
 * messages is validated, ordered history ending with a user message.
 * Each message has { role: 'user' | 'assistant', content: string }.
 * Providers return a non-empty plain-text answer or throw on failure.
 * This module is never served to the browser.
 */
export class FixtureAnswerProvider {
  async answer({ messages }) {
    const turns = messages.filter((message) => message.role === 'user');
    const current = turns.at(-1).content;
    const previous = turns.length > 1
      ? ` Your previous message was: “${turns.at(-2).content}”.`
      : '';

    return `Fixture reply — turn ${turns.length}\n\nYou said: “${current}”.${previous}\n\nThis is a deterministic test response, not an AI-generated answer.`;
  }
}
