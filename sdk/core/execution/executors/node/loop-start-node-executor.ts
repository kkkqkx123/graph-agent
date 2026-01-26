/**
 * LoopStart节点执行器
 * 负责执行LOOP_START节点，初始化循环变量，设置循环条件
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';

/**
 * LoopStart节点配置
 */
interface LoopStartNodeConfig {
  /** 循环ID */
  loopId: string;
  /** 可迭代对象（数组、对象、数字或字符串） */
  iterable: any;
  /** 最大迭代次数 */
  maxIterations: number;
  /** 循环变量名（可选，默认为loopId） */
  variableName?: string;
}

/**
 * 循环状态
 */
interface LoopState {
  loopId: string;
  iterable: any;
  currentIndex: number;
  maxIterations: number;
  iterationCount: number;
  variableName: string;
}

/**
 * LoopStart节点执行器
 */
export class LoopStartNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.LOOP_START) {
      return false;
    }

    const config = node.config as LoopStartNodeConfig;

    // 检查必需的配置项
    if (!config.loopId || typeof config.loopId !== 'string') {
      throw new ValidationError('Loop start node must have a valid loopId', `node.${node.id}`);
    }

    if (config.iterable === undefined || config.iterable === null) {
      throw new ValidationError('Loop start node must have iterable', `node.${node.id}`);
    }

    if (typeof config.maxIterations !== 'number' || config.maxIterations <= 0) {
      throw new ValidationError('Loop start node must have a valid maxIterations (positive number)', `node.${node.id}`);
    }

    // 验证iterable类型
    if (!this.isValidIterable(config.iterable)) {
      throw new ValidationError('Iterable must be an array, object, number, or string', `node.${node.id}`);
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

    const config = node.config as LoopStartNodeConfig;
    const loopState = this.getLoopState(thread, config.loopId);

    // 如果循环状态不存在，可以执行（第一次执行）
    if (!loopState) {
      return true;
    }

    // 检查循环条件
    return this.checkLoopCondition(loopState);
  }

  /**
   * 执行节点的具体逻辑
   */
  protected override async doExecute(thread: Thread, node: Node): Promise<any> {
    const config = node.config as LoopStartNodeConfig;
    const variableName = config.variableName || config.loopId;

    // 步骤1：获取或初始化循环状态
    let loopState = this.getLoopState(thread, config.loopId);

    if (!loopState) {
      // 第一次执行，初始化循环状态
      loopState = this.initializeLoopState(config, variableName);
      this.setLoopState(thread, loopState);
    }

    // 步骤2：检查循环条件
    const shouldContinue = this.checkLoopCondition(loopState);

    if (!shouldContinue) {
      // 循环结束，清理循环状态
      this.clearLoopState(thread, config.loopId);

      return {
        loopId: config.loopId,
        shouldContinue: false,
        iterationCount: loopState.iterationCount,
        message: 'Loop completed'
      };
    }

    // 步骤3：获取当前迭代值
    const currentValue = this.getCurrentValue(loopState);

    // 步骤4：设置循环变量
    this.setLoopVariable(thread, variableName, currentValue);

    // 步骤5：更新循环状态
    this.updateLoopState(loopState);

    // 步骤6：记录执行历史
    thread.nodeResults.push({
      step: thread.nodeResults.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: Date.now(),
      action: 'loop-start',
      details: {
        loopId: config.loopId,
        variableName,
        currentIndex: loopState.currentIndex,
        iterationCount: loopState.iterationCount,
        currentValue
      }
    });

    // 步骤7：返回执行结果
    return {
      loopId: config.loopId,
      variableName,
      currentValue,
      iterationCount: loopState.iterationCount,
      shouldContinue: true
    };
  }

  /**
   * 验证iterable是否有效
   * @param iterable 可迭代对象
   * @returns 是否有效
   */
  private isValidIterable(iterable: any): boolean {
    return (
      Array.isArray(iterable) ||
      (typeof iterable === 'object' && iterable !== null) ||
      typeof iterable === 'number' ||
      typeof iterable === 'string'
    );
  }

  /**
   * 获取循环状态
   * @param thread Thread实例
   * @param loopId 循环ID
   * @returns 循环状态
   */
  private getLoopState(thread: Thread, loopId: string): LoopState | undefined {
    return thread.variableValues?.[`__loop_${loopId}`];
  }

  /**
   * 设置循环状态
   * @param thread Thread实例
   * @param loopState 循环状态
   */
  private setLoopState(thread: Thread, loopState: LoopState): void {
    if (!thread.variableValues) {
      thread.variableValues = {};
    }
    thread.variableValues[`__loop_${loopState.loopId}`] = loopState;
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
   * 初始化循环状态
   * @param config 节点配置
   * @param variableName 变量名
   * @returns 循环状态
   */
  private initializeLoopState(config: LoopStartNodeConfig, variableName: string): LoopState {
    return {
      loopId: config.loopId,
      iterable: config.iterable,
      currentIndex: 0,
      maxIterations: config.maxIterations,
      iterationCount: 0,
      variableName
    };
  }

  /**
   * 检查循环条件
   * @param loopState 循环状态
   * @returns 是否应该继续循环
   */
  private checkLoopCondition(loopState: LoopState): boolean {
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
   * 获取当前迭代值
   * @param loopState 循环状态
   * @returns 当前迭代值
   */
  private getCurrentValue(loopState: LoopState): any {
    const { iterable, currentIndex } = loopState;

    if (Array.isArray(iterable)) {
      return iterable[currentIndex];
    } else if (typeof iterable === 'object' && iterable !== null) {
      const keys = Object.keys(iterable);
      const key = keys[currentIndex];
      if (key !== undefined) {
        return { key, value: iterable[key] };
      }
      return undefined;
    } else if (typeof iterable === 'number') {
      return currentIndex;
    } else if (typeof iterable === 'string') {
      return iterable[currentIndex];
    }

    return undefined;
  }

  /**
   * 设置循环变量
   * @param thread Thread实例
   * @param variableName 变量名
   * @param value 变量值
   */
  private setLoopVariable(thread: Thread, variableName: string, value: any): void {
    if (!thread.variableValues) {
      thread.variableValues = {};
    }
    thread.variableValues[variableName] = value;
  }

  /**
   * 更新循环状态
   * @param loopState 循环状态
   */
  private updateLoopState(loopState: LoopState): void {
    loopState.iterationCount++;
    loopState.currentIndex++;
  }
}
