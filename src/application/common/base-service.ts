/**
 * 应用服务基类
 * 
 * 提供通用服务功能，包括错误处理、日志记录、ID转换等
 */

import { ID, ILogger, IService } from '../../domain/common';

/**
 * 应用服务基类
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
      throw new Error(`无效的${fieldName}: ${idString}`);
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
}