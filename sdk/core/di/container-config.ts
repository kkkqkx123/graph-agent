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
import { GlobalMessageStorage } from '../services/global-message-storage.js';

// 业务层服务
import { EventManager } from '../services/event-manager.js';
import { ToolService } from '../services/tool-service.js';
import { ScriptService } from '../services/script-service.js';
import { NodeTemplateRegistry } from '../services/node-template-registry.js';
import { TriggerTemplateRegistry } from '../services/trigger-template-registry.js';
import { TaskRegistry } from '../services/task-registry.js';
import { ErrorService } from '../services/error-service.js';
import { WorkflowRegistry } from '../services/workflow-registry.js';

// 执行层服务
import { LLMExecutor } from '../execution/executors/llm-executor.js';
import { ThreadLifecycleManager } from '../execution/managers/thread-lifecycle-manager.js';
import { ThreadCascadeManager } from '../execution/managers/thread-cascade-manager.js';
import { CheckpointStateManager } from '../execution/managers/checkpoint-state-manager.js';
import { ToolContextManager } from '../execution/managers/tool-context-manager.js';
import { ExecutionContext } from '../execution/context/execution-context.js';
import { ThreadBuilder } from '../execution/thread-builder.js';
import { ThreadExecutor } from '../execution/thread-executor.js';
import { ThreadLifecycleCoordinator } from '../execution/coordinators/thread-lifecycle-coordinator.js';

// 存储实现
import { MemoryCheckpointStorage } from '../storage/memory-checkpoint-storage.js';

/** 全局容器实例 */
let container: Container | null = null;

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

  container.bind(Identifiers.GlobalMessageStorage)
    .to(GlobalMessageStorage)
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
      return LLMExecutor.getInstance(eventManager);
    })
    .inSingletonScope();

  container.bind(Identifiers.ThreadLifecycleManager)
    .toDynamicValue((c: any) => {
      const eventManager = c.get(Identifiers.EventManager);
      const globalMessageStorage = c.get(Identifiers.GlobalMessageStorage);
      return new ThreadLifecycleManager(eventManager, globalMessageStorage);
    })
    .inSingletonScope();

  container.bind(Identifiers.ToolContextManager)
    .to(ToolContextManager)
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

  container.bind(Identifiers.CheckpointStateManager)
    .toDynamicValue((c: any) => {
      const checkpointStorage = new MemoryCheckpointStorage();
      const eventManager = c.get(Identifiers.EventManager);
      return new CheckpointStateManager(checkpointStorage, eventManager);
    })
    .inSingletonScope();

  // ============================================================
  // 第七层：ExecutionContext（依赖所有服务）
  // ============================================================

  container.bind(Identifiers.ExecutionContext)
    .toDynamicValue((c: any) => {
      // 通过构造函数注入所有依赖
      const workflowRegistry = c.get(Identifiers.WorkflowRegistry);
      const threadRegistry = c.get(Identifiers.ThreadRegistry);
      const eventManager = c.get(Identifiers.EventManager);
      const toolService = c.get(Identifiers.ToolService);
      const scriptService = c.get(Identifiers.ScriptService);
      const llmExecutor = c.get(Identifiers.LLMExecutor);
      const errorService = c.get(Identifiers.ErrorService);
      const taskRegistry = c.get(Identifiers.TaskRegistry);
      const globalMessageStorage = c.get(Identifiers.GlobalMessageStorage);
      const graphRegistry = c.get(Identifiers.GraphRegistry);
      const nodeTemplateRegistry = c.get(Identifiers.NodeTemplateRegistry);
      const triggerTemplateRegistry = c.get(Identifiers.TriggerTemplateRegistry);
      const checkpointStateManager = c.get(Identifiers.CheckpointStateManager);
      const threadLifecycleManager = c.get(Identifiers.ThreadLifecycleManager);
      const threadCascadeManager = c.get(Identifiers.ThreadCascadeManager);
      const toolContextManager = c.get(Identifiers.ToolContextManager);
      const threadLifecycleCoordinator = c.get(Identifiers.ThreadLifecycleCoordinator);
      
      const context = new ExecutionContext(
        workflowRegistry,
        threadRegistry,
        eventManager,
        toolService,
        codeService,
        llmExecutor,
        errorService,
        taskRegistry,
        globalMessageStorage,
        graphRegistry,
        nodeTemplateRegistry,
        triggerTemplateRegistry,
        checkpointStateManager,
        threadLifecycleManager,
        threadCascadeManager,
        toolContextManager,
        threadLifecycleCoordinator
      );
      context.initialize();
      return context;
    })
    .inSingletonScope();

  // ============================================================
  // 第八层：依赖 ExecutionContext 的执行层服务
  // ============================================================

  container.bind(Identifiers.ThreadBuilder)
    .toDynamicValue((c: any) => {
      const workflowRegistry = c.get(Identifiers.WorkflowRegistry);
      const executionContext = c.get(Identifiers.ExecutionContext);
      return new ThreadBuilder(workflowRegistry, executionContext);
    })
    .inSingletonScope();

  container.bind(Identifiers.ThreadExecutor)
    .toDynamicValue((c: any) => {
      const executionContext = c.get(Identifiers.ExecutionContext);
      return new ThreadExecutor(executionContext);
    })
    .inSingletonScope();

  container.bind(Identifiers.ThreadLifecycleCoordinator)
    .toDynamicValue((c: any) => {
      const executionContext = c.get(Identifiers.ExecutionContext);
      const globalMessageStorage = c.get(Identifiers.GlobalMessageStorage);
      return new ThreadLifecycleCoordinator(executionContext, globalMessageStorage);
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
}

/**
 * 检查容器是否已初始化
 *
 * @returns 是否已初始化
 */
export function isContainerInitialized(): boolean {
  return container !== null;
}