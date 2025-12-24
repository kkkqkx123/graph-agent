/**
 * 查询处理器基类
 * 
 * 提供统一的查询处理接口和错误处理机制
 */

import { injectable, inject } from 'inversify';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 查询处理器接口
 */
export interface IQueryHandler<TQuery = any, TResult = any> {
  handle(query: TQuery): Promise<TResult>;
}

/**
 * 查询处理器基类
 * 
 * 所有查询处理器应继承此类，实现handle方法
 */
@injectable()
export abstract class BaseQueryHandler<TQuery = any, TResult = any> implements IQueryHandler<TQuery, TResult> {
  constructor(@inject('Logger') protected readonly logger: ILogger) {}

  /**
   * 处理查询的核心方法
   * 
   * @param query 要处理的查询
   * @returns 查询结果
   */
  abstract handle(query: TQuery): Promise<TResult>;

  /**
   * 获取处理器名称（用于日志）
   */
  protected getHandlerName(): string {
    return this.constructor.name;
  }

  /**
   * 记录查询开始
   */
  protected logQueryStart(queryName: string, context?: Record<string, unknown>): void {
    this.logger.info(`${this.getHandlerName()}: 正在处理${queryName}`, context);
  }

  /**
   * 记录查询成功
   */
  protected logQuerySuccess(queryName: string, context?: Record<string, unknown>): void {
    this.logger.info(`${this.getHandlerName()}: ${queryName}处理成功`, context);
  }

  /**
   * 记录查询失败
   */
  protected logQueryError(
    queryName: string,
    error: Error,
    context?: Record<string, unknown>
  ): void {
    this.logger.error(`${this.getHandlerName()}: ${queryName}处理失败`, error, context);
  }
}
