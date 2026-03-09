/**
 * Agent 实体层导出
 *
 * 职责：
 * - 提供统一的实体类导出
 * - 管理实体层的对外接口
 */

export { AgentLoopEntity } from './agent-loop-entity.js';
export { AgentLoopState } from './agent-loop-state.js';
// 从 types 包重新导出类型
export { AgentLoopStatus, type ToolCallRecord, type IterationRecord } from '@modular-agent/types';
// 从 snapshot 模块导出快照类型
export { type AgentLoopEntitySnapshot, type AgentLoopStateSnapshot } from '../snapshot/agent-loop-snapshot.js';
