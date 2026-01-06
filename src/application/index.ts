/**
 * 应用层模块导出
 *
 * 此文件导出应用层的所有公共接口和类型定义
 * 其他层（如接口层）应该通过此文件导入应用层组件
 */

// 通用工具导出
export * from './common';

// LLM模块导出
export { WrapperService } from './llm/services/wrapper-service';

// 会话模块导出
export { SessionLifecycleService } from './sessions/services/session-lifecycle-service';
export { SessionManagementService } from './sessions/services/session-management-service';
export { SessionMaintenanceService } from './sessions/services/session-maintenance-service';

// 线程模块导出
export { ThreadLifecycleService } from './threads/services/thread-lifecycle-service';
export { ThreadManagementService } from './threads/services/thread-management-service';
export { ThreadMaintenanceService } from './threads/services/thread-maintenance-service';

// 检查点模块导出
export { CheckpointCreationService } from './threads/checkpoints/services/checkpoint-creation-service';
export { CheckpointRestoreService } from './threads/checkpoints/services/checkpoint-restore-service';
export { CheckpointManagementService } from './threads/checkpoints/services/checkpoint-management-service';
export { CheckpointAnalysisService } from './threads/checkpoints/services/checkpoint-analysis-service';

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

// 导入服务类型用于接口定义
import { WrapperService } from './llm/services/wrapper-service';
import { SessionLifecycleService } from './sessions/services/session-lifecycle-service';
import { SessionManagementService } from './sessions/services/session-management-service';
import { SessionMaintenanceService } from './sessions/services/session-maintenance-service';
import { ThreadLifecycleService } from './threads/services/thread-lifecycle-service';
import { ThreadManagementService } from './threads/services/thread-management-service';
import { ThreadMaintenanceService } from './threads/services/thread-maintenance-service';
import { CheckpointCreationService } from './threads/checkpoints/services/checkpoint-creation-service';
import { CheckpointRestoreService } from './threads/checkpoints/services/checkpoint-restore-service';
import { CheckpointManagementService } from './threads/checkpoints/services/checkpoint-management-service';
import { CheckpointAnalysisService } from './threads/checkpoints/services/checkpoint-analysis-service';

/**
 * 应用层服务工厂接口
 */
export interface ApplicationServiceFactory {
  createWrapperService(): WrapperService;
  createSessionLifecycleService(): SessionLifecycleService;
  createSessionManagementService(): SessionManagementService;
  createSessionMaintenanceService(): SessionMaintenanceService;
  createThreadLifecycleService(): ThreadLifecycleService;
  createThreadManagementService(): ThreadManagementService;
  createThreadMaintenanceService(): ThreadMaintenanceService;
  createCheckpointCreationService(): CheckpointCreationService;
  createCheckpointRestoreService(): CheckpointRestoreService;
  createCheckpointManagementService(): CheckpointManagementService;
  createCheckpointAnalysisService(): CheckpointAnalysisService;
}
