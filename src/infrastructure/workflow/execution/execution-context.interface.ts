/**
 * 执行上下文接口
 * 
 * 提供工作流执行过程中的上下文信息和管理功能
 */
export interface ExecutionContext {
  /** 执行ID */
  executionId: string;
  
  /** 工作流ID */
  workflowId: string;
  
  /** 执行数据 */
  data: Record<string, any>;
  
  /** 元数据 */
  metadata?: Record<string, any>;
  
  /** 开始时间 */
  startTime: Date;
  
  /** 获取工作流实例 */
  getWorkflow(): any;
  
  /** 获取变量值 */
  getVariable(path: string): any;
  
  /** 设置变量值 */
  setVariable(path: string, value: any): void;
  
  /** 获取所有变量 */
  getAllVariables(): Record<string, any>;
  
  /** 获取所有元数据 */
  getAllMetadata(): Record<string, any>;
  
  /** 获取输入数据 */
  getInput(): any;
  
  /** 获取已执行的节点列表 */
  getExecutedNodes(): Set<string>;
  
  /** 获取节点结果 */
  getNodeResult(nodeId: string): any;
  
  /** 设置节点结果 */
  setNodeResult(nodeId: string, result: any): void;
  
  /** 获取经过时间（毫秒） */
  getElapsedTime(): number;
  
  /** 获取执行状态 */
  getExecutionStatus(): string;
  
  /** 设置执行状态 */
  setExecutionStatus(status: string): void;
  
  /** 获取错误信息 */
  getError(): Error | undefined;
  
  /** 设置错误信息 */
  setError(error: Error): void;
  
  /** 检查是否包含错误 */
  hasError(): boolean;
  
  /** 获取执行日志 */
  getExecutionLog(): string[];
  
  /** 添加执行日志 */
  addExecutionLog(message: string): void;
  
  /** 清除执行日志 */
  clearExecutionLog(): void;
  
  /** 获取检查点数据 */
  getCheckpoint(): Record<string, any>;
  
  /** 设置检查点数据 */
  setCheckpoint(data: Record<string, any>): void;
  
  /** 保存上下文状态 */
  save(): Promise<void>;
  
  /** 加载上下文状态 */
  load(): Promise<void>;
}