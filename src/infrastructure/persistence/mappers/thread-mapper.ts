/**
 * ThreadMapper
 * 负责ThreadModel与Thread实体之间的转换
 */

import { BaseMapper, ok, err, combine, MapperResult } from './base-mapper';
import { Thread } from '../../../domain/threads/entities/thread';
import { ThreadModel } from '../models/thread.model';
import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { Metadata, DeletionStatus } from '../../../domain/common/value-objects';
import { State } from '../../../domain/state/entities/state';
import { StateEntityType } from '../../../domain/state/value-objects/state-entity-type';
import { ThreadExecutionContext, ExecutionConfig } from '../../../domain/threads/value-objects/execution-context';
import {
  DomainMappingError,
  MapperErrorCode,
  MappingErrorBuilder,
  safeStringify,
} from '../errors/mapper-errors';

export class ThreadMapper implements BaseMapper<Thread, ThreadModel> {
  /**
   * 将数据库模型转换为领域实体
   */
  toDomain(model: ThreadModel): MapperResult<Thread> {
    const validationResult = this.validateModel(model);
    if (!validationResult.success) {
      return validationResult;
    }

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

      const thread = Thread.fromProps(threadData);
      return ok(thread);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.TYPE_CONVERSION_ERROR)
          .message(`Thread模型转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            modelId: model.id,
            modelData: safeStringify(model),
          })
          .addPath('ThreadMapper')
          .addPath('toDomain')
          .cause(error instanceof Error ? error : new Error(String(error)))
          .build(),
      );
    }
  }

  /**
   * 将领域实体转换为数据库模型
   */
  toModel(entity: Thread): MapperResult<ThreadModel> {
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

      return ok(model);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.TYPE_CONVERSION_ERROR)
          .message(`Thread实体转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            entityId: entity.threadId.value,
            entityData: safeStringify(entity),
          })
          .addPath('ThreadMapper')
          .addPath('toModel')
          .cause(error instanceof Error ? error : new Error(String(error)))
          .build(),
      );
    }
  }

  /**
   * 批量转换
   */
  toDomainBatch(models: ThreadModel[]): MapperResult<Thread[]> {
    const results = models.map(model => this.toDomain(model));
    return combine(results);
  }

  /**
   * 验证模型数据
   */
  private validateModel(model: ThreadModel): MapperResult<void> {
    const errors: string[] = [];

    if (!model.id) {
      errors.push('Model ID is required');
    }

    if (!model.sessionId) {
      errors.push('Model sessionId is required');
    }

    if (!model.state) {
      errors.push('Model state is required');
    }

    if (errors.length > 0) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.VALIDATION_ERROR)
          .message(`Thread模型验证失败: ${errors.join(', ')}`)
          .context({
            modelId: model.id,
            validationErrors: errors,
          })
          .addPath('ThreadMapper')
          .addPath('validateModel')
          .build(),
      );
    }

    return ok(undefined);
  }
}