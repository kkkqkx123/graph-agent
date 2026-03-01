/**
 * ThreadPoolService - 线程池服务（全局单例服务）
 *
 * 职责：
 * - 管理 ThreadExecutor 实例的创建、分配和回收
 * - 实现动态扩缩容
 * - 维护空闲执行器队列和忙碌执行器集合
 * - 为整个系统提供统一的线程池资源管理
 *
 * 设计原则：
 * - 全局单例服务，通过 DI 容器管理
 * - 所有触发子工作流和动态线程共享同一个线程池实例
 * - 动态扩缩容，根据负载创建新执行器
 * - 空闲超时回收，避免资源浪费
 *
 * 注意：JavaScript 是单线程事件循环模型，所有状态修改都在事件循环的原子执行单元内完成，
 * 不需要额外的锁机制。项目中的"线程"只是逻辑概念（执行实例），而非真正的 OS 线程。
 */

import { ThreadExecutor } from '../execution/thread-executor.js';
import { type ExecutorWrapper, type PoolStats } from '../execution/types/task.types.js';
import { type SubworkflowManagerConfig } from '../execution/types/triggered-subgraph.types.js';
import { now } from '@modular-agent/common-utils';

/**
 * ThreadPoolService - 线程池服务（全局单例）
 */
export class ThreadPoolService {
  private static instance: ThreadPoolService | null = null;

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
   * ThreadExecutor 工厂函数
   */
  private executorFactory: () => ThreadExecutor;

  /**
   * 配置
   */
  private config: Required<SubworkflowManagerConfig>;

  /**
   * 是否已关闭
   */
  private isShutdown: boolean = false;

  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor(executorFactory: () => ThreadExecutor, config?: SubworkflowManagerConfig) {
    this.executorFactory = executorFactory;
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
   * 获取单例实例
   * @param executorFactory ThreadExecutor 工厂函数
   * @param config 配置
   * @returns 单例实例
   */
  static getInstance(executorFactory: () => ThreadExecutor, config?: SubworkflowManagerConfig): ThreadPoolService {
    if (!ThreadPoolService.instance) {
      ThreadPoolService.instance = new ThreadPoolService(executorFactory, config);
    }
    return ThreadPoolService.instance;
  }

  /**
   * 重置单例实例（用于测试）
   */
  static resetInstance(): void {
    if (ThreadPoolService.instance) {
      ThreadPoolService.instance.shutdown();
      ThreadPoolService.instance = null;
    }
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

    // 使用工厂函数创建 ThreadExecutor
    const executor = this.executorFactory();

    const wrapper: ExecutorWrapper = {
      executorId,
      executor,
      status: 'IDLE',
      lastUsedTime: now()
    };

    return wrapper;
  }

  /**
   * 分配执行器
   *
   * JavaScript 事件循环保证串行执行，不需要锁保护
   *
   * @returns 执行器实例
   */
  async allocateExecutor(): Promise<any> {
    if (this.isShutdown) {
      throw new Error('ThreadPoolService is shutdown');
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

    // 等待空闲执行器
    return new Promise((resolve, reject) => {
      this.waitingPromises.push({ resolve, reject });
    });
  }

  /**
   * 释放执行器
   *
   * JavaScript 事件循环保证串行执行，不需要锁保护
   *
   * @param executor 执行器实例
   */
  async releaseExecutor(executor: any): Promise<void> {
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
  }

  /**
   * 安排空闲超时
   * @param executorId 执行器 ID
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
   * 销毁执行器
   * @param executorId 执行器 ID
   */
  private async destroyExecutor(executorId: string): Promise<void> {
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
   * 关闭线程池
   */
  async shutdown(): Promise<void> {
    if (this.isShutdown) {
      return;
    }

    this.isShutdown = true;

    // 拒绝所有等待的 Promise
    for (const waiting of this.waitingPromises) {
      waiting.reject(new Error('ThreadPoolService is shutdown'));
    }
    this.waitingPromises = [];

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
