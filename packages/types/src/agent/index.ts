/**
 * Agent 类型定义统一导出
 * Agent 是独立于 Graph 的执行引擎
 */

// 状态枚举
export { AgentLoopStatus } from './status.js';

// 配置类型
export type { AgentLoopConfig } from './config.js';

// 结果类型
export type { AgentLoopResult } from './result.js';

// 事件类型
export { AgentStreamEventType } from './event.js';
export type { AgentStreamEvent } from './event.js';

// 执行记录类型
export type { ToolCallRecord, IterationRecord } from './records.js';

// Hook 类型
export type { AgentHookType, AgentHook } from './hooks.js';

// 检查点类型（从 checkpoint/agent 模块导入）
export type {
  AgentLoopDelta,
  AgentLoopStateSnapshot,
  AgentLoopCheckpoint,
  AgentLoopCheckpointConfigContext,
  AgentLoopCheckpointConfig,
  AgentLoopCheckpointConfigLayer
} from '../checkpoint/agent/index.js';

// 重新导出通用检查点类型（为了向后兼容）
export type { CheckpointType as TCheckpointType, CheckpointMetadata, CheckpointConfigResult } from '../checkpoint/base.js';