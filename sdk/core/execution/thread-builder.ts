/**
 * ThreadBuilder - Thread构建器
 * 负责从WorkflowDefinition创建Thread实例
 * 提供Thread模板缓存和深拷贝支持
 */

import type { WorkflowDefinition } from '../../types/workflow';
import type { Thread, ThreadOptions, ThreadStatus } from '../../types/thread';
import { WorkflowContext } from './workflow-context';
import { ConversationManager } from './conversation-manager';
import { LLMExecutor } from './llm-executor';
import type { LLMWrapper } from '../llm/wrapper';
import type { ToolService } from '../tools/tool-service';
import { NodeType } from '../../types/node';
import { IDUtils } from '../../types/common';
import { VariableManager } from './variable-manager';
import { ValidationError as SDKValidationError } from '../../types/errors';

/**
 * ThreadBuilder - Thread构建器
 */
export class ThreadBuilder {
  private workflowContexts: Map<string, WorkflowContext> = new Map();
  private threadTemplates: Map<string, Thread> = new Map();
  private llmWrapper: LLMWrapper;
  private toolService: ToolService;
  private variableManager: VariableManager;

  constructor(llmWrapper?: LLMWrapper, toolService?: ToolService) {
    this.llmWrapper = llmWrapper as LLMWrapper;
    this.toolService = toolService as ToolService;
    this.variableManager = new VariableManager();
  }

  /**
   * 从Workflow构建Thread
   * @param workflow 工作流定义
   * @param options 线程选项
   * @returns Thread实例
   */
  async build(workflow: WorkflowDefinition, options: ThreadOptions = {}): Promise<Thread> {
    // 步骤1：验证 workflow 定义
    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new SDKValidationError('Workflow must have at least one node', 'workflow.nodes');
    }

    const startNode = workflow.nodes.find(n => n.type === NodeType.START);
    if (!startNode) {
      throw new SDKValidationError('Workflow must have a START node', 'workflow.nodes');
    }

    const endNode = workflow.nodes.find(n => n.type === NodeType.END);
    if (!endNode) {
      throw new SDKValidationError('Workflow must have an END node', 'workflow.nodes');
    }

    // 步骤2：创建 Thread 实例
    const threadId = IDUtils.generate();
    const now = Date.now();

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

    // 步骤3：初始化变量数据结构
    this.variableManager.initializeVariables(thread as Thread);

    // 步骤4：附加变量管理方法
    this.variableManager.attachVariableMethods(thread as Thread);

    // 步骤5：创建 ConversationManager 和 LLMExecutor 实例
    if (this.llmWrapper && this.toolService) {
      const conversationManager = new ConversationManager({
        tokenLimit: options.tokenLimit || 4000
      });
      const llmExecutor = new LLMExecutor(
        conversationManager,
        this.llmWrapper,
        this.toolService
      );
      thread.contextData = {
        conversationManager,
        llmExecutor
      };
    }

    // 步骤6：缓存 workflow context
    this.workflowContexts.set(workflow.id, new WorkflowContext(workflow));

    return thread as Thread;
  }

  /**
   * 从缓存模板构建Thread
   * @param templateId 模板ID
   * @param options 线程选项
   * @returns Thread实例
   */
  async buildFromTemplate(templateId: string, options: ThreadOptions = {}): Promise<Thread> {
    const template = this.threadTemplates.get(templateId);
    if (!template) {
      throw new SDKValidationError(`Thread template not found: ${templateId}`, 'templateId');
    }

    // 深拷贝模板
    return await this.createCopy(template);
  }

  /**
   * 创建Thread副本
   * @param sourceThread 源Thread
   * @returns Thread副本
   */
  async createCopy(sourceThread: Thread): Promise<Thread> {
    const copiedThreadId = IDUtils.generate();
    const now = Date.now();

    const copiedThread: Partial<Thread> = {
      id: copiedThreadId,
      workflowId: sourceThread.workflowId,
      workflowVersion: sourceThread.workflowVersion,
      status: 'CREATED' as ThreadStatus,
      currentNodeId: sourceThread.currentNodeId,
      variables: sourceThread.variables.map(v => ({ ...v })),
      variableValues: { ...sourceThread.variableValues },
      input: { ...sourceThread.input },
      output: { ...sourceThread.output },
      nodeResults: sourceThread.nodeResults.map(h => ({ ...h })),
      startTime: now,
      endTime: undefined,
      errors: [],
      metadata: {
        ...sourceThread.metadata,
        parentThreadId: sourceThread.id
      }
    };

    // 初始化变量数据结构
    this.variableManager.initializeVariables(copiedThread as Thread);

    // 附加变量管理方法
    this.variableManager.attachVariableMethods(copiedThread as Thread);

    // 复制 ConversationManager 和 LLMExecutor 实例
    if (sourceThread.contextData?.['conversationManager'] && sourceThread.contextData?.['llmExecutor']) {
      const sourceConversationManager = sourceThread.contextData['conversationManager'] as ConversationManager;
      const sourceLLMExecutor = sourceThread.contextData['llmExecutor'] as LLMExecutor;
      
      const copiedConversationManager = sourceConversationManager.clone();
      const copiedLLMExecutor = new LLMExecutor(
        copiedConversationManager,
        this.llmWrapper,
        this.toolService
      );
      
      copiedThread.contextData = {
        conversationManager: copiedConversationManager,
        llmExecutor: copiedLLMExecutor
      };
    }

    // 复制其他 contextData
    if (sourceThread.contextData) {
      for (const [key, value] of Object.entries(sourceThread.contextData)) {
        if (key !== 'conversation' && value !== undefined) {
          copiedThread.contextData = copiedThread.contextData || {};
          copiedThread.contextData[key] = value;
        }
      }
    }

    return copiedThread as Thread;
  }

  /**
   * 创建Fork子Thread
   * @param parentThread 父Thread
   * @param forkConfig Fork配置
   * @returns Fork子Thread
   */
  async createFork(parentThread: Thread, forkConfig: any): Promise<Thread> {
    const forkThreadId = IDUtils.generate();
    const now = Date.now();

    const forkThread: Partial<Thread> = {
      id: forkThreadId,
      workflowId: parentThread.workflowId,
      workflowVersion: parentThread.workflowVersion,
      status: 'CREATED' as ThreadStatus,
      currentNodeId: forkConfig.startNodeId || parentThread.currentNodeId,
      variables: parentThread.variables.map(v => ({ ...v })),
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

    // 初始化变量数据结构
    this.variableManager.initializeVariables(forkThread as Thread);

    // 附加变量管理方法
    this.variableManager.attachVariableMethods(forkThread as Thread);

    // 复制 ConversationManager 和 LLMExecutor 实例
    if (parentThread.contextData?.['conversationManager'] && parentThread.contextData?.['llmExecutor']) {
      const parentConversationManager = parentThread.contextData['conversationManager'] as ConversationManager;
      const parentLLMExecutor = parentThread.contextData['llmExecutor'] as LLMExecutor;
      
      const forkConversationManager = parentConversationManager.clone();
      const forkLLMExecutor = new LLMExecutor(
        forkConversationManager,
        this.llmWrapper,
        this.toolService
      );
      
      forkThread.contextData = {
        conversationManager: forkConversationManager,
        llmExecutor: forkLLMExecutor
      };
    }

    return forkThread as Thread;
  }

  /**
   * 获取或创建WorkflowContext
   * @param workflow 工作流定义
   * @returns WorkflowContext实例
   */
  getOrCreateWorkflowContext(workflow: WorkflowDefinition): WorkflowContext {
    let context = this.workflowContexts.get(workflow.id);
    if (!context) {
      context = new WorkflowContext(workflow);
      this.workflowContexts.set(workflow.id, context);
    }
    return context;
  }

  /**
   * 创建ConversationManager和LLMExecutor实例
   * @param options 线程选项
   * @returns ConversationManager和LLMExecutor实例
   */
  private createConversationManager(options: ThreadOptions): { conversationManager: ConversationManager; llmExecutor: LLMExecutor } {
    if (!this.llmWrapper || !this.toolService) {
      throw new Error('LLMWrapper and ToolService must be initialized');
    }
    const conversationManager = new ConversationManager({
      tokenLimit: options.tokenLimit || 4000
    });
    const llmExecutor = new LLMExecutor(
      conversationManager,
      this.llmWrapper,
      this.toolService
    );
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
      if (template.workflowId === workflowId) {
        this.threadTemplates.delete(templateId);
      }
    }
  }
}