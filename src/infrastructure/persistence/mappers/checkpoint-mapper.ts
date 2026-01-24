/**
 * CheckpointMapper
 * 负责CheckpointModel与Checkpoint实体之间的转换
 */

import { BaseMapper } from './base-mapper';
import { Checkpoint } from '../../../domain/threads/checkpoints/entities/checkpoint';
import { CheckpointModel } from '../models/checkpoint.model';
import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { CheckpointStatus } from '../../../domain/threads/checkpoints/value-objects/checkpoint-status';
import { CheckpointType } from '../../../domain/threads/checkpoints/value-objects/checkpoint-type';
import { CheckpointScope } from '../../../domain/threads/checkpoints/value-objects/checkpoint-scope';
import { ExecutionError } from '../../../domain/common/exceptions';

export class CheckpointMapper implements BaseMapper<Checkpoint, CheckpointModel> {
  /**
   * 将数据库模型转换为领域实体
   */
  toDomain(model: CheckpointModel): Checkpoint {
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

      return Checkpoint.fromProps(props);
    } catch (error) {
      throw new ExecutionError(`Checkpoint模型转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 将领域实体转换为数据库模型
   */
  toModel(entity: Checkpoint): CheckpointModel {
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

      return model;
    } catch (error) {
      throw new ExecutionError(`Checkpoint实体转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}