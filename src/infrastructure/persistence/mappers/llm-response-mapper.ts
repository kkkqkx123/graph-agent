/**
 * LLMResponseMapper
 * 负责LLMResponseModel与LLMResponse实体之间的转换
 */

import { BaseMapper, ok, err, combine, MapperResult } from './base-mapper';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { LLMResponseModel } from '../models/llm-response.model';
import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { LLMMessage } from '../../../domain/llm/value-objects/llm-message';
import { DeletionStatus } from '../../../domain/common/value-objects';
import {
  DomainMappingError,
  MapperErrorCode,
  MappingErrorBuilder,
  safeStringify,
} from '../errors/mapper-errors';

export class LLMResponseMapper implements BaseMapper<LLMResponse, LLMResponseModel> {
  /**
   * 将数据库模型转换为领域实体
   */
  toDomain(model: LLMResponseModel): MapperResult<LLMResponse> {
    const validationResult = this.validateModel(model);
    if (!validationResult.success) {
      return validationResult;
    }

    try {
      const id = new ID(model.id);
      const requestId = new ID(model.requestId);
      const sessionId = model.sessionId ? new ID(model.sessionId) : undefined;
      const threadId = model.threadId ? new ID(model.threadId) : undefined;
      const workflowId = model.workflowId ? new ID(model.workflowId) : undefined;
      const nodeId = model.nodeId ? new ID(model.nodeId) : undefined;
      const createdAt = Timestamp.create(model.createdAt);
      const updatedAt = Timestamp.create(model.updatedAt);
      const version = Version.initial();

      // 转换选择
      const choices = model.choices.map(choice => ({
        index: choice.index,
        message: LLMMessage.fromInterface({
          role: choice.message.role,
          content: choice.message.content,
          name: choice.message.name,
          functionCall: choice.message.functionCall,
          toolCalls: choice.message.toolCalls,
          toolCallId: choice.message.toolCallId,
          timestamp: Timestamp.now(),
          metadata: choice.message.metadata,
        }),
        finish_reason: choice.finish_reason,
      }));

      const responseProps = {
        id,
        requestId,
        sessionId,
        threadId,
        workflowId,
        nodeId,
        model: model.model,
        choices,
        usage: model.usage,
        finishReason: model.finishReason,
        duration: model.duration,
        metadata: model.metadata,
        createdAt,
        updatedAt,
        version,
        deletionStatus: DeletionStatus.fromBoolean(model.isDeleted),
      };

      const response = LLMResponse.fromProps(responseProps);
      return ok(response);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.TYPE_CONVERSION_ERROR)
          .message(`LLMResponse模型转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            modelId: model.id,
            modelData: safeStringify(model),
          })
          .addPath('LLMResponseMapper')
          .addPath('toDomain')
          .cause(error instanceof Error ? error : new Error(String(error)))
          .build(),
      );
    }
  }

  /**
   * 将领域实体转换为数据库模型
   */
  toModel(entity: LLMResponse): MapperResult<LLMResponseModel> {
    try {
      const model = new LLMResponseModel();

      model.id = entity.responseId.value;
      model.requestId = entity.requestId.value;
      model.sessionId = entity.sessionId?.value;
      model.threadId = entity.threadId?.value;
      model.workflowId = entity.workflowId?.value;
      model.nodeId = entity.nodeId?.value;
      model.model = entity.model;

      // 转换选择
      model.choices = entity.choices.map(choice => {
        const msgInterface = choice.message.toInterface();
        return {
          index: choice.index,
          message: {
            role: msgInterface.role,
            content: msgInterface.content,
            name: msgInterface.name,
            functionCall: msgInterface.functionCall,
            toolCalls: msgInterface.toolCalls,
            toolCallId: msgInterface.toolCallId,
            timestamp: msgInterface.timestamp?.toDate(),
            metadata: msgInterface.metadata,
          },
          finish_reason: choice.finish_reason,
        };
      });

      model.usage = entity.usage;
      model.finishReason = entity.finishReason;
      model.duration = entity.duration;
      model.metadata = entity.metadata;
      model.isDeleted = entity.isDeleted();
      model.createdAt = entity.createdAt.toDate();
      model.updatedAt = entity.updatedAt.toDate();

      return ok(model);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.TYPE_CONVERSION_ERROR)
          .message(`LLMResponse实体转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            entityId: entity.responseId.value,
            entityData: safeStringify(entity),
          })
          .addPath('LLMResponseMapper')
          .addPath('toModel')
          .cause(error instanceof Error ? error : new Error(String(error)))
          .build(),
      );
    }
  }

  /**
   * 批量转换
   */
  toDomainBatch(models: LLMResponseModel[]): MapperResult<LLMResponse[]> {
    const results = models.map(model => this.toDomain(model));
    return combine(results);
  }

  /**
   * 验证模型数据
   */
  private validateModel(model: LLMResponseModel): MapperResult<void> {
    const errors: string[] = [];

    if (!model.id) {
      errors.push('Model ID is required');
    }

    if (!model.requestId) {
      errors.push('Model requestId is required');
    }

    if (!model.model) {
      errors.push('Model name is required');
    }

    if (!Array.isArray(model.choices)) {
      errors.push('Choices must be an array');
    }

    if (errors.length > 0) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.VALIDATION_ERROR)
          .message(`LLMResponse模型验证失败: ${errors.join(', ')}`)
          .context({
            modelId: model.id,
            validationErrors: errors,
          })
          .addPath('LLMResponseMapper')
          .addPath('validateModel')
          .build(),
      );
    }

    return ok(undefined);
  }
}