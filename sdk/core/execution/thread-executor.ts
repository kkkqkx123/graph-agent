/**
 * ThreadExecutor - Thread 执行器
 * 负责执行单个 ThreadEntity 实例，管理 thread 的完整执行生命周期
 * 支持图导航器进行节点导航
 *
 * 职责：
 * - 执行单个 ThreadEntity
 * - 协调各个执行组件完成执行
 *
 * 不负责：
 * - Thread 的创建和注册（由 ThreadLifecycleCoordinator 负责）
 * - Thread 的暂停、恢复、停止等生命周期管理（由 ThreadLifecycleCoordinator 负责）
 * - 变量设置等管理操作（由 ThreadLifecycleCoordinator 负责）
 * - 节点执行细节（由 NodeExecutionCoordinator 负责）
 * - 错误处理（由 ErrorHandler 负责）
 * - 子图处理（由 SubgraphHandler 负责）
 * - 触发子工作流处理（由 TriggeredSubworkflowManager 负责）
 */

import type { ThreadResult } from '@modular-agent/types';
import type { ThreadEntity } from '../entities/thread-entity.js';
import type { GraphRegistry } from '../services/graph-registry.js';
import type { ThreadExecutionCoordinator } from './coordinators/thread-execution-coordinator.js';

/**
 * 线程隔离管理器工厂接口
 */
interface ThreadIsolatedManagerFactory {
  create(threadId: string, nodeId?: string): any;
}

/**
 * ThreadExecutionCoordinator 工厂接口
 */
interface ThreadExecutionCoordinatorFactory {
  create(threadEntity: ThreadEntity): ThreadExecutionCoordinator;
}

/**
 * ThreadExecutor 依赖配置
 */
export interface ThreadExecutorDependencies {
  /** 图注册表 */
  graphRegistry: GraphRegistry;
  /** ThreadExecutionCoordinator 工厂 */
  threadExecutionCoordinatorFactory: ThreadExecutionCoordinatorFactory;
}

/**
 * ThreadExecutor - Thread 执行器
 *
 * 专注于执行单个 ThreadEntity，不负责线程的创建、注册和管理
 * 通过协调器模式委托具体职责给专门的组件
 *
 * 设计原则：
 * - 通过构造函数注入依赖（依赖倒置）
 * - 保持轻量级，只负责执行协调
 * - 不直接依赖DI容器，便于测试
 */
export class ThreadExecutor {
  private graphRegistry: GraphRegistry;
  private threadExecutionCoordinatorFactory: ThreadExecutionCoordinatorFactory;

  constructor(deps: ThreadExecutorDependencies) {
    this.graphRegistry = deps.graphRegistry;
    this.threadExecutionCoordinatorFactory = deps.threadExecutionCoordinatorFactory;
  }

  /**
   * 执行 ThreadEntity
   * @param threadEntity ThreadEntity 实例
   * @returns 执行结果
   */
  async executeThread(threadEntity: ThreadEntity): Promise<ThreadResult> {
    const workflowId = threadEntity.getWorkflowId();

    // 验证工作流图存在
    const preprocessedGraph = this.graphRegistry.get(workflowId);
    if (!preprocessedGraph) {
      throw new Error(`Graph not found for workflow: ${workflowId}`);
    }

    // 使用工厂创建 ThreadExecutionCoordinator 并执行
    const threadExecutionCoordinator = this.threadExecutionCoordinatorFactory.create(threadEntity);

    // 执行Thread
    return await threadExecutionCoordinator.execute();
  }
}