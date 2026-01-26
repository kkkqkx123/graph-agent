/**
 * LoopEnd节点执行器
 * 负责执行LOOP_END节点，更新循环变量，检查中断条件
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * LoopEnd节点配置
 */
interface LoopEndNodeConfig {
  /** 循环ID */
  loopId: string;
  /** 中断条件表达式 */
  breakCondition?: string;
  /** LOOP_START节点ID（用于跳转） */
  loopStartNodeId?: string;
}

/**
 * LoopEnd节点执行器
 */
export class LoopEndNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.LOOP_END) {
      return false;
    }

    const config = node.config as LoopEndNodeConfig;

    // 检查必需的配置项
    if (!config.loopId || typeof config.loopId !== 'string') {
      throw new ValidationError('Loop end node must have a valid loopId', `node.${node.id}`);
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

    const config = node.config as LoopEndNodeConfig;
    const loopState = this.getLoopState(thread, config.loopId);

    // 检查循环状态是否存在
    if (!loopState) {
      return false;
    }

    return true;
  }

  /**
   * 执行节点的具体逻辑
   */
  protected override async doExecute(thread: Thread, node: Node): Promise<any> {
    const config = node.config as LoopEndNodeConfig;

    // 步骤1：获取循环状态
    const loopState = this.getLoopState(thread, config.loopId);

    if (!loopState) {
      throw new ValidationError(`Loop state not found for loopId: ${config.loopId}`, `node.${node.id}`);
    }

    // 步骤2：评估中断条件
    let shouldBreak = false;
    if (config.breakCondition) {
      shouldBreak = this.evaluateBreakCondition(config.breakCondition, thread);
    }

    // 步骤3：检查循环条件
    const loopConditionMet = this.checkLoopCondition(loopState);

    // 步骤4：决定是否继续循环
    const shouldContinue = !shouldBreak && loopConditionMet;

    // 步骤5：如果需要继续循环，更新循环状态
    if (shouldContinue) {
      this.updateLoopState(loopState);
    } else {
      // 循环结束，清理循环状态
      this.clearLoopState(thread, config.loopId);
    }

    // 步骤6：记录执行历史
    thread.executionHistory.push({
      step: thread.executionHistory.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: Date.now(),
      action: 'loop-end',
      details: {
        loopId: config.loopId,
        breakCondition: config.breakCondition,
        shouldBreak,
        loopConditionMet,
        shouldContinue,
        iterationCount: loopState.iterationCount
      }
    });

    // 步骤7：返回执行结果
    return {
      loopId: config.loopId,
      shouldContinue,
      shouldBreak,
      loopConditionMet,
      iterationCount: loopState.iterationCount,
      nextNodeId: shouldContinue ? config.loopStartNodeId : undefined
    };
  }

  /**
   * 获取循环状态
   * @param thread Thread实例
   * @param loopId 循环ID
   * @returns 循环状态
   */
  private getLoopState(thread: Thread, loopId: string): any {
    return thread.variableValues?.[`__loop_${loopId}`];
  }

  /**
   * 清除循环状态
   * @param thread Thread实例
   * @param loopId 循环ID
   */
  private clearLoopState(thread: Thread, loopId: string): void {
    if (thread.variableValues) {
      delete thread.variableValues[`__loop_${loopId}`];
    }
  }

  /**
   * 评估中断条件
   * @param breakCondition 中断条件表达式
   * @param thread Thread实例
   * @returns 是否应该中断
   */
  private evaluateBreakCondition(breakCondition: string, thread: Thread): boolean {
    try {
      // 解析变量引用
      const resolvedCondition = this.resolveVariableReferences(breakCondition, thread);

      // 评估条件
      const result = new Function(`return (${resolvedCondition})`)();
      return Boolean(result);
    } catch (error) {
      console.error(`Failed to evaluate break condition: ${breakCondition}`, error);
      return false;
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

  /**
   * 检查循环条件
   * @param loopState 循环状态
   * @returns 循环条件是否满足
   */
  private checkLoopCondition(loopState: any): boolean {
    // 检查迭代次数
    if (loopState.iterationCount >= loopState.maxIterations) {
      return false;
    }

    // 检查当前索引
    const iterableLength = this.getIterableLength(loopState.iterable);
    if (loopState.currentIndex >= iterableLength) {
      return false;
    }

    return true;
  }

  /**
   * 获取iterable的长度
   * @param iterable 可迭代对象
   * @returns 长度
   */
  private getIterableLength(iterable: any): number {
    if (Array.isArray(iterable)) {
      return iterable.length;
    } else if (typeof iterable === 'object' && iterable !== null) {
      return Object.keys(iterable).length;
    } else if (typeof iterable === 'number') {
      return iterable;
    } else if (typeof iterable === 'string') {
      return iterable.length;
    }
    return 0;
  }

  /**
   * 更新循环状态
   * @param loopState 循环状态
   */
  private updateLoopState(loopState: any): void {
    loopState.iterationCount++;
    loopState.currentIndex++;
  }
}
