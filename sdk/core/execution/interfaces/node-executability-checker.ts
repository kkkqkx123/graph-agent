/**
 * 节点可执行性检查接口
 * 应用层可实现自定义的可执行性检查逻辑
 */

import type { Thread, Node } from '@modular-agent/types';

/**
 * 执行检查上下文
 */
export interface ExecutionCheckContext {
  /** 额外的上下文信息 */
  metadata?: Record<string, any>;
}

/**
 * 执行检查结果
 */
export interface ExecutionCheckResult {
  /** 是否可执行 */
  canExecute: boolean;
  /** 错误消息（如果不可执行） */
  message?: string;
  /** 额外信息 */
  metadata?: Record<string, any>;
}

/**
 * 节点可执行性检查接口
 */
export interface NodeExecutabilityChecker {
  /**
   * 检查节点是否可执行
   * @param thread 线程实例
   * @param node 节点定义
   * @param context 执行检查上下文
   * @returns 执行检查结果
   */
  canExecute(
    thread: Thread,
    node: Node,
    context?: ExecutionCheckContext
  ): ExecutionCheckResult;
}

/**
 * SDK提供的默认实现
 */
export class DefaultNodeExecutabilityChecker implements NodeExecutabilityChecker {
  /**
   * 检查节点是否可执行
   */
  canExecute(
    thread: Thread,
    node: Node,
    context?: ExecutionCheckContext
  ): ExecutionCheckResult {
    // 基础检查：线程必须处于RUNNING状态
    if (thread.status !== 'RUNNING') {
      return {
        canExecute: false,
        message: `Thread is in ${thread.status} state, expected RUNNING`
      };
    }
    
    // 节点默认都是可执行的
    // 如果需要禁用节点，可以通过其他机制（如条件路由）来实现
    return { canExecute: true };
  }
}