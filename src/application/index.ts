/**
 * 应用层模块导出
 *
 * 此文件导出应用层的所有公共接口和类型定义
 * 其他层（如接口层）应该通过此文件导入应用层组件
 */

// 通用工具导出
export * from './common';

// LLM模块导出
export { Wrapper } from '../services/llm/wrapper';

// 会话模块导出
export { SessionLifecycle } from '../services/sessions/session-lifecycle';
export { SessionManagement } from '../services/sessions/session-management';
export { SessionMaintenance } from '../services/sessions/session-maintenance';

// 线程模块导出
export { ThreadLifecycle } from '../services/threads/thread-lifecycle';
export { ThreadManagement } from '../services/threads/thread-management';
export { ThreadMaintenance } from '../services/threads/thread-maintenance';

// 检查点模块导出
export { CheckpointCreation } from '../services/checkpoints/checkpoint-creation';
export { CheckpointRestore } from '../services/checkpoints/checkpoint-restore';
export { CheckpointQuery } from '../services/checkpoints/checkpoint-query';
export { CheckpointCleanup } from '../services/checkpoints/checkpoint-cleanup';
export { CheckpointBackup } from '../services/checkpoints/checkpoint-backup';
export { CheckpointAnalysis } from '../services/checkpoints/checkpoint-analysis';
export { CheckpointManagement } from '../services/checkpoints/checkpoint-management';

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
import { Wrapper } from '../services/llm/wrapper';
import { SessionLifecycle } from '../services/sessions/session-lifecycle';
import { SessionManagement } from '../services/sessions/session-management';
import { SessionMaintenance } from '../services/sessions/session-maintenance';
import { ThreadLifecycle } from '../services/threads/thread-lifecycle';
import { ThreadManagement } from '../services/threads/thread-management';
import { ThreadMaintenance } from '../services/threads/thread-maintenance';
import { CheckpointCreation } from '../services/checkpoints/checkpoint-creation';
import { CheckpointRestore } from '../services/checkpoints/checkpoint-restore';
import { CheckpointQuery } from '../services/checkpoints/checkpoint-query';
import { CheckpointCleanup } from '../services/checkpoints/checkpoint-cleanup';
import { CheckpointBackup } from '../services/checkpoints/checkpoint-backup';
import { CheckpointAnalysis } from '../services/checkpoints/checkpoint-analysis';
import { CheckpointManagement } from '../services/checkpoints/checkpoint-management';

/**
 * 应用层服务工厂接口
 */
export interface ApplicationServiceFactory {
  createWrapperService(): Wrapper;
  createSessionLifecycleService(): SessionLifecycle;
  createSessionManagementService(): SessionManagement;
  createSessionMaintenanceService(): SessionMaintenance;
  createThreadLifecycleService(): ThreadLifecycle;
  createThreadManagementService(): ThreadManagement;
  createThreadMaintenanceService(): ThreadMaintenance;
  createCheckpointCreationService(): CheckpointCreation;
  createCheckpointRestoreService(): CheckpointRestore;
  createCheckpointQueryService(): CheckpointQuery;
  createCheckpointCleanupService(): CheckpointCleanup;
  createCheckpointBackupService(): CheckpointBackup;
  createCheckpointAnalysisService(): CheckpointAnalysis;
  createCheckpointManagementService(): CheckpointManagement;
}
