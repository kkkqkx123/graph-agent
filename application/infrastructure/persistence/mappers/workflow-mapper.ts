/**
 * WorkflowMapper
 * 负责WorkflowModel与Workflow实体之间的转换
 */

import { BaseMapper } from './base-mapper';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { WorkflowModel } from '../models/workflow.model';
import { ID } from '../../../domain/common/value-objects/id';
import { WorkflowDefinition } from '../../../domain/workflow/value-objects/workflow-definition';
import { ExecutionStrategy } from '../../../domain/workflow/value-objects/execution/execution-strategy';
import { WorkflowStatus } from '../../../domain/workflow/value-objects/workflow-status';
import { parseWorkflowType } from '../../../domain/workflow/value-objects/workflow-type';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { ExecutionError } from '../../../domain/common/exceptions';

export class WorkflowMapper implements BaseMapper<Workflow, WorkflowModel> {
  /**
   * 将数据库模型转换为领域实体
   */
  toDomain(model: WorkflowModel): Workflow {
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

      const workflow = Workflow.fromProps({
        id: new ID(model.id),
        definition: definition,
        graph: { nodes: new Map(), edges: new Map() },
        subWorkflowReferences: new Map(),
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        createdBy: model.createdBy ? new ID(model.createdBy) : undefined,
        updatedBy: model.updatedBy ? new ID(model.updatedBy) : undefined,
      });
      return workflow;
    } catch (error) {
      throw new ExecutionError(`Workflow实体创建失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 将领域实体转换为数据库模型
   */
  toModel(domain: Workflow): WorkflowModel {
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

      return model;
    } catch (error) {
      throw new ExecutionError(`Workflow实体转换失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}