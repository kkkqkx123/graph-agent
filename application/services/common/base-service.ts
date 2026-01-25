/**
 * 服务基类
 *
 * 为服务层提供通用功能，包括生命周期管理、错误处理、日志记录、
 * ID转换、业务操作模板等
 */

import { ID, ILogger, IService } from '../../domain/common';
import { ValidationError } from '../../domain/common/exceptions';

/**
 * 服务基类
 */
export abstract class BaseService implements IService {
  protected readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    this.logger.info(`正在初始化${this.getServiceName()}服务...`);
    // 子类可以重写此方法实现特定初始化逻辑
    this.logger.info(`${this.getServiceName()}服务初始化完成`);
  }

  /**
   * 启动服务
   */
  async start(): Promise<void> {
    this.logger.info(`正在启动${this.getServiceName()}服务...`);
    // 子类可以重写此方法实现特定启动逻辑
    this.logger.info(`${this.getServiceName()}服务启动完成`);
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    this.logger.info(`正在停止${this.getServiceName()}服务...`);
    // 子类可以重写此方法实现特定停止逻辑
    this.logger.info(`${this.getServiceName()}服务停止完成`);
  }

  /**
   * 释放服务资源
   */
  async dispose(): Promise<void> {
    this.logger.info(`正在释放${this.getServiceName()}服务资源...`);
    // 子类可以重写此方法实现特定资源释放逻辑
    this.logger.info(`${this.getServiceName()}服务资源释放完成`);
  }

  /**
   * 获取服务名称
   */
  protected abstract getServiceName(): string;

  /**
   * 执行操作并处理错误
   * @param operationName 操作名称
   * @param operation 要执行的操作
   * @param context 操作上下文（用于日志）
   * @returns 操作结果
   */
  protected async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    try {
      this.logger.info(`正在${operationName}`, context);
      const result = await operation();
      this.logger.info(`${operationName}成功`, context);
      return result;
    } catch (error) {
      this.logger.error(`${operationName}失败`, error as Error, context);
      throw error;
    }
  }

  /**
   * 转换字符串ID为领域对象
   * @param idString 字符串ID
   * @param fieldName 字段名称（用于错误信息）
   * @returns ID对象
   */
  protected parseId(idString: string, fieldName: string = 'ID'): ID {
    try {
      return ID.fromString(idString);
    } catch (error) {
      throw new ValidationError(`无效的${fieldName}: ${idString}`);
    }
  }

  /**
   * 可选地转换字符串ID为领域对象
   * @param idString 字符串ID（可能为空）
   * @param fieldName 字段名称（用于错误信息）
   * @returns ID对象或undefined
   */
  protected parseOptionalId(idString?: string, fieldName: string = 'ID'): ID | undefined {
    if (!idString) {
      return undefined;
    }
    return this.parseId(idString, fieldName);
  }

  /**
   * 记录操作开始
   * @param operation 操作名称
   * @param context 上下文
   */
  protected logOperationStart(operation: string, context?: Record<string, unknown>): void {
    this.logger.info(`正在${operation}`, context);
  }

  /**
   * 记录操作成功
   * @param operation 操作名称
   * @param context 上下文
   */
  protected logOperationSuccess(operation: string, context?: Record<string, unknown>): void {
    this.logger.info(`${operation}成功`, context);
  }

  /**
   * 记录操作失败
   * @param operation 操作名称
   * @param error 错误对象
   * @param context 上下文
   */
  protected logOperationError(
    operation: string,
    error: Error,
    context?: Record<string, unknown>
  ): void {
    this.logger.error(`${operation}失败`, error, context);
  }

  /**
   * 记录警告信息
   * @param message 警告消息
   * @param context 上下文
   */
  protected logWarning(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(message, context);
  }

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
    const result = await this.executeBusinessOperation(`创建${entityName}`, operation, context);
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
    return this.executeBusinessOperation(`更新${entityName}`, operation, context);
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
    return this.executeBusinessOperation(`删除${entityName}`, operation, context);
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
    return this.executeQueryOperation(`获取${entityName}`, operation, context);
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
    return this.executeQueryOperation(`列出${entityName}`, operation, context);
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
    return this.executeQueryOperation(`检查${entityName}`, operation, context);
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
    return this.executeBusinessOperation(`清理${targetName}`, operation, context);
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
    pageOperation: (
      page: number,
      pageSize: number
    ) => Promise<{
      items: T[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>,
    context?: Record<string, unknown>
  ) {
    return this.executeOperation(operationName, () => pageOperation(page, pageSize), {
      ...context,
      page,
      pageSize,
    });
  }
}