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
import { WorkflowContext } from './context/workflow-context';
import { ConversationManager } from './conversation';
import { ThreadContext } from './context/thread-context';
import { NodeType } from '../../types/node';
import { generateId, now as getCurrentTimestamp } from '../../utils';
import { VariableManager } from './managers/variable-manager';
import { ValidationError } from '../../types/errors';
import { WorkflowRegistry } from '../registry/workflow-registry';
import { getWorkflowRegistry, getEventManager } from './context/execution-context';

/**
 * ThreadBuilder - Thread构建器
 */
export class ThreadBuilder {
  private workflowContexts: Map<string, WorkflowContext> = new Map();
  private threadTemplates: Map<string, ThreadContext> = new Map();
  private variableManager: VariableManager;
  private workflowRegistry: WorkflowRegistry;

  constructor(workflowRegistry?: WorkflowRegistry) {
    this.variableManager = new VariableManager();
    this.workflowRegistry = workflowRegistry || getWorkflowRegistry();
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

    // 步骤2：克隆 GraphData 实例
    const threadGraphData = processedWorkflow.graph.clone();

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
      globalVariableValues: {},
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
    const eventManager = getEventManager();
    
    const conversationManager = new ConversationManager({
      tokenLimit: options.tokenLimit || 4000,
      eventManager: eventManager,
      workflowId: processedWorkflow.id,
      threadId: threadId
    });

    // 步骤5：创建 WorkflowContext
    const workflowContext = new WorkflowContext(processedWorkflow);
    this.workflowContexts.set(processedWorkflow.id, workflowContext);

    // 步骤6：创建 ThreadContext
    const threadContext = new ThreadContext(
      thread as Thread,
      workflowContext,
      conversationManager
    );

    return threadContext;
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
      // global 变量也复制（深拷贝）
      globalVariableValues: sourceThread.globalVariableValues ? { ...sourceThread.globalVariableValues } : undefined,
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

    // 复制 WorkflowContext
    const copiedWorkflowContext = sourceThreadContext.workflowContext;

    // 创建并返回 ThreadContext
    return new ThreadContext(
      copiedThread as Thread,
      copiedWorkflowContext,
      copiedConversationManager
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

    // 分离 local 和 global 变量
    const localVariables: any[] = [];
    const localVariableValues: Record<string, any> = {};

    for (const variable of parentThread.variables) {
      if (variable.scope === 'local') {
        localVariables.push({ ...variable });
        localVariableValues[variable.name] = variable.value;
      }
      // global 变量不复制到子线程，而是通过引用共享
    }

    const forkThread: Partial<Thread> = {
      id: forkThreadId,
      workflowId: parentThread.workflowId,
      workflowVersion: parentThread.workflowVersion,
      status: 'CREATED' as ThreadStatus,
      currentNodeId: forkConfig.startNodeId || parentThread.currentNodeId,
      variables: localVariables,
      variableValues: localVariableValues,
      // global 变量使用引用（共享父线程的全局变量）
      globalVariableValues: parentThread.globalVariableValues,
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

    // 复制 WorkflowContext
    const forkWorkflowContext = parentThreadContext.workflowContext;

    // 创建并返回 ThreadContext
    return new ThreadContext(
      forkThread as Thread,
      forkWorkflowContext,
      forkConversationManager
    );
  }

  /**
   * 获取或创建WorkflowContext
   * @param workflowId 工作流ID
   * @returns WorkflowContext实例
   */
  getOrCreateWorkflowContext(workflowId: string): WorkflowContext {
    let context = this.workflowContexts.get(workflowId);
    if (!context) {
      const workflow = this.workflowRegistry.get(workflowId);
      if (!workflow) {
        throw new ValidationError(`Workflow with ID '${workflowId}' not found in registry`, 'workflowId');
      }
      context = new WorkflowContext(workflow);
      this.workflowContexts.set(workflowId, context);
    }
    return context;
  }

  /**
   * 创建ConversationManager实例
   * @param options 线程选项
   * @returns ConversationManager实例
   */
  private createConversationManager(options: ThreadOptions): ConversationManager {
    return new ConversationManager({
      tokenLimit: options.tokenLimit || 4000
    });
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.workflowContexts.clear();
    this.threadTemplates.clear();
  }

  /**
   * 失效指定Workflow的缓存
   * @param workflowId 工作流ID
   */
  invalidateWorkflow(workflowId: string): void {
    this.workflowContexts.delete(workflowId);
    // 失效相关的Thread模板
    for (const [templateId, template] of this.threadTemplates.entries()) {
      if (template.getWorkflowId() === workflowId) {
        this.threadTemplates.delete(templateId);
      }
    }
  }
}