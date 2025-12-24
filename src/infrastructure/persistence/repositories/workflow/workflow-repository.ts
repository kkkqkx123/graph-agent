import { injectable, inject } from 'inversify';
import { WorkflowRepository as IWorkflowRepository } from '../../../../domain/workflow/repositories/workflow-repository';
import { Workflow } from '../../../../domain/workflow/entities/workflow';
import { WorkflowDefinition } from '../../../../domain/workflow/value-objects/workflow-definition';
import { GraphValidationService } from '../../../../domain/workflow/interfaces/graph-validation-service.interface';
import { ID } from '../../../../domain/common/value-objects/id';
import { WorkflowStatus } from '../../../../domain/workflow/value-objects/workflow-status';
import { WorkflowType } from '../../../../domain/workflow/value-objects/workflow-type';
import { WorkflowModel } from '../../models/workflow.model';
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

/**
 * 工作流状态类型转换器
 * 将字符串状态转换为WorkflowStatus值对象
 */
interface WorkflowStatusConverter {
  fromStorage: (value: string) => WorkflowStatus;
  toStorage: (value: WorkflowStatus) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: WorkflowStatus) => boolean;
}

const WorkflowStatusConverter: WorkflowStatusConverter = {
  fromStorage: (value: string) => {
    return WorkflowStatus.fromString(value);
  },
  toStorage: (value: WorkflowStatus) => value.getValue(),
  validateStorage: (value: string) => {
    const validStates = ['draft', 'active', 'inactive', 'archived'];
    return typeof value === 'string' && validStates.includes(value);
  },
  validateDomain: (value: WorkflowStatus) => {
    return value instanceof WorkflowStatus;
  }
};

/**
 * 工作流类型类型转换器
 * 将字符串类型转换为WorkflowType值对象
 */
interface WorkflowTypeConverter {
  fromStorage: (value: string) => WorkflowType;
  toStorage: (value: WorkflowType) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: WorkflowType) => boolean;
}

const WorkflowTypeConverter: WorkflowTypeConverter = {
  fromStorage: (value: string) => {
    return WorkflowType.fromString(value);
  },
  toStorage: (value: WorkflowType) => value.getValue(),
  validateStorage: (value: string) => {
    const validTypes = ['sequential', 'parallel', 'conditional', 'loop', 'custom'];
    return typeof value === 'string' && validTypes.includes(value);
  },
  validateDomain: (value: WorkflowType) => {
    return value instanceof WorkflowType;
  }
};

@injectable()
export class WorkflowRepository extends BaseRepository<Workflow, WorkflowModel, ID> implements IWorkflowRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager,
    @inject('GraphValidationService') private readonly graphValidationService: GraphValidationService
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
      // 创建工作流定义
      const definition = WorkflowDefinition.fromProps({
        id: IdConverter.fromStorage(model.id),
        name: model.name,
        description: model.description || undefined,
        status: WorkflowStatusConverter.fromStorage(model.state),
        type: WorkflowTypeConverter.fromStorage(model.executionMode),
        config: model.configuration ? model.configuration : {}, // 简化处理，实际应转换为WorkflowConfig
        errorHandlingStrategy: {} as any, // 临时处理
        executionStrategy: {} as any, // 临时处理
        createdAt: TimestampConverter.fromStorage(model.createdAt),
        updatedAt: TimestampConverter.fromStorage(model.updatedAt),
        version: VersionConverter.fromStorage(model.revision),
        tags: model.metadata?.tags || [],
        metadata: MetadataConverter.fromStorage(model.metadata || {}),
        isDeleted: model.metadata?.isDeleted || false,
        createdBy: model.createdBy ? OptionalIdConverter.fromStorage(model.createdBy) : undefined,
        updatedBy: model.updatedBy ? OptionalIdConverter.fromStorage(model.updatedBy) : undefined
      });

      // 创建工作流图数据
      const graph = {
        nodes: new Map(),
        edges: new Map()
      };

      // 创建Workflow实体
      return Workflow.fromProps({
        id: IdConverter.fromStorage(model.id),
        definition,
        graph,
        createdAt: TimestampConverter.fromStorage(model.createdAt),
        updatedAt: TimestampConverter.fromStorage(model.updatedAt),
        version: VersionConverter.fromStorage(model.revision),
        createdBy: model.createdBy ? OptionalIdConverter.fromStorage(model.createdBy) : undefined,
        updatedBy: model.updatedBy ? OptionalIdConverter.fromStorage(model.updatedBy) : undefined
      });
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
        isDeleted: entity.isDeleted(),
        definition: entity.getDefinition(),
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

  // 基础 CRUD 方法现在由 BaseRepository 提供，无需重复实现

  async findByName(name: string): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.name = :name', { name });
      }
    });
  }

  async findByStatus(status: WorkflowStatus): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.state = :state', { state: this.mapStatusToState(status) });
      }
    });
  }

  async findByType(type: WorkflowType): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.executionMode = :type', { type: this.mapTypeToExecutionMode(type) });
      }
    });
  }

  async findByTags(tags: string[]): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.metadata->>\'tags\' @> :tags', { tags: JSON.stringify(tags) });
      }
    });
  }

  async findByCreatedBy(createdBy: ID): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.createdBy = :createdBy', { createdBy: createdBy.value });
      }
    });
  }

  async findDraftWorkflows(): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.draft());
  }

  async findActiveWorkflows(): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.active());
  }

  async findInactiveWorkflows(): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.inactive());
  }

  async findArchivedWorkflows(): Promise<Workflow[]> {
    return this.findByStatus(WorkflowStatus.archived());
  }

  async searchByName(name: string): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.name LIKE :name', { name: `%${name}%` });
      }
    });
  }

  async searchByDescription(description: string): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.description LIKE :description', { description: `%${description}%` });
      }
    });
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

  async getMostActiveWorkflows(limit: number): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.orderBy('workflow.metadata->>\'executionCount\'', 'DESC');
      },
      limit
    });
  }

  async getRecentlyCreatedWorkflows(limit: number): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.orderBy('workflow.createdAt', 'DESC');
      },
      limit
    });
  }

  async getMostComplexWorkflows(limit: number): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.orderBy('(workflow.metadata->>\'nodeCount\' + workflow.metadata->>\'edgeCount\')', 'DESC');
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

  override async softDelete(workflowId: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    await repository.update({ id: workflowId.value }, {
      state: 'archived',
      updatedAt: new Date()
    });
  }

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

  override async restoreSoftDeleted(workflowId: ID): Promise<void> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    await repository.update({ id: workflowId.value }, {
      state: 'draft',
      updatedAt: new Date()
    });
  }

  override async findSoftDeleted(): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('workflow.isDeleted = true');
      }
    });
  }

  async findByNodeId(nodeId: ID): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.metadata->>\'nodeIds\' @> :nodeId', { nodeId: JSON.stringify([nodeId.value]) });
      }
    });
  }

  async findByEdgeId(edgeId: ID): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.metadata->>\'edgeIds\' @> :edgeId', { edgeId: JSON.stringify([edgeId.value]) });
      }
    });
  }

  async getWorkflowTagStats(): Promise<Record<string, number>> {
    const connection = await this.connectionManager.getConnection();
    const repository = connection.getRepository(WorkflowModel);

    const stats = await repository.createQueryBuilder('workflow')
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