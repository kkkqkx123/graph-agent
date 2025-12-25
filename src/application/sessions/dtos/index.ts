/**
 * 会话模块DTO统一导出
 */

// 新的Zod-based DTO
export * from './session.dto';
export * from './session-converter';

// 保留旧的导出以确保兼容性（标记为废弃）
// @deprecated 请使用新的 session.dto 中的类型和类
export { CreateSessionRequest, SessionConfigDto } from './create-session';

// @deprecated 请使用新的 session.dto 中的类型和类
export { SessionInfo, SessionStatistics } from './session-info';

// @deprecated 请使用新的 session.dto 中的验证功能
export { SessionValidator } from './session-validator';