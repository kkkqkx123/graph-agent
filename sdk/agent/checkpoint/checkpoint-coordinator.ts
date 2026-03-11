/**
 * Agent Loop 检查点协调器
 *
 * 无状态服务，协调完整的检查点流程
 */

import type {
  AgentLoopEntity
} from '../entities/agent-loop-entity.js';
import type {
  CheckpointMetadata,
  DeltaStorageConfig,
  CheckpointType,
  AgentLoopCheckpoint,
  AgentLoopStateSnapshot
} from '@modular-agent/types';
import { CheckpointTypeEnum } from '@modular-agent/types';
import { AgentLoopDiffCalculator } from './agent-loop-diff-calculator.js';
import { AgentLoopDeltaRestorer } from './agent-loop-delta-restorer.js';
import { generateId } from '../../utils/index.js';
import { now } from '@modular-agent/common-utils';

/**
 * 检查点创建选项
 */
export interface CheckpointOptions {
  /** 检查点元数据 */
  metadata?: CheckpointMetadata;
}

/**
 * 检查点依赖项
 */
export interface CheckpointDependencies {
  /** 保存检查点 */
  saveCheckpoint: (checkpoint: AgentLoopCheckpoint) => Promise<string>;
  /** 获取检查点 */
  getCheckpoint: (id: string) => Promise<AgentLoopCheckpoint | null>;
  /** 列出检查点 */
  listCheckpoints: (agentLoopId: string) => Promise<string[]>;
  /** 增量存储配置（可选） */
  deltaConfig?: DeltaStorageConfig;
}

/**
 * 默认增量存储配置
 */
const DEFAULT_DELTA_STORAGE_CONFIG: DeltaStorageConfig = {
  enabled: true,
  baselineInterval: 10,
  maxDeltaChainLength: 20
};

/**
 * Agent Loop 检查点协调器（完全无状态）
 */
export class AgentLoopCheckpointCoordinator {
  private static diffCalculator = new AgentLoopDiffCalculator();

  /**
   * 创建检查点（静态方法）
   * @param entity Agent Loop 实体
   * @param dependencies 依赖项
   * @param options 创建选项
   * @returns 检查点ID
   */
  static async createCheckpoint(
    entity: AgentLoopEntity,
    dependencies: CheckpointDependencies,
    options?: CheckpointOptions
  ): Promise<string> {
    const { saveCheckpoint, getCheckpoint, listCheckpoints, deltaConfig } = dependencies;
    const config = { ...DEFAULT_DELTA_STORAGE_CONFIG, ...deltaConfig };

    // 步骤1：提取当前状态
    const currentState = AgentLoopCheckpointCoordinator.extractState(entity);

    // 步骤2：获取上一个检查点
    const previousCheckpointIds = await listCheckpoints(entity.id);
    const checkpointCount = previousCheckpointIds.length;

    // 步骤3：决定检查点类型
    const checkpointType = AgentLoopCheckpointCoordinator.determineCheckpointType(
      checkpointCount,
      config
    );

    // 步骤4：生成唯一 checkpointId 和 timestamp
    const checkpointId = generateId();
    const timestamp = now();

    // 步骤5：创建检查点
    let checkpoint: AgentLoopCheckpoint;

    if (checkpointType === CheckpointTypeEnum.FULL) {
      // 创建完整检查点
      checkpoint = {
        id: checkpointId,
        agentLoopId: entity.id,
        timestamp,
        type: CheckpointTypeEnum.FULL,
        snapshot: currentState,
        metadata: options?.metadata
      };
    } else {
      // 创建增量检查点
      const previousCheckpointId = previousCheckpointIds[0]!;
      const previousCheckpoint = await getCheckpoint(previousCheckpointId);

      if (!previousCheckpoint) {
        // 如果无法获取上一个检查点，降级为完整检查点
        checkpoint = {
          id: checkpointId,
          agentLoopId: entity.id,
          timestamp,
          type: CheckpointTypeEnum.FULL,
          snapshot: currentState,
          metadata: options?.metadata
        };
      } else {
        // 计算差异
        const delta = AgentLoopCheckpointCoordinator.diffCalculator.calculateDelta(
          previousCheckpoint.snapshot!,
          currentState,
          previousCheckpoint.snapshot!.messages.length,
          entity.getMessages()
        );

        // 找到基线检查点ID
        let baseCheckpointId = previousCheckpoint.baseCheckpointId;
        if (!baseCheckpointId && previousCheckpoint.type === CheckpointTypeEnum.FULL) {
          baseCheckpointId = previousCheckpoint.id;
        }

        checkpoint = {
          id: checkpointId,
          agentLoopId: entity.id,
          timestamp,
          type: CheckpointTypeEnum.DELTA,
          baseCheckpointId,
          previousCheckpointId,
          delta,
          metadata: options?.metadata
        };
      }
    }

    // 步骤6：保存检查点
    return await saveCheckpoint(checkpoint);
  }

  /**
   * 从检查点恢复 Agent Loop 实体（静态方法）
   * @param checkpointId 检查点ID
   * @param dependencies 依赖项
   * @returns 恢复的 Agent Loop 实体
   */
  static async restoreFromCheckpoint(
    checkpointId: string,
    dependencies: CheckpointDependencies
  ): Promise<AgentLoopEntity> {
    const { getCheckpoint } = dependencies;

    // 步骤1：加载检查点
    const checkpoint = await getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    // 步骤2：验证 checkpoint 完整性
    AgentLoopCheckpointCoordinator.validateCheckpoint(checkpoint);

    // 步骤3：获取完整的状态（处理增量检查点）
    const restorer = new AgentLoopDeltaRestorer(dependencies);
    const { stateSnapshot, messages, variables, config } = await restorer.restore(checkpointId);

    // 步骤4：创建 AgentLoopEntity
    const { AgentLoopEntity } = await import('../entities/agent-loop-entity.js');
    const { AgentLoopState } = await import('../entities/agent-loop-state.js');

    const state = new AgentLoopState();
    state.status = stateSnapshot.status;
    (state as any)._currentIteration = stateSnapshot.currentIteration;
    (state as any)._toolCallCount = stateSnapshot.toolCallCount;
    (state as any)._startTime = stateSnapshot.startTime;
    (state as any)._endTime = stateSnapshot.endTime;
    (state as any)._error = stateSnapshot.error;

    const entity = new AgentLoopEntity(checkpointId, config, state);

    // 使用 Manager 设置消息和变量
    entity.messageHistoryManager.setMessages(messages);
    const variablesObj = variables;
    Object.entries(variablesObj).forEach(([key, value]) => {
      entity.setVariable(key, value);
    });

    return entity;
  }

  /**
   * 提取状态快照
   * @param entity Agent Loop 实体
   * @returns 状态快照
   */
  private static extractState(entity: AgentLoopEntity): AgentLoopStateSnapshot {
    return {
      status: entity.state.status,
      currentIteration: entity.state.currentIteration,
      toolCallCount: entity.state.toolCallCount,
      startTime: entity.state.startTime,
      endTime: entity.state.endTime,
      error: entity.state.error,
      messages: entity.messageHistoryManager.getMessages(),
      variables: entity.getAllVariables(),
      config: entity.config
    };
  }

  /**
   * 决定检查点类型
   * @param checkpointCount 当前检查点数量
   * @param config 增量存储配置
   * @returns 检查点类型
   */
  private static determineCheckpointType(
    checkpointCount: number,
    config: DeltaStorageConfig
  ): CheckpointType {
    // 如果未启用增量存储，始终创建完整检查点
    if (!config.enabled) {
      return CheckpointTypeEnum.FULL;
    }

    // 第一个检查点必须是完整检查点
    if (checkpointCount === 0) {
      return CheckpointTypeEnum.FULL;
    }

    // 每隔 baselineInterval 个检查点创建一个完整检查点
    if (checkpointCount % config.baselineInterval === 0) {
      return CheckpointTypeEnum.FULL;
    }

    // 其他情况创建增量检查点
    return CheckpointTypeEnum.DELTA;
  }

  /**
   * 验证检查点完整性和兼容性（静态私有方法）
   */
  private static validateCheckpoint(checkpoint: AgentLoopCheckpoint): void {
    // 验证必需字段
    if (!checkpoint.id || !checkpoint.agentLoopId) {
      throw new Error('Invalid checkpoint: missing required fields');
    }

    // 根据检查点类型验证
    if (checkpoint.type === CheckpointTypeEnum.DELTA) {
      // 增量检查点需要验证 delta 字段
      if (!checkpoint.delta && !checkpoint.previousCheckpointId) {
        throw new Error('Invalid delta checkpoint: missing delta data and previous checkpoint reference');
      }
    } else {
      // 完整检查点需要验证 snapshot 字段
      if (!checkpoint.snapshot) {
        throw new Error('Invalid full checkpoint: missing state snapshot');
      }

      // 验证 snapshot 结构
      const { snapshot } = checkpoint;
      if (!snapshot.status) {
        throw new Error('Invalid checkpoint: incomplete state snapshot');
      }
    }
  }
}