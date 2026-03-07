/**
 * DI 容器配置
 * 配置 DI 容器的所有服务绑定，定义服务间的依赖关系
 *
 * 设计原则：
 * - 按依赖顺序配置服务绑定
 * - 所有服务默认为单例生命周期
 * - 使用工厂函数处理复杂依赖
 * - 支持循环依赖检测
 */

import { Container } from '@modular-agent/common-utils';
import * as Identifiers from './service-identifiers.js';

// 存储层服务
import { GraphRegistry } from '../services/graph-registry.js';
import { ThreadRegistry } from '../services/thread-registry.js';

// 业务层服务
import { EventManager } from '../services/event-manager.js';
import { ToolService } from '../services/tool-service.js';
import { ScriptService } from '../services/script-service.js';
import { NodeTemplateRegistry } from '../services/node-template-registry.js';
import { TriggerTemplateRegistry } from '../services/trigger-template-registry.js';
import { TaskRegistry } from '../services/task-registry.js';
import { ErrorService } from '../services/error-service.js';
import { WorkflowRegistry } from '../services/workflow-registry.js';
import { ThreadPoolService } from '../services/thread-pool-service.js';

// 执行层服务
import { LLMExecutor } from '../execution/executors/llm-executor.js';
import { ToolCallExecutor } from '../execution/executors/tool-call-executor.js';
import { ThreadLifecycleManager } from '../execution/managers/thread-lifecycle-manager.js';
import { ThreadCascadeManager } from '../execution/managers/thread-cascade-manager.js';
import { CheckpointStateManager } from '../execution/managers/checkpoint-state-manager.js';
import { ToolContextManager } from '../execution/managers/tool-context-manager.js';
import { MessageStorageManager } from '../execution/managers/message-storage-manager.js';
import { ToolVisibilityManager } from '../execution/managers/tool-visibility-manager.js';
import { ThreadBuilder } from '../execution/thread-builder.js';
import { ThreadExecutor } from '../execution/thread-executor.js';
import { ThreadLifecycleCoordinator } from '../execution/coordinators/thread-lifecycle-coordinator.js';

// 执行层 - Coordinators（协调器）
import { ThreadExecutionCoordinator } from '../execution/coordinators/thread-execution-coordinator.js';
import { VariableCoordinator } from '../execution/coordinators/variable-coordinator.js';
import { TriggerCoordinator } from '../execution/coordinators/trigger-coordinator.js';
import { NodeExecutionCoordinator } from '../execution/coordinators/node-execution-coordinator.js';
import { TriggeredSubworkflowManager } from '../services/triggered-subworkflow-manager.js';
import { LLMExecutionCoordinator } from '../execution/coordinators/llm-execution-coordinator.js';
import { ToolVisibilityCoordinator } from '../execution/coordinators/tool-visibility-coordinator.js';
import { ThreadOperationCoordinator } from '../execution/coordinators/thread-operation-coordinator.js';
import { CheckpointCoordinator } from '../execution/coordinators/checkpoint-coordinator.js';

// 执行层 - Managers（管理器）
import { ConversationManager } from '../execution/managers/conversation-manager.js';
import { VariableStateManager } from '../execution/managers/variable-state-manager.js';
import { TriggerStateManager } from '../execution/managers/trigger-state-manager.js';
import { InterruptionManager } from '../execution/managers/interruption-manager.js';

/** 全局容器实例 */
let container: Container | null = null;
/** 应用层提供的存储回调 */
let storageCallback: any = null;

/**
 * 设置存储回调
 * @param callback 存储回调接口实现
 */
export function setStorageCallback(callback: any): void {
  storageCallback = callback;
}

/**
 * 获取存储回调
 * @returns 存储回调接口实现
 */
export function getStorageCallback(): any {
  return storageCallback;
}

/**
 * 初始化 DI 容器
 * 按依赖顺序配置所有服务绑定
 *
 * @returns 已配置的容器实例
 */
export function initializeContainer(): Container {
  if (container) {
    return container;
  }

  container = new Container();

  // ============================================================
  // 第一层：无依赖的存储层服务
  // ============================================================

  container.bind(Identifiers.GraphRegistry)
    .to(GraphRegistry)
    .inSingletonScope();

  container.bind(Identifiers.ThreadRegistry)
    .to(ThreadRegistry)
    .inSingletonScope();

  // ============================================================
  // 第二层：无依赖的业务层服务
  // ============================================================

  container.bind(Identifiers.EventManager)
    .to(EventManager)
    .inSingletonScope();

  container.bind(Identifiers.ToolService)
    .to(ToolService)
    .inSingletonScope();

  container.bind(Identifiers.ScriptService)
    .to(ScriptService)
    .inSingletonScope();

  container.bind(Identifiers.NodeTemplateRegistry)
    .to(NodeTemplateRegistry)
    .inSingletonScope();

  container.bind(Identifiers.TriggerTemplateRegistry)
    .to(TriggerTemplateRegistry)
    .inSingletonScope();

  container.bind(Identifiers.TaskRegistry)
    .toDynamicValue(() => TaskRegistry.getInstance())
    .inSingletonScope();

  // ThreadPoolService 需要 executorFactory，使用工厂函数创建
  container.bind(Identifiers.ThreadPoolService)
    .toDynamicValue((c: any) => {
      const config = {
        minExecutors: 1,
        maxExecutors: 10,
        idleTimeout: 30000,
        defaultTimeout: 30000
      };

      return ThreadPoolService.getInstance(() => c.get(Identifiers.ThreadExecutor), config);
    })
    .inSingletonScope();

  // ============================================================
  // 第三层：依赖第二层的业务层服务
  // ============================================================

  container.bind(Identifiers.ErrorService)
    .toDynamicValue((c: any) => {
      const eventManager = c.get(Identifiers.EventManager);
      return new ErrorService(eventManager);
    })
    .inSingletonScope();

  // ============================================================
  // 第四层：依赖存储层的业务层服务
  // ============================================================

  // WorkflowRegistry 依赖 ThreadRegistry 进行引用检查
  container.bind(Identifiers.WorkflowRegistry)
    .toDynamicValue((c: any) => {
      const threadRegistry = c.get(Identifiers.ThreadRegistry);
      return new WorkflowRegistry({ maxRecursionDepth: 10 }, threadRegistry);
    })
    .inSingletonScope();

  // ============================================================
  // 第五层：执行层基础服务
  // ============================================================

  container.bind(Identifiers.LLMExecutor)
    .toDynamicValue((c: any) => {
      const eventManager = c.get(Identifiers.EventManager);
      return new LLMExecutor(eventManager);
    })
    .inSingletonScope();

  container.bind(Identifiers.ToolCallExecutor)
    .toDynamicValue((c: any) => {
      return new ToolCallExecutor(
        c.get(Identifiers.ToolService),
        c.get(Identifiers.EventManager),
        {
          threadRegistry: c.get(Identifiers.ThreadRegistry),
          checkpointStateManager: c.get(Identifiers.CheckpointStateManager),
          workflowRegistry: c.get(Identifiers.WorkflowRegistry),
          graphRegistry: c.get(Identifiers.GraphRegistry)
        },
        c.get(Identifiers.ToolVisibilityCoordinator)
      );
    })
    .inSingletonScope();

  container.bind(Identifiers.MessageStorageManager)
    .toDynamicValue((c: any) => {
      // MessageStorageManager 是线程隔离的，每个线程需要自己的实例
      // 这里使用一个默认的 threadId，实际使用时应该由 ThreadContext 创建
      return new MessageStorageManager('default');
    })
    .inSingletonScope();

  container.bind(Identifiers.ThreadLifecycleManager)
    .toDynamicValue((c: any) => {
      const eventManager = c.get(Identifiers.EventManager);
      const messageStorageManager = c.get(Identifiers.MessageStorageManager);
      return new ThreadLifecycleManager(eventManager, messageStorageManager);
    })
    .inSingletonScope();

  container.bind(Identifiers.ToolContextManager)
    .to(ToolContextManager)
    .inSingletonScope();

  container.bind(Identifiers.ToolVisibilityManager)
    .to(ToolVisibilityManager)
    .inSingletonScope();

  // ============================================================
  // 第六层：依赖第五层的执行层服务
  // ============================================================

  container.bind(Identifiers.ThreadCascadeManager)
    .toDynamicValue((c: any) => {
      const threadRegistry = c.get(Identifiers.ThreadRegistry);
      const lifecycleManager = c.get(Identifiers.ThreadLifecycleManager);
      const eventManager = c.get(Identifiers.EventManager);
      const taskRegistry = c.get(Identifiers.TaskRegistry);
      return new ThreadCascadeManager(threadRegistry, lifecycleManager, eventManager, taskRegistry);
    })
    .inSingletonScope();

  // CheckpointStateManager 需要应用层提供 CheckpointStorageCallback 实现
  // 应用层需要在初始化 SDK 时注入存储回调
  // 这里使用工厂函数，允许应用层覆盖
  container.bind(Identifiers.CheckpointStateManager)
    .toDynamicValue((c: any) => {
      const eventManager = c.get(Identifiers.EventManager);
      const callback = getStorageCallback();

      if (!callback) {
        throw new Error(
          'CheckpointStateManager requires a CheckpointStorageCallback implementation. ' +
          'Please provide it via SDK initialization options using setStorageCallback().'
        );
      }

      return new CheckpointStateManager(callback, eventManager);
    })
    .inSingletonScope();

  // ============================================================
  // 第七层：ThreadExecutor（依赖GraphRegistry和ThreadExecutionCoordinator工厂）
  // ============================================================

  container.bind(Identifiers.ThreadExecutor)
    .toDynamicValue((c: any) => {
      return new ThreadExecutor({
        graphRegistry: c.get(Identifiers.GraphRegistry),
        threadExecutionCoordinatorFactory: c.get(Identifiers.ThreadExecutionCoordinator)
      });
    })
    .inSingletonScope();

  // ============================================================
  // 第八层：ThreadLifecycleCoordinator
  // ============================================================

  container.bind(Identifiers.ThreadLifecycleCoordinator)
    .toDynamicValue((c: any) => {
      const threadRegistry = c.get(Identifiers.ThreadRegistry);
      const threadLifecycleManager = c.get(Identifiers.ThreadLifecycleManager);
      const threadCascadeManager = c.get(Identifiers.ThreadCascadeManager);
      const threadExecutor = c.get(Identifiers.ThreadExecutor);
      const workflowRegistry = c.get(Identifiers.WorkflowRegistry);
      const threadBuilder = c.get(Identifiers.ThreadBuilder);

      return new ThreadLifecycleCoordinator(
        threadRegistry,
        threadLifecycleManager,
        threadCascadeManager,
        threadBuilder,
        threadExecutor,
        workflowRegistry
      );
    })
    .inSingletonScope();

  // ============================================================
  // 第九层：ThreadBuilder
  // ============================================================

  container.bind(Identifiers.ThreadBuilder)
    .to(ThreadBuilder)
    .inSingletonScope();

  // ============================================================
  // 第十层：执行层基础 Managers（无依赖或简单依赖）
  // ============================================================

  container.bind(Identifiers.VariableStateManager)
    .to(VariableStateManager)
    .inSingletonScope();

  container.bind(Identifiers.TriggerStateManager)
    .toDynamicValue((c: any) => {
      // TriggerStateManager 需要 threadId，使用工厂模式
      return {
        create: (threadId: string) => new TriggerStateManager(threadId)
      };
    })
    .inSingletonScope();

  container.bind(Identifiers.InterruptionManager)
    .toDynamicValue((c: any) => {
      // InterruptionManager 需要 threadId 和 nodeId，使用工厂模式
      return {
        create: (threadId: string, nodeId: string) => new InterruptionManager(threadId, nodeId)
      };
    })
    .inSingletonScope();

  // ============================================================
  // 第十一层：执行层 Coordinators（高优先级）
  // ============================================================

  // VariableCoordinator - 依赖 VariableStateManager 和 EventManager
  container.bind(Identifiers.VariableCoordinator)
    .toDynamicValue((c: any) => {
      const stateManager = c.get(Identifiers.VariableStateManager);
      const eventManager = c.get(Identifiers.EventManager);
      return new VariableCoordinator(stateManager, eventManager);
    })
    .inSingletonScope();

  // ToolVisibilityCoordinator - 依赖 ToolService 和 ToolVisibilityManager
  container.bind(Identifiers.ToolVisibilityCoordinator)
    .toDynamicValue((c: any) => {
      const toolService = c.get(Identifiers.ToolService);
      const visibilityManager = c.get(Identifiers.ToolVisibilityManager);
      return new ToolVisibilityCoordinator(toolService, visibilityManager);
    })
    .inSingletonScope();

  // LLMExecutionCoordinator - 依赖 LLMExecutor、ToolService、EventManager、ToolCallExecutor
  container.bind(Identifiers.LLMExecutionCoordinator)
    .toDynamicValue((c: any) => {
      const llmExecutor = c.get(Identifiers.LLMExecutor);
      const toolService = c.get(Identifiers.ToolService);
      const eventManager = c.get(Identifiers.EventManager);
      const toolCallExecutor = c.get(Identifiers.ToolCallExecutor);
      return new LLMExecutionCoordinator({
        llmExecutor,
        toolService,
        eventManager,
        toolCallExecutor
      });
    })
    .inSingletonScope();

  // ConversationManager - 工厂模式，每个线程可以创建独立实例
  // 注意：虽然 ConversationManager 是有状态的，但在某些场景下（如测试）可以作为单例使用
  // 在生产环境中，建议每个 ThreadEntity 拥有独立的 ConversationManager 实例
  container.bind(Identifiers.ConversationManager)
    .toDynamicValue((c: any) => {
      const eventManager = c.get(Identifiers.EventManager);
      const toolService = c.get(Identifiers.ToolService);

      return {
        // 创建新的实例（用于线程隔离）
        create: (threadId?: string, workflowId?: string) => {
          return new ConversationManager({
            eventManager,
            toolService,
            threadId,
            workflowId
          });
        },
        // 获取共享实例（用于向后兼容和测试）
        getShared: () => {
          return new ConversationManager({
            eventManager,
            toolService
          });
        }
      };
    })
    .inSingletonScope();

  // NodeExecutionCoordinator - 依赖多个服务和协调器
  container.bind(Identifiers.NodeExecutionCoordinator)
    .toDynamicValue((c: any) => {
      // 获取 ConversationManager 工厂
      const conversationManagerFactory = c.get(Identifiers.ConversationManager);

      const config = {
        eventManager: c.get(Identifiers.EventManager),
        llmCoordinator: c.get(Identifiers.LLMExecutionCoordinator),
        // 使用共享实例保持向后兼容
        // TODO: 在长期方案中，应该为每个线程创建独立的 ConversationManager 实例
        conversationManager: conversationManagerFactory.getShared(),
        interruptionManager: c.get(Identifiers.InterruptionManager),
        navigator: c.get(Identifiers.GraphRegistry),
        toolService: c.get(Identifiers.ToolService),
        toolContextManager: c.get(Identifiers.ToolContextManager),
        checkpointDependencies: {
          threadRegistry: c.get(Identifiers.ThreadRegistry),
          checkpointStateManager: c.get(Identifiers.CheckpointStateManager),
          workflowRegistry: c.get(Identifiers.WorkflowRegistry),
          graphRegistry: c.get(Identifiers.GraphRegistry)
        }
      };
      return new NodeExecutionCoordinator(config);
    })
    .inSingletonScope();

  // TriggerCoordinator - 依赖多个服务和协调器
  container.bind(Identifiers.TriggerCoordinator)
    .toDynamicValue((c: any) => {
      return new TriggerCoordinator({
        threadRegistry: c.get(Identifiers.ThreadRegistry),
        workflowRegistry: c.get(Identifiers.WorkflowRegistry),
        stateManager: c.get(Identifiers.TriggerStateManager),
        checkpointStateManager: c.get(Identifiers.CheckpointStateManager),
        graphRegistry: c.get(Identifiers.GraphRegistry),
        eventManager: c.get(Identifiers.EventManager),
        threadBuilder: c.get(Identifiers.ThreadBuilder),
        taskQueueManager: c.get(Identifiers.TaskRegistry),
        threadLifecycleCoordinator: c.get(Identifiers.ThreadLifecycleCoordinator)
      });
    })
    .inSingletonScope();

  // TriggeredSubworkflowManager - 依赖多个服务和管理器
  // 作为单例服务，所有触发子工作流共享同一个 Manager 实例
  container.bind(Identifiers.TriggeredSubworkflowManager)
    .toDynamicValue((c: any) => {
      return new TriggeredSubworkflowManager(
        c.get(Identifiers.ThreadRegistry),
        c.get(Identifiers.ThreadBuilder),
        c.get(Identifiers.TaskRegistry),
        c.get(Identifiers.EventManager),
        c.get(Identifiers.ThreadPoolService)
      );
    })
    .inSingletonScope();

  // ThreadExecutionCoordinator - 依赖多个协调器和管理器
  container.bind(Identifiers.ThreadExecutionCoordinator)
    .toDynamicValue((c: any) => {
      // 注意：ThreadExecutionCoordinator 需要 ThreadEntity 作为参数
      // 这里提供一个工厂方法来创建实例
      return {
        create: (threadEntity: any) => {
          return new ThreadExecutionCoordinator(
            threadEntity,
            c.get(Identifiers.VariableCoordinator),
            c.get(Identifiers.TriggerCoordinator),
            c.get(Identifiers.InterruptionManager),
            c.get(Identifiers.ToolVisibilityCoordinator),
            c.get(Identifiers.NodeExecutionCoordinator),
            c.get(Identifiers.GraphRegistry)
          );
        }
      };
    })
    .inSingletonScope();

  // ============================================================
  // 第十二层：执行层 Coordinators（中低优先级）
  // ============================================================

  // ThreadOperationCoordinator - 依赖多个服务
  container.bind(Identifiers.ThreadOperationCoordinator)
    .toDynamicValue((c: any) => {
      return new ThreadOperationCoordinator(
        c.get(Identifiers.ThreadRegistry),
        c.get(Identifiers.WorkflowRegistry),
      );
    })
    .inSingletonScope();

  // CheckpointCoordinator - 使用静态方法，不需要实例化
  // 提供一个工厂方法来获取依赖对象
  container.bind(Identifiers.CheckpointCoordinator)
    .toDynamicValue((c: any) => {
      return {
        dependencies: {
          threadRegistry: c.get(Identifiers.ThreadRegistry),
          checkpointStateManager: c.get(Identifiers.CheckpointStateManager),
          workflowRegistry: c.get(Identifiers.WorkflowRegistry),
          graphRegistry: c.get(Identifiers.GraphRegistry)
        },
        createCheckpoint: (threadId: string, metadata?: any) => {
          return CheckpointCoordinator.createCheckpoint(threadId, {
            threadRegistry: c.get(Identifiers.ThreadRegistry),
            checkpointStateManager: c.get(Identifiers.CheckpointStateManager),
            workflowRegistry: c.get(Identifiers.WorkflowRegistry),
            graphRegistry: c.get(Identifiers.GraphRegistry)
          }, metadata);
        },
        restoreFromCheckpoint: (checkpointId: string) => {
          return CheckpointCoordinator.restoreFromCheckpoint(checkpointId, {
            threadRegistry: c.get(Identifiers.ThreadRegistry),
            checkpointStateManager: c.get(Identifiers.CheckpointStateManager),
            workflowRegistry: c.get(Identifiers.WorkflowRegistry),
            graphRegistry: c.get(Identifiers.GraphRegistry)
          });
        }
      };
    })
    .inSingletonScope();

  return container;
}

/**
 * 获取 DI 容器实例
 *
 * @returns 容器实例
 * @throws Error 如果容器未初始化
 */
export function getContainer(): Container {
  if (!container) {
    throw new Error('Container not initialized. Call initializeContainer() first.');
  }
  return container;
}

/**
 * 重置 DI 容器
 * 清除所有缓存和服务实例，主要用于测试环境
 */
export function resetContainer(): void {
  if (container) {
    container.clearAllCaches();
    container = null;
  }
  storageCallback = null;
}

/**
 * 检查容器是否已初始化
 *
 * @returns 是否已初始化
 */
export function isContainerInitialized(): boolean {
  return container !== null;
}
