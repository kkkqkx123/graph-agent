import { injectable } from 'inversify';
import { Workflow } from '../../../../domain/workflow/entities/workflow';
import { ID } from '../../../../domain/common/value-objects/id';
import { Timestamp } from '../../../../domain/common/value-objects/timestamp';
import { Version } from '../../../../domain/common/value-objects/version';
import { WorkflowStatus } from '../../../../domain/workflow/value-objects/workflow-status';
import { WorkflowType } from '../../../../domain/workflow/value-objects/workflow-type';
import { WorkflowConfig } from '../../../../domain/workflow/value-objects/workflow-config';
import { WorkflowModel } from '../../models/workflow.model';

@injectable()
export class WorkflowMapper {
  toEntity(model: WorkflowModel): Workflow {
    const props = {
      id: ID.fromString(model.id),
      name: model.name,
      description: model.description || undefined,
      status: this.mapStateToStatus(model.state),
      type: this.mapExecutionModeToType(model.executionMode),
      config: this.mapConfigurationToConfig(model.configuration),
      graphId: model.graphId ? ID.fromString(model.graphId) : undefined,
      createdAt: Timestamp.create(model.createdAt),
      updatedAt: Timestamp.create(model.updatedAt),
      version: Version.fromString(model.revision.toString()),
      lastExecutedAt: model.metadata?.lastExecutedAt ? Timestamp.create(model.metadata.lastExecutedAt) : undefined,
      executionCount: model.metadata?.executionCount || 0,
      successCount: model.metadata?.successCount || 0,
      failureCount: model.metadata?.failureCount || 0,
      averageExecutionTime: model.metadata?.averageExecutionTime,
      tags: model.metadata?.tags || [],
      metadata: model.metadata || {},
      isDeleted: model.metadata?.isDeleted || false,
      createdBy: model.createdBy ? ID.fromString(model.createdBy) : undefined,
      updatedBy: model.updatedBy ? ID.fromString(model.updatedBy) : undefined
    };

    return Workflow.fromProps(props);
  }

  toModel(entity: Workflow): WorkflowModel {
    const model = new WorkflowModel();
    model.id = entity.workflowId.value;
    model.name = entity.name;
    model.description = entity.description || undefined;
    model.graphId = entity.graphId?.value ?? undefined;
    model.state = this.mapStatusToState(entity.status);
    model.executionMode = this.mapTypeToExecutionMode(entity.type);
    model.metadata = {
      ...entity.metadata,
      executionCount: entity.executionCount,
      successCount: entity.successCount,
      failureCount: entity.failureCount,
      averageExecutionTime: entity.averageExecutionTime,
      lastExecutedAt: entity.lastExecutedAt?.getDate() || null,
      tags: entity.tags,
      isDeleted: entity.isDeleted()
    };
    model.configuration = this.mapConfigToConfiguration(entity.config);
    model.version = entity.version.toString();
    model.revision = parseInt(entity.version.getValue());
    model.createdBy = entity.createdBy?.value ?? undefined;
    model.updatedBy = entity.updatedBy?.value ?? undefined;
    model.createdAt = entity.createdAt.getDate();
    model.updatedAt = entity.updatedAt.getDate();
    return model;
  }

  private mapStateToStatus(state: string): WorkflowStatus {
    switch (state) {
      case 'draft':
        return WorkflowStatus.draft();
      case 'active':
        return WorkflowStatus.active();
      case 'inactive':
        return WorkflowStatus.inactive();
      case 'archived':
        return WorkflowStatus.archived();
      default:
        return WorkflowStatus.draft();
    }
  }

  private mapStatusToState(status: WorkflowStatus): string {
    if (status.isDraft()) return 'draft';
    if (status.isActive()) return 'active';
    if (status.isInactive()) return 'inactive';
    if (status.isArchived()) return 'archived';
    return 'draft';
  }

  private mapExecutionModeToType(executionMode: string): WorkflowType {
    switch (executionMode) {
      case 'sequential':
        return WorkflowType.sequential();
      case 'parallel':
        return WorkflowType.parallel();
      case 'conditional':
        return WorkflowType.conditional();
      default:
        return WorkflowType.sequential();
    }
  }

  private mapTypeToExecutionMode(type: WorkflowType): string {
    if (type.isSequential()) return 'sequential';
    if (type.isParallel()) return 'parallel';
    if (type.isConditional()) return 'conditional';
    return 'sequential';
  }

  private mapConfigurationToConfig(configuration: any): WorkflowConfig {
    if (!configuration) {
      return WorkflowConfig.default();
    }
    
    return WorkflowConfig.create(configuration);
  }

  private mapConfigToConfiguration(config: WorkflowConfig): any {
    return config.value;
  }
}