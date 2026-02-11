/**
 * ThreadBuilder - Thread构建器
 * 负责从WorkflowRegistry获取WorkflowDefinition并创建ThreadContext实例
 * 提供Thread模板缓存和深拷贝支持
 * 支持使用预处理后的工作流定义和图导航
 *
 * 使用 ExecutionContext 获取 WorkflowRegistry
 */

import { ProcessedWorkflowDefinition } from '../../types/workflow';
import type { Thread, ThreadOptions, ThreadStatus } from '../../types/thread';
import { ThreadType, ErrorHandlingStrategy } from '../../types/thread';
import { ConversationManager } from './managers/conversation-manager';
import { ThreadContext } from './context/thread-context';
import { NodeType } from '../../types/node';
import { generateId, now as getCurrentTimestamp } from '../../utils';
import { VariableCoordinator } from './coordinators/variable-coordinator';
import { VariableStateManager } from './managers/variable-state-manager';
import { ValidationError } from '../../types/errors';
import { type WorkflowRegistry } from '../services/workflow-registry';
import { ExecutionContext } from './context/execution-context';
import { TriggerStatus } from '../../types/trigger';

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
   * 统一使用ProcessedWorkflowDefinition路径
   * @param workflowId 工作流ID
   * @param options 线程选项
   * @returns ThreadContext实例
   */
  async build(workflowId: string, options: ThreadOptions = {}): Promise<ThreadContext> {
    // 统一使用 ensureProcessed 确保工作流已预处理
    // 这会自动处理：
    // 1. 无依赖工作流：已在注册时预处理，直接返回缓存
    // 2. 有依赖工作流：延迟到此时预处理，确保所有依赖都已注册
    const processedWorkflow = await this.workflowRegistry.ensureProcessed(workflowId);

    // 从ProcessedWorkflowDefinition构建
    return this.buildFromProcessedDefinition(processedWorkflow, options);
  }

  /**
   * 从ProcessedWorkflowDefinition构建ThreadContext（内部方法）
   * 使用预处理后的工作流定义和图导航
   * @param processedWorkflow 处理后的工作流定义
   * @param options 线程选项
   * @returns ThreadContext实例
   */
  private async buildFromProcessedDefinition(processedWorkflow: ProcessedWorkflowDefinition, options: ThreadOptions = {}): Promise<ThreadContext> {
    // 步骤1：验证处理后的工作流定义
    if (!processedWorkflow.nodes || processedWorkflow.nodes.length === 0) {
      throw new ValidationError('Processed workflow must have at least one node', 'workflow.nodes');
    }

    const startNode = processedWorkflow.nodes.find(n => n.type === NodeType.START);
    if (!startNode) {
      throw new ValidationError('Processed workflow must have a START node', 'workflow.nodes');
    }

    const endNode = processedWorkflow.nodes.find(n => n.type === NodeType.END);
    if (!endNode) {
      throw new ValidationError('Processed workflow must have an END node', 'workflow.nodes');
    }

    // 步骤2：从 ProcessedWorkflowDefinition 获取图实例
    // ProcessedWorkflowDefinition 现在直接包含完整的图结构
    const threadGraphData = processedWorkflow.graph;

    // 步骤3：创建 Thread 实例
    const threadId = generateId();
    const now = getCurrentTimestamp();

    const thread: Partial<Thread> = {
      id: threadId,
      workflowId: processedWorkflow.id,
      workflowVersion: processedWorkflow.version,
      status: 'CREATED' as ThreadStatus,
      currentNodeId: startNode.id,
      graph: threadGraphData,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      input: options.input || {},
      output: {},
      nodeResults: [],
      startTime: now,
      errors: [],
      errorHandling: processedWorkflow.config?.errorHandling || { strategy: ErrorHandlingStrategy.STOP_ON_ERROR }
    };

    // 步骤4：从 WorkflowDefinition 初始化变量
    this.variableCoordinator.initializeFromWorkflow(thread as Thread, processedWorkflow.variables || []);

    // 步骤5：创建 ConversationManager 实例
    const conversationManager = new ConversationManager({
      tokenLimit: options.tokenLimit || 4000,
      eventManager: this.executionContext.getEventManager(),
      workflowId: processedWorkflow.id,
      threadId: threadId,
      toolService: this.executionContext.getToolService(),
      availableTools: processedWorkflow.availableTools
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

    // 步骤8：注册工作流触发器到 ThreadContext 的 TriggerManager
    this.registerWorkflowTriggers(threadContext, processedWorkflow);

    return threadContext;
  }

  /**
   * 注册工作流触发器到 ThreadContext 的 TriggerStateManager
   * 初始化触发器的运行时状态，而不是存储触发器定义副本
   * @param threadContext ThreadContext 实例
   * @param workflow 工作流定义
   */
  private registerWorkflowTriggers(threadContext: ThreadContext, workflow: ProcessedWorkflowDefinition): void {
    // 检查工作流是否有触发器定义
    if (!workflow.triggers || workflow.triggers.length === 0) {
      return;
    }

    // 使用 ThreadContext 的 TriggerStateManager（每个 Thread 独立）
    const triggerStateManager = threadContext.triggerStateManager;

    // 确保工作流 ID 已设置
    triggerStateManager.setWorkflowId(workflow.id);

    // 初始化所有触发器的运行时状态
    for (const workflowTrigger of workflow.triggers) {
      try {
        // 创建运行时状态
        const state = {
          triggerId: workflowTrigger.id,
          threadId: threadContext.getThreadId(),
          workflowId: workflow.id,
          status: workflowTrigger.enabled !== false ? TriggerStatus.ENABLED : TriggerStatus.DISABLED,
          triggerCount: 0,
          updatedAt: getCurrentTimestamp()
        };

        // 注册状态到 TriggerStateManager
        triggerStateManager.register(state);
      } catch (error) {
        // 静默处理错误，避免影响其他触发器的注册
        console.error(`Failed to register trigger state ${workflowTrigger.id}:`, error);
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
      throw new ValidationError(`Thread template not found: ${templateId}`, 'templateId');
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
      // 四级作用域：global 通过引用共享，thread 深拷贝，subgraph 和 loop 清空
      variableScopes: {
        global: sourceThread.variableScopes.global,
        thread: { ...sourceThread.variableScopes.thread },
        subgraph: [],
        loop: []
      },
      input: { ...sourceThread.input },
      output: { ...sourceThread.output },
      nodeResults: sourceThread.nodeResults.map((h: any) => ({ ...h })),
      startTime: now,
      endTime: undefined,
      errors: [],
      threadType: ThreadType.TRIGGERED_SUBWORKFLOW,
      triggeredSubworkflowContext: {
        parentThreadId: sourceThread.id,
        childThreadIds: [],
        triggeredSubworkflowId: ''
      },
      errorHandling: sourceThread.errorHandling
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
      // 四级作用域：global 通过引用共享，thread 深拷贝，subgraph 和 loop 清空
      variableScopes: {
        global: parentThread.variableScopes.global,
        thread: { ...parentThread.variableScopes.thread },
        subgraph: [],
        loop: []
      },
      input: { ...parentThread.input },
      output: {},
      nodeResults: [],
      startTime: now,
      endTime: undefined,
      errors: [],
      threadType: ThreadType.FORK_JOIN,
      forkJoinContext: {
        forkId: forkConfig.forkId,
        forkPathId: forkConfig.forkPathId
      },
      errorHandling: parentThread.errorHandling
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