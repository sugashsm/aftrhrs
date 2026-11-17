/**
 * AI provider abstraction.
 *
 * The frontend only ever talks to /api/ai/*. Which engine answers is decided here, on the server,
 * from environment variables:
 *
 *   AI_PROVIDER=        (empty → built-in rule-based engine, the default)
 *   AI_PROVIDER=openai  + AI_API_KEY + optional AI_MODEL
 *   AI_PROVIDER=gemini  + AI_API_KEY + optional AI_MODEL
 *
 * When an LLM is configured it is used to *voice* the reply; mood understanding, state and song
 * selection still come from the rule engine so recommendations always exist in the real catalogue.
 * Any provider error falls back to the rule-based reply. Keys never leave the server.
 */
import { respond, type EngineInput, type EngineReply } from './engine';

export interface AIProvider {
  id: string;
  label: string;
  external: boolean;
  reply(input: EngineInput, history: { role: string; content: string }[]): Promise<EngineReply & { engine: string }>;
}

const ruleBased: AIProvider = {
  id: 'rule-based',
  label: 'Built-in rule-based engine',
  external: false,
  async reply(input) {
    return { ...respond(input), engine: 'rule-based' };
  },
};

const SYSTEM = `You are the voice of AFTRHRS, a music companion. You sound like a close friend who loves music, cinema and people: warm, dry, a little poetic, never corporate, never a chatbot. No emojis, no exclamation marks, no lists.
You will receive the recent conversation and a DRAFT reply written by a rules engine. Rewrite the draft in your voice in at most 55 words.
Hard rules: keep the same intent. If the draft asks a question, ask the same question. Do not name any song or artist. Do not invent facts about the listener. Output only the reply text.`;

async function callModel(provider: string, key: string, model: string | undefined, prompt: string): Promise<string> {
  const signal = AbortSignal.timeout(12_000);
  if (provider === 'openai') {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: model || 'gpt-4o-mini', temperature: 0.8, max_tokens: 160, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }] }),
    });
    if (!r.ok) throw new Error(`openai ${r.status}`);
    const j: any = await r.json();
    return String(j.choices?.[0]?.message?.content || '').trim();
  }
  if (provider === 'gemini') {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-2.0-flash')}:generateContent`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 160 } }),
    });
    if (!r.ok) throw new Error(`gemini ${r.status}`);
    const j: any = await r.json();
    return String(j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '').trim();
  }
  throw new Error(`Unsupported AI_PROVIDER "${provider}"`);
}

function llmVoiced(provider: string, key: string, model?: string): AIProvider {
  return {
    id: provider,
    label: `${provider === 'openai' ? 'OpenAI' : 'Google Gemini'}${model ? ` (${model})` : ''} voicing the rule-based engine`,
    external: true,
    async reply(input, history) {
      const base = respond(input);
      try {
        const convo = history.slice(-8).map((m) => `${m.role === 'user' ? 'Listener' : 'AFTRHRS'}: ${m.content}`).join('\n');
        const text = await callModel(provider, key, model, `${convo}\nListener: ${input.text}\n\nDRAFT: ${base.text}\n${base.recommendations || base.playlist ? '(Song cards are shown separately below your reply.)' : ''}`);
        if (text && text.length < 600) return { ...base, text, engine: provider };
      } catch (e) {
        console.warn('[ai] provider failed, using rule-based reply:', (e as Error).message);
      }
      return { ...base, engine: 'rule-based' };
    },
  };
}

export function getProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  const key = (process.env.AI_API_KEY || '').trim();
  if ((provider === 'openai' || provider === 'gemini') && key) return llmVoiced(provider, key, process.env.AI_MODEL?.trim() || undefined);
  return ruleBased;
}
