/**
 * 消息管理模块统一导出
 * 导出所有消息相关的类型定义
 */

// 消息基础类型
export type {
  Message,
  MessageRole,
  MessageContent,
  LLMMessage,
  LLMToolCall
} from './message';

// 批次快照类型
export type {
  BatchSnapshot,
  BatchSnapshotArray
} from './batch-snapshot';

// 消息数组类型
export type {
  MessageArrayState,
  MessageArrayStats
} from './message-array';

// 消息操作类型
export type {
  MessageOperationType,
  MessageOperationConfig,
  AppendMessageOperation,
  InsertMessageOperation,
  ReplaceMessageOperation,
  TruncateMessageOperation,
  ClearMessageOperation,
  FilterMessageOperation,
  RollbackMessageOperation,
  MessageOperationResult
} from './message-operations';

// 消息操作上下文类型
export type {
  MessageOperationContext
} from './message-context';

// 消息标记映射类型
export type {
  MessageMarkMap
} from './message-mark-map';

// 批次管理操作类型
export type {
  BatchManagementOperation,
  BatchManagementOperationType
} from './batch-management-operation';