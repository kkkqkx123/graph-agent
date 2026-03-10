/**
 * Agent API 模块入口
 * 导出所有 Agent 相关的 API
 */

// ============================================================================
// Commands - 命令操作
// ============================================================================

// 执行命令
export { RunAgentLoopCommand, type RunAgentLoopParams } from './operations/run-agent-loop-command.js';
export { RunAgentLoopStreamCommand, type RunAgentLoopStreamParams } from './operations/run-agent-loop-stream-command.js';

// 控制命令
export { CancelAgentLoopCommand, type CancelAgentLoopParams } from './operations/cancel-agent-loop-command.js';
export { PauseAgentLoopCommand, type PauseAgentLoopParams } from './operations/pause-agent-loop-command.js';
export { ResumeAgentLoopCommand, type ResumeAgentLoopParams } from './operations/resume-agent-loop-command.js';

// 检查点命令
export { CreateCheckpointCommand, type CreateCheckpointParams } from './operations/checkpoints/create-checkpoint-command.js';
export { RestoreCheckpointCommand, type RestoreCheckpointParams } from './operations/checkpoints/restore-checkpoint-command.js';

// ============================================================================
// Resources - 资源API
// ============================================================================

export { AgentLoopRegistryAPI, type AgentLoopFilter, type AgentLoopSummary } from './resources/agent-loop-registry-api.js';
export { AgentLoopCheckpointResourceAPI, type AgentLoopCheckpointFilter, type CheckpointStorage } from './resources/checkpoint-resource-api.js';
export { AgentLoopMessageResourceAPI, type AgentLoopMessageFilter, type AgentLoopMessageStats } from './resources/message-resource-api.js';
export { AgentLoopVariableResourceAPI, type AgentLoopVariableFilter, type VariableDefinition } from './resources/variable-resource-api.js';
