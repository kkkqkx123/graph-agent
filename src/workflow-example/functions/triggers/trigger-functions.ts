/**
 * 触发器函数实现
 * 
 * 本文件实现了图工作流中的各种触发器函数
 */

import {
  TriggerFunction,
  TriggerInput,
  TriggerConfig,
  TriggerOutput,
  ExecutionContext,
  WorkflowEngine,
  TimeTriggerConfig,
  EventTriggerConfig,
  StateTriggerConfig
} from '../../types/workflow-types';

// ============================================================================
// 类型守卫函数
// ============================================================================

/**
 * 检查是否为时间触发器配置
 */
function isTimeTriggerConfig(config: TriggerConfig): config is TimeTriggerConfig {
  return 'delay' in config || 'interval' in config || 'cron' in config;
}

/**
 * 检查是否为事件触发器配置
 */
function isEventTriggerConfig(config: TriggerConfig): config is EventTriggerConfig {
  return 'eventType' in config;
}

/**
 * 检查是否为状态触发器配置
 */
function isStateTriggerConfig(config: TriggerConfig): config is StateTriggerConfig {
  return 'statePath' in config;
}

// ============================================================================
// 时间触发器函数
// ============================================================================

/**
 * 时间触发器函数
 * 基于时间条件触发
 * 
 * @param input 触发器输入
 * @param config 触发器配置
 * @param context 执行上下文
 * @returns 触发器输出
 */
export const timeTriggerFunction: TriggerFunction = async (
  input: TriggerInput,
  config: TriggerConfig,
  context: ExecutionContext
): Promise<TriggerOutput> => {
  try {
    // 类型守卫：检查是否是时间触发器配置
    if (!isTimeTriggerConfig(config)) {
      return {
        shouldTrigger: false,
        reason: '配置类型错误，期望为TimeTriggerConfig'
      };
    }

    const delay = config.delay;
    const interval = config.interval;
    const cron = config.cron;

    // 检查延迟触发
    if (delay !== undefined) {
      const shouldTrigger = checkDelayMet(delay, context);
      return {
        shouldTrigger,
        reason: shouldTrigger
          ? `延迟时间已达到: ${delay}ms`
          : `延迟时间未达到: ${delay}ms`
      };
    }

    // 检查间隔触发
    if (interval !== undefined) {
      const shouldTrigger = checkIntervalMet(interval, context, input.triggerId);
      return {
        shouldTrigger,
        reason: shouldTrigger
          ? `间隔时间已达到: ${interval}ms`
          : `间隔时间未达到: ${interval}ms`
      };
    }

    // 检查cron触发
    if (cron !== undefined) {
      const shouldTrigger = checkCronMatch(cron);
      return {
        shouldTrigger,
        reason: shouldTrigger
          ? `Cron表达式匹配: ${cron}`
          : `Cron表达式不匹配: ${cron}`
      };
    }

    return {
      shouldTrigger: false,
      reason: '未配置时间触发条件'
    };
  } catch (error) {
    return {
      shouldTrigger: false,
      reason: `时间触发器评估失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * 检查延迟是否满足
 * 
 * @param delay 延迟毫秒数
 * @param context 执行上下文
 * @returns 是否满足
 */
function checkDelayMet(delay: number, context: ExecutionContext): boolean {
  const startTime = context.getVariable('workflow.startTime') as number;
  if (!startTime) {
    return false;
  }
  const currentTime = Date.now();
  return (currentTime - startTime) >= delay;
}

/**
 * 检查间隔是否满足
 * 
 * @param interval 间隔毫秒数
 * @param context 执行上下文
 * @param triggerId 触发器ID
 * @returns 是否满足
 */
function checkIntervalMet(interval: number, context: ExecutionContext, triggerId: string): boolean {
  const lastTriggerTime = context.getVariable(`trigger.${triggerId}.lastTriggerTime`) as number;
  if (!lastTriggerTime) {
    return true;
  }
  const currentTime = Date.now();
  return (currentTime - lastTriggerTime) >= interval;
}

/**
 * 检查cron表达式是否匹配
 * 
 * @param cron cron表达式
 * @returns 是否匹配
 */
function checkCronMatch(cron: string): boolean {
  // 简化版本，仅支持基本检查
  const now = new Date();
  const minute = now.getMinutes();
  const hour = now.getHours();

  // 简单的每分钟检查
  if (cron === '* * * * *') {
    return true;
  }

  // 简单的每小时检查
  if (cron === '0 * * * *' && minute === 0) {
    return true;
  }

  // 简单的每天检查
  if (cron === '0 0 * * *' && minute === 0 && hour === 0) {
    return true;
  }

  return false;
}

// ============================================================================
// 事件触发器函数
// ============================================================================

/**
 * 事件触发器函数
 * 基于事件触发
 * 
 * @param input 触发器输入
 * @param config 触发器配置
 * @param context 执行上下文
 * @returns 触发器输出
 */
export const eventTriggerFunction: TriggerFunction = async (
  input: TriggerInput,
  config: TriggerConfig,
  context: ExecutionContext
): Promise<TriggerOutput> => {
  try {
    // 类型守卫：检查是否是事件触发器配置
    if (!isEventTriggerConfig(config)) {
      return {
        shouldTrigger: false,
        reason: '配置类型错误，期望为EventTriggerConfig'
      };
    }

    const eventType = config.eventType;
    const eventDataPattern = config.eventDataPattern;

    // 获取最近的事件
    const recentEvent = context.getRecentEvent(eventType);
    if (!recentEvent) {
      return {
        shouldTrigger: false,
        reason: `未找到事件: ${eventType}`
      };
    }

    // 如果有事件数据模式，检查是否匹配
    if (eventDataPattern) {
      const matches = matchEventData(recentEvent.data, eventDataPattern);
      return {
        shouldTrigger: matches,
        reason: matches
          ? `事件数据匹配: ${eventType}`
          : `事件数据不匹配: ${eventType}`
      };
    }

    return {
      shouldTrigger: true,
      reason: `事件已触发: ${eventType}`
    };
  } catch (error) {
    return {
      shouldTrigger: false,
      reason: `事件触发器评估失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * 匹配事件数据
 * 
 * @param eventData 事件数据
 * @param pattern 匹配模式
 * @returns 是否匹配
 */
function matchEventData(eventData: any, pattern: Record<string, any>): boolean {
  for (const key in pattern) {
    if (eventData[key] !== pattern[key]) {
      return false;
    }
  }
  return true;
}

// ============================================================================
// 状态触发器函数
// ============================================================================

/**
 * 状态触发器函数
 * 基于状态变化触发
 * 
 * @param input 触发器输入
 * @param config 触发器配置
 * @param context 执行上下文
 * @returns 触发器输出
 */
export const stateTriggerFunction: TriggerFunction = async (
  input: TriggerInput,
  config: TriggerConfig,
  context: ExecutionContext
): Promise<TriggerOutput> => {
  try {
    // 类型守卫：检查是否是状态触发器配置
    if (!isStateTriggerConfig(config)) {
      return {
        shouldTrigger: false,
        reason: '配置类型错误，期望为StateTriggerConfig'
      };
    }

    const statePath = config.statePath;
    const expectedValue = config.expectedValue;

    // 从上下文获取状态值
    const actualValue = context.getVariable(statePath);

    // 比较状态值
    const shouldTrigger = actualValue === expectedValue;

    return {
      shouldTrigger,
      reason: shouldTrigger
        ? `状态匹配: ${statePath} = ${actualValue}`
        : `状态不匹配: ${statePath} = ${actualValue}, 期望: ${expectedValue}`
    };
  } catch (error) {
    return {
      shouldTrigger: false,
      reason: `状态触发器评估失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// ============================================================================
// 错误触发器函数
// ============================================================================

/**
 * 错误触发器函数
 * 基于错误状态触发
 * 
 * @param input 触发器输入
 * @param config 触发器配置
 * @param context 执行上下文
 * @returns 触发器输出
 */
export const errorTriggerFunction: TriggerFunction = async (
  input: TriggerInput,
  config: TriggerConfig,
  context: ExecutionContext
): Promise<TriggerOutput> => {
  try {
    const nodeId = (config as any).nodeId;

    if (!nodeId) {
      return {
        shouldTrigger: false,
        reason: '未配置节点ID'
      };
    }

    // 获取节点状态
    const nodeStatus = context.getVariable(`${nodeId}.status`);

    // 检查是否为失败状态
    const shouldTrigger = nodeStatus === 'failed';

    return {
      shouldTrigger,
      reason: shouldTrigger
        ? `节点失败: ${nodeId}`
        : `节点未失败: ${nodeId}, 状态: ${nodeStatus}`
    };
  } catch (error) {
    return {
      shouldTrigger: false,
      reason: `错误触发器评估失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// ============================================================================
// 超时触发器函数
// ============================================================================

/**
 * 超时触发器函数
 * 基于超时条件触发
 * 
 * @param input 触发器输入
 * @param config 触发器配置
 * @param context 执行上下文
 * @returns 触发器输出
 */
export const timeoutTriggerFunction: TriggerFunction = async (
  input: TriggerInput,
  config: TriggerConfig,
  context: ExecutionContext
): Promise<TriggerOutput> => {
  try {
    // 类型守卫：检查是否是时间触发器配置
    if (!isTimeTriggerConfig(config)) {
      return {
        shouldTrigger: false,
        reason: '配置类型错误，期望为TimeTriggerConfig'
      };
    }

    const delay = config.delay;
    const nodeId = (config as any).nodeId;

    // 检查延迟是否满足
    if (delay === undefined) {
      return {
        shouldTrigger: false,
        reason: '未配置延迟时间'
      };
    }

    const delayMet = checkDelayMet(delay, context);

    // 检查节点是否仍在运行
    const nodeStatus = context.getVariable(`${nodeId}.status`);
    const isRunning = nodeStatus === 'running';

    const shouldTrigger = delayMet && isRunning;

    return {
      shouldTrigger,
      reason: shouldTrigger
        ? `节点超时: ${nodeId}, 延迟: ${delay}ms`
        : `节点未超时: ${nodeId}, 延迟: ${delay}ms, 状态: ${nodeStatus}`
    };
  } catch (error) {
    return {
      shouldTrigger: false,
      reason: `超时触发器评估失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// ============================================================================
// 触发器函数注册表
// ============================================================================

/**
 * 触发器函数注册表
 */
export const triggerFunctionRegistry: Record<string, TriggerFunction> = {
  time: timeTriggerFunction,
  event: eventTriggerFunction,
  state: stateTriggerFunction,
  error: errorTriggerFunction,
  timeout: timeoutTriggerFunction
};

/**
 * 获取触发器函数
 * 
 * @param triggerType 触发器类型
 * @returns 触发器函数
 */
export function getTriggerFunction(triggerType: string): TriggerFunction | undefined {
  return triggerFunctionRegistry[triggerType];
}

/**
 * 注册触发器函数
 * 
 * @param triggerType 触发器类型
 * @param func 触发器函数
 */
export function registerTriggerFunction(triggerType: string, func: TriggerFunction): void {
  triggerFunctionRegistry[triggerType] = func;
}