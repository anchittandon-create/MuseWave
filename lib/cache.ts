/**
 * Simple in-memory cache with TTL for AI responses
 * Reduces Gemini API calls by 40-60%
 * 
 * For production, replace with Redis/Upstash
 */

interface CacheEntry {
  data: any;
  expiresAt: number;
}

/**
 * Recent suggestions tracker to prevent repetition
 * Stores last N suggestions per category
 */
class RecentSuggestionsTracker {
  private history: Map<string, string[]> = new Map();
  private readonly maxHistorySize = 20; // Keep last 20 suggestions per category

  /**
   * Add a suggestion to history
   */
  add(category: string, value: string | string[]): void {
    const values = Array.isArray(value) ? value : [value];
    const existing = this.history.get(category) || [];
    
    // Add new values to front, keep last N
    const updated = [...values, ...existing].slice(0, this.maxHistorySize);
    this.history.set(category, updated);
  }

  /**
   * Check if value was recently suggested
   */
  wasRecentlySuggested(category: string, value: string): boolean {
    const history = this.history.get(category) || [];
    const normalized = value.toLowerCase().trim();
    return history.some(item => item.toLowerCase().trim() === normalized);
  }

  /**
   * Get recent suggestions for a category
   */
  getRecent(category: string): string[] {
    return this.history.get(category) || [];
  }

  /**
   * Clear history for a category
   */
  clearCategory(category: string): void {
    this.history.delete(category);
  }

  /**
   * Clear all history
   */
  clearAll(): void {
    this.history.clear();
  }
}

class SimpleCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cleanupInterval = 60000; // 1 minute
  public recentSuggestions = new RecentSuggestionsTracker();

  constructor() {
    // Auto-cleanup expired entries every minute
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Generate cache key from function name and parameters
   */
  private generateKey(functionName: string, params: any): string {
    const paramsString = JSON.stringify(params);
    return `${functionName}:${paramsString}`;
  }

  /**
   * Get cached value if exists and not expired
   */
  get<T>(functionName: string, params: any): T | null {
    const key = this.generateKey(functionName, params);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[Cache HIT] ${functionName}`);
    return entry.data as T;
  }

  /**
   * Set cache value with TTL in seconds
   */
  set(functionName: string, params: any, data: any, ttlSeconds: number = 3600): void {
    const key = this.generateKey(functionName, params);
    const expiresAt = Date.now() + (ttlSeconds * 1000);

    this.cache.set(key, { data, expiresAt });
    console.log(`[Cache SET] ${functionName} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Clear expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log('[Cache] Cleared all entries');
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()).map(key => ({
        key,
        expiresIn: Math.max(0, Math.floor((this.cache.get(key)!.expiresAt - Date.now()) / 1000))
      }))
    };
  }
}

// Singleton instance
export const aiCache = new SimpleCache();

/**
 * Cache TTL configurations (in seconds)
 */
export const CACHE_TTL = {
  // These rarely change - cache for 24 hours
  GENRE_SUGGESTIONS: 86400,
  ARTIST_SUGGESTIONS: 86400,
  INSTRUMENT_SUGGESTIONS: 86400,
  LANGUAGE_SUGGESTIONS: 86400,

  // These can vary - cache for 1 hour
  ENHANCED_PROMPT: 3600,
  LYRICS_ENHANCEMENT: 3600,

  // These are unique per generation - cache for 5 minutes (for retry scenarios)
  MUSIC_PLAN: 300,
  AUDIT_RESULT: 300,
  CREATIVE_ASSETS: 300,
};
