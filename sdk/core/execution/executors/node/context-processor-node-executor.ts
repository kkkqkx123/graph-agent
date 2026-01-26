/**
 * ContextProcessor节点执行器
 * 负责执行CONTEXT_PROCESSOR节点，处理消息上下文
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * 上下文处理器类型
 */
type ContextProcessorType = 'PASS_THROUGH' | 'FILTER_IN' | 'FILTER_OUT' | 'TRANSFORM' | 'ISOLATE' | 'MERGE';

/**
 * 上下文处理器配置
 */
interface ContextProcessorConfig {
  /** 过滤条件（用于FILTER_IN和FILTER_OUT） */
  filterCondition?: string;
  /** 转换表达式（用于TRANSFORM） */
  transformExpression?: string;
  /** 合并策略（用于MERGE） */
  mergeStrategy?: 'APPEND' | 'PREPEND' | 'REPLACE' | 'MERGE';
  /** 要合并的上下文（用于MERGE） */
  mergeContext?: any[];
}

/**
 * ContextProcessor节点配置
 */
interface ContextProcessorNodeConfig {
  /** 上下文处理器类型 */
  contextProcessorType: ContextProcessorType;
  /** 上下文处理器配置 */
  contextProcessorConfig: ContextProcessorConfig;
}

/**
 * ContextProcessor节点执行器
 */
export class ContextProcessorNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.CONTEXT_PROCESSOR) {
      return false;
    }

    const config = node.config as ContextProcessorNodeConfig;

    // 检查必需的配置项
    if (!config.contextProcessorType || typeof config.contextProcessorType !== 'string') {
      throw new ValidationError('Context processor node must have a valid contextProcessorType', `node.${node.id}`);
    }

    const validTypes = ['PASS_THROUGH', 'FILTER_IN', 'FILTER_OUT', 'TRANSFORM', 'ISOLATE', 'MERGE'];
    if (!validTypes.includes(config.contextProcessorType)) {
      throw new ValidationError(`Invalid context processor type: ${config.contextProcessorType}`, `node.${node.id}`);
    }

    if (!config.contextProcessorConfig || typeof config.contextProcessorConfig !== 'object') {
      throw new ValidationError('Context processor node must have contextProcessorConfig', `node.${node.id}`);
    }

    return true;
  }

  /**
   * 检查节点是否可以执行
   */
  protected override canExecute(thread: Thread, node: Node): boolean {
    // 调用父类检查
    if (!super.canExecute(thread, node)) {
      return false;
    }

    return true;
  }

  /**
   * 执行节点的具体逻辑
   */
  protected override async doExecute(thread: Thread, node: Node): Promise<any> {
    const config = node.config as ContextProcessorNodeConfig;

    // 步骤1：获取当前上下文
    const inputContext = this.getContext(thread);

    // 步骤2：根据处理策略处理上下文
    const outputContext = await this.processContext(config.contextProcessorType, config.contextProcessorConfig, inputContext, thread);

    // 步骤3：更新上下文
    this.setContext(thread, outputContext);

    // 步骤4：记录执行历史
    thread.nodeResults.push({
      step: thread.nodeResults.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: Date.now(),
      action: 'context-processor',
      details: {
        contextProcessorType: config.contextProcessorType,
        inputContext,
        outputContext
      }
    });

    // 步骤5：返回执行结果
    return {
      context: outputContext,
      contextProcessorType: config.contextProcessorType
    };
  }

  /**
   * 获取当前上下文
   * @param thread Thread实例
   * @returns 上下文数组
   */
  private getContext(thread: Thread): any[] {
    const context = thread.variableValues?.['context'];
    if (Array.isArray(context)) {
      return context;
    }
    return [];
  }

  /**
   * 设置上下文
   * @param thread Thread实例
   * @param context 上下文数组
   */
  private setContext(thread: Thread, context: any[]): void {
    if (!thread.variableValues) {
      thread.variableValues = {};
    }
    thread.variableValues['context'] = context;
  }

  /**
   * 处理上下文
   * @param processorType 处理器类型
   * @param processorConfig 处理器配置
   * @param context 上下文
   * @param thread Thread实例
   * @returns 处理后的上下文
   */
  private async processContext(
    processorType: ContextProcessorType,
    processorConfig: ContextProcessorConfig,
    context: any[],
    thread: Thread
  ): Promise<any[]> {
    switch (processorType) {
      case 'PASS_THROUGH':
        return this.processPassThrough(context);

      case 'FILTER_IN':
        return this.processFilterIn(context, processorConfig.filterCondition, thread);

      case 'FILTER_OUT':
        return this.processFilterOut(context, processorConfig.filterCondition, thread);

      case 'TRANSFORM':
        return this.processTransform(context, processorConfig.transformExpression, thread);

      case 'ISOLATE':
        return this.processIsolate(context);

      case 'MERGE':
        return this.processMerge(context, processorConfig.mergeStrategy, processorConfig.mergeContext);

      default:
        throw new ValidationError(`Unsupported context processor type: ${processorType}`, 'context-processor.type');
    }
  }

  /**
   * PASS_THROUGH策略：直接传递上下文
   * @param context 上下文
   * @returns 上下文
   */
  private processPassThrough(context: any[]): any[] {
    return context;
  }

  /**
   * FILTER_IN策略：过滤保留满足条件的消息
   * @param context 上下文
   * @param filterCondition 过滤条件
   * @param thread Thread实例
   * @returns 过滤后的上下文
   */
  private processFilterIn(context: any[], filterCondition: string | undefined, thread: Thread): any[] {
    if (!filterCondition) {
      return context;
    }

    return context.filter(item => {
      return this.evaluateCondition(filterCondition, item, thread);
    });
  }

  /**
   * FILTER_OUT策略：过滤排除满足条件的消息
   * @param context 上下文
   * @param filterCondition 过滤条件
   * @param thread Thread实例
   * @returns 过滤后的上下文
   */
  private processFilterOut(context: any[], filterCondition: string | undefined, thread: Thread): any[] {
    if (!filterCondition) {
      return context;
    }

    return context.filter(item => {
      return !this.evaluateCondition(filterCondition, item, thread);
    });
  }

  /**
   * TRANSFORM策略：转换消息
   * @param context 上下文
   * @param transformExpression 转换表达式
   * @param thread Thread实例
   * @returns 转换后的上下文
   */
  private processTransform(context: any[], transformExpression: string | undefined, thread: Thread): any[] {
    if (!transformExpression) {
      return context;
    }

    return context.map(item => {
      return this.evaluateExpression(transformExpression, item, thread);
    });
  }

  /**
   * ISOLATE策略：隔离上下文
   * @param context 上下文
   * @returns 上下文副本
   */
  private processIsolate(context: any[]): any[] {
    // 深拷贝上下文
    return JSON.parse(JSON.stringify(context));
  }

  /**
   * MERGE策略：合并上下文
   * @param context 上下文
   * @param mergeStrategy 合并策略
   * @param mergeContext 要合并的上下文
   * @returns 合并后的上下文
   */
  private processMerge(context: any[], mergeStrategy: string | undefined, mergeContext: any[] | undefined): any[] {
    const toMerge = mergeContext || [];

    switch (mergeStrategy) {
      case 'APPEND':
        return [...context, ...toMerge];

      case 'PREPEND':
        return [...toMerge, ...context];

      case 'REPLACE':
        return toMerge;

      case 'MERGE':
        // 合并两个上下文，去重
        const merged = [...context];
        for (const item of toMerge) {
          if (!merged.some(existing => JSON.stringify(existing) === JSON.stringify(item))) {
            merged.push(item);
          }
        }
        return merged;

      default:
        return [...context, ...toMerge];
    }
  }

  /**
   * 评估条件
   * @param condition 条件表达式
   * @param item 当前项
   * @param thread Thread实例
   * @returns 评估结果
   */
  private evaluateCondition(condition: string, item: any, thread: Thread): boolean {
    try {
      const resolvedCondition = this.resolveVariableReferences(condition, thread);
      const result = new Function('item', `return (${resolvedCondition})`)(item);
      return Boolean(result);
    } catch (error) {
      console.error(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * 评估表达式
   * @param expression 表达式
   * @param item 当前项
   * @param thread Thread实例
   * @returns 评估结果
   */
  private evaluateExpression(expression: string, item: any, thread: Thread): any {
    try {
      const resolvedExpression = this.resolveVariableReferences(expression, thread);
      const result = new Function('item', `return (${resolvedExpression})`)(item);
      return result;
    } catch (error) {
      console.error(`Failed to evaluate expression: ${expression}`, error);
      return item;
    }
  }

  /**
   * 解析变量引用
   * @param expression 表达式
   * @param thread Thread实例
   * @returns 解析后的表达式
   */
  private resolveVariableReferences(expression: string, thread: Thread): string {
    const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;

    return expression.replace(variablePattern, (match, varPath) => {
      const parts = varPath.split('.');
      let value: any = thread.variableValues || {};

      for (const part of parts) {
        if (value === null || value === undefined) {
          return 'undefined';
        }
        value = value[part];
      }

      if (typeof value === 'string') {
        return `'${value}'`;
      } else if (typeof value === 'object') {
        return JSON.stringify(value);
      } else {
        return String(value);
      }
    });
  }
}
