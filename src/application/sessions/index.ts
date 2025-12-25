/**
 * 会话应用服务模块
 */

// 导出服务
export { SessionLifecycleService } from './services/session-lifecycle-service';
export { SessionManagementService } from './services/session-management-service';
export { SessionMaintenanceService } from './services/session-maintenance-service';


// 导出命令
export * from './commands/create-session-command';
export * from './commands/delete-session-command';

// 导出查询
export * from './queries/get-session-query';
export * from './queries/list-sessions-query';

// 导出事件
export * from './events/session-created-event';
export * from './events/session-deleted-event';

// 导出应用层需要的DTO（仅用于请求验证）
export { CreateSessionRequestDto, CreateSessionRequest } from './dtos/request.dto';

// 导出处理器
export * from './handlers/create-session-handler';
export * from './handlers/delete-session-handler';
export * from './handlers/get-session-handler';
export * from './handlers/list-sessions-handler';
export * from './handlers/session-created-handler';
export * from './handlers/session-deleted-handler';