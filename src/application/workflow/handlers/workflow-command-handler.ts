/**
 * 工作流命令处理器基类
 */

import { injectable, inject } from 'inversify';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 工作流命令处理器基类
 */
@injectable()
export abstract class WorkflowCommandHandler {
  constructor(@inject('Logger') protected readonly logger: ILogger) {}

  /**
   * 处理命令的抽象方法
   */
  abstract handle(command: any): Promise<any>;
}