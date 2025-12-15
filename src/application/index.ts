/**
 * 应用层模块导出
 * 
 * 此文件导出应用层的所有公共接口和类型定义
 * 其他层（如接口层）应该通过此文件导入应用层组件
 */

// 会话模块导出
export * from './sessions/services/session-service';
export * from './sessions/dtos/create-session-dto';
export * from './sessions/dtos/session-info-dto';
export * from './sessions/commands/create-session-command';
export * from './sessions/commands/delete-session-command';
export * from './sessions/queries/get-session-query';
export * from './sessions/queries/list-sessions-query';
export * from './sessions/events/session-created-event';
export * from './sessions/events/session-deleted-event';
export * from './sessions/handlers/create-session-handler';
export * from './sessions/handlers/delete-session-handler';
export * from './sessions/handlers/get-session-handler';
export * from './sessions/handlers/list-sessions-handler';
export * from './sessions/handlers/session-created-handler';
export * from './sessions/handlers/session-deleted-handler';

// 线程模块导出
export * from './threads/services/thread-service';
export * from './threads/dtos/create-thread-dto';
export * from './threads/dtos/thread-info-dto';
export * from './threads/commands/create-thread-command';
export * from './threads/commands/delete-thread-command';
export * from './threads/commands/update-thread-status-command';
export * from './threads/queries/get-thread-query';
export * from './threads/queries/list-threads-query';
export * from './threads/events/thread-created-event';
export * from './threads/events/thread-deleted-event';
export * from './threads/handlers/create-thread-handler';
export * from './threads/handlers/delete-thread-handler';
export * from './threads/handlers/update-thread-status-handler';
export * from './threads/handlers/get-thread-handler';
export * from './threads/handlers/list-threads-handler';
export * from './threads/handlers/thread-created-handler';
export * from './threads/handlers/thread-deleted-handler';

// 应用层类型定义
export interface ApplicationService {
  // 应用服务的通用接口定义
}

/**
 * 应用层配置接口
 */
export interface ApplicationConfig {
  // 应用层配置定义
  maxSessionsPerUser: number;
  maxThreadsPerSession: number;
  defaultSessionTimeout: number;
  defaultThreadTimeout: number;
}

/**
 * 应用层错误类型
 */
export enum ApplicationErrorType {
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  THREAD_NOT_FOUND = 'THREAD_NOT_FOUND',
  SESSION_ALREADY_EXISTS = 'SESSION_ALREADY_EXISTS',
  THREAD_ALREADY_EXISTS = 'THREAD_ALREADY_EXISTS',
  INVALID_SESSION_STATE = 'INVALID_SESSION_STATE',
  INVALID_THREAD_STATE = 'INVALID_THREAD_STATE',
  SESSION_LIMIT_EXCEEDED = 'SESSION_LIMIT_EXCEEDED',
  THREAD_LIMIT_EXCEEDED = 'THREAD_LIMIT_EXCEEDED',
}

/**
 * 应用层错误类
 */
export class ApplicationError extends Error {
  constructor(
    public readonly type: ApplicationErrorType,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

/**
 * 应用层结果包装器
 */
export class ApplicationResult<T> {
  constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly error?: ApplicationError
  ) {}

  static success<T>(data: T): ApplicationResult<T> {
    return new ApplicationResult(true, data);
  }

  static error<T>(error: ApplicationError): ApplicationResult<T> {
    return new ApplicationResult<T>(false, undefined, error);
  }
}

/**
 * 分页查询结果
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * 排序参数
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * 应用层服务工厂接口
 */
export interface ApplicationServiceFactory {
  createSessionService(): SessionService;
  createThreadService(): ThreadService;
}

// 重新导出会话和线程服务类型
import { SessionService } from './sessions/services/session-service';
import { ThreadService } from './threads/services/thread-service';

export { SessionService, ThreadService };