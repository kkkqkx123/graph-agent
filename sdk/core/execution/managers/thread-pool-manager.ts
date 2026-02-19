/**
 * ThreadPoolManager - 线程池管理器
 * 用于资源管理，管理 ThreadExecutor 实例的生命周期，而非多个调用者操作一个thread
 * 
 * 职责：
 * - 管理 ThreadExecutor 实例的创建、分配和回收
 * - 实现动态扩缩容
 * - 维护空闲执行器队列和忙碌执行器集合
 * 
 * 设计原则：
 * - 有状态多实例，由TriggeredSubworkflowManager持有
 * - 动态扩缩容，根据负载创建新执行器
 * - 空闲超时回收，避免资源浪费
 */

import { ThreadExecutor } from '../thread-executor.js';
import { ExecutionContext } from '../context/execution-context.js';
import { type ExecutorWrapper, type PoolStats } from '../types/task.types.js';
import { type SubworkflowManagerConfig } from '../types/triggered-subgraph.types.js';
import { now } from '@modular-agent/common-utils';
import { Mutex } from 'async-mutex';

/**
 * ThreadPoolManager - 线程池管理器
 */
export class ThreadPoolManager {
  /**
   * 所有执行器
   */
  private allExecutors: Map<string, ExecutorWrapper> = new Map();

  /**
   * 空闲执行器队列
   */
  private idleExecutors: string[] = [];

  /**
   * 忙碌执行器集合
   */
  private busyExecutors: Set<string> = new Set();

  /**
   * 等待执行器的 Promise 数组
   */
  private waitingPromises: Array<{
    resolve: (executor: any) => void;
    reject: (error: Error) => void;
  }> = [];

  /**
   * 执行上下文
   */
  private executionContext: ExecutionContext;

  /**
   * 配置
   */
  private config: Required<SubworkflowManagerConfig>;

  /**
   * 是否已关闭
   */
  private isShutdown: boolean = false;

  /**
   * 轻量级锁保护状态转换
   */
  private stateLock = new Mutex();

  /**
   * 构造函数
   * @param executionContext 执行上下文
   * @param config 配置
   */
  constructor(executionContext: ExecutionContext, config?: SubworkflowManagerConfig) {
    this.executionContext = executionContext;
    this.config = {
      minExecutors: config?.minExecutors || 1,
      maxExecutors: config?.maxExecutors || 10,
      idleTimeout: config?.idleTimeout || 30000,
      maxQueueSize: config?.maxQueueSize || 100,
      taskRetentionTime: config?.taskRetentionTime || 60 * 60 * 1000,
      defaultTimeout: config?.defaultTimeout || 30000
    };

    // 初始化最小数量的执行器
    this.initializeMinExecutors();
  }

  /**
   * 初始化最小数量的执行器
   */
  private initializeMinExecutors(): void {
    for (let i = 0; i < this.config.minExecutors; i++) {
      const executor = this.createExecutor();
      this.allExecutors.set(executor.executorId, executor);
      this.idleExecutors.push(executor.executorId);
    }
  }

  /**
   * 创建新的执行器
   * @returns 执行器包装
   */
  private createExecutor(): ExecutorWrapper {
    const executorId = `executor-${now()}-${Math.random().toString(36).substr(2, 9)}`;
    const executor = new ThreadExecutor(this.executionContext);

    const wrapper: ExecutorWrapper = {
      executorId,
      executor,
      status: 'IDLE',
      lastUsedTime: now()
    };

    return wrapper;
  }

  /**
   * 分配执行器（线程安全）
   * @returns 执行器实例
   */
  async allocateExecutor(): Promise<any> {
    const release = await this.stateLock.acquire();
    try {
      if (this.isShutdown) {
        throw new Error('ThreadPoolManager is shutdown');
      }

      // 检查是否有空闲执行器
      if (this.idleExecutors.length > 0) {
        const executorId = this.idleExecutors.shift()!;
        const wrapper = this.allExecutors.get(executorId)!;

        // 清除空闲超时定时器
        if (wrapper.idleTimer) {
          clearTimeout(wrapper.idleTimer);
          wrapper.idleTimer = undefined;
        }

        // 更新状态
        wrapper.status = 'BUSY';
        wrapper.lastUsedTime = now();
        this.busyExecutors.add(executorId);

        return wrapper.executor;
      }

      // 检查是否可以创建新执行器
      if (this.allExecutors.size < this.config.maxExecutors) {
        const wrapper = this.createExecutor();
        this.allExecutors.set(wrapper.executorId, wrapper);

        // 更新状态
        wrapper.status = 'BUSY';
        wrapper.lastUsedTime = now();
        this.busyExecutors.add(wrapper.executorId);

        return wrapper.executor;
      }

      // 等待空闲执行器（在锁外等待）
      return new Promise((resolve, reject) => {
        this.waitingPromises.push({ resolve, reject });
      });
    } finally {
      release();
    }
  }

  /**
   * 释放执行器（线程安全）
   * @param executor 执行器实例
   */
  async releaseExecutor(executor: any): Promise<void> {
    const release = await this.stateLock.acquire();
    try {
      if (this.isShutdown) {
        return;
      }

      // 查找执行器包装
      let executorId: string | undefined;
      for (const [id, wrapper] of this.allExecutors.entries()) {
        if (wrapper.executor === executor) {
          executorId = id;
          break;
        }
      }

      if (!executorId) {
        console.warn('Executor not found in pool');
        return;
      }

      const wrapper = this.allExecutors.get(executorId)!;

      // 从忙碌集合移除
      this.busyExecutors.delete(executorId);

      // 检查是否有等待的 Promise
      if (this.waitingPromises.length > 0) {
        const waiting = this.waitingPromises.shift()!;
        wrapper.status = 'BUSY';
        wrapper.lastUsedTime = now();
        this.busyExecutors.add(executorId);
        waiting.resolve(wrapper.executor);
        return;
      }

      // 加入空闲队列
      wrapper.status = 'IDLE';
      wrapper.lastUsedTime = now();
      this.idleExecutors.push(executorId);

      // 设置空闲超时定时器
      this.scheduleIdleTimeout(executorId);
    } finally {
      release();
    }
  }

  /**
   * 安排空闲超时
   * @param executorId 执行器ID
   */
  private scheduleIdleTimeout(executorId: string): void {
    const wrapper = this.allExecutors.get(executorId);
    if (!wrapper) {
      return;
    }

    // 如果执行器数量超过最小值，设置超时
    if (this.allExecutors.size > this.config.minExecutors) {
      wrapper.idleTimer = setTimeout(() => {
        this.destroyExecutor(executorId);
      }, this.config.idleTimeout);
    }
  }

  /**
   * 销毁执行器（线程安全）
   * @param executorId 执行器ID
   */
  private async destroyExecutor(executorId: string): Promise<void> {
    const release = await this.stateLock.acquire();
    try {
      const wrapper = this.allExecutors.get(executorId);
      if (!wrapper) {
        return;
      }

      // 清除定时器
      if (wrapper.idleTimer) {
        clearTimeout(wrapper.idleTimer);
      }

      // 从空闲队列移除
      const index = this.idleExecutors.indexOf(executorId);
      if (index > -1) {
        this.idleExecutors.splice(index, 1);
      }

      // 从所有执行器移除
      this.allExecutors.delete(executorId);

      // 清理资源（如果执行器有 cleanup 方法）
      if (typeof wrapper.executor.cleanup === 'function') {
        wrapper.executor.cleanup();
      }
    } finally {
      release();
    }
  }

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats(): PoolStats {
    return {
      totalExecutors: this.allExecutors.size,
      idleExecutors: this.idleExecutors.length,
      busyExecutors: this.busyExecutors.size,
      minExecutors: this.config.minExecutors,
      maxExecutors: this.config.maxExecutors
    };
  }

  /**
   * 获取配置
   * @returns 配置
   */
  getConfig(): Required<SubworkflowManagerConfig> {
    return this.config;
  }

  /**
   * 关闭线程池（线程安全）
   */
  async shutdown(): Promise<void> {
    const release = await this.stateLock.acquire();
    try {
      if (this.isShutdown) {
        return;
      }

      this.isShutdown = true;

      // 拒绝所有等待的 Promise
      for (const waiting of this.waitingPromises) {
        waiting.reject(new Error('ThreadPoolManager is shutdown'));
      }
      this.waitingPromises = [];
    } finally {
      release();
    }

    // 等待所有忙碌执行器完成
    while (this.busyExecutors.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 销毁所有空闲执行器
    for (const executorId of this.idleExecutors) {
      await this.destroyExecutor(executorId);
    }

    // 清空所有执行器
    this.allExecutors.clear();
    this.idleExecutors = [];
    this.busyExecutors.clear();
  }

  /**
   * 检查是否已关闭
   * @returns 是否已关闭
   */
  isShutdownFlag(): boolean {
    return this.isShutdown;
  }
}