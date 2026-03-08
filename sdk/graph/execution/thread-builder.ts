/**
 * ThreadBuilder - Thread构建器
 * 负责从WorkflowRegistry获取WorkflowDefinition并创建ThreadEntity实例
 * 提供Thread模板缓存和深拷贝支持
 * 支持使用预处理后的图和图导航
 */

import type { PreprocessedGraph } from '@modular-agent/types';
import type { Thread, ThreadOptions, ThreadStatus } from '@modular-agent/types';
import { ThreadEntity } from '../../core/entities/thread-entity.js';
import { ExecutionState } from '../../core/entities/execution-state.js';
import { generateId, now as getCurrentTimestamp, getErrorOrNew } from '@modular-agent/common-utils';
import { ExecutionError, RuntimeValidationError } from '@modular-agent/types';
import type { GraphRegistry } from '../../core/services/graph-registry.js';
import { getContainer } from '../../core/di/index.js';
import * as Identifiers from '../../core/di/service-identifiers.js';
import { createContextualLogger } from '../../utils/contextual-logger.js';

const logger = createContextualLogger();

/**
 * ThreadBuilder - Thread构建器
 */
export class ThreadBuilder {
  private threadTemplates: Map<string, ThreadEntity> = new Map();

  constructor() { }

  /**
   * 获取图注册表（从DI容器）
   */
  private getGraphRegistry(): GraphRegistry {
    const container = getContainer();
    return container.get(Identifiers.GraphRegistry);
  }

  /**
   * 获取变量协调器（从DI容器）
   */
  private getVariableCoordinator(): any {
    const container = getContainer();
    return container.get(Identifiers.VariableCoordinator);
  }

  /**
   * 获取变量状态管理器（从DI容器）
   */
  private getVariableStateManager(): any {
    const container = getContainer();
    return container.get(Identifiers.VariableStateManager);
  }

  /**
   * 从WorkflowRegistry获取工作流并构建ThreadEntity
   * 统一使用PreprocessedGraph路径
   * @param workflowId 工作流ID
   * @param options 线程选项
   * @returns ThreadEntity实例
   */
  async build(workflowId: string, options: ThreadOptions = {}): Promise<ThreadEntity> {
    // 从 graph-registry 获取已预处理的图
    const preprocessedGraph = this.getGraphRegistry().get(workflowId);

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
   * 从PreprocessedGraph构建ThreadEntity（内部方法）
   * 使用预处理后的图和图导航
   * @param preprocessedGraph 预处理后的图
   * @param options 线程选项
   * @returns ThreadEntity实例
   */
  private async buildFromPreprocessedGraph(preprocessedGraph: PreprocessedGraph, options: ThreadOptions = {}): Promise<ThreadEntity> {
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

    const thread: Thread = {
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
    this.getVariableCoordinator().initializeFromWorkflow(thread, preprocessedGraph.variables || []);

    // 步骤5：创建 ExecutionState
    const executionState = new ExecutionState();

    // 步骤6：创建 ThreadEntity
    const threadEntity = new ThreadEntity(thread, executionState);

    return threadEntity;
  }

  /**
   * 从缓存模板构建ThreadEntity
   * @param templateId 模板ID
   * @param options 线程选项
   * @returns ThreadEntity实例
   */
  async buildFromTemplate(templateId: string, options: ThreadOptions = {}): Promise<ThreadEntity> {
    const template = this.threadTemplates.get(templateId);
    if (!template) {
      throw new RuntimeValidationError(`Thread template not found: ${templateId}`, { field: 'templateId', value: templateId });
    }

    // 深拷贝模板
    return await this.createCopy(template);
  }

  /**
   * 创建ThreadEntity副本
   * @param sourceThreadEntity 源ThreadEntity
   * @returns ThreadEntity副本
   */
  async createCopy(sourceThreadEntity: ThreadEntity): Promise<ThreadEntity> {
    const sourceThread = sourceThreadEntity.getThread();
    const copiedThreadId = generateId();
    const now = getCurrentTimestamp();

    const copiedThread: Thread = {
      id: copiedThreadId,
      workflowId: sourceThread.workflowId,
      workflowVersion: sourceThread.workflowVersion,
      status: 'CREATED' as ThreadStatus,
      currentNodeId: sourceThread.currentNodeId,
      graph: sourceThread.graph,
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

    // 创建 ExecutionState
    const executionState = new ExecutionState();

    // 创建并返回 ThreadEntity
    const copiedThreadEntity = new ThreadEntity(copiedThread, executionState);

    return copiedThreadEntity;
  }

  /**
   * 创建Fork子ThreadEntity
   * @param parentThreadEntity 父ThreadEntity
   * @param forkConfig Fork配置
   * @returns Fork子ThreadEntity
   */
  async createFork(parentThreadEntity: ThreadEntity, forkConfig: any): Promise<ThreadEntity> {
    const parentThread = parentThreadEntity.getThread();
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

    const forkThread: Thread = {
      id: forkThreadId,
      workflowId: parentThread.workflowId,
      workflowVersion: parentThread.workflowVersion,
      status: 'CREATED' as ThreadStatus,
      currentNodeId: forkConfig.startNodeId || parentThread.currentNodeId,
      graph: parentThread.graph,
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

    // 创建 ExecutionState
    const executionState = new ExecutionState();

    // 创建并返回 ThreadEntity
    const forkThreadEntity = new ThreadEntity(forkThread, executionState);

    return forkThreadEntity;
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
