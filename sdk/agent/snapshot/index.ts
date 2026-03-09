/**
 * Agent 快照层导出
 *
 * 职责：
 * - 提供统一的快照管理导出
 * - 管理快照层的对外接口
 */

export {
  AgentLoopSnapshotManager,
  type AgentLoopEntitySnapshot,
  type AgentLoopStateSnapshot
} from './agent-loop-snapshot.js';
