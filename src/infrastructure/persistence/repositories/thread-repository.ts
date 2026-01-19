import { injectable, inject } from 'inversify';
import { IThreadRepository } from '../../../domain/threads/repositories/thread-repository';
import { Thread } from '../../../domain/threads/entities/thread';
import { ID } from '../../../domain/common/value-objects/id';
import { ThreadStatus } from '../../../domain/threads/value-objects/thread-status';
import { ThreadStatusValue } from '../../../domain/threads/value-objects/thread-status';
import { ThreadPriority } from '../../../domain/threads/value-objects/thread-priority';
import { ThreadDefinition } from '../../../domain/threads/value-objects/thread-definition';
import { ThreadExecution } from '../../../domain/threads/value-objects/thread-execution';
import { ExecutionContext, ExecutionConfig } from '../../../domain/threads/value-objects/execution-context';
import { VariableManager } from '../../../domain/threads/value-objects/variable-manager';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { ThreadModel } from '../models/thread.model';
import { In } from 'typeorm';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connection-manager';
import { Metadata, DeletionStatus } from '../../../domain/common/value-objects';
import { State } from '../../../domain/state/entities/state';
import { StateEntityType } from '../../../domain/state/value-objects/state-entity-type';

@injectable()
export class ThreadRepository
  extends BaseRepository<Thread, ThreadModel, ID>
  implements IThreadRepository {
  constructor(@inject('ConnectionManager') connectionManager: ConnectionManager) {
    super(connectionManager);
  }

  protected getModelClass(): new () => ThreadModel {
    return ThreadModel;
  }

  /**
   * 重写toDomain方法
   */
  protected override toDomain(model: ThreadModel): Thread {
    try {
      const id = new ID(model.id);
      const sessionId = new ID(model.sessionId);
      const workflowId = model.workflowId ? new ID(model.workflowId) : ID.empty();
      const priority = ThreadPriority.fromNumber(model.priority);
      const title = model.name || undefined;
      const description = model.description || undefined;
      const metadata = model.context || {};
      const createdAt = Timestamp.create(model.createdAt);
      const updatedAt = Timestamp.create(model.updatedAt);
      const version = Version.fromString(model.version);
      const isDeleted = (model.metadata?.isDeleted as boolean) || false;

      // 创建State实体
      const state = State.create(
        id,
        StateEntityType.thread(),
        {
          status: model.state,
          execution: {
            progress: model.progress,
            currentStep: model.currentStep,
            startedAt: model.startedAt?.toISOString(),
            completedAt: model.completedAt?.toISOString(),
            errorMessage: model.errorMessage,
            retryCount: model.retryCount,
            lastActivityAt: model.lastActivityAt.toISOString(),
          },
          context: {
            variables: (model.metadata?.context?.variables as Record<string, unknown>) || {},
            nodeContexts: (model.metadata?.context?.nodeContexts as Record<string, unknown>) || {},
            promptContext: (model.metadata?.context?.promptContext as Record<string, unknown>) || {},
          },
        },
        {
          workflowId: workflowId.value,
          sessionId: sessionId.value,
        }
      );

      // 创建ExecutionContext（使用VariableManager）
      const contextVariables = new Map(
        Object.entries((model.metadata?.context?.variables as Record<string, unknown>) || {})
      );
      const nodeResults = new Map(
        Object.entries((model.metadata?.context?.nodeResults as Record<string, unknown>) || {})
      );
      
      // 创建VariableManager
      const variableManager = VariableManager.create({
        globalVariables: contextVariables,
        nodeResults: nodeResults,
        localVariables: new Map(),
      });

      // 创建ExecutionContext
      const executionContext = ExecutionContext.fromProps({
        variables: variableManager.globalVariables,
        nodeResults: variableManager.nodeResults,
        nodeContexts: new Map(),
        metadata: (model.metadata?.context?.metadata as Record<string, unknown>) || {},
      });

      // 创建ExecutionConfig
      const executionConfig: ExecutionConfig = (model.metadata?.context?.executionConfig as ExecutionConfig) || {};

      const threadData = {
        id,
        sessionId,
        workflowId,
        priority,
        title,
        description,
        metadata: Metadata.create(metadata),
        deletionStatus: DeletionStatus.fromBoolean(isDeleted),
        createdAt,
        updatedAt,
        version,
        state,
        executionContext,
        executionConfig,
      };

      return Thread.fromProps(threadData);
    } catch (error) {
      const errorMessage = `Thread模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toDomain' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法
   */
  protected override toModel(entity: Thread): ThreadModel {
    try {
      const model = new ThreadModel();

      model.id = entity.threadId.value;
      model.sessionId = entity.sessionId.value;
      model.workflowId = entity.workflowId ? entity.workflowId.value : undefined;
      model.name = entity.title || '';
      model.description = entity.description || '';
      model.state = entity.status as ThreadStatusValue;
      model.priority = entity.priority.getNumericValue();

      // 执行状态字段
      const execution = entity.execution;
      model.executionStatus = entity.status as ThreadStatusValue;
      model.progress = execution['progress'] as number;
      model.currentStep = execution['currentStep'] as string | undefined;
      model.startedAt = execution['startedAt'] ? new Date(execution['startedAt'] as string) : undefined;
      model.completedAt = execution['completedAt'] ? new Date(execution['completedAt'] as string) : undefined;
      model.errorMessage = execution['errorMessage'] as string | undefined;
      model.retryCount = execution['retryCount'] as number;
      model.lastActivityAt = new Date(execution['lastActivityAt'] as string);

      model.context = entity.metadata.toRecord();
      model.version = entity.version.getValue();
      model.createdAt = entity.createdAt.getDate();
      model.updatedAt = entity.updatedAt.getDate();

      // 序列化ExecutionContext到metadata（使用VariableManager）
      const variableManager = VariableManager.create({
        globalVariables: entity.executionContext.variables,
        nodeResults: entity.executionContext.nodeResults,
        localVariables: new Map(), // 节点局部变量在nodeContexts中
      });

      const contextData = {
        variables: Object.fromEntries(variableManager.globalVariables),
        nodeResults: Object.fromEntries(variableManager.nodeResults),
        nodeContexts: Object.fromEntries(
          Array.from(entity.executionContext.nodeContexts.entries()).map(([nodeId, context]) => [
            nodeId,
            {
              nodeId: context.nodeId.toString(),
              localVariables: Object.fromEntries(context.localVariables),
              metadata: context.metadata,
              lastAccessedAt: context.lastAccessedAt.toISOString(),
            },
          ])
        ),
        metadata: entity.executionContext.metadata,
        executionConfig: entity.executionConfig,
      };

      model.metadata = {
        ...entity.metadata.toRecord(),
        isDeleted: entity.isDeleted(),
        context: contextData,
      };

      return model;
    } catch (error) {
      const errorMessage = `Thread实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.threadId.value, operation: 'toModel' };
      throw customError;
    }
  }

  /**
   * 查找会话的活跃线程
   */
  async findActiveThreadsForSession(sessionId: ID): Promise<Thread[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('thread.status IN (:...statuses)', { statuses: ['pending', 'running', 'paused'] })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.updatedAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找会话的线程
   */
  async findThreadsForSession(sessionId: ID): Promise<Thread[]> {
    return this.find({
      filters: { sessionId: sessionId.value },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 查找工作流的线程
   */
  async findThreadsForWorkflow(workflowId: ID): Promise<Thread[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.workflowId = :workflowId', { workflowId: workflowId.value })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.createdAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找指定状态的线程
   */
  async findByStatus(status: ThreadStatus): Promise<Thread[]> {
    return this.find({
      filters: { state: status.getValue() },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 查找失败的线程
   */
  async findFailedThreads(sessionId?: ID): Promise<Thread[]> {
    const repository = await this.getRepository();
    let queryBuilder = repository
      .createQueryBuilder('thread')
      .where('thread.status = :status', { status: 'failed' })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false });

    if (sessionId) {
      queryBuilder = queryBuilder.andWhere('thread.sessionId = :sessionId', {
        sessionId: sessionId.value,
      });
    }

    const models = await queryBuilder.orderBy('thread.updatedAt', 'DESC').getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找运行中的线程
   */
  async findRunningThreads(): Promise<Thread[]> {
    return this.find({
      filters: { state: 'running' },
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
  }

  /**
   * 查找待处理的线程
   */
  async findPendingThreads(): Promise<Thread[]> {
    return this.find({
      filters: { state: 'pending' },
      sortBy: 'priority',
      sortOrder: 'desc',
    });
  }

  /**
   * 获取下一个待处理线程
   */
  async getNextPendingThread(sessionId?: ID): Promise<Thread | null> {
    const repository = await this.getRepository();
    let queryBuilder = repository
      .createQueryBuilder('thread')
      .where('thread.status = :status', { status: 'pending' })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.priority', 'DESC')
      .addOrderBy('thread.createdAt', 'ASC')
      .take(1);

    if (sessionId) {
      queryBuilder = queryBuilder.andWhere('thread.sessionId = :sessionId', {
        sessionId: sessionId.value,
      });
    }

    const model = await queryBuilder.getOne();
    return model ? this.toDomain(model) : null;
  }

  /**
   * 获取最高优先级的待处理线程
   */
  async getHighestPriorityPendingThread(sessionId?: ID): Promise<Thread | null> {
    return this.getNextPendingThread(sessionId);
  }

  /**
   * 检查会话是否有活跃线程
   */
  async hasActiveThreads(sessionId: ID): Promise<boolean> {
    const threads = await this.findActiveThreadsForSession(sessionId);
    return threads.length > 0;
  }

  /**
   * 检查会话是否有运行中的线程
   */
  async hasRunningThreads(sessionId: ID): Promise<boolean> {
    const repository = await this.getRepository();
    const count = await repository
      .createQueryBuilder('thread')
      .where('thread.sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('thread.status = :status', { status: 'running' })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .getCount();
    return count > 0;
  }

  /**
   * 获取会话的最后活跃线程
   */
  async getLastActiveThreadForSession(sessionId: ID): Promise<Thread | null> {
    const threads = await this.findActiveThreadsForSession(sessionId);
    return threads.length > 0 ? threads[0]! : null;
  }

  /**
   * 批量更新线程状态
   */
  async batchUpdateThreadStatus(threadIds: ID[], status: ThreadStatus): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.update(
      { id: In(threadIds.map(id => id.value)) },
      { state: status.getValue(), updatedAt: new Date() }
    );
    return result.affected || 0;
  }

  /**
   * 批量删除线程
   */
  async batchDelete(threadIds: ID[]): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ id: In(threadIds.map(id => id.value)) });
    return result.affected || 0;
  }

  /**
   * 删除会话的所有线程
   */
  async deleteAllThreadsForSession(sessionId: ID): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.delete({ sessionId: sessionId.value });
    return result.affected || 0;
  }

  /**
   * 取消会话的所有活跃线程
   */
  async batchCancelActiveThreadsForSession(sessionId: ID): Promise<number> {
    const repository = await this.getRepository();
    const result = await repository.update(
      { sessionId: sessionId.value, state: In([ThreadStatusValue.PENDING, ThreadStatusValue.RUNNING, ThreadStatusValue.PAUSED]) },
      { state: ThreadStatusValue.CANCELLED, updatedAt: new Date() }
    );
    return result.affected || 0;
  }

  /**
   * 查找需要清理的线程
   */
  async findThreadsNeedingCleanup(maxRunningHours: number): Promise<Thread[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxRunningHours);

    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.status IN (:...statuses)', { statuses: ['running', 'paused'] })
      .andWhere('thread.updatedAt < :cutoffTime', { cutoffTime })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.updatedAt', 'ASC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找高优先级的待执行线程
   */
  async findHighPriorityPendingThreads(minPriority: number): Promise<Thread[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.status = :status', { status: 'pending' })
      .andWhere('CAST(thread.priority AS INTEGER) >= :minPriority', { minPriority })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.priority', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找会话的运行中线程
   */
  async findRunningThreadsForSession(sessionId: ID): Promise<Thread[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.sessionId = :sessionId', { sessionId: sessionId.value })
      .andWhere('thread.status = :status', { status: 'running' })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.updatedAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找超时的线程
   */
  async findTimedOutThreads(timeoutHours: number): Promise<Thread[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - timeoutHours);

    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.status IN (:...statuses)', { statuses: ['running', 'paused'] })
      .andWhere('thread.createdAt < :cutoffTime', { cutoffTime })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.createdAt', 'ASC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 查找可重试的失败线程
   */
  async findRetryableFailedThreads(maxRetryCount: number): Promise<Thread[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('thread')
      .where('thread.status = :status', { status: 'failed' })
      .andWhere("CAST(thread.metadata->>'retryCount' AS INTEGER) < :maxRetryCount", {
        maxRetryCount,
      })
      .andWhere("thread.metadata->>'isDeleted' = :isDeleted", { isDeleted: false })
      .orderBy('thread.updatedAt', 'DESC')
      .getMany();
    return models.map(model => this.toDomain(model));
  }

  /**
   * 获取线程执行统计
   */
  async getThreadExecutionStats(threadId: ID): Promise<any> {
    const thread = await this.findById(threadId);
    if (!thread) {
      throw new Error('线程不存在');
    }
    return {
      threadId: threadId.value,
      status: thread.status,
      priority: thread.priority.getNumericValue(),
      createdAt: thread.createdAt.getDate(),
      updatedAt: thread.updatedAt.getDate(),
    };
  }
}
