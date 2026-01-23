import { injectable, inject } from 'inversify';
import { IToolRepository } from '../../../domain/tools/repositories/tool-repository';
import { Tool } from '../../../domain/tools/entities/tool';
import { ID } from '../../../domain/common/value-objects/id';
import { ToolType } from '../../../domain/tools/value-objects/tool-type';
import { ToolStatus } from '../../../domain/tools/value-objects/tool-status';
import { ToolModel } from '../models/tool.model';
import { In } from 'typeorm';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connection-manager';
import { TYPES } from '../../../di/service-keys';
import { ToolMapper } from '../mappers/tool-mapper';

@injectable()
export class ToolRepository
  extends BaseRepository<Tool, ToolModel, ID>
  implements IToolRepository {
  private mapper: ToolMapper;

  constructor(@inject(TYPES.ConnectionManager) connectionManager: ConnectionManager) {
    super(connectionManager);
    this.mapper = new ToolMapper();
  }

  protected getModelClass(): new () => ToolModel {
    return ToolModel;
  }

  /**
   * 使用Mapper将数据库模型转换为领域实体
   */
  protected override toDomain(model: ToolModel): Tool {
    return this.mapper.toDomain(model);
  }

  /**
   * 使用Mapper将领域实体转换为数据库模型
   */
  protected override toModel(entity: Tool): ToolModel {
    return this.mapper.toModel(entity);
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
