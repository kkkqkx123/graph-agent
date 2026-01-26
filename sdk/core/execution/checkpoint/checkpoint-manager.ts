/**
 * CheckpointManager - 检查点管理器
 * 负责创建和管理检查点，支持从检查点恢复 ThreadContext 状态
 */

import type { Thread } from '../../../types/thread';
import type { Checkpoint, CheckpointMetadata, ThreadStateSnapshot } from '../../../types/checkpoint';
import type { CheckpointStorage, CheckpointFilter } from './storage';
import { MemoryStorage } from './storage';
import { ThreadRegistry } from '../thread-registry';
import { ThreadBuilder } from '../thread-builder';
import { ThreadContext } from '../thread-context';
import { VariableManager } from '../variable-manager';
import { IDUtils } from '../../../types/common';

/**
 * 检查点管理器
 */
export class CheckpointManager {
  private storage: CheckpointStorage;
  private threadRegistry: ThreadRegistry;
  private threadBuilder: ThreadBuilder;
  private variableManager: VariableManager;
  private periodicTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 构造函数
   * @param storage 存储实现，默认使用 MemoryStorage
   * @param threadRegistry Thread注册表
   * @param threadBuilder Thread构建器
   */
  constructor(storage?: CheckpointStorage, threadRegistry?: ThreadRegistry, threadBuilder?: ThreadBuilder) {
    this.storage = storage || new MemoryStorage();
    this.threadRegistry = threadRegistry || new ThreadRegistry();
    this.threadBuilder = threadBuilder || new ThreadBuilder();
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
    const checkpointId = IDUtils.generate();
    const timestamp = Date.now();

    // 步骤4：创建 Checkpoint 对象
    const checkpoint: Checkpoint = {
      id: checkpointId,
      threadId: threadContext.getThreadId(),
      workflowId: threadContext.getWorkflowId(),
      timestamp,
      threadState,
      metadata
    };

    // 步骤5：调用 CheckpointStorage 保存
    await this.storage.save(checkpoint);

    // 步骤6：返回 checkpointId
    return checkpointId;
  }

  /**
   * 从检查点恢复 ThreadContext 状态
   * @param checkpointId 检查点ID
   * @returns 恢复的 ThreadContext 对象
   */
  async restoreFromCheckpoint(checkpointId: string): Promise<ThreadContext> {
    // 步骤1：从 CheckpointStorage 加载 Checkpoint
    const checkpoint = await this.storage.load(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    // 步骤2：验证 checkpoint 完整性和兼容性
    this.validateCheckpoint(checkpoint);

    // 步骤3：恢复 Thread 状态
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

    // 步骤4：初始化变量数据结构
    this.variableManager.initializeVariables(thread as Thread);

    // 步骤5：附加变量管理方法
    this.variableManager.attachVariableMethods(thread as Thread);

    // 步骤6：创建 ThreadContext
    // 注意：这里需要重新创建完整的 ThreadContext
    // 由于 ThreadBuilder 需要 WorkflowDefinition，我们暂时使用简化的方式
    // 实际实现中需要从 Checkpoint 中保存 WorkflowDefinition 或从其他地方获取
    
    // 创建临时的 WorkflowContext（简化处理）
    // TODO: 需要从 Checkpoint 中保存 WorkflowDefinition 或从 WorkflowRegistry 获取
    // 这里暂时跳过，因为需要完整的 WorkflowDefinition
    throw new Error('ThreadContext restore from checkpoint is not fully implemented yet. Need to save and restore WorkflowDefinition.');
    
    // 以下是完整的恢复逻辑（需要 WorkflowDefinition）：
    /*
    // 获取 WorkflowDefinition
    const workflowDefinition = await this.getWorkflowDefinition(checkpoint.workflowId);
    
    // 使用 ThreadBuilder 创建 ThreadContext
    const threadContext = await this.threadBuilder.build(workflowDefinition, {
      input: checkpoint.threadState.input
    });
    
    // 恢复 Thread 状态
    Object.assign(threadContext.thread, thread);
    
    // 恢复对话历史
    if (checkpoint.threadState.conversationHistory) {
      const conversationManager = threadContext.getConversationManager();
      conversationManager.clearMessages();
      for (const message of checkpoint.threadState.conversationHistory) {
        conversationManager.addMessage(message);
      }
    }
    
    // 注册到 ThreadRegistry
    this.threadRegistry.register(threadContext);
    
    return threadContext;
    */
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
    return this.storage.load(checkpointId);
  }

  /**
   * 列出检查点
   * @param filter 过滤条件
   * @returns 检查点数组
   */
  async listCheckpoints(filter?: CheckpointFilter): Promise<Checkpoint[]> {
    return this.storage.list(filter);
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
    const timerId = IDUtils.generate();

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
    await this.storage.clear();
  }

  /**
   * 获取存储实例（用于测试）
   */
  getStorage(): CheckpointStorage {
    return this.storage;
  }

  /**
   * 获取 ThreadRegistry 实例（用于测试）
   */
  getThreadRegistry(): ThreadRegistry {
    return this.threadRegistry;
  }

  /**
   * 获取 ThreadBuilder 实例（用于测试）
   */
  getThreadBuilder(): ThreadBuilder {
    return this.threadBuilder;
  }
}