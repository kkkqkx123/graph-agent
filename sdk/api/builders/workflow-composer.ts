/**
 * WorkflowComposer - 工作流组合器
 * 支持工作流的串联、并联和结果合并
 */

import type { WorkflowDefinition } from '@modular-agent/types/workflow';
import type { ThreadResult } from '@modular-agent/types/thread';
import { Observable, create, type Observer } from '../utils/observable';
import { ok, err } from '@modular-agent/common-utils/result-utils';
import type { Result } from '@modular-agent/types/result';

/**
 * 工作流组合类型
 */
export type WorkflowCompositionType = 'sequential' | 'parallel' | 'merge';

/**
 * 结果合并策略
 */
export type MergeStrategy<T> = 'first' | 'last' | 'all' | 'custom' | ((results: T[]) => T);

/**
 * 工作流组合配置
 */
export interface WorkflowCompositionConfig {
  /** 组合类型 */
  type: WorkflowCompositionType;
  /** 结果合并策略 */
  mergeStrategy?: MergeStrategy<ThreadResult>;
  /** 自定义合并函数 */
  customMergeFn?: (results: ThreadResult[]) => ThreadResult;
  /** 是否在错误时继续执行 */
  continueOnError?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 工作流组合项
 */
export interface WorkflowCompositionItem {
  /** 工作流定义 */
  workflow: WorkflowDefinition;
  /** 工作流ID */
  workflowId: string;
  /** 输入数据 */
  input?: Record<string, any>;
  /** 执行选项 */
  options?: any;
}

/**
 * 工作流组合结果
 */
export interface WorkflowCompositionResult {
  /** 是否成功 */
  success: boolean;
  /** 结果数组 */
  results: Result<ThreadResult, Error>[];
  /** 合并后的结果 */
  mergedResult?: ThreadResult;
  /** 错误信息 */
  errors: Error[];
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * WorkflowComposer - 工作流组合器
 */
export class WorkflowComposer {
  private items: WorkflowCompositionItem[] = [];
  private config: WorkflowCompositionConfig = {
    type: 'sequential',
    mergeStrategy: 'last',
    continueOnError: false
  };

  /**
   * 添加工作流
   * @param workflow 工作流定义
   * @param workflowId 工作流ID
   * @param input 输入数据
   * @param options 执行选项
   * @returns this
   */
  addWorkflow(
    workflow: WorkflowDefinition,
    workflowId: string,
    input?: Record<string, any>,
    options?: any
  ): this {
    this.items.push({
      workflow,
      workflowId,
      input,
      options
    });
    return this;
  }

  /**
   * 设置组合类型
   * @param type 组合类型
   * @returns this
   */
  setType(type: WorkflowCompositionType): this {
    this.config.type = type;
    return this;
  }

  /**
   * 设置结果合并策略
   * @param strategy 合并策略
   * @returns this
   */
  setMergeStrategy(strategy: MergeStrategy<ThreadResult>): this {
    this.config.mergeStrategy = strategy;
    return this;
  }

  /**
   * 设置自定义合并函数
   * @param fn 自定义合并函数
   * @returns this
   */
  setCustomMergeFn(fn: (results: ThreadResult[]) => ThreadResult): this {
    this.config.customMergeFn = fn;
    this.config.mergeStrategy = 'custom';
    return this;
  }

  /**
   * 设置错误处理策略
   * @param continueOnError 是否在错误时继续执行
   * @returns this
   */
  setContinueOnError(continueOnError: boolean): this {
    this.config.continueOnError = continueOnError;
    return this;
  }

  /**
   * 设置超时时间
   * @param timeout 超时时间（毫秒）
   * @returns this
   */
  setTimeout(timeout: number): this {
    this.config.timeout = timeout;
    return this;
  }

  /**
   * 执行组合工作流（返回Promise）
   * @param executor 执行器函数
   * @returns Promise<WorkflowCompositionResult>
   */
  async execute(
    executor: (workflowId: string, input?: Record<string, any>, options?: any) => Promise<ThreadResult>
  ): Promise<WorkflowCompositionResult> {
    const startTime = Date.now();
    const results: Result<ThreadResult, Error>[] = [];
    const errors: Error[] = [];

    try {
      if (this.config.type === 'sequential') {
        // 串联执行
        for (const item of this.items) {
          try {
            const result = await this.executeWithTimeout(
              executor,
              item,
              this.config.timeout
            );
            results.push(ok(result));
          } catch (error) {
            const errObj = error instanceof Error ? error : new Error(String(error));
            results.push(err(errObj));
            errors.push(errObj);
            if (!this.config.continueOnError) {
              break;
            }
          }
        }
      } else if (this.config.type === 'parallel') {
        // 并联执行
        const promises = this.items.map(async (item) => {
          try {
            const result = await this.executeWithTimeout(
              executor,
              item,
              this.config.timeout
            );
            return ok(result);
          } catch (error) {
            const errObj = error instanceof Error ? error : new Error(String(error));
            errors.push(errObj);
            return err(errObj);
          }
        });

        const parallelResults = await Promise.all(promises);
        results.push(...parallelResults);
      } else if (this.config.type === 'merge') {
        // 合并执行（类似parallel，但结果合并方式不同）
        const promises = this.items.map(async (item) => {
          try {
            const result = await this.executeWithTimeout(
              executor,
              item,
              this.config.timeout
            );
            return ok(result);
          } catch (error) {
            const errObj = error instanceof Error ? error : new Error(String(error));
            errors.push(errObj);
            return err(errObj);
          }
        });

        const mergeResults = await Promise.all(promises);
        results.push(...mergeResults);
      }

      // 合并结果
      const mergedResult = this.mergeResults(results);

      return {
        success: errors.length === 0,
        results,
        mergedResult,
        errors,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      errors.push(errObj);
      return {
        success: false,
        results,
        errors,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 执行组合工作流（返回Observable）
   * @param executor 执行器函数
   * @returns Observable<CompositionEvent>
   */
  executeAsync(
    executor: (workflowId: string, input?: Record<string, any>, options?: any) => Promise<ThreadResult>
  ): Observable<CompositionEvent> {
    return create((observer: Observer<CompositionEvent>) => {
      const startTime = Date.now();
      const results: Result<ThreadResult, Error>[] = [];
      const errors: Error[] = [];

      // 发送开始事件
      observer.next({
        type: 'start',
        timestamp: Date.now(),
        compositionType: this.config.type,
        workflowCount: this.items.length
      });

      const executePromise = this.execute(executor);

      executePromise
        .then((compositionResult) => {
          // 发送完成事件
          observer.next({
            type: 'complete',
            timestamp: Date.now(),
            result: compositionResult
          });
          observer.complete();
        })
        .catch((error) => {
          // 发送错误事件
          observer.next({
            type: 'error',
            timestamp: Date.now(),
            error: error instanceof Error ? error : new Error(String(error))
          });
          observer.error(error);
        });

      return () => {};
    });
  }

  /**
   * 合并结果
   * @param results 结果数组
   * @returns 合并后的结果
   */
  private mergeResults(results: Result<ThreadResult, Error>[]): ThreadResult | undefined {
    const successfulResults = results.filter((r) => r.isOk()).map((r) => r.unwrap());

    if (successfulResults.length === 0) {
      return undefined;
    }

    const strategy = this.config.mergeStrategy;

    if (strategy === 'first') {
      return successfulResults[0];
    } else if (strategy === 'last') {
      return successfulResults[successfulResults.length - 1];
    } else if (strategy === 'all') {
      // 返回包含所有结果的组合结果
      return {
        output: {
          combined: true,
          results: successfulResults
        },
        status: 'completed'
      } as any;
    } else if (strategy === 'custom' && this.config.customMergeFn) {
      return this.config.customMergeFn(successfulResults);
    } else if (typeof strategy === 'function') {
      return strategy(successfulResults);
    }

    return successfulResults[successfulResults.length - 1];
  }

  /**
   * 带超时的执行
   * @param executor 执行器
   * @param item 工作流项
   * @param timeout 超时时间
   * @returns Promise<ThreadResult>
   */
  private async executeWithTimeout(
    executor: (workflowId: string, input?: Record<string, any>, options?: any) => Promise<ThreadResult>,
    item: WorkflowCompositionItem,
    timeout?: number
  ): Promise<ThreadResult> {
    if (!timeout) {
      return executor(item.workflowId, item.input, item.options);
    }

    return Promise.race([
      executor(item.workflowId, item.input, item.options),
      new Promise<ThreadResult>((_, reject) =>
        setTimeout(() => reject(new Error(`Workflow execution timeout: ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * 清空组合项
   * @returns this
   */
  clear(): this {
    this.items = [];
    return this;
  }

  /**
   * 获取组合项数量
   * @returns 数量
   */
  getItemCount(): number {
    return this.items.length;
  }

  /**
   * 获取配置
   * @returns 配置
   */
  getConfig(): WorkflowCompositionConfig {
    return { ...this.config };
  }
}

/**
 * 组合事件类型
 */
export type CompositionEvent = CompositionStartEvent | CompositionCompleteEvent | CompositionErrorEvent;

/**
 * 组合开始事件
 */
export interface CompositionStartEvent {
  type: 'start';
  timestamp: number;
  compositionType: WorkflowCompositionType;
  workflowCount: number;
}

/**
 * 组合完成事件
 */
export interface CompositionCompleteEvent {
  type: 'complete';
  timestamp: number;
  result: WorkflowCompositionResult;
}

/**
 * 组合错误事件
 */
export interface CompositionErrorEvent {
  type: 'error';
  timestamp: number;
  error: Error;
}

/**
 * 创建串联组合
 * @param workflows 工作流数组
 * @returns WorkflowComposer实例
 */
export function sequential(...workflows: WorkflowCompositionItem[]): WorkflowComposer {
  const composer = new WorkflowComposer();
  workflows.forEach((item) => composer.addWorkflow(item.workflow, item.workflowId, item.input, item.options));
  composer.setType('sequential');
  return composer;
}

/**
 * 创建并联组合
 * @param workflows 工作流数组
 * @returns WorkflowComposer实例
 */
export function parallel(...workflows: WorkflowCompositionItem[]): WorkflowComposer {
  const composer = new WorkflowComposer();
  workflows.forEach((item) => composer.addWorkflow(item.workflow, item.workflowId, item.input, item.options));
  composer.setType('parallel');
  return composer;
}

/**
 * 创建合并组合
 * @param workflows 工作流数组
 * @returns WorkflowComposer实例
 */
export function merge(...workflows: WorkflowCompositionItem[]): WorkflowComposer {
  const composer = new WorkflowComposer();
  workflows.forEach((item) => composer.addWorkflow(item.workflow, item.workflowId, item.input, item.options));
  composer.setType('merge');
  return composer;
}