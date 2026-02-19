/**
 * ThreadBuilder - Thread构建器
 * 负责从WorkflowRegistry获取WorkflowDefinition并创建ThreadContext实例
 * 提供Thread模板缓存和深拷贝支持
 * 支持使用预处理后的图和图导航
 *
 * 使用 ExecutionContext 获取 WorkflowRegistry
 */

import type { PreprocessedGraph } from '@modular-agent/types';
import type { Thread, ThreadOptions, ThreadStatus } from '@modular-agent/types';
import { ConversationManager } from './managers/conversation-manager.js';
import { ThreadContext } from './context/thread-context.js';
import { generateId, now as getCurrentTimestamp, getErrorOrNew } from '@modular-agent/common-utils';
import { VariableCoordinator } from './coordinators/variable-coordinator.js';
import { VariableStateManager } from './managers/variable-state-manager.js';
import { ExecutionError, RuntimeValidationError } from '@modular-agent/types';
import { type WorkflowRegistry } from '../services/workflow-registry.js';
import { ExecutionContext } from './context/execution-context.js';
import { getContainer } from '../di/container-config.js';
import * as Identifiers from '../di/service-identifiers.js';
import { createContextualLogger } from '../../utils/contextual-logger.js';

const logger = createContextualLogger();

/**
 * ThreadBuilder - Thread构建器
 */
export class ThreadBuilder {
  private threadTemplates: Map<string, ThreadContext> = new Map();
  private variableCoordinator: VariableCoordinator;
  private variableStateManager: VariableStateManager;
  private workflowRegistry: WorkflowRegistry;
  private executionContext: ExecutionContext;

  constructor(workflowRegistryParam?: WorkflowRegistry, executionContext?: ExecutionContext) {
    this.executionContext = executionContext || ExecutionContext.createDefault();
    this.workflowRegistry = workflowRegistryParam || this.executionContext.getWorkflowRegistry();

    // 初始化变量状态管理器
    this.variableStateManager = new VariableStateManager();

    // 初始化变量协调器
    this.variableCoordinator = new VariableCoordinator(
      this.variableStateManager,
      this.executionContext.getEventManager()
    );
  }

  /**
   * 从WorkflowRegistry获取工作流并构建ThreadContext
   * 统一使用PreprocessedGraph路径
   * @param workflowId 工作流ID
   * @param options 线程选项
   * @returns ThreadContext实例
   */
  async build(workflowId: string, options: ThreadOptions = {}): Promise<ThreadContext> {
    // 从 graph-registry 获取已预处理的图
    // 预处理逻辑已移到 workflow-registry，注册时自动处理
    const container = getContainer();
    const graphRegistry = container.get(Identifiers.GraphRegistry) as any;
    const preprocessedGraph = graphRegistry.get(workflowId);

    if (!preprocessedGraph) {
      throw new ExecutionError(
        `Workflow '${workflowId}' not found or not preprocessed`,
        undefined,
        workflowId
      );
    }

    // 从PreprocessedGraph构建
    return this.buildFromPreprocessedGraph(preprocessedGraph, options);
  }

  /**
   * 从PreprocessedGraph构建ThreadContext（内部方法）
   * 使用预处理后的图和图导航
   * @param preprocessedGraph 预处理后的图
   * @param options 线程选项
   * @returns ThreadContext实例
   */
  private async buildFromPreprocessedGraph(preprocessedGraph: PreprocessedGraph, options: ThreadOptions = {}): Promise<ThreadContext> {
    // 步骤1：验证预处理后的图
    if (!preprocessedGraph.nodes || preprocessedGraph.nodes.size === 0) {
      throw new RuntimeValidationError('Preprocessed graph must have at least one node', { field: 'graph.nodes' });
    }

    const startNode = Array.from(preprocessedGraph.nodes.values()).find(n => n.type === 'START');
    if (!startNode) {
      throw new RuntimeValidationError('Preprocessed graph must have a START node', { field: 'graph.nodes' });
    }

    const endNode = Array.from(preprocessedGraph.nodes.values()).find(n => n.type === 'END');
    if (!endNode) {
      throw new RuntimeValidationError('Preprocessed graph must have an END node', { field: 'graph.nodes' });
    }

    // 步骤2：PreprocessedGraph 本身就是 Graph，包含完整的图结构
    const threadGraphData = preprocessedGraph;

    // 步骤3：创建 Thread 实例
    const threadId = generateId();
    const now = getCurrentTimestamp();

    const thread: Partial<Thread> = {
      id: threadId,
      workflowId: preprocessedGraph.workflowId,
      workflowVersion: preprocessedGraph.workflowVersion,
      status: 'CREATED' as ThreadStatus,
      currentNodeId: startNode.id,
      graph: threadGraphData,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        local: [],
        loop: []
      },
      input: options.input || {},
      output: {},
      nodeResults: [],
      startTime: now,
      errors: [],
      shouldPause: false,
      shouldStop: false
    };

    // 步骤4：从 PreprocessedGraph 初始化变量
    this.variableCoordinator.initializeFromWorkflow(thread as Thread, preprocessedGraph.variables || []);

    // 步骤5：创建 ConversationManager 实例
    const conversationManager = new ConversationManager({
      tokenLimit: options.tokenLimit || 4000,
      eventManager: this.executionContext.getEventManager(),
      workflowId: preprocessedGraph.workflowId,
      threadId: threadId,
      toolService: this.executionContext.getToolService(),
      availableTools: preprocessedGraph.availableTools
    });

    // 步骤6：创建 ThreadContext
    const threadContext = new ThreadContext(
      thread as Thread,
      conversationManager,
      this.executionContext.getThreadRegistry(),
      this.workflowRegistry,
      this.executionContext.getEventManager(),
      this.executionContext.get('toolService'),
      this.executionContext.get('llmExecutor')
    );

    // 步骤7：初始化变量
    threadContext.initializeVariables();

    // 步骤8：初始化工具可见性上下文
    threadContext.initializeToolVisibility();

    // 步骤9：注册工作流触发器到 ThreadContext 的 TriggerManager
    this.registerWorkflowTriggers(threadContext, preprocessedGraph);

    return threadContext;
  }

  /**
   * 注册工作流触发器到 ThreadContext 的 TriggerStateManager
   * 初始化触发器的运行时状态，而不是存储触发器定义副本
   * @param threadContext ThreadContext 实例
   * @param preprocessedGraph 预处理后的图
   */
  private registerWorkflowTriggers(threadContext: ThreadContext, preprocessedGraph: PreprocessedGraph): void {
    // 检查预处理后的图是否有触发器定义
    if (!preprocessedGraph.triggers || preprocessedGraph.triggers.length === 0) {
      return;
    }

    // 使用 ThreadContext 的 TriggerStateManager（每个 Thread 独立）
    const triggerStateManager = threadContext.triggerStateManager;

    // 确保工作流 ID 已设置
    triggerStateManager.setWorkflowId(preprocessedGraph.workflowId);

    // 初始化所有触发器的运行时状态
    for (const workflowTrigger of preprocessedGraph.triggers) {
      try {
        // 创建运行时状态
        const state = {
          triggerId: workflowTrigger.id,
          threadId: threadContext.getThreadId(),
          workflowId: preprocessedGraph.workflowId,
          status: (workflowTrigger.enabled !== false ? 'enabled' : 'disabled') as 'enabled' | 'disabled',
          triggerCount: 0,
          updatedAt: getCurrentTimestamp()
        };

        // 注册状态到 TriggerStateManager
        triggerStateManager.register(state);
      } catch (error) {
        // 记录警告但不中断线程构建
        logger.executionWarning(
          `Failed to register trigger state ${workflowTrigger.id}`,
          workflowTrigger.id,
          {
            workflowId: preprocessedGraph.workflowId,
            threadId: threadContext.getThreadId(),
            operation: 'trigger_registration'
          },
          getErrorOrNew(error)
        );
      }
    }
  }

  /**
   * 从缓存模板构建ThreadContext
   * @param templateId 模板ID
   * @param options 线程选项
   * @returns ThreadContext实例
   */
  async buildFromTemplate(templateId: string, options: ThreadOptions = {}): Promise<ThreadContext> {
    const template = this.threadTemplates.get(templateId);
    if (!template) {
      throw new RuntimeValidationError(`Thread template not found: ${templateId}`, { field: 'templateId', value: templateId });
    }

    // 深拷贝模板
    return await this.createCopy(template);
  }

  /**
   * 创建ThreadContext副本
   * @param sourceThreadContext 源ThreadContext
   * @returns ThreadContext副本
   */
  async createCopy(sourceThreadContext: ThreadContext): Promise<ThreadContext> {
    const sourceThread = sourceThreadContext.thread;
    const copiedThreadId = generateId();
    const now = getCurrentTimestamp();

    const copiedThread: Partial<Thread> = {
      id: copiedThreadId,
      workflowId: sourceThread.workflowId,
      workflowVersion: sourceThread.workflowVersion,
      status: 'CREATED' as ThreadStatus,
      currentNodeId: sourceThread.currentNodeId,
      variables: sourceThread.variables.map((v: any) => ({ ...v })),
      // 四级作用域：global 通过引用共享，thread 深拷贝，local 和 loop 清空
      variableScopes: {
        global: sourceThread.variableScopes.global,
        thread: { ...sourceThread.variableScopes.thread },
        local: [],
        loop: []
      },
      input: { ...sourceThread.input },
      output: { ...sourceThread.output },
      nodeResults: sourceThread.nodeResults.map((h: any) => ({ ...h })),
      startTime: now,
      endTime: undefined,
      errors: [],
      shouldPause: false,
      shouldStop: false,
      threadType: 'TRIGGERED_SUBWORKFLOW',
      triggeredSubworkflowContext: {
        parentThreadId: sourceThread.id,
        childThreadIds: [],
        triggeredSubworkflowId: ''
      }
    };

    // 复制 ConversationManager 实例
    const copiedConversationManager = sourceThreadContext.conversationManager.clone();

    // 获取 ThreadRegistry 和 WorkflowRegistry
    const threadRegistry = this.executionContext.getThreadRegistry();

    // 创建并返回 ThreadContext
    const copiedThreadContext = new ThreadContext(
      copiedThread as Thread,
      copiedConversationManager,
      threadRegistry,
      this.workflowRegistry,
      this.executionContext.getEventManager(),
      this.executionContext.get('toolService'),
      this.executionContext.get('llmExecutor')
    );

    // 初始化变量
    copiedThreadContext.initializeVariables();

    // 初始化工具可见性上下文
    copiedThreadContext.initializeToolVisibility();

    return copiedThreadContext;
  }

  /**
   * 创建Fork子ThreadContext
   * @param parentThreadContext 父ThreadContext
   * @param forkConfig Fork配置
   * @returns Fork子ThreadContext
   */
  async createFork(parentThreadContext: ThreadContext, forkConfig: any): Promise<ThreadContext> {
    const parentThread = parentThreadContext.thread;
    const forkThreadId = generateId();
    const now = getCurrentTimestamp();

    // 分离 thread 和 global 变量
    const threadVariables: any[] = [];

    for (const variable of parentThread.variables) {
      if (variable.scope === 'thread') {
        threadVariables.push({ ...variable });
      }
      // global 变量不复制到子线程，而是通过引用共享
    }

    const forkThread: Partial<Thread> = {
      id: forkThreadId,
      workflowId: parentThread.workflowId,
      workflowVersion: parentThread.workflowVersion,
      status: 'CREATED' as ThreadStatus,
      currentNodeId: forkConfig.startNodeId || parentThread.currentNodeId,
      variables: threadVariables,
      // 四级作用域：global 通过引用共享，thread 深拷贝，local 和 loop 清空
      variableScopes: {
        global: parentThread.variableScopes.global,
        thread: { ...parentThread.variableScopes.thread },
        local: [],
        loop: []
      },
      input: { ...parentThread.input },
      output: {},
      nodeResults: [],
      startTime: now,
      endTime: undefined,
      errors: [],
      shouldPause: false,
      shouldStop: false,
      threadType: 'FORK_JOIN',
      forkJoinContext: {
        forkId: forkConfig.forkId,
        forkPathId: forkConfig.forkPathId
      }
    };

    // 复制 ConversationManager 实例
    const forkConversationManager = parentThreadContext.conversationManager.clone();

    // 获取 ThreadRegistry 和 WorkflowRegistry
    const threadRegistry = this.executionContext.getThreadRegistry();

    // 创建并返回 ThreadContext
    const forkThreadContext = new ThreadContext(
      forkThread as Thread,
      forkConversationManager,
      threadRegistry,
      this.workflowRegistry,
      this.executionContext.getEventManager(),
      this.executionContext.get('toolService'),
      this.executionContext.get('llmExecutor')
    );

    // 初始化变量
    forkThreadContext.initializeVariables();

    // 初始化工具可见性上下文
    forkThreadContext.initializeToolVisibility();

    return forkThreadContext;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.threadTemplates.clear();
  }

  /**
   * 失效指定Workflow的缓存
   * @param workflowId 工作流ID
   */
  invalidateWorkflow(workflowId: string): void {
    // 失效相关的Thread模板
    for (const [templateId, template] of this.threadTemplates.entries()) {
      if (template.getWorkflowId() === workflowId) {
        this.threadTemplates.delete(templateId);
      }
    }
  }
}