/**
 * CheckpointManager - 检查点管理器
 * 负责创建和管理检查点，支持从检查点恢复 ThreadContext 状态
 * 
 * 职责：
 * - 创建检查点（快照线程状态）
 * - 恢复检查点（从快照恢复线程状态）
 * - 管理检查点存储（CRUD 操作）
 * 
 * 设计原则：
 * - 无状态设计：不维护定时器等可变状态
 * - 定时触发由上层应用层负责
 * - 支持多种触发方式（手动、事件驱动、定时等）
 */

import { ConfigurationError, NotFoundError } from '../../../types/errors';
import type { Thread } from '../../../types/thread';
import type { Checkpoint, CheckpointMetadata, ThreadStateSnapshot } from '../../../types/checkpoint';
import type { CheckpointStorage, CheckpointStorageMetadata } from '../../../types/checkpoint-storage';
import type { ThreadRegistry } from '../../services/thread-registry';
import { ThreadContext } from '../context/thread-context';
import { VariableStateManager } from './variable-state-manager';
import { ConversationManager } from './conversation-manager';
import { generateId, now } from '../../../utils';
import { type WorkflowRegistry } from '../../services/workflow-registry';
import { MemoryCheckpointStorage } from '../../storage/memory-checkpoint-storage';
import { globalMessageStorage } from '../../services/global-message-storage';
import type { LifecycleCapable } from './lifecycle-capable';
import { ExecutionContext } from '../context/execution-context';
import type { CleanupResult } from '../../../types/checkpoint-storage';
import type {
  CleanupPolicy,
  CheckpointCleanupStrategy
} from './checkpoint-cleanup-policy';
import { createCleanupStrategy } from './checkpoint-cleanup-policy';

/**
 * 检查点管理器
 */
export class CheckpointManager implements LifecycleCapable<void> {
  private storage: CheckpointStorage;
  private threadRegistry: ThreadRegistry;
  private variableStateManager: VariableStateManager;
  private workflowRegistry: WorkflowRegistry;
  private cleanupPolicy?: CleanupPolicy;
  private checkpointSizes: Map<string, number> = new Map(); // checkpointId -> size in bytes

  /**
   * 构造函数
   * @param storage 存储实现，默认使用 MemoryCheckpointStorage
   * @param threadRegistry Thread注册表
   * @param workflowRegistry Workflow注册器
   */
  constructor(
    storage?: CheckpointStorage,
    threadRegistry?: ThreadRegistry,
    workflowRegistry?: WorkflowRegistry
  ) {
    if (!threadRegistry || !workflowRegistry) {
      throw new ConfigurationError('CheckpointManager requires threadRegistry and workflowRegistry', 'registry');
    }

    this.storage = storage || new MemoryCheckpointStorage();
    this.threadRegistry = threadRegistry;
    this.workflowRegistry = workflowRegistry;
    this.variableStateManager = new VariableStateManager();
  }

  /**
   * 设置清理策略
   *
   * @param policy 清理策略配置
   */
  setCleanupPolicy(policy: CleanupPolicy): void {
    this.cleanupPolicy = policy;
  }

  /**
   * 获取清理策略
   *
   * @returns 清理策略配置
   */
  getCleanupPolicy(): CleanupPolicy | undefined {
    return this.cleanupPolicy;
  }

  /**
   * 执行清理策略
   *
   * 根据配置的清理策略自动清理过期的检查点
   *
   * @returns 清理结果
   */
  async executeCleanup(): Promise<CleanupResult> {
    if (!this.cleanupPolicy) {
      return {
        deletedCheckpointIds: [],
        deletedCount: 0,
        freedSpaceBytes: 0,
        remainingCount: 0
      };
    }

    // 获取所有检查点ID
    const checkpointIds = await this.storage.list();

    // 获取所有检查点的元数据和大小
    const checkpointInfoArray: Array<{ checkpointId: string; metadata: CheckpointStorageMetadata }> = [];
    for (const checkpointId of checkpointIds) {
      const data = await this.storage.load(checkpointId);
      if (data) {
        const checkpoint = this.deserializeCheckpoint(data);
        const metadata = this.extractStorageMetadata(checkpoint);
        checkpointInfoArray.push({ checkpointId, metadata });
        this.checkpointSizes.set(checkpointId, data.length);
      }
    }

    // 创建清理策略实例
    const strategy = createCleanupStrategy(
      this.cleanupPolicy,
      this.checkpointSizes
    );

    // 执行清理策略
    const toDeleteIds = strategy.execute(checkpointInfoArray);

    // 删除检查点
    let freedSpaceBytes = 0;
    for (const checkpointId of toDeleteIds) {
      const size = this.checkpointSizes.get(checkpointId) || 0;
      await this.storage.delete(checkpointId);
      freedSpaceBytes += size;
      this.checkpointSizes.delete(checkpointId);
    }

    return {
      deletedCheckpointIds: toDeleteIds,
      deletedCount: toDeleteIds.length,
      freedSpaceBytes,
      remainingCount: checkpointIds.length - toDeleteIds.length
    };
  }

  /**
   * 清理指定线程的所有检查点
   *
   * @param threadId 线程ID
   * @returns 删除的检查点数量
   */
  async cleanupThreadCheckpoints(threadId: string): Promise<number> {
    const checkpointIds = await this.storage.list({ threadId });

    for (const checkpointId of checkpointIds) {
      await this.storage.delete(checkpointId);
      this.checkpointSizes.delete(checkpointId);
    }

    return checkpointIds.length;
  }

  /**
   * 创建检查点
   * @param threadId 线程ID
   * @param metadata 检查点元数据
   * @returns 检查点ID
   */
  async createCheckpoint(threadId: string, metadata?: CheckpointMetadata): Promise<string> {
    // 步骤1：从 ThreadRegistry 获取 ThreadContext 对象
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`ThreadContext not found`, 'ThreadContext', threadId);
    }

    const thread = threadContext.thread;

    // 步骤2：提取 ThreadStateSnapshot
    // 使用 VariableStateManager 创建变量快照
    const variableSnapshot = this.variableStateManager.createSnapshot();

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
      triggerStates: triggerStateSnapshot.size > 0 ? triggerStateSnapshot : undefined // 保存触发器状态
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

    // 步骤5：序列化为字节数组
    const data = this.serializeCheckpoint(checkpoint);

    // 步骤6：提取存储元数据
    const storageMetadata = this.extractStorageMetadata(checkpoint);

    // 步骤7：调用 CheckpointStorage 保存
    await this.storage.save(checkpointId, data, storageMetadata);

    // 记录检查点大小（用于基于空间的清理策略）
    this.checkpointSizes.set(checkpointId, data.length);

    // 步骤8：执行清理策略（如果配置了）
    if (this.cleanupPolicy) {
      try {
        await this.executeCleanup();
      } catch (error) {
        console.error('Error executing cleanup policy:', error);
        // 清理失败不应影响检查点创建
      }
    }

    // 步骤9：返回 checkpointId
    return checkpointId;
  }

  /**
   * 从检查点恢复 ThreadContext 状态
   * @param checkpointId 检查点ID
   * @returns 恢复的 ThreadContext 对象
   */
  async restoreFromCheckpoint(checkpointId: string): Promise<ThreadContext> {
    // 步骤1：从 CheckpointStorage 加载字节数据
    const data = await this.storage.load(checkpointId);
    if (!data) {
      throw new NotFoundError(`Checkpoint not found`, 'Checkpoint', checkpointId);
    }

    // 步骤2：反序列化为 Checkpoint 对象
    const checkpoint = this.deserializeCheckpoint(data);

    // 步骤3：验证 checkpoint 完整性和兼容性
    this.validateCheckpoint(checkpoint);

    // 步骤3：从 WorkflowRegistry 获取 WorkflowDefinition
    const workflowDefinition = this.workflowRegistry.get(checkpoint.workflowId);
    if (!workflowDefinition) {
      throw new NotFoundError(`Workflow not found`, 'Workflow', checkpoint.workflowId);
    }

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
      metadata: checkpoint.metadata
    };

    // 步骤5：使用 VariableStateManager 恢复变量快照
    this.variableStateManager.restoreFromSnapshot({
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
      this.threadRegistry,
      this.workflowRegistry,
      executionContext.getEventManager(),
      executionContext.getToolService(),
      executionContext.getLlmExecutor()
    );

    // 步骤10：恢复触发器状态
    if (checkpoint.threadState.triggerStates) {
      threadContext.restoreTriggerState(checkpoint.threadState.triggerStates);
    }

    // 步骤11：注册到 ThreadRegistry
    this.threadRegistry.register(threadContext);

    return threadContext;
  }

  /**
   * 验证检查点完整性和兼容性
   */
  private validateCheckpoint(checkpoint: Checkpoint): void {
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

  /**
   * 获取检查点
   * @param checkpointId 检查点ID
   * @returns 检查点对象
   */
  async getCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
    const data = await this.storage.load(checkpointId);
    if (!data) {
      return null;
    }
    return this.deserializeCheckpoint(data);
  }

  /**
   * 列出检查点ID
   * @param options 查询选项
   * @returns 检查点ID数组
   */
  async listCheckpoints(options?: import('../../../types/checkpoint-storage').CheckpointListOptions): Promise<string[]> {
    return this.storage.list(options);
  }

  /**
   * 删除检查点
   * @param checkpointId 检查点ID
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    await this.storage.delete(checkpointId);
    this.checkpointSizes.delete(checkpointId);
  }



  /**
   * 创建节点级别检查点
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @param metadata 检查点元数据
   * @returns 检查点ID
   */
  async createNodeCheckpoint(threadId: string, nodeId: string, metadata?: CheckpointMetadata): Promise<string> {
    return this.createCheckpoint(threadId, {
      ...metadata,
      description: `Node checkpoint for node ${nodeId}`,
      customFields: {
        ...metadata?.customFields,
        nodeId
      }
    });
  }

  /**
   * 清空所有检查点
   */
  async clearAll(): Promise<void> {
    if (this.storage.clear) {
      await this.storage.clear();
    }
  }

  /**
   * 获取存储实例（用于测试）
   */
  getStorage(): CheckpointStorage {
    return this.storage;
  }

  /**
   * 序列化检查点为字节数组
   */
  private serializeCheckpoint(checkpoint: Checkpoint): Uint8Array {
    const json = JSON.stringify(checkpoint, null, 2);
    return new TextEncoder().encode(json);
  }

  /**
   * 从字节数组反序列化检查点
   */
  private deserializeCheckpoint(data: Uint8Array): Checkpoint {
    const json = new TextDecoder().decode(data);
    return JSON.parse(json) as Checkpoint;
  }

  /**
   * 从检查点提取存储元数据
   */
  private extractStorageMetadata(checkpoint: Checkpoint): CheckpointStorageMetadata {
    return {
      threadId: checkpoint.threadId,
      workflowId: checkpoint.workflowId,
      timestamp: checkpoint.timestamp,
      tags: checkpoint.metadata?.tags,
      customFields: checkpoint.metadata?.customFields
    };
  }

  /**
   * 初始化管理器
   * CheckpointManager在构造时已初始化，此方法为空实现
   */
  initialize(): void {
    // CheckpointManager在构造时已初始化，无需额外操作
  }

  /**
   * 清理资源
   * 清空所有检查点
   */
  async cleanup(): Promise<void> {
    await this.clearAll();
  }

  /**
   * 创建状态快照
   * CheckpointManager本身不维护状态，此方法为空实现
   */
  createSnapshot(): void {
    // CheckpointManager本身不维护状态，无需快照
  }

  /**
   * 从快照恢复状态
   * CheckpointManager本身不维护状态，此方法为空实现
   */
  restoreFromSnapshot(): void {
    // CheckpointManager本身不维护状态，无需恢复
  }

  /**
   * 检查是否已初始化
   * @returns 始终返回true，因为CheckpointManager在构造时已初始化
   */
  isInitialized(): boolean {
    return true;
  }
}