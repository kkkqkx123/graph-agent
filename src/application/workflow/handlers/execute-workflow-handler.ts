/**
 * 执行工作流命令处理器
 */

import { injectable, inject } from 'inversify';
import { WorkflowCommandHandler } from './workflow-command-handler';
import { WorkflowService } from '../services/workflow-service';
import { ExecuteWorkflowCommand } from '../commands/workflow-execution.command';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 执行工作流命令处理器
 */
@injectable()
export class ExecuteWorkflowHandler extends WorkflowCommandHandler {
  constructor(
    @inject('Logger') logger: ILogger,
    @inject('WorkflowService') private readonly workflowService: WorkflowService
  ) {
    super(logger);
  }

  /**
   * 处理执行工作流命令
   */
  async handle(command: ExecuteWorkflowCommand): Promise<any> {
    try {
      this.logger.info('正在处理执行工作流命令', {
        workflowId: command.workflowId,
        executionMode: command.executionMode
      });

      const result = await this.workflowService.executeWorkflow(command);

      this.logger.info('工作流执行命令处理成功', {
        workflowId: command.workflowId,
        executionId: result.executionId
      });

      return result;
    } catch (error) {
      this.logger.error('执行工作流命令处理失败', error as Error);
      throw error;
    }
  }
}