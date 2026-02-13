/**
 * 检查点协调器
 * 无状态服务，协调完整的检查点流程
 */

import { NotFoundError, ThreadContextNotFoundError, CheckpointNotFoundError, WorkflowNotFoundError } from '@modular-agent/types/errors';
import type { Thread } from '@modular-agent/types/thread';
import type { Checkpoint, CheckpointMetadata, ThreadStateSnapshot } from '@modular-agent/types/checkpoint';
import type { ThreadRegistry } from '../../services/thread-registry';
import type { WorkflowRegistry } from '../../services/workflow-registry';
import type { GlobalMessageStorage } from '../../services/global-message-storage';
import { CheckpointStateManager } from '../managers/checkpoint-state-manager';
import { ConversationManager } from '../managers/conversation-manager';
import { VariableStateManager } from '../managers/variable-state-manager';
import { ThreadContext } from '../context/thread-context';
import { ExecutionContext } from '../context/execution-context';
import { generateId, now } from '@modular-agent/common-utils';

/**
 * 检查点依赖项
 */
export interface CheckpointDependencies {
  threadRegistry: ThreadRegistry;
  checkpointStateManager: CheckpointStateManager;
  workflowRegistry: WorkflowRegistry;
  globalMessageStorage: GlobalMessageStorage;
}

/**
 * 检查点协调器（完全无状态）
 */
export class CheckpointCoordinator {
  /**
   * 创建检查点（静态方法）
   * @param threadId 线程ID
   * @param dependencies 依赖项
   * @param metadata 检查点元数据
   * @returns 检查点ID
   */
  static async createCheckpoint(
    threadId: string,
    dependencies: CheckpointDependencies,
    metadata?: CheckpointMetadata
  ): Promise<string> {
    const { threadRegistry, checkpointStateManager, workflowRegistry, globalMessageStorage } = dependencies;

    // 步骤1：从 ThreadRegistry 获取 ThreadContext 对象
    const threadContext = threadRegistry.get(threadId);
    if (!threadContext) {
      throw new ThreadContextNotFoundError(`ThreadContext not found`, threadId);
    }

    const thread = threadContext.thread;

    // 步骤2：提取 ThreadStateSnapshot
    // 使用 VariableStateManager 创建变量快照
    const variableStateManager = new VariableStateManager();
    const variableSnapshot = variableStateManager.createSnapshot();

    // 将 nodeResults 数组转换为 Record 格式
    const nodeResultsRecord: Record<string, any> = {};
    for (const result of thread.nodeResults) {
      nodeResultsRecord[result.nodeId] = result;
    }

    // 获取对话管理器
    const conversationManager = threadContext.getConversationManager();

    // 存储完整消息历史到全局存储
    globalMessageStorage.storeMessages(
      threadId,
      conversationManager.getAllMessages()
    );

    // 增加引用计数，防止消息被过早删除
    globalMessageStorage.addReference(threadId);

    // 只保存索引状态和Token统计
    const conversationState = {
      markMap: conversationManager.getMarkMap(),
      tokenUsage: conversationManager.getTokenUsage(),
      currentRequestUsage: conversationManager.getCurrentRequestUsage()
    };

    // 获取触发器状态快照
    const triggerStateSnapshot = threadContext.getTriggerStateSnapshot();

    const threadState: ThreadStateSnapshot = {
      status: thread.status,
      currentNodeId: thread.currentNodeId,
      variables: variableSnapshot.variables,
      variableScopes: variableSnapshot.variableScopes,
      input: thread.input,
      output: thread.output,
      nodeResults: nodeResultsRecord,
      errors: thread.errors,
      conversationState, // 使用新的索引状态
      triggerStates: triggerStateSnapshot.size > 0 ? triggerStateSnapshot : undefined, // 保存触发器状态
      forkJoinContext: thread.forkJoinContext, // 保存FORK/JOIN上下文
      triggeredSubworkflowContext: thread.triggeredSubworkflowContext // 保存Triggered子工作流上下文
    };

    // 步骤3：生成唯一 checkpointId 和 timestamp
    const checkpointId = generateId();
    const timestamp = now();

    // 步骤4：创建 Checkpoint 对象
    const checkpoint: Checkpoint = {
      id: checkpointId,
      threadId: threadContext.getThreadId(),
      workflowId: threadContext.getWorkflowId(),
      timestamp,
      threadState,
      metadata
    };

    // 步骤5：调用 CheckpointStateManager 创建检查点
    return await checkpointStateManager.create(checkpoint);
  }

  /**
   * 从检查点恢复 ThreadContext 状态（静态方法）
   * @param checkpointId 检查点ID
   * @param dependencies 依赖项
   * @returns 恢复的 ThreadContext 对象
   */
  static async restoreFromCheckpoint(
    checkpointId: string,
    dependencies: CheckpointDependencies
  ): Promise<ThreadContext> {
    const { threadRegistry, checkpointStateManager, workflowRegistry, globalMessageStorage } = dependencies;

    // 步骤1：从 CheckpointStateManager 加载检查点
    const checkpoint = await checkpointStateManager.get(checkpointId);
    if (!checkpoint) {
      throw new CheckpointNotFoundError(`Checkpoint not found`, checkpointId);
    }

    // 步骤2：验证 checkpoint 完整性和兼容性
    CheckpointCoordinator.validateCheckpoint(checkpoint);

    // 步骤3：从 WorkflowRegistry 获取 ProcessedWorkflowDefinition
    // ProcessedWorkflowDefinition 包含完整的预处理后的图结构
    const processedWorkflow = await workflowRegistry.ensureProcessed(checkpoint.workflowId);
    if (!processedWorkflow) {
      throw new WorkflowNotFoundError(`Processed workflow not found`, checkpoint.workflowId);
    }

    // 从 ProcessedWorkflowDefinition 获取图结构
    // 设计目的：恢复后的 Thread 需要完整的图结构(graph中存储的是合并后的工作流，完成了命名冲突的处理)
    // 来继续执行工作流（例如：查找节点、遍历边、执行图算法等）
    const graph = processedWorkflow.graph;

    // 步骤4：恢复 Thread 状态
    // 将 nodeResults Record 转换回数组格式
    const nodeResultsArray = Object.values(checkpoint.threadState.nodeResults || {});

    const thread: Partial<Thread> = {
      id: checkpoint.threadId,
      workflowId: checkpoint.workflowId,
      workflowVersion: '1.0.0', // TODO: 从 checkpoint 元数据中获取版本
      status: checkpoint.threadState.status,
      currentNodeId: checkpoint.threadState.currentNodeId,
      input: checkpoint.threadState.input,
      output: checkpoint.threadState.output,
      nodeResults: nodeResultsArray,
      startTime: checkpoint.timestamp,
      errors: checkpoint.threadState.errors,
      forkJoinContext: checkpoint.threadState.forkJoinContext,
      triggeredSubworkflowContext: checkpoint.threadState.triggeredSubworkflowContext,
      variableScopes: checkpoint.threadState.variableScopes,
      graph
    };

    // 步骤5：使用 VariableStateManager 恢复变量快照
    const variableStateManager = new VariableStateManager();
    variableStateManager.restoreFromSnapshot({
      variables: checkpoint.threadState.variables,
      variableScopes: checkpoint.threadState.variableScopes
    });

    // 步骤6：从全局存储获取完整消息历史
    const messageHistory = globalMessageStorage.getMessages(checkpoint.threadId);
    if (!messageHistory) {
      throw new NotFoundError(`Message history not found`, 'MessageHistory', checkpoint.threadId);
    }

    // 步骤7：创建 ConversationManager
    const conversationManager = new ConversationManager();

    // 批量添加所有消息（包括已压缩的）
    conversationManager.addMessages(...messageHistory);

    // 步骤8：恢复索引状态
    if (checkpoint.threadState.conversationState) {
      conversationManager.getIndexManager().setMarkMap(checkpoint.threadState.conversationState.markMap);

      // 恢复Token统计
      conversationManager.getTokenUsageTracker().setState(
        checkpoint.threadState.conversationState.tokenUsage,
        checkpoint.threadState.conversationState.currentRequestUsage
      );
    }

    // 步骤9：创建 ThreadContext
    const executionContext = ExecutionContext.createDefault();
    const threadContext = new ThreadContext(
      thread as Thread,
      conversationManager,
      threadRegistry,
      workflowRegistry,
      executionContext.getEventManager(),
      executionContext.getToolService(),
      executionContext.getLlmExecutor()
    );

    // 步骤10：恢复触发器状态
    if (checkpoint.threadState.triggerStates) {
      threadContext.restoreTriggerState(checkpoint.threadState.triggerStates);
    }

    // 步骤11：恢复FORK/JOIN上下文（如果存在）
    if (checkpoint.threadState.forkJoinContext) {
      threadContext.setForkId(checkpoint.threadState.forkJoinContext.forkId);
      threadContext.setForkPathId(checkpoint.threadState.forkJoinContext.forkPathId);
    }

    // 步骤12：恢复Triggered子工作流上下文（如果存在）
    if (checkpoint.threadState.triggeredSubworkflowContext) {
      threadContext.setParentThreadId(checkpoint.threadState.triggeredSubworkflowContext.parentThreadId);
      threadContext.setTriggeredSubworkflowId(checkpoint.threadState.triggeredSubworkflowContext.triggeredSubworkflowId);
    }

    // 步骤13：推断FORK/JOIN状态（如果需要）
    // 注意：FORK/JOIN状态不需要保存到Checkpoint中，可以在恢复时从图结构和执行序列推断
    // 如果当前节点是JOIN节点，可以推断哪些分支已完成
    if (thread.graph) {
      const currentNode = thread.graph.getNode(checkpoint.threadState.currentNodeId);
      if (currentNode && currentNode.type === 'JOIN') {
        const forkJoinState = this.inferForkJoinState(
          checkpoint.threadState.currentNodeId,
          checkpoint.threadState.nodeResults,
          thread.graph
        );
        // 这里可以根据推断的状态进行相应的处理
        // 例如：记录日志或更新某些状态
      }
    }

    // 步骤14：恢复子Thread（方案3：主从分离模式）
    if (checkpoint.threadState.triggeredSubworkflowContext?.childThreadIds &&
      checkpoint.threadState.triggeredSubworkflowContext.childThreadIds.length > 0) {
      for (const childThreadId of checkpoint.threadState.triggeredSubworkflowContext.childThreadIds) {
        // 查找子Thread的Checkpoint
        const childCheckpointId = await this.findChildCheckpoint(childThreadId, checkpointStateManager);
        if (childCheckpointId) {
          // 恢复子Thread
          const childContext = await this.restoreFromCheckpoint(childCheckpointId, dependencies);
          // 重建父子关系
          childContext.setParentThreadId(threadContext.getThreadId());
          // 注册到ThreadRegistry
          threadRegistry.register(childContext);
          // 在主Thread中注册子Thread
          threadContext.registerChildThread(childThreadId);
        }
      }
    }

    // 步骤12：注册到 ThreadRegistry
    threadRegistry.register(threadContext);

    return threadContext;
  }

  /**
   * 创建节点级别检查点（静态方法）
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @param metadata 检查点元数据
   * @param dependencies 依赖项
   * @returns 检查点ID
   */
  static async createNodeCheckpoint(
    threadId: string,
    nodeId: string,
    dependencies: CheckpointDependencies,
    metadata?: CheckpointMetadata
  ): Promise<string> {
    return CheckpointCoordinator.createCheckpoint(
      threadId,
      dependencies,
      {
        ...metadata,
        description: metadata?.description || `Node checkpoint for node ${nodeId}`,
        customFields: {
          ...metadata?.customFields,
          nodeId
        }
      }
    );
  }

  /**
   * 推断FORK/JOIN状态（静态私有方法）
   * 从图结构和执行序列推断并行分支的完成状态
   *
   * @param forkNodeId FORK节点ID
   * @param nodeResults 节点执行结果
   * @param graph 工作流图
   * @returns 已完成和未完成的路径集合
   */
  private static inferForkJoinState(
    forkNodeId: string,
    nodeResults: Record<string, any>,
    graph: any
  ): {
    completedPaths: Set<string>;
    pendingPaths: Set<string>;
  } {
    // 1. 获取FORK节点
    const forkNode = graph.getNode(forkNodeId);
    if (!forkNode || forkNode.type !== 'FORK') {
      return { completedPaths: new Set(), pendingPaths: new Set() };
    }

    // 2. 获取FORK节点的所有路径
    const forkPaths = (forkNode.config as any)?.forkPaths || [];

    // 3. 推断哪些路径已完成
    const completedPaths = new Set<string>();
    const pendingPaths = new Set<string>();

    for (const forkPath of forkPaths) {
      const pathId = forkPath.pathId;
      const startNodeId = forkPath.childNodeId;

      if (nodeResults[startNodeId]) {
        completedPaths.add(pathId);
      } else {
        pendingPaths.add(pathId);
      }
    }

    return { completedPaths, pendingPaths };
  }

  /**
   * 查找子Thread的Checkpoint ID（静态私有方法）
   * @param childThreadId 子Thread ID
   * @param checkpointStateManager Checkpoint状态管理器
   * @returns Checkpoint ID，如果找不到则返回undefined
   */
  private static async findChildCheckpoint(
    childThreadId: string,
    checkpointStateManager: CheckpointStateManager
  ): Promise<string | undefined> {
    // 获取该Thread的所有Checkpoint
    const checkpointIds = await checkpointStateManager.list({ threadId: childThreadId });
    if (checkpointIds.length === 0) {
      return undefined;
    }
    // 返回最新的Checkpoint（第一个）
    return checkpointIds[0];
  }

  /**
   * 验证检查点完整性和兼容性（静态私有方法）
   */
  private static validateCheckpoint(checkpoint: Checkpoint): void {
    // 验证必需字段
    if (!checkpoint.id || !checkpoint.threadId || !checkpoint.workflowId) {
      throw new Error('Invalid checkpoint: missing required fields');
    }

    if (!checkpoint.threadState) {
      throw new Error('Invalid checkpoint: missing thread state');
    }

    // 验证 threadState 结构
    const { threadState } = checkpoint;
    if (!threadState.status || !threadState.currentNodeId) {
      throw new Error('Invalid checkpoint: incomplete thread state');
    }
  }
}