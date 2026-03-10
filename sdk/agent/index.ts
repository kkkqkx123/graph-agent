/**
 * Agent 模块主入口
 *
 * 职责：
 * - 提供统一的模块导出接口
 * - 管理 Agent 层的所有组件导出
 *
 * 架构层次：
 * - entities/     实体层：纯数据实体，封装执行状态
 * - managers/     管理器层：管理消息历史和变量状态
 * - execution/    执行层：工厂和生命周期管理
 * - coordinators/ 协调器层：管理生命周期
 * - executors/    执行器层：核心执行逻辑
 * - checkpoint/   检查点层：增量快照创建和恢复
 * - services/     服务层：注册表等
 */

// 实体层
export {
    AgentLoopEntity,
    AgentLoopState,
    AgentLoopStatus,
    type ToolCallRecord,
    type IterationRecord
} from './entities/index.js';
// AgentLoopStateSnapshot 从 types 包导出
export { type AgentLoopStateSnapshot } from '@modular-agent/types';

// 管理器层
export {
    MessageHistoryManager,
    VariableStateManager,
    type MessageHistoryState,
    type VariableState
} from './execution/managers/index.js';

// 执行层（工厂和生命周期）
export {
    AgentLoopFactory,
    createAgentLoopCheckpoint,
    cleanupAgentLoop,
    cloneAgentLoop,
    type AgentLoopEntityOptions,
    type AgentLoopCheckpointDependencies,
    type AgentLoopCheckpointOptions
} from './execution/index.js';

// 协调器层
export {
    AgentLoopCoordinator,
    type AgentLoopExecuteOptions
} from './execution/coordinators/index.js';

// 执行器层
export { AgentLoopExecutor } from './execution/executors/index.js';

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
