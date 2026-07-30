export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface OpenAIClient {
  complete(messages: ChatMessage[]): Promise<string>;
}

export class HttpOpenAIClient implements OpenAIClient {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_MODEL || "gpt-4o-mini",
  ) {}

  async complete(messages: ChatMessage[]): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${text}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  }
}

export function createOpenAIClient(): OpenAIClient | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new HttpOpenAIClient(key);
}
