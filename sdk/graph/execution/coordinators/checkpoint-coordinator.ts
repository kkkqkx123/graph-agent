/**
 * 检查点协调器
 * 无状态服务，协调完整的检查点流程
 */

import { ThreadContextNotFoundError, CheckpointNotFoundError, WorkflowNotFoundError } from '@modular-agent/types';
import { CheckpointType } from '@modular-agent/types';
import { DEFAULT_DELTA_STORAGE_CONFIG } from '@modular-agent/types';
import type { Thread } from '@modular-agent/types';
import type { Checkpoint, CheckpointMetadata, ThreadStateSnapshot, MessageMarkMap, DeltaStorageConfig, TCheckpointType } from '@modular-agent/types';
import type { ThreadRegistry } from '../../services/thread-registry.js';
import type { WorkflowRegistry } from '../../services/workflow-registry.js';
import type { GraphRegistry } from '../../services/graph-registry.js';
import { CheckpointStateManager } from '../managers/checkpoint-state-manager.js';
import { ConversationManager } from '../../../core/managers/conversation-manager.js';
import { VariableStateManager } from '../managers/variable-state-manager.js';
import { ThreadEntity } from '../../entities/thread-entity.js';
import { CheckpointDiffCalculator } from '../utils/checkpoint-diff-calculator.js';
import { DeltaCheckpointRestorer } from '../utils/checkpoint-delta-restorer.js';
import { generateId } from '../../../utils/index.js';
import { now } from '@modular-agent/common-utils';
import { mergeMetadata } from '../../../utils/metadata-utils.js';

/**
 * 检查点依赖项
 */
export interface CheckpointDependencies {
  threadRegistry: ThreadRegistry;
  checkpointStateManager: CheckpointStateManager;
  workflowRegistry: WorkflowRegistry;
  graphRegistry: GraphRegistry;
  /** 增量存储配置（可选） */
  deltaConfig?: DeltaStorageConfig;
}

/**
 * 检查点协调器（完全无状态）
 */
export class CheckpointCoordinator {
  private static diffCalculator = new CheckpointDiffCalculator();

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
    const { threadRegistry, checkpointStateManager, workflowRegistry, deltaConfig } = dependencies;
    const config = { ...DEFAULT_DELTA_STORAGE_CONFIG, ...deltaConfig };

    // 步骤1：从 ThreadRegistry 获取 ThreadEntity 对象
    const threadEntity = threadRegistry.get(threadId);
    if (!threadEntity) {
      throw new ThreadContextNotFoundError(`ThreadEntity not found`, threadId);
    }

    const thread = threadEntity.thread;

    // 步骤2：提取 ThreadStateSnapshot
    const currentState = CheckpointCoordinator.extractThreadState(threadEntity, thread);

    // 步骤3：获取上一个检查点
    const previousCheckpointIds = await checkpointStateManager.list({ parentId: threadId });
    const checkpointCount = previousCheckpointIds.length;

    // 步骤4：决定检查点类型
    const checkpointType = CheckpointCoordinator.determineCheckpointType(
      checkpointCount,
      config
    );

    // 步骤5：生成唯一 checkpointId 和 timestamp
    const checkpointId = generateId();
    const timestamp = now();

    // 步骤6：创建检查点
    let checkpoint: Checkpoint;

    if (checkpointType === CheckpointType['FULL']) {
      // 创建完整检查点
      checkpoint = {
        id: checkpointId,
        threadId: threadEntity.getThreadId(),
        workflowId: threadEntity.getWorkflowId(),
        timestamp,
        type: CheckpointType['FULL']!,
        threadState: currentState,
        metadata
      };
    } else {
      // 创建增量检查点
      const previousCheckpointId = previousCheckpointIds[0]!;
      const previousCheckpoint = await checkpointStateManager.get(previousCheckpointId);

      if (!previousCheckpoint) {
        // 如果无法获取上一个检查点，降级为完整检查点
        checkpoint = {
          id: checkpointId,
          threadId: threadEntity.getThreadId(),
          workflowId: threadEntity.getWorkflowId(),
          timestamp,
          type: CheckpointType['FULL']!,
          threadState: currentState,
          metadata
        };
      } else {
        // 获取上一个检查点的完整状态
        let previousState: ThreadStateSnapshot;
        if (previousCheckpoint.type === CheckpointType['DELTA']) {
          // 如果上一个检查点是增量检查点，需要恢复完整状态
          const restorer = new DeltaCheckpointRestorer({ checkpointStateManager });
          previousState = await restorer.restore(previousCheckpointId);
        } else {
          previousState = previousCheckpoint.threadState!;
        }

        // 计算差异
        const delta = CheckpointCoordinator.diffCalculator.calculateDelta(
          previousState,
          currentState
        );

        // 找到基线检查点ID
        let baseCheckpointId = previousCheckpoint.baseCheckpointId;
        if (!baseCheckpointId && previousCheckpoint.type === CheckpointType['FULL']) {
          baseCheckpointId = previousCheckpoint.id;
        }

        checkpoint = {
          id: checkpointId,
          threadId: threadEntity.getThreadId(),
          workflowId: threadEntity.getWorkflowId(),
          timestamp,
          type: CheckpointType['DELTA']!,
          baseCheckpointId,
          previousCheckpointId,
          delta,
          metadata
        };
      }
    }

    // 步骤7：调用 CheckpointStateManager 创建检查点
    return await checkpointStateManager.create(checkpoint);
  }

  /**
   * 提取线程状态快照
   * @param threadEntity 线程实体
   * @param thread 线程对象
   * @returns 线程状态快照
   */
  private static extractThreadState(
    threadEntity: ThreadEntity,
    thread: Thread
  ): ThreadStateSnapshot {
    // 使用 VariableStateManager 创建变量快照
    const variableStateManager = new VariableStateManager();
    const variableSnapshot = variableStateManager.createSnapshot();

    // 将 nodeResults 数组转换为 Record 格式
    const nodeResultsRecord: Record<string, any> = {};
    for (const result of thread.nodeResults) {
      nodeResultsRecord[result.nodeId] = result;
    }

    // 获取对话管理器
    const conversationManager = threadEntity.getConversationManager();

    // 保存完整消息历史和索引状态到检查点
    const conversationState = conversationManager ? {
      messages: conversationManager.getAllMessages(),
      markMap: conversationManager.getMarkMap(),
      tokenUsage: conversationManager.getTokenUsage(),
      currentRequestUsage: conversationManager.getCurrentRequestUsage()
    } : {
      messages: [],
      markMap: { currentBatch: 0, batchBoundaries: [0], originalIndices: [], boundaryToBatch: [] },
      tokenUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
      currentRequestUsage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 }
    };

    // 获取触发器状态快照
    const triggerStateSnapshot = threadEntity.getTriggerStateSnapshot();

    return {
      status: thread.status,
      currentNodeId: thread.currentNodeId,
      variables: variableSnapshot.variables,
      variableScopes: variableSnapshot.variableScopes,
      input: thread.input,
      output: thread.output,
      nodeResults: nodeResultsRecord,
      errors: thread.errors,
      conversationState,
      triggerStates: triggerStateSnapshot.size > 0 ? triggerStateSnapshot : undefined,
      forkJoinContext: thread.forkJoinContext,
      triggeredSubworkflowContext: thread.triggeredSubworkflowContext
    };
  }

  /**
   * 决定检查点类型
   * @param checkpointCount 当前检查点数量
   * @param config 增量存储配置
   * @returns 检查点类型
   */
  private static determineCheckpointType(
    checkpointCount: number,
    config: DeltaStorageConfig
  ): TCheckpointType {
    // 如果未启用增量存储，始终创建完整检查点
    if (!config.enabled) {
      return CheckpointType['FULL']!;
    }

    // 第一个检查点必须是完整检查点
    if (checkpointCount === 0) {
      return CheckpointType['FULL']!;
    }

    // 每隔 baselineInterval 个检查点创建一个完整检查点
    if (checkpointCount % config.baselineInterval === 0) {
      return CheckpointType['FULL']!;
    }

    // 其他情况创建增量检查点
    return CheckpointType['DELTA']!;
  }

  /**
   * 从检查点恢复 ThreadEntity 状态（静态方法）
   * @param checkpointId 检查点ID
   * @param dependencies 依赖项
   * @returns 恢复的 ThreadEntity 对象
   */
  static async restoreFromCheckpoint(
    checkpointId: string,
    dependencies: CheckpointDependencies
  ): Promise<ThreadEntity> {
    const { threadRegistry, checkpointStateManager, workflowRegistry, graphRegistry } = dependencies;

    // 步骤1：从 CheckpointStateManager 加载检查点
    const checkpoint = await checkpointStateManager.get(checkpointId);
    if (!checkpoint) {
      throw new CheckpointNotFoundError(`Checkpoint not found`, checkpointId);
    }

    // 步骤2：验证 checkpoint 完整性和兼容性
    CheckpointCoordinator.validateCheckpoint(checkpoint);

    // 步骤3：获取完整的线程状态（处理增量检查点）
    let threadState: ThreadStateSnapshot;
    if (checkpoint.type === CheckpointType['DELTA']) {
      // 如果是增量检查点，需要恢复完整状态
      const restorer = new DeltaCheckpointRestorer({ checkpointStateManager });
      threadState = await restorer.restore(checkpointId);
    } else {
      // 完整检查点，直接使用
      threadState = checkpoint.threadState!;
    }

    // 步骤4：从 GraphRegistry 获取 PreprocessedGraph
    // PreprocessedGraph 包含完整的预处理后的图结构
    const processedWorkflow = graphRegistry.get(checkpoint.workflowId);
    if (!processedWorkflow) {
      throw new WorkflowNotFoundError(`Processed workflow not found`, checkpoint.workflowId);
    }

    // PreprocessedGraph 本身就是 Graph，包含完整的图结构
    // 设计目的：恢复后的 Thread 需要完整的图结构(graph中存储的是合并后的工作流，完成了命名冲突的处理)
    // 来继续执行工作流（例如：查找节点、遍历边、执行图算法等）
    const graph = processedWorkflow;

    // 步骤5：恢复 Thread 状态
    // 将 nodeResults Record 转换回数组格式
    const nodeResultsArray = Object.values(threadState.nodeResults || {});

    const thread: Partial<Thread> = {
      id: checkpoint.threadId,
      workflowId: checkpoint.workflowId,
      workflowVersion: '1.0.0', // TODO: 从 checkpoint 元数据中获取版本
      status: threadState.status,
      currentNodeId: threadState.currentNodeId,
      input: threadState.input,
      output: threadState.output,
      nodeResults: nodeResultsArray,
      startTime: checkpoint.timestamp,
      errors: threadState.errors,
      forkJoinContext: threadState.forkJoinContext,
      triggeredSubworkflowContext: threadState.triggeredSubworkflowContext,
      variableScopes: threadState.variableScopes,
      graph
    };

    // 步骤6：使用 VariableStateManager 恢复变量快照
    const variableStateManager = new VariableStateManager();
    variableStateManager.restoreFromSnapshot({
      variables: threadState.variables,
      variableScopes: threadState.variableScopes
    });

    // 步骤7：创建 ConversationManager
    const conversationManager = new ConversationManager();

    // 步骤8：从检查点快照恢复完整消息历史
    if (threadState.conversationState && threadState.conversationState.messages) {
      conversationManager.addMessages(...threadState.conversationState.messages);
    }

    // 步骤9：恢复索引状态
    if (threadState.conversationState) {
      if (threadState.conversationState.markMap) {
        conversationManager.setMarkMap(threadState.conversationState.markMap as MessageMarkMap);
      }

      // 恢复Token统计
      conversationManager.setTokenUsageState(
        threadState.conversationState.tokenUsage,
        threadState.conversationState.currentRequestUsage
      );
    }

    // 步骤10：创建 ThreadEntity
    const { ExecutionState } = await import('../../entities/execution-state.js');
    const executionState = new ExecutionState();
    const threadEntity = new ThreadEntity(thread as Thread, executionState, conversationManager);

    // 步骤12：恢复触发器状态
    if (threadState.triggerStates) {
      threadEntity.restoreTriggerState(threadState.triggerStates);
    }

    // 步骤13：恢复FORK/JOIN上下文（如果存在）
    if (threadState.forkJoinContext) {
      threadEntity.setForkId(threadState.forkJoinContext.forkId);
      threadEntity.setForkPathId(threadState.forkJoinContext.forkPathId);
    }

    // 步骤14：恢复Triggered子工作流上下文（如果存在）
    if (threadState.triggeredSubworkflowContext) {
      threadEntity.setParentThreadId(threadState.triggeredSubworkflowContext.parentThreadId);
      threadEntity.setTriggeredSubworkflowId(threadState.triggeredSubworkflowContext.triggeredSubworkflowId);
    }

    // 步骤15：推断FORK/JOIN状态（如果需要）
    // 注意：FORK/JOIN状态不需要保存到Checkpoint中，可以在恢复时从图结构和执行序列推断
    // 如果当前节点是JOIN节点，可以推断哪些分支已完成
    if (thread.graph) {
      const currentNode = thread.graph.getNode(threadState.currentNodeId);
      if (currentNode && currentNode.type === 'JOIN') {
        const forkJoinState = this.inferForkJoinState(
          threadState.currentNodeId,
          threadState.nodeResults,
          thread.graph
        );
        // 这里可以根据推断的状态进行相应的处理
        // 例如：记录日志或更新某些状态
      }
    }

    // 步骤16：恢复子Thread（方案3：主从分离模式）
    if (threadState.triggeredSubworkflowContext?.childThreadIds &&
      threadState.triggeredSubworkflowContext.childThreadIds.length > 0) {
      for (const childThreadId of threadState.triggeredSubworkflowContext.childThreadIds) {
        // 查找子Thread的Checkpoint
        const childCheckpointId = await this.findChildCheckpoint(childThreadId, checkpointStateManager);
        if (childCheckpointId) {
          // 恢复子Thread
          const childEntity = await this.restoreFromCheckpoint(childCheckpointId, dependencies);
          // 重建父子关系
          childEntity.setParentThreadId(threadEntity.getThreadId());
          // 注册到ThreadRegistry
          threadRegistry.register(childEntity);
          // 在主Thread中注册子Thread
          threadEntity.registerChildThread(childThreadId);
        }
      }
    }

    // 步骤17：注册到 ThreadRegistry
    threadRegistry.register(threadEntity);

    return threadEntity;
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
      mergeMetadata(
        metadata || {},
        {
          description: metadata?.description || `Node checkpoint for node ${nodeId}`,
          customFields: mergeMetadata(metadata?.customFields || {}, { nodeId })
        }
      )
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
    const checkpointIds = await checkpointStateManager.list({ parentId: childThreadId });
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

    // 根据检查点类型验证
    if (checkpoint.type === CheckpointType['DELTA']) {
      // 增量检查点需要验证 delta 字段
      if (!checkpoint.delta && !checkpoint.previousCheckpointId) {
        throw new Error('Invalid delta checkpoint: missing delta data and previous checkpoint reference');
      }
    } else {
      // 完整检查点需要验证 threadState 字段
      if (!checkpoint.threadState) {
        throw new Error('Invalid full checkpoint: missing thread state');
      }

      // 验证 threadState 结构
      const { threadState } = checkpoint;
      if (!threadState.status || !threadState.currentNodeId) {
        throw new Error('Invalid checkpoint: incomplete thread state');
      }
    }
  }
}
