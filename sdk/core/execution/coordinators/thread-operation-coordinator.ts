/**
 * Thread 操作协调器
 * 负责协调 Thread 的结构操作（Fork/Join/Copy）
 *
 * 核心职责：
 * 1. 协调 Fork 操作 - 创建子 Thread
 * 2. 协调 Join 操作 - 合并子 Thread 结果
 * 3. 协调 Copy 操作 - 创建 Thread 副本
 * 4. 触发相关事件
 *
 * 设计原则：
 * - 无状态设计：不持有任何实例变量
 * - 依赖注入：通过构造函数接收依赖
 * - 专门处理 Thread 结构变更操作
 */

import type { ForkConfig, JoinResult } from '../utils/thread-operations.js';
import { type ThreadRegistry } from '../../services/thread-registry.js';
import { ThreadBuilder } from '../thread-builder.js';
import type { EventManager } from '../../services/event-manager.js';
import type { WorkflowRegistry } from '../../services/workflow-registry.js';
import type { ToolService } from '../../services/tool-service.js';
import type { GraphRegistry } from '../../services/graph-registry.js';
import { ThreadContextNotFoundError } from '@modular-agent/types';
import { fork, join, copy } from '../utils/thread-operations.js';
import type { ThreadEntity } from '../../entities/thread-entity.js';

/**
 * Thread 操作协调器类
 *
 * 职责：
 * - 协调 Thread 的结构操作（Fork/Join/Copy）
 * - 处理 Thread 之间的关系管理
 * - 触发相关事件
 *
 * 设计原则：
 * - 无状态设计：不持有任何实例变量
 * - 依赖注入：通过构造函数接收依赖
 * - 专门处理 Thread 结构变更操作
 */
export class ThreadOperationCoordinator {
  private threadRegistry: ThreadRegistry;
  private eventManager: EventManager;

  constructor(
    threadRegistry: ThreadRegistry,
    eventManager: EventManager,
  ) {
    this.threadRegistry = threadRegistry;
    this.eventManager = eventManager;
  }

  /**
   * Fork 操作 - 创建子 Thread
   *
   * @param parentThreadId 父线程 ID
   * @param forkConfig Fork 配置
   * @returns 子线程 ID 数组
   */
  async fork(parentThreadId: string, forkConfig: ForkConfig): Promise<string[]> {
    // 步骤 1：获取父线程实体
    const parentThreadEntity = this.threadRegistry.get(parentThreadId);
    if (!parentThreadEntity) {
      throw new ThreadContextNotFoundError(`Parent thread not found: ${parentThreadId}`, parentThreadId);
    }

    // 步骤 2：使用 ThreadOperations 创建子线程（事件触发在内部处理）
    const threadBuilder = new ThreadBuilder();
    const childThreadEntity = await fork(parentThreadEntity, forkConfig, threadBuilder, this.eventManager);

    // 步骤 3：注册子线程
    this.threadRegistry.register(childThreadEntity);

    // 步骤 4：返回子线程 ID 数组
    return [childThreadEntity.getThreadId()];
  }

  /**
   * Join 操作 - 合并子 Thread 结果
   *
   * @param parentThreadId 父线程 ID
   * @param childThreadIds 子线程 ID 数组
   * @param joinStrategy Join 策略
   * @param timeout 超时时间（秒）
   * @param mainPathId 主线程路径 ID（可选）
   * @returns Join 结果
   */
  async join(
    parentThreadId: string,
    childThreadIds: string[],
    joinStrategy: 'ALL_COMPLETED' | 'ANY_COMPLETED' | 'ALL_FAILED' | 'ANY_FAILED' | 'SUCCESS_COUNT_THRESHOLD' = 'ALL_COMPLETED',
    timeout: number = 60,
    mainPathId: string
  ): Promise<JoinResult> {
    // 步骤 1：获取父线程实体
    const parentThreadEntity = this.threadRegistry.get(parentThreadId);
    if (!parentThreadEntity) {
      throw new ThreadContextNotFoundError(`Parent thread not found: ${parentThreadId}`, parentThreadId);
    }

    // 步骤 2：使用 ThreadOperations 执行 Join（事件触发在内部处理）
    const joinResult = await join(
      childThreadIds,
      joinStrategy,
      this.threadRegistry,
      mainPathId,
      timeout, // 注意：thread-operations.ts中的timeout已经是秒为单位
      parentThreadId,
      this.eventManager
    );

    // 步骤 3：返回 Join 结果
    return joinResult;
  }

  /**
   * Copy 操作 - 创建 Thread 副本
   *
   * @param sourceThreadId 源线程 ID
   * @returns 副本线程 ID
   */
  async copy(sourceThreadId: string): Promise<string> {
    // 步骤 1：获取源线程实体
    const sourceThreadEntity = this.threadRegistry.get(sourceThreadId);
    if (!sourceThreadEntity) {
      throw new ThreadContextNotFoundError(`Source thread not found: ${sourceThreadId}`, sourceThreadId);
    }

    // 步骤 2：使用 ThreadOperations 创建副本（事件触发在内部处理）
    const threadBuilder = new ThreadBuilder();
    const copiedThreadEntity = await copy(sourceThreadEntity, threadBuilder, this.eventManager);

    // 步骤 3：注册副本线程
    this.threadRegistry.register(copiedThreadEntity);

    // 步骤 4：返回副本线程 ID
    return copiedThreadEntity.getThreadId();
  }
}