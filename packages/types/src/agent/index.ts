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

// 检查点类型
export {
    AgentLoopCheckpointType,
    type AgentLoopCheckpointMetadata,
    type AgentLoopDelta,
    type AgentLoopStateSnapshot,
    type AgentLoopCheckpoint,
    type AgentLoopCheckpointConfigSource,
    type AgentLoopCheckpointConfigResult,
    type AgentLoopCheckpointConfigContext,
    type AgentLoopCheckpointConfig,
    type AgentLoopCheckpointListOptions
} from './checkpoint.js';
