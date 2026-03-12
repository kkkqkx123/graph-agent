/**
 * AgentLoopCoordinator - Agent Loop 生命周期协调器
 *
 * 协调 AgentLoopEntity 的完整生命周期管理。
 * 参考 ThreadLifecycleCoordinator 的设计模式。
 */

import type { ID } from '@modular-agent/types';
import type { AgentLoopConfig, AgentLoopResult } from '@modular-agent/types';
import { AgentLoopEntity } from '../../entities/agent-loop-entity.js';
import { AgentLoopStatus } from '@modular-agent/types';
import { AgentLoopFactory, type AgentLoopEntityOptions } from '../../execution/factories/index.js';
import { AgentLoopRegistry } from '../../services/agent-loop-registry.js';
import { AgentLoopExecutor, type AgentLoopStreamEvent } from '../executors/agent-loop-executor.js';
import { createContextualLogger } from '../../../utils/contextual-logger.js';

const logger = createContextualLogger({ component: 'AgentLoopCoordinator' });

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

    logger.info('Agent Loop entity created', {
      agentLoopId: entity.id,
      maxIterations: config.maxIterations,
      toolsCount: config.tools?.length || 0
    });

    // 2. 注册实体
    this.registry.register(entity);

    logger.debug('Agent Loop registered', { agentLoopId: entity.id });

    // 3. 开始执行
    entity.state.start();

    logger.info('Agent Loop execution started', {
      agentLoopId: entity.id,
      nodeId: entity.nodeId,
      parentThreadId: entity.parentThreadId
    });

    try {
      // 4. 执行循环
      const result = await this.executor.execute(entity);

      // 5. 更新状态
      if (result.success) {
        entity.state.complete();
        logger.info('Agent Loop execution completed successfully', {
          agentLoopId: entity.id,
          iterations: result.iterations,
          toolCallCount: result.toolCallCount
        });
      } else {
        entity.state.fail(result.error);
        logger.warn('Agent Loop execution failed', {
          agentLoopId: entity.id,
          iterations: result.iterations,
          error: result.error
        });
      }

      return result;
    } catch (error) {
      entity.state.fail(error);
      logger.error('Agent Loop execution unexpected error', {
        agentLoopId: entity.id,
        error: error instanceof Error ? error.message : String(error)
      });
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

    logger.info('Agent Loop entity created for stream execution', {
      agentLoopId: entity.id,
      maxIterations: config.maxIterations,
      toolsCount: config.tools?.length || 0
    });

    // 2. 注册实体
    this.registry.register(entity);

    logger.debug('Agent Loop registered for stream execution', { agentLoopId: entity.id });

    // 3. 开始执行
    entity.state.start();

    logger.info('Agent Loop stream execution started', {
      agentLoopId: entity.id,
      nodeId: entity.nodeId,
      parentThreadId: entity.parentThreadId
    });

    try {
      // 4. 流式执行循环
      for await (const event of this.executor.executeStream(entity)) {
        yield event;

        // 检查中断信号
        if (entity.shouldPause()) {
          entity.state.pause();
          logger.info('Agent Loop stream execution paused', { agentLoopId: entity.id });
          return;
        }
        if (entity.shouldStop()) {
          entity.state.cancel();
          logger.info('Agent Loop stream execution stopped', { agentLoopId: entity.id });
          return;
        }
      }

      // 5. 完成状态
      entity.state.complete();
      logger.info('Agent Loop stream execution completed', {
        agentLoopId: entity.id,
        iterations: entity.state.currentIteration
      });
    } catch (error) {
      entity.state.fail(error);
      logger.error('Agent Loop stream execution error', {
        agentLoopId: entity.id,
        error: error instanceof Error ? error.message : String(error)
      });
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

    logger.info('Agent Loop entity created for async execution', {
      agentLoopId: entity.id,
      maxIterations: config.maxIterations,
      toolsCount: config.tools?.length || 0
    });

    // 2. 注册实体
    this.registry.register(entity);

    logger.debug('Agent Loop registered for async execution', { agentLoopId: entity.id });

    // 3. 开始执行
    entity.state.start();

    logger.info('Agent Loop async execution started', {
      agentLoopId: entity.id,
      nodeId: entity.nodeId,
      parentThreadId: entity.parentThreadId
    });

    // 4. 异步执行（不等待结果）
    this.executor.execute(entity)
      .then(result => {
        if (result.success) {
          entity.state.complete();
          logger.info('Agent Loop async execution completed', {
            agentLoopId: entity.id,
            iterations: result.iterations,
            toolCallCount: result.toolCallCount
          });
        } else {
          entity.state.fail(result.error);
          logger.warn('Agent Loop async execution failed', {
            agentLoopId: entity.id,
            iterations: result.iterations,
            error: result.error
          });
        }
      })
      .catch(error => {
        entity.state.fail(error);
        logger.error('Agent Loop async execution unexpected error', {
          agentLoopId: entity.id,
          error: error instanceof Error ? error.message : String(error)
        });
      });

    return entity.id;
  }

  /**
   * 暂停执行
   * @param id 实例 ID
   */
  async pause(id: ID): Promise<void> {
    logger.debug('Attempting to pause Agent Loop', { agentLoopId: id });

    const entity = this.registry.get(id);
    if (!entity) {
      logger.warn('Agent Loop not found for pause operation', { agentLoopId: id });
      throw new Error(`AgentLoop not found: ${id}`);
    }

    if (!entity.isRunning()) {
      logger.warn('Agent Loop is not running, cannot pause', {
        agentLoopId: id,
        currentStatus: entity.getStatus()
      });
      throw new Error(`AgentLoop is not running: ${id}`);
    }

    // 设置暂停标志
    entity.interrupt('PAUSE');
    logger.info('Agent Loop pause requested', { agentLoopId: id });
  }

  /**
   * 恢复执行
   * @param id 实例 ID
   * @returns 执行结果
   */
  async resume(id: ID): Promise<AgentLoopResult> {
    logger.debug('Attempting to resume Agent Loop', { agentLoopId: id });

    const entity = this.registry.get(id);
    if (!entity) {
      logger.warn('Agent Loop not found for resume operation', { agentLoopId: id });
      throw new Error(`AgentLoop not found: ${id}`);
    }

    if (!entity.isPaused()) {
      logger.warn('Agent Loop is not paused, cannot resume', {
        agentLoopId: id,
        currentStatus: entity.getStatus()
      });
      throw new Error(`AgentLoop is not paused: ${id}`);
    }

    // 重置中断标志
    entity.resetInterrupt();

    // 恢复执行
    entity.state.resume();

    logger.info('Agent Loop resumed', {
      agentLoopId: id,
      currentIteration: entity.state.currentIteration
    });

    try {
      const result = await this.executor.execute(entity);

      if (result.success) {
        entity.state.complete();
        logger.info('Agent Loop resumed execution completed successfully', {
          agentLoopId: id,
          iterations: result.iterations,
          toolCallCount: result.toolCallCount
        });
      } else {
        entity.state.fail(result.error);
        logger.warn('Agent Loop resumed execution failed', {
          agentLoopId: id,
          iterations: result.iterations,
          error: result.error
        });
      }

      return result;
    } catch (error) {
      entity.state.fail(error);
      logger.error('Agent Loop resumed execution unexpected error', {
        agentLoopId: id,
        error: error instanceof Error ? error.message : String(error)
      });
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
    logger.debug('Attempting to stop Agent Loop', { agentLoopId: id });

    const entity = this.registry.get(id);
    if (!entity) {
      logger.warn('Agent Loop not found for stop operation', { agentLoopId: id });
      throw new Error(`AgentLoop not found: ${id}`);
    }

    // 设置停止标志并中止
    entity.interrupt('STOP');
    entity.state.cancel();

    logger.info('Agent Loop stopped', {
      agentLoopId: id,
      iterations: entity.state.currentIteration,
      toolCallCount: entity.state.toolCallCount
    });
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
    const count = this.registry.cleanupCompleted();
    if (count > 0) {
      logger.info('Agent Loop completed instances cleaned up', { count });
    }
    return count;
  }
}
