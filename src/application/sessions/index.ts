/**
 * 会话应用服务模块
 */

// 导出服务
export { SessionLifecycleService } from './services/session-lifecycle-service';
export { SessionManagementService } from './services/session-management-service';
export { SessionMaintenanceService } from './services/session-maintenance-service';

// 导出应用层需要的DTO（仅用于请求验证）
export { CreateSessionRequestDto, CreateSessionRequest } from './dtos/request.dto';