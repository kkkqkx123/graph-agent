import { injectable, inject } from 'inversify';
import { WorkflowRepository as IWorkflowRepository, WorkflowQueryOptions } from '../../../../domain/workflow/repositories/workflow-repository';
import { Workflow } from '../../../../domain/workflow/entities/workflow';
import { ID } from '../../../../domain/common/value-objects/id';
import { WorkflowStatus } from '../../../../domain/workflow/value-objects/workflow-status';
import { WorkflowType } from '../../../../domain/workflow/value-objects/workflow-type';
import { NodeType } from '../../../../domain/workflow/value-objects/node-type';
import { EdgeType } from '../../../../domain/workflow/value-objects/edge-type';
import { WorkflowModel } from '../../models/workflow.model';
import { IQueryOptions, PaginatedResult } from '../../../../domain/common/repositories/repository';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';
import { In } from 'typeorm';
import { BaseRepository, QueryOptions } from '../../base/base-repository';
import { ConnectionManager } from '../../connections/connection-manager';
import {
  IdConverter,
  OptionalIdConverter,
  TimestampConverter,
  VersionConverter,
  MetadataConverter
} from '../../base/type-converter-base';
import { WorkflowStatusConverter } from '../../base/workflow-status-converter';
import { WorkflowTypeConverter } from '../../base/workflow-type-converter';

/**
 * 基于类型转换器的Workflow Repository
 * 
 * 直接使用类型转换器进行数据映射，消除传统的mapper层
 * 提供编译时类型安全和运行时验证
 */
@injectable()
export class WorkflowConverterRepository extends BaseRepository<Workflow, WorkflowModel, ID> implements IWorkflowRepository {
  
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }

  protected override getModelClass(): new () => WorkflowModel {
    return WorkflowModel;
  }

  /**
   * 重写toEntity方法，使用类型转换器
   */
  protected override toEntity(model: WorkflowModel): Workflow {
    try {
      // 使用类型转换器进行编译时类型安全的转换
      const workflowData = {
        id: IdConverter.fromStorage(model.id),
        name: model.name,
        description: model.description || undefined,
        status: WorkflowStatusConverter.fromStorage(model.state),
        type: WorkflowTypeConverter.fromStorage(model.executionMode),
        config: model.configuration ? model.configuration : {}, // 简化处理，实际应转换为WorkflowConfig
        nodes: new Map(),
        edges: new Map(),
        createdAt: TimestampConverter.fromStorage(model.createdAt),
        updatedAt: TimestampConverter.fromStorage(model.updatedAt),
        version: VersionConverter.fromStorage(model.revision),
        tags: model.metadata?.tags || [],
        metadata: MetadataConverter.fromStorage(model.metadata || {}),
        isDeleted: model.metadata?.isDeleted || false,
        createdBy: model.createdBy ? OptionalIdConverter.fromStorage(model.createdBy) : undefined,
        updatedBy: model.updatedBy ? OptionalIdConverter.fromStorage(model.updatedBy) : undefined
      };

      // 创建Workflow实体
      return Workflow.fromProps(workflowData);
    } catch (error) {
      throw new RepositoryError(
        `Workflow模型转换失败: ${error instanceof Error ? error.message : String(error)}`,
        'MAPPING_ERROR',
        { modelId: model.id, operation: 'toEntity' }
      );
    }
  }

  /**
   * 重写toModel方法，使用类型转换器
   */
  protected override toModel(entity: Workflow): WorkflowModel {
    try {
      const model = new WorkflowModel();
      
      // 使用类型转换器进行编译时类型安全的转换
      model.id = IdConverter.toStorage(entity.workflowId);
      model.name = entity.name;
      model.description = entity.description || undefined;
      model.state = WorkflowStatusConverter.toStorage(entity.status);
      model.executionMode = WorkflowTypeConverter.toStorage(entity.type);
      model.metadata = MetadataConverter.toStorage({
        ...entity.metadata,
        tags: entity.tags,
        isDeleted: entity.isDeleted()
      });
      model.configuration = entity.config; // 简化处理，实际应转换为存储格式
      model.version = entity.version.toString();
      model.revision = VersionConverter.toStorage(entity.version);
      model.createdBy = entity.createdBy ? OptionalIdConverter.toStorage(entity.createdBy) : undefined;
      model.updatedBy = entity.updatedBy ? OptionalIdConverter.toStorage(entity.updatedBy) : undefined;
      model.createdAt = TimestampConverter.toStorage(entity.createdAt);
      model.updatedAt = TimestampConverter.toStorage(entity.updatedAt);
      
      return model;
    } catch (error) {
      throw new RepositoryError(
        `Workflow实体转换失败: ${error instanceof Error ? error.message : String(error)}`,
        'MAPPING_ERROR',
        { entityId: entity.workflowId.value, operation: 'toModel' }
      );
    }
  }

  /**
   * 根据名称查找工作流
   */
  async findByName(name: string, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.name = :name', { name });
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  /**
   * 根据状态查找工作流
   */
  async findByStatus(status: WorkflowStatus, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.state = :state', { state: this.mapStatusToState(status) });
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  /**
   * 根据类型查找工作流
   */
  async findByType(type: WorkflowType, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.executionMode = :type', { type: this.mapTypeToExecutionMode(type) });
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  /**
   * 根据标签查找工作流
   */
  async findByTags(tags: string[], options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.metadata->>\'tags\' @> :tags', { tags: JSON.stringify(tags) });
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  /**
   * 根据创建者查找工作流
   */
  async findByCreatedBy(createdBy: ID, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.createdBy = :createdBy', { createdBy: createdBy.value });
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  /**
   * 查找草稿工作流
   */
  async findDraftWorkflows(options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.draft(), options);
  }

  /**
   * 查找活跃工作流
   */
  async findActiveWorkflows(options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.active(), options);
  }

  /**
   * 查找非活跃工作流
   */
  async findInactiveWorkflows(options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.inactive(), options);
  }

  /**
   * 查找已归档工作流
   */
  async findArchivedWorkflows(options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.archived(), options);
  }

  /**
   * 根据名称搜索工作流
   */
  async searchByName(name: string, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.name LIKE :name', { name: `%${name}%` });
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  /**
   * 根据描述搜索工作流
   */
  async searchByDescription(description: string, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.description LIKE :description', { description: `%${description}%` });
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  /**
   * 分页查询工作流
   */
  override async findWithPagination(options: WorkflowQueryOptions): Promise<PaginatedResult<Workflow>> {
    const queryOptions: QueryOptions<WorkflowModel> = {
      customConditions: (qb: any) => {
        this.applyCommonConditions(qb, options);
        
        if (options?.minExecutionCount) {
          qb.andWhere('workflow.metadata->>\'executionCount\' >= :minExecutionCount', {
            minExecutionCount: options.minExecutionCount
          });
        }

        if (options?.maxExecutionCount) {
          qb.andWhere('workflow.metadata->>\'executionCount\' <= :maxExecutionCount', {
            maxExecutionCount: options.maxExecutionCount
          });
        }
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit || 20,
      offset: options?.offset || 0
    };
    
    return super.findWithPagination(queryOptions);
  }

  /**
   * 统计指定状态的工作流数量
   */
  async countByStatus(status: WorkflowStatus, options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.state = :state', { state: this.mapStatusToState(status) });

    this.applyCommonConditions(queryBuilder, options);

    return await queryBuilder.getCount();
  }

  /**
   * 统计指定类型的工作流数量
   */
  async countByType(type: WorkflowType, options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.executionMode = :type', { type: this.mapTypeToExecutionMode(type) });

    this.applyCommonConditions(queryBuilder, options);

    return await queryBuilder.getCount();
  }

  /**
   * 统计指定创建者的工作流数量
   */
  async countByCreatedBy(createdBy: ID, options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.createdBy = :createdBy', { createdBy: createdBy.value });

    this.applyCommonConditions(queryBuilder, options);

    return await queryBuilder.getCount();
  }

  /**
   * 统计包含指定标签的工作流数量
   */
  async countByTags(tags: string[], options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.metadata->>\'tags\' @> :tags', { tags: JSON.stringify(tags) });

    this.applyCommonConditions(queryBuilder, options);

    return await queryBuilder.getCount();
  }

  /**
   * 检查是否存在同名工作流
   */
  async existsByName(name: string, excludeId?: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
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
  async getMostActiveWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.orderBy('workflow.metadata->>\'executionCount\'', 'DESC');
        this.applyCommonConditions(qb, options);
      },
      limit
    });
  }

  /**
   * 获取最近创建的工作流
   */
  async getRecentlyCreatedWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.orderBy('workflow.createdAt', 'DESC');
        this.applyCommonConditions(qb, options);
      },
      limit
    });
  }

  /**
   * 获取最复杂的工作流
   */
  async getMostComplexWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.orderBy('(workflow.metadata->>\'nodeCount\' + workflow.metadata->>\'edgeCount\')', 'DESC');
        this.applyCommonConditions(qb, options);
      },
      limit
    });
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
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const updateData: any = {
      state: this.mapStatusToState(status),
      updatedAt: new Date()
    };

    if (changedBy) {
      updateData.updatedBy = changedBy.value;
    }

    const result = await repository.createQueryBuilder()
      .update(WorkflowModel)
      .set(updateData)
      .where('id IN (:...workflowIds)', { workflowIds: workflowIds.map(id => id.value) })
      .execute();

    return result.affected || 0;
  }

  /**
   * 批量删除工作流
   */
  async batchDelete(workflowIds: ID[]): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const result = await repository.delete({ id: In(workflowIds.map(id => id.value)) });
    return result.affected || 0;
  }

  /**
   * 软删除工作流
   */
  override async softDelete(workflowId: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    await repository.update({ id: workflowId.value }, {
      state: 'archived',
      updatedAt: new Date()
    });
  }

  /**
   * 批量软删除工作流
   */
  override async batchSoftDelete(workflowIds: ID[]): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const result = await repository.createQueryBuilder()
      .update(WorkflowModel)
      .set({
        state: 'archived',
        updatedAt: new Date()
      })
      .where('id IN (:...workflowIds)', { workflowIds: workflowIds.map(id => id.value) })
      .execute();

    return result.affected || 0;
  }

  /**
   * 恢复软删除的工作流
   */
  override async restoreSoftDeleted(workflowId: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    await repository.update({ id: workflowId.value }, {
      state: 'draft',
      updatedAt: new Date()
    });
  }

  /**
   * 查找软删除的工作流
   */
  override async findSoftDeleted(options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('workflow.isDeleted = true');
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'updatedAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  /**
   * 根据节点ID查找工作流
   */
  async findByNodeId(nodeId: ID, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.metadata->>\'nodeIds\' @> :nodeId', { nodeId: JSON.stringify([nodeId.value]) });
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  /**
   * 根据边ID查找工作流
   */
  async findByEdgeId(edgeId: ID, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.metadata->>\'edgeIds\' @> :edgeId', { edgeId: JSON.stringify([edgeId.value]) });
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  /**
   * 根据节点类型查找工作流
   */
  async findByNodeType(nodeType: NodeType, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.metadata->>\'nodeTypes\' @> :nodeType', { nodeType: JSON.stringify([nodeType.value]) });
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  /**
   * 根据边类型查找工作流
   */
  async findByEdgeType(edgeType: EdgeType, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.metadata->>\'edgeTypes\' @> :edgeType', { edgeType: JSON.stringify([edgeType.value]) });
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'createdAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

  /**
   * 获取工作流标签统计信息
   */
  async getWorkflowTagStats(options?: WorkflowQueryOptions): Promise<Record<string, number>> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .select("jsonb_array_elements_text(workflow.metadata->'tags')", 'tag')
      .addSelect('COUNT(*)', 'count');

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    const stats = await queryBuilder
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
   * 应用通用查询条件
   */
  private applyCommonConditions(qb: any, options?: WorkflowQueryOptions): void {
    if (options?.includeDeleted === false) {
      qb.andWhere('workflow.isDeleted = false');
    }

    if (options?.name) {
      qb.andWhere('workflow.name LIKE :name', { name: `%${options.name}%` });
    }

    if (options?.status) {
      qb.andWhere('workflow.state = :status', { status: options.status });
    }

    if (options?.type) {
      qb.andWhere('workflow.executionMode = :type', { type: options.type });
    }

    if (options?.createdBy) {
      qb.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }
  }

  private mapStatusToState(status: WorkflowStatus): string {
    if (status.isDraft()) return 'draft';
    if (status.isActive()) return 'active';
    if (status.isInactive()) return 'inactive';
    if (status.isArchived()) return 'archived';
    return 'draft';
  }

  private mapTypeToExecutionMode(type: WorkflowType): string {
    if (type.isSequential()) return 'sequential';
    if (type.isParallel()) return 'parallel';
    if (type.isConditional()) return 'conditional';
    return 'sequential';
  }
}