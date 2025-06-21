// API Key Management for Production vs Development
// Handles user-provided API keys in production and dev keys locally

interface ApiKeys {
  openai?: string;
  anthropic?: string;
}

class ApiKeyManager {
  private keys: ApiKeys = {};
  private isProduction: boolean;

  constructor() {
    // Only treat as production if it's actually a deployed .replit.app domain
    this.isProduction = window.location.hostname.includes('.replit.app');
    
    console.log(`🌐 Frontend - Hostname: ${window.location.hostname}, Production: ${this.isProduction}`);
    this.initializeKeys();
  }

  private initializeKeys() {
    if (this.isProduction) {
      // In production, try to get keys from sessionStorage first
      const storedOpenAI = sessionStorage.getItem('openai_api_key');
      const storedAnthropic = sessionStorage.getItem('anthropic_api_key');
      
      this.keys.openai = storedOpenAI || '';
      this.keys.anthropic = storedAnthropic || '';
    } else {
      // In development, use environment variables
      this.keys.openai = import.meta.env.VITE_OPENAI_DEV_KEY || '';
      this.keys.anthropic = import.meta.env.VITE_ANTHROPIC_DEV_KEY || '';
    }
  }

  private promptForAPIKeys(): { openai?: string; anthropic?: string } {
    if (!this.isProduction) {
      return {};
    }

    const keys: { openai?: string; anthropic?: string } = {};
    
    // First, check if we already have stored keys
    const storedOpenAI = sessionStorage.getItem('openai_api_key');
    const storedAnthropic = sessionStorage.getItem('anthropic_api_key');
    
    if (storedOpenAI || storedAnthropic) {
      return {
        openai: storedOpenAI || undefined,
        anthropic: storedAnthropic || undefined
      };
    }

    // If no stored keys, prompt for both
    window.alert('To generate cover letters, you need to provide at least one API key from OpenAI or Anthropic Claude.');
    
    // Prompt for OpenAI key
    const openaiKey = window.prompt(
      'Enter your OpenAI API key (starts with sk-) or leave empty to skip:'
    );
    
    if (openaiKey && openaiKey.trim() !== '') {
      const trimmedKey = openaiKey.trim();
      if (trimmedKey.startsWith('sk-')) {
        sessionStorage.setItem('openai_api_key', trimmedKey);
        keys.openai = trimmedKey;
      } else {
        window.alert('Invalid OpenAI API key format. Keys should start with "sk-"');
      }
    }
    
    // Prompt for Anthropic key
    const anthropicKey = window.prompt(
      'Enter your Anthropic Claude API key (starts with sk-ant-) or leave empty to skip:'
    );
    
    if (anthropicKey && anthropicKey.trim() !== '') {
      const trimmedKey = anthropicKey.trim();
      if (trimmedKey.startsWith('sk-ant-')) {
        sessionStorage.setItem('anthropic_api_key', trimmedKey);
        keys.anthropic = trimmedKey;
      } else {
        window.alert('Invalid Anthropic API key format. Keys should start with "sk-ant-"');
      }
    }
    
    // Check if at least one key was provided
    if (!keys.openai && !keys.anthropic) {
      window.alert('You must provide at least one API key to generate cover letters.');
      return {};
    }
    
    return keys;
  }

  getOpenAIKey(): string {
    return this.keys.openai || '';
  }

  getAnthropicKey(): string {
    return this.keys.anthropic || '';
  }

  // Method to prompt for keys when user clicks generate
  promptForKeysOnGenerate(): { openai?: string; anthropic?: string } | null {
    const keys = this.promptForAPIKeys();
    
    if (!keys.openai && !keys.anthropic) {
      return null; // User didn't provide any keys
    }
    
    // Update internal keys
    this.keys = { ...this.keys, ...keys };
    return keys;
  }

  hasValidKeys(): boolean {
    if (this.isProduction) {
      // In production, at least one key should be provided
      return !!(this.keys.openai || this.keys.anthropic);
    } else {
      // In development, we can work with dev keys or without
      return true;
    }
  }

  clearKeys(): void {
    this.keys = {};
    if (this.isProduction) {
      sessionStorage.removeItem('openai_api_key');
      sessionStorage.removeItem('anthropic_api_key');
    }
  }

  isProductionMode(): boolean {
    return this.isProduction;
  }

  // Get all keys for sending to backend
  getAllKeys(): ApiKeys {
    return {
      openai: this.getOpenAIKey(),
      anthropic: this.getAnthropicKey()
    };
  }
}

export const apiKeyManager = new ApiKeyManager();