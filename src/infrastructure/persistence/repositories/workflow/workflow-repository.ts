import { injectable, inject } from 'inversify';
import { WorkflowRepository as IWorkflowRepository, WorkflowQueryOptions } from '../../../../domain/workflow/repositories/workflow-repository';
import { Workflow } from '../../../../domain/workflow/entities/workflow';
import { ID } from '../../../../domain/common/value-objects/id';
import { WorkflowStatus } from '../../../../domain/workflow/value-objects/workflow-status';
import { WorkflowType } from '../../../../domain/workflow/value-objects/workflow-type';
import { NodeType } from '../../../../domain/workflow/value-objects/node-type';
import { EdgeType } from '../../../../domain/workflow/value-objects/edge-type';
import { ConnectionManager } from '../../connections/connection-manager';
import { WorkflowMapper } from './workflow-mapper';
import { WorkflowModel } from '../../models/workflow.model';
import { IQueryOptions, PaginatedResult } from '../../../../domain/common/repositories/repository';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';
import { In } from 'typeorm';
import { BaseRepository, QueryOptions } from '../../base/base-repository';

@injectable()
export class WorkflowRepository extends BaseRepository<Workflow, WorkflowModel, ID> implements IWorkflowRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager,
    @inject('WorkflowMapper') mapper: WorkflowMapper
  ) {
    super(connectionManager);
    this.mapper = mapper;
  }

  protected override getModelClass(): new () => WorkflowModel {
    return WorkflowModel;
  }

  // 基础 CRUD 方法现在由 BaseRepository 提供，无需重复实现

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

  async findDraftWorkflows(options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.draft(), options);
  }

  async findActiveWorkflows(options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.active(), options);
  }

  async findInactiveWorkflows(options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.inactive(), options);
  }

  async findArchivedWorkflows(options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.archived(), options);
  }

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

  async countByStatus(status: WorkflowStatus, options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.state = :state', { state: this.mapStatusToState(status) });

    this.applyCommonConditions(queryBuilder, options);

    return await queryBuilder.getCount();
  }

  async countByType(type: WorkflowType, options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.executionMode = :type', { type: this.mapTypeToExecutionMode(type) });

    this.applyCommonConditions(queryBuilder, options);

    return await queryBuilder.getCount();
  }

  async countByCreatedBy(createdBy: ID, options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.createdBy = :createdBy', { createdBy: createdBy.value });

    this.applyCommonConditions(queryBuilder, options);

    return await queryBuilder.getCount();
  }

  async countByTags(tags: string[], options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.metadata->>\'tags\' @> :tags', { tags: JSON.stringify(tags) });

    this.applyCommonConditions(queryBuilder, options);

    return await queryBuilder.getCount();
  }

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

  async getMostActiveWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.orderBy('workflow.metadata->>\'executionCount\'', 'DESC');
        this.applyCommonConditions(qb, options);
      },
      limit
    });
  }

  async getRecentlyCreatedWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.orderBy('workflow.createdAt', 'DESC');
        this.applyCommonConditions(qb, options);
      },
      limit
    });
  }

  async getMostComplexWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.orderBy('(workflow.metadata->>\'nodeCount\' + workflow.metadata->>\'edgeCount\')', 'DESC');
        this.applyCommonConditions(qb, options);
      },
      limit
    });
  }

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

  async batchDelete(workflowIds: ID[]): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const result = await repository.delete({ id: In(workflowIds.map(id => id.value)) });
    return result.affected || 0;
  }

  async softDelete(workflowId: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    await repository.update({ id: workflowId.value }, {
      state: 'archived',
      updatedAt: new Date()
    });
  }

  async batchSoftDelete(workflowIds: ID[]): Promise<number> {
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

  async restoreSoftDeleted(workflowId: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    await repository.update({ id: workflowId.value }, {
      state: 'draft',
      updatedAt: new Date()
    });
  }

  async findSoftDeleted(options?: WorkflowQueryOptions): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.isDeleted = true');
        this.applyCommonConditions(qb, options);
      },
      sortBy: options?.sortBy || 'updatedAt',
      sortOrder: options?.sortOrder || 'desc',
      limit: options?.limit,
      offset: options?.offset
    });
  }

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