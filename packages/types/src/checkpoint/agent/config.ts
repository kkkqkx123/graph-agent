/**
 * Agent Loop 检查点配置类型定义
 */

import type { IterationRecord } from '../../agent/records.js';
import type {
  DeltaStorageConfig,
  CheckpointConfigResult,
} from '../base.js';

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
  deltaStorage?: Partial<DeltaStorageConfig>;
}

/**
 * 解析 Agent Loop 检查点配置
 *
 * @param config 检查点配置
 * @param context 配置上下文
 * @returns 检查点配置结果
 */
export function resolveAgentLoopCheckpointConfig(
  config: AgentLoopCheckpointConfig,
  context: AgentLoopCheckpointConfigContext
): CheckpointConfigResult {
  const { enabled = true, interval = 1, onErrorOnly = false } = config;

  // 全局禁用
  if (!enabled) {
    return {
      shouldCreate: false,
      source: 'disabled',
    };
  }

  // 只在出错时创建
  if (onErrorOnly) {
    if (context.hasError) {
      return {
        shouldCreate: true,
        description: 'Error checkpoint',
        source: 'iteration',
      };
    }
    return {
      shouldCreate: false,
      source: 'iteration',
    };
  }

  // 按间隔创建
  if (context.currentIteration % interval === 0) {
    return {
      shouldCreate: true,
      description: `Iteration ${context.currentIteration} checkpoint`,
      source: 'iteration',
    };
  }

  return {
    shouldCreate: false,
    source: 'iteration',
  };
}