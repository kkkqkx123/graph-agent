/**
 * ThreadMapper
 * 负责ThreadModel与Thread实体之间的转换
 */

import { BaseMapper } from './base-mapper';
import { Thread } from '../../../domain/threads/entities/thread';
import { ThreadModel } from '../models/thread.model';
import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { Metadata, DeletionStatus } from '../../../domain/common/value-objects';
import { State } from '../../../domain/state/entities/state';
import { StateEntityType } from '../../../domain/state/value-objects/state-entity-type';
import { ThreadExecutionContext, ExecutionConfig } from '../../../domain/threads/value-objects/execution-context';
import { ExecutionError } from '../../../common/exceptions';

export class ThreadMapper implements BaseMapper<Thread, ThreadModel> {
  /**
   * 将数据库模型转换为领域实体
   */
  toDomain(model: ThreadModel): Thread {
    try {
      const id = new ID(model.id);
      const sessionId = new ID(model.sessionId);
      const workflowId = model.workflowId ? new ID(model.workflowId) : ID.empty();
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

      // 创建ThreadExecutionContext
      const executionContext = ThreadExecutionContext.fromObject({
        variables: (model.metadata?.context?.variables as Record<string, unknown>) || {},
        nodeContexts: (model.metadata?.context?.nodeContexts as Record<string, any>) || {},
        metadata: (model.metadata?.context?.metadata as Record<string, unknown>) || {},
        executionConfig: (model.metadata?.context?.executionConfig as ExecutionConfig) || {},
      });

      // 创建ExecutionConfig
      const executionConfig: ExecutionConfig = executionContext.executionConfig || {};

      const threadData = {
        id,
        sessionId,
        workflowId,
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
      throw new ExecutionError(`Thread模型转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 将领域实体转换为数据库模型
   */
  toModel(entity: Thread): ThreadModel {
    try {
      const model = new ThreadModel();

      model.id = entity.threadId.value;
      model.sessionId = entity.sessionId.value;
      model.workflowId = entity.workflowId ? entity.workflowId.value : undefined;
      model.name = entity.title || '';
      model.description = entity.description || '';
      model.state = entity.status as any;

      // 执行状态字段
      const execution = entity.execution;
      model.executionStatus = entity.status as any;
      model.progress = execution['progress'] as number;
      model.currentStep = execution['currentStep'] as string | undefined;
      model.startedAt = execution['startedAt'] ? new Date(execution['startedAt'] as string) : undefined;
      model.completedAt = execution['completedAt'] ? new Date(execution['completedAt'] as string) : undefined;
      model.errorMessage = execution['errorMessage'] as string | undefined;
      model.retryCount = execution['retryCount'] as number;
      model.lastActivityAt = new Date(execution['lastActivityAt'] as string);

      model.context = entity.metadata.toRecord();
      model.version = entity.version.getValue();
      model.createdAt = entity.createdAt.toDate();
      model.updatedAt = entity.updatedAt.toDate();

      // 序列化ThreadExecutionContext到metadata
      const contextData = entity.executionContext.toObject();

      model.metadata = {
        ...entity.metadata.toRecord(),
        isDeleted: entity.isDeleted(),
        context: contextData,
      };

      return model;
    } catch (error) {
      throw new ExecutionError(`Thread实体转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}