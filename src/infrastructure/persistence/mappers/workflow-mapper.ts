/**
 * WorkflowMapper
 * 负责WorkflowModel与Workflow实体之间的转换
 */

import { BaseMapper, ok, err, combine, MapperResult } from './base-mapper';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { WorkflowModel } from '../models/workflow.model';
import { ID } from '../../../domain/common/value-objects/id';
import { WorkflowDefinition } from '../../../domain/workflow/value-objects/workflow-definition';
import { ExecutionStrategy } from '../../../domain/workflow/value-objects/execution/execution-strategy';
import { WorkflowStatus } from '../../../domain/workflow/value-objects/workflow-status';
import { parseWorkflowType } from '../../../domain/workflow/value-objects/workflow-type';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import {
  DomainMappingError,
  MapperErrorCode,
  MappingErrorBuilder,
  safeStringify,
} from '../errors/mapper-errors';

export class WorkflowMapper implements BaseMapper<Workflow, WorkflowModel> {
  /**
   * 将数据库模型转换为领域实体
   */
  toDomain(model: WorkflowModel): MapperResult<Workflow> {
    const validationResult = this.validateModel(model);
    if (!validationResult.success) {
      return validationResult;
    }

    const definitionResult = this.extractDefinition(model);
    if (!definitionResult.success) {
      return definitionResult;
    }

    const metadataResult = this.extractMetadata(model);
    if (!metadataResult.success) {
      return metadataResult;
    }

    try {
      const workflow = Workflow.fromProps({
        id: new ID(model.id),
        definition: definitionResult.value,
        graph: { nodes: new Map(), edges: new Map() },
        subWorkflowReferences: new Map(),
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        createdBy: metadataResult.value.createdBy,
        updatedBy: metadataResult.value.updatedBy,
      });
      return ok(workflow);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.TYPE_CONVERSION_ERROR)
          .message(`Workflow实体创建失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            modelId: model.id,
            modelData: safeStringify(model),
          })
          .addPath('WorkflowMapper')
          .addPath('toDomain')
          .addPath('createWorkflow')
          .cause(error instanceof Error ? error : new Error(String(error)))
          .build(),
      );
    }
  }

  /**
   * 将领域实体转换为数据库模型
   */
  toModel(domain: Workflow): MapperResult<WorkflowModel> {
    try {
      const model = new WorkflowModel();

      model.id = domain.workflowId.value;
      model.name = domain.name;
      model.description = domain.description || undefined;
      model.state = domain.status.getValue();
      model.executionMode = domain.type;
      model.metadata = {
        ...domain.metadata,
        tags: domain.tags,
        isDeleted: domain.isDeleted(),
        definition: domain.getDefinition(),
      };
      model.configuration = domain.config;
      model.version = domain.version.getValue();
      model.revision = parseInt(domain.version.getValue().split('.')[2] || '0');
      model.createdBy = domain.createdBy ? domain.createdBy.value : undefined;
      model.updatedBy = domain.updatedBy ? domain.updatedBy.value : undefined;
      model.createdAt = domain.createdAt.toDate();
      model.updatedAt = domain.updatedAt.toDate();

      return ok(model);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.TYPE_CONVERSION_ERROR)
          .message(`Workflow实体转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            entityId: domain.workflowId.value,
            entityData: safeStringify(domain),
          })
          .addPath('WorkflowMapper')
          .addPath('toModel')
          .cause(error instanceof Error ? error : new Error(String(error)))
          .build(),
      );
    }
  }

  /**
   * 批量转换
   */
  toDomainBatch(models: WorkflowModel[]): MapperResult<Workflow[]> {
    const results = models.map(model => this.toDomain(model));
    return combine(results);
  }

  /**
   * 验证模型数据
   */
  private validateModel(model: WorkflowModel): MapperResult<void> {
    const errors: string[] = [];

    if (!model.id) {
      errors.push('Model ID is required');
    }

    if (!model.name) {
      errors.push('Model name is required');
    }

    if (!model.state) {
      errors.push('Model state is required');
    }

    if (errors.length > 0) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.VALIDATION_ERROR)
          .message(`Workflow模型验证失败: ${errors.join(', ')}`)
          .context({
            modelId: model.id,
            validationErrors: errors,
          })
          .addPath('WorkflowMapper')
          .addPath('validateModel')
          .build(),
      );
    }

    return ok(undefined);
  }

  /**
   * 提取WorkflowDefinition
   */
  private extractDefinition(model: WorkflowModel): MapperResult<WorkflowDefinition> {
    try {
      const definition = WorkflowDefinition.fromProps({
        id: new ID(model.id),
        name: model.name,
        description: model.description || undefined,
        status: WorkflowStatus.fromString(model.state),
        type: parseWorkflowType(model.executionMode),
        config: model.configuration || {},
        executionStrategy: ExecutionStrategy.sequential(),
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        tags: model.metadata?.tags || [],
        metadata: model.metadata || {},
        isDeleted: model.metadata?.isDeleted || false,
        createdBy: model.createdBy ? new ID(model.createdBy) : undefined,
        updatedBy: model.updatedBy ? new ID(model.updatedBy) : undefined,
      });
      return ok(definition);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.DEFINITION_EXTRACTION_ERROR)
          .message(`WorkflowDefinition提取失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            modelId: model.id,
            field: 'definition',
          })
          .addPath('WorkflowMapper')
          .addPath('extractDefinition')
          .cause(error instanceof Error ? error : new Error(String(error)))
          .build(),
      );
    }
  }

  /**
   * 提取元数据
   */
  private extractMetadata(model: WorkflowModel): MapperResult<{
    createdBy?: ID;
    updatedBy?: ID;
  }> {
    try {
      const metadata = {
        createdBy: model.createdBy ? new ID(model.createdBy) : undefined,
        updatedBy: model.updatedBy ? new ID(model.updatedBy) : undefined,
      };
      return ok(metadata);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.METADATA_EXTRACTION_ERROR)
          .message(`元数据提取失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            modelId: model.id,
            field: 'metadata',
          })
          .addPath('WorkflowMapper')
          .addPath('extractMetadata')
          .cause(error instanceof Error ? error : new Error(String(error)))
          .build(),
      );
    }
  }
}