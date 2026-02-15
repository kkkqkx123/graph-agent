/**
 * 消息数组管理器
 * 实现消息数组管理的核心逻辑，支持批次管理和回滚功能
 */

import type {
  Message,
  MessageArrayState,
  MessageOperationConfig,
  MessageOperationResult,
  MessageArrayStats,
  BatchSnapshot,
  AppendMessageOperation,
  InsertMessageOperation,
  ReplaceMessageOperation,
  TruncateMessageOperation,
  ClearMessageOperation,
  FilterMessageOperation,
  RollbackMessageOperation,
  MessageMarkMap
} from '@modular-agent/types';
import { MessageRole } from '@modular-agent/types';

/**
 * 消息数组管理器类
 * 支持多种消息操作和批次管理
 */
export class MessageArrayManager {
  private state: MessageArrayState;
  
  constructor(initialMessages: Message[] = []) {
    this.state = {
      messages: initialMessages,
      batchSnapshots: [],
      currentBatchIndex: 0,
      totalMessageCount: initialMessages.length
    };
  }
  
  /**
   * 执行消息操作
   * @param operation 操作配置
   * @returns 操作结果
   */
  execute(operation: MessageOperationConfig): MessageOperationResult {
    switch (operation.operation) {
      case 'APPEND':
        return this.executeAppend(operation as AppendMessageOperation);
      case 'INSERT':
        return this.executeInsert(operation as InsertMessageOperation);
      case 'REPLACE':
        return this.executeReplace(operation as ReplaceMessageOperation);
      case 'TRUNCATE':
        return this.executeTruncate(operation as TruncateMessageOperation);
      case 'CLEAR':
        return this.executeClear(operation as ClearMessageOperation);
      case 'FILTER':
        return this.executeFilter(operation as FilterMessageOperation);
      case 'ROLLBACK':
        return this.executeRollback(operation as RollbackMessageOperation);
      default:
        throw new Error(`Unsupported operation type: ${(operation as any).operation}`);
    }
  }
  
  /**
   * 获取当前消息数组状态
   * @returns 消息数组状态
   */
  getState(): MessageArrayState {
    return { ...this.state };
  }
  
  /**
   * 获取当前批次的消息
   * @returns 当前批次的消息数组
   */
  getCurrentMessages(): Message[] {
    return [...this.state.messages];
  }
  
  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats(): MessageArrayStats {
    return {
      totalMessages: this.state.messages.length,
      currentBatchMessages: this.state.messages.length,
      totalBatches: this.state.currentBatchIndex + 1,
      currentBatchIndex: this.state.currentBatchIndex
    };
  }
  
  /**
   * 回退到指定批次
   * @param batchIndex 批次索引
   * @returns 操作结果
   */
  rollback(batchIndex: number): MessageOperationResult {
    const operation: RollbackMessageOperation = {
      operation: 'ROLLBACK',
      targetBatchIndex: batchIndex
    };
    return this.executeRollback(operation);
  }
  
  /**
   * 获取批次快照
   * @param batchIndex 批次索引
   * @returns 批次快照
   */
  getBatchSnapshot(batchIndex: number): BatchSnapshot | null {
    return this.state.batchSnapshots[batchIndex] || null;
  }
  
  /**
   * 执行 APPEND 操作（低开销，不创建新批次）
   */
  private executeAppend(operation: AppendMessageOperation): MessageOperationResult {
    // 直接追加消息到当前批次
    const newMessages = [...this.state.messages, ...operation.messages];
    
    // 不创建新批次，不创建快照
    const newState: MessageArrayState = {
      messages: newMessages,
      batchSnapshots: this.state.batchSnapshots,
      currentBatchIndex: this.state.currentBatchIndex,
      totalMessageCount: newMessages.length
    };
    
    this.state = newState;
    
    return {
      messages: newMessages,
      markMap: this.createMarkMap(newMessages),
      affectedBatchIndex: this.state.currentBatchIndex,
      stats: this.calculateStats(newState)
    };
  }
  
  /**
   * 执行 INSERT 操作（高开销，创建新批次）
   */
  private executeInsert(operation: InsertMessageOperation): MessageOperationResult {
    // 验证插入位置
    if (operation.position < 0 || operation.position > this.state.messages.length) {
      throw new Error(`Invalid insert position: ${operation.position}. Must be between 0 and ${this.state.messages.length}`);
    }
    
    // 创建当前批次的快照（深拷贝）
    const snapshot: BatchSnapshot = {
      batchIndex: this.state.currentBatchIndex,
      timestamp: Date.now(),
      messages: JSON.parse(JSON.stringify(this.state.messages)), // 深拷贝
      messageCount: this.state.messages.length,
      description: `Before INSERT at position ${operation.position}`
    };
    
    // 执行插入操作
    const newMessages = [...this.state.messages];
    newMessages.splice(operation.position, 0, ...operation.messages);
    
    // 创建新批次
    const newBatchIndex = this.state.currentBatchIndex + 1;
    const newState: MessageArrayState = {
      messages: newMessages,
      batchSnapshots: [...this.state.batchSnapshots, snapshot],
      currentBatchIndex: newBatchIndex,
      totalMessageCount: newMessages.length
    };
    
    this.state = newState;
    
    return {
      messages: newMessages,
      markMap: this.createMarkMap(newMessages),
      affectedBatchIndex: newBatchIndex,
      stats: this.calculateStats(newState)
    };
  }
  
  /**
   * 执行 REPLACE 操作（高开销，创建新批次）
   */
  private executeReplace(operation: ReplaceMessageOperation): MessageOperationResult {
    // 验证替换索引
    if (operation.index < 0 || operation.index >= this.state.messages.length) {
      throw new Error(`Invalid replace index: ${operation.index}. Must be between 0 and ${this.state.messages.length - 1}`);
    }
    
    // 创建当前批次的快照（深拷贝）
    const snapshot: BatchSnapshot = {
      batchIndex: this.state.currentBatchIndex,
      timestamp: Date.now(),
      messages: JSON.parse(JSON.stringify(this.state.messages)), // 深拷贝
      messageCount: this.state.messages.length,
      description: `Before REPLACE at index ${operation.index}`
    };
    
    // 执行替换操作
    const newMessages = [...this.state.messages];
    newMessages[operation.index] = operation.message;
    
    // 创建新批次
    const newBatchIndex = this.state.currentBatchIndex + 1;
    const newState: MessageArrayState = {
      messages: newMessages,
      batchSnapshots: [...this.state.batchSnapshots, snapshot],
      currentBatchIndex: newBatchIndex,
      totalMessageCount: newMessages.length
    };
    
    this.state = newState;
    
    return {
      messages: newMessages,
      markMap: this.createMarkMap(newMessages),
      affectedBatchIndex: newBatchIndex,
      stats: this.calculateStats(newState)
    };
  }
  
  /**
   * 执行 TRUNCATE 操作（高开销，创建新批次）
   */
  private executeTruncate(operation: TruncateMessageOperation): MessageOperationResult {
    // 创建当前批次的快照（深拷贝）
    const snapshot: BatchSnapshot = {
      batchIndex: this.state.currentBatchIndex,
      timestamp: Date.now(),
      messages: JSON.parse(JSON.stringify(this.state.messages)), // 深拷贝
      messageCount: this.state.messages.length,
      description: 'Before TRUNCATE'
    };
    
    // 执行截断操作
    let newMessages = [...this.state.messages];
    
    // 先按角色过滤（如果指定了 role）
    if (operation.role) {
      newMessages = newMessages.filter(msg => msg.role === operation.role);
    }
    
    // 应用截断策略
    const strategy = operation.strategy;
    switch (strategy.type) {
      case 'KEEP_FIRST':
        newMessages = newMessages.slice(0, strategy.count);
        break;
      case 'KEEP_LAST':
        newMessages = newMessages.slice(-strategy.count);
        break;
      case 'REMOVE_FIRST':
        newMessages = newMessages.slice(strategy.count);
        break;
      case 'REMOVE_LAST':
        newMessages = newMessages.slice(0, -strategy.count);
        break;
      case 'RANGE':
        newMessages = newMessages.slice(strategy.start, strategy.end);
        break;
      default:
        throw new Error(`Unknown strategy type: ${(strategy as any).type}`);
    }
    
    // 创建新批次
    const newBatchIndex = this.state.currentBatchIndex + 1;
    const newState: MessageArrayState = {
      messages: newMessages,
      batchSnapshots: [...this.state.batchSnapshots, snapshot],
      currentBatchIndex: newBatchIndex,
      totalMessageCount: newMessages.length
    };
    
    this.state = newState;
    
    return {
      messages: newMessages,
      markMap: this.createMarkMap(newMessages),
      affectedBatchIndex: newBatchIndex,
      stats: this.calculateStats(newState)
    };
  }
  
  /**
   * 执行 CLEAR 操作（低开销，创建新批次，快照为空）
   */
  private executeClear(operation: ClearMessageOperation): MessageOperationResult {
    // 创建空快照（无额外拷贝开销）
    const snapshot: BatchSnapshot = {
      batchIndex: this.state.currentBatchIndex,
      timestamp: Date.now(),
      messages: [], // 空数组，无拷贝开销
      messageCount: 0,
      description: 'Before CLEAR'
    };
    
    // 执行清空操作（完全清空，如需保留特定消息请使用FILTER操作）
    const newMessages: Message[] = [];
    
    // 创建新批次
    const newBatchIndex = this.state.currentBatchIndex + 1;
    const newState: MessageArrayState = {
      messages: newMessages,
      batchSnapshots: [...this.state.batchSnapshots, snapshot],
      currentBatchIndex: newBatchIndex,
      totalMessageCount: newMessages.length
    };
    
    this.state = newState;
    
    return {
      messages: newMessages,
      markMap: this.createMarkMap(newMessages),
      affectedBatchIndex: newBatchIndex,
      stats: this.calculateStats(newState)
    };
  }
  
  /**
   * 执行 FILTER 操作（高开销，创建新批次）
   */
  private executeFilter(operation: FilterMessageOperation): MessageOperationResult {
    // 创建当前批次的快照（深拷贝）
    const snapshot: BatchSnapshot = {
      batchIndex: this.state.currentBatchIndex,
      timestamp: Date.now(),
      messages: JSON.parse(JSON.stringify(this.state.messages)), // 深拷贝
      messageCount: this.state.messages.length,
      description: 'Before FILTER'
    };
    
    // 执行过滤操作
    let newMessages = [...this.state.messages];
    
    // 按角色过滤
    if (operation.roles && operation.roles.length > 0) {
      newMessages = newMessages.filter(msg => operation.roles!.includes(msg.role));
    }
    
    // 按内容关键词过滤（包含）
    if (operation.contentContains && operation.contentContains.length > 0) {
      newMessages = newMessages.filter(msg => {
        const content = this.extractTextContent(msg.content);
        return operation.contentContains!.some((keyword: string) => content.includes(keyword));
      });
    }
    
    // 按内容关键词排除（不包含）
    if (operation.contentExcludes && operation.contentExcludes.length > 0) {
      newMessages = newMessages.filter(msg => {
        const content = this.extractTextContent(msg.content);
        return !operation.contentExcludes!.some((keyword: string) => content.includes(keyword));
      });
    }
    
    // 创建新批次
    const newBatchIndex = this.state.currentBatchIndex + 1;
    const newState: MessageArrayState = {
      messages: newMessages,
      batchSnapshots: [...this.state.batchSnapshots, snapshot],
      currentBatchIndex: newBatchIndex,
      totalMessageCount: newMessages.length
    };
    
    this.state = newState;
    
    return {
      messages: newMessages,
      markMap: this.createMarkMap(newMessages),
      affectedBatchIndex: newBatchIndex,
      stats: this.calculateStats(newState)
    };
  }
  
  /**
   * 执行 ROLLBACK 操作（不创建新批次）
   */
  private executeRollback(operation: RollbackMessageOperation): MessageOperationResult {
    // 验证批次索引
    if (operation.targetBatchIndex < 0 || operation.targetBatchIndex > this.state.currentBatchIndex) {
      throw new Error(`Invalid batch index: ${operation.targetBatchIndex}. Must be between 0 and ${this.state.currentBatchIndex}`);
    }
    
    // 获取目标快照
    const targetSnapshot = this.state.batchSnapshots[operation.targetBatchIndex];
    
    if (!targetSnapshot) {
      // 回退到批次0（初始状态）
      const newState: MessageArrayState = {
        messages: [],
        batchSnapshots: [],
        currentBatchIndex: 0,
        totalMessageCount: 0
      };
      
      this.state = newState;
      
      return {
        messages: [],
        markMap: this.createMarkMap([]),
        affectedBatchIndex: 0,
        stats: this.calculateStats(newState)
      };
    }
    
    // 恢复到目标批次状态
    const newState: MessageArrayState = {
      messages: JSON.parse(JSON.stringify(targetSnapshot.messages)), // 深拷贝恢复
      batchSnapshots: this.state.batchSnapshots.slice(0, operation.targetBatchIndex),
      currentBatchIndex: operation.targetBatchIndex,
      totalMessageCount: targetSnapshot.messageCount
    };
    
    this.state = newState;
    
    return {
      messages: newState.messages,
      markMap: this.createMarkMap(newState.messages),
      affectedBatchIndex: operation.targetBatchIndex,
      stats: this.calculateStats(newState)
    };
  }
  
  /**
   * 计算统计信息
   */
  private calculateStats(state: MessageArrayState): {
    originalMessageCount: number;
    visibleMessageCount: number;
    compressedMessageCount: number;
  } {
    return {
      originalMessageCount: state.totalMessageCount,
      visibleMessageCount: state.messages.length,
      compressedMessageCount: state.messages.length
    };
  }

  /**
   * 创建消息标记映射
   */
  private createMarkMap(messages: Message[]): MessageMarkMap {
    const typeIndices: Record<string, number[]> = {
      system: [],
      user: [],
      assistant: [],
      tool: []
    };

    messages.forEach((msg, index) => {
      const roleArray = typeIndices[msg.role];
      if (roleArray) {
        roleArray.push(index);
      }
    });

    return {
      originalIndices: messages.map((_, index) => index),
      typeIndices: typeIndices as any,
      batchBoundaries: [0],
      boundaryToBatch: [0],
      currentBatch: this.state.currentBatchIndex
    };
  }
  
  /**
   * 提取消息的文本内容
   */
  private extractTextContent(content: Message['content']): string {
    if (typeof content === 'string') {
      return content;
    }
    
    // 处理数组类型的内容
    return content
      .map((item: any) => {
        if (item.type === 'text') {
          return item.text || '';
        }
        return '';
      })
      .join(' ');
  }
}