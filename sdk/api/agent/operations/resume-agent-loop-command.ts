/**
 * ResumeAgentLoopCommand - 恢复 Agent 循环命令
 *
 * 职责：
 * - 封装 Agent Loop 恢复操作为 Command 模式
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
 * 恢复 Agent 循环命令参数
 */
export interface ResumeAgentLoopParams {
  /** Agent Loop ID */
  agentLoopId: ID;
}

/**
 * 恢复 Agent 循环命令
 *
 * 工作流程：
 * 1. 验证参数（agentLoopId 必需）
 * 2. 获取 AgentLoopEntity
 * 3. 调用 resume() 方法恢复执行
 * 4. 返回恢复结果
 */
export class ResumeAgentLoopCommand extends BaseCommand<void> {
  private registry: AgentLoopRegistry;

  constructor(private readonly params: ResumeAgentLoopParams) {
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

    // 检查是否可以恢复
    if (!entity.isPaused()) {
      throw new Error(`Agent Loop is not paused, cannot resume`);
    }

    // 执行恢复操作
    entity.resume();
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
