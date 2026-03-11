/**
 * Agent Loop 增量检查点恢复器
 *
 * 用于从增量检查点恢复完整状态
 */

import type {
  AgentLoopCheckpoint,
  AgentLoopStateSnapshot,
  AgentLoopDelta
} from '@modular-agent/types';
import type { LLMMessage, AgentLoopConfig, CheckpointType } from '@modular-agent/types';
import { CheckpointTypeEnum } from '@modular-agent/types';

/**
 * 完整检查点数据
 */
interface FullCheckpointData {
  stateSnapshot: AgentLoopStateSnapshot;
  messages: LLMMessage[];
  variables: Record<string, any>;
  config: AgentLoopConfig;
}

/**
 * 增量恢复器依赖项
 */
export interface DeltaRestorerDependencies {
  getCheckpoint: (id: string) => Promise<AgentLoopCheckpoint | null>;
  listCheckpoints: (agentLoopId: string) => Promise<string[]>;
}

/**
 * Agent Loop 增量检查点恢复器
 */
export class AgentLoopDeltaRestorer {
  constructor(private dependencies: DeltaRestorerDependencies) {}

  /**
   * 从检查点恢复完整状态
   * @param checkpointId 检查点ID
   * @returns 完整的检查点数据
   */
  async restore(checkpointId: string): Promise<FullCheckpointData> {
    const checkpoint = await this.dependencies.getCheckpoint(checkpointId);

    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    // 如果是完整检查点，直接返回
    if (!checkpoint.type || checkpoint.type === CheckpointTypeEnum.FULL) {
      return this.extractFullCheckpoint(checkpoint);
    }

    // 如果是增量检查点，需要链式恢复
    return this.restoreDeltaCheckpoint(checkpoint);
  }

  /**
   * 提取完整检查点数据
   * @param checkpoint 检查点
   * @returns 完整的检查点数据
   */
  private extractFullCheckpoint(checkpoint: AgentLoopCheckpoint): FullCheckpointData {
    const snapshot = checkpoint.snapshot!;
    return {
      stateSnapshot: snapshot,
      messages: snapshot.messages,
      variables: snapshot.variables,
      config: snapshot.config || {}
    };
  }

  /**
   * 链式恢复增量检查点
   * @param deltaCheckpoint 增量检查点
   * @returns 完整的检查点数据
   */
  private async restoreDeltaCheckpoint(
    deltaCheckpoint: AgentLoopCheckpoint
  ): Promise<FullCheckpointData> {
    // 1. 找到基线检查点
    const baseCheckpoint = await this.findBaseCheckpoint(deltaCheckpoint);

    // 2. 从基线开始，依次应用增量
    let result = this.extractFullCheckpoint(baseCheckpoint);
    const deltaChain = await this.buildDeltaChain(
      baseCheckpoint.id,
      deltaCheckpoint.id
    );

    for (const delta of deltaChain) {
      result = this.applyDelta(result, delta);
    }

    return result;
  }

  /**
   * 找到基线检查点
   * @param checkpoint 起始检查点
   * @returns 基线检查点
   */
  private async findBaseCheckpoint(
    checkpoint: AgentLoopCheckpoint
  ): Promise<AgentLoopCheckpoint> {
    // 如果有 baseCheckpointId，直接获取
    if (checkpoint.baseCheckpointId) {
      const baseCheckpoint = await this.dependencies.getCheckpoint(
        checkpoint.baseCheckpointId
      );
      if (baseCheckpoint) {
        return baseCheckpoint;
      }
    }

    // 否则，沿着 previousCheckpointId 链向上查找
    let current = checkpoint;
    while (current.previousCheckpointId) {
      const prevCheckpoint = await this.dependencies.getCheckpoint(
        current.previousCheckpointId
      );
      if (!prevCheckpoint) {
        throw new Error(
          `Previous checkpoint not found: ${current.previousCheckpointId}`
        );
      }

      // 找到完整检查点
      if (!prevCheckpoint.type || prevCheckpoint.type === CheckpointTypeEnum.FULL) {
        return prevCheckpoint;
      }

      current = prevCheckpoint;
    }

    // 如果没有找到基线，抛出错误
    throw new Error('No base checkpoint found in the chain');
  }

  /**
   * 构建增量链
   * @param baseCheckpointId 基线检查点ID
   * @param targetCheckpointId 目标检查点ID
   * @returns 增量数据链
   */
  private async buildDeltaChain(
    baseCheckpointId: string,
    targetCheckpointId: string
  ): Promise<AgentLoopDelta[]> {
    const deltaChain: AgentLoopDelta[] = [];
    let currentId = targetCheckpointId;

    // 从目标检查点向基线检查点遍历，收集增量
    while (currentId && currentId !== baseCheckpointId) {
      const checkpoint = await this.dependencies.getCheckpoint(currentId);
      if (!checkpoint) {
        throw new Error(`Checkpoint not found: ${currentId}`);
      }

      if (checkpoint.delta) {
        deltaChain.unshift(checkpoint.delta);
      }

      currentId = checkpoint.previousCheckpointId || '';
    }

    return deltaChain;
  }

  /**
   * 应用增量到状态
   * @param state 当前状态
   * @param delta 增量数据
   * @returns 应用增量后的状态
   */
  private applyDelta(
    state: FullCheckpointData,
    delta: AgentLoopDelta
  ): FullCheckpointData {
    const result = { ...state };

    // 应用消息增量
    if (delta.addedMessages && delta.addedMessages.length > 0) {
      result.messages = [...result.messages, ...delta.addedMessages];
    }

    // 应用状态变更
    if (delta.statusChange) {
      result.stateSnapshot.status = delta.statusChange.to;
    }

    // 应用其他变更
    if (delta.otherChanges) {
      for (const [key, change] of Object.entries(delta.otherChanges)) {
        if (key === 'toolCallCount') {
          result.stateSnapshot.toolCallCount = change.to;
        } else if (key === 'error') {
          result.stateSnapshot.error = change.to;
        } else if (key === 'startTime') {
          result.stateSnapshot.startTime = change.to;
        } else if (key === 'endTime') {
          result.stateSnapshot.endTime = change.to;
        }
      }
    }

    return result;
  }
}