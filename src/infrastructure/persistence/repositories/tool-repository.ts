import { injectable, inject } from 'inversify';
import { IToolRepository } from '../../../domain/tools/repositories/tool-repository';
import { Tool } from '../../../domain/tools/entities/tool';
import { ID } from '../../../domain/common/value-objects/id';
import { ToolType } from '../../../domain/tools/value-objects/tool-type';
import { ToolStatus } from '../../../domain/tools/value-objects/tool-status';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { Metadata } from '../../../domain/checkpoint/value-objects/metadata';
import { Tags } from '../../../domain/checkpoint/value-objects/tags';
import { DeletionStatus } from '../../../domain/checkpoint/value-objects/deletion-status';
import { StateData } from '../../../domain/checkpoint/value-objects/state-data';
import { ToolModel } from '../models/tool.model';
import { In } from 'typeorm';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connection-manager';

@injectable()
export class ToolRepository
  extends BaseRepository<Tool, ToolModel, ID>
  implements IToolRepository {
  constructor(@inject('ConnectionManager') connectionManager: ConnectionManager) {
    super(connectionManager);
  }

  protected getModelClass(): new () => ToolModel {
    return ToolModel;
  }

  /**
   * 重写toDomain方法
   */
  protected override toDomain(model: ToolModel): Tool {
    try {
      const id = new ID(model.id);
      const type = ToolType.fromString(model.type);
      const status = ToolStatus.fromString(model.status);
      const metadata = Metadata.create(model.metadata || {});
      const tags = Tags.create(model.tags || []);
      const createdAt = Timestamp.create(model.createdAt);
      const updatedAt = Timestamp.create(model.updatedAt);
      const version = Version.fromString(model.version);
      const createdBy = model.createdBy ? new ID(model.createdBy) : undefined;
      const dependencies = model.dependencies.map(depId => new ID(depId));

      const toolData = {
        id,
        name: model.name,
        description: model.description,
        type,
        status,
        config: StateData.create(model.config),
        parameters: model.parameters,
        returns: model.returns,
        metadata,
        createdAt,
        updatedAt,
        version,
        createdBy,
        tags,
        category: model.category,
        isBuiltin: model.isBuiltin,
        isEnabled: model.isEnabled,
        timeout: model.timeout,
        maxRetries: model.maxRetries,
        permissions: model.permissions,
        dependencies,
        deletionStatus: DeletionStatus.fromBoolean(model.isDeleted),
      };

      return Tool.fromProps(toolData);
    } catch (error) {
      const errorMessage = `Tool模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toDomain' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法
   */
  protected override toModel(entity: Tool): ToolModel {
    try {
      const model = new ToolModel();

      model.id = entity.toolId.value;
      model.name = entity.name;
      model.description = entity.description;
      model.type = entity.type.value;
      model.status = entity.status.value;
      model.config = entity.config.toRecord();
      model.parameters = entity.parameters;
      model.returns = entity.returns;
      model.metadata = entity.metadata.toRecord();
      model.version = entity.version.getValue();
      model.createdBy = entity.createdBy ? entity.createdBy.value : undefined;
      model.tags = entity.tags.toArray();
      model.category = entity.category;
      model.isBuiltin = entity.isBuiltin;
      model.isEnabled = entity.isEnabled;
      model.timeout = entity.timeout;
      model.maxRetries = entity.maxRetries;
      model.permissions = entity.permissions;
      model.dependencies = entity.dependencies.map(depId => depId.value);
      model.isDeleted = entity.isDeleted();
      model.createdAt = entity.createdAt.getDate();
      model.updatedAt = entity.updatedAt.getDate();

      return model;
    } catch (error) {
      const errorMessage = `Tool实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.toolId.value, operation: 'toModel' };
      throw customError;
    }
  }

  /**
   * 根据名称查找工具
   */
  async findByName(name: string): Promise<Tool | null> {
    const repository = await this.getRepository();
    const model = await repository.findOne({ where: { name } });
    return model ? this.toDomain(model) : null;
  }

  /**
   * 根据类型查找工具
   */
  async findByType(type: ToolType): Promise<Tool[]> {
    return this.find({
      filters: { type: type.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据状态查找工具
   */
  async findByStatus(status: ToolStatus): Promise<Tool[]> {
    return this.find({
      filters: { status: status.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据分类查找工具
   */
  async findByCategory(category: string): Promise<Tool[]> {
    return this.find({
      filters: { category },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据标签查找工具
   */
  async findByTags(tags: string[]): Promise<Tool[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('tool')
      .where('tool.tags @> :tags', { tags })
      .andWhere('tool.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('tool.createdAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 根据创建者查找工具
   */
  async findByCreatedBy(createdBy: ID): Promise<Tool[]> {
    return this.find({
      filters: { createdBy: createdBy.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 查找启用的工具
   */
  async findEnabled(): Promise<Tool[]> {
    return this.find({
      filters: { isEnabled: true },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 查找内置工具
   */
  async findBuiltin(): Promise<Tool[]> {
    return this.find({
      filters: { isBuiltin: true },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 查找自定义工具
   */
  async findCustom(): Promise<Tool[]> {
    return this.find({
      filters: { isBuiltin: false },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 查找活跃工具
   */
  async findActive(): Promise<Tool[]> {
    return this.findByStatus(ToolStatus.ACTIVE);
  }

  /**
   * 查找可用的工具
   */
  async findAvailable(): Promise<Tool[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('tool')
      .where('tool.status IN (:...statuses)', {
        statuses: [ToolStatus.ACTIVE.value, ToolStatus.INACTIVE.value]
      })
      .andWhere('tool.isEnabled = :isEnabled', { isEnabled: true })
      .andWhere('tool.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('tool.createdAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找不可用的工具
   */
  async findUnavailable(): Promise<Tool[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('tool')
      .where('tool.status IN (:...statuses)', {
        statuses: [ToolStatus.DEPRECATED.value, ToolStatus.ARCHIVED.value]
      })
      .orderBy('tool.createdAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 根据条件查找工具
   */
  async findByCriteria(criteria: {
    type?: ToolType;
    status?: ToolStatus;
    category?: string;
    tags?: string[];
    createdBy?: ID;
    isEnabled?: boolean;
    isBuiltin?: boolean;
    searchText?: string;
  }): Promise<Tool[]> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('tool');

    if (criteria.type) {
      queryBuilder = queryBuilder.andWhere('tool.type = :type', { type: criteria.type.value });
    }
    if (criteria.status) {
      queryBuilder = queryBuilder.andWhere('tool.status = :status', { status: criteria.status.value });
    }
    if (criteria.category) {
      queryBuilder = queryBuilder.andWhere('tool.category = :category', { category: criteria.category });
    }
    if (criteria.tags && criteria.tags.length > 0) {
      queryBuilder = queryBuilder.andWhere('tool.tags @> :tags', { tags: criteria.tags });
    }
    if (criteria.createdBy) {
      queryBuilder = queryBuilder.andWhere('tool.createdBy = :createdBy', { createdBy: criteria.createdBy.value });
    }
    if (criteria.isEnabled !== undefined) {
      queryBuilder = queryBuilder.andWhere('tool.isEnabled = :isEnabled', { isEnabled: criteria.isEnabled });
    }
    if (criteria.isBuiltin !== undefined) {
      queryBuilder = queryBuilder.andWhere('tool.isBuiltin = :isBuiltin', { isBuiltin: criteria.isBuiltin });
    }
    if (criteria.searchText) {
      queryBuilder = queryBuilder.andWhere(
        '(tool.name LIKE :searchText OR tool.description LIKE :searchText)',
        { searchText: `%${criteria.searchText}%` }
      );
    }

    queryBuilder = queryBuilder.andWhere('tool.isDeleted = :isDeleted', { isDeleted: false });
    queryBuilder = queryBuilder.orderBy('tool.createdAt', 'DESC');

    const models = await queryBuilder.getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 分页查找工具
   */
  async findToolsWithPagination(
    page: number,
    limit: number,
    criteria?: {
      type?: ToolType;
      status?: ToolStatus;
      category?: string;
      tags?: string[];
      createdBy?: ID;
      isEnabled?: boolean;
      isBuiltin?: boolean;
      searchText?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    tools: Tool[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('tool');

    if (criteria?.type) {
      queryBuilder = queryBuilder.andWhere('tool.type = :type', { type: criteria.type.value });
    }
    if (criteria?.status) {
      queryBuilder = queryBuilder.andWhere('tool.status = :status', { status: criteria.status.value });
    }
    if (criteria?.category) {
      queryBuilder = queryBuilder.andWhere('tool.category = :category', { category: criteria.category });
    }
    if (criteria?.tags && criteria.tags.length > 0) {
      queryBuilder = queryBuilder.andWhere('tool.tags @> :tags', { tags: criteria.tags });
    }
    if (criteria?.createdBy) {
      queryBuilder = queryBuilder.andWhere('tool.createdBy = :createdBy', { createdBy: criteria.createdBy.value });
    }
    if (criteria?.isEnabled !== undefined) {
      queryBuilder = queryBuilder.andWhere('tool.isEnabled = :isEnabled', { isEnabled: criteria.isEnabled });
    }
    if (criteria?.isBuiltin !== undefined) {
      queryBuilder = queryBuilder.andWhere('tool.isBuiltin = :isBuiltin', { isBuiltin: criteria.isBuiltin });
    }
    if (criteria?.searchText) {
      queryBuilder = queryBuilder.andWhere(
        '(tool.name LIKE :searchText OR tool.description LIKE :searchText)',
        { searchText: `%${criteria.searchText}%` }
      );
    }

    queryBuilder = queryBuilder.andWhere('tool.isDeleted = :isDeleted', { isDeleted: false });

    const sortBy = criteria?.sortBy || 'createdAt';
    const sortOrder = (criteria?.sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC';
    queryBuilder = queryBuilder.orderBy(`tool.${sortBy}`, sortOrder);

    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    queryBuilder = queryBuilder.skip((page - 1) * limit).take(limit);

    const models = await queryBuilder.getMany();
    const tools = models.map(model => this.toDomain(model));

    return {
      tools,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 检查工具名称是否存在
   */
  async existsByName(name: string, excludeId?: ID): Promise<boolean> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('tool').where('tool.name = :name', { name });

    if (excludeId) {
      queryBuilder = queryBuilder.andWhere('tool.id != :excludeId', { excludeId: excludeId.value });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  /**
   * 统计工具数量
   */
  async countByCriteria(criteria?: {
    type?: ToolType;
    status?: ToolStatus;
    category?: string;
    tags?: string[];
    createdBy?: ID;
    isEnabled?: boolean;
    isBuiltin?: boolean;
  }): Promise<number> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('tool');

    if (criteria?.type) {
      queryBuilder = queryBuilder.andWhere('tool.type = :type', { type: criteria.type.value });
    }
    if (criteria?.status) {
      queryBuilder = queryBuilder.andWhere('tool.status = :status', { status: criteria.status.value });
    }
    if (criteria?.category) {
      queryBuilder = queryBuilder.andWhere('tool.category = :category', { category: criteria.category });
    }
    if (criteria?.tags && criteria.tags.length > 0) {
      queryBuilder = queryBuilder.andWhere('tool.tags @> :tags', { tags: criteria.tags });
    }
    if (criteria?.createdBy) {
      queryBuilder = queryBuilder.andWhere('tool.createdBy = :createdBy', { createdBy: criteria.createdBy.value });
    }
    if (criteria?.isEnabled !== undefined) {
      queryBuilder = queryBuilder.andWhere('tool.isEnabled = :isEnabled', { isEnabled: criteria.isEnabled });
    }
    if (criteria?.isBuiltin !== undefined) {
      queryBuilder = queryBuilder.andWhere('tool.isBuiltin = :isBuiltin', { isBuiltin: criteria.isBuiltin });
    }

    queryBuilder = queryBuilder.andWhere('tool.isDeleted = :isDeleted', { isDeleted: false });

    return queryBuilder.getCount();
  }

  /**
   * 按类型统计工具数量
   */
  async countByType(): Promise<Record<string, number>> {
    const repository = await this.getRepository();
    const results = await repository
      .createQueryBuilder('tool')
      .select('tool.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('tool.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('tool.type')
      .getRawMany();

    const stats: Record<string, number> = {};
    results.forEach(result => {
      stats[result.type] = parseInt(result.count);
    });

    return stats;
  }

  /**
   * 按状态统计工具数量
   */
  async countByStatus(): Promise<Record<string, number>> {
    const repository = await this.getRepository();
    const results = await repository
      .createQueryBuilder('tool')
      .select('tool.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('tool.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('tool.status')
      .getRawMany();

    const stats: Record<string, number> = {};
    results.forEach(result => {
      stats[result.status] = parseInt(result.count);
    });

    return stats;
  }

  /**
   * 按分类统计工具数量
   */
  async countByCategory(): Promise<Record<string, number>> {
    const repository = await this.getRepository();
    const results = await repository
      .createQueryBuilder('tool')
      .select('tool.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('tool.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('tool.category')
      .getRawMany();

    const stats: Record<string, number> = {};
    results.forEach(result => {
      stats[result.category] = parseInt(result.count);
    });

    return stats;
  }

  /**
   * 按创建者统计工具数量
   */
  async countByCreatedBy(): Promise<Record<string, number>> {
    const repository = await this.getRepository();
    const results = await repository
      .createQueryBuilder('tool')
      .select('tool.createdBy', 'createdBy')
      .addSelect('COUNT(*)', 'count')
      .where('tool.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('tool.createdBy')
      .getRawMany();

    const stats: Record<string, number> = {};
    results.forEach(result => {
      stats[result.createdBy || 'unknown'] = parseInt(result.count);
    });

    return stats;
  }

  /**
   * 获取所有分类
   */
  async getAllCategories(): Promise<string[]> {
    const repository = await this.getRepository();
    const results = await repository
      .createQueryBuilder('tool')
      .select('DISTINCT tool.category', 'category')
      .where('tool.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('tool.category', 'ASC')
      .getRawMany();

    return results.map(result => result.category);
  }

  /**
   * 获取所有标签
   */
  async getAllTags(): Promise<string[]> {
    const repository = await this.getRepository();
    const results = await repository
      .createQueryBuilder('tool')
      .select('UNNEST(tool.tags)', 'tag')
      .where('tool.isDeleted = :isDeleted', { isDeleted: false })
      .distinct(true)
      .orderBy('tag', 'ASC')
      .getRawMany();

    return results.map(result => result.tag);
  }

  /**
   * 查找最近创建的工具
   */
  async findRecentlyCreated(limit: number): Promise<Tool[]> {
    return this.find({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找最近更新的工具
   */
  async findRecentlyUpdated(limit: number): Promise<Tool[]> {
    return this.find({
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找最常用的工具
   */
  async findMostUsed(limit: number): Promise<Tool[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('tool')
      .orderBy("CAST(tool.metadata->>'usageCount' AS INTEGER)", 'DESC')
      .take(limit)
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找依赖指定工具的工具
   */
  async findDependents(toolId: ID): Promise<Tool[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('tool')
      .where(':toolId = ANY(tool.dependencies)', { toolId: toolId.value })
      .andWhere('tool.isDeleted = :isDeleted', { isDeleted: false })
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找指定工具依赖的工具
   */
  async findDependencies(toolId: ID): Promise<Tool[]> {
    const tool = await this.findById(toolId);
    if (!tool || tool.dependencies.length === 0) {
      return [];
    }

    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('tool')
      .where('tool.id IN (:...dependencyIds)', {
        dependencyIds: tool.dependencies.map(depId => depId.value)
      })
      .andWhere('tool.isDeleted = :isDeleted', { isDeleted: false })
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 搜索工具
   */
  async search(query: string, limit?: number): Promise<Tool[]> {
    const repository = await this.getRepository();
    let queryBuilder = repository
      .createQueryBuilder('tool')
      .where('(tool.name LIKE :query OR tool.description LIKE :query)', { query: `%${query}%` })
      .andWhere('tool.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('tool.createdAt', 'DESC');

    if (limit) {
      queryBuilder = queryBuilder.take(limit);
    }

    const models = await queryBuilder.getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 获取工具使用统计
   */
  async getUsageStatistics(
    toolId: ID,
    startTime?: Date,
    endTime?: Date
  ): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecutedAt?: Date;
  }> {
    // 这里需要从 ToolExecution 表查询统计数据
    // 暂时返回默认值
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
    };
  }

  /**
   * 获取工具性能统计
   */
  async getPerformanceStatistics(
    toolId: ID,
    startTime?: Date,
    endTime?: Date
  ): Promise<{
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    maxLatency: number;
    minLatency: number;
    throughput: number;
    errorRate: number;
  }> {
    // 这里需要从 ToolExecution 表查询性能统计数据
    // 暂时返回默认值
    return {
      averageLatency: 0,
      medianLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      maxLatency: 0,
      minLatency: 0,
      throughput: 0,
      errorRate: 0,
    };
  }

  /**
   * 更新工具使用统计
   */
  async updateUsageStatistics(toolId: ID, executionTime: number, success: boolean): Promise<void> {
    const tool = await this.findById(toolId);
    if (!tool) {
      throw new Error('工具不存在');
    }

    // 更新元数据中的使用统计
    const metadataRecord = tool.metadata.toRecord();
    const currentUsageCount = (metadataRecord['usageCount'] as number) || 0;
    const currentTotalTime = (metadataRecord['totalExecutionTime'] as number) || 0;
    const currentSuccessCount = (metadataRecord['successCount'] as number) || 0;
    const currentFailureCount = (metadataRecord['failureCount'] as number) || 0;

    const updatedMetadata = {
      ...tool.metadata.toRecord(),
      usageCount: currentUsageCount + 1,
      totalExecutionTime: currentTotalTime + executionTime,
      successCount: currentSuccessCount + (success ? 1 : 0),
      failureCount: currentFailureCount + (success ? 0 : 1),
      lastExecutedAt: new Date().toISOString(),
    };

    const updatedTool = tool.updateMetadata(updatedMetadata);
    await this.save(updatedTool);
  }
}