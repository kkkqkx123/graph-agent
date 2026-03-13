/**
 * DI 容器配置
 * 配置 DI 容器的所有服务绑定，定义服务间的依赖关系
 *
 * 设计原则：
 * - 按依赖顺序配置服务绑定，避免循环依赖
 * - 全局无状态服务使用单例生命周期（如 Registry、Manager）
 * - 线程隔离服务使用工厂模式（如 MessageHistoryManager、ConversationManager）
 * - 工厂函数用于创建需要运行时参数的实例（如 threadId、nodeId）
 *
 * 服务分层：
 * - 第一层：无依赖的存储层服务（GraphRegistry、ThreadRegistry）
 * - 第二层：无依赖的业务层服务（EventManager、ToolService等）
 * - 第三层：依赖第二层的业务层服务（ErrorService）
 * - 第四层：依赖存储层的业务层服务（WorkflowRegistry）
 * - 第五层：执行层基础服务（LLMExecutor、ToolCallExecutor）
 * - 第六层：依赖第五层的执行层服务（ThreadCascadeManager、CheckpointStateManager）
 * - 第七层：ThreadExecutor（依赖 GraphRegistry 和 ThreadExecutionCoordinator 工厂）
 * - 第八层：ThreadLifecycleCoordinator（工厂模式）
 * - 第九层：ThreadBuilder（无依赖）
 * - 第十层：执行层基础 Managers（部分为工厂模式）
 * - 第十一层：执行层 Coordinators（部分为工厂模式）
 * - 第十二层：执行层 Coordinators（中低优先级）
 * - 第十三层：ThreadPoolService（必须最后绑定，因为它依赖 ThreadExecutor）
 */

import { Container } from '@modular-agent/common-utils';
import type { CheckpointStorageCallback } from '@modular-agent/storage';
import * as Identifiers from './service-identifiers.js';

// 存储层服务
import { GraphRegistry } from '../../graph/services/graph-registry.js';
import { ThreadRegistry } from '../../graph/services/thread-registry.js';
import { LLMWrapper } from '../llm/wrapper.js';

// 业务层服务
import { EventManager } from '../managers/event-manager.js';
import { ToolService } from '../services/tool-service.js';
import { ScriptService } from '../services/script-service.js';
import { NodeTemplateRegistry } from '../services/node-template-registry.js';
import { TriggerTemplateRegistry } from '../services/trigger-template-registry.js';
import { TaskRegistry } from '../../graph/services/task-registry.js';
import { WorkflowRegistry } from '../../graph/services/workflow-registry.js';
import { ThreadPoolService } from '../../graph/services/thread-pool-service.js';

// 执行层服务 - Core 层通用执行器
import { LLMExecutor, ToolCallExecutor } from '../executors/index.js';
import { ToolApprovalCoordinator } from '../coordinators/tool-approval-coordinator.js';
import { SkillRegistry } from '../services/skill-registry.js';
import { SkillLoader } from '../services/skill-loader.js';
import { safeEmit } from '../../graph/execution/utils/index.js';
import { createCheckpoint } from '../../graph/execution/handlers/checkpoint-handlers/checkpoint-utils.js';
import {
  buildMessageAddedEvent,
  buildToolCallStartedEvent,
  buildToolCallCompletedEvent,
  buildToolCallFailedEvent
} from '../../graph/execution/utils/event/event-builder.js';
import { ThreadLifecycleManager } from '../../graph/execution/managers/thread-lifecycle-manager.js';
import { ThreadCascadeManager } from '../../graph/execution/managers/thread-cascade-manager.js';
import { CheckpointStateManager } from '../../graph/execution/managers/checkpoint-state-manager.js';
import { ToolContextManager } from '../../graph/execution/managers/tool-context-manager.js';
import { MessageHistoryManager } from '../../graph/execution/managers/message-history-manager.js';
import { ToolVisibilityManager } from '../../graph/execution/managers/tool-visibility-manager.js';
import { ThreadBuilder } from '../../graph/execution/thread-builder.js';
import { ThreadExecutor } from '../../graph/execution/executors/thread-executor.js';
import { ThreadLifecycleCoordinator } from '../../graph/execution/coordinators/thread-lifecycle-coordinator.js';

// 执行层 - Coordinators（协调器）
import { ThreadExecutionCoordinator } from '../../graph/execution/coordinators/thread-execution-coordinator.js';
import { VariableCoordinator } from '../../graph/execution/coordinators/variable-coordinator.js';
import { TriggerCoordinator } from '../../graph/execution/coordinators/trigger-coordinator.js';
import { NodeExecutionCoordinator } from '../../graph/execution/coordinators/node-execution-coordinator.js';
import { TriggeredSubworkflowManager } from '../../graph/services/triggered-subworkflow-manager.js';
import { LLMExecutionCoordinator } from '../../graph/execution/coordinators/llm-execution-coordinator.js';
import { ToolVisibilityCoordinator } from '../../graph/execution/coordinators/tool-visibility-coordinator.js';
import { ThreadOperationCoordinator } from '../../graph/execution/coordinators/thread-operation-coordinator.js';
import { CheckpointCoordinator } from '../../graph/execution/coordinators/checkpoint-coordinator.js';

// 执行层 - Managers（管理器）
import { ConversationManager } from '../managers/conversation-manager.js';
import { VariableStateManager } from '../../graph/execution/managers/variable-state-manager.js';
import { TriggerStateManager } from '../../graph/execution/managers/trigger-state-manager.js';
import { InterruptionManager } from '../managers/interruption-manager.js';
import { AgentLoopExecutor } from '../../agent/execution/executors/agent-loop-executor.js';
import { AgentLoopRegistry } from '../../agent/services/agent-loop-registry.js';
import { AgentLoopCoordinator } from '../../agent/execution/coordinators/agent-loop-coordinator.js';

/** 全局容器实例 */
let container: Container | null = null;
/** 应用层提供的存储回调 */
let storageCallback: CheckpointStorageCallback | null = null;

/**
 * 设置存储回调
 * @param callback 存储回调接口实现
 */
export function setStorageCallback(callback: CheckpointStorageCallback): void {
  storageCallback = callback;
}

/**
 * 获取存储回调
 * @returns 存储回调接口实现
 * @throws Error 如果存储回调未初始化
 */
export function getStorageCallback(): CheckpointStorageCallback {
  if (!storageCallback) {
    throw new Error(
      'Storage callback not initialized. ' +
      'Please call setStorageCallback() before using SDK.'
    );
  }
  return storageCallback;
}

/**
 * 初始化 DI 容器
 * 按依赖顺序配置所有服务绑定
 *
 * @param storageCallback 存储回调接口实现（可选，如果未提供则必须在初始化前调用 setStorageCallback）
 * @returns 已配置的容器实例
 */
export function initializeContainer(storageCallback?: CheckpointStorageCallback): Container {
  if (container) {
    return container;
  }

  container = new Container();

  // 如果提供了 storageCallback，设置它
  if (storageCallback) {
    setStorageCallback(storageCallback);
  }

  // ============================================================
  // 第一层：无依赖的存储层服务
  // ============================================================

  container.bind(Identifiers.GraphRegistry)
    .to(GraphRegistry)
    .inSingletonScope();

  container.bind(Identifiers.ThreadRegistry)
    .to(ThreadRegistry)
    .inSingletonScope();

  // LLMWrapper - LLM 包装器，依赖 EventManager 用于事件发布
container.bind(Identifiers.LLMWrapper)
    .toDynamicValue((c: any) => new LLMWrapper(c.get(Identifiers.EventManager)))
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

  // ============================================================
  // Skill 层服务
  // ============================================================

  // SkillRegistry - Skill 注册表，需要配置路径
  // 使用工厂模式，允许应用层提供配置
  // 默认配置使用空路径列表，应用层应该在初始化时重新绑定此服务并提供实际配置
  container.bind(Identifiers.SkillRegistry)
    .toDynamicValue(() => {
      const config = {
        paths: [],
        autoScan: true,
        cacheEnabled: true,
        cacheTTL: 300000
      };
      return new SkillRegistry(config);
    })
    .inSingletonScope();

  // SkillLoader - Skill 加载器，依赖 SkillRegistry 和 EventManager
  container.bind(Identifiers.SkillLoader)
    .toDynamicValue((c: any) => {
      return new SkillLoader(
        c.get(Identifiers.SkillRegistry),
        c.get(Identifiers.EventManager)
      );
    })
    .inSingletonScope();

  // ============================================================
  // 第四层：依赖存储层的业务层服务
  // ============================================================

  // WorkflowRegistry - 工作流注册表，依赖 ThreadRegistry 进行引用检查
  container.bind(Identifiers.WorkflowRegistry)
    .toDynamicValue((c: any) => {
      const threadRegistry = c.get(Identifiers.ThreadRegistry);
      return new WorkflowRegistry({ maxRecursionDepth: 10 }, threadRegistry);
    })
    .inSingletonScope();

  // ============================================================
  // 第五层：执行层基础服务
  // ============================================================

  // LLMExecutor - LLM 执行器，依赖 LLMWrapper
  container.bind(Identifiers.LLMExecutor)
    .toDynamicValue((c: any) => {
      const llmWrapper = c.get(Identifiers.LLMWrapper);
      return new LLMExecutor(llmWrapper);
    })
    .inSingletonScope();

  // ToolCallExecutor - 工具调用执行器，依赖多个服务和协调器
  container.bind(Identifiers.ToolCallExecutor)
    .toDynamicValue((c: any) => {
      // Graph 模块特有的事件构建器
      const eventBuilder = {
        buildMessageAddedEvent,
        buildToolCallStartedEvent,
        buildToolCallCompletedEvent,
        buildToolCallFailedEvent
      };

      return new ToolCallExecutor(
        c.get(Identifiers.ToolService),
        c.get(Identifiers.EventManager),
        {
          threadRegistry: c.get(Identifiers.ThreadRegistry),
          checkpointStateManager: c.get(Identifiers.CheckpointStateManager),
          workflowRegistry: c.get(Identifiers.WorkflowRegistry),
          graphRegistry: c.get(Identifiers.GraphRegistry)
        },
        c.get(Identifiers.ToolVisibilityCoordinator),
        eventBuilder,
        createCheckpoint,
        safeEmit
      );
    })
    .inSingletonScope();

  // ToolApprovalCoordinator - 工具审批协调器，依赖 EventManager
  container.bind(Identifiers.ToolApprovalCoordinator)
    .toDynamicValue((c: any) => {
      const eventManager = c.get(Identifiers.EventManager);
      return new ToolApprovalCoordinator(eventManager);
    })
    .inSingletonScope();

  // MessageHistoryManager - 消息历史管理器工厂
  // MessageHistoryManager 是线程隔离的，每个线程需要独立的实例
  // 使用工厂模式创建实例，确保线程间的数据隔离
  container.bind(Identifiers.MessageHistoryManager)
    .toDynamicValue((c: any) => {
      return {
        create: (threadId: string) => new MessageHistoryManager({ threadId })
      };
    })
    .inSingletonScope();

  // ThreadLifecycleManager - 线程生命周期管理器工厂
  // 每个线程需要独立的生命周期管理器实例
  container.bind(Identifiers.ThreadLifecycleManager)
    .toDynamicValue((c: any) => {
      const eventManager = c.get(Identifiers.EventManager);
      const messageHistoryManagerFactory = c.get(Identifiers.MessageHistoryManager);
      return {
        create: (threadId: string) => {
          const messageHistoryManager = messageHistoryManagerFactory.create(threadId);
          return new ThreadLifecycleManager(eventManager, messageHistoryManager);
        }
      };
    })
    .inSingletonScope();

  // ToolContextManager - 工具上下文管理器，无依赖
  container.bind(Identifiers.ToolContextManager)
    .to(ToolContextManager)
    .inSingletonScope();

  // ToolVisibilityManager - 工具可见性管理器，无依赖
  container.bind(Identifiers.ToolVisibilityManager)
    .to(ToolVisibilityManager)
    .inSingletonScope();

  // ============================================================
  // 第六层：依赖第五层的执行层服务
  // ============================================================

  // ThreadCascadeManager - 线程级联管理器工厂
// 每个线程需要独立的级联管理器实例
container.bind(Identifiers.ThreadCascadeManager)
    .toDynamicValue((c: any) => {
      const threadRegistry = c.get(Identifiers.ThreadRegistry);
      const eventManager = c.get(Identifiers.EventManager);
      const taskRegistry = c.get(Identifiers.TaskRegistry);
      const lifecycleManagerFactory = c.get(Identifiers.ThreadLifecycleManager);
      return {
        create: (threadId: string) => {
          const lifecycleManager = lifecycleManagerFactory.create(threadId);
          return new ThreadCascadeManager(threadRegistry, lifecycleManager, eventManager, taskRegistry);
        }
      };
    })
    .inSingletonScope();

  // CheckpointStateManager - 检查点状态管理器
// 需要应用层提供 CheckpointStorageCallback 实现
// 存储回调可以通过以下两种方式提供：
// 1. 在调用 initializeContainer() 时传入 storageCallback 参数
// 2. 在初始化容器前调用 setStorageCallback() 函数
container.bind(Identifiers.CheckpointStateManager)
    .toDynamicValue((c: any) => {
      const eventManager = c.get(Identifiers.EventManager);
      const callback = getStorageCallback();

      if (!callback) {
        throw new Error(
          'CheckpointStateManager requires a CheckpointStorageCallback implementation. ' +
          'Please provide it either via initializeContainer(storageCallback) parameter ' +
          'or by calling setStorageCallback() before initialization.'
        );
      }

      return new CheckpointStateManager(callback, eventManager);
    })
    .inSingletonScope();

  // ============================================================
  // 第七层：ThreadExecutor（依赖 GraphRegistry 和 ThreadExecutionCoordinator 工厂）
  // ============================================================

  // ThreadExecutor - 线程执行器，依赖 GraphRegistry 和 ThreadExecutionCoordinator 工厂
  container.bind(Identifiers.ThreadExecutor)
    .toDynamicValue((c: any) => {
      return new ThreadExecutor({
        graphRegistry: c.get(Identifiers.GraphRegistry),
        threadExecutionCoordinatorFactory: c.get(Identifiers.ThreadExecutionCoordinator)
      });
    })
    .inSingletonScope();

  // ============================================================
  // 第八层：ThreadLifecycleCoordinator（工厂模式）
  // ============================================================

  // ThreadLifecycleCoordinator - 线程生命周期协调器工厂
// 每个线程需要独立的生命周期协调器实例
container.bind(Identifiers.ThreadLifecycleCoordinator)
    .toDynamicValue((c: any) => {
      const threadRegistry = c.get(Identifiers.ThreadRegistry);
      const threadExecutor = c.get(Identifiers.ThreadExecutor);
      const workflowRegistry = c.get(Identifiers.WorkflowRegistry);
      const threadBuilder = c.get(Identifiers.ThreadBuilder);
      const lifecycleManagerFactory = c.get(Identifiers.ThreadLifecycleManager);
      const cascadeManagerFactory = c.get(Identifiers.ThreadCascadeManager);

      return {
        create: (threadId: string) => {
          const threadLifecycleManager = lifecycleManagerFactory.create(threadId);
          const threadCascadeManager = cascadeManagerFactory.create(threadId);
          return new ThreadLifecycleCoordinator(
            threadRegistry,
            threadLifecycleManager,
            threadCascadeManager,
            threadBuilder,
            threadExecutor,
            workflowRegistry
          );
        }
      };
    })
    .inSingletonScope();

  // ============================================================
  // 第九层：ThreadBuilder（无依赖）
  // ============================================================

  // ThreadBuilder - 线程构建器，无依赖
  container.bind(Identifiers.ThreadBuilder)
    .to(ThreadBuilder)
    .inSingletonScope();

  // ============================================================
  // 第十层：执行层基础 Managers（无依赖或工厂模式）
  // ============================================================

  // VariableStateManager - 变量状态管理器，无依赖
  container.bind(Identifiers.VariableStateManager)
    .to(VariableStateManager)
    .inSingletonScope();

  // TriggerStateManager - 触发器状态管理器工厂
// TriggerStateManager 需要 threadId，使用工厂模式创建实例
container.bind(Identifiers.TriggerStateManager)
    .toDynamicValue((c: any) => {
      return {
        create: (threadId: string) => new TriggerStateManager(threadId)
      };
    })
    .inSingletonScope();

// InterruptionManager - 中断管理器工厂
// InterruptionManager 需要 threadId 和 nodeId，使用工厂模式创建实例
container.bind(Identifiers.InterruptionManager)
    .toDynamicValue((c: any) => {
      return {
        create: (threadId: string, nodeId: string) => new InterruptionManager(threadId, nodeId)
      };
    })
    .inSingletonScope();

  // ============================================================
  // 第十一层：执行层 Coordinators（高优先级）
  // ============================================================

  // VariableCoordinator - 变量协调器，依赖 VariableStateManager 和 EventManager
  container.bind(Identifiers.VariableCoordinator)
    .toDynamicValue((c: any) => {
      const stateManager = c.get(Identifiers.VariableStateManager);
      const eventManager = c.get(Identifiers.EventManager);
      return new VariableCoordinator(stateManager, eventManager);
    })
    .inSingletonScope();

  // ToolVisibilityCoordinator - 工具可见性协调器，依赖 ToolService 和 ToolVisibilityManager
  container.bind(Identifiers.ToolVisibilityCoordinator)
    .toDynamicValue((c: any) => {
      const toolService = c.get(Identifiers.ToolService);
      const visibilityManager = c.get(Identifiers.ToolVisibilityManager);
      return new ToolVisibilityCoordinator(toolService, visibilityManager);
    })
    .inSingletonScope();

  // LLMExecutionCoordinator - 依赖 LLMExecutor、ToolService、EventManager、ToolCallExecutor
  // LLMExecutionCoordinator - LLM 执行协调器，依赖 LLMExecutor、ToolService、EventManager、ToolCallExecutor
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

  // ConversationManager - 会话管理器工厂
// ConversationManager 是有状态的，每个线程需要独立的实例以实现线程隔离
// 使用工厂模式创建实例，确保每个线程的会话数据相互独立
container.bind(Identifiers.ConversationManager)
    .toDynamicValue((c: any) => {
      const eventManager = c.get(Identifiers.EventManager);
      const toolService = c.get(Identifiers.ToolService);

      return {
        create: (threadId?: string, workflowId?: string) => {
          return new ConversationManager({
            eventManager,
            threadId,
            workflowId
          });
        }
      };
    })
    .inSingletonScope();

  // NodeExecutionCoordinator - 依赖多个服务和协调器
  // NodeExecutionCoordinator - 节点执行协调器工厂
// 每个线程需要独立的节点执行协调器实例
container.bind(Identifiers.NodeExecutionCoordinator)
    .toDynamicValue((c: any) => {
      const conversationManagerFactory = c.get(Identifiers.ConversationManager);
      const interruptionManagerFactory = c.get(Identifiers.InterruptionManager);
      const agentLoopExecutorFactory = c.get(Identifiers.AgentLoopExecutor);

      return {
        create: (threadId: string, nodeId: string) => {
          const config = {
            eventManager: c.get(Identifiers.EventManager),
            llmCoordinator: c.get(Identifiers.LLMExecutionCoordinator),
            conversationManager: conversationManagerFactory.create(threadId),
            interruptionManager: interruptionManagerFactory.create(threadId, nodeId),
            navigator: c.get(Identifiers.GraphRegistry),
            toolService: c.get(Identifiers.ToolService),
            toolContextManager: c.get(Identifiers.ToolContextManager),
            checkpointDependencies: {
              threadRegistry: c.get(Identifiers.ThreadRegistry),
              checkpointStateManager: c.get(Identifiers.CheckpointStateManager),
              workflowRegistry: c.get(Identifiers.WorkflowRegistry),
              graphRegistry: c.get(Identifiers.GraphRegistry)
            },
            agentLoopExecutorFactory: agentLoopExecutorFactory.create()
          };
          return new NodeExecutionCoordinator(config);
        }
      };
    })
    .inSingletonScope();

  // TriggerCoordinator - 依赖多个服务和协调器
  // TriggerCoordinator - 触发器协调器工厂
// 每个线程需要独立的触发器协调器实例
container.bind(Identifiers.TriggerCoordinator)
    .toDynamicValue((c: any) => {
      const threadRegistry = c.get(Identifiers.ThreadRegistry);
      const workflowRegistry = c.get(Identifiers.WorkflowRegistry);
      const graphRegistry = c.get(Identifiers.GraphRegistry);
      const eventManager = c.get(Identifiers.EventManager);
      const threadBuilder = c.get(Identifiers.ThreadBuilder);
      const taskQueueManager = c.get(Identifiers.TaskRegistry);
      const stateManagerFactory = c.get(Identifiers.TriggerStateManager);
      const checkpointStateManager = c.get(Identifiers.CheckpointStateManager);
      const lifecycleCoordinatorFactory = c.get(Identifiers.ThreadLifecycleCoordinator);

      return {
        create: (threadId: string) => {
          const stateManager = stateManagerFactory.create(threadId);
          const threadLifecycleCoordinator = lifecycleCoordinatorFactory.create(threadId);
          return new TriggerCoordinator({
            threadRegistry,
            workflowRegistry,
            stateManager,
            checkpointStateManager,
            graphRegistry,
            eventManager,
            threadBuilder,
            taskQueueManager,
            threadLifecycleCoordinator
          });
        }
      };
    })
    .inSingletonScope();

  // TriggeredSubworkflowManager - 触发子工作流管理器
// 作为单例服务，所有触发子工作流共享同一个 Manager 实例
// 依赖多个服务和管理器
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

  // ThreadExecutionCoordinator - 线程执行协调器工厂
// ThreadExecutionCoordinator 负责协调线程的执行流程，需要 ThreadEntity 作为参数
// 使用工厂模式创建实例，每个线程对应一个执行协调器
// 注意：VariableCoordinator、TriggerCoordinator、InterruptionManager、ToolVisibilityCoordinator、NodeExecutionCoordinator 都需要根据 threadId 创建实例
container.bind(Identifiers.ThreadExecutionCoordinator)
    .toDynamicValue((c: any) => {
      const variableCoordinator = c.get(Identifiers.VariableCoordinator);
      const graphRegistry = c.get(Identifiers.GraphRegistry);
      const toolVisibilityCoordinator = c.get(Identifiers.ToolVisibilityCoordinator);
      const triggerCoordinatorFactory = c.get(Identifiers.TriggerCoordinator);
      const interruptionManagerFactory = c.get(Identifiers.InterruptionManager);
      const nodeExecutionCoordinatorFactory = c.get(Identifiers.NodeExecutionCoordinator);

      return {
        create: (threadEntity: any, threadId: string, nodeId: string) => {
          return new ThreadExecutionCoordinator(
            threadEntity,
            variableCoordinator,
            triggerCoordinatorFactory.create(threadId),
            interruptionManagerFactory.create(threadId, nodeId),
            toolVisibilityCoordinator,
            nodeExecutionCoordinatorFactory.create(threadId, nodeId),
            graphRegistry
          );
        }
      };
    })
    .inSingletonScope();

  // ============================================================
  // 第十二层：执行层 Coordinators（中低优先级）
  // ============================================================

  // ThreadOperationCoordinator - 线程操作协调器，依赖 ThreadRegistry 和 WorkflowRegistry
  container.bind(Identifiers.ThreadOperationCoordinator)
    .toDynamicValue((c: any) => {
      return new ThreadOperationCoordinator(
        c.get(Identifiers.ThreadRegistry),
        c.get(Identifiers.WorkflowRegistry),
      );
    })
    .inSingletonScope();

  // AgentLoopExecutor - Agent Loop 执行器工厂
// 每次执行创建新的 AgentLoopExecutor 实例
container.bind(Identifiers.AgentLoopExecutor)
    .toDynamicValue((c: any) => {
      return {
        create: () => {
          const llmExecutor = c.get(Identifiers.LLMExecutor);
          const toolService = c.get(Identifiers.ToolService);
          return new AgentLoopExecutor(llmExecutor, toolService);
        }
      };
    })
    .inSingletonScope();

// AgentLoopRegistry - Agent Loop 注册表，全局单例
container.bind(Identifiers.AgentLoopRegistry)
    .to(AgentLoopRegistry)
    .inSingletonScope();

// AgentLoopCoordinator - Agent Loop 生命周期协调器工厂
// 每次创建新的 AgentLoopCoordinator 实例
container.bind(Identifiers.AgentLoopCoordinator)
    .toDynamicValue((c: any) => {
      return {
        create: () => {
          return new AgentLoopCoordinator(
            c.get(Identifiers.AgentLoopRegistry),
            c.get(Identifiers.AgentLoopExecutor).create()
          );
        }
      };
    })
    .inSingletonScope();

  // CheckpointCoordinator - 检查点协调器
// 使用静态方法，不需要实例化
// 提供一个工厂方法来封装依赖对象和静态方法调用
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

  // ============================================================
  // 第十三层：ThreadPoolService（需要 ThreadExecutor，必须在所有依赖之后绑定）
  // ============================================================

  // ThreadPoolService - 线程池服务，用于并发执行线程
  // 注意：必须放在所有依赖之后绑定，因为它需要 ThreadExecutor
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
 * 调用后需要重新调用 initializeContainer() 来初始化容器
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
