/**
 * 检查点配置类型定义
 */

import type { Metadata, ID } from '../common.js';

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
  customFields?: Metadata;
}

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

/**
 * 检查点配置解析结果
 */
export interface CheckpointConfigResult {
  /** 是否创建检查点 */
  shouldCreate: boolean;
  /** 检查点描述 */
  description?: string;
  /** 使用的配置来源 */
  source: CheckpointConfigSource;
}