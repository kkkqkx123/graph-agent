/**
 * Query 模式核心接口
 * 定义纯查询操作的统一接口
 */

/**
 * Query 元数据
 */
export interface QueryMetadata {
  /** 查询名称 */
  name: string;
  /** 查询描述 */
  description: string;
  /** 查询分类 */
  category: 'checkpoints' | 'triggers' | 'events' | 'messages' | 'state' | 'batch';
  /** 是否需要认证 */
  requiresAuth: boolean;
  /** 查询版本 */
  version: string;
}

/**
 * Query 结果
 */
export type QueryResult<T> = 
  | { success: true; data: T; executionTime: number }
  | { success: false; error: string; executionTime: number };

/**
 * 创建成功查询结果
 */
export function querySuccess<T>(data: T, executionTime: number): QueryResult<T> {
  return { success: true, data, executionTime };
}

/**
 * 创建失败查询结果
 */
export function queryFailure<T>(error: string, executionTime: number): QueryResult<T> {
  return { success: false, error, executionTime };
}

/**
 * 检查查询结果是否成功
 */
export function isQuerySuccess<T>(result: QueryResult<T>): result is { success: true; data: T; executionTime: number } {
  return result.success === true;
}

/**
 * 检查查询结果是否失败
 */
export function isQueryFailure<T>(result: QueryResult<T>): result is { success: false; error: string; executionTime: number } {
  return result.success === false;
}

/**
 * Query 接口
 * 所有查询操作都需要实现此接口
 */
export interface Query<T> {
  /**
   * 执行查询
   * @returns 查询结果
   */
  execute(): Promise<QueryResult<T>>;
  
  /**
   * 获取查询元数据
   * @returns 查询元数据
   */
  getMetadata(): QueryMetadata;
}

/**
 * 抽象 Query 基类
 * 提供通用的查询实现
 */
export abstract class BaseQuery<T> implements Query<T> {
  protected readonly startTime: number = Date.now();
  
  /**
   * 执行查询
   */
  abstract execute(): Promise<QueryResult<T>>;
  
  /**
   * 获取查询元数据
   */
  abstract getMetadata(): QueryMetadata;
  
  /**
   * 获取执行时间
   */
  protected getExecutionTime(): number {
    return Date.now() - this.startTime;
  }
}