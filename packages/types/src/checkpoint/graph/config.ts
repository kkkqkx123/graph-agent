/**
 * Graph 检查点配置类型定义
 */

import type { Metadata, ID } from '../../common.js';
import type {
  CheckpointMetadata,
  DeltaStorageConfig,
  DEFAULT_DELTA_STORAGE_CONFIG,
  CheckpointConfigResult,
  CheckpointConfigSource,
  GraphCheckpointTriggerType,
} from '../base.js';

// 重新导出通用类型
export type { CheckpointMetadata, DeltaStorageConfig };
export { DEFAULT_DELTA_STORAGE_CONFIG };

/**
 * 检查点配置上下文
 */
export interface CheckpointConfigContext {
  /** 触发时机 */
  triggerType: GraphCheckpointTriggerType;
  /** 节点ID（可选） */
  nodeId?: string;
  /** 工具ID（可选） */
  toolId?: ID;
  /** 是否为触发的子工作流 */
  isTriggeredSubworkflow?: boolean;
  /** 是否显式启用检查点 */
  explicitEnableCheckpoint?: boolean;
}

/**
 * Graph 检查点配置层级
 */
export interface GraphCheckpointConfigLayer {
  /** 配置来源 */
  source: CheckpointConfigSource;
  /** 配置内容 */
  config: CheckpointConfigContent;
}

/**
 * 检查点配置内容
 */
export interface CheckpointConfigContent {
  /** 是否启用检查点 */
  enabled?: boolean;
  /** 检查点描述 */
  description?: string;
  /** 特定触发时机的启用配置 */
  triggers?: {
    nodeBeforeExecute?: boolean;
    nodeAfterExecute?: boolean;
    toolBefore?: boolean;
    toolAfter?: boolean;
  };
}
