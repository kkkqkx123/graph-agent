/**
 * 执行上下文接口
 * 
 * 提供工作流执行的环境，包括变量管理、节点结果管理和服务访问
 */
export interface ExecutionContext {
  // 工作流信息
  readonly workflowId: string;
  readonly executionId: string;
  readonly threadId: string;

  // 变量管理
  getVariable(key: string): any;
  setVariable(key: string, value: any): void;
  getAllVariables(): Record<string, any>;
  initializeVariables(variables: Record<string, any>): void;

  // 节点结果管理
  getNodeResult(nodeId: string): any;
  setNodeResult(nodeId: string, result: any): void;
  getAllNodeResults(): Record<string, any>;

  // 服务访问
  getService<T>(serviceName: string): T;

  // 元数据
  getMetadata(key: string): any;
  setMetadata(key: string, value: any): void;
}

/**
 * 工作流执行上下文实现
 */
export class WorkflowExecutionContext implements ExecutionContext {
  private variables: Map<string, any>;
  private nodeResults: Map<string, any>;
  private metadata: Map<string, any>;
  private services: Map<string, any>;

  constructor(
    public readonly workflowId: string,
    public readonly executionId: string,
    public readonly threadId: string,
    services: Map<string, any>
  ) {
    this.variables = new Map();
    this.nodeResults = new Map();
    this.metadata = new Map();
    this.services = services;
  }

  getVariable(key: string): any {
    return this.variables.get(key);
  }

  setVariable(key: string, value: any): void {
    this.variables.set(key, value);
  }

  getAllVariables(): Record<string, any> {
    return Object.fromEntries(this.variables);
  }

  initializeVariables(variables: Record<string, any>): void {
    for (const [key, value] of Object.entries(variables)) {
      this.variables.set(key, value);
    }
  }

  getNodeResult(nodeId: string): any {
    return this.nodeResults.get(nodeId);
  }

  setNodeResult(nodeId: string, result: any): void {
    this.nodeResults.set(nodeId, result);
  }

  getAllNodeResults(): Record<string, any> {
    return Object.fromEntries(this.nodeResults);
  }

  getService<T>(serviceName: string): T {
    return this.services.get(serviceName) as T;
  }

  getMetadata(key: string): any {
    return this.metadata.get(key);
  }

  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }
}