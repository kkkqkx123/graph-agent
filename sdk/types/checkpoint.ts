/**
 * Checkpoint类型定义
 * 定义检查点的结构和内容
 */

import { ThreadStatus } from './thread';
import { NodeExecutionResult } from './thread';

/**
 * 线程状态快照类型
 */
export interface ThreadStateSnapshot {
  /** 线程状态 */
  status: ThreadStatus;
  /** 当前节点ID */
  currentNodeId: string;
  /** 变量数组 */
  variables: any[];
  /** 输入数据 */
  input: Record<string, any>;
  /** 输出数据 */
  output: Record<string, any>;
  /** 节点执行结果映射 */
  nodeResults: Record<string, NodeExecutionResult>;
  /** 执行历史记录 */
  executionHistory: any[];
  /** 错误信息数组 */
  errors: any[];
}

/**
 * 检查点元数据类型
 */
export interface CheckpointMetadata {
  /** 创建者 */
  creator?: string;
  /** 检查点描述 */
  description?: string;
  /** 标签数组 */
  tags?: string[];
  /** 自定义字段对象 */
  customFields?: Record<string, any>;
}

/**
 * 检查点类型
 */
export interface Checkpoint {
  /** 检查点唯一标识符 */
  id: string;
  /** 关联的线程ID */
  threadId: string;
  /** 关联的工作流ID */
  workflowId: string;
  /** 创建时间戳 */
  timestamp: number;
  /** 线程状态快照 */
  threadState: ThreadStateSnapshot;
  /** 检查点元数据 */
  metadata?: CheckpointMetadata;
}