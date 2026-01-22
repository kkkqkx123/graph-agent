import { injectable, inject } from 'inversify';
import { IWorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { WorkflowDefinition } from '../../../domain/workflow/value-objects/workflow-definition';
import { ID } from '../../../domain/common/value-objects/id';
import { WorkflowStatus } from '../../../domain/workflow/value-objects/workflow-status';
import { WorkflowStatusValue } from '../../../domain/workflow/value-objects/workflow-status';
import { WorkflowType } from '../../../domain/workflow/value-objects/workflow-type';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { WorkflowModel } from '../models/workflow.model';
import { ThreadModel } from '../models/thread.model';
import { In } from 'typeorm';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connection-manager';

@injectable()
export class WorkflowRepository
  extends BaseRepository<Workflow, WorkflowModel, ID>
  implements IWorkflowRepository {
  constructor(@inject('ConnectionManager') connectionManager: ConnectionManager) {
    super(connectionManager);
  }

  protected getModelClass(): new () => WorkflowModel {
    return WorkflowModel;
  }

  /**
   * 重写toDomain方法
   */
  protected override toDomain(model: WorkflowModel): Workflow {
    try {
      const definition = WorkflowDefinition.fromProps({
        id: new ID(model.id),
        name: model.name,
        description: model.description || undefined,
        status: WorkflowStatus.fromString(model.state),
        type: WorkflowType.fromString(model.executionMode),
        config: model.configuration || {},
        errorHandlingStrategy: {} as any,
        executionStrategy: {} as any,
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        tags: model.metadata?.tags || [],
        metadata: model.metadata || {},
        isDeleted: model.metadata?.isDeleted || false,
        createdBy: model.createdBy ? new ID(model.createdBy) : undefined,
        updatedBy: model.updatedBy ? new ID(model.updatedBy) : undefined,
      });

      const graph = {
        nodes: new Map(),
        edges: new Map(),
      };

      return Workflow.fromProps({
        id: new ID(model.id),
        definition,
        graph,
        subWorkflowReferences: new Map(),
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        createdBy: model.createdBy ? new ID(model.createdBy) : undefined,
        updatedBy: model.updatedBy ? new ID(model.updatedBy) : undefined,
      });
    } catch (error) {
      const errorMessage = `Workflow模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toDomain' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法
   */
  protected override toModel(entity: Workflow): WorkflowModel {
    try {
      const model = new WorkflowModel();

      model.id = entity.workflowId.value;
      model.name = entity.name;
      model.description = entity.description || undefined;
      model.state = entity.status.getValue();
      model.executionMode = entity.type.getValue();
      model.metadata = {
        ...entity.metadata,
        tags: entity.tags,
        isDeleted: entity.isDeleted(),
        definition: entity.getDefinition(),
      };
      model.configuration = entity.config;
      model.version = entity.version.getValue();
      model.revision = parseInt(entity.version.getValue().split('.')[2] || '0');
      model.createdBy = entity.createdBy ? entity.createdBy.value : undefined;
      model.updatedBy = entity.updatedBy ? entity.updatedBy.value : undefined;
      model.createdAt = entity.createdAt.getDate();
      model.updatedAt = entity.updatedAt.getDate();

      return model;
    } catch (error) {
      const errorMessage = `Workflow实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.workflowId.value, operation: 'toModel' };
      throw customError;
    }
  }

  /**
   * 按名称查找工作流
   */
  async findByName(name: string): Promise<Workflow[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('workflow')
      .where('workflow.name = :name', { name })
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 按状态查找工作流
   */
  async findByStatus(status: WorkflowStatus): Promise<Workflow[]> {
    return this.find({
      filters: { state: status.getValue() },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 按类型查找工作流
   */
  async findByType(type: WorkflowType): Promise<Workflow[]> {
    return this.find({
      filters: { executionMode: type.getValue() },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 按标签查找工作流
   */
  async findByTags(tags: string[]): Promise<Workflow[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('workflow')
      .where("workflow.metadata->>'tags' @> :tags", { tags: JSON.stringify(tags) })
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 按创建者查找工作流
   */
  async findByCreatedBy(createdBy: ID): Promise<Workflow[]> {
    return this.find({
      filters: { createdBy: createdBy.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 查找草稿工作流
   */
  async findDraftWorkflows(): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.draft());
  }

  /**
   * 查找活跃工作流
   */
  async findActiveWorkflows(): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.active());
  }

  /**
   * 查找非活跃工作流
   */
  async findInactiveWorkflows(): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.inactive());
  }

  /**
   * 查找已归档工作流
   */
  async findArchivedWorkflows(): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.archived());
  }

  /**
   * 按名称搜索工作流
   */
  async searchByName(name: string): Promise<Workflow[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('workflow')
      .where('workflow.name LIKE :name', { name: `%${name}%` })
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 按描述搜索工作流
   */
  async searchByDescription(description: string): Promise<Workflow[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('workflow')
      .where('workflow.description LIKE :description', { description: `%${description}%` })
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 检查名称是否存在
   */
  async existsByName(name: string, excludeId?: ID): Promise<boolean> {
    const repository = await this.getRepository();
    const queryBuilder = repository
      .createQueryBuilder('workflow')
      .where('workflow.name = :name', { name });

    if (excludeId) {
      queryBuilder.andWhere('workflow.id != :excludeId', { excludeId: excludeId.value });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  /**
   * 获取最活跃的工作流
   */
  async getMostActiveWorkflows(limit: number): Promise<Workflow[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('workflow')
      .orderBy("CAST(workflow.metadata->>'executionCount' AS INTEGER)", 'DESC')
      .take(limit)
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 获取最近创建的工作流
   */
  async getRecentlyCreatedWorkflows(limit: number): Promise<Workflow[]> {
    return this.find({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 获取最复杂的工作流
   */
  async getMostComplexWorkflows(limit: number): Promise<Workflow[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('workflow')
      .orderBy(
        "(CAST(workflow.metadata->>'nodeCount' AS INTEGER) + CAST(workflow.metadata->>'edgeCount' AS INTEGER))",
        'DESC'
      )
      .take(limit)
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 批量更新工作流状态
   */
  async batchUpdateStatus(
    workflowIds: ID[],
    status: WorkflowStatus,
    changedBy?: ID,
    reason?: string
  ): Promise<number> {
    const repository = await this.getRepository();
    const updateData: any = {
      state: status.getValue(),
      updatedAt: new Date(),
    };

    if (changedBy) {
      updateData.updatedBy = changedBy.value;
    }

    const result = await repository.update({ id: In(workflowIds.map(id => id.value)) }, updateData);

    return result.affected || 0;
  }

  /**
   * 批量删除工作流
   */
  async batchDelete(workflowIds: ID[]): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ id: In(workflowIds.map(id => id.value)) });
    return result.affected || 0;
  }

  /**
   * 软删除工作流
   */
  async softDelete(workflowId: ID): Promise<void> {
    const repository = await this.getRepository();
    await repository.update(
      { id: workflowId.value },
      {
        state: WorkflowStatusValue.ARCHIVED,
        updatedAt: new Date(),
      }
    );
  }

  /**
   * 批量软删除工作流
   */
  async batchSoftDelete(workflowIds: ID[]): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.update(
      { id: In(workflowIds.map(id => id.value)) },
      {
        state: WorkflowStatusValue.ARCHIVED,
        updatedAt: new Date(),
      }
    );
    return result.affected || 0;
  }

  /**
   * 恢复软删除的工作流
   */
  async restoreSoftDeleted(workflowId: ID): Promise<void> {
    const repository = await this.getRepository();
    await repository.update(
      { id: workflowId.value },
      {
        state: WorkflowStatusValue.DRAFT,
        updatedAt: new Date(),
      }
    );
  }

  /**
   * 查找软删除的工作流
   */
  async findSoftDeleted(): Promise<Workflow[]> {
    return this.find({
      filters: { state: 'archived' },
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 按节点ID查找工作流
   */
  async findByNodeId(nodeId: ID): Promise<Workflow[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('workflow')
      .where("workflow.metadata->>'nodeIds' @> :nodeId", { nodeId: JSON.stringify([nodeId.value]) })
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 按边ID查找工作流
   */
  async findByEdgeId(edgeId: ID): Promise<Workflow[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('workflow')
      .where("workflow.metadata->>'edgeIds' @> :edgeId", { edgeId: JSON.stringify([edgeId.value]) })
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 获取工作流标签统计
   */
  async getWorkflowTagStats(): Promise<Record<string, number>> {
    const repository = await this.getRepository();
    const stats = await repository
      .createQueryBuilder('workflow')
      .select("jsonb_array_elements_text(workflow.metadata->'tags')", 'tag')
      .addSelect('COUNT(*)', 'count')
      .groupBy('tag')
      .orderBy('count', 'DESC')
      .getRawMany();

    const result: Record<string, number> = {};
    stats.forEach(stat => {
      result[stat.tag] = parseInt(stat.count);
    });

    return result;
  }

  /**
   * 复合查询工作流（支持过滤和分页）
   *
   * @param filter 查询过滤器
   * @param pagination 分页参数
   * @returns 分页结果
   */
  async queryWithFilter(
    filter: { status?: WorkflowStatus; type?: WorkflowType; createdBy?: ID; nameKeyword?: string; tags?: string[] },
    pagination: { page: number; size: number }
  ): Promise<{ items: Workflow[]; total: number; page: number; size: number; totalPages: number; hasNext: boolean; hasPrevious: boolean }> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('workflow');

    // 应用过滤条件
    if (filter.status) {
      queryBuilder = queryBuilder.where('workflow.state = :status', { status: filter.status.getValue() });
    }

    if (filter.type) {
      queryBuilder = queryBuilder.andWhere('workflow.executionMode = :type', { type: filter.type.getValue() });
    }

    if (filter.createdBy) {
      queryBuilder = queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: filter.createdBy.value });
    }

    if (filter.nameKeyword) {
      queryBuilder = queryBuilder.andWhere('workflow.name LIKE :nameKeyword', { nameKeyword: `%${filter.nameKeyword}%` });
    }

    if (filter.tags && filter.tags.length > 0) {
      queryBuilder = queryBuilder.andWhere("workflow.metadata->>'tags' @> :tags", { tags: JSON.stringify(filter.tags) });
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 应用分页
    const skip = (pagination.page - 1) * pagination.size;
    const models = await queryBuilder
      .skip(skip)
      .take(pagination.size)
      .orderBy('workflow.createdAt', 'DESC')
      .getMany();

    const items = models.map(model => this.toDomain(model));
    const totalPages = Math.ceil(total / pagination.size);

    return {
      items,
      total,
      page: pagination.page,
      size: pagination.size,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * 获取工作流执行统计信息
   *
   * 通过查询 Thread 表计算工作流的执行统计信息
   *
   * @param workflowId 工作流ID
   * @returns 执行统计信息
   */
  async getExecutionStatistics(workflowId: ID): Promise<{
    executionCount: number;
    successCount: number;
    failureCount: number;
    cancelledCount: number;
    averageExecutionTime: number;
    lastExecutedAt?: Date;
  }> {
    const connection = await this.connectionManager.getConnection();
    const queryRunner = connection.createQueryRunner();

    try {
      const result = await queryRunner.manager
        .createQueryBuilder(ThreadModel, 'thread')
        .select([
          'COUNT(thread.id) as executionCount',
          'SUM(CASE WHEN thread.state = :completed THEN 1 ELSE 0 END) as successCount',
          'SUM(CASE WHEN thread.state = :failed THEN 1 ELSE 0 END) as failureCount',
          'SUM(CASE WHEN thread.state = :cancelled THEN 1 ELSE 0 END) as cancelledCount',
          'AVG(EXTRACT(EPOCH FROM (thread.updatedAt - thread.createdAt))) as averageExecutionTime',
          'MAX(thread.updatedAt) as lastExecutedAt',
        ])
        .where('thread.workflowId = :workflowId', { workflowId: workflowId.value })
        .setParameter('completed', 'completed')
        .setParameter('failed', 'failed')
        .setParameter('cancelled', 'cancelled')
        .getRawOne();

      return {
        executionCount: parseInt(result.executionCount) || 0,
        successCount: parseInt(result.successCount) || 0,
        failureCount: parseInt(result.failureCount) || 0,
        cancelledCount: parseInt(result.cancelledCount) || 0,
        averageExecutionTime: parseFloat(result.averageExecutionTime) || 0,
        lastExecutedAt: result.lastExecutedAt,
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 批量获取工作流执行统计信息
   *
   * @param workflowIds 工作流ID列表
   * @returns 执行统计信息映射
   */
  async getBatchExecutionStatistics(workflowIds: ID[]): Promise<Map<string, {
    executionCount: number;
    successCount: number;
    failureCount: number;
    cancelledCount: number;
    averageExecutionTime: number;
    lastExecutedAt?: Date;
  }>> {
    const connection = await this.connectionManager.getConnection();
    const queryRunner = connection.createQueryRunner();

    try {
      const results = await queryRunner.manager
        .createQueryBuilder(ThreadModel, 'thread')
        .select([
          'thread.workflowId as workflowId',
          'COUNT(thread.id) as executionCount',
          'SUM(CASE WHEN thread.state = :completed THEN 1 ELSE 0 END) as successCount',
          'SUM(CASE WHEN thread.state = :failed THEN 1 ELSE 0 END) as failureCount',
          'SUM(CASE WHEN thread.state = :cancelled THEN 1 ELSE 0 END) as cancelledCount',
          'AVG(EXTRACT(EPOCH FROM (thread.updatedAt - thread.createdAt))) as averageExecutionTime',
          'MAX(thread.updatedAt) as lastExecutedAt',
        ])
        .where('thread.workflowId IN (:...workflowIds)', {
          workflowIds: workflowIds.map(id => id.value)
        })
        .setParameter('completed', 'completed')
        .setParameter('failed', 'failed')
        .setParameter('cancelled', 'cancelled')
        .groupBy('thread.workflowId')
        .getRawMany();

      const statsMap = new Map();
      results.forEach(result => {
        statsMap.set(result.workflowId, {
          executionCount: parseInt(result.executionCount) || 0,
          successCount: parseInt(result.successCount) || 0,
          failureCount: parseInt(result.failureCount) || 0,
          cancelledCount: parseInt(result.cancelledCount) || 0,
          averageExecutionTime: parseFloat(result.averageExecutionTime) || 0,
          lastExecutedAt: result.lastExecutedAt,
        });
      });

      return statsMap;
    } finally {
      await queryRunner.release();
    }
  }
}
