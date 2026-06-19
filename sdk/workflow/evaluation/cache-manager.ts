/**
 * Cache Manager
 * Unified caching system for all condition types
 * Manages compilation cache, execution results, and dependency tracking
 */

import type { EvaluationContext } from "@wf-agent/types";
import type { CompiledUnit } from "./types/index.js";
import { getGlobalLogger } from "@wf-agent/common-utils";

interface CachedResult {
  result: unknown;
  dependencies: string[];
  timestamp: number;
  previousValues: Map<string, unknown>;
}

export class CacheManager {
  private logger = getGlobalLogger().child("CacheManager", { pkg: "sdk/workflow" });

  // Compilation cache: conditionType:payload -> CompiledUnit
  private compilationCache = new Map<string, CompiledUnit>();

  // Execution cache: conditionKey -> CachedResult
  private executionCache = new Map<string, CachedResult>();

  private readonly MAX_COMPILATION_CACHE = 1000;
  private readonly MAX_EXECUTION_CACHE = 5000;

  /**
   * Get compiled unit from cache
   */
  getCompiled(cacheKey: string): CompiledUnit | null {
    return this.compilationCache.get(cacheKey) ?? null;
  }

  /**
   * Store compiled unit in cache
   */
  setCompiled(cacheKey: string, unit: CompiledUnit): void {
    if (this.compilationCache.size >= this.MAX_COMPILATION_CACHE) {
      const firstKey = this.compilationCache.keys().next().value as string | undefined;
      if (firstKey) {
        this.compilationCache.delete(firstKey);
      }
    }
    this.compilationCache.set(cacheKey, unit);
  }

  /**
   * Get cached execution result
   */
  getCachedResult(cacheKey: string): unknown | null {
    const cached = this.executionCache.get(cacheKey);
    return cached ? cached.result : null;
  }

  /**
   * Check if dependencies have changed since last execution
   */
  hasDependenciesChanged(cacheKey: string, context: EvaluationContext): boolean {
    const cached = this.executionCache.get(cacheKey);
    if (!cached) return true; // No cache, treat as changed

    for (const dep of cached.dependencies) {
      const currentValue = this.getContextValue(dep, context);
      const previousValue = cached.previousValues.get(dep);

      if (!this.valuesEqual(previousValue, currentValue)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Store execution result with dependency information
   */
  setCachedResult(
    cacheKey: string,
    result: unknown,
    dependencies: string[],
    context: EvaluationContext,
  ): void {
    if (this.executionCache.size >= this.MAX_EXECUTION_CACHE) {
      const firstKey = this.executionCache.keys().next().value as string | undefined;
      if (firstKey) {
        this.executionCache.delete(firstKey);
      }
    }

    const previousValues = new Map<string, unknown>();
    for (const dep of dependencies) {
      previousValues.set(dep, this.getContextValue(dep, context));
    }

    this.executionCache.set(cacheKey, {
      result,
      dependencies,
      timestamp: Date.now(),
      previousValues,
    });
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.compilationCache.clear();
    this.executionCache.clear();
    this.logger.debug("Cache cleared");
  }

  /**
   * Clear execution cache only (keep compilation cache)
   */
  clearExecutionCache(): void {
    this.executionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { compilation: number; execution: number } {
    return {
      compilation: this.compilationCache.size,
      execution: this.executionCache.size,
    };
  }

  /**
   * Extract value from context by dependency path
   */
  private getContextValue(dep: string, context: EvaluationContext): unknown {
    if (dep === "input" || dep === "output" || dep === "variables") {
      return context[dep as keyof EvaluationContext];
    }

    const parts = dep.split(".");
    const root = parts[0] || "variables";

    let current: unknown;
    if (root === "input") {
      current = (context.input as Record<string, unknown>)?.[parts[1] || ""];
    } else if (root === "output") {
      current = (context.output as Record<string, unknown>)?.[parts[1] || ""];
    } else if (root === "variables") {
      current = (context.variables as Record<string, unknown>)?.[parts[1] || ""];
    } else {
      current = (context.variables as Record<string, unknown>)?.[root];
    }

    for (let i = 2; i < parts.length; i++) {
      const part = parts[i];
      if (!part || current == null || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Deep equality check
   */
  private valuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    if (typeof a === "object" && !Array.isArray(a)) {
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;
      const keysA = Object.keys(aObj);
      const keysB = Object.keys(bObj);

      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => this.valuesEqual(aObj[key], bObj[key]));
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, idx) => this.valuesEqual(item, b[idx]));
    }

    return false;
  }
}

export const cacheManager = new CacheManager();
