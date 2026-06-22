/**
 * Resource Manager - Handles workflow CRUD operations
 */

import { ErrorConverter, KitError, KitErrorCode } from '../converters/error.converter.js';
import type { WorkflowTemplate } from '../types/workflow.types.js';
import type { ResourceFilter, WorkflowVersion, WorkflowMetadata } from '../types/resource.types.js';

type SDKInstance = any;

/**
 * Resource Manager implementation
 */
export class ResourceManager {
  private errorConverter: ErrorConverter;
  private sdk: SDKInstance;

  constructor(sdk: SDKInstance) {
    this.sdk = sdk;
    this.errorConverter = new ErrorConverter();
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(template: WorkflowTemplate): Promise<string> {
    try {
      this.validateWorkflowTemplate(template);

      const registry = this.sdk.getFactory().getWorkflowRegistry();
      if (!registry) {
        throw new KitError(
          'Workflow registry not available',
          KitErrorCode.INTERNAL_ERROR
        );
      }

      const result = await registry.create(template);
      return this.errorConverter.convertResult<string>(result);
    } catch (error) {
      throw this.errorConverter.convertError(error);
    }
  }

  /**
   * Get a workflow by ID
   */
  async readWorkflow(id: string): Promise<WorkflowTemplate> {
    try {
      if (!id || typeof id !== 'string') {
        throw new KitError(
          'Workflow ID must be a non-empty string',
          KitErrorCode.VALIDATION_ERROR
        );
      }

      const registry = this.sdk.getFactory().getWorkflowRegistry();
      if (!registry) {
        throw new KitError(
          'Workflow registry not available',
          KitErrorCode.INTERNAL_ERROR
        );
      }

      const result = await registry.get(id);
      return this.errorConverter.convertResult<WorkflowTemplate>(result);
    } catch (error) {
      throw this.errorConverter.convertError(error);
    }
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(id: string, template: Partial<WorkflowTemplate>): Promise<void> {
    try {
      if (!id || typeof id !== 'string') {
        throw new KitError(
          'Workflow ID must be a non-empty string',
          KitErrorCode.VALIDATION_ERROR
        );
      }

      if (!template || typeof template !== 'object') {
        throw new KitError(
          'Template must be a valid object',
          KitErrorCode.VALIDATION_ERROR
        );
      }

      const registry = this.sdk.getFactory().getWorkflowRegistry();
      if (!registry) {
        throw new KitError(
          'Workflow registry not available',
          KitErrorCode.INTERNAL_ERROR
        );
      }

      const result = await registry.update(id, template);
      this.errorConverter.convertResult<void>(result);
    } catch (error) {
      throw this.errorConverter.convertError(error);
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    try {
      if (!id || typeof id !== 'string') {
        throw new KitError(
          'Workflow ID must be a non-empty string',
          KitErrorCode.VALIDATION_ERROR
        );
      }

      const registry = this.sdk.getFactory().getWorkflowRegistry();
      if (!registry) {
        throw new KitError(
          'Workflow registry not available',
          KitErrorCode.INTERNAL_ERROR
        );
      }

      const result = await registry.delete(id);
      this.errorConverter.convertResult<void>(result);
    } catch (error) {
      throw this.errorConverter.convertError(error);
    }
  }

  /**
   * List workflows with optional filtering
   */
  async listWorkflows(filter?: ResourceFilter): Promise<WorkflowTemplate[]> {
    try {
      const registry = this.sdk.getFactory().getWorkflowRegistry();
      if (!registry) {
        throw new KitError(
          'Workflow registry not available',
          KitErrorCode.INTERNAL_ERROR
        );
      }

      const result = await registry.list(filter);
      return this.errorConverter.convertResult<WorkflowTemplate[]>(result);
    } catch (error) {
      throw this.errorConverter.convertError(error);
    }
  }

  /**
   * Clone a workflow
   */
  async cloneWorkflow(sourceId: string, targetId: string): Promise<string> {
    try {
      if (!sourceId || typeof sourceId !== 'string') {
        throw new KitError(
          'Source workflow ID must be a non-empty string',
          KitErrorCode.VALIDATION_ERROR
        );
      }

      if (!targetId || typeof targetId !== 'string') {
        throw new KitError(
          'Target workflow ID must be a non-empty string',
          KitErrorCode.VALIDATION_ERROR
        );
      }

      // Get the source workflow
      const sourceWorkflow = await this.readWorkflow(sourceId);

      // Create a new workflow with the target ID
      const clonedTemplate: WorkflowTemplate = {
        ...sourceWorkflow,
        id: targetId,
        name: sourceWorkflow.name ? `${sourceWorkflow.name} (clone)` : `${targetId}`,
        metadata: {
          ...sourceWorkflow.metadata,
          clonedFrom: sourceId,
          clonedAt: Date.now(),
        },
      };

      return this.createWorkflow(clonedTemplate);
    } catch (error) {
      throw this.errorConverter.convertError(error);
    }
  }

  /**
   * Check if a workflow exists
   */
  async workflowExists(id: string): Promise<boolean> {
    try {
      if (!id || typeof id !== 'string') {
        return false;
      }

      await this.readWorkflow(id);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current version of a workflow
   */
  async getWorkflowVersion(id: string): Promise<string> {
    try {
      if (!id || typeof id !== 'string') {
        throw new KitError(
          'Workflow ID must be a non-empty string',
          KitErrorCode.VALIDATION_ERROR
        );
      }

      const workflow = await this.readWorkflow(id);
      const metadata = workflow.metadata as Record<string, unknown> | undefined;
      const version = (metadata?.['version'] as string | undefined) || '1.0.0';
      return version;
    } catch (error) {
      throw this.errorConverter.convertError(error);
    }
  }

  /**
   * List workflow versions (stub implementation)
   */
  async listWorkflowVersions(id: string): Promise<WorkflowVersion[]> {
    try {
      if (!id || typeof id !== 'string') {
        throw new KitError(
          'Workflow ID must be a non-empty string',
          KitErrorCode.VALIDATION_ERROR
        );
      }

      // This is a stub - actual implementation depends on SDK support for versioning
      const workflow = await this.readWorkflow(id);
      const metadata = workflow.metadata as Record<string, unknown> | undefined;
      const version = (metadata?.['version'] as string | undefined) || '1.0.0';

      return [
        {
          version,
          createdAt: Date.now(),
          description: 'Current version',
        },
      ];
    } catch (error) {
      throw this.errorConverter.convertError(error);
    }
  }

  /**
   * Rollback to a specific version (stub implementation)
   */
  async rollbackWorkflow(id: string, version: string): Promise<void> {
    try {
      if (!id || typeof id !== 'string') {
        throw new KitError(
          'Workflow ID must be a non-empty string',
          KitErrorCode.VALIDATION_ERROR
        );
      }

      if (!version || typeof version !== 'string') {
        throw new KitError(
          'Version must be a non-empty string',
          KitErrorCode.VALIDATION_ERROR
        );
      }

      // This is a stub - actual implementation depends on SDK support for versioning
      throw new KitError(
        'Rollback not yet implemented',
        KitErrorCode.INTERNAL_ERROR
      );
    } catch (error) {
      throw this.errorConverter.convertError(error);
    }
  }

  /**
   * Get workflow metadata
   */
  async getWorkflowMetadata(id: string): Promise<WorkflowMetadata> {
    try {
      if (!id || typeof id !== 'string') {
        throw new KitError(
          'Workflow ID must be a non-empty string',
          KitErrorCode.VALIDATION_ERROR
        );
      }

      const workflow = await this.readWorkflow(id);
      const now = Date.now();
      const metadata = workflow.metadata as Record<string, unknown> | undefined;
      const version = (metadata?.['version'] as string | undefined) || '1.0.0';
      const tags = (metadata?.['tags'] as string[] | undefined);
      const author = (metadata?.['author'] as string | undefined);

      return {
        id,
        name: workflow.name || id,
        description: workflow.description,
        createdAt: now,
        updatedAt: now,
        version,
        tags,
        author,
      };
    } catch (error) {
      throw this.errorConverter.convertError(error);
    }
  }

  /**
   * Validate workflow template
   */
  private validateWorkflowTemplate(template: any): void {
    if (!template || typeof template !== 'object') {
      throw new KitError(
        'Template must be a valid object',
        KitErrorCode.VALIDATION_ERROR
      );
    }

    if (!template.id || typeof template.id !== 'string') {
      throw new KitError(
        'Template must have a valid id',
        KitErrorCode.VALIDATION_ERROR
      );
    }

    if (!Array.isArray(template.nodes)) {
      throw new KitError(
        'Template must have a nodes array',
        KitErrorCode.VALIDATION_ERROR
      );
    }

    if (template.nodes.length === 0) {
      throw new KitError(
        'Template must have at least one node',
        KitErrorCode.INVALID_WORKFLOW
      );
    }

    if (!Array.isArray(template.edges)) {
      throw new KitError(
        'Template must have an edges array',
        KitErrorCode.VALIDATION_ERROR
      );
    }
  }
}
