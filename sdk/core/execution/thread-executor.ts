/**
 * ThreadExecutor - Thread 执行器
 * 负责执行单个 ThreadEntity 实例，管理 thread 的完整执行生命周期
 * 支持图导航器进行节点导航
 *
 * 职责：
 * - 执行单个 ThreadEntity
 * - 创建执行所需的管理器和协调器
 * - 协调各个执行组件
 *
 * 不负责：
 * - Thread 的创建和注册（由 ThreadLifecycleCoordinator 负责）
 * - Thread 的暂停、恢复、停止等生命周期管理（由 ThreadLifecycleCoordinator 负责）
 * - 变量设置等管理操作（由 ThreadLifecycleCoordinator 负责）
 * - 节点执行细节（由 NodeExecutionCoordinator 负责）
 * - 错误处理（由 ErrorHandler 负责）
 * - 子图处理（由 SubgraphHandler 负责）
 * - 触发子工作流处理（由 TriggeredSubworkflowManager 负责）
 * - 触发器管理（由 ThreadBuilder 在创建 ThreadEntity 时处理）
 */

import type { ThreadResult } from '@modular-agent/types';
import type { ThreadEntity } from '../entities/thread-entity.js';
import { getContainer } from '../di/index.js';
import * as Identifiers from '../di/service-identifiers.js';
import { GraphNavigator } from '../graph/graph-navigator.js';

/**
 * ThreadExecutor - Thread 执行器
 *
 * 专注于执行单个 ThreadEntity，不负责线程的创建、注册和管理
 * 通过协调器模式委托具体职责给专门的组件
 *
 * 设计原则：
 * - 完全依赖DI容器管理所有依赖
 * - 无构造函数参数，所有依赖从容器获取
 * - 保持轻量级，只负责执行协调
 */
export class ThreadExecutor {
  constructor() {}

  /**
   * 执行 ThreadEntity
   * @param threadEntity ThreadEntity 实例
   * @returns 执行结果
   */
  async executeThread(threadEntity: ThreadEntity): Promise<ThreadResult> {
    const threadId = threadEntity.getThreadId();
    const workflowId = threadEntity.getWorkflowId();
    const container = getContainer();

    // 从DI容器获取所需的服务
    const graphRegistry = container.get(Identifiers.GraphRegistry);

    // 从DI容器获取工厂方法
    const triggerStateManagerFactory = container.get(Identifiers.TriggerStateManager);
    const interruptionManagerFactory = container.get(Identifiers.InterruptionManager);
    const threadExecutionCoordinatorFactory = container.get(Identifiers.ThreadExecutionCoordinator);

    // 使用工厂方法创建线程隔离的实例
    const triggerStateManager = triggerStateManagerFactory.create(threadId);
    const interruptionManager = interruptionManagerFactory.create(
      threadId,
      threadEntity.getCurrentNodeId()
    );

    // 从DI容器获取单例协调器和管理器
    const variableCoordinator = container.get(Identifiers.VariableCoordinator);
    const toolVisibilityCoordinator = container.get(Identifiers.ToolVisibilityCoordinator);
    const conversationManager = container.get(Identifiers.ConversationManager);

    // 获取GraphNavigator
    const preprocessedGraph = graphRegistry.get(workflowId);
    if (!preprocessedGraph) {
      throw new Error(`Graph not found for workflow: ${workflowId}`);
    }
    const navigator = new GraphNavigator(preprocessedGraph);

    // 创建NodeExecutionCoordinator
    const nodeExecutionCoordinator = container.get(Identifiers.NodeExecutionCoordinator);

    // 使用工厂方法创建ThreadExecutionCoordinator
    const threadExecutionCoordinator = threadExecutionCoordinatorFactory.create(threadEntity);

    // 执行Thread
    return await threadExecutionCoordinator.execute();
  }
}