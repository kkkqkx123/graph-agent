/**
 * Timeout Registry
 *
 * Global registry for managing TimeoutManager instances across executions.
 * Provides centralized timeout registration, batch operations, and metrics aggregation.
 *
 * Simplified version: removed resource monitoring (was a no-op), kept core functionality.
 */

import { TimeoutManager } from "../state-managers/timeout-manager.js";
import type { TimeoutHandle, TimeoutRegistration } from "../types/timeout.js";
import type {
  TimeoutRegistryConfig,
  ResolvedTimeoutRegistryConfig,
} from "../types/timeout-manager-config.js";
import { DEFAULT_TIMEOUT_REGISTRY_CONFIG } from "../types/timeout-manager-config.js";
import { isValidTimeoutTag, getTagCategory } from "../types/timeout-tags.js";
import type { TimeoutMetricsCollector } from "../metrics/timeout-collector.js";
import type { EventRegistry } from "./event-registry.js";
import { createContextualLogger } from "../../utils/contextual-logger.js";

const logger = createContextualLogger({ component: "TimeoutRegistry" });

/**
 * Timeout Registry
 *
 * Centralized registry for managing timeouts across all executions.
 * Maintains a TimeoutManager instance per execution ID.
 *
 * Features:
 * - Per-execution TimeoutManager management
 * - Batch operations by tag or execution ID
 * - Automatic cleanup on execution end
 * - Cross-execution metrics aggregation
 */
export class TimeoutRegistry {
  /** Map of TimeoutManager instances by execution ID */
  private managers: Map<string, TimeoutManager> = new Map();

  /** Map to track tags across all executions for efficient tag-based operations */
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> Set<executionId>

  /** Resolved configuration */
  private config: ResolvedTimeoutRegistryConfig;

  /** Global statistics */
  private globalStats = {
    totalRegistered: 0,
    timedOutCount: 0,
    cancelledCount: 0,
  };

  /** Optional metrics collector for integration */
  private metricsCollector?: TimeoutMetricsCollector;

  /** Optional event registry for event emission */
  private eventRegistry?: EventRegistry;

  /** Periodic metrics collection interval */
  private metricsCollectionInterval?: NodeJS.Timeout;

  /**
   * Create a new TimeoutRegistry
   * @param config Optional configuration (will be merged with defaults)
   * @param options Optional integrations (metrics collector, event registry)
   */
  constructor(
    config?: TimeoutRegistryConfig,
    options?: {
      metricsCollector?: TimeoutMetricsCollector;
      eventRegistry?: EventRegistry;
    },
  ) {
    this.config = {
      ...DEFAULT_TIMEOUT_REGISTRY_CONFIG,
      ...config,
      defaultManagerConfig: {
        ...DEFAULT_TIMEOUT_REGISTRY_CONFIG.defaultManagerConfig,
        ...config?.defaultManagerConfig,
      },
    };
    this.metricsCollector = options?.metricsCollector;
    this.eventRegistry = options?.eventRegistry;

    // Validate configuration
    if (this.config.maxTimeoutsPerExecution <= 0) {
      throw new Error("maxTimeoutsPerExecution must be positive");
    }

    // Start periodic metrics collection if collector is bound
    if (this.metricsCollector) {
      this.startPeriodicMetricsCollection();
    }
  }

  /**
   * Get or create a TimeoutManager for an execution
   * @param executionId Execution ID
   * @returns TimeoutManager instance
   */
  getManager(executionId: string): TimeoutManager {
    let manager = this.managers.get(executionId);

    if (!manager) {
      manager = new TimeoutManager(this.config.defaultManagerConfig, {
        eventRegistry: this.eventRegistry,
        executionId,
      });
      this.managers.set(executionId, manager);
    }

    return manager;
  }

  /**
   * Register a timeout for a specific execution
   * Convenience method that gets the manager and registers in one call
   * @param executionId Execution ID
   * @param options Timeout registration options
   * @returns TimeoutHandle
   */
  register(executionId: string, options: TimeoutRegistration): TimeoutHandle {
    if (!executionId || executionId.trim().length === 0) {
      throw new Error("Execution ID cannot be empty");
    }

    if (options.tag && !isValidTimeoutTag(options.tag)) {
      logger.warn(
        `Execution '${executionId}': Timeout '${options.id}' uses non-standard tag '${options.tag}'. Consider using standard tags from timeout-tags.ts`,
      );
    }

    const manager = this.getManager(executionId);
    const handle = manager.register(options);

    if (options.tag) {
      if (!this.tagIndex.has(options.tag)) {
        this.tagIndex.set(options.tag, new Set());
      }
      this.tagIndex.get(options.tag)!.add(executionId);
    }

    this.globalStats.totalRegistered++;

    return handle;
  }

  /**
   * Cancel all timeouts for an execution
   * @param executionId Execution ID
   */
  cancelByExecutionId(executionId: string): void {
    const manager = this.managers.get(executionId);
    if (manager) {
      try {
        manager.clear();
      } catch (error) {
        logger.error(`Failed to cancel timeouts for execution ${executionId}`);
      }
    }
  }

  /**
   * Cancel all timeouts with a specific tag across all executions
   * @param tag Tag to cancel
   */
  cancelByTag(tag: string): void {
    if (!tag || tag.trim().length === 0) {
      logger.warn("cancelByTag called with empty tag");
      return;
    }

    const executionIds = this.tagIndex.get(tag);
    if (!executionIds || executionIds.size === 0) {
      return;
    }

    let cancelledCount = 0;

    executionIds.forEach(executionId => {
      const manager = this.managers.get(executionId);
      if (manager) {
        try {
          const statsBefore = manager.getStats();
          manager.clear();
          cancelledCount += statsBefore.activeTimeouts;
        } catch (error) {
          logger.error(`Failed to cancel timeouts with tag '${tag}' for execution ${executionId}`);
        }
      }
    });

    this.globalStats.cancelledCount += cancelledCount;
    this.tagIndex.delete(tag);
  }

  /**
   * Batch cancel timeouts by multiple tags
   * @param tags Array of tags to cancel
   */
  cancelByTags(tags: string[]): void {
    if (!tags || tags.length === 0) {
      return;
    }

    const executionIdsToCancel = new Set<string>();

    tags.forEach(tag => {
      const executionIds = this.tagIndex.get(tag);
      if (executionIds) {
        executionIds.forEach(executionId => executionIdsToCancel.add(executionId));
      }
    });

    let totalCancelled = 0;
    executionIdsToCancel.forEach(executionId => {
      const manager = this.managers.get(executionId);
      if (manager) {
        try {
          const statsBefore = manager.getStats();
          manager.clear();
          totalCancelled += statsBefore.activeTimeouts;
        } catch (error) {
          logger.error(`Failed to cancel timeouts for execution ${executionId}`);
        }
      }
    });

    this.globalStats.cancelledCount += totalCancelled;

    tags.forEach(tag => {
      this.tagIndex.delete(tag);
    });
  }

  /**
   * Get aggregated statistics across all executions
   * @returns Global timeout statistics with detailed breakdown
   */
  getStats(): {
    activeExecutions: number;
    totalTimeouts: number;
    totalRegistered: number;
    timedOutCount: number;
    cancelledCount: number;
    byTag: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    let totalTimeouts = 0;
    let timedOutCount = 0;
    let cancelledCount = 0;
    const byTag: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    this.managers.forEach(manager => {
      const stats = manager.getStats();
      totalTimeouts += stats.activeTimeouts;
      timedOutCount += stats.timedOutCount;
      cancelledCount += stats.cancelledCount;

      Object.entries(stats.byTag).forEach(([tag, count]) => {
        byTag[tag] = (byTag[tag] || 0) + count;

        const category = getTagCategory(tag);
        if (category) {
          byCategory[category] = (byCategory[category] || 0) + count;
        }
      });
    });

    return {
      activeExecutions: this.managers.size,
      totalTimeouts,
      totalRegistered: this.globalStats.totalRegistered,
      timedOutCount: this.globalStats.timedOutCount + timedOutCount,
      cancelledCount: this.globalStats.cancelledCount + cancelledCount,
      byTag,
      byCategory,
    };
  }

  /**
   * Clean up a TimeoutManager when execution ends
   * @param executionId Execution ID to clean up
   */
  cleanup(executionId: string): void {
    const manager = this.managers.get(executionId);
    if (manager) {
      try {
        const statsBefore = manager.getStats();
        manager.clear();

        this.globalStats.cancelledCount += statsBefore.activeTimeouts;
        this.globalStats.timedOutCount += statsBefore.timedOutCount;

        this.tagIndex.forEach((executionIds, tag) => {
          executionIds.delete(executionId);
          if (executionIds.size === 0) {
            this.tagIndex.delete(tag);
          }
        });

        this.managers.delete(executionId);
      } catch (error) {
        logger.error(`Failed to cleanup execution ${executionId}`);
        this.managers.delete(executionId);
      }
    }
  }

  /**
   * Clean up all managers (e.g., on application shutdown)
   */
  cleanupAll(): void {
    const errors: Array<{ executionId: string; error: unknown }> = [];

    this.managers.forEach((manager, executionId) => {
      try {
        manager.clear();
      } catch (error) {
        errors.push({ executionId, error });
        logger.error(`Failed to cleanup execution ${executionId}`);
      }
    });

    this.managers.clear();
    this.tagIndex.clear();

    if (errors.length > 0) {
      logger.warn(`Cleanup completed with ${errors.length} errors`);
    }
  }

  /**
   * Check if a manager exists for an execution
   * @param executionId Execution ID
   * @returns true if manager exists
   */
  hasManager(executionId: string): boolean {
    return this.managers.has(executionId);
  }

  /**
   * Get number of active execution managers
   * @returns Number of managers
   */
  getManagerCount(): number {
    return this.managers.size;
  }

  /**
   * Remove a manager without cleaning up timeouts
   * Use with caution - may cause resource leaks
   * @param executionId Execution ID
   */
  removeManager(executionId: string): void {
    this.managers.delete(executionId);
  }

  // ==================== Metrics Integration ====================

  /**
   * Start periodic metrics collection
   */
  private startPeriodicMetricsCollection(intervalMs: number = 10000): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    this.metricsCollectionInterval = setInterval(() => {
      this.collectAndReportMetrics();
    }, intervalMs);
  }

  /**
   * Collect and report metrics to the collector
   */
  private collectAndReportMetrics(): void {
    if (!this.metricsCollector) {
      return;
    }

    try {
      this.metricsCollector.collectFromRegistry();
    } catch (error) {
      logger.error("Failed to collect timeout metrics", { error });
    }
  }

  // ==================== Diagnostic API ====================

  /**
   * Get all active timeouts across all executions
   * Useful for debugging and monitoring
   */
  getActiveTimeouts(filter?: { executionId?: string; tag?: string; category?: string }): Array<{
    executionId: string;
    timeoutId: string;
    tag?: string;
    remainingTime: number;
    duration: number;
    startTime: number;
  }> {
    const activeTimeouts: Array<{
      executionId: string;
      timeoutId: string;
      tag?: string;
      remainingTime: number;
      duration: number;
      startTime: number;
    }> = [];

    this.managers.forEach((manager, execId) => {
      if (filter?.executionId && execId !== filter.executionId) {
        return;
      }

      const stats = manager.getStats();
      if (stats.activeTimeouts === 0) {
        return;
      }

      const snapshot = manager.createSnapshot();

      snapshot.timeouts.forEach(timeout => {
        if (timeout.status !== "active") {
          return;
        }

        const timeoutTag = timeout.metadata?.["tag"] as string | undefined;

        if (filter?.tag && timeoutTag !== filter.tag) {
          return;
        }

        if (filter?.category && timeoutTag) {
          const category = getTagCategory(timeoutTag);
          if (category !== filter.category) {
            return;
          }
        }

        const elapsed = Date.now() - timeout.startTime;
        const remaining = Math.max(0, timeout.duration - elapsed);

        activeTimeouts.push({
          executionId: execId,
          timeoutId: timeout.id,
          tag: timeoutTag,
          remainingTime: remaining,
          duration: timeout.duration,
          startTime: timeout.startTime,
        });
      });
    });

    return activeTimeouts;
  }

  /**
   * Find potentially stuck timeouts (running longer than expected)
   */
  findStuckTimeouts(thresholdPercent: number = 90): Array<{
    executionId: string;
    timeoutId: string;
    tag?: string;
    progressPercent: number;
    remainingTime: number;
  }> {
    const stuckTimeouts: Array<{
      executionId: string;
      timeoutId: string;
      tag?: string;
      duration: number;
      startTime: number;
      progressPercent: number;
      remainingTime: number;
    }> = [];
    const activeTimeouts = this.getActiveTimeouts();

    activeTimeouts.forEach(timeout => {
      const progressPercent = ((timeout.duration - timeout.remainingTime) / timeout.duration) * 100;

      if (progressPercent >= thresholdPercent) {
        stuckTimeouts.push({
          executionId: timeout.executionId,
          timeoutId: timeout.timeoutId,
          tag: timeout.tag,
          duration: timeout.duration,
          startTime: timeout.startTime,
          progressPercent,
          remainingTime: timeout.remainingTime,
        });
      }
    });

    return stuckTimeouts;
  }

  /**
   * Export timeout data for external monitoring (e.g., Prometheus)
   */
  exportForMonitoring(): {
    gauges: Array<{ name: string; value: number; labels: Record<string, string> }>;
    counters: Array<{ name: string; value: number; labels: Record<string, string> }>;
    histograms: Array<{ name: string; buckets: Array<{ le: number; count: number }>; sum: number }>;
  } {
    const stats = this.getStats();

    return {
      gauges: [
        { name: "timeout_active_total", value: stats.totalTimeouts, labels: {} },
        { name: "timeout_executions_active", value: stats.activeExecutions, labels: {} },
        ...Object.entries(stats.byTag).map(([tag, count]) => ({
          name: "timeout_active_by_tag",
          value: count,
          labels: { tag },
        })),
        ...Object.entries(stats.byCategory).map(([category, count]) => ({
          name: "timeout_active_by_category",
          value: count,
          labels: { category },
        })),
      ],
      counters: [
        { name: "timeout_registered_total", value: stats.totalRegistered, labels: {} },
        { name: "timeout_expired_total", value: stats.timedOutCount, labels: {} },
        { name: "timeout_cancelled_total", value: stats.cancelledCount, labels: {} },
      ],
      histograms: [],
    };
  }

  /**
   * Dispose registry and stop all background tasks
   */
  dispose(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = undefined;
    }

    this.cleanupAll();
  }
}