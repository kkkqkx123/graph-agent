/**
 * LLMRequestMapper
 * 负责LLMRequestModel与LLMRequest实体之间的转换
 */

import { BaseMapper, ok, err, combine, MapperResult } from './base-mapper';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMRequestModel } from '../models/llm-request.model';
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

export class LLMRequestMapper implements BaseMapper<LLMRequest, LLMRequestModel> {
  /**
   * 将数据库模型转换为领域实体
   */
  toDomain(model: LLMRequestModel): MapperResult<LLMRequest> {
    const validationResult = this.validateModel(model);
    if (!validationResult.success) {
      return validationResult;
    }

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

      const request = LLMRequest.fromProps(requestProps);
      return ok(request);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.TYPE_CONVERSION_ERROR)
          .message(`LLMRequest模型转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            modelId: model.id,
            modelData: safeStringify(model),
          })
          .addPath('LLMRequestMapper')
          .addPath('toDomain')
          .cause(error instanceof Error ? error : new Error(String(error)))
          .build(),
      );
    }
  }

  /**
   * 将领域实体转换为数据库模型
   */
  toModel(entity: LLMRequest): MapperResult<LLMRequestModel> {
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
          timestamp: msgInterface.timestamp?.toDate(),
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
      model.createdAt = entity.createdAt.toDate();
      model.updatedAt = entity.updatedAt.toDate();

      return ok(model);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.TYPE_CONVERSION_ERROR)
          .message(`LLMRequest实体转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            entityId: entity.requestId.value,
            entityData: safeStringify(entity),
          })
          .addPath('LLMRequestMapper')
          .addPath('toModel')
          .cause(error instanceof Error ? error : new Error(String(error)))
          .build(),
      );
    }
  }

  /**
   * 批量转换
   */
  toDomainBatch(models: LLMRequestModel[]): MapperResult<LLMRequest[]> {
    const results = models.map(model => this.toDomain(model));
    return combine(results);
  }

  /**
   * 验证模型数据
   */
  private validateModel(model: LLMRequestModel): MapperResult<void> {
    const errors: string[] = [];

    if (!model.id) {
      errors.push('Model ID is required');
    }

    if (!model.model) {
      errors.push('Model name is required');
    }

    if (!Array.isArray(model.messages)) {
      errors.push('Messages must be an array');
    }

    if (errors.length > 0) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.VALIDATION_ERROR)
          .message(`LLMRequest模型验证失败: ${errors.join(', ')}`)
          .context({
            modelId: model.id,
            validationErrors: errors,
          })
          .addPath('LLMRequestMapper')
          .addPath('validateModel')
          .build(),
      );
    }

    return ok(undefined);
  }
}