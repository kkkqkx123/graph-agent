/**
 * ExecuteThreadCommand - 执行线程命令
 * 
 * 职责：
 * - 接收工作流ID和执行选项作为输入
 * - 委托给 ThreadLifecycleCoordinator 执行线程
 * - 返回 ThreadResult 作为执行结果
 * 
 * 设计原则：
 * - 遵循命令模式，继承 BaseCommand
 * - 依赖注入 ExecutionContext 和 ThreadLifecycleCoordinator
 * - 参数验证在 validate() 方法中完成
 * - 实际执行逻辑在 executeInternal() 中实现
 * 
 * 注意：
 * - 此命令只负责执行线程，不负责注册工作流
 * - 工作流注册应该通过独立的 API 完成
 * - Thread 是工作流的执行实例，每次执行都会创建新的 Thread
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '@modular-agent/sdk/api/types/command';
import type { ThreadResult, ThreadOptions } from '@modular-agent/types/thread';
import { ThreadLifecycleCoordinator } from '../../core/execution/coordinators/thread-lifecycle-coordinator';
import { ExecutionContext } from '../../core/execution/context/execution-context';

/**
 * 执行线程命令参数
 */
export interface ExecuteThreadParams {
  /** 工作流ID（必需） */
  workflowId: string;
  /** 执行选项 */
  options?: ThreadOptions;
}

/**
 * 执行线程命令
 * 
 * 工作流程：
 * 1. 验证参数（workflowId 必需）
 * 2. 使用 ThreadLifecycleCoordinator 执行线程
 * 3. 返回 ThreadResult 结果
 * 
 * 执行流程：
 * - ThreadLifecycleCoordinator.execute(workflowId, options)
 *   → ThreadBuilder.build(workflowId, options)  // 创建 ThreadContext
 *   → ThreadRegistry.register(threadContext)    // 注册线程
 *   → ThreadLifecycleManager.startThread(thread) // 启动线程
 *   → ThreadExecutor.executeThread(threadContext) // 执行线程
 *   → ThreadLifecycleManager.completeThread/failThread // 完成线程
 */
export class ExecuteThreadCommand extends BaseCommand<ThreadResult> {
  constructor(
    private readonly params: ExecuteThreadParams,
    private readonly executionContext?: ExecutionContext
  ) {
    super();
  }

  protected async executeInternal(): Promise<ThreadResult> {
    // 创建 ThreadLifecycleCoordinator
    const lifecycleCoordinator = new ThreadLifecycleCoordinator(this.executionContext);
    
    // 执行线程（委托给 ThreadLifecycleCoordinator）
    const result = await lifecycleCoordinator.execute(
      this.params.workflowId,
      this.params.options || {}
    );
    
    return result;
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    // 验证：必须提供 workflowId
    if (!this.params.workflowId || this.params.workflowId.trim().length === 0) {
      errors.push('必须提供 workflowId');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'ExecuteThreadCommand',
      description: '执行工作流线程',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }
}