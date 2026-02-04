/**
 * ExecutionBuilder - 流畅的执行构建器
 * 提供链式API来配置和执行工作流
 */

import type { ThreadResult, ThreadOptions } from '../../types/thread';
import type { ExecuteOptions } from '../types/core-types';
import { ThreadExecutorAPI } from '../core/thread-executor-api';
import { ok, err, Result } from '../utils/result';

/**
 * ExecutionBuilder - 流畅的执行构建器
 */
export class ExecutionBuilder {
  private executor: ThreadExecutorAPI;
  private workflowId?: string;
  private options: ExecuteOptions = {};
  private onProgressCallbacks: Array<(progress: any) => void> = [];
  private onErrorCallbacks: Array<(error: any) => void> = [];

  constructor(executor: ThreadExecutorAPI) {
    this.executor = executor;
  }

  /**
   * 设置工作流ID
   * @param workflowId 工作流ID
   * @returns this
   */
  withWorkflow(workflowId: string): this {
    this.workflowId = workflowId;
    return this;
  }

  /**
   * 设置输入数据
   * @param input 输入数据
   * @returns this
   */
  withInput(input: Record<string, any>): this {
    this.options.input = input;
    return this;
  }

  /**
   * 设置最大执行步数
   * @param maxSteps 最大步数
   * @returns this
   */
  withMaxSteps(maxSteps: number): this {
    this.options.maxSteps = maxSteps;
    return this;
  }

  /**
   * 设置超时时间（毫秒）
   * @param timeout 超时时间
   * @returns this
   */
  withTimeout(timeout: number): this {
    this.options.timeout = timeout;
    return this;
  }

  /**
   * 启用检查点
   * @param enable 是否启用
   * @returns this
   */
  withCheckpoints(enable: boolean = true): this {
    this.options.enableCheckpoints = enable;
    return this;
  }

  /**
   * 设置节点执行回调
   * @param callback 回调函数
   * @returns this
   */
  onNodeExecuted(callback: (result: any) => void | Promise<void>): this {
    this.options.onNodeExecuted = callback;
    return this;
  }

  /**
   * 设置进度回调
   * @param callback 回调函数
   * @returns this
   */
  onProgress(callback: (progress: any) => void): this {
    this.onProgressCallbacks.push(callback);
    return this;
  }

  /**
   * 设置错误回调
   * @param callback 回调函数
   * @returns this
   */
  onError(callback: (error: any) => void): this {
    this.onErrorCallbacks.push(callback);
    this.options.onError = callback;
    return this;
  }

  /**
   * 设置用户交互处理器
   * @param handler 用户交互处理器
   * @returns this
   */
  withUserInteraction(handler: any): this {
    this.options.userInteractionHandler = handler;
    return this;
  }

  /**
   * 执行工作流（返回Promise）
   * @returns Promise<ThreadResult>
   */
  async execute(): Promise<ThreadResult> {
    if (!this.workflowId) {
      throw new Error('工作流ID未设置，请先调用withWorkflow()');
    }

    try {
      const result = await this.executor.executeWorkflow(this.workflowId, this.options);
      
      // 触发进度回调
      this.onProgressCallbacks.forEach(callback => {
        try {
          callback({
            status: 'completed',
            result
          });
        } catch (error) {
          console.error('进度回调执行失败:', error);
        }
      });

      return result;
    } catch (error) {
      // 触发错误回调
      this.onErrorCallbacks.forEach(callback => {
        try {
          callback(error);
        } catch (callbackError) {
          console.error('错误回调执行失败:', callbackError);
        }
      });

      throw error;
    }
  }

  /**
   * 执行工作流（返回Result类型）
   * @returns Promise<Result<ThreadResult, Error>>
   */
  async executeSafe(): Promise<Result<ThreadResult, Error>> {
    try {
      const result = await this.execute();
      return ok(result);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 执行工作流（返回Promise，支持then/catch）
   * @returns Promise<ThreadResult>
   */
  then<TResult = ThreadResult>(
    onfulfilled?: ((value: ThreadResult) => TResult | PromiseLike<TResult>) | null,
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<TResult> {
    return this.execute().then(onfulfilled, onrejected);
  }

  /**
   * 执行工作流（支持catch）
   * @param onrejected 错误处理函数
   * @returns Promise<ThreadResult>
   */
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<ThreadResult | TResult> {
    return this.execute().catch(onrejected);
  }

  /**
   * 执行工作流（支持finally）
   * @param onfinally 最终执行函数
   * @returns Promise<ThreadResult>
   */
  finally(onfinally?: (() => void) | null): Promise<ThreadResult> {
    return this.execute().finally(onfinally);
  }
}