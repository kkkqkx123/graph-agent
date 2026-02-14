/**
 * ExecutionBuilder - 流畅的执行构建器
 * 提供链式API来配置和执行工作流
 * 支持Result、Promise和Observable三种接口
 */

import type { ThreadResult, ThreadOptions } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types';
import { Observable, create, type Observer } from '../utils/observable';
import { ExecuteThreadCommand } from '../operations/commands/execution/execute-thread-command';
import { isSuccess } from '@modular-agent/sdk/api/types/execution-result';
import { ExecutionError } from '@modular-agent/types';

/**
 * ExecutionBuilder - 流畅的执行构建器
 */
export class ExecutionBuilder {
  private workflowId?: string;
  private options: ThreadOptions = {};
  private onProgressCallbacks: Array<(progress: any) => void> = [];
  private onErrorCallbacks: Array<(error: any) => void> = [];
  private abortController?: AbortController;

  constructor() {
    // 不再依赖ThreadExecutorAPI，改为使用Command模式
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
   * 执行工作流（返回Result类型）
   * @returns Promise<Result<ThreadResult, Error>>
   */
  async execute(): Promise<Result<ThreadResult, Error>> {
    if (!this.workflowId) {
      return err(new Error('工作流ID未设置，请先调用withWorkflow()'));
    }

    try {
      // 使用Command模式执行线程
      const command = new ExecuteThreadCommand({
        workflowId: this.workflowId,
        options: this.options
      });

      const executionResult = await command.execute();

      // 处理ExecutionResult类型
      if (isSuccess(executionResult)) {
        return ok(executionResult.data);
      } else {
        return err(new Error(executionResult.error.message || '执行失败'));
      }
    } catch (error) {
      // 触发错误回调
      this.onErrorCallbacks.forEach(callback => {
        try {
          callback(error);
        } catch (callbackError) {
          // 抛出错误，由调用方决定如何处理
          throw new ExecutionError(
            'Error callback execution failed',
            undefined,
            this.workflowId,
            {
              operation: 'error_callback'
            },
            callbackError instanceof Error ? callbackError : new Error(String(callbackError))
          );
        }
      });

      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 执行工作流（返回Promise，兼容性方法）
   * @returns Promise<ThreadResult>
   * @deprecated 推荐使用execute()方法返回Result类型
   */
  async executePromise(): Promise<ThreadResult> {
    const result = await this.execute();
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }

  /**
   * 执行工作流（返回Promise，支持then/catch，兼容性方法）
   * @returns Promise<ThreadResult>
   * @deprecated 推荐使用execute()方法返回Result类型
   */
  then<TResult = ThreadResult>(
    onfulfilled?: ((value: ThreadResult) => TResult | PromiseLike<TResult>) | null,
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<TResult> {
    return this.executePromise().then(onfulfilled, onrejected);
  }

  /**
   * 执行工作流（支持catch，兼容性方法）
   * @param onrejected 错误处理函数
   * @returns Promise<ThreadResult>
   * @deprecated 推荐使用execute()方法返回Result类型
   */
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<ThreadResult | TResult> {
    return this.executePromise().catch(onrejected);
  }

  /**
   * 执行工作流（支持finally，兼容性方法）
   * @param onfinally 最终执行函数
   * @returns Promise<ThreadResult>
   * @deprecated 推荐使用execute()方法返回Result类型
   */
  finally(onfinally?: (() => void) | null): Promise<ThreadResult> {
    return this.executePromise().finally(onfinally);
  }

  /**
   * 异步执行工作流（返回Observable）
   * 提供响应式接口，支持进度监控和取消
   * @returns Observable<ExecutionEvent>
   */
  executeAsync(): Observable<ExecutionEvent> {
    if (!this.workflowId) {
      return create((observer: Observer<ExecutionEvent>) => {
        observer.error(new Error('工作流ID未设置，请先调用withWorkflow()'));
        return () => { };
      });
    }

    const workflowId = this.workflowId; // workflowId在这里已经确定存在
    let threadId: string | undefined;

    return create((observer: Observer<ExecutionEvent>) => {
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
          if (result.isOk()) {
            threadId = result.value.threadId;
            // 发送完成事件
            observer.next({
              type: 'complete',
              timestamp: Date.now(),
              workflowId,
              threadId: result.value.threadId,
              result: result.value,
              executionStats: {
                duration: result.value.executionTime,
                steps: result.value.nodeResults.length,
                nodesExecuted: result.value.nodeResults.length
              }
            });
            observer.complete();
          } else {
            if (signal.aborted) {
              // 发送取消事件
              observer.next({
                type: 'cancelled',
                timestamp: Date.now(),
                workflowId,
                threadId: threadId || 'unknown',
                reason: result.error.message
              });
              observer.complete();
            } else {
              // 发送错误事件
              observer.next({
                type: 'error',
                timestamp: Date.now(),
                workflowId,
                threadId: threadId || 'unknown',
                error: result.error
              });
              observer.error(result.error);
            }
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
   * @returns Promise<Result<ThreadResult, Error>>
   */
  private async executeWithSignal(signal: AbortSignal): Promise<Result<ThreadResult, Error>> {
    // 检查是否已取消
    if (signal.aborted) {
      return err(new Error('Execution was cancelled'));
    }

    // 使用Command模式执行线程
    const command = new ExecuteThreadCommand({
      workflowId: this.workflowId!,
      options: this.options
    });

    const executionResult = await command.execute();

    // 处理ExecutionResult类型
    if (isSuccess(executionResult)) {
      return ok(executionResult.data);
    } else {
      return err(new Error(executionResult.error.message || '执行失败'));
    }
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
    return create((observer: Observer<ProgressEvent>) => {
      const callback = (progress: any) => {
        observer.next({
          type: 'progress',
          timestamp: Date.now(),
          workflowId: this.workflowId!,
          threadId: progress.threadId || 'unknown',
          progress: {
            status: progress.status || 'running',
            currentStep: progress.currentStep || 0,
            totalSteps: progress.totalSteps,
            currentNodeId: progress.currentNodeId || 'unknown',
            currentNodeType: progress.currentNodeType || 'unknown'
          }
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
    return create((observer: Observer<NodeExecutedEvent>) => {
      const callback = (result: any) => {
        observer.next({
          type: 'nodeExecuted',
          timestamp: Date.now(),
          workflowId: this.workflowId!,
          threadId: result.threadId || 'unknown',
          nodeId: result.nodeId || 'unknown',
          nodeType: result.nodeType || 'unknown',
          nodeResult: result,
          executionTime: result.executionTime || 0
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
    return create((observer: Observer<ErrorEvent>) => {
      const callback = (error: any) => {
        observer.next({
          type: 'error',
          timestamp: Date.now(),
          workflowId: this.workflowId!,
          threadId: error.threadId || 'unknown',
          error: error instanceof Error ? error : new Error(String(error))
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
    return create((observer: Observer<ExecutionEvent>) => {
      const subscriptions: Array<{ unsubscribe: () => void; closed: boolean }> = [];

      // 订阅进度事件
      subscriptions.push(
        this.observeProgress().subscribe(
          (event: ProgressEvent) => observer.next(event),
          (err: any) => observer.error(err),
          () => { }
        )
      );

      // 订阅节点执行事件
      subscriptions.push(
        this.observeNodeExecuted().subscribe(
          (event: NodeExecutedEvent) => observer.next(event),
          (err: any) => observer.error(err),
          () => { }
        )
      );

      // 订阅错误事件
      subscriptions.push(
        this.observeError().subscribe(
          (event: ErrorEvent) => observer.next(event),
          (err: any) => observer.error(err),
          () => { }
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
  threadId: string;
  result: ThreadResult;
  executionStats: {
    duration: number;
    steps: number;
    nodesExecuted: number;
  };
}

/**
 * 错误事件
 */
export interface ErrorEvent {
  type: 'error';
  timestamp: number;
  workflowId: string;
  threadId: string;
  error: Error;
}

/**
 * 取消事件
 */
export interface CancelledEvent {
  type: 'cancelled';
  timestamp: number;
  workflowId: string;
  threadId: string;
  reason: string;
}

/**
 * 进度事件
 */
export interface ProgressEvent {
  type: 'progress';
  timestamp: number;
  workflowId: string;
  threadId: string;
  progress: {
    status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
    currentStep: number;
    totalSteps?: number;
    currentNodeId: string;
    currentNodeType: string;
  };
}

/**
 * 节点执行事件
 */
export interface NodeExecutedEvent {
  type: 'nodeExecuted';
  timestamp: number;
  workflowId: string;
  threadId: string;
  nodeId: string;
  nodeType: string;
  nodeResult: any;
  executionTime: number;
}