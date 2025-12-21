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
import { QueryOptions, PaginatedResult } from '../../../../domain/common/repositories/repository';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';
import { In } from 'typeorm';

@injectable()
export class WorkflowRepository implements IWorkflowRepository {
  constructor(
    @inject('ConnectionManager') private connectionManager: ConnectionManager,
    @inject('WorkflowMapper') private mapper: WorkflowMapper
  ) { }

  async save(workflow: Workflow): Promise<Workflow> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const model = this.mapper.toModel(workflow);
    const savedModel = await repository.save(model);

    return this.mapper.toEntity(savedModel);
  }

  async findById(id: ID): Promise<Workflow | null> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const model = await repository.findOne({ where: { id: id.value } });
    return model ? this.mapper.toEntity(model) : null;
  }

  async findByIdOrFail(id: ID): Promise<Workflow> {
    const workflow = await this.findById(id);
    if (!workflow) {
      throw new RepositoryError(`Workflow with ID ${id.value} not found`);
    }
    return workflow;
  }

  async findAll(): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const models = await repository.find();
    return models.map(model => this.mapper.toEntity(model));
  }

  async find(options: QueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow');

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`workflow.${key} = :${key}`, { [key]: value });
        }
      });
    }

    if (options.sortBy) {
      const order = options.sortOrder === 'desc' ? 'DESC' : 'ASC';
      queryBuilder.orderBy(`workflow.${options.sortBy}`, order);
    }

    if (options.offset) {
      queryBuilder.skip(options.offset);
    }

    if (options.limit) {
      queryBuilder.take(options.limit);
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findOne(options: QueryOptions): Promise<Workflow | null> {
    const results = await this.find({ ...options, limit: 1 });
    return results[0] ?? null;
  }

  async findOneOrFail(options: QueryOptions): Promise<Workflow> {
    const workflow = await this.findOne(options);
    if (!workflow) {
      throw new RepositoryError('Workflow not found with given criteria');
    }
    return workflow;
  }

  async findWithPaginationBase(options: QueryOptions): Promise<PaginatedResult<Workflow>> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const page = options.offset ? Math.floor(options.offset / (options.limit || 10)) + 1 : 1;
    const pageSize = options.limit || 10;
    const skip = (page - 1) * pageSize;

    const queryBuilder = repository.createQueryBuilder('workflow');

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`workflow.${key} = :${key}`, { [key]: value });
        }
      });
    }

    const [models, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .orderBy('workflow.createdAt', 'DESC')
      .getManyAndCount();

    const totalPages = Math.ceil(total / pageSize);

    return {
      items: models.map(model => this.mapper.toEntity(model)),
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async saveBatch(workflows: Workflow[]): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const models = workflows.map(workflow => this.mapper.toModel(workflow));
    const savedModels = await repository.save(models);

    return savedModels.map(model => this.mapper.toEntity(model));
  }

  async delete(entity: Workflow): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    await repository.delete({ id: entity.workflowId.value });
  }

  async deleteById(id: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    await repository.delete({ id: id.value });
  }

  async deleteBatch(entities: Workflow[]): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const ids = entities.map(entity => entity.workflowId.value);
    await repository.delete({ id: In(ids) });
  }

  async deleteWhere(options: QueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow').delete();

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`workflow.${key} = :${key}`, { [key]: value });
        }
      });
    }

    const result = await queryBuilder.execute();
    return result.affected || 0;
  }

  async exists(id: ID): Promise<boolean> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const count = await repository.count({ where: { id: id.value } });
    return count > 0;
  }

  async count(options?: QueryOptions): Promise<number> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    if (!options || !options.filters) {
      return repository.count();
    }

    const queryBuilder = repository.createQueryBuilder('workflow');

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryBuilder.andWhere(`workflow.${key} = :${key}`, { [key]: value });
        }
      });
    }

    return queryBuilder.getCount();
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

    if (options?.sortBy) {
      queryBuilder.orderBy(`workflow.${options.sortBy}`, (options.sortOrder || 'ASC').toUpperCase() as 'ASC' | 'DESC');
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

    if (options?.sortBy) {
      queryBuilder.orderBy(`workflow.${options.sortBy}`, (options.sortOrder || 'ASC').toUpperCase() as 'ASC' | 'DESC');
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

    if (options?.sortBy) {
      queryBuilder.orderBy(`workflow.${options.sortBy}`, (options.sortOrder || 'ASC').toUpperCase() as 'ASC' | 'DESC');
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

    if (options?.sortBy) {
      queryBuilder.orderBy(`workflow.${options.sortBy}`, (options.sortOrder || 'ASC').toUpperCase() as 'ASC' | 'DESC');
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
      .where('workflow.createdBy = :createdBy', { createdBy: createdBy.value });

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

    if (options?.sortBy) {
      queryBuilder.orderBy(`workflow.${options.sortBy}`, (options.sortOrder || 'ASC').toUpperCase() as 'ASC' | 'DESC');
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

    if (options?.sortBy) {
      queryBuilder.orderBy(`workflow.${options.sortBy}`, (options.sortOrder || 'ASC').toUpperCase() as 'ASC' | 'DESC');
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

    if (options?.sortBy) {
      queryBuilder.orderBy(`workflow.${options.sortBy}`, (options.sortOrder || 'ASC').toUpperCase() as 'ASC' | 'DESC');
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

    if (options?.sortBy) {
      queryBuilder.orderBy(`workflow.${options.sortBy}`, (options.sortOrder || 'ASC').toUpperCase() as 'ASC' | 'DESC');
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
      queryBuilder.andWhere('workflow.id != :excludeId', { excludeId: excludeId.value });
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

  async getMostComplexWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .orderBy('(workflow.metadata->>\'nodeCount\' + workflow.metadata->>\'edgeCount\')', 'DESC')
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

  async findByNodeId(nodeId: ID, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.metadata->>\'nodeIds\' @> :nodeId', { nodeId: JSON.stringify([nodeId.value]) });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByEdgeId(edgeId: ID, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.metadata->>\'edgeIds\' @> :edgeId', { edgeId: JSON.stringify([edgeId.value]) });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByNodeType(nodeType: NodeType, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.metadata->>\'nodeTypes\' @> :nodeType', { nodeType: JSON.stringify([nodeType.value]) });

    if (options?.includeDeleted === false) {
      queryBuilder.andWhere('workflow.isDeleted = false');
    }

    if (options?.status) {
      queryBuilder.andWhere('workflow.state = :status', { status: options.status });
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.mapper.toEntity(model));
  }

  async findByEdgeType(edgeType: EdgeType, options?: WorkflowQueryOptions): Promise<Workflow[]> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const queryBuilder = repository.createQueryBuilder('workflow')
      .where('workflow.metadata->>\'edgeTypes\' @> :edgeType', { edgeType: JSON.stringify([edgeType.value]) });

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

    if (options?.sortBy) {
      queryBuilder.orderBy(`workflow.${options.sortBy}`, (options.sortOrder || 'ASC').toUpperCase() as 'ASC' | 'DESC');
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