/**
 * 中断相关错误类型定义
 * 定义线程中断和操作中止相关的错误类型
 */

import { SDKError, ErrorSeverity } from './base.js';

/**
 * 中断类型
 * 用于 ThreadInterruptedException
 */
export type InterruptionType = 'PAUSE' | 'STOP' | null;

/**
 * 线程中断异常类型
 *
 * 说明：
 * 1. 用于表示线程执行被用户请求中断（暂停或停止）
 * 2. 这是一个控制流异常，不是真正的错误
 * 3. 执行器捕获此异常后，会根据中断类型进行相应处理
 * 4. 中断类型：PAUSE（暂停，可恢复）或 STOP（停止，不可恢复）
 *
 * 使用场景：
 * - 用户调用 pauseThread() 时，执行器在安全点抛出此异常
 * - 用户调用 stopThread() 时，执行器在安全点抛出此异常
 * - NodeExecutionCoordinator 和 LLMExecutionCoordinator 检测到中断标志时抛出
 * - LLMExecutor 和 ToolCallExecutor 捕获 AbortError 后转换为 ThreadInterruptedException
 */
export class ThreadInterruptedException extends SDKError {
  constructor(
    message: string,
    public readonly interruptionType: InterruptionType,
    public readonly threadId?: string,
    public readonly nodeId?: string,
    context?: Record<string, any>
  ) {
    super(message, 'info', { ...context, interruptionType, threadId, nodeId });
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'info';
  }
}

/**
 * AbortError - 操作中止错误
 *
 * 说明：
 * 1. 当AbortSignal被触发时抛出
 * 2. 这是一个控制流异常，不是真正的错误
 * 3. 包含原始的中断原因（ThreadInterruptedException）
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
    public override readonly cause?: ThreadInterruptedException
  ) {
    super(message);
    // 保持正确的原型链
    Object.setPrototypeOf(this, AbortError.prototype);
  }
}