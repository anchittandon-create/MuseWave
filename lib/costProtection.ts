/**
 * Cost Protection System
 * Aggressive rate limiting and budget controls to prevent cost overruns
 * Implements emergency cost safeguards
 */

import { usageTracker, RATE_LIMIT_TIERS } from './usageTracking';

interface CostProtectionConfig {
  maxDailyBudgetINR: number;
  maxConcurrentGenerations: number;
  emergencyShutoffBudgetINR: number;
  cooldownSeconds: number;
  rateLimitTier: keyof typeof RATE_LIMIT_TIERS;
}

const DEFAULT_CONFIG: CostProtectionConfig = {
  maxDailyBudgetINR: parseFloat(process.env.DAILY_BUDGET_LIMIT_INR || '50'),
  maxConcurrentGenerations: parseInt(process.env.MAX_CONCURRENT_GENERATIONS || '2'),
  emergencyShutoffBudgetINR: 200, // Emergency stop at ₹200/day
  cooldownSeconds: 60,
  rateLimitTier: 'free',
};

class CostProtectionSystem {
  private config: CostProtectionConfig;
  private lastRequestTimes: Map<string, number> = new Map();
  private activeGenerations: Set<string> = new Set();
  private emergencyShutdown = false;

  constructor(config: Partial<CostProtectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Check for emergency shutdown every minute
    setInterval(() => this.checkEmergencyShutdown(), 60000);
  }

  /**
   * Check if user can make a request (rate limiting + budget)
   */
  canMakeRequest(userId: string): {
    allowed: boolean;
    reason?: string;
    waitTimeSeconds?: number;
  } {
    // Emergency shutdown check
    if (this.emergencyShutdown) {
      return { 
        allowed: false, 
        reason: 'Emergency cost protection activated. Service temporarily unavailable.' 
      };
    }

    // Check daily budget
    const metrics = usageTracker.getUserMetrics(userId);
    if (metrics.estimatedCost > this.config.maxDailyBudgetINR) {
      return { 
        allowed: false, 
        reason: `Daily budget limit (₹${this.config.maxDailyBudgetINR}) exceeded` 
      };
    }

    // Check concurrent generations
    if (this.activeGenerations.size >= this.config.maxConcurrentGenerations) {
      return { 
        allowed: false, 
        reason: `Too many concurrent generations (max: ${this.config.maxConcurrentGenerations})` 
      };
    }

    // Rate limiting
    const lastRequest = this.lastRequestTimes.get(userId) || 0;
    const timeSinceLastRequest = (Date.now() - lastRequest) / 1000;
    const tier = RATE_LIMIT_TIERS[this.config.rateLimitTier];
    
    if (timeSinceLastRequest < tier.cooldownSeconds) {
      const waitTime = tier.cooldownSeconds - timeSinceLastRequest;
      return { 
        allowed: false, 
        reason: `Rate limited. Please wait ${Math.ceil(waitTime)} seconds.`,
        waitTimeSeconds: waitTime
      };
    }

    return { allowed: true };
  }

  /**
   * Register a new request
   */
  registerRequest(userId: string, generationId: string): void {
    this.lastRequestTimes.set(userId, Date.now());
    this.activeGenerations.add(generationId);
    
    console.log(`[Cost Protection] Request registered for ${userId} (${this.activeGenerations.size}/${this.config.maxConcurrentGenerations} active)`);
  }

  /**
   * Mark generation as complete
   */
  completeGeneration(generationId: string): void {
    this.activeGenerations.delete(generationId);
    console.log(`[Cost Protection] Generation ${generationId} completed (${this.activeGenerations.size} remaining)`);
  }

  /**
   * Check if emergency shutdown is needed
   */
  private checkEmergencyShutdown(): void {
    const totalCost = usageTracker.getTotalCost();
    
    if (totalCost > this.config.emergencyShutoffBudgetINR) {
      this.emergencyShutdown = true;
      console.error(`[EMERGENCY] Cost protection activated! Total cost: ₹${totalCost.toFixed(2)}`);
      
      // Send alert (implement webhook/email notification here)
      this.sendCostAlert(totalCost);
    }
  }

  /**
   * Send cost alert notification
   */
  private sendCostAlert(totalCost: number): void {
    // TODO: Implement webhook/email notification
    console.error(`🚨 COST ALERT: Total cost reached ₹${totalCost.toFixed(2)}! Service shut down.`);
  }

  /**
   * Manual emergency reset (for admin use)
   */
  resetEmergencyShutdown(): void {
    this.emergencyShutdown = false;
    console.log('[Cost Protection] Emergency shutdown manually reset');
  }

  /**
   * Get current protection status
   */
  getStatus(): {
    emergencyShutdown: boolean;
    activeGenerations: number;
    maxConcurrent: number;
    totalCost: number;
    budgetRemaining: number;
  } {
    const totalCost = usageTracker.getTotalCost();
    
    return {
      emergencyShutdown: this.emergencyShutdown,
      activeGenerations: this.activeGenerations.size,
      maxConcurrent: this.config.maxConcurrentGenerations,
      totalCost,
      budgetRemaining: Math.max(0, this.config.emergencyShutoffBudgetINR - totalCost),
    };
  }

  /**
   * Get user's current limits and usage
   */
  getUserStatus(userId: string): {
    dailyUsage: number;
    dailyLimit: number;
    canGenerate: boolean;
    cooldownRemaining: number;
  } {
    const metrics = usageTracker.getUserMetrics(userId);
    const lastRequest = this.lastRequestTimes.get(userId) || 0;
    const timeSinceLastRequest = (Date.now() - lastRequest) / 1000;
    const tier = RATE_LIMIT_TIERS[this.config.rateLimitTier];
    const cooldownRemaining = Math.max(0, tier.cooldownSeconds - timeSinceLastRequest);
    
    return {
      dailyUsage: metrics.estimatedCost,
      dailyLimit: this.config.maxDailyBudgetINR,
      canGenerate: this.canMakeRequest(userId).allowed,
      cooldownRemaining,
    };
  }
}

// Singleton instance
export const costProtection = new CostProtectionSystem();

/**
 * Express middleware for cost protection
 */
export function costProtectionMiddleware(req: any, res: any, next: any) {
  const userId = req.headers['x-user-id'] || req.ip || 'anonymous';
  const generationId = req.headers['x-generation-id'] || `gen-${Date.now()}`;
  
  const check = costProtection.canMakeRequest(userId);
  
  if (!check.allowed) {
    return res.status(429).json({
      error: 'Rate limited',
      message: check.reason,
      waitTimeSeconds: check.waitTimeSeconds,
      retryAfter: check.waitTimeSeconds,
    });
  }

  // Register the request
  costProtection.registerRequest(userId, generationId);
  
  // Add completion handler
  res.on('finish', () => {
    costProtection.completeGeneration(generationId);
  });

  next();
}

export default costProtection;