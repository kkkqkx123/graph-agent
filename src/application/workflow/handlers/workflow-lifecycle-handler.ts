/**
 * 工作流生命周期命令处理器
 */

import { injectable, inject } from 'inversify';
import { WorkflowCommandHandler } from './workflow-command-handler';
import { WorkflowService } from '../services/workflow-service';
import { 
  CreateWorkflowCommand,
  ActivateWorkflowCommand,
  DeactivateWorkflowCommand,
  ArchiveWorkflowCommand,
  UpdateWorkflowCommand,
  DeleteWorkflowCommand
} from '../commands/workflow-lifecycle.command';
import { ILogger } from '@shared/types/logger';

/**
 * 工作流生命周期命令处理器
 */
@injectable()
export class WorkflowLifecycleHandler extends WorkflowCommandHandler {
  constructor(
    @inject('Logger') logger: ILogger,
    @inject('WorkflowService') private readonly workflowService: WorkflowService
  ) {
    super(logger);
  }

  /**
   * 实现抽象方法 handle
   */
  async handle(command: any): Promise<any> {
    // 此方法由具体的处理方法委派
    throw new Error('请使用具体的 handleXxx 方法处理命令');
  }

  /**
   * 处理创建工作流命令
   */
  async handleCreateWorkflow(command: CreateWorkflowCommand): Promise<any> {
    try {
      this.logger.info('正在处理创建工作流命令', {
        name: command.name,
        type: command.type
      });

      const result = await this.workflowService.createWorkflow(command);

      this.logger.info('创建工作流命令处理成功', {
        workflowId: result.id
      });

      return result;
    } catch (error) {
      this.logger.error('创建工作流命令处理失败', error as Error);
      throw error;
    }
  }

  /**
   * 处理激活工作流命令
   */
  async handleActivateWorkflow(command: ActivateWorkflowCommand): Promise<any> {
    try {
      this.logger.info('正在处理激活工作流命令', {
        workflowId: command.workflowId
      });

      const result = await this.workflowService.activateWorkflow(command);

      this.logger.info('激活工作流命令处理成功', {
        workflowId: command.workflowId
      });

      return result;
    } catch (error) {
      this.logger.error('激活工作流命令处理失败', error as Error);
      throw error;
    }
  }

  /**
   * 处理停用工作流命令
   */
  async handleDeactivateWorkflow(command: DeactivateWorkflowCommand): Promise<any> {
    try {
      this.logger.info('正在处理停用工作流命令', {
        workflowId: command.workflowId
      });

      const result = await this.workflowService.deactivateWorkflow(command);

      this.logger.info('停用工作流命令处理成功', {
        workflowId: command.workflowId
      });

      return result;
    } catch (error) {
      this.logger.error('停用工作流命令处理失败', error as Error);
      throw error;
    }
  }

  /**
   * 处理归档工作流命令
   */
  async handleArchiveWorkflow(command: ArchiveWorkflowCommand): Promise<any> {
    try {
      this.logger.info('正在处理归档工作流命令', {
        workflowId: command.workflowId
      });

      const result = await this.workflowService.archiveWorkflow(command);

      this.logger.info('归档工作流命令处理成功', {
        workflowId: command.workflowId
      });

      return result;
    } catch (error) {
      this.logger.error('归档工作流命令处理失败', error as Error);
      throw error;
    }
  }

  /**
   * 处理更新工作流命令
   */
  async handleUpdateWorkflow(command: UpdateWorkflowCommand): Promise<any> {
    try {
      this.logger.info('正在处理更新工作流命令', {
        workflowId: command.workflowId
      });

      const result = await this.workflowService.updateWorkflow(command);

      this.logger.info('更新工作流命令处理成功', {
        workflowId: command.workflowId
      });

      return result;
    } catch (error) {
      this.logger.error('更新工作流命令处理失败', error as Error);
      throw error;
    }
  }

  /**
   * 处理删除工作流命令
   */
  async handleDeleteWorkflow(command: DeleteWorkflowCommand): Promise<boolean> {
    try {
      this.logger.info('正在处理删除工作流命令', {
        workflowId: command.workflowId
      });

      const result = await this.workflowService.deleteWorkflow(command);

      this.logger.info('删除工作流命令处理成功', {
        workflowId: command.workflowId,
        success: result
      });

      return result;
    } catch (error) {
      this.logger.error('删除工作流命令处理失败', error as Error);
      throw error;
    }
  }
}