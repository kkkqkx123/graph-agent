/**
 * AgentLoopExecutionHistoryAPI - Unified Agent Loop Execution History API
 * Consolidates error history, interruption tracking, and tool execution details
 *
 * Provides unified access to all execution events during agent loop execution:
 * - Error recording and analysis
 * - Interruption tracking and resolution
 * - Tool execution tracking and performance metrics
 *
 * Features:
 * - Unified query interface for all execution events
 * - Timeline view of complete execution history
 * - Statistical analysis across event types
 * - Tool execution performance and dependency tracking
 * - Event filtering and aggregation
 */

import { ReadonlyResourceAPI } from "../../shared/resources/generic-resource-api.js";
import type { APIDependencyManager } from "../../shared/core/sdk-dependencies.js";
import type { ID, ToolCallRecord } from "@wf-agent/types";
import { createContextualLogger } from "../../../utils/contextual-logger.js";

const logger = createContextualLogger({ operation: "AgentLoopExecutionHistoryAPI" });

// ============================================================================
// Type Definitions: Error Tracking
// ============================================================================

/**
 * Agent Error Record
 */
export interface AgentErrorRecord {
  /** Error ID */
  id: string;
  /** Agent Loop ID */
  agentLoopId: ID;
  /** Error message */
  message: string;
  /** Error severity */
  severity: "error" | "warning" | "info";
  /** Operation where error occurred */
  operation: string;
  /** Iteration number when error occurred */
  iteration?: number;
  /** Tool call count when error occurred */
  toolCallCount?: number;
  /** Timestamp */
  timestamp: number;
  /** Is recoverable */
  isRecoverable: boolean;
  /** Error details */
  details?: Record<string, unknown>;
}

/**
 * Agent Error Filter
 */
export interface AgentErrorFilter {
  /** Agent Loop ID list */
  agentLoopIds?: ID[];
  /** Error severity */
  severity?: "error" | "warning" | "info";
  /** Time range for error occurrence */
  timeRange?: {
    start?: number;
    end?: number;
  };
  /** Include only recoverable errors */
  onlyRecoverable?: boolean;
  /** Include only non-recoverable errors */
  onlyNonRecoverable?: boolean;
}

/**
 * Agent Error Statistics
 */
export interface AgentErrorStats {
  /** Total error count */
  totalErrors: number;
  /** Error count by severity */
  bySeverity: {
    error: number;
    warning: number;
    info: number;
  };
  /** Recoverable error count */
  recoverableCount: number;
  /** Non-recoverable error count */
  nonRecoverableCount: number;
  /** Most recent error */
  lastError?: AgentErrorRecord;
}

// ============================================================================
// Type Definitions: Interruption Tracking
// ============================================================================

/**
 * Interruption Resolution Status
 */
export type InterruptionResolutionStatus = "pending" | "resolved" | "abandoned" | "resumed";

/**
 * Interruption Type
 */
export type InterruptionType = "PAUSE" | "STOP" | null;

/**
 * Agent Interruption Record
 */
export interface AgentInterruptionRecord {
  /** Interruption ID */
  id: string;
  /** Agent Loop ID */
  agentLoopId: ID;
  /** Interruption type */
  type: InterruptionType;
  /** Interruption reason/message */
  reason: string;
  /** Iteration number when interruption occurred */
  iteration: number;
  /** Timestamp of interruption */
  timestamp: number;
  /** Resolution status */
  resolutionStatus: InterruptionResolutionStatus;
  /** Checkpoint ID if created during interruption */
  checkpointId?: string;
  /** Resolution timestamp */
  resolvedAt?: number;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Agent Interruption Filter
 */
export interface AgentInterruptionFilter {
  /** Agent Loop ID list */
  agentLoopIds?: ID[];
  /** Interruption type */
  type?: InterruptionType;
  /** Time range for interruption occurrence */
  timeRange?: {
    start?: number;
    end?: number;
  };
  /** Resolution status filter */
  resolutionStatus?: InterruptionResolutionStatus;
}

/**
 * Agent Interruption Statistics
 */
export interface AgentInterruptionStats {
  /** Total interruption count */
  totalInterruptions: number;
  /** Interruption count by type */
  byType: Record<string, number>;
  /** Interruption count by status */
  byStatus: Record<InterruptionResolutionStatus, number>;
  /** Average time to resolution (ms) */
  avgResolutionTime?: number;
}

// ============================================================================
// Type Definitions: Tool Execution Tracking
// ============================================================================

/**
 * Tool Execution Status
 */
export type ToolExecutionStatus = "pending" | "success" | "failed" | "timeout" | "cancelled";

/**
 * Tool Execution Detail Record
 */
export interface ToolExecutionDetail extends ToolCallRecord {
  /** Agent Loop ID this tool was called from */
  agentLoopId: ID;
  /** Iteration number when this tool was called */
  iteration: number;
  /** Execution status */
  status: ToolExecutionStatus;
  /** Duration in milliseconds */
  duration: number;
  /** Tool input parameters */
  input?: Record<string, unknown>;
  /** Tool output result */
  output?: unknown;
  /** Execution environment */
  environment?: {
    userId?: string;
    sessionId?: string;
    tags?: Record<string, string>;
  };
  /** Dependencies: IDs of tool calls this one depends on */
  dependsOn?: string[];
  /** Tool calls that depend on this one */
  dependentTools?: string[];
  /** Exception/error details */
  errorDetails?: {
    code?: string;
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
  };
  /** Performance metrics */
  metrics?: {
    cpuTime?: number;
    memoryUsed?: number;
    networkTime?: number;
    totalTime: number;
  };
}

/**
 * Tool Execution Filter
 */
export interface ToolExecutionFilter {
  /** Agent Loop ID list */
  agentLoopIds?: ID[];
  /** Tool name filter */
  toolName?: string;
  /** Execution status filter */
  status?: ToolExecutionStatus;
  /** Time range for execution */
  timeRange?: {
    start?: number;
    end?: number;
  };
  /** Iteration number range */
  iterationRange?: {
    start?: number;
    end?: number;
  };
  /** Filter by tool dependencies */
  hasDependencies?: boolean;
  /** Filter by execution success/failure */
  succeededOnly?: boolean;
  /** Min duration threshold (ms) */
  minDuration?: number;
  /** Max duration threshold (ms) */
  maxDuration?: number;
}

/**
 * Tool Execution Statistics
 */
export interface ToolExecutionStats {
  /** Total tool executions */
  totalExecutions: number;
  /** Successful executions */
  successCount: number;
  /** Failed executions */
  failureCount: number;
  /** Tool execution count by name */
  byToolName: Record<string, number>;
  /** Tool execution count by status */
  byStatus: Record<ToolExecutionStatus, number>;
  /** Average execution time (ms) */
  averageExecutionTime: number;
  /** Median execution time (ms) */
  medianExecutionTime: number;
  /** Min execution time (ms) */
  minExecutionTime: number;
  /** Max execution time (ms) */
  maxExecutionTime: number;
  /** Tools with most execution time */
  slowestTools: Array<{
    toolName: string;
    averageTime: number;
    count: number;
  }>;
  /** Tools with most failures */
  failingTools: Array<{
    toolName: string;
    failureCount: number;
    failureRate: number;
  }>;
}

/**
 * Tool Execution Call Chain
 */
export interface ToolExecutionCallChain {
  /** Root tool call ID */
  rootCallId: string;
  /** Tool calls in execution order */
  calls: Array<{
    callId: string;
    toolName: string;
    iteration: number;
    duration: number;
    status: ToolExecutionStatus;
  }>;
  /** Total chain duration */
  totalDuration: number;
  /** Total tool calls in chain */
  callCount: number;
}



// ============================================================================
// Unified Execution Event
// ============================================================================

/**
 * Execution Event Type
 */
export type ExecutionEventType = "error" | "interruption" | "tool_execution";

/**
 * Unified Execution Event
 * Represents any significant event during agent loop execution
 */
export interface ExecutionEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: ExecutionEventType;
  /** Agent Loop ID */
  agentLoopId: ID;
  /** Event timestamp */
  timestamp: number;
  /** Iteration number (if applicable) */
  iteration?: number;
  /** Event severity/priority */
  severity?: "critical" | "high" | "medium" | "low" | "info";
  /** Event message/description */
  message: string;
  /** Raw event data (error, interruption, or tool execution record) */
  data: AgentErrorRecord | AgentInterruptionRecord | ToolExecutionDetail;
}

/**
 * Execution Event Filter
 */
export interface ExecutionEventFilter {
  /** Agent Loop ID list */
  agentLoopIds?: ID[];
  /** Event type filter */
  type?: ExecutionEventType;
  /** Time range */
  timeRange?: {
    start?: number;
    end?: number;
  };
  /** Iteration range */
  iterationRange?: {
    start?: number;
    end?: number;
  };
}

/**
 * Execution Timeline Statistics
 */
export interface ExecutionTimelineStats {
  /** Total events */
  totalEvents: number;
  /** Events by type */
  byType: Record<ExecutionEventType, number>;
  /** Events by severity */
  bySeverity?: Record<string, number>;
  /** Critical events count */
  criticalCount: number;
  /** Time span (ms) */
  timeSpan: number;
  /** Event frequency (events per minute) */
  eventFrequency: number;
}

// ============================================================================
// API Implementation
// ============================================================================

/**
 * AgentLoopExecutionHistoryAPI - Unified Agent Loop Execution History API
 *
 * Provides unified access to all execution events (errors and interruptions)
 * during agent loop execution
 */
export class AgentLoopExecutionHistoryAPI extends ReadonlyResourceAPI<
  ExecutionEvent,
  string,
  ExecutionEventFilter
> {
  private errorRecords: Map<string, AgentErrorRecord> = new Map();
  private interruptionRecords: Map<string, AgentInterruptionRecord> = new Map();
  private toolExecutionRecords: Map<string, ToolExecutionDetail> = new Map();

  /**
   * Constructor
   * @param deps APIDependencyManager instance
   */
  constructor(deps: APIDependencyManager) {
    super();
    void deps; // Acknowledge parameter
  }

  // ============================================================================
  // Implementing Abstract Methods
  // ============================================================================

  /**
   * Get execution event by ID
   * @param id Event ID
   * @returns Execution event or null
   */
  protected override async getResource(id: string): Promise<ExecutionEvent | null> {
    // Try to find in error records
    const errorRecord = this.errorRecords.get(id);
    if (errorRecord) {
      return this.buildExecutionEvent(errorRecord, "error");
    }

    // Try to find in interruption records
    const interruptionRecord = this.interruptionRecords.get(id);
    if (interruptionRecord) {
      return this.buildExecutionEvent(interruptionRecord, "interruption");
    }

    return null;
  }

  /**
   * Get all execution events
   * @returns Array of execution events
   */
  protected override async getAllResources(): Promise<ExecutionEvent[]> {
    const events: ExecutionEvent[] = [];

    // Convert error records to events
    for (const errorRecord of this.errorRecords.values()) {
      events.push(this.buildExecutionEvent(errorRecord, "error"));
    }

    // Convert interruption records to events
    for (const interruptionRecord of this.interruptionRecords.values()) {
      events.push(this.buildExecutionEvent(interruptionRecord, "interruption"));
    }

    // Convert tool execution records to events
    for (const toolRecord of this.toolExecutionRecords.values()) {
      events.push(this.buildExecutionEvent(toolRecord, "tool_execution"));
    }

    return events;
  }

  /**
   * Apply filters to execution events
   * @param events Execution events
   * @param filter Query filter
   * @returns Filtered events
   */
  protected override applyFilter(events: ExecutionEvent[], filter: ExecutionEventFilter): ExecutionEvent[] {
    let filtered = events;

    if (filter.agentLoopIds && filter.agentLoopIds.length > 0) {
      const idSet = new Set(filter.agentLoopIds);
      filtered = filtered.filter(e => idSet.has(e.agentLoopId));
    }

    if (filter.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }

    if (filter.timeRange) {
      const { start, end } = filter.timeRange;
      if (start !== undefined) {
        filtered = filtered.filter(e => e.timestamp >= start);
      }
      if (end !== undefined) {
        filtered = filtered.filter(e => e.timestamp <= end);
      }
    }

    if (filter.iterationRange) {
      const { start, end } = filter.iterationRange;
      if (start !== undefined) {
        filtered = filtered.filter(e => (e.iteration ?? 0) >= start);
      }
      if (end !== undefined) {
        filtered = filtered.filter(e => (e.iteration ?? 0) <= end);
      }
    }

    return filtered;
  }

  // ============================================================================
  // Error History Operations
  // ============================================================================

  /**
   * Record a new error
   * @param error Error record
   */
  async recordError(error: AgentErrorRecord): Promise<void> {
    this.errorRecords.set(error.id, error);
    logger.debug("Recorded error in execution history", { errorId: error.id, agentLoopId: error.agentLoopId });
  }

  /**
   * Get error statistics
   * @param filter Query filter
   * @returns Error statistics
   */
  async getErrorStats(filter?: AgentErrorFilter): Promise<AgentErrorStats> {
    let records = Array.from(this.errorRecords.values());

    if (filter) {
      records = this.applyErrorFilter(records, filter);
    }

    const stats: AgentErrorStats = {
      totalErrors: records.length,
      bySeverity: {
        error: 0,
        warning: 0,
        info: 0,
      },
      recoverableCount: 0,
      nonRecoverableCount: 0,
    };

    records.forEach(record => {
      stats.bySeverity[record.severity]++;
      if (record.isRecoverable) {
        stats.recoverableCount++;
      } else {
        stats.nonRecoverableCount++;
      }
    });

    if (records.length > 0) {
      const sorted = records.sort((a, b) => b.timestamp - a.timestamp);
      stats.lastError = sorted[0];
    }

    return stats;
  }

  /**
   * Query errors with filter
   * @param filter Query filter
   * @returns Filtered error records
   */
  async queryErrors(filter?: AgentErrorFilter): Promise<AgentErrorRecord[]> {
    let records = Array.from(this.errorRecords.values());

    if (filter) {
      records = this.applyErrorFilter(records, filter);
    }

    return records;
  }

  /**
   * Apply error filter
   * @param records Error records
   * @param filter Query filter
   * @returns Filtered records
   */
  private applyErrorFilter(records: AgentErrorRecord[], filter: AgentErrorFilter): AgentErrorRecord[] {
    let filtered = records;

    if (filter.agentLoopIds && filter.agentLoopIds.length > 0) {
      const idSet = new Set(filter.agentLoopIds);
      filtered = filtered.filter(r => idSet.has(r.agentLoopId));
    }

    if (filter.severity) {
      filtered = filtered.filter(r => r.severity === filter.severity);
    }

    if (filter.timeRange) {
      const { start, end } = filter.timeRange;
      if (start !== undefined) {
        filtered = filtered.filter(r => r.timestamp >= start);
      }
      if (end !== undefined) {
        filtered = filtered.filter(r => r.timestamp <= end);
      }
    }

    if (filter.onlyRecoverable) {
      filtered = filtered.filter(r => r.isRecoverable);
    }

    if (filter.onlyNonRecoverable) {
      filtered = filtered.filter(r => !r.isRecoverable);
    }

    return filtered;
  }

  // ============================================================================
  // Interruption History Operations
  // ============================================================================

  /**
   * Record a new interruption
   * @param interruption Interruption record
   */
  async recordInterruption(interruption: AgentInterruptionRecord): Promise<void> {
    this.interruptionRecords.set(interruption.id, interruption);
    logger.debug("Recorded interruption in execution history", {
      interruptionId: interruption.id,
      agentLoopId: interruption.agentLoopId,
    });
  }

  /**
   * Get interruption statistics
   * @param filter Query filter
   * @returns Interruption statistics
   */
  async getInterruptionStats(filter?: AgentInterruptionFilter): Promise<AgentInterruptionStats> {
    let records = Array.from(this.interruptionRecords.values());

    if (filter) {
      records = this.applyInterruptionFilter(records, filter);
    }

    const stats: AgentInterruptionStats = {
      totalInterruptions: records.length,
      byType: {},
      byStatus: {
        pending: 0,
        resolved: 0,
        abandoned: 0,
        resumed: 0,
      },
    };

    let totalResolutionTime = 0;
    let resolutionCount = 0;

    records.forEach(record => {
      const typeKey = String(record.type || "null");
      stats.byType[typeKey] = (stats.byType[typeKey] || 0) + 1;

      stats.byStatus[record.resolutionStatus]++;

      if (record.resolvedAt && record.resolutionStatus !== "pending") {
        totalResolutionTime += record.resolvedAt - record.timestamp;
        resolutionCount++;
      }
    });

    if (resolutionCount > 0) {
      stats.avgResolutionTime = totalResolutionTime / resolutionCount;
    }

    return stats;
  }

  /**
   * Query interruptions with filter
   * @param filter Query filter
   * @returns Filtered interruption records
   */
  async queryInterruptions(filter?: AgentInterruptionFilter): Promise<AgentInterruptionRecord[]> {
    let records = Array.from(this.interruptionRecords.values());

    if (filter) {
      records = this.applyInterruptionFilter(records, filter);
    }

    return records;
  }

  /**
   * Update interruption resolution status
   * @param interruptionId Interruption ID
   * @param status New status
   * @param resolvedAt Resolution timestamp
   */
  async updateInterruptionStatus(
    interruptionId: string,
    status: InterruptionResolutionStatus,
    resolvedAt?: number,
  ): Promise<boolean> {
    const interruption = this.interruptionRecords.get(interruptionId);
    if (!interruption) {
      return false;
    }

    interruption.resolutionStatus = status;
    if (resolvedAt) {
      interruption.resolvedAt = resolvedAt;
    }

    logger.debug("Updated interruption resolution status", {
      interruptionId,
      status,
    });
    return true;
  }

  /**
   * Apply interruption filter
   * @param records Interruption records
   * @param filter Query filter
   * @returns Filtered records
   */
  private applyInterruptionFilter(
    records: AgentInterruptionRecord[],
    filter: AgentInterruptionFilter,
  ): AgentInterruptionRecord[] {
    let filtered = records;

    if (filter.agentLoopIds && filter.agentLoopIds.length > 0) {
      const idSet = new Set(filter.agentLoopIds);
      filtered = filtered.filter(r => idSet.has(r.agentLoopId));
    }

    if (filter.type) {
      filtered = filtered.filter(r => r.type === filter.type);
    }

    if (filter.timeRange) {
      const { start, end } = filter.timeRange;
      if (start !== undefined) {
        filtered = filtered.filter(r => r.timestamp >= start);
      }
      if (end !== undefined) {
        filtered = filtered.filter(r => r.timestamp <= end);
      }
    }

    if (filter.resolutionStatus) {
      filtered = filtered.filter(r => r.resolutionStatus === filter.resolutionStatus);
    }

    return filtered;
  }

  // ============================================================================
  // Unified Timeline Operations
  // ============================================================================

  /**
   * Get execution timeline for an agent loop
   * Returns all events (errors and interruptions) in chronological order
   * @param agentLoopId Agent Loop ID
   * @returns Chronologically ordered execution events
   */
  async getExecutionTimeline(agentLoopId: ID): Promise<ExecutionEvent[]> {
    const events = await this.getAllResources();
    const timeline = events
      .filter(e => e.agentLoopId === agentLoopId)
      .sort((a, b) => a.timestamp - b.timestamp);
    return timeline;
  }

  /**
   * Get execution timeline statistics
   * @param agentLoopId Agent Loop ID
   * @returns Timeline statistics
   */
  async getTimelineStats(agentLoopId: ID): Promise<ExecutionTimelineStats> {
    const events = await this.getExecutionTimeline(agentLoopId);

    const stats: ExecutionTimelineStats = {
      totalEvents: events.length,
      byType: {
        error: 0,
        interruption: 0,
        tool_execution: 0,
      },
      bySeverity: {},
      criticalCount: 0,
      timeSpan: 0,
      eventFrequency: 0,
    };

    if (events.length === 0) {
      return stats;
    }

    // Count by type and severity
    events.forEach(event => {
      stats.byType[event.type]++;
      if (event.severity) {
        stats.bySeverity![event.severity] = (stats.bySeverity![event.severity] ?? 0) + 1;
        if (event.severity === "critical") {
          stats.criticalCount++;
        }
      }
    });

    // Calculate time span and frequency
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    if (firstEvent && lastEvent) {
      stats.timeSpan = lastEvent.timestamp - firstEvent.timestamp;
      if (stats.timeSpan > 0) {
        const minutes = stats.timeSpan / (1000 * 60);
        stats.eventFrequency = events.length / Math.max(minutes, 1);
      }
    }

    return stats;
  }

  // ============================================================================
  // Tool Execution Operations
  // ============================================================================

  /**
   * Record a tool execution detail
   * @param detail Tool execution detail
   */
  async recordToolExecution(detail: ToolExecutionDetail): Promise<void> {
    this.toolExecutionRecords.set(detail.id, detail);
    logger.debug("Recorded tool execution in history", {
      toolExecutionId: detail.id,
      toolName: detail.name,
      agentLoopId: detail.agentLoopId,
    });
  }

  /**
   * Get tool execution statistics
   * @param filter Query filter
   * @returns Execution statistics
   */
  async getToolExecutionStats(filter?: ToolExecutionFilter): Promise<ToolExecutionStats> {
    let records = Array.from(this.toolExecutionRecords.values());

    if (filter) {
      records = this.applyToolExecutionFilter(records, filter);
    }

    const stats: ToolExecutionStats = {
      totalExecutions: records.length,
      successCount: 0,
      failureCount: 0,
      byToolName: {},
      byStatus: {
        pending: 0,
        success: 0,
        failed: 0,
        timeout: 0,
        cancelled: 0,
      },
      averageExecutionTime: 0,
      medianExecutionTime: 0,
      minExecutionTime: Infinity,
      maxExecutionTime: 0,
      slowestTools: [],
      failingTools: [],
    };

    const durations: number[] = [];
    const toolStats: Record<string, { count: number; totalTime: number; failures: number }> = {};

    records.forEach(record => {
      // Count by status
      stats.byStatus[record.status]++;

      if (record.status === "success") {
        stats.successCount++;
      } else if (record.status === "failed" || record.status === "timeout" || record.status === "cancelled") {
        stats.failureCount++;
      }

      // Count by tool name
      stats.byToolName[record.name] = (stats.byToolName[record.name] || 0) + 1;

      // Track tool statistics
      if (!toolStats[record.name]) {
        toolStats[record.name] = { count: 0, totalTime: 0, failures: 0 };
      }
      const toolStat = toolStats[record.name];
      if (toolStat) {
        toolStat.count++;
        toolStat.totalTime += record.duration;
        if (record.status === "failed" || record.status === "timeout" || record.status === "cancelled") {
          toolStat.failures++;
        }
      }

      // Track durations
      durations.push(record.duration);
      stats.minExecutionTime = Math.min(stats.minExecutionTime, record.duration);
      stats.maxExecutionTime = Math.max(stats.maxExecutionTime, record.duration);
    });

    // Calculate average and median duration
    if (durations.length > 0) {
      stats.averageExecutionTime = durations.reduce((a, b) => a + b, 0) / durations.length;
      durations.sort((a, b) => a - b);
      const mid = Math.floor(durations.length / 2);
      if (durations.length % 2 !== 0) {
        stats.medianExecutionTime = durations[mid] ?? 0;
      } else {
        const val1 = durations[mid - 1] ?? 0;
        const val2 = durations[mid] ?? 0;
        stats.medianExecutionTime = (val1 + val2) / 2;
      }
    }

    // Find slowest tools
    stats.slowestTools = Object.entries(toolStats)
      .map(([toolName, data]) => ({
        toolName,
        averageTime: data.totalTime / data.count,
        count: data.count,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);

    // Find failing tools
    stats.failingTools = Object.entries(toolStats)
      .filter(([, data]) => data.failures > 0)
      .map(([toolName, data]) => ({
        toolName,
        failureCount: data.failures,
        failureRate: data.failures / data.count,
      }))
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 5);

    return stats;
  }

  /**
   * Query tool executions with filter
   * @param filter Query filter
   * @returns Filtered tool execution records
   */
  async queryToolExecutions(filter?: ToolExecutionFilter): Promise<ToolExecutionDetail[]> {
    let records = Array.from(this.toolExecutionRecords.values());

    if (filter) {
      records = this.applyToolExecutionFilter(records, filter);
    }

    return records;
  }

  /**
   * Get tool execution call chains (dependency graph)
   * @param agentLoopId Agent Loop ID
   * @returns Array of call chains
   */
  async getToolExecutionCallChains(agentLoopId: ID): Promise<ToolExecutionCallChain[]> {
    const records = Array.from(this.toolExecutionRecords.values()).filter(r => r.agentLoopId === agentLoopId);

    const chains: ToolExecutionCallChain[] = [];
    const visited = new Set<string>();

    // Find root calls (no dependencies)
    records.forEach(record => {
      if (!visited.has(record.id) && (!record.dependsOn || record.dependsOn.length === 0)) {
        const chain = this.buildToolCallChain(record, records);
        chains.push(chain);
        chain.calls.forEach(call => visited.add(call.callId));
      }
    });

    return chains;
  }

  /**
   * Apply tool execution filter
   * @param records Tool execution records
   * @param filter Query filter
   * @returns Filtered records
   */
  private applyToolExecutionFilter(records: ToolExecutionDetail[], filter: ToolExecutionFilter): ToolExecutionDetail[] {
    let filtered = records;

    if (filter.agentLoopIds && filter.agentLoopIds.length > 0) {
      const idSet = new Set(filter.agentLoopIds);
      filtered = filtered.filter(r => idSet.has(r.agentLoopId));
    }

    if (filter.toolName) {
      filtered = filtered.filter(r => r.name === filter.toolName);
    }

    if (filter.status) {
      filtered = filtered.filter(r => r.status === filter.status);
    }

    if (filter.timeRange) {
      const { start, end } = filter.timeRange;
      if (start !== undefined) {
        filtered = filtered.filter(r => r.startTime >= start);
      }
      if (end !== undefined) {
        filtered = filtered.filter(r => (r.endTime ?? 0) <= end);
      }
    }

    if (filter.iterationRange) {
      const { start, end } = filter.iterationRange;
      if (start !== undefined) {
        filtered = filtered.filter(r => r.iteration >= start);
      }
      if (end !== undefined) {
        filtered = filtered.filter(r => r.iteration <= end);
      }
    }

    if (filter.hasDependencies) {
      filtered = filtered.filter(r => (r.dependsOn && r.dependsOn.length > 0) || (r.dependentTools && r.dependentTools.length > 0));
    }

    if (filter.succeededOnly) {
      filtered = filtered.filter(r => r.status === "success");
    }

    if (filter.minDuration !== undefined) {
      filtered = filtered.filter(r => r.duration >= filter.minDuration!);
    }

    if (filter.maxDuration !== undefined) {
      filtered = filtered.filter(r => r.duration <= filter.maxDuration!);
    }

    return filtered;
  }

  /**
   * Build a call chain starting from a root call
   * @param rootRecord Root tool execution record
   * @param allRecords All tool execution records
   * @returns Call chain
   */
  private buildToolCallChain(rootRecord: ToolExecutionDetail, allRecords: ToolExecutionDetail[]): ToolExecutionCallChain {
    const calls: ToolExecutionCallChain["calls"] = [
      {
        callId: rootRecord.id,
        toolName: rootRecord.name,
        iteration: rootRecord.iteration,
        duration: rootRecord.duration,
        status: rootRecord.status,
      },
    ];

    let totalDuration = rootRecord.duration;
    let processed = new Set<string>([rootRecord.id]);

    // Find dependent tools
    const findDependents = (callId: string) => {
      const dependents = allRecords.filter(r => r.dependsOn && r.dependsOn.includes(callId) && !processed.has(r.id));

      dependents.forEach(dependent => {
        calls.push({
          callId: dependent.id,
          toolName: dependent.name,
          iteration: dependent.iteration,
          duration: dependent.duration,
          status: dependent.status,
        });
        totalDuration += dependent.duration;
        processed.add(dependent.id);
        findDependents(dependent.id);
      });
    };

    findDependents(rootRecord.id);

    return {
      rootCallId: rootRecord.id,
      calls,
      totalDuration,
      callCount: calls.length,
    };
  }

  /**
   * Clear execution history for an agent loop
   * @param agentLoopId Agent Loop ID
   */
  async clearHistory(agentLoopId: ID): Promise<void> {
    const errorKeysToDelete: string[] = [];
    const interruptionKeysToDelete: string[] = [];
    const toolKeysToDelete: string[] = [];

    this.errorRecords.forEach((record, id) => {
      if (record.agentLoopId === agentLoopId) {
        errorKeysToDelete.push(id);
      }
    });

    this.interruptionRecords.forEach((record, id) => {
      if (record.agentLoopId === agentLoopId) {
        interruptionKeysToDelete.push(id);
      }
    });

    this.toolExecutionRecords.forEach((record, id) => {
      if (record.agentLoopId === agentLoopId) {
        toolKeysToDelete.push(id);
      }
    });

    errorKeysToDelete.forEach(id => this.errorRecords.delete(id));
    interruptionKeysToDelete.forEach(id => this.interruptionRecords.delete(id));
    toolKeysToDelete.forEach(id => this.toolExecutionRecords.delete(id));

    logger.debug("Cleared execution history for agent loop", { agentLoopId });
  }

  /**
   * Build an ExecutionEvent from a record
   * @param record Error, interruption, or tool execution record
   * @param type Event type
   * @returns Execution event
   */
  private buildExecutionEvent(
    record: AgentErrorRecord | AgentInterruptionRecord | ToolExecutionDetail,
    type: ExecutionEventType,
  ): ExecutionEvent {
    if (type === "error") {
      const errorRecord = record as AgentErrorRecord;
      return {
        id: errorRecord.id,
        type: "error",
        agentLoopId: errorRecord.agentLoopId,
        timestamp: errorRecord.timestamp,
        iteration: errorRecord.iteration,
        severity: (errorRecord.severity === "error" ? "high" : errorRecord.severity === "warning" ? "medium" : "info") as
          | "critical"
          | "high"
          | "medium"
          | "low"
          | "info",
        message: errorRecord.message,
        data: errorRecord,
      };
    } else if (type === "interruption") {
      const interruptionRecord = record as AgentInterruptionRecord;
      return {
        id: interruptionRecord.id,
        type: "interruption",
        agentLoopId: interruptionRecord.agentLoopId,
        timestamp: interruptionRecord.timestamp,
        iteration: interruptionRecord.iteration,
        severity: interruptionRecord.type === "STOP" ? "high" : "medium",
        message: interruptionRecord.reason,
        data: interruptionRecord,
      };
    } else {
      const toolRecord = record as ToolExecutionDetail;
      return {
        id: toolRecord.id,
        type: "tool_execution",
        agentLoopId: toolRecord.agentLoopId,
        timestamp: toolRecord.startTime,
        iteration: toolRecord.iteration,
        severity: toolRecord.status === "failed" || toolRecord.status === "timeout" ? "high" : "info",
        message: `Tool "${toolRecord.name}" execution ${toolRecord.status}`,
        data: toolRecord,
      };
    }
  }
}
