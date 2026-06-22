/**
 * SDK Interface Types - Type definitions for SDK compatibility checking
 *
 * These types define the contract that the underlying SDK must satisfy.
 * Used for validation and type safety without requiring hard dependencies on SDK implementation.
 */

/**
 * Result type returned by SDK methods
 */
export interface SDKResult<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Workflow template type
 */
export interface WorkflowTemplate {
  id: string;
  name?: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: Record<string, unknown>;
}

/**
 * Workflow node type
 */
export interface WorkflowNode {
  id: string;
  type: string;
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
}

/**
 * Workflow edge type
 */
export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: string;
}

/**
 * Workflow registry interface
 */
export interface WorkflowRegistry {
  create(template: WorkflowTemplate): Promise<SDKResult<string>>;
  get(id: string): Promise<SDKResult<WorkflowTemplate>>;
  update(id: string, template: Partial<WorkflowTemplate>): Promise<SDKResult<void>>;
  delete(id: string): Promise<SDKResult<void>>;
  list(filter?: Record<string, unknown>): Promise<SDKResult<WorkflowTemplate[]>>;
}

/**
 * Workflow execution registry interface
 */
export interface WorkflowExecutionRegistry {
  query(options: QueryOptions): Promise<SDKResult<ExecutionRecord[]>>;
}

/**
 * Query options interface
 */
export interface QueryOptions {
  workflowId?: string;
  status?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}

/**
 * Execution record interface
 */
export interface ExecutionRecord {
  executionId: string;
  workflowId: string;
  status: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startTime: number;
  endTime?: number;
}

/**
 * SDK dependencies interface
 */
export interface SDKDependencies {
  [key: string]: unknown;
}

/**
 * SDK factory interface
 */
export interface SDKFactory {
  getDependencies(): SDKDependencies;
  getWorkflowRegistry(): WorkflowRegistry;
  getWorkflowExecutionRegistry(): WorkflowExecutionRegistry;
}

/**
 * ExecuteWorkflowCommand constructor interface
 */
export interface ExecuteWorkflowCommandConstructor {
  new(
    config: ExecuteWorkflowConfig,
    dependencies: SDKDependencies
  ): ExecuteWorkflowCommand;
}

/**
 * ExecuteWorkflowCommand interface
 */
export interface ExecuteWorkflowCommand {
  execute?(): Promise<any>;
}

/**
 * ExecuteWorkflowConfig interface
 */
export interface ExecuteWorkflowConfig {
  workflowId: string;
  options?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Main SDK interface
 */
export interface SDK {
  version?: string;
  executeCommand(command: any): Promise<SDKResult<any>>;
  getFactory(): SDKFactory;
  ExecuteWorkflowCommand?: ExecuteWorkflowCommandConstructor;
  api?: {
    ExecuteWorkflowCommand?: ExecuteWorkflowCommandConstructor;
  };
}
