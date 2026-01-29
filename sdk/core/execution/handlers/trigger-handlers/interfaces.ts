/**
 * 触发器处理器接口定义
 * 定义触发器处理器的统一接口规范
 */

import type { TriggerAction } from '../../../../types/trigger';
import type { TriggerExecutionResult } from '../../../../types/trigger';

/**
 * 触发器处理器类型
 * @param action 触发动作
 * @param triggerId 触发器ID
 * @returns 执行结果
 */
export type TriggerHandler = (
  action: TriggerAction,
  triggerId: string
) => Promise<TriggerExecutionResult>;

/**
 * 触发器处理器接口规范
 * 所有触发器处理器应遵循以下规范：
 * 1. 验证参数
 * 2. 执行动作逻辑
 * 3. 返回标准化的执行结果
 * 4. 统一的错误处理
 */
export interface TriggerHandlerSpec {
  /** 处理器名称 */
  name: string;
  /** 支持的动作类型 */
  actionType: string;
  /** 处理器函数 */
  handler: TriggerHandler;
  /** 描述 */
  description?: string;
  /** 是否需要ThreadContext */
  requiresThreadContext?: boolean;
}

/**
 * 触发器执行结果接口
 */
export interface TriggerExecutionResultSpec {
  /** 触发器ID */
  triggerId: string;
  /** 是否成功 */
  success: boolean;
  /** 触发动作 */
  action: TriggerAction;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 执行结果（成功时） */
  result?: any;
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 触发器处理器注册器接口
 *
 * 注意：这是静态注册机制，用于注册无状态的处理函数
 * - 注册时机：模块加载时自动注册
 * - 生命周期：与应用程序生命周期一致
 * - 状态管理：无状态，纯函数式实现
 *
 * 与TriggerManager的区别：
 * - TriggerHandlerRegistry: 注册处理函数（handlers/）
 * - TriggerManager: 管理触发器实例（managers/）
 */
export interface TriggerHandlerRegistry {
  /** 注册处理器 */
  register(actionType: string, handler: TriggerHandler): void;
  /** 获取处理器 */
  get(actionType: string): TriggerHandler;
  /** 检查处理器是否存在 */
  has(actionType: string): boolean;
  /** 获取所有处理器 */
  getAll(): Record<string, TriggerHandler>;
}