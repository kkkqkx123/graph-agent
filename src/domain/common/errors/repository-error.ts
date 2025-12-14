import { DomainError } from './domain-error';

/**
 * 仓储错误类
 * 
 * 仓储错误表示数据访问层的问题
 */
export class RepositoryError extends DomainError {
  /**
   * 构造函数
   * @param message 错误消息
   * @param code 错误代码
   * @param details 错误详情
   */
  constructor(message: string, code: string = 'REPOSITORY_ERROR', details?: Record<string, unknown>) {
    super(message, code, details);
    this.name = 'RepositoryError';
  }

  /**
   * 创建连接错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 连接错误
   */
  public static connectionError(message: string, details?: Record<string, unknown>): RepositoryError {
    return new RepositoryError(message, 'CONNECTION_ERROR', details);
  }

  /**
   * 创建查询错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 查询错误
   */
  public static queryError(message: string, details?: Record<string, unknown>): RepositoryError {
    return new RepositoryError(message, 'QUERY_ERROR', details);
  }

  /**
   * 创建保存错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 保存错误
   */
  public static saveError(message: string, details?: Record<string, unknown>): RepositoryError {
    return new RepositoryError(message, 'SAVE_ERROR', details);
  }

  /**
   * 创建删除错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 删除错误
   */
  public static deleteError(message: string, details?: Record<string, unknown>): RepositoryError {
    return new RepositoryError(message, 'DELETE_ERROR', details);
  }

  /**
   * 创建事务错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 事务错误
   */
  public static transactionError(message: string, details?: Record<string, unknown>): RepositoryError {
    return new RepositoryError(message, 'TRANSACTION_ERROR', details);
  }

  /**
   * 创建并发错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 并发错误
   */
  public static concurrencyError(message: string, details?: Record<string, unknown>): RepositoryError {
    return new RepositoryError(message, 'CONCURRENCY_ERROR', details);
  }

  /**
   * 创建数据完整性错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 数据完整性错误
   */
  public static integrityError(message: string, details?: Record<string, unknown>): RepositoryError {
    return new RepositoryError(message, 'INTEGRITY_ERROR', details);
  }

  /**
   * 创建超时错误
   * @param message 错误消息
   * @param details 错误详情
   * @returns 超时错误
   */
  public static timeoutError(message: string, details?: Record<string, unknown>): RepositoryError {
    return new RepositoryError(message, 'TIMEOUT_ERROR', details);
  }
}