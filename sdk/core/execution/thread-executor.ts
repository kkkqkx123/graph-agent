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
import type { EventManager } from '../services/event-manager.js';
import type { WorkflowRegistry } from '../services/workflow-registry.js';
import type { ToolService } from '../services/tool-service.js';
import type { ScriptService } from '../services/script-service.js';
import type { ErrorService } from '../services/error-service.js';
import type { TaskRegistry } from '../services/task-registry.js';
import type { GraphRegistry } from '../services/graph-registry.js';
import type { NodeTemplateRegistry } from '../services/node-template-registry.js';
import type { TriggerTemplateRegistry } from '../services/trigger-template-registry.js';
import type { ThreadRegistry } from '../services/thread-registry.js';
import type { LLMExecutor } from './executors/llm-executor.js';
import type { ThreadLifecycleManager } from './managers/thread-lifecycle-manager.js';
import type { ThreadCascadeManager } from './managers/thread-cascade-manager.js';
import type { CheckpointStateManager } from './managers/checkpoint-state-manager.js';
import type { ToolVisibilityManager } from './managers/tool-visibility-manager.js';
import type { ThreadLifecycleCoordinator } from './coordinators/thread-lifecycle-coordinator.js';
import { VariableStateManager } from './managers/variable-state-manager.js';
import { TriggerStateManager } from './managers/trigger-state-manager.js';
import { ConversationManager } from './managers/conversation-manager.js';
import { InterruptionManager } from './managers/interruption-manager.js';
import { VariableCoordinator } from './coordinators/variable-coordinator.js';
import { TriggerCoordinator } from './coordinators/trigger-coordinator.js';
import { ToolVisibilityCoordinator } from './coordinators/tool-visibility-coordinator.js';
import { NodeExecutionCoordinator } from './coordinators/node-execution-coordinator.js';
import { ThreadExecutionCoordinator } from './coordinators/thread-execution-coordinator.js';
import { GraphNavigator } from '../graph/graph-navigator.js';

/**
 * ThreadExecutor - Thread 执行器
 *
 * 专注于执行单个 ThreadEntity，不负责线程的创建、注册和管理
 * 通过协调器模式委托具体职责给专门的组件
 */
export class ThreadExecutor {
  constructor(
    // 全局服务
    private readonly workflowRegistry: WorkflowRegistry,
    private readonly threadRegistry: ThreadRegistry,
    private readonly eventManager: EventManager,
    private readonly toolService: ToolService,
    private readonly scriptService: ScriptService,
    private readonly llmExecutor: LLMExecutor,
    private readonly errorService: ErrorService,
    private readonly taskRegistry: TaskRegistry,
    private readonly graphRegistry: GraphRegistry,
    private readonly nodeTemplateRegistry: NodeTemplateRegistry,
    private readonly triggerTemplateRegistry: TriggerTemplateRegistry,

    // 管理器
    private readonly threadLifecycleManager: ThreadLifecycleManager,
    private readonly threadCascadeManager: ThreadCascadeManager,
    private readonly checkpointStateManager: CheckpointStateManager,
    private readonly toolVisibilityManager: ToolVisibilityManager,

    // 协调器
    private readonly threadLifecycleCoordinator: ThreadLifecycleCoordinator
  ) {}

  /**
   * 执行 ThreadEntity
   * @param threadEntity ThreadEntity 实例
   * @returns 执行结果
   */
  async executeThread(threadEntity: ThreadEntity): Promise<ThreadResult> {
    const threadId = threadEntity.getThreadId();
    const workflowId = threadEntity.getWorkflowId();

    // 创建执行所需的管理器和协调器
    const variableStateManager = new VariableStateManager();
    const triggerStateManager = new TriggerStateManager(threadId);
    const conversationManager = new ConversationManager();
    const interruptionManager = new InterruptionManager(
      threadId,
      threadEntity.getCurrentNodeId()
    );

    const variableCoordinator = new VariableCoordinator(
      variableStateManager,
      this.eventManager,
      threadId,
      workflowId
    );

    const triggerCoordinator = new TriggerCoordinator(
      this.threadRegistry,
      this.workflowRegistry,
      triggerStateManager
    );

    const toolVisibilityCoordinator = new ToolVisibilityCoordinator(
      this.toolService
    );

    // 获取GraphNavigator
    const preprocessedGraph = this.graphRegistry.get(workflowId);
    if (!preprocessedGraph) {
      throw new Error(`Graph not found for workflow: ${workflowId}`);
    }
    const navigator = new GraphNavigator(preprocessedGraph);

    const nodeExecutionCoordinator = new NodeExecutionCoordinator({
      eventManager: this.eventManager,
      llmCoordinator: null as any, // TODO: 需要创建LLMExecutionCoordinator
      conversationManager,
      interruptionManager,
      navigator,
      userInteractionHandler: undefined,
      humanRelayHandler: undefined,
      checkpointDependencies: undefined,
      globalCheckpointConfig: undefined,
      threadRegistry: this.threadRegistry,
      interruptionDetector: undefined,
      toolContextManager: undefined,
      toolService: this.toolService
    });

    const threadExecutionCoordinator = new ThreadExecutionCoordinator(
      threadEntity,
      variableCoordinator,
      triggerCoordinator,
      conversationManager,
      interruptionManager,
      toolVisibilityCoordinator,
      nodeExecutionCoordinator,
      navigator
    );

    // 执行Thread
    return await threadExecutionCoordinator.execute();
  }
}