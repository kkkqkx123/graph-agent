/**
 * Checkpoint类型定义统一导出
 * 定义检查点的结构和内容
 */

// 导出检查点类型
export * from './checkpoint';

// 导出快照类型
export * from './snapshot';

// 导出配置类型
export * from './config';

// 为了向后兼容，重新导出 CheckpointTriggerType
export { CheckpointTriggerType } from './config';

// 为了向后兼容，重新导出 CheckpointConfigSource
export { CheckpointConfigSource } from './config';