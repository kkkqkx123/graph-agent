/**
 * PauseAgentLoopCommand - 暂停 Agent 循环命令
 *
 * 职责：
 * - 封装 Agent Loop 暂停操作为 Command 模式
 * - 提供统一的 API 层接口
 * - 支持参数验证
 *
 * 设计原则：
 * - 遵循命令模式，继承 BaseCommand
 * - 依赖注入 AgentLoopRegistry
 * - 参数验证在 validate() 方法中完成
 */

import { BaseCommand, CommandValidationResult, validationSuccess, validationFailure } from '../../shared/types/command.js';
import type { ID } from '@modular-agent/types';
import { AgentLoopRegistry } from '../../../agent/services/agent-loop-registry.js';
import { getContainer } from '../../../core/di/index.js';
import * as Identifiers from '../../../core/di/service-identifiers.js';

/**
 * 暂停 Agent 循环命令参数
 */
export interface PauseAgentLoopParams {
  /** Agent Loop ID */
  agentLoopId: ID;
}

/**
 * 暂停 Agent 循环命令
 *
 * 工作流程：
 * 1. 验证参数（agentLoopId 必需）
 * 2. 获取 AgentLoopEntity
 * 3. 调用 pause() 方法暂停执行
 * 4. 返回暂停结果
 */
export class PauseAgentLoopCommand extends BaseCommand<void> {
  private registry: AgentLoopRegistry;

  constructor(private readonly params: PauseAgentLoopParams) {
    super();
    const container = getContainer();
    this.registry = container.get(Identifiers.AgentLoopRegistry);
  }

  protected async executeInternal(): Promise<void> {
    // 获取 Agent Loop 实体
    const entity = this.registry.get(this.params.agentLoopId);
    if (!entity) {
      throw new Error(`Agent Loop not found: ${this.params.agentLoopId}`);
    }

    // 检查是否可以暂停
    if (!entity.isRunning()) {
      throw new Error(`Agent Loop is not running, cannot pause`);
    }

    // 执行暂停操作
    entity.pause();
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
