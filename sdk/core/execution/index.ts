/**
 * 通用执行核心模块
 *
 * 提供 Graph 模块和 Agent 模块共享的执行相关组件：
 * - 中断管理 (InterruptionManager)
 * - Token 使用追踪 (TokenUsageTracker)
 * - 对话管理 (ConversationManager)
 * - 上下文裁剪 (ContextTrimService)
 * - 工具确认 (ToolConfirmationService)
 */

// 管理器
export { InterruptionManager, type InterruptionType, type InterruptionInfo, type InterruptionManagerConfig } from './managers/interruption-manager.js';
export { ConversationManager, type ConversationManagerOptions, type ConversationState } from './managers/conversation-manager.js';

// 服务
export { TokenUsageTracker, type TokenUsageTrackerOptions, type FullTokenUsageStats } from './services/token-usage-tracker.js';
export { ContextTrimService, type ContextTrimConfig, type ContextTrimResult } from './services/context-trim-service.js';
export { ToolConfirmationService, type ToolConfirmationConfig, type ToolConfirmationResult } from './services/tool-confirmation-service.js';

// 工具函数
export { estimateTokens, getTokenUsage, isTokenLimitExceeded } from './services/token-utils.js';

// 类型
export type { LLMMessage, LLMUsage, TokenUsageStats, TokenUsageHistory } from '@modular-agent/types';
