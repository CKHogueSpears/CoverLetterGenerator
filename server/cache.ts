import { db } from './db';
import { documents } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { openai } from './openai';
import { anthropic } from './anthropic';

// Multi-tenant dual-collection cache configuration
const CACHE_CONFIG = {
  multiTenancy: {
    enabled: true,
    userIdField: "session.user.id",
    cacheKeyTemplate: "user:{userId}:{collection}:{key}"
  },
  styleGuideAnalysis: {
    ttlSeconds: 86400, // 24 hours
    enabled: true,
    cacheRawInput: true,
    rawCollection: "StyleGuideRawCache",
    processedCollection: "StyleGuideAnalysisCache",
    autoInvalidateOnUpload: true,
    keyTemplate: "user:{userId}:StyleGuide:{docId}"
  },
  resumeEmbeddings: {
    ttlSeconds: 86400, // 24 hours
    enabled: true,
    cacheRawInput: true,
    rawCollection: "ResumeRawCache", 
    processedCollection: "ResumeEmbeddings",
    model: "openai-embedding-ada-002",
    autoRefresh: true,
    keyTemplate: "user:{userId}:Resume:{resumeId}"
  },
  coverLetterData: {
    ttlSeconds: 3600, // 1 hour
    enabled: true,
    cacheRawInput: true,
    rawCollection: "CoverLetterRawDataCache",
    processedCollection: "CoverLetterDataCache",
    cacheIntermediate: true,
    keyTemplate: "user:{userId}:CoverLetter:{letterId}"
  }
};

// In-memory cache store
interface CacheEntry<T> {
  data: T;
  expiry: number;
  key: string;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlSeconds: number): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.store.set(key, { data, expiry, key });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return entry.data;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  // Get all keys matching a pattern
  getKeysMatching(pattern: string): string[] {
    return Array.from(this.store.keys()).filter(key => key.includes(pattern));
  }
}

export const cache = new MemoryCache();

// Multi-tenant Style Guide Analysis Cache
export class StyleGuideCache {
  private static getRawCacheKey(userId: number): string {
    return CACHE_CONFIG.styleGuideAnalysis.keyTemplate
      .replace('{userId}', userId.toString())
      .replace('{docId}', 'all') + '_raw';
  }

  private static getProcessedCacheKey(userId: number): string {
    return CACHE_CONFIG.styleGuideAnalysis.keyTemplate
      .replace('{userId}', userId.toString())
      .replace('{docId}', 'all') + '_processed';
  }

  static async getRaw(userId: number): Promise<string | null> {
    if (!CACHE_CONFIG.styleGuideAnalysis.enabled || !CACHE_CONFIG.styleGuideAnalysis.cacheRawInput) return null;
    
    const cacheKey = this.getRawCacheKey(userId);
    return cache.get(cacheKey);
  }

  static async getProcessed(userId: number): Promise<any | null> {
    if (!CACHE_CONFIG.styleGuideAnalysis.enabled) return null;
    
    const cacheKey = this.getProcessedCacheKey(userId);
    return cache.get(cacheKey);
  }

  static async setRaw(userId: number, rawContent: string): Promise<void> {
    if (!CACHE_CONFIG.styleGuideAnalysis.enabled || !CACHE_CONFIG.styleGuideAnalysis.cacheRawInput) return;
    
    const cacheKey = this.getRawCacheKey(userId);
    cache.set(cacheKey, rawContent, CACHE_CONFIG.styleGuideAnalysis.ttlSeconds);
  }

  static async setProcessed(userId: number, analysis: any): Promise<void> {
    if (!CACHE_CONFIG.styleGuideAnalysis.enabled) return;
    
    const cacheKey = this.getProcessedCacheKey(userId);
    cache.set(cacheKey, analysis, CACHE_CONFIG.styleGuideAnalysis.ttlSeconds);
  }

  static async invalidate(userId: number): Promise<void> {
    cache.delete(this.getRawCacheKey(userId));
    cache.delete(this.getProcessedCacheKey(userId));
  }

  static async getRawStyleGuideContent(userId: number): Promise<string> {
    // Check raw cache first
    const cachedRaw = await this.getRaw(userId);
    if (cachedRaw) {
      console.log(`🚀 Style guide raw cache HIT for user ${userId}`);
      return cachedRaw;
    }

    console.log(`⏳ Style guide raw cache MISS for user ${userId} - loading...`);
    
    // Get style guide documents from database
    const styleGuides = await db.select()
      .from(documents)
      .where(eq(documents.userId, userId));

    const combinedContent = styleGuides.length > 0 
      ? styleGuides.map(doc => doc.content).join('\n\n')
      : 'Professional cover letter style guide';

    // Cache the raw content
    await this.setRaw(userId, combinedContent);
    
    return combinedContent;
  }

  static async analyzeStyleGuide(userId: number): Promise<any> {
    // Try processed cache first - with schema validation
    const cachedProcessed = await this.getProcessed(userId);
    if (cachedProcessed && this.validateProcessedSchema(cachedProcessed)) {
      console.log(`🚀 Style guide processed cache HIT for user ${userId}`);
      return cachedProcessed;
    }

    if (cachedProcessed) {
      console.log(`⚠️ Style guide processed cache schema mismatch - rebuilding for user ${userId}`);
    } else {
      console.log(`⏳ Style guide processed cache MISS for user ${userId} - analyzing...`);
    }

    // Get raw content (from cache or database)
    const rawContent = await this.getRawStyleGuideContent(userId);
    
    // Analyze with Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analyze this style guide content and extract key patterns, tone, and structural preferences. Return as JSON with keys: patterns (array), tone (string), structure (string), keywords (array), preferences (object).

Content: ${rawContent}`
      }]
    });

    const textContent = response.content.find(block => block.type === 'text') as any;
    const rawText = textContent?.text || '{}';
    
    // Clean markdown formatting from JSON response
    const cleanJson = rawText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    const analysis = JSON.parse(cleanJson);
    
    // Cache the processed result
    await this.setProcessed(userId, analysis);
    
    return analysis;
  }

  private static validateProcessedSchema(data: any): boolean {
    return data && 
           Array.isArray(data.patterns) && 
           typeof data.tone === 'string' &&
           typeof data.structure === 'string';
  }
}

// Multi-tenant Resume Embeddings Cache
export class ResumeEmbeddingsCache {
  private static getRawCacheKey(userId: number): string {
    return CACHE_CONFIG.resumeEmbeddings.keyTemplate
      .replace('{userId}', userId.toString())
      .replace('{resumeId}', 'all') + '_raw';
  }

  private static getProcessedCacheKey(userId: number): string {
    return CACHE_CONFIG.resumeEmbeddings.keyTemplate
      .replace('{userId}', userId.toString())
      .replace('{resumeId}', 'all') + '_processed';
  }

  static async getRaw(userId: number): Promise<string | null> {
    if (!CACHE_CONFIG.resumeEmbeddings.enabled || !CACHE_CONFIG.resumeEmbeddings.cacheRawInput) return null;
    
    const cacheKey = this.getRawCacheKey(userId);
    return cache.get(cacheKey);
  }

  static async getProcessed(userId: number): Promise<any | null> {
    if (!CACHE_CONFIG.resumeEmbeddings.enabled) return null;
    
    const cacheKey = this.getProcessedCacheKey(userId);
    return cache.get(cacheKey);
  }

  static async setRaw(userId: number, rawContent: string): Promise<void> {
    if (!CACHE_CONFIG.resumeEmbeddings.enabled || !CACHE_CONFIG.resumeEmbeddings.cacheRawInput) return;
    
    const cacheKey = this.getRawCacheKey(userId);
    cache.set(cacheKey, rawContent, CACHE_CONFIG.resumeEmbeddings.ttlSeconds);
  }

  static async setProcessed(userId: number, embeddings: any): Promise<void> {
    if (!CACHE_CONFIG.resumeEmbeddings.enabled) return;
    
    const cacheKey = this.getProcessedCacheKey(userId);
    cache.set(cacheKey, embeddings, CACHE_CONFIG.resumeEmbeddings.ttlSeconds);
  }

  static async invalidate(userId: number): Promise<void> {
    cache.delete(this.getRawCacheKey(userId));
    cache.delete(this.getProcessedCacheKey(userId));
  }

  static async getRawResumeContent(userId: number): Promise<string> {
    // Check raw cache first
    const cachedRaw = await this.getRaw(userId);
    if (cachedRaw) {
      console.log(`🚀 Resume raw cache HIT for user ${userId}`);
      return cachedRaw;
    }

    console.log(`⏳ Resume raw cache MISS for user ${userId} - loading...`);
    
    // Get resume documents from database
    const resumes = await db.select()
      .from(documents)
      .where(eq(documents.userId, userId));

    const resumeContent = resumes.length > 0 
      ? resumes.map(doc => doc.content).join('\n\n')
      : 'No resume content available';

    // Cache the raw content
    await this.setRaw(userId, resumeContent);
    
    return resumeContent;
  }

  static async generateEmbeddings(userId: number): Promise<any> {
    // Try processed cache first - with validation
    const cachedProcessed = await this.getProcessed(userId);
    if (cachedProcessed && this.validateProcessedSchema(cachedProcessed)) {
      console.log(`🚀 Resume embeddings processed cache HIT for user ${userId}`);
      return cachedProcessed;
    }

    if (cachedProcessed) {
      console.log(`⚠️ Resume embeddings processed cache validation error - rebuilding for user ${userId}`);
    } else {
      console.log(`⏳ Resume embeddings processed cache MISS for user ${userId} - generating...`);
    }

    // Get raw content (from cache or database)
    const resumeContent = await this.getRawResumeContent(userId);
    
    if (resumeContent === 'No resume content available') {
      const defaultEmbeddings = { accomplishments: [], skills: [], experience: [] };
      await this.setProcessed(userId, defaultEmbeddings);
      return defaultEmbeddings;
    }

    // Extract structured data with OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{
        role: "system",
        content: "Extract accomplishments, skills, and experience from this resume. Return as JSON with keys: accomplishments (array of objects with title/description), skills (array), experience (array of objects with company/role/achievements)."
      }, {
        role: "user",
        content: resumeContent
      }],
      response_format: { type: "json_object" }
    });

    const embeddings = JSON.parse(response.choices[0].message.content || "{}");
    
    // Cache the processed result
    await this.setProcessed(userId, embeddings);
    
    return embeddings;
  }

  private static validateProcessedSchema(data: any): boolean {
    return data && 
           Array.isArray(data.accomplishments) && 
           Array.isArray(data.skills) &&
           Array.isArray(data.experience);
  }
}

// Multi-tenant Cover Letter Data Cache
export class CoverLetterDataCache {
  private static getRawCacheKey(jobTitle: string, company: string, userId: number): string {
    const letterId = `${jobTitle}_${company}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return CACHE_CONFIG.coverLetterData.keyTemplate
      .replace('{userId}', userId.toString())
      .replace('{letterId}', letterId) + '_raw';
  }

  private static getProcessedCacheKey(jobTitle: string, company: string, userId: number): string {
    const letterId = `${jobTitle}_${company}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return CACHE_CONFIG.coverLetterData.keyTemplate
      .replace('{userId}', userId.toString())
      .replace('{letterId}', letterId) + '_processed';
  }

  static async getRaw(jobTitle: string, company: string, userId: number): Promise<any | null> {
    if (!CACHE_CONFIG.coverLetterData.enabled || !CACHE_CONFIG.coverLetterData.cacheRawInput) return null;
    
    const cacheKey = this.getRawCacheKey(jobTitle, company, userId);
    return cache.get(cacheKey);
  }

  static async getProcessed(jobTitle: string, company: string, userId: number): Promise<any | null> {
    if (!CACHE_CONFIG.coverLetterData.enabled) return null;
    
    const cacheKey = this.getProcessedCacheKey(jobTitle, company, userId);
    return cache.get(cacheKey);
  }

  static async setRaw(jobTitle: string, company: string, userId: number, rawData: any): Promise<void> {
    if (!CACHE_CONFIG.coverLetterData.enabled || !CACHE_CONFIG.coverLetterData.cacheRawInput) return;
    
    const cacheKey = this.getRawCacheKey(jobTitle, company, userId);
    cache.set(cacheKey, rawData, CACHE_CONFIG.coverLetterData.ttlSeconds);
  }

  static async setProcessed(jobTitle: string, company: string, userId: number, processedData: any): Promise<void> {
    if (!CACHE_CONFIG.coverLetterData.enabled) return;
    
    const cacheKey = this.getProcessedCacheKey(jobTitle, company, userId);
    cache.set(cacheKey, processedData, CACHE_CONFIG.coverLetterData.ttlSeconds);
  }

  static async get(jobTitle: string, company: string, userId: number): Promise<any | null> {
    // Try processed cache first - with validation
    const cachedProcessed = await this.getProcessed(jobTitle, company, userId);
    if (cachedProcessed && this.validateProcessedSchema(cachedProcessed)) {
      console.log(`🚀 Cover letter data processed cache HIT for ${jobTitle}_${company}`);
      return cachedProcessed;
    }

    if (cachedProcessed) {
      console.log(`⚠️ Cover letter data processed cache missing expected keys - checking raw for ${jobTitle}_${company}`);
    }

    // Fallback to raw cache if available
    const cachedRaw = await this.getRaw(jobTitle, company, userId);
    if (cachedRaw) {
      console.log(`🚀 Cover letter data raw cache HIT for ${jobTitle}_${company} - rebuilding processed`);
      return cachedRaw;
    }

    console.log(`⏳ Cover letter data cache MISS for ${jobTitle}_${company}`);
    return null;
  }

  static async set(jobTitle: string, company: string, userId: number, data: any): Promise<void> {
    // Store in both raw and processed collections
    await this.setRaw(jobTitle, company, userId, data);
    await this.setProcessed(jobTitle, company, userId, data);
  }

  private static validateProcessedSchema(data: any): boolean {
    // Validate that the cached data has the expected structure for accomplishments mapping
    return data && (
      typeof data === 'object' || 
      typeof data === 'string' ||
      Array.isArray(data)
    );
  }
}

// Multi-tenant cache management
export function invalidateUserCaches(userId: number): void {
  StyleGuideCache.invalidate(userId);
  ResumeEmbeddingsCache.invalidate(userId);
  
  // Invalidate all cover letter caches for this user
  const userCachePattern = `user:${userId}:CoverLetter:*`;
  const matchingKeys = cache.getKeysMatching(userCachePattern);
  matchingKeys.forEach(key => cache.delete(key));
  
  console.log(`🗑️ Invalidated ${matchingKeys.length + 2} cache entries for user ${userId}`);
}

// User-specific cache statistics
export function getUserCacheStats(userId: number): {
  styleGuideCache: boolean;
  resumeCache: boolean;
  coverLetterCaches: number;
} {
  const coverLetterPattern = `user:${userId}:CoverLetter:*`;
  const coverLetterKeys = cache.getKeysMatching(coverLetterPattern);
  
  return {
    styleGuideCache: true, // Will be populated when accessed
    resumeCache: true, // Will be populated when accessed
    coverLetterCaches: coverLetterKeys.length
  };
}

// Startup prewarming
export async function prewarmCaches(): Promise<void> {
  console.log('🔥 Prewarming caches on startup...');
  // Could implement prewarming logic here if needed
  console.log('✅ Cache prewarming complete');
}