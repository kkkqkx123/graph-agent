/**
 * 增量检查点恢复器
 * 用于从增量检查点恢复完整状态
 */

import { CheckpointNotFoundError } from '@modular-agent/types';
import type { Checkpoint, ThreadStateSnapshot, CheckpointDelta } from '@modular-agent/types';
import { CheckpointType } from '@modular-agent/types';
import type { CheckpointStateManager } from '../managers/checkpoint-state-manager.js';

/**
 * 增量检查点恢复器依赖项
 */
export interface DeltaRestorerDependencies {
  checkpointStateManager: CheckpointStateManager;
}

/**
 * 增量检查点恢复器
 */
export class DeltaCheckpointRestorer {
  private checkpointStateManager: CheckpointStateManager;

  constructor(dependencies: DeltaRestorerDependencies) {
    this.checkpointStateManager = dependencies.checkpointStateManager;
  }

  /**
   * 从检查点恢复完整状态
   * @param checkpointId 检查点ID
   * @returns 完整的线程状态快照
   */
  async restore(checkpointId: string): Promise<ThreadStateSnapshot> {
    const checkpoint = await this.checkpointStateManager.get(checkpointId);
    if (!checkpoint) {
      throw new CheckpointNotFoundError('Checkpoint not found', checkpointId);
    }

    // 如果是完整检查点，直接返回
    if (!checkpoint.type || checkpoint.type === CheckpointType.FULL) {
      return checkpoint.threadState!;
    }

    // 如果是增量检查点，需要链式恢复
    return this.restoreDeltaCheckpoint(checkpoint);
  }

  /**
   * 链式恢复增量检查点
   * @param deltaCheckpoint 增量检查点
   * @returns 完整的线程状态快照
   */
  private async restoreDeltaCheckpoint(
    deltaCheckpoint: Checkpoint
  ): Promise<ThreadStateSnapshot> {
    // 1. 找到基线检查点
    const baseCheckpoint = await this.findBaseCheckpoint(deltaCheckpoint);

    // 2. 从基线开始，依次应用增量
    let state = baseCheckpoint.threadState!;
    const deltaChain = await this.buildDeltaChain(
      baseCheckpoint.id,
      deltaCheckpoint.id
    );

    for (const delta of deltaChain) {
      state = this.applyDelta(state, delta);
    }

    return state;
  }

  /**
   * 找到基线检查点
   * @param checkpoint 起始检查点
   * @returns 基线检查点
   */
  private async findBaseCheckpoint(
    checkpoint: Checkpoint
  ): Promise<Checkpoint> {
    // 如果有 baseCheckpointId，直接获取
    if (checkpoint.baseCheckpointId) {
      const baseCheckpoint = await this.checkpointStateManager.get(
        checkpoint.baseCheckpointId
      );
      if (baseCheckpoint) {
        return baseCheckpoint;
      }
    }

    // 否则，沿着 previousCheckpointId 链向上查找
    let current = checkpoint;
    while (current.previousCheckpointId) {
      const prevCheckpoint = await this.checkpointStateManager.get(
        current.previousCheckpointId
      );
      if (!prevCheckpoint) {
        throw new CheckpointNotFoundError(
          'Previous checkpoint not found',
          current.previousCheckpointId
        );
      }

      // 找到完整检查点
      if (!prevCheckpoint.type || prevCheckpoint.type === CheckpointType.FULL) {
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
  ): Promise<CheckpointDelta[]> {
    const deltaChain: CheckpointDelta[] = [];
    let currentId = targetCheckpointId;

    // 从目标检查点向基线检查点遍历，收集增量
    while (currentId && currentId !== baseCheckpointId) {
      const checkpoint = await this.checkpointStateManager.get(currentId);
      if (!checkpoint) {
        throw new CheckpointNotFoundError('Checkpoint not found', currentId);
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
    state: ThreadStateSnapshot,
    delta: CheckpointDelta
  ): ThreadStateSnapshot {
    const newState = { ...state };

    // 应用消息增量
    if (delta.addedMessages && delta.addedMessages.length > 0) {
      newState.conversationState = {
        ...newState.conversationState,
        messages: [
          ...newState.conversationState.messages,
          ...delta.addedMessages
        ]
      };
    }

    // 应用消息修改
    if (delta.modifiedMessages && delta.modifiedMessages.size > 0) {
      const messages = [...newState.conversationState.messages];
      for (const [index, message] of delta.modifiedMessages) {
        if (index >= 0 && index < messages.length) {
          messages[index] = message;
        }
      }
      newState.conversationState = {
        ...newState.conversationState,
        messages
      };
    }

    // 应用消息删除
    if (delta.deletedMessageIndices && delta.deletedMessageIndices.length > 0) {
      const messages = newState.conversationState.messages.filter(
        (_, index) => !delta.deletedMessageIndices!.includes(index)
      );
      newState.conversationState = {
        ...newState.conversationState,
        messages
      };
    }

    // 应用变量增量
    if (delta.addedVariables && delta.addedVariables.length > 0) {
      newState.variables = [...newState.variables, ...delta.addedVariables];
    }

    // 应用变量修改
    if (delta.modifiedVariables && delta.modifiedVariables.size > 0) {
      newState.variables = newState.variables.map(v => {
        const modified = delta.modifiedVariables!.get(v.name);
        return modified ? { ...v, value: modified } : v;
      });
    }

    // 应用节点结果增量
    if (delta.addedNodeResults) {
      newState.nodeResults = {
        ...newState.nodeResults,
        ...delta.addedNodeResults
      };
    }

    // 应用状态变更
    if (delta.statusChange) {
      newState.status = delta.statusChange.to;
    }

    // 应用当前节点变更
    if (delta.currentNodeChange) {
      newState.currentNodeId = delta.currentNodeChange.to;
    }

    // 应用其他变更
    if (delta.otherChanges) {
      for (const [key, change] of Object.entries(delta.otherChanges)) {
        (newState as any)[key] = change.to;
      }
    }

    return newState;
  }
}
