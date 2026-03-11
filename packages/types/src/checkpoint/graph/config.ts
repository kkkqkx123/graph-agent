/**
 * Graph 检查点配置类型定义
 */

import type { Metadata, ID } from '../../common.js';
import type { CheckpointMetadata, DeltaStorageConfig, DEFAULT_DELTA_STORAGE_CONFIG, CheckpointConfigResult } from '../base.js';

// 重新导出通用类型
export type { CheckpointMetadata, DeltaStorageConfig };
export { DEFAULT_DELTA_STORAGE_CONFIG };

/**
 * 检查点触发类型
 */
export type CheckpointTriggerType =
  /** 节点执行前 */
  'NODE_BEFORE_EXECUTE' |
  /** 节点执行后 */
  'NODE_AFTER_EXECUTE' |
  /** Hook触发 */
  'HOOK' |
  /** Trigger触发 */
  'TRIGGER' |
  /** 工具调用前 */
  'TOOL_BEFORE' |
  /** 工具调用后 */
  'TOOL_AFTER';

/**
 * 检查点配置上下文
 */
export interface CheckpointConfigContext {
  /** 触发类型 */
  triggerType: CheckpointTriggerType;
  /** 节点ID（可选） */
  nodeId?: string;
  /** 工具ID（可选） */
  toolId?: ID;
}

/**
 * 检查点配置来源
 */
export type CheckpointConfigSource =
  /** 节点级配置 */
  'node' |
  /** Hook配置 */
  'hook' |
  /** Trigger配置 */
  'trigger' |
  /** 工具配置 */
  'tool' |
  /** 全局配置 */
  'global' |
  /** 全局禁用 */
  'disabled' |
  /** 触发子工作流默认配置 */
  'triggered_subworkflow';