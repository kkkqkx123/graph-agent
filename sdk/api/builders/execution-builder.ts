/**
 * ExecutionBuilder - 流畅的执行构建器
 * 提供链式API来配置和执行工作流
 * 支持Promise和Observable双接口
 */

import type { ThreadResult, ThreadOptions } from '../../types/thread';
import type { ExecuteOptions } from '../types/core-types';
import { ThreadExecutorAPI } from '../core/thread-executor-api';
import { ok, err, Result } from '../utils/result';
import { Observable, Observer, create, fromPromise } from '../utils/observable';

/**
 * ExecutionBuilder - 流畅的执行构建器
 */
export class ExecutionBuilder {
  private executor: ThreadExecutorAPI;
  private workflowId?: string;
  private options: ExecuteOptions = {};
  private onProgressCallbacks: Array<(progress: any) => void> = [];
  private onErrorCallbacks: Array<(error: any) => void> = [];
  private abortController?: AbortController;

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

  /**
   * 异步执行工作流（返回Observable）
   * 提供响应式接口，支持进度监控和取消
   * @returns Observable<ExecutionEvent>
   */
  executeAsync(): Observable<ExecutionEvent> {
    if (!this.workflowId) {
      return create((observer) => {
        observer.error(new Error('工作流ID未设置，请先调用withWorkflow()'));
        return () => {};
      });
    }

    const workflowId = this.workflowId; // workflowId在这里已经确定存在

    return create((observer) => {
      // 创建AbortController用于取消执行
      this.abortController = new AbortController();
      const signal = this.abortController.signal;

      // 发送开始事件
      observer.next({
        type: 'start',
        timestamp: Date.now(),
        workflowId
      });

      // 执行工作流
      const executePromise = this.executeWithSignal(signal);

      // 监听执行结果
      executePromise
        .then((result) => {
          // 发送完成事件
          observer.next({
            type: 'complete',
            timestamp: Date.now(),
            workflowId,
            result
          });
          observer.complete();
        })
        .catch((error) => {
          if (signal.aborted) {
            // 发送取消事件
            observer.next({
              type: 'cancelled',
              timestamp: Date.now(),
              workflowId,
              reason: 'Execution was cancelled'
            });
            observer.complete();
          } else {
            // 发送错误事件
            observer.next({
              type: 'error',
              timestamp: Date.now(),
              workflowId,
              error
            });
            observer.error(error);
          }
        });

      // 返回取消订阅函数
      return {
        unsubscribe: () => {
          if (this.abortController && !signal.aborted) {
            this.abortController.abort();
          }
        },
        get closed() {
          return signal.aborted;
        }
      };
    });
  }

  /**
   * 使用AbortSignal执行工作流
   * @param signal AbortSignal
   * @returns Promise<ThreadResult>
   */
  private async executeWithSignal(signal: AbortSignal): Promise<ThreadResult> {
    // 检查是否已取消
    if (signal.aborted) {
      throw new Error('Execution was cancelled');
    }

    // 包装执行逻辑以支持取消
    const executionPromise = this.executor.executeWorkflow(this.workflowId!, this.options);

    // 创建一个可以取消的Promise
    return new Promise((resolve, reject) => {
      const abortHandler = () => {
        reject(new Error('Execution was cancelled'));
      };

      signal.addEventListener('abort', abortHandler);

      executionPromise
        .then(resolve)
        .catch(reject)
        .finally(() => {
          signal.removeEventListener('abort', abortHandler);
        });
    });
  }

  /**
   * 取消执行
   * @returns void
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * 获取执行进度Observable
   * @returns Observable<ProgressEvent>
   */
  observeProgress(): Observable<ProgressEvent> {
    return create((observer) => {
      const callback = (progress: any) => {
        observer.next({
          type: 'progress',
          timestamp: Date.now(),
          workflowId: this.workflowId!,
          progress
        });
      };

      this.onProgressCallbacks.push(callback);

      let unsubscribed = false;
      return {
        unsubscribe: () => {
          if (!unsubscribed) {
            unsubscribed = true;
            const index = this.onProgressCallbacks.indexOf(callback);
            if (index > -1) {
              this.onProgressCallbacks.splice(index, 1);
            }
          }
        },
        get closed() {
          return unsubscribed;
        }
      };
    });
  }

  /**
   * 获取节点执行事件Observable
   * @returns Observable<NodeExecutedEvent>
   */
  observeNodeExecuted(): Observable<NodeExecutedEvent> {
    return create((observer) => {
      const callback = (result: any) => {
        observer.next({
          type: 'nodeExecuted',
          timestamp: Date.now(),
          workflowId: this.workflowId!,
          nodeResult: result
        });
      };

      this.options.onNodeExecuted = callback;

      let unsubscribed = false;
      return {
        unsubscribe: () => {
          if (!unsubscribed) {
            unsubscribed = true;
            if (this.options.onNodeExecuted === callback) {
              delete this.options.onNodeExecuted;
            }
          }
        },
        get closed() {
          return unsubscribed;
        }
      };
    });
  }

  /**
   * 获取错误事件Observable
   * @returns Observable<ErrorEvent>
   */
  observeError(): Observable<ErrorEvent> {
    return create((observer) => {
      const callback = (error: any) => {
        observer.next({
          type: 'error',
          timestamp: Date.now(),
          workflowId: this.workflowId!,
          error
        });
      };

      this.onErrorCallbacks.push(callback);

      let unsubscribed = false;
      return {
        unsubscribe: () => {
          if (!unsubscribed) {
            unsubscribed = true;
            const index = this.onErrorCallbacks.indexOf(callback);
            if (index > -1) {
              this.onErrorCallbacks.splice(index, 1);
            }
          }
        },
        get closed() {
          return unsubscribed;
        }
      };
    });
  }

  /**
   * 获取所有执行事件Observable
   * @returns Observable<ExecutionEvent>
   */
  observeAll(): Observable<ExecutionEvent> {
    return create((observer) => {
      const subscriptions: Array<{ unsubscribe: () => void; closed: boolean }> = [];

      // 订阅进度事件
      subscriptions.push(
        this.observeProgress().subscribe(
          (event) => observer.next(event),
          (err) => observer.error(err),
          () => {}
        )
      );

      // 订阅节点执行事件
      subscriptions.push(
        this.observeNodeExecuted().subscribe(
          (event) => observer.next(event),
          (err) => observer.error(err),
          () => {}
        )
      );

      // 订阅错误事件
      subscriptions.push(
        this.observeError().subscribe(
          (event) => observer.next(event),
          (err) => observer.error(err),
          () => {}
        )
      );

      return {
        unsubscribe: () => {
          subscriptions.forEach((sub) => sub.unsubscribe());
        },
        get closed() {
          return subscriptions.every((sub) => sub.closed);
        }
      };
    });
  }
}

/**
 * 执行事件类型
 */
export type ExecutionEvent =
  | StartEvent
  | CompleteEvent
  | ErrorEvent
  | CancelledEvent
  | ProgressEvent
  | NodeExecutedEvent;

/**
 * 开始事件
 */
export interface StartEvent {
  type: 'start';
  timestamp: number;
  workflowId: string;
}

/**
 * 完成事件
 */
export interface CompleteEvent {
  type: 'complete';
  timestamp: number;
  workflowId: string;
  result: ThreadResult;
}

/**
 * 错误事件
 */
export interface ErrorEvent {
  type: 'error';
  timestamp: number;
  workflowId: string;
  error: any;
}

/**
 * 取消事件
 */
export interface CancelledEvent {
  type: 'cancelled';
  timestamp: number;
  workflowId: string;
  reason: string;
}

/**
 * 进度事件
 */
export interface ProgressEvent {
  type: 'progress';
  timestamp: number;
  workflowId: string;
  progress: any;
}

/**
 * 节点执行事件
 */
export interface NodeExecutedEvent {
  type: 'nodeExecuted';
  timestamp: number;
  workflowId: string;
  nodeResult: any;
}