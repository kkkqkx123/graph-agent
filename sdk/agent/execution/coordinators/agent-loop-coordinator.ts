/**
 * AgentLoopCoordinator - Agent Loop 生命周期协调器
 *
 * 协调 AgentLoopEntity 的完整生命周期管理。
 * 参考 ThreadLifecycleCoordinator 的设计模式。
 */

import type { ID } from '@modular-agent/types';
import type { AgentLoopConfig, AgentLoopResult } from '@modular-agent/types';
import { AgentLoopEntity } from '../../entities/agent-loop-entity.js';
import { AgentLoopStatus } from '../../entities/agent-loop-state.js';
import { AgentLoopFactory, type AgentLoopEntityOptions } from '../../execution/factories/index.js';
import { AgentLoopRegistry } from '../../services/agent-loop-registry.js';
import { AgentLoopExecutor, type AgentLoopStreamEvent } from '../executors/agent-loop-executor.js';

/**
 * 执行选项
 */
export interface AgentLoopExecuteOptions extends AgentLoopEntityOptions {
  /** 是否流式执行 */
  stream?: boolean;
  /** 自定义 ID（可选，默认自动生成） */
  id?: ID;
  /** 从检查点恢复（检查点ID） */
  checkpointId?: string;
}

/**
 * AgentLoopCoordinator - Agent Loop 生命周期协调器
 *
 * 核心职责：
 * - 协调 AgentLoopEntity 的创建、执行、暂停、恢复、停止
 * - 编排复杂的多步骤操作
 * - 管理执行实例的生命周期
 *
 * 设计原则：
 * - 无状态设计：不持有任何实例变量
 * - 依赖注入：通过构造函数接收依赖
 * - 流程编排：处理复杂的多步骤操作
 */
export class AgentLoopCoordinator {
  constructor(
    private readonly registry: AgentLoopRegistry,
    private readonly executor: AgentLoopExecutor
  ) { }

  /**
   * 构建实体（内部方法）
   * @param config 循环配置
   * @param options 构建选项
   * @returns AgentLoopEntity 实例
   */
  private buildEntity(config: AgentLoopConfig, options: AgentLoopExecuteOptions = {}): AgentLoopEntity {
    // 如果提供了检查点ID，从检查点恢复
    if (options.checkpointId) {
      throw new Error('From checkpoint is not yet implemented in this method. Please use AgentLoopFactory.fromCheckpoint directly.');
    }

    // 使用工厂方法创建新实例
    return AgentLoopFactory.create(config, options);
  }

  /**
   * 执行 Agent Loop
   * @param config 循环配置
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(config: AgentLoopConfig, options: AgentLoopExecuteOptions = {}): Promise<AgentLoopResult> {
    // 1. 构建实体
    const entity = this.buildEntity(config, options);

    // 2. 注册实体
    this.registry.register(entity);

    // 3. 开始执行
    entity.state.start();

    try {
      // 4. 执行循环
      const result = await this.executor.execute(entity);

      // 5. 更新状态
      if (result.success) {
        entity.state.complete();
      } else {
        entity.state.fail(result.error);
      }

      return result;
    } catch (error) {
      entity.state.fail(error);
      return {
        success: false,
        iterations: entity.state.currentIteration,
        toolCallCount: entity.state.toolCallCount,
        error,
      };
    }
  }

  /**
   * 流式执行 Agent Loop
   * @param config 循环配置
   * @param options 执行选项
   * @returns 流式事件生成器（包含 LLM 层事件和 Agent 层事件）
   */
  async *executeStream(
    config: AgentLoopConfig,
    options: AgentLoopExecuteOptions = {}
  ): AsyncGenerator<AgentLoopStreamEvent> {
    // 1. 构建实体
    const entity = this.buildEntity(config, options);

    // 2. 注册实体
    this.registry.register(entity);

    // 3. 开始执行
    entity.state.start();

    try {
      // 4. 流式执行循环
      for await (const event of this.executor.executeStream(entity)) {
        yield event;

        // 检查中断信号
        if (entity.shouldPause()) {
          entity.state.pause();
          return;
        }
        if (entity.shouldStop()) {
          entity.state.cancel();
          return;
        }
      }

      // 5. 完成状态
      entity.state.complete();
    } catch (error) {
      entity.state.fail(error);
      throw error;
    }
  }

  /**
   * 启动 Agent Loop（异步，返回实例 ID）
   * @param config 循环配置
   * @param options 执行选项
   * @returns 实例 ID
   */
  async start(config: AgentLoopConfig, options: AgentLoopExecuteOptions = {}): Promise<ID> {
    // 1. 构建实体
    const entity = this.buildEntity(config, options);

    // 2. 注册实体
    this.registry.register(entity);

    // 3. 开始执行
    entity.state.start();

    // 4. 异步执行（不等待结果）
    this.executor.execute(entity)
      .then(result => {
        if (result.success) {
          entity.state.complete();
        } else {
          entity.state.fail(result.error);
        }
      })
      .catch(error => {
        entity.state.fail(error);
      });

    return entity.id;
  }

  /**
   * 暂停执行
   * @param id 实例 ID
   */
  async pause(id: ID): Promise<void> {
    const entity = this.registry.get(id);
    if (!entity) {
      throw new Error(`AgentLoop not found: ${id}`);
    }

    if (!entity.isRunning()) {
      throw new Error(`AgentLoop is not running: ${id}`);
    }

    // 设置暂停标志
    entity.interrupt('PAUSE');
  }

  /**
   * 恢复执行
   * @param id 实例 ID
   * @returns 执行结果
   */
  async resume(id: ID): Promise<AgentLoopResult> {
    const entity = this.registry.get(id);
    if (!entity) {
      throw new Error(`AgentLoop not found: ${id}`);
    }

    if (!entity.isPaused()) {
      throw new Error(`AgentLoop is not paused: ${id}`);
    }

    // 重置中断标志
    entity.resetInterrupt();

    // 恢复执行
    entity.state.resume();

    try {
      const result = await this.executor.execute(entity);

      if (result.success) {
        entity.state.complete();
      } else {
        entity.state.fail(result.error);
      }

      return result;
    } catch (error) {
      entity.state.fail(error);
      return {
        success: false,
        iterations: entity.state.currentIteration,
        toolCallCount: entity.state.toolCallCount,
        error,
      };
    }
  }

  /**
   * 停止执行
   * @param id 实例 ID
   */
  async stop(id: ID): Promise<void> {
    const entity = this.registry.get(id);
    if (!entity) {
      throw new Error(`AgentLoop not found: ${id}`);
    }

    // 设置停止标志并中止
    entity.interrupt('STOP');
    entity.state.cancel();
  }

  /**
   * 获取实例
   * @param id 实例 ID
   */
  get(id: ID): AgentLoopEntity | undefined {
    return this.registry.get(id);
  }

  /**
   * 获取实例状态
   * @param id 实例 ID
   */
  getStatus(id: ID): AgentLoopStatus | undefined {
    return this.registry.get(id)?.getStatus();
  }

  /**
   * 获取所有运行中的实例
   */
  getRunning(): AgentLoopEntity[] {
    return this.registry.getRunning();
  }

  /**
   * 获取所有暂停的实例
   */
  getPaused(): AgentLoopEntity[] {
    return this.registry.getPaused();
  }

  /**
   * 清理已完成的实例
   */
  cleanup(): number {
    return this.registry.cleanupCompleted();
  }
}
