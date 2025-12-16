import { ID } from '@domain/common/value-objects/id';
import { ExecutionContext } from './execution-context.interface';
import { ExecutionResult } from './types';

/**
 * 工作流执行器接口
 * 
 * 定义工作流执行的标准契约
 */
export interface WorkflowExecutor {
  /** 
   * 执行工作流
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(context: ExecutionContext): Promise<ExecutionResult>;
  
  /**
   * 取消执行
   * @param executionId 执行ID
   */
  cancel(executionId: ID): Promise<void>;
  
  /**
   * 暂停执行
   * @param executionId 执行ID
   */
  pause(executionId: ID): Promise<void>;
  
  /**
   * 恢复执行
   * @param executionId 执行ID
   */
  resume(executionId: ID): Promise<void>;
  
  /**
   * 检查执行状态
   * @param executionId 执行ID
   */
  getStatus(executionId: ID): Promise<ExecutionContext['status']>;

  /**
   * 执行节点
   * @param nodeId 节点ID
   * @param context 执行上下文
   */
  executeNode(nodeId: ID, context: ExecutionContext): Promise<any>;

  /**
   * 评估边
   * @param edgeId 边ID
   * @param context 执行上下文
   */
  evaluateEdge(edgeId: ID, context: ExecutionContext): Promise<boolean>;
}