/**
 * CreateCheckpointCommand - 创建 Agent Loop 检查点命令
 *
 * 职责：
 * - 封装检查点创建操作为 Command 模式
 * - 提供统一的 API 层接口
 * - 支持参数验证
 *
 * 设计原则：
 * - 遵循命令模式，继承 BaseCommand
 * - 依赖注入 AgentLoopRegistry 和 CheckpointResourceAPI
 * - 参数验证在 validate() 方法中完成
 */

import { BaseCommand, CommandValidationResult, validationSuccess, validationFailure } from '../../../shared/types/command.js';
import type { ID, CheckpointMetadata } from '@modular-agent/types';
import { AgentLoopRegistry } from '../../../../agent/services/agent-loop-registry.js';
import { AgentLoopCheckpointResourceAPI } from '../../resources/checkpoint-resource-api.js';
import { getContainer } from '../../../../core/di/index.js';
import * as Identifiers from '../../../../core/di/service-identifiers.js';

/**
 * 创建检查点命令参数
 */
export interface CreateCheckpointParams {
  /** Agent Loop ID */
  agentLoopId: ID;
  /** 检查点元数据 */
  metadata?: CheckpointMetadata;
}

/**
 * 创建检查点命令
 *
 * 工作流程：
 * 1. 验证参数（agentLoopId 必需）
 * 2. 获取 AgentLoopEntity
 * 3. 调用 CheckpointResourceAPI 创建检查点
 * 4. 返回检查点ID
 */
export class CreateCheckpointCommand extends BaseCommand<string> {
  private registry: AgentLoopRegistry;
  private checkpointAPI: AgentLoopCheckpointResourceAPI;

  constructor(
    private readonly params: CreateCheckpointParams,
    checkpointAPI?: AgentLoopCheckpointResourceAPI
  ) {
    super();
    const container = getContainer();
    this.registry = container.get(Identifiers.AgentLoopRegistry);
    this.checkpointAPI = checkpointAPI ?? new AgentLoopCheckpointResourceAPI();
  }

  protected async executeInternal(): Promise<string> {
    // 获取 Agent Loop 实体
    const entity = this.registry.get(this.params.agentLoopId);
    if (!entity) {
      throw new Error(`Agent Loop not found: ${this.params.agentLoopId}`);
    }

    // 创建检查点
    const checkpointId = await this.checkpointAPI.createCheckpoint(entity, {
      metadata: this.params.metadata
    });

    return checkpointId;
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    // 验证：必须提供 agentLoopId
    if (!this.params.agentLoopId) {
      errors.push('必须提供 agentLoopId');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}
