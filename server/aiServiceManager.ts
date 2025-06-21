import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';

interface ApiKeys {
  openai?: string;
  anthropic?: string;
}

export class AIServiceManager {
  private userApiKeys?: ApiKeys;
  private isProduction: boolean;

  constructor(userApiKeys?: ApiKeys) {
    this.userApiKeys = userApiKeys;
    // Only treat as production if explicitly set or deployed to .replit.app
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  getOpenAIClient(): OpenAI {
    const apiKey = this.isProduction && this.userApiKeys?.openai 
      ? this.userApiKeys.openai 
      : process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key not available');
    }

    return new OpenAI({ apiKey });
  }

  getAnthropicClient(): Anthropic {
    const apiKey = this.isProduction && this.userApiKeys?.anthropic 
      ? this.userApiKeys.anthropic 
      : process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('Anthropic API key not available');
    }

    return new Anthropic({ apiKey });
  }

  hasOpenAI(): boolean {
    if (this.isProduction) {
      return !!(this.userApiKeys?.openai);
    }
    return !!(process.env.OPENAI_API_KEY);
  }

  hasAnthropic(): boolean {
    if (this.isProduction) {
      return !!(this.userApiKeys?.anthropic);
    }
    return !!(process.env.ANTHROPIC_API_KEY);
  }

  // AI generation methods that use the appropriate service
  async generateWithOpenAI(prompt: string, systemPrompt?: string): Promise<string> {
    const client = this.getOpenAIClient();
    
    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await client.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages,
      temperature: 0.7,
    });

    return response.choices[0].message.content || '';
  }

  async generateWithAnthropic(prompt: string, systemPrompt?: string): Promise<string> {
    const client = this.getAnthropicClient();
    
    const response = await client.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 4000,
      system: systemPrompt || "You are a helpful AI assistant.",
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    return (response.content[0] as any).text || '';
  }

  // Smart generation that uses the best available service
  async generateText(prompt: string, systemPrompt?: string, preferredService?: 'openai' | 'anthropic'): Promise<string> {
    if (preferredService === 'openai' && this.hasOpenAI()) {
      return this.generateWithOpenAI(prompt, systemPrompt);
    }
    
    if (preferredService === 'anthropic' && this.hasAnthropic()) {
      return this.generateWithAnthropic(prompt, systemPrompt);
    }

    // Fallback to any available service
    if (this.hasOpenAI()) {
      return this.generateWithOpenAI(prompt, systemPrompt);
    }
    
    if (this.hasAnthropic()) {
      return this.generateWithAnthropic(prompt, systemPrompt);
    }

    throw new Error('No AI service available. Please provide API keys.');
  }

  async generateJSON(prompt: string, systemPrompt?: string): Promise<any> {
    // Use OpenAI for JSON generation when available (better structured output)
    if (this.hasOpenAI()) {
      const client = this.getOpenAIClient();
      
      const messages: any[] = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt + " Respond with valid JSON only." });
      }
      messages.push({ role: "user", content: prompt });

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || '{}';
      return JSON.parse(content);
    }

    // Fallback to Anthropic
    if (this.hasAnthropic()) {
      const jsonPrompt = prompt + "\n\nPlease respond with valid JSON only.";
      const result = await this.generateWithAnthropic(jsonPrompt, systemPrompt);
      
      // Clean and parse JSON
      const cleaned = result
        .replace(/```json\s*/g, '')
        .replace(/```/g, '')
        .trim();
      
      return JSON.parse(cleaned);
    }

    throw new Error('No AI service available for JSON generation.');
  }
}