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
import { ErrorHandlingStrategyFactory } from '../../../../domain/workflow/strategies/error-handling-strategy';
import { ExecutionStrategyFactory } from '../../../../domain/workflow/strategies/execution-strategy';

/**
 * 基于类型转换器的Workflow Repository
 * 
 * 直接使用类型转换器进行数据映射，消除传统的mapper层
 * 提供编译时类型安全和运行时验证
 */
@injectable()
export class WorkflowConverterRepository extends BaseRepository<Workflow, WorkflowModel, ID> implements IWorkflowRepository {

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
      // 使用类型转换器进行编译时类型安全的转换
      // 创建工作流定义
      const definition = WorkflowDefinition.fromProps({
        id: IdConverter.fromStorage(model.id),
        name: model.name,
        description: model.description || undefined,
        status: WorkflowStatusConverter.fromStorage(model.state),
        type: WorkflowTypeConverter.fromStorage(model.executionMode),
        config: model.configuration ? model.configuration : {}, // 简化处理，实际应转换为WorkflowConfig
        errorHandlingStrategy: ErrorHandlingStrategyFactory.default(),
        executionStrategy: ExecutionStrategyFactory.default(),
        tags: model.metadata?.tags || [],
        metadata: MetadataConverter.fromStorage(model.metadata || {}),
        isDeleted: model.metadata?.isDeleted || false,
        createdAt: TimestampConverter.fromStorage(model.createdAt),
        updatedAt: TimestampConverter.fromStorage(model.updatedAt),
        version: VersionConverter.fromStorage(model.revision),
        createdBy: model.createdBy ? OptionalIdConverter.fromStorage(model.createdBy) : undefined,
        updatedBy: model.updatedBy ? OptionalIdConverter.fromStorage(model.updatedBy) : undefined
      });

      // 创建工作流图数据
      const graph = {
        nodes: new Map(),
        edges: new Map()
      };

      const workflowProps = {
        id: IdConverter.fromStorage(model.id),
        definition,
        graph,
        createdAt: TimestampConverter.fromStorage(model.createdAt),
        updatedAt: TimestampConverter.fromStorage(model.updatedAt),
        version: VersionConverter.fromStorage(model.revision),
        createdBy: model.createdBy ? OptionalIdConverter.fromStorage(model.createdBy) : undefined,
        updatedBy: model.updatedBy ? OptionalIdConverter.fromStorage(model.updatedBy) : undefined
      };

      // 创建Workflow实体
      return Workflow.fromProps(workflowProps);
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
  async findByName(name: string): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.name = :name', { name });
      }
    });
  }

  /**
   * 根据状态查找工作流
   */
  async findByStatus(status: WorkflowStatus): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.state = :state', { state: this.mapStatusToState(status) });
      }
    });
  }

  /**
   * 根据类型查找工作流
   */
  async findByType(type: WorkflowType): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.executionMode = :type', { type: this.mapTypeToExecutionMode(type) });
      }
    });
  }

  /**
   * 根据标签查找工作流
   */
  async findByTags(tags: string[]): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.metadata->>\'tags\' @> :tags', { tags: JSON.stringify(tags) });
      }
    });
  }

  /**
   * 根据创建者查找工作流
   */
  async findByCreatedBy(createdBy: ID): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.createdBy = :createdBy', { createdBy: createdBy.value });
      }
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
   * 根据名称搜索工作流
   */
  async searchByName(name: string): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.name LIKE :name', { name: `%${name}%` });
      }
    });
  }

  /**
   * 根据描述搜索工作流
   */
  async searchByDescription(description: string): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.description LIKE :description', { description: `%${description}%` });
      }
    });
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
  async getMostActiveWorkflows(limit: number): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.orderBy('workflow.metadata->>\'executionCount\'', 'DESC');
      },
      limit
    });
  }

  /**
   * 获取最近创建的工作流
   */
  async getRecentlyCreatedWorkflows(limit: number): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.orderBy('workflow.createdAt', 'DESC');
      },
      limit
    });
  }

  /**
   * 获取最复杂的工作流
   */
  async getMostComplexWorkflows(limit: number): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.orderBy('(workflow.metadata->>\'nodeCount\' + workflow.metadata->>\'edgeCount\')', 'DESC');
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
  override async findSoftDeleted(): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb) => {
        qb.andWhere('workflow.isDeleted = true');
      }
    });
  }

  /**
   * 根据节点ID查找工作流
   */
  async findByNodeId(nodeId: ID): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.metadata->>\'nodeIds\' @> :nodeId', { nodeId: JSON.stringify([nodeId.value]) });
      }
    });
  }

  /**
   * 根据边ID查找工作流
   */
  async findByEdgeId(edgeId: ID): Promise<Workflow[]> {
    return this.find({
      customConditions: (qb: any) => {
        qb.andWhere('workflow.metadata->>\'edgeIds\' @> :edgeId', { edgeId: JSON.stringify([edgeId.value]) });
      }
    });
  }

  /**
   * 获取工作流标签统计信息
   */
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

/**
 * 工作流状态类型转换器
 * 将字符串状态转换为WorkflowStatus值对象
 */
export interface WorkflowStatusConverter {
  fromStorage: (value: string) => WorkflowStatus;
  toStorage: (value: WorkflowStatus) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: WorkflowStatus) => boolean;
}

export const WorkflowStatusConverter: WorkflowStatusConverter = {
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
export interface WorkflowTypeConverter {
  fromStorage: (value: string) => WorkflowType;
  toStorage: (value: WorkflowType) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: WorkflowType) => boolean;
}

export const WorkflowTypeConverter: WorkflowTypeConverter = {
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