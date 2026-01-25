/**
 * 历史记录管理器
 * 负责Thread执行历史的记录和查询
 */

import type { NodeExecutionResult, ExecutionHistoryEntry } from '../../types/thread';
import type { ToolCall } from '../../types/tool';

/**
 * 历史记录管理器
 */
export class HistoryManager {
  private executionHistories: Map<string, ExecutionHistoryEntry[]> = new Map();
  private nodeHistories: Map<string, Map<string, NodeExecutionResult[]>> = new Map();
  private toolHistories: Map<string, ToolCall[]> = new Map();
  private errorHistories: Map<string, any[]> = new Map();
  private stepCounters: Map<string, number> = new Map();

  /**
   * 记录节点执行历史
   */
  recordNodeExecution(
    threadId: string,
    nodeId: string,
    nodeType: string,
    result: NodeExecutionResult,
    input?: any
  ): void {
    // 记录执行历史
    if (!this.executionHistories.has(threadId)) {
      this.executionHistories.set(threadId, []);
    }

    const step = this.getStepCounter(threadId);
    const history: ExecutionHistoryEntry = {
      step,
      nodeId,
      nodeType,
      status: result.status,
      timestamp: Date.now(),
      input,
      output: result.output,
      error: result.error
    };

    this.executionHistories.get(threadId)!.push(history);

    // 记录节点历史
    if (!this.nodeHistories.has(threadId)) {
      this.nodeHistories.set(threadId, new Map());
    }

    const nodeHistory = this.nodeHistories.get(threadId)!;
    if (!nodeHistory.has(nodeId)) {
      nodeHistory.set(nodeId, []);
    }

    nodeHistory.get(nodeId)!.push(result);

    // 增加步数计数器
    this.incrementStepCounter(threadId);
  }

  /**
   * 记录工具调用
   */
  recordToolCall(
    threadId: string,
    toolName: string,
    parameters: Record<string, any>,
    result?: any,
    error?: any,
    executionTime?: number
  ): void {
    if (!this.toolHistories.has(threadId)) {
      this.toolHistories.set(threadId, []);
    }

    const toolCall: ToolCall = {
      id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      toolName,
      parameters,
      result,
      error,
      timestamp: Date.now(),
      executionTime
    };

    this.toolHistories.get(threadId)!.push(toolCall);
  }

  /**
   * 记录错误
   */
  recordError(threadId: string, error: any): void {
    if (!this.errorHistories.has(threadId)) {
      this.errorHistories.set(threadId, []);
    }

    this.errorHistories.get(threadId)!.push({
      message: error.message || String(error),
      stack: error.stack,
      timestamp: Date.now(),
      ...error
    });
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(threadId: string): ExecutionHistoryEntry[] {
    return this.executionHistories.get(threadId) || [];
  }

  /**
   * 获取节点历史
   */
  getNodeHistory(threadId: string, nodeId: string): NodeExecutionResult[] {
    const nodeHistory = this.nodeHistories.get(threadId);
    if (!nodeHistory) {
      return [];
    }

    return nodeHistory.get(nodeId) || [];
  }

  /**
   * 获取工具历史
   */
  getToolHistory(threadId: string): ToolCall[] {
    return this.toolHistories.get(threadId) || [];
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(threadId: string): any[] {
    return this.errorHistories.get(threadId) || [];
  }

  /**
   * 获取步数计数器
   */
  private getStepCounter(threadId: string): number {
    return this.stepCounters.get(threadId) || 0;
  }

  /**
   * 增加步数计数器
   */
  private incrementStepCounter(threadId: string): void {
    const current = this.getStepCounter(threadId);
    this.stepCounters.set(threadId, current + 1);
  }

  /**
   * 获取当前步数
   */
  getCurrentStep(threadId: string): number {
    return this.getStepCounter(threadId);
  }

  /**
   * 清空线程的历史记录
   */
  clearHistory(threadId: string): void {
    this.executionHistories.delete(threadId);
    this.nodeHistories.delete(threadId);
    this.toolHistories.delete(threadId);
    this.errorHistories.delete(threadId);
    this.stepCounters.delete(threadId);
  }

  /**
   * 获取所有线程ID
   */
  getAllThreadIds(): string[] {
    const threadIds = new Set<string>();
    
    for (const threadId of this.executionHistories.keys()) {
      threadIds.add(threadId);
    }
    
    for (const threadId of this.nodeHistories.keys()) {
      threadIds.add(threadId);
    }
    
    for (const threadId of this.toolHistories.keys()) {
      threadIds.add(threadId);
    }
    
    for (const threadId of this.errorHistories.keys()) {
      threadIds.add(threadId);
    }

    return Array.from(threadIds);
  }

  /**
   * 获取历史统计信息
   */
  getHistoryStats(threadId: string): {
    totalSteps: number;
    totalNodes: number;
    totalToolCalls: number;
    totalErrors: number;
    nodeExecutionCounts: Record<string, number>;
  } {
    const executionHistory = this.getExecutionHistory(threadId);
    const toolHistory = this.getToolHistory(threadId);
    const errorHistory = this.getErrorHistory(threadId);

    // 统计节点执行次数
    const nodeExecutionCounts: Record<string, number> = {};
    for (const entry of executionHistory) {
      const key = `${entry.nodeType}:${entry.nodeId}`;
      nodeExecutionCounts[key] = (nodeExecutionCounts[key] || 0) + 1;
    }

    return {
      totalSteps: executionHistory.length,
      totalNodes: new Set(executionHistory.map(e => e.nodeId)).size,
      totalToolCalls: toolHistory.length,
      totalErrors: errorHistory.length,
      nodeExecutionCounts
    };
  }
}