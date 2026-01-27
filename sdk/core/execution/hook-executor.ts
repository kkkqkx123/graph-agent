/**
 * HookExecutor - Hook执行器
 * 负责管理节点的Hook配置，在适当的时机执行Hook，评估触发条件，生成并触发自定义事件
 *
 * 职责：
 * - 管理节点的Hook配置
 * - 在适当的时机执行Hook（BEFORE_EXECUTE、AFTER_EXECUTE）
 * - 评估Hook触发条件
 * - 生成并触发自定义事件
 *
 * 设计原则：
 * - Hook执行失败不应影响节点正常执行
 * - 条件评估失败默认不触发事件
 * - 事件触发异步化，不阻塞节点执行
 * - 不持有 EventManager，通过参数传递
 */

import type { Node, NodeHook } from '../../types/node';
import { HookType } from '../../types/node';
import type { Thread } from '../../types/thread';
import type { NodeExecutionResult } from '../../types/thread';
import type { NodeCustomEvent } from '../../types/events';
import { EventType } from '../../types/events';
import type { EvaluationContext } from '../../types/condition';
import { ConditionEvaluator } from './condition-evaluator';

/**
 * Hook执行上下文
 */
export interface HookExecutionContext {
  /** Thread实例 */
  thread: Thread;
  /** 节点定义 */
  node: Node;
  /** 节点执行结果（AFTER_EXECUTE时可用） */
  result?: NodeExecutionResult;
}

/**
 * Hook评估上下文（内部使用）
 */
interface HookEvaluationContext {
  /** 节点执行结果 */
  output: any;
  /** 节点状态 */
  status: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 错误信息（如果有） */
  error?: any;
  /** 当前变量状态 */
  variables: Record<string, any>;
  /** 节点配置 */
  config: any;
  /** 节点元数据 */
  metadata?: Record<string, any>;
}

/**
 * Hook执行器
 */
export class HookExecutor {
  private conditionEvaluator: ConditionEvaluator;

  constructor() {
    this.conditionEvaluator = new ConditionEvaluator();
  }

  /**
   * 执行BEFORE_EXECUTE类型的Hook
   * @param context Hook执行上下文
   * @param emitEvent 事件发射函数
   */
  async executeBeforeExecute(
    context: HookExecutionContext,
    emitEvent: (event: NodeCustomEvent) => Promise<void>
  ): Promise<void> {
    await this.executeHooksByType(context, HookType.BEFORE_EXECUTE, emitEvent);
  }

  /**
   * 执行AFTER_EXECUTE类型的Hook
   * @param context Hook执行上下文
   * @param emitEvent 事件发射函数
   */
  async executeAfterExecute(
    context: HookExecutionContext,
    emitEvent: (event: NodeCustomEvent) => Promise<void>
  ): Promise<void> {
    await this.executeHooksByType(context, HookType.AFTER_EXECUTE, emitEvent);
  }

  /**
   * 根据Hook类型执行Hook
   * @param context Hook执行上下文
   * @param hookType Hook类型
   * @param emitEvent 事件发射函数
   */
  private async executeHooksByType(
    context: HookExecutionContext,
    hookType: HookType,
    emitEvent: (event: NodeCustomEvent) => Promise<void>
  ): Promise<void> {
    const { node } = context;

    // 检查节点是否有Hook配置
    if (!node.hooks || node.hooks.length === 0) {
      return;
    }

    // 筛选指定类型的Hook，并按权重排序（权重高的先执行）
    const hooks = node.hooks
      .filter(hook => hook.hookType === hookType && (hook.enabled !== false))
      .sort((a, b) => (b.weight || 0) - (a.weight || 0));

    // 异步执行所有Hook，不阻塞节点执行
    const promises = hooks.map(hook => this.executeHook(context, hook, emitEvent));
    await Promise.allSettled(promises);
  }

  /**
   * 执行单个Hook
   * @param context Hook执行上下文
   * @param hook Hook配置
   * @param emitEvent 事件发射函数
   */
  private async executeHook(
    context: HookExecutionContext,
    hook: NodeHook,
    emitEvent: (event: NodeCustomEvent) => Promise<void>
  ): Promise<void> {
    try {
      // 构建评估上下文
      const evalContext = this.buildEvaluationContext(context);

      // 评估触发条件（如果有）
      if (hook.condition) {
        let result: boolean;
        try {
          result = this.conditionEvaluator.evaluate(
            { expression: hook.condition },
            this.convertToEvaluationContext(evalContext)
          );
        } catch (error) {
          console.warn(
            `Hook condition evaluation failed for hook "${hook.hookName}" on node "${context.node.id}":`,
            error
          );
          return;
        }

        if (!result) {
          // 条件不满足，不触发事件
          return;
        }
      }

      // 生成事件载荷
      const eventData = this.generateEventData(hook, evalContext);

      // 触发自定义事件
      await this.emitCustomEvent(context, hook.eventName, eventData, emitEvent);
    } catch (error) {
      // Hook执行失败不应影响节点正常执行，记录错误日志
      console.error(
        `Hook execution failed for hook "${hook.hookName}" on node "${context.node.id}":`,
        error
      );
    }
  }

  /**
   * 构建评估上下文
   * @param context Hook执行上下文
   * @returns 评估上下文
   */
  private buildEvaluationContext(context: HookExecutionContext): HookEvaluationContext {
    const { thread, node, result } = context;

    return {
      output: result?.output,
      status: result?.status || 'PENDING',
      executionTime: result?.executionTime || 0,
      error: result?.error,
      variables: thread.variableValues,
      config: node.config,
      metadata: node.metadata
    };
  }

  /**
   * 转换为 EvaluationContext
   * @param hookContext Hook评估上下文
   * @returns EvaluationContext
   */
  private convertToEvaluationContext(hookContext: HookEvaluationContext): EvaluationContext {
    return {
      input: {},
      output: {
        result: hookContext.output,
        status: hookContext.status,
        executionTime: hookContext.executionTime,
        error: hookContext.error
      },
      variables: hookContext.variables
    };
  }

  /**
   * 生成事件载荷
   * @param hook Hook配置
   * @param evalContext 评估上下文
   * @returns 事件载荷
   */
  private generateEventData(
    hook: NodeHook,
    evalContext: HookEvaluationContext
  ): Record<string, any> {
    // 如果Hook配置了eventPayload，使用它
    if (hook.eventPayload) {
      return this.resolvePayloadTemplate(hook.eventPayload, evalContext);
    }

    // 否则，使用默认的事件数据
    return {
      output: evalContext.output,
      status: evalContext.status,
      executionTime: evalContext.executionTime,
      error: evalContext.error,
      variables: evalContext.variables,
      config: evalContext.config,
      metadata: evalContext.metadata
    };
  }

  /**
   * 解析载荷模板（支持变量替换）
   * @param payload 载荷模板
   * @param evalContext 评估上下文
   * @returns 解析后的载荷
   */
  private resolvePayloadTemplate(
    payload: Record<string, any>,
    evalContext: HookEvaluationContext
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string') {
        // 处理模板变量，如 {{output.result}}
        result[key] = this.resolveTemplateVariable(value, evalContext);
      } else if (typeof value === 'object' && value !== null) {
        // 递归处理嵌套对象
        result[key] = this.resolvePayloadTemplate(value, evalContext);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 解析模板变量
   * @param template 模板字符串
   * @param evalContext 评估上下文
   * @returns 解析后的值
   */
  private resolveTemplateVariable(template: string, evalContext: HookEvaluationContext): any {
    // 匹配 {{variable}} 格式的模板变量
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = template.matchAll(regex);

    let result = template;
    for (const match of matches) {
      if (match[1]) {
        const variablePath = match[1].trim();
        const value = this.getVariableValue(variablePath, evalContext);
        result = result.replace(match[0], String(value ?? ''));
      }
    }

    // 尝试将结果转换为数字或布尔值
    if (result === 'true') return true;
    if (result === 'false') return false;
    if (/^-?\d+\.?\d*$/.test(result)) return parseFloat(result);

    return result;
  }

  /**
   * 获取变量值
   * @param path 变量路径
   * @param evalContext 评估上下文
   * @returns 变量值
   */
  private getVariableValue(path: string, evalContext: HookEvaluationContext): any {
    const parts = path.split('.');
    let value: any = evalContext;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * 触发自定义事件
   * @param context Hook执行上下文
   * @param eventName 事件名称
   * @param eventData 事件数据
   * @param emitEvent 事件发射函数
   */
  private async emitCustomEvent(
    context: HookExecutionContext,
    eventName: string,
    eventData: Record<string, any>,
    emitEvent: (event: NodeCustomEvent) => Promise<void>
  ): Promise<void> {
    const { thread, node } = context;

    const event: NodeCustomEvent = {
      type: EventType.NODE_CUSTOM_EVENT,
      timestamp: Date.now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      nodeId: node.id,
      nodeType: node.type,
      eventName,
      eventData,
      metadata: node.metadata
    };

    try {
      await emitEvent(event);
    } catch (error) {
      // 事件触发失败不应影响节点执行结果
      console.error(
        `Failed to emit custom event "${eventName}" for node "${node.id}":`,
        error
      );
    }
  }
}