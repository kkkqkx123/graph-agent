/**
 * RunAgentLoopCommand - 运行 Agent 循环命令
 *
 * 职责：
 * - 封装 AgentLoopExecutor 的 run() 方法为 Command 模式
 * - 提供统一的 API 层接口
 * - 支持非流式 Agent 执行
 *
 * 设计原则：
 * - 遵循命令模式，继承 BaseCommand
 * - 依赖注入 AgentLoopExecutor
 * - 参数验证在 validate() 方法中完成
 */

import { BaseCommand, CommandValidationResult, validationSuccess, validationFailure } from '../../shared/types/command.js';
import type { AgentLoopConfig, AgentLoopResult } from '@modular-agent/types';
import { AgentLoopExecutor } from '../../../agent/execution/executors/agent-loop-executor.js';
import { AgentLoopEntity } from '../../../agent/entities/agent-loop-entity.js';

/**
 * 运行 Agent 循环命令参数
 */
export interface RunAgentLoopParams {
  /** Agent 循环配置 */
  config: AgentLoopConfig;
}

/**
 * 运行 Agent 循环命令
 *
 * 工作流程：
 * 1. 验证参数（config 必需）
 * 2. 使用 AgentLoopExecutor 执行循环
 * 3. 返回 AgentLoopResult 结果
 */
export class RunAgentLoopCommand extends BaseCommand<AgentLoopResult> {
  constructor(
    private readonly params: RunAgentLoopParams,
    private readonly agentLoopExecutor: AgentLoopExecutor
  ) {
    super();
  }

  protected async executeInternal(): Promise<AgentLoopResult> {
      const entity = new AgentLoopEntity(`command-${Date.now()}`, this.params.config);
      return this.agentLoopExecutor.execute(entity);
  }
  validate(): CommandValidationResult {
    const errors: string[] = [];

    // 验证：必须提供 config
    if (!this.params.config) {
      errors.push('必须提供 config');
    }

    // 验证：profileId 如果提供必须是非空字符串
    if (this.params.config?.profileId !== undefined &&
      typeof this.params.config.profileId === 'string' &&
      this.params.config.profileId.trim().length === 0) {
      errors.push('profileId 不能为空字符串');
    }

    // 验证：maxIterations 如果提供必须是正整数
    if (this.params.config?.maxIterations !== undefined &&
      (this.params.config.maxIterations < 1 || !Number.isInteger(this.params.config.maxIterations))) {
      errors.push('maxIterations 必须是正整数');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }
}
