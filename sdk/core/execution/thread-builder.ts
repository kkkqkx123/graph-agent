/**
 * ThreadBuilder - Thread构建器
 * 负责从WorkflowRegistry获取WorkflowDefinition并创建ThreadContext实例
 * 提供Thread模板缓存和深拷贝支持
 *
 * 使用 ExecutionContext 获取 WorkflowRegistry
 */

import type { WorkflowDefinition } from '../../types/workflow';
import type { Thread, ThreadOptions, ThreadStatus } from '../../types/thread';
import { WorkflowContext } from './context/workflow-context';
import { ConversationManager } from './conversation';
import { LLMExecutor } from './llm-executor';
import { ThreadContext } from './context/thread-context';
import { NodeType } from '../../types/node';
import { generateId, now as getCurrentTimestamp } from '../../utils';
import { VariableManager } from './managers/variable-manager';
import { ValidationError } from '../../types/errors';
import { WorkflowRegistry } from '../registry/workflow-registry';
import { getWorkflowRegistry } from './context/execution-context';

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
   * 从WorkflowRegistry获取WorkflowDefinition并构建ThreadContext
   * @param workflowId 工作流ID
   * @param options 线程选项
   * @returns ThreadContext实例
   */
  async build(workflowId: string, options: ThreadOptions = {}): Promise<ThreadContext> {
    // 从 WorkflowRegistry 获取工作流定义
    const workflow = this.workflowRegistry.get(workflowId);
    if (!workflow) {
      throw new ValidationError(`Workflow with ID '${workflowId}' not found in registry`, 'workflowId');
    }

    return this.buildFromDefinition(workflow, options);
  }

  /**
   * 从WorkflowDefinition构建ThreadContext（内部方法）
   * @param workflow 工作流定义
   * @param options 线程选项
   * @returns ThreadContext实例
   */
  private async buildFromDefinition(workflow: WorkflowDefinition, options: ThreadOptions = {}): Promise<ThreadContext> {
    // 步骤1：验证 workflow 定义
    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new ValidationError('Workflow must have at least one node', 'workflow.nodes');
    }

    const startNode = workflow.nodes.find(n => n.type === NodeType.START);
    if (!startNode) {
      throw new ValidationError('Workflow must have a START node', 'workflow.nodes');
    }

    const endNode = workflow.nodes.find(n => n.type === NodeType.END);
    if (!endNode) {
      throw new ValidationError('Workflow must have an END node', 'workflow.nodes');
    }

    // 步骤2：创建 Thread 实例
    const threadId = generateId();
    const now = getCurrentTimestamp();

    const thread: Partial<Thread> = {
      id: threadId,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: 'CREATED' as ThreadStatus,
      currentNodeId: startNode.id,
      variables: [],
      variableValues: {},
      input: options.input || {},
      output: {},
      nodeResults: [],
      startTime: now,
      errors: [],
      metadata: {
        creator: options.input?.['creator'],
        tags: options.input?.['tags']
      }
    };

    // 步骤3：从 WorkflowDefinition 初始化变量
    this.variableManager.initializeFromWorkflow(thread as Thread, workflow);

    // 步骤4：创建 ConversationManager 和 LLMExecutor 实例
    const conversationManager = new ConversationManager({
      tokenLimit: options.tokenLimit || 4000
    });
    const llmExecutor = new LLMExecutor(conversationManager);

    // 步骤5：创建 WorkflowContext
    const workflowContext = new WorkflowContext(workflow);
    this.workflowContexts.set(workflow.id, workflowContext);

    // 步骤6：创建并返回 ThreadContext
    return new ThreadContext(
      thread as Thread,
      workflowContext,
      llmExecutor
    );
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
      input: { ...sourceThread.input },
      output: { ...sourceThread.output },
      nodeResults: sourceThread.nodeResults.map((h: any) => ({ ...h })),
      startTime: now,
      endTime: undefined,
      errors: [],
      metadata: {
        ...sourceThread.metadata,
        parentThreadId: sourceThread.id
      }
    };

    // 复制 ConversationManager 和 LLMExecutor 实例
    const copiedConversationManager = sourceThreadContext.getConversationManager().clone();
    const copiedLLMExecutor = new LLMExecutor(copiedConversationManager);

    // 复制 WorkflowContext
    const copiedWorkflowContext = sourceThreadContext.workflowContext;

    // 创建并返回 ThreadContext
    return new ThreadContext(
      copiedThread as Thread,
      copiedWorkflowContext,
      copiedLLMExecutor
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

    const forkThread: Partial<Thread> = {
      id: forkThreadId,
      workflowId: parentThread.workflowId,
      workflowVersion: parentThread.workflowVersion,
      status: 'CREATED' as ThreadStatus,
      currentNodeId: forkConfig.startNodeId || parentThread.currentNodeId,
      variables: parentThread.variables.map((v: any) => ({ ...v })),
      variableValues: { ...parentThread.variableValues },
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
        }
      }
    };

    // 复制 ConversationManager 和 LLMExecutor 实例
    const forkConversationManager = parentThreadContext.getConversationManager().clone();
    const forkLLMExecutor = new LLMExecutor(forkConversationManager);

    // 复制 WorkflowContext
    const forkWorkflowContext = parentThreadContext.workflowContext;

    // 创建并返回 ThreadContext
    return new ThreadContext(
      forkThread as Thread,
      forkWorkflowContext,
      forkLLMExecutor
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
   * 创建ConversationManager和LLMExecutor实例
   * @param options 线程选项
   * @returns ConversationManager和LLMExecutor实例
   */
  private createConversationManager(options: ThreadOptions): { conversationManager: ConversationManager; llmExecutor: LLMExecutor } {
    const conversationManager = new ConversationManager({
      tokenLimit: options.tokenLimit || 4000
    });
    const llmExecutor = new LLMExecutor(conversationManager);
    return { conversationManager, llmExecutor };
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