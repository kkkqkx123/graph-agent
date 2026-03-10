/**
 * RunAgentLoopStreamCommand - 运行 Agent 循环流式命令
 *
 * 职责：
 * - 封装 AgentLoopExecutor 的 runStream() 方法为 Command 模式
 * - 提供统一的 API 层接口
 * - 支持流式 Agent 执行
 *
 * 设计原则：
 * - 遵循命令模式，继承 BaseCommand
 * - 依赖注入 AgentLoopExecutor
 * - 返回 AsyncGenerator 用于流式处理
 *
 * 流式事件架构：
 * - 返回 AgentLoopStreamEvent，包含 LLM 层事件和 Agent 层事件
 * - LLM 层事件：text, inputJson, message 等（来自 MessageStream）
 * - Agent 层事件：tool_call_start/end, iteration_complete 等
 */

import { BaseCommand, CommandValidationResult, validationSuccess, validationFailure } from '../../shared/types/command.js';
import type { AgentLoopConfig } from '@modular-agent/types';
import { AgentLoopExecutor, type AgentLoopStreamEvent } from '../../../agent/executors/agent-loop-executor.js';

/**
 * 运行 Agent 循环流式命令参数
 */
export interface RunAgentLoopStreamParams {
  /** Agent 循环配置 */
  config: AgentLoopConfig;
}

/**
 * 运行 Agent 循环流式命令
 *
 * 工作流程：
 * 1. 验证参数（config 必需）
 * 2. 使用 AgentLoopExecutor 执行流式循环
 * 3. 返回 AsyncGenerator<AgentLoopStreamEvent>
 */
export class RunAgentLoopStreamCommand extends BaseCommand<AsyncGenerator<AgentLoopStreamEvent>> {
  constructor(
    private readonly params: RunAgentLoopStreamParams,
    private readonly agentLoopExecutor: AgentLoopExecutor
  ) {
    super();
  }

  protected async executeInternal(): Promise<AsyncGenerator<AgentLoopStreamEvent>> {
    return this.agentLoopExecutor.runStream(this.params.config);
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
