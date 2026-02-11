/**
 * Thread状态转换验证工具函数
 * 
 * 职责：
 * - 定义允许的状态转换规则
 * - 提供状态转换验证接口
 * - 提供状态查询工具函数
 * 
 * 设计原则：
 * - 纯函数：无副作用，同一输入产生同一输出
 * - 可复用：被ThreadLifecycleManager和ThreadLifecycleCoordinator共用
 * - 简洁：导出具体函数而非类
 */

import type { ThreadStatus } from '@modular-agent/types/thread';
import { ValidationError } from '@modular-agent/types/errors';

/**
 * 状态转换规则定义
 * CREATED → RUNNING
 * RUNNING → PAUSED | COMPLETED | FAILED | CANCELLED | TIMEOUT
 * PAUSED → RUNNING | CANCELLED | TIMEOUT
 * COMPLETED/FAILED/CANCELLED/TIMEOUT → 终止状态，不可转换
 */
const STATE_TRANSITIONS: Record<string, string[]> = {
  'CREATED': ['RUNNING'],
  'RUNNING': ['PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'],
  'PAUSED': ['RUNNING', 'CANCELLED', 'TIMEOUT'],
  'COMPLETED': [],
  'FAILED': [],
  'CANCELLED': [],
  'TIMEOUT': []
};

/**
 * 检查状态转换是否合法
 * 
 * @param currentStatus 当前状态
 * @param targetStatus 目标状态
 * @returns 是否允许转换
 */
export function isValidTransition(currentStatus: ThreadStatus, targetStatus: ThreadStatus): boolean {
  const allowedTransitions = STATE_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(targetStatus);
}

/**
 * 验证状态转换，不合法时抛出错误
 * 
 * @param threadId Thread ID（用于错误信息）
 * @param currentStatus 当前状态
 * @param targetStatus 目标状态
 * @throws ValidationError 状态转换不合法
 */
export function validateTransition(
  threadId: string,
  currentStatus: ThreadStatus,
  targetStatus: ThreadStatus
): void {
  if (!isValidTransition(currentStatus, targetStatus)) {
    throw new ValidationError(
      `Invalid state transition: ${currentStatus} -> ${targetStatus}`,
      'thread.status',
      currentStatus,
      { threadId, currentStatus, targetStatus }
    );
  }
}

/**
 * 获取当前状态允许的转换目标
 * 
 * @param currentStatus 当前状态
 * @returns 允许的目标状态数组
 */
export function getAllowedTransitions(currentStatus: ThreadStatus): ThreadStatus[] {
  return (STATE_TRANSITIONS[currentStatus] || []) as ThreadStatus[];
}

/**
 * 检查状态是否为终止状态
 * 
 * @param status 状态
 * @returns 是否为终止状态
 */
export function isTerminalStatus(status: ThreadStatus): boolean {
  return ['COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'].includes(status);
}

/**
 * 检查状态是否为活跃状态（可被中断）
 * 
 * @param status 状态
 * @returns 是否为活跃状态
 */
export function isActiveStatus(status: ThreadStatus): boolean {
  return ['RUNNING', 'PAUSED'].includes(status);
}
