import { NodeStatus } from '../value-objects/node-status';

/**
 * 节点执行结果接口
 *
 * 表示节点执行后的结果，包含状态、结果数据、错误信息等
 */
export interface NodeExecutionResult {
  /** 执行状态 */
  status: NodeStatus;
  /** 执行结果 */
  result?: unknown;
  /** 错误信息 */
  error?: Error;
  /** 执行时长（毫秒） */
  executionTime: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 创建成功的节点执行结果
 * @param result 执行结果
 * @param executionTime 执行时长
 * @param metadata 元数据
 * @returns 节点执行结果
 */
export function createSuccessResult(
  result: unknown,
  executionTime: number,
  metadata?: Record<string, unknown>
): NodeExecutionResult {
  return {
    status: NodeStatus.completed(),
    result,
    executionTime,
    metadata
  };
}

/**
 * 创建失败的节点执行结果
 * @param error 错误信息
 * @param executionTime 执行时长
 * @param metadata 元数据
 * @returns 节点执行结果
 */
export function createFailureResult(
  error: Error,
  executionTime: number,
  metadata?: Record<string, unknown>
): NodeExecutionResult {
  return {
    status: NodeStatus.failed(),
    error,
    executionTime,
    metadata
  };
}

/**
 * 创建跳过的节点执行结果
 * @param reason 跳过原因
 * @param executionTime 执行时长
 * @param metadata 元数据
 * @returns 节点执行结果
 */
export function createSkippedResult(
  reason: string,
  executionTime: number,
  metadata?: Record<string, unknown>
): NodeExecutionResult {
  return {
    status: NodeStatus.skipped(),
    result: { skipped: true, reason },
    executionTime,
    metadata
  };
}