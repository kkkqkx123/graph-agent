/**
 * RestoreCheckpointCommand - 从检查点恢复 Agent Loop 命令
 *
 * 职责：
 * - 封装检查点恢复操作为 Command 模式
 * - 提供统一的 API 层接口
 * - 支持参数验证
 *
 * 设计原则：
 * - 遵循命令模式，继承 BaseCommand
 * - 依赖注入 CheckpointResourceAPI
 * - 参数验证在 validate() 方法中完成
 */

import { BaseCommand, CommandValidationResult, validationSuccess, validationFailure } from '../../../shared/types/command.js';
import type { AgentLoopEntity } from '../../../../agent/entities/agent-loop-entity.js';
import { AgentLoopCheckpointResourceAPI } from '../../resources/checkpoint-resource-api.js';

/**
 * 从检查点恢复命令参数
 */
export interface RestoreCheckpointParams {
  /** 检查点ID */
  checkpointId: string;
}

/**
 * 从检查点恢复命令
 *
 * 工作流程：
 * 1. 验证参数（checkpointId 必需）
 * 2. 调用 CheckpointResourceAPI 恢复检查点
 * 3. 返回恢复的 AgentLoopEntity
 */
export class RestoreCheckpointCommand extends BaseCommand<AgentLoopEntity> {
  private checkpointAPI: AgentLoopCheckpointResourceAPI;

  constructor(
    private readonly params: RestoreCheckpointParams,
    checkpointAPI?: AgentLoopCheckpointResourceAPI
  ) {
    super();
    this.checkpointAPI = checkpointAPI ?? new AgentLoopCheckpointResourceAPI();
  }

  protected async executeInternal(): Promise<AgentLoopEntity> {
    // 从检查点恢复
    const entity = await this.checkpointAPI.restoreFromCheckpoint(this.params.checkpointId);
    return entity;
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    // 验证：必须提供 checkpointId
    if (!this.params.checkpointId || this.params.checkpointId.trim() === '') {
      errors.push('检查点ID不能为空');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}
