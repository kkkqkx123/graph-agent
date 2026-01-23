import { injectable, inject } from 'inversify';
import { ILLMResponseRepository } from '../../../domain/llm/repositories/llm-response-repository';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { ID } from '../../../domain/common/value-objects/id';
import { LLMResponseModel } from '../models/llm-response.model';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connection-manager';
import { TYPES } from '../../../di/service-keys';
import { LLMResponseMapper } from '../mappers/llm-response-mapper';

@injectable()
export class LLMResponseRepository
  extends BaseRepository<LLMResponse, LLMResponseModel, ID>
  implements ILLMResponseRepository {
  private mapper: LLMResponseMapper;

  constructor(@inject(TYPES.ConnectionManager) connectionManager: ConnectionManager) {
    super(connectionManager);
    this.mapper = new LLMResponseMapper();
  }

  protected getModelClass(): new () => LLMResponseModel {
    return LLMResponseModel;
  }

  /**
   * 使用Mapper将数据库模型转换为领域实体
   */
  protected override toDomain(model: LLMResponseModel): LLMResponse {
    const result = this.mapper.toDomain(model);
    if (!result.success) {
      const error = result.error;
      throw new Error(`${error.message} - ${error.path.join(' -> ')}`);
    }
    return result.value;
  }

  /**
   * 使用Mapper将领域实体转换为数据库模型
   */
  protected override toModel(entity: LLMResponse): LLMResponseModel {
    const result = this.mapper.toModel(entity);
    if (!result.success) {
      const error = result.error;
      throw new Error(`${error.message} - ${error.path.join(' -> ')}`);
    }
    return result.value;
  }

  /**
   * 根据请求ID查找响应
   */
  async findByRequestId(requestId: ID): Promise<LLMResponse | null> {
    return this.findById(requestId);
  }

  /**
   * 根据会话ID查找响应
   */
  async findBySessionId(sessionId: ID): Promise<LLMResponse[]> {
    return this.find({
      filters: { sessionId: sessionId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据线程ID查找响应
   */
  async findByThreadId(threadId: ID): Promise<LLMResponse[]> {
    return this.find({
      filters: { threadId: threadId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据工作流ID查找响应
   */
  async findByWorkflowId(workflowId: ID): Promise<LLMResponse[]> {
    return this.find({
      filters: { workflowId: workflowId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据节点ID查找响应
   */
  async findByNodeId(nodeId: ID): Promise<LLMResponse[]> {
    return this.find({
      filters: { nodeId: nodeId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据模型查找响应
   */
  async findByModel(model: string): Promise<LLMResponse[]> {
    return this.find({
      filters: { model },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据完成原因查找响应
   */
  async findByFinishReason(finishReason: string): Promise<LLMResponse[]> {
    return this.find({
      filters: { finishReason },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据多个实体ID查找响应
   */
  async findByEntityIds(options: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
  }): Promise<LLMResponse[]> {
    const filters: Record<string, string> = {};
    if (options.sessionId) filters['sessionId'] = options.sessionId.value;
    if (options.threadId) filters['threadId'] = options.threadId.value;
    if (options.workflowId) filters['workflowId'] = options.workflowId.value;
    if (options.nodeId) filters['nodeId'] = options.nodeId.value;

    return this.find({
      filters,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据创建时间范围查找响应
   */
  async findByTimeRange(startTime: Date, endTime: Date): Promise<LLMResponse[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('response')
      .where('response.createdAt >= :startTime', { startTime })
      .andWhere('response.createdAt <= :endTime', { endTime })
      .andWhere('response.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('response.createdAt', 'DESC')
      .getMany();

    return models.map(model => this.toDomain(model));
  }

  /**
   * 根据会话ID和时间范围查找响应
   */
  async findBySessionIdAndTimeRange(sessionId: ID, startTime: Date, endTime: Date): Promise<LLMResponse[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('response')
      .where('response.sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('response.createdAt >= :startTime', { startTime })
      .andWhere('response.createdAt <= :endTime', { endTime })
      .andWhere('response.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('response.createdAt', 'DESC')
      .getMany();

    return models.map(model => this.toDomain(model));
  }

  /**
   * 根据线程ID和时间范围查找响应
   */
  async findByThreadIdAndTimeRange(threadId: ID, startTime: Date, endTime: Date): Promise<LLMResponse[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('response')
      .where('response.threadId = :threadId', { threadId: threadId.value })
      .andWhere('response.createdAt >= :startTime', { startTime })
      .andWhere('response.createdAt <= :endTime', { endTime })
      .andWhere('response.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('response.createdAt', 'DESC')
      .getMany();

    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找最新的响应
   */
  async findLatest(limit: number = 10): Promise<LLMResponse[]> {
    return this.find({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找指定会话ID的最新响应
   */
  async findLatestBySessionId(sessionId: ID, limit: number = 10): Promise<LLMResponse[]> {
    return this.find({
      filters: { sessionId: sessionId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找指定线程ID的最新响应
   */
  async findLatestByThreadId(threadId: ID, limit: number = 10): Promise<LLMResponse[]> {
    return this.find({
      filters: { threadId: threadId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找指定工作流ID的最新响应
   */
  async findLatestByWorkflowId(workflowId: ID, limit: number = 10): Promise<LLMResponse[]> {
    return this.find({
      filters: { workflowId: workflowId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找指定节点ID的最新响应
   */
  async findLatestByNodeId(nodeId: ID, limit: number = 10): Promise<LLMResponse[]> {
    return this.find({
      filters: { nodeId: nodeId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找指定模型名称的最新响应
   */
  async findLatestByModel(model: string, limit: number = 10): Promise<LLMResponse[]> {
    return this.find({
      filters: { model },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找有工具调用的响应
   */
  async findWithToolCalls(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LLMResponse[]> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('response');

    // 检查choices中是否有toolCalls
    queryBuilder = queryBuilder.andWhere('response.choices::jsonb @> \'[{"message":{"toolCalls":[]}}]\'', {});

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('response.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('response.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('response.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('response.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('response.model = :model', { model: options.model });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('response.isDeleted = :isDeleted', { isDeleted: false });

    const models = await queryBuilder.orderBy('response.createdAt', 'DESC').getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找成功完成的响应
   */
  async findSuccessful(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LLMResponse[]> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('response');

    queryBuilder = queryBuilder.andWhere('response.finishReason = :finishReason', { finishReason: 'stop' });

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('response.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('response.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('response.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('response.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('response.model = :model', { model: options.model });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('response.isDeleted = :isDeleted', { isDeleted: false });

    const models = await queryBuilder.orderBy('response.createdAt', 'DESC').getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找失败的响应
   */
  async findFailed(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LLMResponse[]> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('response');

    queryBuilder = queryBuilder.andWhere('response.finishReason != :finishReason', { finishReason: 'stop' });

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('response.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('response.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('response.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('response.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('response.model = :model', { model: options.model });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('response.isDeleted = :isDeleted', { isDeleted: false });

    const models = await queryBuilder.orderBy('response.createdAt', 'DESC').getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 统计响应数量
   */
  async countByCriteria(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    finishReason?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<number> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('response');

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('response.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('response.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('response.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('response.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('response.model = :model', { model: options.model });
    }
    if (options?.finishReason) {
      queryBuilder = queryBuilder.andWhere('response.finishReason = :finishReason', { finishReason: options.finishReason });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('response.isDeleted = :isDeleted', { isDeleted: false });

    return queryBuilder.getCount();
  }

  /**
   * 统计不同模型的响应数量
   */
  async countByModel(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('response');

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('response.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('response.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('response.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('response.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('response.isDeleted = :isDeleted', { isDeleted: false });

    const results = await queryBuilder
      .select('response.model', 'model')
      .addSelect('COUNT(*)', 'count')
      .groupBy('response.model')
      .getRawMany();

    const byModel: Record<string, number> = {};
    results.forEach(result => {
      byModel[result.model] = parseInt(result.count);
    });

    return byModel;
  }

  /**
   * 统计不同完成原因的响应数量
   */
  async countByFinishReason(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('response');

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('response.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('response.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('response.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('response.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('response.model = :model', { model: options.model });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('response.isDeleted = :isDeleted', { isDeleted: false });

    const results = await queryBuilder
      .select('response.finishReason', 'finishReason')
      .addSelect('COUNT(*)', 'count')
      .groupBy('response.finishReason')
      .getRawMany();

    const byFinishReason: Record<string, number> = {};
    results.forEach(result => {
      byFinishReason[result.finishReason] = parseInt(result.count);
    });

    return byFinishReason;
  }

  /**
   * 获取Token使用统计
   */
  async getTokenUsage(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalPromptCost: number;
    totalCompletionCost: number;
    totalCost: number;
    averagePromptTokens: number;
    averageCompletionTokens: number;
    averageTotalTokens: number;
  }> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('response');

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('response.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('response.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('response.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('response.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('response.model = :model', { model: options.model });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('response.isDeleted = :isDeleted', { isDeleted: false });

    const results = await queryBuilder
      .select('SUM(response.usage->\'promptTokens\')', 'totalPromptTokens')
      .addSelect('SUM(response.usage->\'completionTokens\')', 'totalCompletionTokens')
      .addSelect('SUM(response.usage->\'totalTokens\')', 'totalTokens')
      .addSelect('SUM(response.usage->\'promptTokensCost\')', 'totalPromptCost')
      .addSelect('SUM(response.usage->\'completionTokensCost\')', 'totalCompletionCost')
      .addSelect('SUM(response.usage->\'totalCost\')', 'totalCost')
      .addSelect('AVG(response.usage->\'promptTokens\')', 'averagePromptTokens')
      .addSelect('AVG(response.usage->\'completionTokens\')', 'averageCompletionTokens')
      .addSelect('AVG(response.usage->\'totalTokens\')', 'averageTotalTokens')
      .getRawOne();

    return {
      totalPromptTokens: parseInt(results.totalPromptTokens) || 0,
      totalCompletionTokens: parseInt(results.totalCompletionTokens) || 0,
      totalTokens: parseInt(results.totalTokens) || 0,
      totalPromptCost: parseFloat(results.totalPromptCost) || 0,
      totalCompletionCost: parseFloat(results.totalCompletionCost) || 0,
      totalCost: parseFloat(results.totalCost) || 0,
      averagePromptTokens: parseFloat(results.averagePromptTokens) || 0,
      averageCompletionTokens: parseFloat(results.averageCompletionTokens) || 0,
      averageTotalTokens: parseFloat(results.averageTotalTokens) || 0,
    };
  }

  /**
   * 获取成本统计
   */
  async getCostStatistics(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    totalCost: number;
    byModel: Record<string, number>;
    byEntity: Record<string, number>;
    averageCost: number;
    maxCost: number;
    minCost: number;
  }> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('response');

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('response.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('response.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('response.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('response.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('response.model = :model', { model: options.model });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('response.isDeleted = :isDeleted', { isDeleted: false });

    const aggregateResults = await queryBuilder
      .select('SUM(response.usage->\'totalCost\')', 'totalCost')
      .addSelect('AVG(response.usage->\'totalCost\')', 'averageCost')
      .addSelect('MAX(response.usage->\'totalCost\')', 'maxCost')
      .addSelect('MIN(response.usage->\'totalCost\')', 'minCost')
      .getRawOne();

    const byModelResults = await queryBuilder
      .select('response.model', 'model')
      .addSelect('SUM(response.usage->\'totalCost\')', 'cost')
      .groupBy('response.model')
      .getRawMany();

    const byModel: Record<string, number> = {};
    byModelResults.forEach(result => {
      byModel[result.model] = parseFloat(result.cost);
    });

    const byEntity: Record<string, number> = {};
    if (options?.sessionId) {
      byEntity[`session:${options.sessionId.value}`] = parseFloat(aggregateResults.totalCost) || 0;
    }
    if (options?.threadId) {
      byEntity[`thread:${options.threadId.value}`] = parseFloat(aggregateResults.totalCost) || 0;
    }
    if (options?.workflowId) {
      byEntity[`workflow:${options.workflowId.value}`] = parseFloat(aggregateResults.totalCost) || 0;
    }
    if (options?.nodeId) {
      byEntity[`node:${options.nodeId.value}`] = parseFloat(aggregateResults.totalCost) || 0;
    }

    return {
      totalCost: parseFloat(aggregateResults.totalCost) || 0,
      byModel,
      byEntity,
      averageCost: parseFloat(aggregateResults.averageCost) || 0,
      maxCost: parseFloat(aggregateResults.maxCost) || 0,
      minCost: parseFloat(aggregateResults.minCost) || 0,
    };
  }

  /**
   * 获取性能统计
   */
  async getPerformanceStatistics(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    averageDuration: number;
    medianDuration: number;
    maxDuration: number;
    minDuration: number;
    p95Duration: number;
    p99Duration: number;
    byModel: Record<string, { average: number; median: number; max: number; min: number }>;
  }> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('response');

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('response.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('response.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('response.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('response.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('response.model = :model', { model: options.model });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('response.isDeleted = :isDeleted', { isDeleted: false });

    const durations = await queryBuilder
      .select('response.duration', 'duration')
      .getRawMany();

    const durationValues = durations.map(d => d.duration).sort((a, b) => a - b);
    const averageDuration = durationValues.reduce((sum, d) => sum + d, 0) / durationValues.length;
    const medianDuration = durationValues[Math.floor(durationValues.length / 2)];
    const maxDuration = durationValues[durationValues.length - 1];
    const minDuration = durationValues[0];
    const p95Duration = durationValues[Math.floor(durationValues.length * 0.95)];
    const p99Duration = durationValues[Math.floor(durationValues.length * 0.99)];

    const byModelResults = await queryBuilder
      .select('response.model', 'model')
      .addSelect('AVG(response.duration)', 'average')
      .addSelect('MAX(response.duration)', 'max')
      .addSelect('MIN(response.duration)', 'min')
      .groupBy('response.model')
      .getRawMany();

    const byModel: Record<string, { average: number; median: number; max: number; min: number }> = {};
    byModelResults.forEach(result => {
      byModel[result.model] = {
        average: parseFloat(result.average),
        max: parseFloat(result.max),
        min: parseFloat(result.min),
        median: parseFloat(result.average), // 简化处理，实际应该计算中位数
      };
    });

    return {
      averageDuration,
      medianDuration,
      maxDuration,
      minDuration,
      p95Duration,
      p99Duration,
      byModel,
    };
  }

  /**
   * 删除指定时间之前的响应
   */
  async deleteBeforeTime(beforeTime: Date): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository
      .createQueryBuilder('response')
      .delete()
      .where('createdAt < :beforeTime', { beforeTime })
      .execute();

    return result.affected || 0;
  }

  /**
   * 删除指定工作流ID的响应
   */
  async deleteByWorkflowId(workflowId: ID): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ workflowId: workflowId.value });
    return result.affected || 0;
  }

  /**
   * 清理过期响应
   */
  async cleanupExpired(retentionDays: number): Promise<number> {
    const beforeTime = new Date();
    beforeTime.setDate(beforeTime.getDate() - retentionDays);
    return this.deleteBeforeTime(beforeTime);
  }

  /**
   * 归档响应
   */
  async archiveBeforeTime(beforeTime: Date): Promise<number> {
    // 归档逻辑可以标记为已删除或移动到归档表
    return this.deleteBeforeTime(beforeTime);
  }

  /**
   * 获取响应趋势
   */
  async getTrend(
    startTime: Date,
    endTime: Date,
    interval: number
  ): Promise<Array<{
    timestamp: Date;
    count: number;
    byModel: Record<string, number>;
    byFinishReason: Record<string, number>;
    totalTokens: number;
    totalCost: number;
    averageDuration: number;
  }>> {
    const repository = await this.getRepository();
    const results = await repository
      .createQueryBuilder('response')
      .select('DATE_TRUNC(\'minute\', response.createdAt)', 'timestamp')
      .addSelect('COUNT(*)', 'count')
      .addSelect('response.model', 'model')
      .addSelect('response.finishReason', 'finishReason')
      .addSelect('SUM(response.usage->\'totalTokens\')', 'totalTokens')
      .addSelect('SUM(response.usage->\'totalCost\')', 'totalCost')
      .addSelect('AVG(response.duration)', 'averageDuration')
      .where('response.createdAt >= :startTime', { startTime })
      .andWhere('response.createdAt <= :endTime', { endTime })
      .andWhere('response.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('DATE_TRUNC(\'minute\', response.createdAt), response.model, response.finishReason')
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    const trendMap = new Map<string, {
      timestamp: Date;
      count: number;
      byModel: Record<string, number>;
      byFinishReason: Record<string, number>;
      totalTokens: number;
      totalCost: number;
      averageDuration: number;
    }>();

    results.forEach(result => {
      const timestamp = new Date(result.timestamp);
      const key = timestamp.toISOString();

      if (!trendMap.has(key)) {
        trendMap.set(key, {
          timestamp,
          count: 0,
          byModel: {},
          byFinishReason: {},
          totalTokens: 0,
          totalCost: 0,
          averageDuration: 0,
        });
      }

      const trend = trendMap.get(key)!;
      trend.count += parseInt(result.count);
      trend.byModel[result.model] = (trend.byModel[result.model] || 0) + parseInt(result.count);
      trend.byFinishReason[result.finishReason] = (trend.byFinishReason[result.finishReason] || 0) + parseInt(result.count);
      trend.totalTokens += parseInt(result.totalTokens);
      trend.totalCost += parseFloat(result.totalCost);
      trend.averageDuration = parseFloat(result.averageDuration);
    });

    return Array.from(trendMap.values());
  }

  /**
   * 搜索响应
   */
  async search(
    query: string,
    options?: {
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      nodeId?: ID;
      model?: string;
      finishReason?: string;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<LLMResponse[]> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('response');

    // 在choices消息内容中搜索
    queryBuilder = queryBuilder.andWhere('response.choices::text LIKE :query', { query: `%${query}%` });

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('response.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('response.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('response.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('response.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('response.model = :model', { model: options.model });
    }
    if (options?.finishReason) {
      queryBuilder = queryBuilder.andWhere('response.finishReason = :finishReason', { finishReason: options.finishReason });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('response.isDeleted = :isDeleted', { isDeleted: false });

    if (options?.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }
    if (options?.offset) {
      queryBuilder = queryBuilder.offset(options.offset);
    }

    const models = await queryBuilder.orderBy('response.createdAt', 'DESC').getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 获取统计信息
   */
  async getStatistics(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    total: number;
    byModel: Record<string, number>;
    byFinishReason: Record<string, number>;
    byEntity: Record<string, number>;
    totalTokens: number;
    totalCost: number;
    averageDuration: number;
    successRate: number;
    toolCallRate: number;
    latestAt?: Date;
    oldestAt?: Date;
  }> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('response');

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('response.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('response.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('response.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('response.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('response.model = :model', { model: options.model });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('response.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('response.isDeleted = :isDeleted', { isDeleted: false });

    const total = await queryBuilder.getCount();

    const byModelResults = await queryBuilder
      .select('response.model', 'model')
      .addSelect('COUNT(*)', 'count')
      .groupBy('response.model')
      .getRawMany();

    const byModel: Record<string, number> = {};
    byModelResults.forEach(result => {
      byModel[result.model] = parseInt(result.count);
    });

    const byFinishReasonResults = await queryBuilder
      .select('response.finishReason', 'finishReason')
      .addSelect('COUNT(*)', 'count')
      .groupBy('response.finishReason')
      .getRawMany();

    const byFinishReason: Record<string, number> = {};
    byFinishReasonResults.forEach(result => {
      byFinishReason[result.finishReason] = parseInt(result.count);
    });

    // 按实体统计
    const byEntity: Record<string, number> = {};
    if (options?.sessionId) {
      byEntity[`session:${options.sessionId.value}`] = total;
    }
    if (options?.threadId) {
      byEntity[`thread:${options.threadId.value}`] = total;
    }
    if (options?.workflowId) {
      byEntity[`workflow:${options.workflowId.value}`] = total;
    }
    if (options?.nodeId) {
      byEntity[`node:${options.nodeId.value}`] = total;
    }

    const aggregateResults = await queryBuilder
      .select('SUM(response.usage->\'totalTokens\')', 'totalTokens')
      .addSelect('SUM(response.usage->\'totalCost\')', 'totalCost')
      .addSelect('AVG(response.duration)', 'averageDuration')
      .addSelect('COUNT(CASE WHEN response.finishReason = \'stop\' THEN 1 END)', 'successCount')
      .addSelect('COUNT(CASE WHEN response.choices::jsonb @> \'[{"message":{"toolCalls":[]}}]\' THEN 1 END)', 'toolCallCount')
      .getRawOne();

    const totalTokens = parseInt(aggregateResults.totalTokens) || 0;
    const totalCost = parseFloat(aggregateResults.totalCost) || 0;
    const averageDuration = parseFloat(aggregateResults.averageDuration) || 0;
    const successCount = parseInt(aggregateResults.successCount) || 0;
    const toolCallCount = parseInt(aggregateResults.toolCallCount) || 0;
    const successRate = total > 0 ? (successCount / total) * 100 : 0;
    const toolCallRate = total > 0 ? (toolCallCount / total) * 100 : 0;

    // 获取最新和最旧的时间
    const timeResults = await queryBuilder
      .select('MAX(response.createdAt)', 'latestAt')
      .addSelect('MIN(response.createdAt)', 'oldestAt')
      .getRawOne();

    return {
      total,
      byModel,
      byFinishReason,
      byEntity,
      totalTokens,
      totalCost,
      averageDuration,
      successRate,
      toolCallRate,
      latestAt: timeResults.latestAt,
      oldestAt: timeResults.oldestAt,
    };
  }

  /**
   * 删除会话的所有响应
   */
  async deleteBySessionId(sessionId: ID): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ sessionId: sessionId.value });
    return result.affected || 0;
  }

  /**
   * 删除线程的所有响应
   */
  async deleteByThreadId(threadId: ID): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ threadId: threadId.value });
    return result.affected || 0;
  }
}
