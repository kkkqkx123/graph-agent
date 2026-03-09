/**
 * Agent 模块主入口
 *
 * 职责：
 * - 提供统一的模块导出接口
 * - 管理 Agent 层的所有组件导出
 *
 * 架构层次：
 * - entities/     实体层：封装执行状态
 * - coordinators/ 协调器层：管理生命周期
 * - executors/    执行器层：核心执行逻辑
 * - snapshot/     快照层：快照创建和恢复
 * - checkpoint/   检查点层：增量快照创建和恢复
 * - services/     服务层：注册表等
 */

// 实体层
export {
    AgentLoopEntity,
    AgentLoopState,
    AgentLoopStatus,
    type ToolCallRecord,
    type IterationRecord,
    type AgentLoopEntitySnapshot,
    type AgentLoopStateSnapshot
} from './entities/index.js';

// 协调器层
export {
    AgentLoopCoordinator,
    type AgentLoopExecuteOptions
} from './coordinators/index.js';

// 执行器层
export { AgentLoopExecutor } from './executors/index.js';

// 快照层
export {
    AgentLoopSnapshotManager,
    type AgentLoopEntitySnapshot as SnapshotEntitySnapshot,
    type AgentLoopStateSnapshot as SnapshotStateSnapshot
} from './snapshot/index.js';

// 检查点层
export {
    AgentLoopDiffCalculator,
    AgentLoopDeltaRestorer,
    AgentLoopCheckpointResolver,
    AgentLoopCheckpointCoordinator,
    createCheckpoint,
    restoreFromCheckpoint,
    type CheckpointDependencies,
    type CheckpointOptions,
    type CreateCheckpointOptions
} from './checkpoint/index.js';

// 服务层
export { AgentLoopRegistry } from './services/index.js';
