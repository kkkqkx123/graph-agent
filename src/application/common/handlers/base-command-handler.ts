/**
 * 命令处理器基类
 * 
 * 提供统一的命令处理接口和错误处理机制
 */

import { injectable, inject } from 'inversify';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 命令处理器接口
 */
export interface ICommandHandler<TCommand = any, TResult = any> {
  handle(command: TCommand): Promise<TResult>;
}

/**
 * 命令处理器基类
 * 
 * 所有命令处理器应继承此类，实现handle方法
 */
@injectable()
export abstract class BaseCommandHandler<TCommand = any, TResult = any> implements ICommandHandler<TCommand, TResult> {
  constructor(@inject('Logger') protected readonly logger: ILogger) {}

  /**
   * 处理命令的核心方法
   * 
   * @param command 要处理的命令
   * @returns 处理结果
   */
  abstract handle(command: TCommand): Promise<TResult>;

  /**
   * 获取处理器名称（用于日志）
   */
  protected getHandlerName(): string {
    return this.constructor.name;
  }

  /**
   * 记录命令开始
   */
  protected logCommandStart(commandName: string, context?: Record<string, unknown>): void {
    this.logger.info(`${this.getHandlerName()}: 正在处理${commandName}`, context);
  }

  /**
   * 记录命令成功
   */
  protected logCommandSuccess(commandName: string, context?: Record<string, unknown>): void {
    this.logger.info(`${this.getHandlerName()}: ${commandName}处理成功`, context);
  }

  /**
   * 记录命令失败
   */
  protected logCommandError(
    commandName: string,
    error: Error,
    context?: Record<string, unknown>
  ): void {
    this.logger.error(`${this.getHandlerName()}: ${commandName}处理失败`, error, context);
  }
}
