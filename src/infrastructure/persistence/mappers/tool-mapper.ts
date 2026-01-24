/**
 * ToolMapper
 * 负责ToolModel与Tool实体之间的转换
 */

import { BaseMapper } from './base-mapper';
import { Tool } from '../../../domain/tools/entities/tool';
import { ToolModel } from '../models/tool.model';
import { ID } from '../../../domain/common/value-objects/id';
import { ToolType } from '../../../domain/tools/value-objects/tool-type';
import { ToolStatus } from '../../../domain/tools/value-objects/tool-status';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { Metadata } from '../../../domain/common/value-objects';
import { Tags } from '../../../domain/threads/checkpoints/value-objects/tags';
import { DeletionStatus } from '../../../domain/common/value-objects';
import { StateData } from '../../../domain/threads/checkpoints/value-objects/state-data';
import { ExecutionError } from '../../../../common/exceptions';

export class ToolMapper implements BaseMapper<Tool, ToolModel> {
  /**
   * 将数据库模型转换为领域实体
   */
  toDomain(model: ToolModel): Tool {
    try {
      const id = new ID(model.id);
      const type = ToolType.fromString(model.type);
      const status = ToolStatus.fromString(model.status);
      const metadata = Metadata.create(model.metadata || {});
      const tags = Tags.create(model.tags || []);
      const createdAt = Timestamp.create(model.createdAt);
      const updatedAt = Timestamp.create(model.updatedAt);
      const version = Version.fromString(model.version);
      const createdBy = model.createdBy ? new ID(model.createdBy) : undefined;
      const dependencies = model.dependencies.map(depId => new ID(depId));

      const toolData = {
        id,
        name: model.name,
        description: model.description,
        type,
        status,
        config: StateData.create(model.config),
        parameters: model.parameters,
        returns: model.returns,
        metadata,
        createdAt,
        updatedAt,
        version,
        createdBy,
        tags,
        category: model.category,
        isBuiltin: model.isBuiltin,
        isEnabled: model.isEnabled,
        timeout: model.timeout,
        maxRetries: model.maxRetries,
        permissions: model.permissions,
        dependencies,
        deletionStatus: DeletionStatus.fromBoolean(model.isDeleted),
      };

      return Tool.fromProps(toolData);
    } catch (error) {
      throw new ExecutionError(`Tool模型转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 将领域实体转换为数据库模型
   */
  toModel(entity: Tool): ToolModel {
    try {
      const model = new ToolModel();

      model.id = entity.toolId.value;
      model.name = entity.name;
      model.description = entity.description;
      model.type = entity.type.value;
      model.status = entity.status.value;
      model.config = entity.config.toRecord();
      model.parameters = entity.parameters;
      model.returns = entity.returns;
      model.metadata = entity.metadata.toRecord();
      model.version = entity.version.getValue();
      model.createdBy = entity.createdBy ? entity.createdBy.value : undefined;
      model.tags = entity.tags.toArray();
      model.category = entity.category;
      model.isBuiltin = entity.isBuiltin;
      model.isEnabled = entity.isEnabled;
      model.timeout = entity.timeout;
      model.maxRetries = entity.maxRetries;
      model.permissions = entity.permissions;
      model.dependencies = entity.dependencies.map(depId => depId.value);
      model.isDeleted = entity.isDeleted();
      model.createdAt = entity.createdAt.toDate();
      model.updatedAt = entity.updatedAt.toDate();

      return model;
    } catch (error) {
      throw new ExecutionError(`Tool实体转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}