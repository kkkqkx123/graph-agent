/**
 * CancelAgentLoopCommand - 取消 Agent 循环命令
 *
 * 职责：
 * - 封装 Agent Loop 取消操作为 Command 模式
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
 * 取消 Agent 循环命令参数
 */
export interface CancelAgentLoopParams {
  /** Agent Loop ID */
  agentLoopId: ID;
  /** 取消原因 */
  reason?: string;
}

/**
 * 取消 Agent 循环命令
 *
 * 工作流程：
 * 1. 验证参数（agentLoopId 必需）
 * 2. 获取 AgentLoopEntity
 * 3. 调用 stop() 方法取消执行
 * 4. 返回取消结果
 */
export class CancelAgentLoopCommand extends BaseCommand<void> {
  private registry: AgentLoopRegistry;

  constructor(private readonly params: CancelAgentLoopParams) {
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

    // 检查是否可以取消
    if (!entity.isRunning() && !entity.isPaused()) {
      throw new Error(`Agent Loop is not running or paused, cannot cancel`);
    }

    // 执行取消操作
    entity.stop();
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
