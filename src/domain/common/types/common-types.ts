/**
 * 通用类型定义
 * 从shared/types/common.ts迁移而来
 */

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * 排序参数
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * 查询参数
 */
export interface QueryParams extends PaginationParams {
  sort?: SortParams[];
  filters?: Record<string, any>;
}

/**
 * 操作结果
 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: Error;
  message?: string;
}

/**
 * 服务接口
 */
export interface IService {
  initialize(): Promise<void>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  dispose(): Promise<void>;
}

/**
 * 工厂接口
 */
export interface IFactory<T> {
  create(params: Record<string, any>): T;
}

/**
 * 规约接口
 */
export interface ISpecification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

/**
 * 验证器接口
 */
export interface IValidator<T> {
  validate(candidate: T): ValidationResult;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}
