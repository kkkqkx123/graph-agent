/**
 * Agent Loop 快照模块
 *
 * 提供独立的快照创建和恢复功能，与实体逻辑解耦。
 * 参考 Graph 引擎的 Checkpoint 机制设计。与checkpoint的职责不同。
 */

import type { ID, LLMMessage, AgentLoopConfig } from '@modular-agent/types';
import { AgentLoopStatus, type IterationRecord } from '@modular-agent/types';

/**
 * Agent Loop 状态快照
 */
export interface AgentLoopStateSnapshot {
  status: AgentLoopStatus;
  currentIteration: number;
  toolCallCount: number;
  startTime: number | null;
  endTime: number | null;
  error: any;
  iterationHistory: IterationRecord[];
}

/**
 * Agent Loop 实体快照
 */
export interface AgentLoopEntitySnapshot {
  id: string;
  config: AgentLoopConfig;
  state: AgentLoopStateSnapshot;
  messages: LLMMessage[];
  variables: Record<string, any>;
  parentThreadId?: ID;
  nodeId?: ID;
}

/**
 * AgentLoopSnapshotManager - 快照管理器
 *
 * 核心职责：
 * - 创建实体快照
 * - 从快照恢复实体状态
 * - 快照序列化/反序列化
 *
 * 设计原则：
 * - 无状态设计
 * - 与实体逻辑解耦
 * - 支持快照版本管理
 */
export class AgentLoopSnapshotManager {
  /**
   * 创建实体快照
   * @param entity Agent Loop 实体数据
   * @returns 快照数据
   */
  static createSnapshot(entity: {
    id: string;
    config: AgentLoopConfig;
    state: {
      status: AgentLoopStatus;
      currentIteration: number;
      toolCallCount: number;
      startTime: number | null;
      endTime: number | null;
      error: any;
      iterationHistory: IterationRecord[];
    };
    messages: LLMMessage[];
    variables: Map<string, any>;
    parentThreadId?: ID;
    nodeId?: ID;
  }): AgentLoopEntitySnapshot {
    return {
      id: entity.id,
      config: { ...entity.config },
      state: {
        status: entity.state.status,
        currentIteration: entity.state.currentIteration,
        toolCallCount: entity.state.toolCallCount,
        startTime: entity.state.startTime,
        endTime: entity.state.endTime,
        error: entity.state.error,
        iterationHistory: entity.state.iterationHistory.map(record => ({
          ...record,
          toolCalls: record.toolCalls.map(tc => ({ ...tc })),
        })),
      },
      messages: [...entity.messages],
      variables: Object.fromEntries(entity.variables),
      parentThreadId: entity.parentThreadId,
      nodeId: entity.nodeId,
    };
  }

  /**
   * 从快照恢复状态数据
   * @param snapshot 快照数据
   * @returns 状态数据
   */
  static restoreState(snapshot: AgentLoopEntitySnapshot): {
    status: AgentLoopStatus;
    currentIteration: number;
    toolCallCount: number;
    startTime: number | null;
    endTime: number | null;
    error: any;
    iterationHistory: IterationRecord[];
  } {
    return {
      status: snapshot.state.status,
      currentIteration: snapshot.state.currentIteration,
      toolCallCount: snapshot.state.toolCallCount,
      startTime: snapshot.state.startTime,
      endTime: snapshot.state.endTime,
      error: snapshot.state.error,
      iterationHistory: snapshot.state.iterationHistory.map(record => ({
        ...record,
        toolCalls: record.toolCalls.map(tc => ({ ...tc })),
      })),
    };
  }

  /**
   * 序列化快照为 JSON
   * @param snapshot 快照数据
   * @returns JSON 字符串
   */
  static serialize(snapshot: AgentLoopEntitySnapshot): string {
    return JSON.stringify(snapshot);
  }

  /**
   * 从 JSON 反序列化快照
   * @param json JSON 字符串
   * @returns 快照数据
   */
  static deserialize(json: string): AgentLoopEntitySnapshot {
    return JSON.parse(json) as AgentLoopEntitySnapshot;
  }

  /**
   * 验证快照完整性
   * @param snapshot 快照数据
   * @returns 是否有效
   */
  static validate(snapshot: AgentLoopEntitySnapshot): boolean {
    if (!snapshot.id || typeof snapshot.id !== 'string') {
      return false;
    }
    if (!snapshot.config) {
      return false;
    }
    if (!snapshot.state) {
      return false;
    }
    if (!Object.values(AgentLoopStatus).includes(snapshot.state.status)) {
      return false;
    }
    return true;
  }
}
