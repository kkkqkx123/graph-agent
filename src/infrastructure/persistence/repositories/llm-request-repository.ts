import { injectable, inject } from 'inversify';
import { ILLMRequestRepository } from '../../../domain/llm/repositories/llm-request-repository';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import { DeletionStatus } from '../../../domain/checkpoint/value-objects/deletion-status';
import { LLMRequestModel } from '../models/llm-request.model';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connection-manager';

@injectable()
export class LLMRequestRepository
  extends BaseRepository<LLMRequest, LLMRequestModel, ID>
  implements ILLMRequestRepository {
  constructor(@inject('ConnectionManager') connectionManager: ConnectionManager) {
    super(connectionManager);
  }

  protected getModelClass(): new () => LLMRequestModel {
    return LLMRequestModel;
  }

  /**
   * 重写toDomain方法
   */
  protected override toDomain(model: LLMRequestModel): LLMRequest {
    try {
      const id = new ID(model.id);
      const sessionId = model.sessionId ? new ID(model.sessionId) : undefined;
      const threadId = model.threadId ? new ID(model.threadId) : undefined;
      const workflowId = model.workflowId ? new ID(model.workflowId) : undefined;
      const nodeId = model.nodeId ? new ID(model.nodeId) : undefined;
      const createdAt = Timestamp.create(model.createdAt);
      const updatedAt = Timestamp.create(model.updatedAt);
      const version = Version.initial();

      // 转换消息
      const messages = model.messages.map(msg =>
        LLMMessage.fromInterface({
          role: msg.role,
          content: msg.content,
          toolCallId: msg.toolCallId,
          toolCalls: msg.toolCalls,
          functionCall: msg.functionCall,
          timestamp: Timestamp.now(),
          metadata: msg.metadata,
        })
      );

      // 转换工具选择
      let toolChoice: 'none' | 'auto' | 'required' | { type: string; function: { name: string } } = 'none';
      if (model.toolChoice) {
        if (model.toolChoice === 'none' || model.toolChoice === 'auto' || model.toolChoice === 'required') {
          toolChoice = model.toolChoice;
        } else if (model.toolChoiceFunction) {
          toolChoice = model.toolChoiceFunction;
        }
      }

      const requestProps = {
        id,
        sessionId,
        threadId,
        workflowId,
        nodeId,
        model: model.model,
        messages,
        temperature: model.temperature,
        maxTokens: model.maxTokens,
        topP: model.topP,
        frequencyPenalty: model.frequencyPenalty,
        presencePenalty: model.presencePenalty,
        stop: model.stop,
        tools: model.tools,
        toolChoice,
        stream: model.stream,
        reasoningEffort: model.reasoningEffort,
        verbosity: model.verbosity,
        previousResponseId: model.previousResponseId,
        metadata: model.metadata,
        createdAt,
        updatedAt,
        version,
        deletionStatus: DeletionStatus.fromBoolean(model.isDeleted),
      };

      return LLMRequest.fromProps(requestProps);
    } catch (error) {
      const errorMessage = `LLMRequest模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toDomain' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法
   */
  protected override toModel(entity: LLMRequest): LLMRequestModel {
    try {
      const model = new LLMRequestModel();

      model.id = entity.requestId.value;
      model.sessionId = entity.sessionId?.value;
      model.threadId = entity.threadId?.value;
      model.workflowId = entity.workflowId?.value;
      model.nodeId = entity.nodeId?.value;
      model.model = entity.model;

      // 转换消息
      model.messages = entity.messages.map(msg => {
        const msgInterface = msg.toInterface();
        return {
          role: msgInterface.role,
          content: msgInterface.content,
          name: msgInterface.name,
          functionCall: msgInterface.functionCall,
          toolCalls: msgInterface.toolCalls,
          toolCallId: msgInterface.toolCallId,
          timestamp: msgInterface.timestamp?.getDate(),
          metadata: msgInterface.metadata,
        };
      });

      model.temperature = entity.temperature;
      model.maxTokens = entity.maxTokens;
      model.topP = entity.topP;
      model.frequencyPenalty = entity.frequencyPenalty;
      model.presencePenalty = entity.presencePenalty;
      model.stop = entity.stop;
      model.tools = entity.tools;

      // 转换工具选择
      if (entity.toolChoice === 'none' || entity.toolChoice === 'auto' || entity.toolChoice === 'required') {
        model.toolChoice = entity.toolChoice;
      } else {
        model.toolChoiceFunction = entity.toolChoice as { type: string; function: { name: string } };
      }

      model.stream = entity.stream ?? false;
      model.reasoningEffort = entity.reasoningEffort;
      model.verbosity = entity.verbosity;
      model.previousResponseId = entity.previousResponseId;
      model.metadata = entity.metadata;
      model.isDeleted = entity.isDeleted();
      model.createdAt = entity.createdAt.getDate();
      model.updatedAt = entity.updatedAt.getDate();

      return model;
    } catch (error) {
      const errorMessage = `LLMRequest实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.requestId.value, operation: 'toModel' };
      throw customError;
    }
  }

  /**
   * 根据会话ID查找请求
   */
  async findBySessionId(sessionId: ID): Promise<LLMRequest[]> {
    return this.find({
      filters: { sessionId: sessionId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据线程ID查找请求
   */
  async findByThreadId(threadId: ID): Promise<LLMRequest[]> {
    return this.find({
      filters: { threadId: threadId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据工作流ID查找请求
   */
  async findByWorkflowId(workflowId: ID): Promise<LLMRequest[]> {
    return this.find({
      filters: { workflowId: workflowId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据节点ID查找请求
   */
  async findByNodeId(nodeId: ID): Promise<LLMRequest[]> {
    return this.find({
      filters: { nodeId: nodeId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据模型查找请求
   */
  async findByModel(model: string): Promise<LLMRequest[]> {
    return this.find({
      filters: { model },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 根据多个实体ID查找请求
   */
  async findByEntityIds(options: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
  }): Promise<LLMRequest[]> {
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
   * 根据创建时间范围查找请求
   */
  async findByTimeRange(startTime: Date, endTime: Date): Promise<LLMRequest[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('request')
      .where('request.createdAt >= :startTime', { startTime })
      .andWhere('request.createdAt <= :endTime', { endTime })
      .andWhere('request.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('request.createdAt', 'DESC')
      .getMany();

    return models.map(model => this.toDomain(model));
  }

  /**
   * 根据会话ID和时间范围查找请求
   */
  async findBySessionIdAndTimeRange(sessionId: ID, startTime: Date, endTime: Date): Promise<LLMRequest[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('request')
      .where('request.sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('request.createdAt >= :startTime', { startTime })
      .andWhere('request.createdAt <= :endTime', { endTime })
      .andWhere('request.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('request.createdAt', 'DESC')
      .getMany();

    return models.map(model => this.toDomain(model));
  }

  /**
   * 根据线程ID和时间范围查找请求
   */
  async findByThreadIdAndTimeRange(threadId: ID, startTime: Date, endTime: Date): Promise<LLMRequest[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('request')
      .where('request.threadId = :threadId', { threadId: threadId.value })
      .andWhere('request.createdAt >= :startTime', { startTime })
      .andWhere('request.createdAt <= :endTime', { endTime })
      .andWhere('request.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('request.createdAt', 'DESC')
      .getMany();

    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找最新的请求
   */
  async findLatest(limit: number = 10): Promise<LLMRequest[]> {
    return this.find({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找指定会话ID的最新请求
   */
  async findLatestBySessionId(sessionId: ID, limit: number = 10): Promise<LLMRequest[]> {
    return this.find({
      filters: { sessionId: sessionId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找指定线程ID的最新请求
   */
  async findLatestByThreadId(threadId: ID, limit: number = 10): Promise<LLMRequest[]> {
    return this.find({
      filters: { threadId: threadId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找指定工作流ID的最新请求
   */
  async findLatestByWorkflowId(workflowId: ID, limit: number = 10): Promise<LLMRequest[]> {
    return this.find({
      filters: { workflowId: workflowId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找指定节点ID的最新请求
   */
  async findLatestByNodeId(nodeId: ID, limit: number = 10): Promise<LLMRequest[]> {
    return this.find({
      filters: { nodeId: nodeId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 查找指定模型名称的最新请求
   */
  async findLatestByModel(model: string, limit: number = 10): Promise<LLMRequest[]> {
    return this.find({
      filters: { model },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    });
  }

  /**
   * 统计请求数量
   */
  async countByCriteria(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<number> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('request');

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('request.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('request.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('request.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('request.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('request.model = :model', { model: options.model });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('request.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('request.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('request.isDeleted = :isDeleted', { isDeleted: false });

    return queryBuilder.getCount();
  }

  /**
   * 统计不同模型的请求数量
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
    let queryBuilder = repository.createQueryBuilder('request');

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('request.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('request.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('request.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('request.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('request.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('request.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('request.isDeleted = :isDeleted', { isDeleted: false });

    const results = await queryBuilder
      .select('request.model', 'model')
      .addSelect('COUNT(*)', 'count')
      .groupBy('request.model')
      .getRawMany();

    const byModel: Record<string, number> = {};
    results.forEach(result => {
      byModel[result.model] = parseInt(result.count);
    });

    return byModel;
  }

  /**
   * 删除指定时间之前的请求
   */
  async deleteBeforeTime(beforeTime: Date): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository
      .createQueryBuilder('request')
      .delete()
      .where('createdAt < :beforeTime', { beforeTime })
      .execute();

    return result.affected || 0;
  }

  /**
   * 删除指定工作流ID的请求
   */
  async deleteByWorkflowId(workflowId: ID): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ workflowId: workflowId.value });
    return result.affected || 0;
  }

  /**
   * 清理过期请求
   */
  async cleanupExpired(retentionDays: number): Promise<number> {
    const beforeTime = new Date();
    beforeTime.setDate(beforeTime.getDate() - retentionDays);
    return this.deleteBeforeTime(beforeTime);
  }

  /**
   * 归档请求
   */
  async archiveBeforeTime(beforeTime: Date): Promise<number> {
    // 归档逻辑可以标记为已删除或移动到归档表
    return this.deleteBeforeTime(beforeTime);
  }

  /**
   * 获取请求趋势
   */
  async getTrend(
    startTime: Date,
    endTime: Date,
    interval: number
  ): Promise<Array<{ timestamp: Date; count: number; byModel: Record<string, number> }>> {
    const repository = await this.getRepository();
    const results = await repository
      .createQueryBuilder('request')
      .select('DATE_TRUNC(\'minute\', request.createdAt)', 'timestamp')
      .addSelect('COUNT(*)', 'count')
      .addSelect('request.model', 'model')
      .where('request.createdAt >= :startTime', { startTime })
      .andWhere('request.createdAt <= :endTime', { endTime })
      .andWhere('request.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('DATE_TRUNC(\'minute\', request.createdAt), request.model')
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    const trendMap = new Map<string, { timestamp: Date; count: number; byModel: Record<string, number> }>();

    results.forEach(result => {
      const timestamp = new Date(result.timestamp);
      const key = timestamp.toISOString();

      if (!trendMap.has(key)) {
        trendMap.set(key, { timestamp, count: 0, byModel: {} });
      }

      const trend = trendMap.get(key)!;
      trend.count += parseInt(result.count);
      trend.byModel[result.model] = (trend.byModel[result.model] || 0) + parseInt(result.count);
    });

    return Array.from(trendMap.values());
  }

  /**
   * 搜索请求
   */
  async search(
    query: string,
    options?: {
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      nodeId?: ID;
      model?: string;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<LLMRequest[]> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('request');

    // 在消息内容中搜索
    queryBuilder = queryBuilder.andWhere('request.messages::text LIKE :query', { query: `%${query}%` });

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('request.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('request.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('request.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('request.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('request.model = :model', { model: options.model });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('request.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('request.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('request.isDeleted = :isDeleted', { isDeleted: false });

    if (options?.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }
    if (options?.offset) {
      queryBuilder = queryBuilder.offset(options.offset);
    }

    const models = await queryBuilder.orderBy('request.createdAt', 'DESC').getMany();
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
    byEntity: Record<string, number>;
    averageMessages: number;
    latestAt?: Date;
    oldestAt?: Date;
  }> {
    const repository = await this.getRepository();
    let queryBuilder = repository.createQueryBuilder('request');

    if (options?.sessionId) {
      queryBuilder = queryBuilder.andWhere('request.sessionId = :sessionId', { sessionId: options.sessionId.value });
    }
    if (options?.threadId) {
      queryBuilder = queryBuilder.andWhere('request.threadId = :threadId', { threadId: options.threadId.value });
    }
    if (options?.workflowId) {
      queryBuilder = queryBuilder.andWhere('request.workflowId = :workflowId', { workflowId: options.workflowId.value });
    }
    if (options?.nodeId) {
      queryBuilder = queryBuilder.andWhere('request.nodeId = :nodeId', { nodeId: options.nodeId.value });
    }
    if (options?.model) {
      queryBuilder = queryBuilder.andWhere('request.model = :model', { model: options.model });
    }
    if (options?.startTime) {
      queryBuilder = queryBuilder.andWhere('request.createdAt >= :startTime', { startTime: options.startTime });
    }
    if (options?.endTime) {
      queryBuilder = queryBuilder.andWhere('request.createdAt <= :endTime', { endTime: options.endTime });
    }

    queryBuilder = queryBuilder.andWhere('request.isDeleted = :isDeleted', { isDeleted: false });

    const total = await queryBuilder.getCount();

    const byModelResults = await queryBuilder
      .select('request.model', 'model')
      .addSelect('COUNT(*)', 'count')
      .groupBy('request.model')
      .getRawMany();

    const byModel: Record<string, number> = {};
    byModelResults.forEach(result => {
      byModel[result.model] = parseInt(result.count);
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

    const averageMessagesResults = await queryBuilder
      .select('AVG(jsonb_array_length(request.messages))', 'avgMessages')
      .getRawOne();

    const averageMessages = parseFloat(averageMessagesResults.avgMessages) || 0;

    // 获取最新和最旧的时间
    const timeResults = await queryBuilder
      .select('MAX(request.createdAt)', 'latestAt')
      .addSelect('MIN(request.createdAt)', 'oldestAt')
      .getRawOne();

    return {
      total,
      byModel,
      byEntity,
      averageMessages,
      latestAt: timeResults.latestAt,
      oldestAt: timeResults.oldestAt,
    };
  }

  /**
   * 删除会话的所有请求
   */
  async deleteBySessionId(sessionId: ID): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ sessionId: sessionId.value });
    return result.affected || 0;
  }

  /**
   * 删除线程的所有请求
   */
  async deleteByThreadId(threadId: ID): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ threadId: threadId.value });
    return result.affected || 0;
  }
}