/**
 * CreateCheckpointCommand - 创建检查点
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { CheckpointCoordinator } from '../../../../../core/execution/coordinators/checkpoint-coordinator';
import { CheckpointStateManager } from '../../../../../core/execution/managers/checkpoint-state-manager';
import type { Checkpoint, CheckpointMetadata } from '../../../../../types/checkpoint';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';
import { MemoryCheckpointStorage } from '../../../../../core/storage/memory-checkpoint-storage';
import { globalMessageStorage } from '../../../../../core/services/global-message-storage';
import { SingletonRegistry } from '../../../../../core/execution/context/singleton-registry';

/**
 * 创建检查点参数
 */
export interface CreateCheckpointParams {
  /** 线程ID */
  threadId: string;
  /** 检查点元数据 */
  metadata?: CheckpointMetadata;
}

/**
 * CreateCheckpointCommand - 创建检查点
 */
export class CreateCheckpointCommand extends BaseCommand<Checkpoint> {
  private coordinator: CheckpointCoordinator;
  private stateManager: CheckpointStateManager;

  constructor(
    private readonly params: CreateCheckpointParams,
    coordinator?: CheckpointCoordinator,
    stateManager?: CheckpointStateManager
  ) {
    super();

    if (coordinator && stateManager) {
      this.coordinator = coordinator;
      this.stateManager = stateManager;
    } else {
      // 创建默认的检查点管理组件
      const storage = new MemoryCheckpointStorage();
      this.stateManager = new CheckpointStateManager(storage);
      
      // 从SingletonRegistry获取全局服务
      SingletonRegistry.initialize();
      const threadRegistry = SingletonRegistry.get<any>('threadRegistry');
      const workflowRegistry = SingletonRegistry.get<any>('workflowRegistry');
      
      this.coordinator = new CheckpointCoordinator(
        this.stateManager,
        threadRegistry,
        workflowRegistry,
        globalMessageStorage
      );
    }
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'CreateCheckpoint',
      description: '创建线程检查点',
      category: 'management' as const,
      requiresAuth: false,
      version: '1.0.0'
    };
  }

  /**
   * 验证命令参数
   */
  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.params.threadId || this.params.threadId.trim() === '') {
      errors.push('threadId is required and cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  async execute(): Promise<ExecutionResult<Checkpoint>> {
    const startTime = Date.now();

    try {
      const validation = this.validate();
      if (!validation.valid) {
        return failure(validation.errors.join(', '), Date.now() - startTime);
      }

      const checkpointId = await this.coordinator.createCheckpoint(this.params.threadId, this.params.metadata);
      const checkpoint = await this.stateManager.get(checkpointId);
      
      if (!checkpoint) {
        return failure(`Failed to retrieve created checkpoint: ${checkpointId}`, Date.now() - startTime);
      }
      
      return success(checkpoint, Date.now() - startTime);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }
}