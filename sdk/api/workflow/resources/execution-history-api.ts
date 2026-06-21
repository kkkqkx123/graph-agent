/**
 * WorkflowExecutionHistoryAPI - Workflow Execution History Analysis API
 * Consolidates error tracking, node transitions, branch decisions, and tool execution details
 *
 * Provides unified access to all execution events during workflow execution:
 * - Error recording and analysis
 * - Node transition tracking and execution flow
 * - Decision branch point analysis
 * - Tool execution tracking and performance metrics
 *
 * Features:
 * - Unified query interface for all execution events
 * - Timeline view of complete execution history
 * - Statistical analysis across event types
 * - Tool execution performance and dependency tracking
 * - Branch decision path analysis
 */

import { QueryableResourceAPI } from "../../shared/resources/generic-resource-api.js";
import type { APIDependencyManager } from "@sdk/api/shared/core/sdk-dependencies.js";
import type { ID, ToolCallRecord } from "@wf-agent/types";
import { createContextualLogger } from "../../../utils/contextual-logger.js";

const logger = createContextualLogger({ operation: "WorkflowExecutionHistoryAPI" });

// ============================================================================
// Type Definitions: Error Tracking
// ============================================================================

/**
 * Workflow Error Record
 */
export interface WorkflowErrorRecord {
  /** Error ID */
  id: string;
  /** Workflow execution ID */
  executionId: ID;
  /** Error message */
  message: string;
  /** Error severity */
  severity: "error" | "warning" | "info";
  /** Node ID where error occurred */
  nodeId?: string;
  /** Node name where error occurred */
  nodeName?: string;
  /** Operation where error occurred */
  operation: string;
  /** Timestamp */
  timestamp: number;
  /** Is recoverable */
  isRecoverable: boolean;
  /** Error details */
  details?: Record<string, unknown>;
}

/**
 * Workflow Error Filter
 */
export interface WorkflowErrorFilter {
  /** Workflow execution ID list */
  executionIds?: ID[];
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
  /** Filter by node */
  nodeId?: string;
}

/**
 * Workflow Error Statistics
 */
export interface WorkflowErrorStats {
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
  lastError?: WorkflowErrorRecord;
  /** Errors by node */
  byNode: Record<string, number>;
}

// ============================================================================
// Type Definitions: Node Transition Tracking
// ============================================================================

/**
 * Node Execution Status
 */
export type NodeExecutionStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "cancelled";

/**
 * Node Transition Record
 */
export interface NodeTransitionRecord {
  /** Transition ID */
  id: string;
  /** Workflow execution ID */
  executionId: ID;
  /** Source node ID */
  sourceNodeId: string;
  /** Target node ID */
  targetNodeId: string;
  /** Transition timestamp */
  timestamp: number;
  /** Transition reason/trigger */
  reason?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Node Execution Record
 */
export interface NodeExecutionRecord {
  /** Execution record ID */
  id: string;
  /** Workflow execution ID */
  executionId: ID;
  /** Node ID */
  nodeId: string;
  /** Node name */
  nodeName: string;
  /** Node type */
  nodeType: string;
  /** Execution status */
  status: NodeExecutionStatus;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime?: number;
  /** Duration in milliseconds */
  duration?: number;
  /** Node input data */
  input?: Record<string, unknown>;
  /** Node output data */
  output?: unknown;
  /** Retry count */
  retryCount: number;
  /** Error (if failed) */
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Node Transition Filter
 */
export interface NodeTransitionFilter {
  /** Workflow execution ID list */
  executionIds?: ID[];
  /** Source node ID filter */
  sourceNodeId?: string;
  /** Target node ID filter */
  targetNodeId?: string;
  /** Time range */
  timeRange?: {
    start?: number;
    end?: number;
  };
}

/**
 * Node Transition Statistics
 */
export interface NodeTransitionStats {
  /** Total transitions */
  totalTransitions: number;
  /** Most frequent transition paths */
  frequentPaths: Array<{
    from: string;
    to: string;
    count: number;
    percentage: number;
  }>;
  /** Node entry counts */
  nodeEntryCount: Record<string, number>;
  /** Node exit counts */
  nodeExitCount: Record<string, number>;
}

// ============================================================================
// Type Definitions: Decision Branch Analysis
// ============================================================================

/**
 * Branch Decision Point Record
 */
export interface BranchDecisionRecord {
  /** Decision record ID */
  id: string;
  /** Workflow execution ID */
  executionId: ID;
  /** Node ID of decision point */
  decisionNodeId: string;
  /** Available branches */
  branches: Array<{
    id: string;
    name: string;
    targetNodeId?: string;
  }>;
  /** Selected branch ID */
  selectedBranchId: string;
  /** Decision criteria/condition */
  criteria?: Record<string, unknown>;
  /** Decision timestamp */
  timestamp: number;
}

/**
 * Branch Decision Filter
 */
export interface BranchDecisionFilter {
  /** Workflow execution ID list */
  executionIds?: ID[];
  /** Decision node ID filter */
  decisionNodeId?: string;
  /** Time range */
  timeRange?: {
    start?: number;
    end?: number;
  };
}

/**
 * Branch Decision Statistics
 */
export interface BranchDecisionStats {
  /** Total decision points */
  totalDecisions: number;
  /** Decisions by node */
  byNode: Record<string, number>;
  /** Branch selection frequency */
  branchFrequency: Record<string, number>;
  /** Most common branch paths */
  commonPaths: Array<{
    path: string[];
    frequency: number;
    percentage: number;
  }>;
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
export interface WorkflowToolExecutionDetail extends ToolCallRecord {
  /** Workflow execution ID */
  executionId: ID;
  /** Node ID that called this tool */
  nodeId: string;
  /** Execution status */
  status: ToolExecutionStatus;
  /** Duration in milliseconds */
  duration: number;
  /** Tool input parameters */
  input?: Record<string, unknown>;
  /** Tool output result (overrides parent output) */
  result?: unknown;
  /** Dependencies: IDs of tool calls this one depends on */
  dependsOn?: string[];
  /** Exception/error details */
  errorDetails?: {
    code?: string;
    message: string;
    stack?: string;
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
export interface WorkflowToolExecutionFilter {
  /** Workflow execution ID list */
  executionIds?: ID[];
  /** Tool name filter */
  toolName?: string;
  /** Execution status filter */
  status?: ToolExecutionStatus;
  /** Time range for execution */
  timeRange?: {
    start?: number;
    end?: number;
  };
  /** Filter by node ID */
  nodeId?: string;
  /** Filter by tool dependencies */
  hasDependencies?: boolean;
  /** Min duration threshold (ms) */
  minDuration?: number;
  /** Max duration threshold (ms) */
  maxDuration?: number;
}

/**
 * Tool Execution Statistics
 */
export interface WorkflowToolExecutionStats {
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

// ============================================================================
// Unified Execution Event
// ============================================================================

/**
 * Execution Event Type
 */
export type ExecutionEventType = "error" | "node_transition" | "branch_decision" | "tool_execution";

/**
 * Unified Execution Event
 */
export interface WorkflowExecutionEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: ExecutionEventType;
  /** Workflow execution ID */
  executionId: ID;
  /** Event timestamp */
  timestamp: number;
  /** Node ID (if applicable) */
  nodeId?: string;
  /** Event severity/priority */
  severity?: "critical" | "high" | "medium" | "low" | "info";
  /** Event message/description */
  message: string;
  /** Raw event data */
  data: WorkflowErrorRecord | NodeTransitionRecord | BranchDecisionRecord | WorkflowToolExecutionDetail;
}

/**
 * Execution Event Filter
 */
export interface WorkflowExecutionEventFilter {
  /** Workflow execution ID list */
  executionIds?: ID[];
  /** Event type filter */
  type?: ExecutionEventType;
  /** Time range */
  timeRange?: {
    start?: number;
    end?: number;
  };
  /** Node ID filter */
  nodeId?: string;
}

/**
 * Execution Timeline Statistics
 */
export interface WorkflowExecutionTimelineStats {
  /** Total events */
  totalEvents: number;
  /** Events by type */
  byType: Record<ExecutionEventType, number>;
  /** Critical events count */
  criticalCount: number;
  /** Time span (ms) */
  timeSpan: number;
  /** Event frequency (events per minute) */
  eventFrequency: number;
  /** Most critical event */
  mostCriticalEvent?: WorkflowExecutionEvent;
}

// ============================================================================
// API Implementation
// ============================================================================

/**
 * WorkflowExecutionHistoryAPI - Workflow Execution History Analysis API
 */
export class WorkflowExecutionHistoryAPI extends QueryableResourceAPI<
  WorkflowExecutionEvent,
  string,
  WorkflowExecutionEventFilter
> {
  private errorRecords: Map<string, WorkflowErrorRecord> = new Map();
  private nodeTransitionRecords: Map<string, NodeTransitionRecord> = new Map();
  private branchDecisionRecords: Map<string, BranchDecisionRecord> = new Map();
  private toolExecutionRecords: Map<string, WorkflowToolExecutionDetail> = new Map();
  private nodeExecutionRecords: Map<string, NodeExecutionRecord> = new Map();

  /**
   * Constructor
   */
  constructor(deps: APIDependencyManager) {
    super();
    void deps;
  }

  // ============================================================================
  // Implementing Abstract Methods
  // ============================================================================

  /**
   * Get execution event by ID
   */
  protected override async getResource(id: string): Promise<WorkflowExecutionEvent | null> {
    const errorRecord = this.errorRecords.get(id);
    if (errorRecord) {
      return this.buildExecutionEvent(errorRecord, "error");
    }

    const transitionRecord = this.nodeTransitionRecords.get(id);
    if (transitionRecord) {
      return this.buildExecutionEvent(transitionRecord, "node_transition");
    }

    const branchRecord = this.branchDecisionRecords.get(id);
    if (branchRecord) {
      return this.buildExecutionEvent(branchRecord, "branch_decision");
    }

    const toolRecord = this.toolExecutionRecords.get(id);
    if (toolRecord) {
      return this.buildExecutionEvent(toolRecord, "tool_execution");
    }

    return null;
  }

  /**
   * Get all execution events
   */
  protected override async getAllResources(): Promise<WorkflowExecutionEvent[]> {
    const events: WorkflowExecutionEvent[] = [];

    for (const errorRecord of this.errorRecords.values()) {
      events.push(this.buildExecutionEvent(errorRecord, "error"));
    }

    for (const transitionRecord of this.nodeTransitionRecords.values()) {
      events.push(this.buildExecutionEvent(transitionRecord, "node_transition"));
    }

    for (const branchRecord of this.branchDecisionRecords.values()) {
      events.push(this.buildExecutionEvent(branchRecord, "branch_decision"));
    }

    for (const toolRecord of this.toolExecutionRecords.values()) {
      events.push(this.buildExecutionEvent(toolRecord, "tool_execution"));
    }

    return events;
  }

  /**
   * Apply filters to execution events
   */
  protected override applyFilter(
    events: WorkflowExecutionEvent[],
    filter: WorkflowExecutionEventFilter
  ): WorkflowExecutionEvent[] {
    let filtered = events;

    if (filter.executionIds && filter.executionIds.length > 0) {
      const idSet = new Set(filter.executionIds);
      filtered = filtered.filter(e => idSet.has(e.executionId));
    }

    if (filter.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }

    if (filter.nodeId) {
      filtered = filtered.filter(e => e.nodeId === filter.nodeId);
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

    return filtered;
  }

  // ============================================================================
  // Error History Operations
  // ============================================================================

  /**
   * Record a new error
   */
  async recordError(error: WorkflowErrorRecord): Promise<void> {
    this.errorRecords.set(error.id, error);
    logger.debug("Recorded error in execution history", {
      errorId: error.id,
      executionId: error.executionId,
    });
  }

  /**
   * Get error statistics
   */
  async getErrorStats(filter?: WorkflowErrorFilter): Promise<WorkflowErrorStats> {
    let records = Array.from(this.errorRecords.values());

    if (filter) {
      records = this.applyErrorFilter(records, filter);
    }

    const stats: WorkflowErrorStats = {
      totalErrors: records.length,
      bySeverity: {
        error: 0,
        warning: 0,
        info: 0,
      },
      recoverableCount: 0,
      nonRecoverableCount: 0,
      byNode: {},
    };

    records.forEach(record => {
      stats.bySeverity[record.severity]++;
      if (record.isRecoverable) {
        stats.recoverableCount++;
      } else {
        stats.nonRecoverableCount++;
      }
      if (record.nodeId) {
        stats.byNode[record.nodeId] = (stats.byNode[record.nodeId] || 0) + 1;
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
   */
  async queryErrors(filter?: WorkflowErrorFilter): Promise<WorkflowErrorRecord[]> {
    let records = Array.from(this.errorRecords.values());
    if (filter) {
      records = this.applyErrorFilter(records, filter);
    }
    return records.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ============================================================================
  // Node Transition Operations
  // ============================================================================

  /**
   * Record a node transition
   */
  async recordNodeTransition(transition: NodeTransitionRecord): Promise<void> {
    this.nodeTransitionRecords.set(transition.id, transition);
  }

  /**
   * Record node execution
   */
  async recordNodeExecution(execution: NodeExecutionRecord): Promise<void> {
    this.nodeExecutionRecords.set(execution.id, execution);
  }

  /**
   * Get node transition statistics
   */
  async getNodeTransitionStats(filter?: NodeTransitionFilter): Promise<NodeTransitionStats> {
    let transitions = Array.from(this.nodeTransitionRecords.values());

    if (filter) {
      transitions = this.applyTransitionFilter(transitions, filter);
    }

    const stats: NodeTransitionStats = {
      totalTransitions: transitions.length,
      frequentPaths: [],
      nodeEntryCount: {},
      nodeExitCount: {},
    };

    const pathCounts: Record<string, number> = {};

    transitions.forEach(t => {
      const pathKey = `${t.sourceNodeId}->${t.targetNodeId}`;
      pathCounts[pathKey] = (pathCounts[pathKey] || 0) + 1;
      stats.nodeEntryCount[t.targetNodeId] = (stats.nodeEntryCount[t.targetNodeId] || 0) + 1;
      stats.nodeExitCount[t.sourceNodeId] = (stats.nodeExitCount[t.sourceNodeId] || 0) + 1;
    });

    stats.frequentPaths = Object.entries(pathCounts)
      .map(([path, count]) => {
        const [from, to] = path.split("->") as [string, string];
        return {
          from,
          to,
          count,
          percentage: (count / transitions.length) * 100,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Get node execution records
   */
  async getNodeExecutions(executionId: ID): Promise<NodeExecutionRecord[]> {
    return Array.from(this.nodeExecutionRecords.values())
      .filter(e => e.executionId === executionId)
      .sort((a, b) => a.startTime - b.startTime);
  }

  // ============================================================================
  // Branch Decision Operations
  // ============================================================================

  /**
   * Record a branch decision
   */
  async recordBranchDecision(decision: BranchDecisionRecord): Promise<void> {
    this.branchDecisionRecords.set(decision.id, decision);
  }

  /**
   * Get branch decision statistics
   */
  async getBranchDecisionStats(filter?: BranchDecisionFilter): Promise<BranchDecisionStats> {
    let decisions = Array.from(this.branchDecisionRecords.values());

    if (filter) {
      decisions = this.applyBranchDecisionFilter(decisions, filter);
    }

    const stats: BranchDecisionStats = {
      totalDecisions: decisions.length,
      byNode: {},
      branchFrequency: {},
      commonPaths: [],
    };

    decisions.forEach(d => {
      stats.byNode[d.decisionNodeId] = (stats.byNode[d.decisionNodeId] || 0) + 1;
      stats.branchFrequency[d.selectedBranchId] = (stats.branchFrequency[d.selectedBranchId] || 0) + 1;
    });

    return stats;
  }

  // ============================================================================
  // Tool Execution Operations
  // ============================================================================

  /**
   * Record a tool execution
   */
  async recordToolExecution(execution: WorkflowToolExecutionDetail): Promise<void> {
    this.toolExecutionRecords.set(execution.id, execution);
  }

  /**
   * Get tool execution statistics
   */
  async getToolExecutionStats(filter?: WorkflowToolExecutionFilter): Promise<WorkflowToolExecutionStats> {
    let executions = Array.from(this.toolExecutionRecords.values());

    if (filter) {
      executions = this.applyToolExecutionFilter(executions, filter);
    }

    const stats: WorkflowToolExecutionStats = {
      totalExecutions: executions.length,
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
      minExecutionTime: Infinity,
      maxExecutionTime: 0,
      slowestTools: [],
      failingTools: [],
    };

    const durations: number[] = [];
    const toolMetrics: Record<string, { times: number[]; failures: number }> = {};

    executions.forEach(e => {
      if (e.status === "success") stats.successCount++;
      if (e.status === "failed") stats.failureCount++;

      stats.byToolName[e.name] = (stats.byToolName[e.name] || 0) + 1;
      stats.byStatus[e.status] = (stats.byStatus[e.status] || 0) + 1;

      durations.push(e.duration);
      stats.minExecutionTime = Math.min(stats.minExecutionTime, e.duration);
      stats.maxExecutionTime = Math.max(stats.maxExecutionTime, e.duration);

      if (!toolMetrics[e.name]) {
        toolMetrics[e.name] = { times: [], failures: 0 };
      }
      toolMetrics[e.name]!.times.push(e.duration);
      if (e.status === "failed") {
        toolMetrics[e.name]!.failures++;
      }
    });

    if (durations.length > 0) {
      stats.averageExecutionTime = durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    stats.slowestTools = Object.entries(toolMetrics)
      .map(([name, data]) => ({
        toolName: name,
        averageTime: data.times.reduce((a, b) => a + b, 0) / data.times.length,
        count: data.times.length,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);

    stats.failingTools = Object.entries(toolMetrics)
      .map(([name, data]) => ({
        toolName: name,
        failureCount: data.failures,
        failureRate: data.failures / data.times.length,
      }))
      .filter(item => item.failureCount > 0)
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 5);

    return stats;
  }

  /**
   * Query tool executions with filter
   */
  async queryToolExecutions(filter?: WorkflowToolExecutionFilter): Promise<WorkflowToolExecutionDetail[]> {
    let executions = Array.from(this.toolExecutionRecords.values());
    if (filter) {
      executions = this.applyToolExecutionFilter(executions, filter);
    }
    return executions.sort((a, b) => a.startTime - b.startTime);
  }

  // ============================================================================
  // Timeline Operations
  // ============================================================================

  /**
   * Get execution timeline statistics
   */
  async getExecutionTimeline(executionId: ID): Promise<WorkflowExecutionTimelineStats> {
    const allEvents = await this.getAllResources();
    const executionEvents = allEvents.filter(e => e.executionId === executionId);

    const stats: WorkflowExecutionTimelineStats = {
      totalEvents: executionEvents.length,
      byType: {
        error: 0,
        node_transition: 0,
        branch_decision: 0,
        tool_execution: 0,
      },
      criticalCount: 0,
      timeSpan: 0,
      eventFrequency: 0,
    };

    executionEvents.forEach(e => {
      stats.byType[e.type]++;
      if (e.severity === "critical") {
        stats.criticalCount++;
      }
      if (!stats.mostCriticalEvent || (e.severity === "critical" && e.timestamp > stats.mostCriticalEvent!.timestamp)) {
        stats.mostCriticalEvent = e;
      }
    });

    if (executionEvents.length > 1) {
      const sorted = executionEvents.sort((a, b) => a.timestamp - b.timestamp);
      stats.timeSpan = sorted[sorted.length - 1]!.timestamp - sorted[0]!.timestamp;
      stats.eventFrequency = (executionEvents.length / stats.timeSpan) * 60000;
    }

    return stats;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private buildExecutionEvent(
    data: WorkflowErrorRecord | NodeTransitionRecord | BranchDecisionRecord | WorkflowToolExecutionDetail,
    type: ExecutionEventType
  ): WorkflowExecutionEvent {
    let executionId: ID;
    let timestamp: number;
    let nodeId: string | undefined;
    let severity: "critical" | "high" | "medium" | "low" | "info" | undefined;
    let message: string;

    if (type === "error") {
      const err = data as WorkflowErrorRecord;
      executionId = err.executionId;
      timestamp = err.timestamp;
      nodeId = err.nodeId;
      severity = (err.severity === "error" ? "critical" : err.severity) as any;
      message = err.message;
    } else if (type === "node_transition") {
      const trans = data as NodeTransitionRecord;
      executionId = trans.executionId;
      timestamp = trans.timestamp;
      message = `Transition from ${trans.sourceNodeId} to ${trans.targetNodeId}`;
    } else if (type === "branch_decision") {
      const branch = data as BranchDecisionRecord;
      executionId = branch.executionId;
      timestamp = branch.timestamp;
      nodeId = branch.decisionNodeId;
      message = `Branch decision: selected ${branch.selectedBranchId}`;
    } else {
      const tool = data as WorkflowToolExecutionDetail;
      executionId = tool.executionId;
      timestamp = tool.startTime;
      nodeId = tool.nodeId;
      severity = tool.status === "failed" ? "high" : "info";
      message = `Tool execution: ${tool.name}`;
    }

    return {
      id: `${type}-${timestamp}-${Math.random()}`,
      type,
      executionId,
      timestamp,
      nodeId,
      severity,
      message,
      data,
    };
  }

  private applyErrorFilter(records: WorkflowErrorRecord[], filter: WorkflowErrorFilter): WorkflowErrorRecord[] {
    let filtered = records;

    if (filter.executionIds && filter.executionIds.length > 0) {
      const idSet = new Set(filter.executionIds);
      filtered = filtered.filter(e => idSet.has(e.executionId));
    }

    if (filter.severity) {
      filtered = filtered.filter(e => e.severity === filter.severity);
    }

    if (filter.timeRange) {
      if (filter.timeRange.start) {
        filtered = filtered.filter(e => e.timestamp >= filter.timeRange!.start!);
      }
      if (filter.timeRange.end) {
        filtered = filtered.filter(e => e.timestamp <= filter.timeRange!.end!);
      }
    }

    if (filter.onlyRecoverable) {
      filtered = filtered.filter(e => e.isRecoverable);
    }

    if (filter.onlyNonRecoverable) {
      filtered = filtered.filter(e => !e.isRecoverable);
    }

    if (filter.nodeId) {
      filtered = filtered.filter(e => e.nodeId === filter.nodeId);
    }

    return filtered;
  }

  private applyTransitionFilter(
    records: NodeTransitionRecord[],
    filter: NodeTransitionFilter
  ): NodeTransitionRecord[] {
    let filtered = records;

    if (filter.executionIds && filter.executionIds.length > 0) {
      const idSet = new Set(filter.executionIds);
      filtered = filtered.filter(e => idSet.has(e.executionId));
    }

    if (filter.sourceNodeId) {
      filtered = filtered.filter(e => e.sourceNodeId === filter.sourceNodeId);
    }

    if (filter.targetNodeId) {
      filtered = filtered.filter(e => e.targetNodeId === filter.targetNodeId);
    }

    if (filter.timeRange) {
      if (filter.timeRange.start) {
        filtered = filtered.filter(e => e.timestamp >= filter.timeRange!.start!);
      }
      if (filter.timeRange.end) {
        filtered = filtered.filter(e => e.timestamp <= filter.timeRange!.end!);
      }
    }

    return filtered;
  }

  private applyBranchDecisionFilter(
    records: BranchDecisionRecord[],
    filter: BranchDecisionFilter
  ): BranchDecisionRecord[] {
    let filtered = records;

    if (filter.executionIds && filter.executionIds.length > 0) {
      const idSet = new Set(filter.executionIds);
      filtered = filtered.filter(e => idSet.has(e.executionId));
    }

    if (filter.decisionNodeId) {
      filtered = filtered.filter(e => e.decisionNodeId === filter.decisionNodeId);
    }

    if (filter.timeRange) {
      if (filter.timeRange.start) {
        filtered = filtered.filter(e => e.timestamp >= filter.timeRange!.start!);
      }
      if (filter.timeRange.end) {
        filtered = filtered.filter(e => e.timestamp <= filter.timeRange!.end!);
      }
    }

    return filtered;
  }

  private applyToolExecutionFilter(
    records: WorkflowToolExecutionDetail[],
    filter: WorkflowToolExecutionFilter
  ): WorkflowToolExecutionDetail[] {
    let filtered = records;

    if (filter.executionIds && filter.executionIds.length > 0) {
      const idSet = new Set(filter.executionIds);
      filtered = filtered.filter(e => idSet.has(e.executionId));
    }

    if (filter.toolName) {
      filtered = filtered.filter(e => e.name === filter.toolName);
    }

    if (filter.status) {
      filtered = filtered.filter(e => e.status === filter.status);
    }

    if (filter.timeRange) {
      if (filter.timeRange.start) {
        filtered = filtered.filter(e => e.startTime >= filter.timeRange!.start!);
      }
      if (filter.timeRange.end) {
        filtered = filtered.filter(e => e.startTime <= filter.timeRange!.end!);
      }
    }

    if (filter.nodeId) {
      filtered = filtered.filter(e => e.nodeId === filter.nodeId);
    }

    if (filter.hasDependencies) {
      filtered = filtered.filter(e => e.dependsOn && e.dependsOn.length > 0);
    }

    if (filter.minDuration) {
      filtered = filtered.filter(e => e.duration >= filter.minDuration!);
    }

    if (filter.maxDuration) {
      filtered = filtered.filter(e => e.duration <= filter.maxDuration!);
    }

    return filtered;
  }
}
