/**
 * 触发器执行器基类
 * 定义触发器执行的标准接口和通用逻辑
 */

import type { TriggerAction, TriggerExecutionResult } from '../../../../types/trigger';
import type { Timestamp } from '../../../../types/common';

/**
 * 触发器执行器基类
 */
export abstract class BaseTriggerExecutor {
  /**
   * 执行触发动作
   * @param action 触发动作
   * @param triggerId 触发器 ID
   * @param threadBuilder 线程构建器（用于构建线程上下文）
   * @returns 执行结果
   */
  abstract execute(
    action: TriggerAction,
    triggerId: string,
  ): Promise<TriggerExecutionResult>;

  /**
   * 验证动作参数
   * @param action 触发动作
   * @returns 是否验证通过
   */
  protected validate(action: TriggerAction): boolean {
    return !!action && !!action.type && !!action.parameters;
  }

  /**
   * 创建成功结果
   * @param triggerId 触发器 ID
   * @param action 触发动作
   * @param result 执行结果数据
   * @param executionTime 执行时间
   * @returns 执行结果
   */
  protected createSuccessResult(
    triggerId: string,
    action: TriggerAction,
    result: any,
    executionTime: Timestamp
  ): TriggerExecutionResult {
    return {
      triggerId,
      success: true,
      action,
      executionTime,
      result,
      metadata: action.metadata
    };
  }

  /**
   * 创建失败结果
   * @param triggerId 触发器 ID
   * @param action 触发动作
   * @param error 错误信息
   * @param executionTime 执行时间
   * @returns 执行结果
   */
  protected createFailureResult(
    triggerId: string,
    action: TriggerAction,
    error: any,
    executionTime: Timestamp
  ): TriggerExecutionResult {
    return {
      triggerId,
      success: false,
      action,
      executionTime,
      error: error instanceof Error ? error.message : String(error),
      metadata: action.metadata
    };
  }
}