/**
 * 触发器执行器模块统一导出
 * 包含所有触发器执行器和工厂类
 */

import { TriggerActionType } from '../../../../types/trigger';
import { BaseTriggerExecutor } from './base-trigger-executor';
import { StopThreadExecutor } from './stop-thread-executor';
import { PauseThreadExecutor } from './pause-thread-executor';
import { ResumeThreadExecutor } from './resume-thread-executor';
import { SkipNodeExecutor } from './skip-node-executor';
import { SetVariableExecutor } from './set-variable-executor';
import { SendNotificationExecutor } from './send-notification-executor';
import { StartWorkflowExecutor } from './start-workflow-executor';
import { CustomExecutor } from './custom-executor';

/**
 * 触发器执行器工厂
 * 负责根据动作类型创建对应的执行器
 */
export class TriggerExecutorFactory {
  private static executorMap: Map<TriggerActionType, new () => BaseTriggerExecutor> = new Map();

  /**
   * 初始化执行器映射
   */
  private static initializeExecutorMap(): void {
    // 注册所有触发器执行器
    this.executorMap.set(TriggerActionType.STOP_THREAD, StopThreadExecutor);
    this.executorMap.set(TriggerActionType.PAUSE_THREAD, PauseThreadExecutor);
    this.executorMap.set(TriggerActionType.RESUME_THREAD, ResumeThreadExecutor);
    this.executorMap.set(TriggerActionType.SKIP_NODE, SkipNodeExecutor);
    this.executorMap.set(TriggerActionType.SET_VARIABLE, SetVariableExecutor);
    this.executorMap.set(TriggerActionType.SEND_NOTIFICATION, SendNotificationExecutor);
    this.executorMap.set(TriggerActionType.START_WORKFLOW, StartWorkflowExecutor);
    this.executorMap.set(TriggerActionType.CUSTOM, CustomExecutor);
  }

  /**
   * 创建触发器执行器
   * @param actionType 动作类型
   * @returns 触发器执行器实例
   */
  static createExecutor(actionType: TriggerActionType): BaseTriggerExecutor {
    // 确保映射已初始化
    if (this.executorMap.size === 0) {
      this.initializeExecutorMap();
    }

    const ExecutorClass = this.executorMap.get(actionType);
    if (!ExecutorClass) {
      throw new Error(`No executor found for trigger action type: ${actionType}`);
    }

    return new ExecutorClass();
  }

  /**
   * 注册自定义执行器
   * @param actionType 动作类型
   * @param ExecutorClass 执行器类
   */
  static registerExecutor(
    actionType: TriggerActionType,
    ExecutorClass: new () => BaseTriggerExecutor
  ): void {
    this.executorMap.set(actionType, ExecutorClass);
  }

  /**
   * 检查是否支持该动作类型
   * @param actionType 动作类型
   * @returns 是否支持
   */
  static isSupported(actionType: TriggerActionType): boolean {
    if (this.executorMap.size === 0) {
      this.initializeExecutorMap();
    }
    return this.executorMap.has(actionType);
  }

  /**
   * 获取所有支持的动作类型
   * @returns 动作类型数组
   */
  static getSupportedActionTypes(): TriggerActionType[] {
    if (this.executorMap.size === 0) {
      this.initializeExecutorMap();
    }
    return Array.from(this.executorMap.keys());
  }
}

// 导出所有执行器类
export { BaseTriggerExecutor } from './base-trigger-executor';
export { StopThreadExecutor } from './stop-thread-executor';
export { PauseThreadExecutor } from './pause-thread-executor';
export { ResumeThreadExecutor } from './resume-thread-executor';
export { SkipNodeExecutor } from './skip-node-executor';
export { SetVariableExecutor } from './set-variable-executor';
export { SendNotificationExecutor } from './send-notification-executor';
export { StartWorkflowExecutor } from './start-workflow-executor';
export { CustomExecutor } from './custom-executor';