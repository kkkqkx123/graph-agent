import { injectable, inject } from 'inversify';
import { WorkflowRepository as IWorkflowRepository, WorkflowQueryOptions } from '../../../../domain/workflow/repositories/workflow-repository';
import { Workflow } from '../../../../domain/workflow/entities/workflow';
import { ID } from '../../../../domain/common/value-objects/id';
import { WorkflowStatus } from '../../../../domain/workflow/value-objects/workflow-status';
import { WorkflowType } from '../../../../domain/workflow/value-objects/workflow-type';
import { ConnectionManager } from '../../connections/connection-manager';
import { WorkflowMapper } from './workflow-mapper';
import { WorkflowModel } from '../../models/workflow.model';
import { QueryOptions, PaginatedResult } from '../../../../domain/common/repositories/repository';

@injectable()
export class WorkflowRepository implements IWorkflowRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('WorkflowMapper') private mapper: WorkflowMapper
  ) {}

  async save(workflow: Workflow): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const model = this.mapper.toModel(workflow);
    await repository.save(model);
  }

  async findById(id: ID): Promise<Workflow | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const model = await repository.findOne({ where: { id: id.value } });
    if (!model) {
      return null;
    }
    
    return this.mapper.toEntity(model);
  }

  async findAll(): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const models = await repository.find();
    return models.map(model => this.mapper.toEntity(model));
  }

  async delete(id: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    await repository.delete(id.getValue());
  }

  async exists(id: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const count = await repository.count({ where: { id: id.value } });
    return count > 0;
  }

  async findByName(name: string, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.name = :name', { name });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    if (options?.type) {
      queryBuilder.andWhere('workflow.executionMode = :type', { type: options.type });
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`workflow.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('workflow.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByStatus(status: WorkflowStatus, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.state = :state', { state: this.mapStatusToState(status) });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.name) {
      queryBuilder.andWhere('workflow.name LIKE :name', { name: `%${options.name}%` });
    }

    if (options?.type) {
      queryBuilder.andWhere('workflow.executionMode = :type', { type: options.type });
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`workflow.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('workflow.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByType(type: WorkflowType, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.executionMode = :type', { type: this.mapTypeToExecutionMode(type) });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.name) {
      queryBuilder.andWhere('workflow.name LIKE :name', { name: `%${options.name}%` });
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`workflow.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('workflow.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByTags(tags: string[], options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.metadata->>\'tags\' @> :tags', { tags: JSON.stringify(tags) });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.name) {
      queryBuilder.andWhere('workflow.name LIKE :name', { name: `%${options.name}%` });
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    if (options?.type) {
      queryBuilder.andWhere('workflow.executionMode = :type', { type: options.type });
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`workflow.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('workflow.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByCreatedBy(createdBy: ID, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.createdBy = :createdBy', { createdBy: createdBy.getValue() });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.name) {
      queryBuilder.andWhere('workflow.name LIKE :name', { name: `%${options.name}%` });
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    if (options?.type) {
      queryBuilder.andWhere('workflow.executionMode = :type', { type: options.type });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`workflow.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('workflow.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
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
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.name LIKE :name', { name: `%${name}%` });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    if (options?.type) {
      queryBuilder.andWhere('workflow.executionMode = :type', { type: options.type });
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`workflow.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('workflow.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async searchByDescription(description: string, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.description LIKE :description', { description: `%${description}%` });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.name) {
      queryBuilder.andWhere('workflow.name LIKE :name', { name: `%${options.name}%` });
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    if (options?.type) {
      queryBuilder.andWhere('workflow.executionMode = :type', { type: options.type });
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`workflow.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('workflow.createdAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findWithPagination(options: WorkflowQueryOptions): Promise<PaginatedResult<Workflow>> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow');

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.name) {
      queryBuilder.andWhere('workflow.name LIKE :name', { name: `%${options.name}%` });
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    if (options?.type) {
      queryBuilder.andWhere('workflow.executionMode = :type', { type: options.type });
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    if (options?.minExecutionCount) {
      queryBuilder.andWhere('workflow.metadata->>\'executionCount\' >= :minExecutionCount', { 
        minExecutionCount: options.minExecutionCount 
      });
    }

    if (options?.maxExecutionCount) {
      queryBuilder.andWhere('workflow.metadata->>\'executionCount\' <= :maxExecutionCount', { 
        maxExecutionCount: options.maxExecutionCount 
      });
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`workflow.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('workflow.createdAt', 'DESC');
    }

    const [models, total] = await queryBuilder
      .skip(options.offset || 0)
      .take(options.limit || 20)
      .getManyAndCount();

    return {
      items: models.map(model => this.mapper.toEntity(model)),
      total,
      page: Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
      pageSize: options.limit || 20,
      totalPages: Math.ceil(total / (options.limit || 20))
    };
  }

  async countByStatus(status: WorkflowStatus, options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.state = :state', { state: this.mapStatusToState(status) });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    return await queryBuilder.getCount();
  }

  async countByType(type: WorkflowType, options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.executionMode = :type', { type: this.mapTypeToExecutionMode(type) });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    return await queryBuilder.getCount();
  }

  async countByCreatedBy(createdBy: ID, options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.createdBy = :createdBy', { createdBy: createdBy.value });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    return await queryBuilder.getCount();
  }

  async countByTags(tags: string[], options?: WorkflowQueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.metadata->>\'tags\' @> :tags', { tags: JSON.stringify(tags) });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    return await queryBuilder.getCount();
  }

  async existsByName(name: string, excludeId?: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.name = :name', { name });

    if (excludeId) {
      queryBuilder.andWhere('workflow.id != :excludeId', { excludeId: excludeId.getValue() });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  async getMostActiveWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .orderBy('workflow.metadata->>\'executionCount\'', 'DESC')
      .take(limit);

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async getRecentlyCreatedWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .orderBy('workflow.createdAt', 'DESC')
      .take(limit);

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async getRecentlyExecutedWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .orderBy('workflow.metadata->>\'lastExecutedAt\'', 'DESC')
      .take(limit);

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async getMostSuccessfulWorkflows(
    limit: number,
    minExecutionCount: number,
    options?: WorkflowQueryOptions
  ): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.metadata->>\'executionCount\' >= :minExecutionCount', { minExecutionCount })
      .orderBy('workflow.metadata->>\'successRate\'', 'DESC')
      .take(limit);

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
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
      updateData.updatedBy = changedBy.getValue();
    }

    const result = await repository.createQueryBuilder()
      .update(WorkflowModel)
      .set(updateData)
      .where('id IN (:...workflowIds)', { workflowIds: workflowIds.map(id => id.getValue()) })
      .execute();

    return result.affected || 0;
  }

  async batchDelete(workflowIds: ID[]): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const result = await repository.delete(workflowIds.map(id => id.getValue()));
    return result.affected || 0;
  }

  async softDelete(workflowId: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    await repository.update({ id: workflowId.getValue() }, {
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
      .where('id IN (:...workflowIds)', { workflowIds: workflowIds.map(id => id.getValue()) })
      .execute();

    return result.affected || 0;
  }

  async restoreSoftDeleted(workflowId: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    await repository.update({ id: workflowId.getValue() }, {
      state: 'draft',
      updatedAt: new Date()
    });
  }

  async findSoftDeleted(options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.isDeleted = true');

    if (options?.name) {
      queryBuilder.andWhere('workflow.name LIKE :name', { name: `%${options.name}%` });
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    if (options?.type) {
      queryBuilder.andWhere('workflow.executionMode = :type', { type: options.type });
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options?.orderBy) {
      queryBuilder.orderBy(`workflow.${options.orderBy}`, options.orderDirection || 'ASC');
    } else {
      queryBuilder.orderBy('workflow.updatedAt', 'DESC');
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async getWorkflowExecutionStats(options?: WorkflowQueryOptions): Promise<{
    total: number;
    draft: number;
    active: number;
    inactive: number;
    archived: number;
    totalExecutions: number;
    totalSuccesses: number;
    totalFailures: number;
    averageSuccessRate: number;
  }> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);
    
    const queryBuilder = repository.createQueryBuilder('workflow');

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', { createdBy: options.createdBy });
    }

    const stats = await queryBuilder
      .select('workflow.state', 'state')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CAST(workflow.metadata->>\'executionCount\' AS INTEGER))', 'totalExecutions')
      .addSelect('SUM(CAST(workflow.metadata->>\'successCount\' AS INTEGER))', 'totalSuccesses')
      .addSelect('SUM(CAST(workflow.metadata->>\'failureCount\' AS INTEGER))', 'totalFailures')
      .groupBy('workflow.state')
      .getRawMany();

    const result = {
      total: 0,
      draft: 0,
      active: 0,
      inactive: 0,
      archived: 0,
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      averageSuccessRate: 0
    };

    stats.forEach(stat => {
      const count = parseInt(stat.count);
      result.total += count;
      
      switch (stat.state) {
        case 'draft':
          result.draft = count;
          break;
        case 'active':
          result.active = count;
          break;
        case 'inactive':
          result.inactive = count;
          break;
        case 'archived':
          result.archived = count;
          break;
      }

      result.totalExecutions += parseInt(stat.totalExecutions || 0);
      result.totalSuccesses += parseInt(stat.totalSuccesses || 0);
      result.totalFailures += parseInt(stat.totalFailures || 0);
    });

    if (result.totalExecutions > 0) {
      result.averageSuccessRate = result.totalSuccesses / result.totalExecutions;
    }

    return result;
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