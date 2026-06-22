/**
 * SDKKit - Main entry point for SDK-Kit
 *
 * Provides simplified, high-level APIs for common workflow scenarios.
 * Phase 1 focuses on core functionality: workflow definition, execution, and querying.
 */

import { WorkflowAPIImpl } from './api/workflow.api.js';
import { ExecutionAPIImpl } from './executors/execution.executor.js';
import { QueryAPIImpl } from './executors/query.executor.js';
import { ResourceAPIImpl } from './api/resource.api.js';
import { ExecutionRunner } from './executors/execution.executor.js';
import { QueryExecutor } from './executors/query.executor.js';
import { ResourceManager } from './managers/resource.manager.js';
import { KitError, KitErrorCode } from './converters/error.converter.js';
import type { WorkflowAPI } from './api/workflow.api.js';
import type { ExecutionAPI } from './api/execution.api.js';
import type { QueryAPI } from './api/query.api.js';
import type { ResourceAPI } from './types/resource.types.js';
import type { SDK, ExecuteWorkflowCommandConstructor } from './types/sdk.types.js';

/**
 * SDKKit - Main class providing high-level API access
 *
 * Phase 1 APIs:
 * - workflow(): WorkflowAPI - Define workflows programmatically
 * - execution(): ExecutionAPI - Execute workflows with simplified interface
 * - query(): QueryAPI - Query execution records with filters
 * - resource(): ResourceAPI - Manage workflow resources (CRUD + versioning)
 *
 * Improvement: Added SDK validation and command caching for performance
 */
export class SDKKit {
  private workflowAPI: WorkflowAPI;
  private executionAPI: ExecutionAPI;
  private queryAPI: QueryAPI;
  private resourceAPI: ResourceAPI;
  private executionRunner: ExecutionRunner;
  private queryExecutor: QueryExecutor;
  private resourceManager: ResourceManager;
  private cachedExecuteCommand: ExecuteWorkflowCommandConstructor;
  private sdk: SDK;

  constructor(sdk: any) {
    // Validate SDK instance before using it
    this.validateSDK(sdk);

    // Store the SDK instance
    this.sdk = sdk;

    // Cache the ExecuteWorkflowCommand class to avoid repeated imports
    this.cachedExecuteCommand = this.cacheExecuteCommand(sdk);

    // Initialize managers
    this.executionRunner = new ExecutionRunner(sdk, this.cachedExecuteCommand);
    this.queryExecutor = new QueryExecutor(sdk);
    this.resourceManager = new ResourceManager(sdk);

    // Initialize public APIs
    this.workflowAPI = new WorkflowAPIImpl();
    this.executionAPI = new ExecutionAPIImpl(this.executionRunner);
    this.queryAPI = new QueryAPIImpl(this.queryExecutor);
    this.resourceAPI = new ResourceAPIImpl(this.resourceManager);
  }

  /**
   * Validate SDK instance has required methods and properties
   */
  private validateSDK(sdk: any): asserts sdk is SDK {
    if (!sdk || typeof sdk !== 'object') {
      throw new KitError(
        'Invalid SDK instance - must be an object',
        KitErrorCode.INTERNAL_ERROR
      );
    }

    if (typeof sdk.executeCommand !== 'function') {
      throw new KitError(
        'SDK missing executeCommand method',
        KitErrorCode.INTERNAL_ERROR
      );
    }

    if (typeof sdk.getFactory !== 'function') {
      throw new KitError(
        'SDK missing getFactory method',
        KitErrorCode.INTERNAL_ERROR
      );
    }

    // Validate SDK version if available
    if (sdk.version && !this.isCompatibleVersion(sdk.version)) {
      throw new KitError(
        `SDK version ${sdk.version} not compatible. Required: 1.0.0+`,
        KitErrorCode.INTERNAL_ERROR
      );
    }
  }

  /**
   * Check if SDK version is compatible (major version >= 1)
   */
  private isCompatibleVersion(version?: string): boolean {
    if (!version || typeof version !== 'string') {
      return true; // Allow undefined or non-string versions
    }
    try {
      const parts = version.split('.');
      const majorStr = parts?.[0];
      if (!majorStr) return false;
      const major = parseInt(majorStr, 10);
      return major >= 1;
    } catch {
      return false;
    }
  }

  /**
   * Cache ExecuteWorkflowCommand from SDK to avoid repeated imports
   */
  private cacheExecuteCommand(sdk: SDK): ExecuteWorkflowCommandConstructor {
    // Try direct property first
    if (sdk.ExecuteWorkflowCommand) {
      return sdk.ExecuteWorkflowCommand;
    }

    // Try nested api property
    if (sdk.api?.ExecuteWorkflowCommand) {
      return sdk.api.ExecuteWorkflowCommand;
    }

    throw new KitError(
      'ExecuteWorkflowCommand not found in SDK exports',
      KitErrorCode.INTERNAL_ERROR
    );
  }

  /**
   * Get Workflow API for defining workflows programmatically
   *
   * @example
   * ```typescript
   * const template = kit.workflow()
   *   .create('my-workflow')
   *   .node('start', { type: 'START' })
   *   .node('task', { type: 'LLM' })
   *   .edge('start', 'task')
   *   .build();
   * ```
   */
  workflow(): WorkflowAPI {
    return this.workflowAPI;
  }

  /**
   * Get Execution API for executing workflows
   *
   * @example
   * ```typescript
   * const result = await kit.execution()
   *   .workflow('my-workflow')
   *   .input({ data: 'test' })
   *   .execute();
   * ```
   */
  execution(): ExecutionAPI {
    return this.executionAPI;
  }

  /**
   * Get Query API for querying execution records
   *
   * @example
   * ```typescript
   * const executions = await kit.query()
   *   .executions()
   *   .filter({ status: 'completed' })
   *   .limit(10)
   *   .get();
   * ```
   */
  query(): QueryAPI {
    return this.queryAPI;
  }

  /**
   * Get Resource API for managing workflow resources
   *
   * @example
   * ```typescript
   * // Create workflow
   * const id = await kit.resource()
   *   .workflows()
   *   .create({ id: 'wf1', nodes: [...], edges: [...] });
   *
   * // Get workflow
   * const workflow = await kit.resource()
   *   .workflows()
   *   .read(id);
   *
   * // Update workflow
   * await kit.resource()
   *   .workflows()
   *   .update(id, { description: 'Updated' });
   *
   * // Delete workflow
   * await kit.resource()
   *   .workflows()
   *   .delete(id);
   * ```
   */
  resource(): ResourceAPI {
    return this.resourceAPI;
  }

  /**
   * Get cached ExecuteWorkflowCommand class
   * Used internally by ExecutionRunner to avoid repeated imports
   */
  getExecuteCommand(): ExecuteWorkflowCommandConstructor {
    return this.cachedExecuteCommand;
  }

  /**
   * Get the underlying SDK instance for advanced use cases
   *
   * Use this for scenarios not covered by the high-level API.
   * Most applications should use the workflow(), execution(), and query() methods instead.
   */
  getSDK(): SDK {
    return this.sdk;
  }
}

export default SDKKit;
