/**
 * Agent Loop 检查点类型定义
 */

import type { ID, Timestamp, Metadata } from '../common.js';
import type { Message } from '../message/index.js';
import type { IterationRecord } from './records.js';
import { AgentLoopStatus } from './status.js';

/**
 * Agent Loop 检查点类型
 */
export enum AgentLoopCheckpointType {
  /** 完整检查点 */
  FULL = 'FULL',
  /** 增量检查点 */
  DELTA = 'DELTA'
}

/**
 * Agent Loop 检查点元数据类型
 */
export interface AgentLoopCheckpointMetadata {
  /** 创建者 */
  creator?: string;
  /** 检查点描述 */
  description?: string;
  /** 标签数组 */
  tags?: string[];
  /** 自定义字段对象 */
  customFields?: Metadata;
}

/**
 * Agent Loop 增量数据结构
 */
export interface AgentLoopDelta {
  /** 新增的消息 */
  addedMessages?: Message[];

  /** 新增的迭代记录 */
  addedIterations?: IterationRecord[];

  /** 修改的变量 */
  modifiedVariables?: Map<string, any>;

  /** 状态变更 */
  statusChange?: {
    from: AgentLoopStatus;
    to: AgentLoopStatus;
  };

  /** 其他状态差异 */
  otherChanges?: Record<string, { from: any; to: any }>;
}

/**
 * Agent Loop 状态快照
 */
export interface AgentLoopStateSnapshot {
  status: AgentLoopStatus;
  currentIteration: number;
  toolCallCount: number;
  startTime: number | null;
  endTime: number | null;
  error: any;
  iterationHistory: IterationRecord[];
}

/**
 * Agent Loop 检查点
 */
export interface AgentLoopCheckpoint {
  /** 检查点 ID */
  id: ID;

  /** Agent Loop ID */
  agentLoopId: ID;

  /** 创建时间戳 */
  timestamp: Timestamp;

  /** 检查点类型 */
  type: AgentLoopCheckpointType;

  /** 基线检查点 ID（增量检查点需要） */
  baseCheckpointId?: ID;

  /** 前一检查点 ID（增量检查点需要） */
  previousCheckpointId?: ID;

  /** 增量数据（增量检查点使用） */
  delta?: AgentLoopDelta;

  /** 完整状态快照（完整检查点使用） */
  stateSnapshot?: AgentLoopStateSnapshot;

  /** 消息历史（完整检查点使用） */
  messages?: Message[];

  /** 变量（完整检查点使用） */
  variables?: Record<string, any>;

  /** 配置（完整检查点使用） */
  config?: any;

  /** 检查点元数据 */
  metadata?: AgentLoopCheckpointMetadata;
}

/**
 * Agent Loop 检查点配置来源
 */
export type AgentLoopCheckpointConfigSource =
  /** 迭代级配置 */
  'iteration' |
  /** Loop 级配置 */
  'loop' |
  /** 全局配置 */
  'global' |
  /** 全局禁用 */
  'disabled';

/**
 * Agent Loop 检查点配置结果
 */
export interface AgentLoopCheckpointConfigResult {
  /** 是否创建检查点 */
  shouldCreate: boolean;

  /** 检查点描述 */
  description?: string;

  /** 使用的配置来源 */
  source: AgentLoopCheckpointConfigSource;
}

/**
 * Agent Loop 检查点配置上下文
 */
export interface AgentLoopCheckpointConfigContext {
  /** 当前迭代次数 */
  currentIteration: number;

  /** 是否出错 */
  hasError?: boolean;

  /** 迭代记录 */
  iterationRecord?: IterationRecord;
}

/**
 * Agent Loop 检查点配置
 */
export interface AgentLoopCheckpointConfig {
  /** 是否启用检查点 */
  enabled?: boolean;

  /** 检查点间隔（每隔 N 次迭代创建一次） */
  interval?: number;

  /** 是否只在出错时创建 */
  onErrorOnly?: boolean;

  /** 增量存储配置 */
  deltaStorage?: {
    /** 是否启用增量存储 */
    enabled?: boolean;
    /** 基线检查点间隔 */
    baselineInterval?: number;
    /** 最大增量链长度 */
    maxDeltaChainLength?: number;
  };
}

/**
 * Agent Loop 检查点列表选项
 */
export interface AgentLoopCheckpointListOptions {
  /** Agent Loop ID */
  agentLoopId?: ID;

  /** 标签过滤 */
  tags?: string[];

  /** 限制数量 */
  limit?: number;

  /** 偏移量 */
  offset?: number;
}