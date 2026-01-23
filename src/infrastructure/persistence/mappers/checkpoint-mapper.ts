/**
 * CheckpointMapper
 * 负责CheckpointModel与Checkpoint实体之间的转换
 */

import { BaseMapper, ok, err, combine, MapperResult } from './base-mapper';
import { Checkpoint } from '../../../domain/threads/checkpoints/entities/checkpoint';
import { CheckpointModel } from '../models/checkpoint.model';
import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { CheckpointStatus } from '../../../domain/threads/checkpoints/value-objects/checkpoint-status';
import { CheckpointType } from '../../../domain/threads/checkpoints/value-objects/checkpoint-type';
import { CheckpointScope } from '../../../domain/threads/checkpoints/value-objects/checkpoint-scope';
import {
  DomainMappingError,
  MapperErrorCode,
  MappingErrorBuilder,
  safeStringify,
} from '../errors/mapper-errors';

export class CheckpointMapper implements BaseMapper<Checkpoint, CheckpointModel> {
  /**
   * 将数据库模型转换为领域实体
   */
  toDomain(model: CheckpointModel): MapperResult<Checkpoint> {
    const validationResult = this.validateModel(model);
    if (!validationResult.success) {
      return validationResult;
    }

    try {
      const props = {
        id: new ID(model.id),
        threadId: new ID(model.threadId),
        scope: CheckpointScope.fromString(model.scope || 'thread'),
        type: CheckpointType.fromString(model.type),
        status: CheckpointStatus.fromString(model.status),
        title: model.title,
        description: model.description,
        stateData: model.stateData,
        tags: model.tags || [],
        metadata: model.metadata || {},
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        isDeleted: model.isDeleted,
        expiresAt: model.expiresAt ? Timestamp.create(model.expiresAt) : undefined,
        sizeBytes: model.sizeBytes,
        restoreCount: model.restoreCount,
        lastRestoredAt: model.lastRestoredAt ? Timestamp.create(model.lastRestoredAt) : undefined,
      };

      const checkpoint = Checkpoint.fromProps(props);
      return ok(checkpoint);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.TYPE_CONVERSION_ERROR)
          .message(`Checkpoint模型转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            modelId: model.id,
            modelData: safeStringify(model),
          })
          .addPath('CheckpointMapper')
          .addPath('toDomain')
          .cause(error instanceof Error ? error : new Error(String(error)))
          .build(),
      );
    }
  }

  /**
   * 将领域实体转换为数据库模型
   */
  toModel(entity: Checkpoint): MapperResult<CheckpointModel> {
    try {
      const model = new CheckpointModel();

      model.id = entity.checkpointId.value;
      model.threadId = entity.threadId.value;
      model.scope = entity.scope.toString();
      model.type = entity.type.toString();
      model.status = entity.status.value;
      model.title = entity.title;
      model.description = entity.description;
      model.stateData = entity.stateData;
      model.tags = entity.tags;
      model.metadata = entity.metadata;
      model.createdAt = entity.createdAt.toDate();
      model.updatedAt = entity.updatedAt.toDate();
      model.version = entity.version.toString();
      model.isDeleted = entity.isDeleted();
      model.expiresAt = entity.expiresAt?.toDate();
      model.sizeBytes = entity.sizeBytes;
      model.restoreCount = entity.restoreCount;
      model.lastRestoredAt = entity.lastRestoredAt?.toDate();

      return ok(model);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.TYPE_CONVERSION_ERROR)
          .message(`Checkpoint实体转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            entityId: entity.checkpointId.value,
            entityData: safeStringify(entity),
          })
          .addPath('CheckpointMapper')
          .addPath('toModel')
          .cause(error instanceof Error ? error : new Error(String(error)))
          .build(),
      );
    }
  }

  /**
   * 批量转换
   */
  toDomainBatch(models: CheckpointModel[]): MapperResult<Checkpoint[]> {
    const results = models.map(model => this.toDomain(model));
    return combine(results);
  }

  /**
   * 验证模型数据
   */
  private validateModel(model: CheckpointModel): MapperResult<void> {
    const errors: string[] = [];

    if (!model.id) {
      errors.push('Model ID is required');
    }

    if (!model.threadId) {
      errors.push('Model threadId is required');
    }

    if (!model.type) {
      errors.push('Model type is required');
    }

    if (!model.status) {
      errors.push('Model status is required');
    }

    if (errors.length > 0) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.VALIDATION_ERROR)
          .message(`Checkpoint模型验证失败: ${errors.join(', ')}`)
          .context({
            modelId: model.id,
            validationErrors: errors,
          })
          .addPath('CheckpointMapper')
          .addPath('validateModel')
          .build(),
      );
    }

    return ok(undefined);
  }
}