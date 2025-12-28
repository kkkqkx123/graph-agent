/**
 * 应用服务基类
 * 
 * 为应用层服务提供通用功能，包括DTO映射、业务操作封装等
 */

import { ID, ILogger } from '../../domain/common';
import { BaseService } from './base-service';

/**
 * 应用服务基类
 */
export abstract class BaseApplicationService extends BaseService {
  constructor(logger: ILogger) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected abstract override getServiceName(): string;

  /**
   * 执行业务操作并处理错误
   * @param operationName 操作名称
   * @param operation 要执行的操作
   * @param context 操作上下文（用于日志）
   * @returns 操作结果
   */
  protected async executeBusinessOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    return this.executeOperation(operationName, operation, context);
  }

  /**
   * 执行查询操作并处理错误
   * @param operationName 操作名称
   * @param operation 要执行的操作
   * @param context 操作上下文（用于日志）
   * @returns 操作结果
   */
  protected async executeQueryOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    return this.executeOperation(operationName, operation, context);
  }

  /**
   * 执行创建操作并处理错误
   * @param entityName 实体名称
   * @param operation 要执行的操作
   * @param context 操作上下文（用于日志）
   * @returns 创建的实体ID
   */
  protected async executeCreateOperation(
    entityName: string,
    operation: () => Promise<ID>,
    context?: Record<string, unknown>
  ): Promise<string> {
    const result = await this.executeBusinessOperation(
      `创建${entityName}`,
      operation,
      context
    );
    return result.toString();
  }

  /**
   * 执行更新操作并处理错误
   * @param entityName 实体名称
   * @param operation 要执行的操作
   * @param context 操作上下文（用于日志）
   * @returns 更新后的实体信息
   */
  protected async executeUpdateOperation<T>(
    entityName: string,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    return this.executeBusinessOperation(
      `更新${entityName}`,
      operation,
      context
    );
  }

  /**
   * 执行删除操作并处理错误
   * @param entityName 实体名称
   * @param operation 要执行的操作
   * @param context 操作上下文（用于日志）
   * @returns 删除是否成功
   */
  protected async executeDeleteOperation(
    entityName: string,
    operation: () => Promise<boolean>,
    context?: Record<string, unknown>
  ): Promise<boolean> {
    return this.executeBusinessOperation(
      `删除${entityName}`,
      operation,
      context
    );
  }

  /**
   * 执行获取操作并处理错误
   * @param entityName 实体名称
   * @param operation 要执行的操作
   * @param context 操作上下文（用于日志）
   * @returns 获取的实体信息或null
   */
  protected async executeGetOperation<T>(
    entityName: string,
    operation: () => Promise<T | null>,
    context?: Record<string, unknown>
  ): Promise<T | null> {
    return this.executeQueryOperation(
      `获取${entityName}`,
      operation,
      context
    );
  }

  /**
   * 执行列表操作并处理错误
   * @param entityName 实体名称
   * @param operation 要执行的操作
   * @param context 操作上下文（用于日志）
   * @returns 实体信息列表
   */
  protected async executeListOperation<T>(
    entityName: string,
    operation: () => Promise<T[]>,
    context?: Record<string, unknown>
  ): Promise<T[]> {
    return this.executeQueryOperation(
      `列出${entityName}`,
      operation,
      context
    );
  }

  /**
   * 执行检查操作并处理错误
   * @param entityName 实体名称
   * @param operation 要执行的操作
   * @param context 操作上下文（用于日志）
   * @returns 检查结果
   */
  protected async executeCheckOperation(
    entityName: string,
    operation: () => Promise<boolean>,
    context?: Record<string, unknown>
  ): Promise<boolean> {
    return this.executeQueryOperation(
      `检查${entityName}`,
      operation,
      context
    );
  }

  /**
   * 执行清理操作并处理错误
   * @param targetName 清理目标名称
   * @param operation 要执行的操作
   * @param context 操作上下文（用于日志）
   * @returns 清理的数量
   */
  protected async executeCleanupOperation(
    targetName: string,
    operation: () => Promise<number>,
    context?: Record<string, unknown>
  ): Promise<number> {
    return this.executeBusinessOperation(
      `清理${targetName}`,
      operation,
      context
    );
  }

  /**
   * 批量操作模板方法
   * @param operationName 操作名称
   * @param items 要处理的项目列表
   * @param itemOperation 单个项目操作
   * @param context 操作上下文
   * @returns 处理结果列表
   */
  protected async executeBatchOperation<T, R>(
    operationName: string,
    items: T[],
    itemOperation: (item: T) => Promise<R>,
    context?: Record<string, unknown>
  ): Promise<R[]> {
    return this.executeOperation(
      operationName,
      async () => {
        const results: R[] = [];
        for (const item of items) {
          const result = await itemOperation(item);
          results.push(result);
        }
        return results;
      },
      { ...context, itemCount: items.length }
    );
  }

  /**
   * 分页操作模板方法
   * @param operationName 操作名称
   * @param page 页码
   * @param pageSize 页面大小
   * @param pageOperation 分页操作
   * @param context 操作上下文
   * @returns 分页结果
   */
  protected async executePaginatedOperation<T>(
    operationName: string,
    page: number,
    pageSize: number,
    pageOperation: (page: number, pageSize: number) => Promise<{
      items: T[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>,
    context?: Record<string, unknown>
  ) {
    return this.executeOperation(
      operationName,
      () => pageOperation(page, pageSize),
      { ...context, page, pageSize }
    );
  }
}