/**
 * Agent Loop 检查点配置类型定义
 */

import type { IterationRecord } from '../../agent/records.js';
import type {
  DeltaStorageConfig,
  CheckpointConfigResult,
  CheckpointConfigSource,
  AgentLoopCheckpointTriggerType,
} from '../base.js';

/**
 * Agent Loop 检查点配置上下文
 */
export interface AgentLoopCheckpointConfigContext {
  /** 触发时机 */
  triggerType: AgentLoopCheckpointTriggerType;
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
  deltaStorage?: Partial<DeltaStorageConfig>;
}

/**
 * Agent Loop 检查点配置层级
 */
export interface AgentLoopCheckpointConfigLayer {
  /** 配置来源 */
  source: CheckpointConfigSource;
  /** 配置内容 */
  config: AgentLoopCheckpointConfig;
}
