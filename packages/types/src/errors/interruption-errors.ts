/**
 * 中断相关错误类型定义
 * 定义执行中断和操作中止相关的错误类型
 */

import { SDKError, ErrorSeverity } from './base.js';

/**
 * 中断类型
 */
export type InterruptionType = 'PAUSE' | 'STOP' | null;

/**
 * 中断异常基类
 *
 * 说明：
 * 1. 通用的执行中断异常基类
 * 2. 这是一个控制流异常，不是真正的错误
 * 3. 中断类型：PAUSE（暂停，可恢复）或 STOP（停止，不可恢复）
 * 4. 子类可以添加特定模块的上下文信息
 *
 * 使用场景：
 * - ThreadInterruptedException: Graph 模块的线程中断
 * - AgentInterruptedException: Agent 模块的会话中断
 */
export class InterruptedException extends SDKError {
  constructor(
    message: string,
    public readonly interruptionType: InterruptionType,
    context?: Record<string, any>
  ) {
    super(message, 'info', { ...context, interruptionType });
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'info';
  }
}

/**
 * 线程中断异常类型（Graph 模块）
 *
 * 说明：
 * 1. 用于表示 Graph 模块中线程执行被用户请求中断（暂停或停止）
 * 2. 继承自 InterruptedException，添加 Graph 模块特有的上下文
 * 3. 执行器捕获此异常后，会根据中断类型进行相应处理
 *
 * 使用场景：
 * - 用户调用 pauseThread() 时，执行器在安全点抛出此异常
 * - 用户调用 stopThread() 时，执行器在安全点抛出此异常
 * - ThreadExecutionCoordinator 检测到中断标志时抛出
 * - ToolCallExecutor 捕获 AbortError 后转换为 ThreadInterruptedException
 */
export class ThreadInterruptedException extends InterruptedException {
  constructor(
    message: string,
    interruptionType: InterruptionType,
    public readonly threadId?: string,
    public readonly nodeId?: string,
    context?: Record<string, any>
  ) {
    super(message, interruptionType, { ...context, threadId, nodeId });
  }
}

/**
 * Agent 中断异常类型（Agent 模块）
 *
 * 说明：
 * 1. 用于表示 Agent 模块中执行被用户请求中断（暂停或停止）
 * 2. 继承自 InterruptedException，添加 Agent 模块特有的上下文
 * 3. AgentLoopService 检测到中断标志时抛出
 *
 * 使用场景：
 * - 用户调用 pauseConversation() 时，执行器在安全点抛出此异常
 * - 用户调用 stopConversation() 时，执行器在安全点抛出此异常
 * - AgentLoopService 检测到中断标志时抛出
 */
export class AgentInterruptedException extends InterruptedException {
  constructor(
    message: string,
    interruptionType: InterruptionType,
    public readonly conversationId?: string,
    public readonly sessionId?: string,
    context?: Record<string, any>
  ) {
    super(message, interruptionType, { ...context, conversationId, sessionId });
  }
}

/**
 * AbortError - 操作中止错误
 *
 * 说明：
 * 1. 当AbortSignal被触发时抛出
 * 2. 这是一个控制流异常，不是真正的错误
 * 3. 包含原始的中断原因（InterruptedException 或其子类）
 *
 * 使用场景：
 * - TimeoutController检测到AbortSignal时抛出
 * - HTTP请求被中止时抛出
 * - LLM调用被中止时抛出
 * - 工具执行被中止时抛出
 */
export class AbortError extends Error {
  public override readonly name = 'AbortError';
  
  constructor(
    message: string,
    public override readonly cause?: InterruptedException
  ) {
    super(message);
    // 保持正确的原型链
    Object.setPrototypeOf(this, AbortError.prototype);
  }
}