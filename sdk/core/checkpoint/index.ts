/**
 * 通用 Checkpoint 模块
 *
 * 提供可被 Graph 和 Agent 模块复用的 Checkpoint 管理框架。
 */

// 类型定义
export type {
  BaseCheckpointData,
  BaseCheckpointOptions,
  CheckpointConfigSourceType,
  CheckpointConfigResult,
  CheckpointManager,
  CheckpointListFilter,
  CheckpointSnapshotBuilder
} from './types.js';

// 配置解析器
export {
  CheckpointConfigResolver,
  SimpleCheckpointConfigResolver,
  shouldCreateCheckpoint,
  getCheckpointDescription
} from './config-resolver.js';

export type { ConfigLayer, ConfigResolverOptions } from './config-resolver.js';
