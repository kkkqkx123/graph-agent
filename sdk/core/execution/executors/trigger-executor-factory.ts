/**
 * 触发器执行器工厂
 * 负责根据动作类型创建对应的执行器
 */

import { TriggerActionType } from '../../../types/trigger';
import { BaseTriggerExecutor } from './trigger/base-trigger-executor';
import { StopThreadExecutor } from './trigger/stop-thread-executor';
import { PauseThreadExecutor } from './trigger/pause-thread-executor';
import { ResumeThreadExecutor } from './trigger/resume-thread-executor';
import { SkipNodeExecutor } from './trigger/skip-node-executor';
import { SetVariableExecutor } from './trigger/set-variable-executor';
import { SendNotificationExecutor } from './trigger/send-notification-executor';
import { StartWorkflowExecutor } from './trigger/start-workflow-executor';
import { CustomExecutor } from './trigger/custom-executor';

/**
 * 触发器执行器工厂
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