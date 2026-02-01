/**
 * ThreadBuilder - Thread构建器
 * 负责从WorkflowRegistry获取WorkflowDefinition并创建ThreadContext实例
 * 提供Thread模板缓存和深拷贝支持
 * 支持使用预处理后的工作流定义和图导航
 *
 * 使用 ExecutionContext 获取 WorkflowRegistry
 */

import type { ProcessedWorkflowDefinition } from '../../types/workflow';
import type { Thread, ThreadOptions, ThreadStatus } from '../../types/thread';
import { ConversationManager } from './conversation';
import { ThreadContext } from './context/thread-context';
import { NodeType } from '../../types/node';
import { generateId, now as getCurrentTimestamp } from '../../utils';
import { VariableManager } from './managers/variable-manager';
import { ValidationError } from '../../types/errors';
import { type WorkflowRegistry } from '../services/workflow-registry';
import { ExecutionContext } from './context/execution-context';
import { TriggerStatus } from '../../types/trigger';
import type { ThreadRegistry } from '../services/thread-registry';
import { graphRegistry } from '../services/graph-registry';

/**
 * ThreadBuilder - Thread构建器
 */
export class ThreadBuilder {
  private threadTemplates: Map<string, ThreadContext> = new Map();
  private variableManager: VariableManager;
  private workflowRegistry: WorkflowRegistry;
  private executionContext: ExecutionContext;

  constructor(workflowRegistryParam?: WorkflowRegistry, executionContext?: ExecutionContext) {
    this.variableManager = new VariableManager();
    this.executionContext = executionContext || ExecutionContext.createDefault();
    this.workflowRegistry = workflowRegistryParam || this.executionContext.getWorkflowRegistry();
  }

  /**
   * 从WorkflowRegistry获取工作流并构建ThreadContext
   * 统一使用ProcessedWorkflowDefinition路径
   * @param workflowId 工作流ID
   * @param options 线程选项
   * @returns ThreadContext实例
   */
  async build(workflowId: string, options: ThreadOptions = {}): Promise<ThreadContext> {
    // 步骤1：确保获取ProcessedWorkflowDefinition
    let processedWorkflow = this.workflowRegistry.getProcessed(workflowId);

    if (!processedWorkflow) {
      // 尝试获取原始工作流并预处理
      const workflow = this.workflowRegistry.get(workflowId);
      if (!workflow) {
        throw new ValidationError(
          `Workflow with ID '${workflowId}' not found in registry`,
          'workflowId'
        );
      }

      // 预处理并存储
      processedWorkflow = await this.workflowRegistry.preprocessAndStore(workflow);

      // 再次检查，确保预处理成功
      if (!processedWorkflow) {
        throw new ValidationError(
          `Failed to preprocess workflow with ID '${workflowId}'`,
          'workflowId'
        );
      }
    }

    // 步骤2：从ProcessedWorkflowDefinition构建
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

    // 步骤2：从 GraphRegistry 获取图实例
    const threadGraphData = graphRegistry.get(processedWorkflow.id);
    if (!threadGraphData) {
      throw new ValidationError(
        `Graph not found for workflow: ${processedWorkflow.id}`,
        'workflow.id'
      );
    }

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
      variableValues: {},
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
      metadata: {
        creator: options.input?.['creator'],
        tags: options.input?.['tags'],
        customFields: {
          isPreprocessed: true,
          processedAt: processedWorkflow.processedAt,
          hasSubgraphs: processedWorkflow.hasSubgraphs,
          // 合并用户提供的customFields
          ...options.input?.['customFields']
        },
        // 完整传递工作流配置和元数据
        workflowConfig: processedWorkflow.config,
        workflowMetadata: processedWorkflow.metadata,
        // 传递预处理信息
        graphAnalysis: processedWorkflow.graphAnalysis,
        preprocessValidation: processedWorkflow.validationResult,
        subgraphMergeLogs: processedWorkflow.subgraphMergeLogs,
        topologicalOrder: processedWorkflow.topologicalOrder,
        // 构建路径标识
        buildPath: 'processed'
      }
    };

    // 步骤3：从 WorkflowDefinition 初始化变量
    this.variableManager.initializeFromWorkflow(thread as Thread, processedWorkflow);

    // 步骤4：创建 ConversationManager 实例
    // 从 ExecutionContext 获取 EventManager
    const eventManager = this.executionContext.getEventManager();

    const conversationManager = new ConversationManager({
      tokenLimit: options.tokenLimit || 4000,
      eventManager: eventManager,
      workflowId: processedWorkflow.id,
      threadId: threadId
    });

    // 步骤5：创建 ThreadContext
    // 从 ExecutionContext 获取 ThreadRegistry 和 WorkflowRegistry
    const threadRegistry = this.executionContext.getThreadRegistry();
    const threadContext = new ThreadContext(
      thread as Thread,
      conversationManager,
      threadRegistry,
      this.workflowRegistry
    );

    // 步骤6：注册工作流触发器到 ThreadContext 的 TriggerManager
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
      variableValues: { ...sourceThread.variableValues },
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
      metadata: {
        ...sourceThread.metadata,
        parentThreadId: sourceThread.id,
        // 清除构建路径标识，因为是新线程
        buildPath: undefined
      }
    };

    // 复制 ConversationManager 实例
    const copiedConversationManager = sourceThreadContext.getConversationManager().clone();

    // 获取 ThreadRegistry 和 WorkflowRegistry
    const threadRegistry = this.executionContext.getThreadRegistry();

    // 创建并返回 ThreadContext
    return new ThreadContext(
      copiedThread as Thread,
      copiedConversationManager,
      threadRegistry,
      this.workflowRegistry
    );
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
    const threadVariableValues: Record<string, any> = {};

    for (const variable of parentThread.variables) {
      if (variable.scope === 'thread') {
        threadVariables.push({ ...variable });
        threadVariableValues[variable.name] = variable.value;
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
      variableValues: threadVariableValues,
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
      metadata: {
        ...parentThread.metadata,
        parentThreadId: parentThread.id,
        customFields: {
          ...(parentThread.metadata?.customFields || {}),
          forkId: forkConfig.forkId
        },
        // 清除构建路径标识，因为是新线程
        buildPath: undefined
      }
    };

    // 复制 ConversationManager 实例
    const forkConversationManager = parentThreadContext.getConversationManager().clone();

    // 获取 ThreadRegistry 和 WorkflowRegistry
    const threadRegistry = this.executionContext.getThreadRegistry();

    // 创建并返回 ThreadContext
    return new ThreadContext(
      forkThread as Thread,
      forkConversationManager,
      threadRegistry,
      this.workflowRegistry
    );
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