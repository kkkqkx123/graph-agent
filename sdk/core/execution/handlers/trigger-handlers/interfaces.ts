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