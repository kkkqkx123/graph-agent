/**
 * 工作流生命周期服务
 *
 * 负责工作流的创建、激活、停用、归档和删除等生命周期管理
 */

import { injectable, inject } from 'inversify';
import {
  Workflow,
  WorkflowStatus,
  WorkflowType,
  WorkflowConfig,
  IWorkflowRepository,
} from '../../../domain/workflow';
import { ID, ILogger } from '../../../domain/common';
import { BaseApplicationService } from '../../common/base-application-service';
import { WorkflowDTO, mapWorkflowToDTO } from '../dtos/workflow-dto';

/**
 * 创建工作流参数
 */
export interface CreateWorkflowParams {
  name: string;
  description?: string;
  type?: string;
  config?: any;
  createdBy?: string;
  workflowId?: string;
}

/**
 * 激活工作流参数
 */
export interface ActivateWorkflowParams {
  workflowId: string;
  userId?: string;
  reason?: string;
}

/**
 * 停用工作流参数
 */
export interface DeactivateWorkflowParams {
  workflowId: string;
  userId?: string;
  reason?: string;
}

/**
 * 归档工作流参数
 */
export interface ArchiveWorkflowParams {
  workflowId: string;
  userId?: string;
  reason?: string;
}

/**
 * 删除工作流参数
 */
export interface DeleteWorkflowParams {
  workflowId: string;
}

/**
 * 工作流生命周期服务
 */
@injectable()
export class WorkflowLifecycleService extends BaseApplicationService {
  constructor(
    @inject('WorkflowRepository') private readonly workflowRepository: IWorkflowRepository,
    @inject('Logger') logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected override getServiceName(): string {
    return '工作流生命周期服务';
  }

  /**
   * 创建工作流
   * @param params 创建工作流参数
   * @returns 创建的工作流DTO
   */
  async createWorkflow(params: CreateWorkflowParams): Promise<WorkflowDTO> {
    return this.executeBusinessOperation(
      '工作流',
      async () => {
        // 转换命令参数
        const type = params.type ? WorkflowType.fromString(params.type) : undefined;
        const config = params.config ? (params.config as any) : undefined;
        const createdBy = params.createdBy ? ID.fromString(params.createdBy) : undefined;

        // 验证创建条件
        await this.validateWorkflowCreation(params.name, config, createdBy);

        // 创建工作流
        const workflow = Workflow.create(params.name, params.description, type, config, createdBy);

        // 保存工作流
        const savedWorkflow = await this.workflowRepository.save(workflow);

        return mapWorkflowToDTO(savedWorkflow);
      },
      { name: params.name, type: params.type, workflowId: params.workflowId }
    );
  }

  /**
   * 激活工作流
   * @param params 激活工作流参数
   * @returns 激活后的工作流DTO
   */
  async activateWorkflow(params: ActivateWorkflowParams): Promise<WorkflowDTO> {
    return this.executeUpdateOperation(
      '工作流',
      async () => {
        const workflowId = this.parseId(params.workflowId, '工作流ID');
        const userId = this.parseOptionalId(params.userId, '用户ID');

        const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

        // 验证状态转换
        this.validateStatusTransition(workflow, WorkflowStatus.active());

        // 激活工作流
        workflow.changeStatus(WorkflowStatus.active(), userId, params.reason);

        // 保存工作流
        const savedWorkflow = await this.workflowRepository.save(workflow);

        return mapWorkflowToDTO(savedWorkflow);
      },
      { workflowId: params.workflowId }
    );
  }

  /**
   * 停用工作流
   * @param params 停用工作流参数
   * @returns 停用后的工作流DTO
   */
  async deactivateWorkflow(params: DeactivateWorkflowParams): Promise<WorkflowDTO> {
    return this.executeUpdateOperation(
      '工作流',
      async () => {
        const workflowId = this.parseId(params.workflowId, '工作流ID');
        const userId = this.parseOptionalId(params.userId, '用户ID');

        const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

        // 验证状态转换
        this.validateStatusTransition(workflow, WorkflowStatus.inactive());

        // 停用工作流
        workflow.changeStatus(WorkflowStatus.inactive(), userId, params.reason);

        // 保存工作流
        const savedWorkflow = await this.workflowRepository.save(workflow);

        return mapWorkflowToDTO(savedWorkflow);
      },
      { workflowId: params.workflowId }
    );
  }

  /**
   * 归档工作流
   * @param params 归档工作流参数
   * @returns 归档后的工作流DTO
   */
  async archiveWorkflow(params: ArchiveWorkflowParams): Promise<WorkflowDTO> {
    return this.executeUpdateOperation(
      '工作流',
      async () => {
        const workflowId = this.parseId(params.workflowId, '工作流ID');
        const userId = this.parseOptionalId(params.userId, '用户ID');

        const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

        // 验证状态转换
        this.validateStatusTransition(workflow, WorkflowStatus.archived());

        // 归档工作流
        workflow.changeStatus(WorkflowStatus.archived(), userId, params.reason);

        // 保存工作流
        const savedWorkflow = await this.workflowRepository.save(workflow);

        return mapWorkflowToDTO(savedWorkflow);
      },
      { workflowId: params.workflowId }
    );
  }

  /**
   * 删除工作流
   * @param params 删除工作流参数
   * @returns 删除是否成功
   */
  async deleteWorkflow(params: DeleteWorkflowParams): Promise<boolean> {
    return this.executeBusinessOperation(
      '工作流',
      async () => {
        const workflowId = this.parseId(params.workflowId, '工作流ID');
        const workflow = await this.workflowRepository.findById(workflowId);

        if (!workflow) {
          return false;
        }

        // 检查工作流状态是否允许删除
        if (workflow.status.isActive()) {
          throw new Error('无法删除活跃状态的工作流');
        }

        // 标记工作流为已删除
        workflow.markAsDeleted();
        await this.workflowRepository.save(workflow);

        return true;
      },
      { workflowId: params.workflowId }
    );
  }

  /**
   * 验证工作流创建的业务规则
   */
  private async validateWorkflowCreation(
    name: string,
    config?: WorkflowConfig,
    createdBy?: ID
  ): Promise<void> {
    // 验证工作流名称是否已存在
    const exists = await this.workflowRepository.existsByName(name);
    if (exists) {
      throw new Error(`工作流名称 "${name}" 已存在`);
    }

    // 验证配置
    if (config) {
      config.validate();
    }
  }

  /**
   * 验证工作流状态转换的业务规则
   */
  private validateStatusTransition(workflow: Workflow, newStatus: WorkflowStatus): void {
    const currentStatus = workflow.status;

    // 已归档的工作流不能变更到其他状态
    if (currentStatus.isArchived() && !newStatus.isArchived()) {
      throw new Error('已归档的工作流不能变更到其他状态');
    }

    // 草稿状态只能激活或归档
    if (currentStatus.isDraft() && !newStatus.isActive() && !newStatus.isArchived()) {
      throw new Error('草稿状态的工作流只能激活或归档');
    }

    // 活跃状态只能变为非活跃或归档
    if (currentStatus.isActive() && !newStatus.isInactive() && !newStatus.isArchived()) {
      throw new Error('活跃状态的工作流只能变为非活跃或归档');
    }

    // 非活跃状态只能变为活跃或归档
    if (currentStatus.isInactive() && !newStatus.isActive() && !newStatus.isArchived()) {
      throw new Error('非活跃状态的工作流只能变为活跃或归档');
    }
  }
}
