/**
 * CheckpointManager - 检查点管理器
 * 负责创建和管理检查点，支持从检查点恢复 ThreadContext 状态
 *
 * 使用 ExecutionContext 获取全局组件
 */

import type { Thread } from '../../../types/thread';
import type { Checkpoint, CheckpointMetadata, ThreadStateSnapshot } from '../../../types/checkpoint';
import type { CheckpointStorage, CheckpointStorageMetadata } from '../../../types/checkpoint-storage';
import { ThreadRegistry } from '../../registry/thread-registry';
import { ThreadContext } from '../context/thread-context';
import { WorkflowContext } from '../context/workflow-context';
import { VariableManager } from './variable-manager';
import { ConversationManager } from '../conversation';
import { LLMExecutor } from '../llm-executor';
import { generateId, now as getCurrentTimestamp } from '../../../utils';
import { WorkflowRegistry } from '../../registry/workflow-registry';
import { getThreadRegistry, getWorkflowRegistry } from '../context/execution-context';
import { MemoryCheckpointStorage } from '../../storage/memory-checkpoint-storage';

/**
 * 检查点管理器
 */
export class CheckpointManager {
  private storage: CheckpointStorage;
  private threadRegistry: ThreadRegistry;
  private variableManager: VariableManager;
  private workflowRegistry: WorkflowRegistry;
  private periodicTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 构造函数
   * @param storage 存储实现，默认使用 MemoryCheckpointStorage
   * @param threadRegistry Thread注册表（可选，默认使用默认上下文）
   * @param workflowRegistry Workflow注册器（可选，默认使用默认上下文）
   */
  constructor(
    storage?: CheckpointStorage,
    threadRegistry?: ThreadRegistry,
    workflowRegistry?: WorkflowRegistry
  ) {
    this.storage = storage || new MemoryCheckpointStorage();
    this.threadRegistry = threadRegistry || getThreadRegistry();
    this.workflowRegistry = workflowRegistry || getWorkflowRegistry();
    this.variableManager = new VariableManager();
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
      throw new Error(`ThreadContext not found: ${threadId}`);
    }

    const thread = threadContext.thread;

    // 步骤2：提取 ThreadStateSnapshot
    // 将 nodeResults 数组转换为 Record 格式
    const nodeResultsRecord: Record<string, any> = {};
    for (const result of thread.nodeResults) {
      nodeResultsRecord[result.nodeId] = result;
    }

    // 获取对话历史
    const conversationManager = threadContext.getConversationManager();
    const conversationHistory = conversationManager.getMessages();

    const threadState: ThreadStateSnapshot = {
      status: thread.status,
      currentNodeId: thread.currentNodeId,
      variables: thread.variables,
      input: thread.input,
      output: thread.output,
      nodeResults: nodeResultsRecord,
      executionHistory: [], // TODO: 从 Thread 中提取执行历史
      errors: thread.errors,
      conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined // 保存对话历史
    };

    // 步骤3：生成唯一 checkpointId 和 timestamp
    const checkpointId = generateId();
    const timestamp = getCurrentTimestamp();

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

    // 步骤8：返回 checkpointId
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
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    // 步骤2：反序列化为 Checkpoint 对象
    const checkpoint = this.deserializeCheckpoint(data);

    // 步骤3：验证 checkpoint 完整性和兼容性
    this.validateCheckpoint(checkpoint);

    // 步骤3：从 WorkflowRegistry 获取 WorkflowDefinition
    const workflowDefinition = this.workflowRegistry.get(checkpoint.workflowId);
    if (!workflowDefinition) {
      throw new Error(`Workflow with ID '${checkpoint.workflowId}' not found in registry`);
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
      variables: checkpoint.threadState.variables,
      variableValues: this.extractVariableValues(checkpoint.threadState.variables),
      input: checkpoint.threadState.input,
      output: checkpoint.threadState.output,
      nodeResults: nodeResultsArray,
      startTime: checkpoint.timestamp,
      errors: checkpoint.threadState.errors,
      metadata: checkpoint.metadata
    };

    // 步骤5：创建 ConversationManager
    const conversationManager = new ConversationManager();

    // 步骤6：恢复对话历史
    if (checkpoint.threadState.conversationHistory) {
      for (const message of checkpoint.threadState.conversationHistory) {
        conversationManager.addMessage(message);
      }
    }

    // 步骤7：创建 WorkflowContext
    const workflowContext = new WorkflowContext(workflowDefinition);

    // 步骤8：创建 ThreadContext
    const threadContext = new ThreadContext(
      thread as Thread,
      workflowContext,
      conversationManager
    );

    // 步骤9：注册到 ThreadRegistry
    this.threadRegistry.register(threadContext);

    return threadContext;
  }

  /**
   * 从变量数组提取变量值映射
   */
  private extractVariableValues(variables: any[]): Record<string, any> {
    const variableValues: Record<string, any> = {};
    for (const variable of variables) {
      variableValues[variable.name] = variable.value;
    }
    return variableValues;
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
  }

  /**
   * 创建定期检查点
   * @param threadId 线程ID
   * @param interval 间隔时间（毫秒）
   * @param metadata 检查点元数据
   * @returns 定时器ID
   */
  createPeriodicCheckpoint(threadId: string, interval: number, metadata?: CheckpointMetadata): string {
    const timerId = generateId();

    const timer = setInterval(async () => {
      try {
        await this.createCheckpoint(threadId, {
          ...metadata,
          description: `Periodic checkpoint at ${new Date().toISOString()}`
        });
      } catch (error) {
        console.error(`Failed to create periodic checkpoint for thread ${threadId}:`, error);
      }
    }, interval);

    this.periodicTimers.set(timerId, timer);

    return timerId;
  }

  /**
   * 取消定期检查点
   * @param timerId 定时器ID
   */
  cancelPeriodicCheckpoint(timerId: string): void {
    const timer = this.periodicTimers.get(timerId);
    if (timer) {
      clearInterval(timer);
      this.periodicTimers.delete(timerId);
    }
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
}