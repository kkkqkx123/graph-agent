import { ID } from '@domain/common/value-objects/id';
import { WorkflowState } from '@domain/workflow/state/workflow-state';
import { Timestamp } from '@domain/common/value-objects/timestamp';
import { Workflow } from '@domain/workflow/entities/workflow';
import { ExecutionMode, ExecutionPriority, ExecutionConfig } from './types';

/**
 * 执行上下文接口
 *
 * 定义工作流执行过程中的上下文信息
 */
export interface IExecutionContext {
  /** 执行ID */
  executionId: ID;

  /** 工作流ID */
  workflowId: ID;

  /** 当前节点ID */
  currentNodeId?: ID;

  /** 上下文数据 */
  data: Record<string, any>;

  /** 工作流状态 */
  workflowState: WorkflowState;

  /** 当前处理的边ID */
  currentEdgeId?: ID;

  /** 执行历史 */
  executionHistory: ExecutionHistoryItem[];

  /** 执行元数据 */
  metadata: Record<string, any>;

  /** 执行开始时间 */
  startTime: Timestamp;

  /** 执行结束时间 */
  endTime?: Timestamp;

  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  /** 执行结果 */
  result?: any;

  /** 执行错误 */
  error?: Error;

  /** 日志 */
  logs?: any[];

  /** 持续时间 */
  duration?: number;

  /** 执行模式 */
  mode?: ExecutionMode;

  /** 执行优先级 */
  priority?: ExecutionPriority;

  /** 执行配置 */
  config?: ExecutionConfig;

  /** 已执行的节点 */
  executedNodes?: Record<string, any>[];

  /** 待执行的节点 */
  pendingNodes?: Record<string, any>[];

  /**
   * 获取变量值
   * @param path 变量路径
   * @returns 变量值
   */
  getVariable(path: string): any;

  /**
   * 设置变量值
   * @param path 变量路径
   * @param value 变量值
   */
  setVariable(path: string, value: any): void;

  /**
   * 获取所有变量
   * @returns 所有变量
   */
  getAllVariables(): Record<string, any>;

  /**
   * 获取所有元数据
   * @returns 所有元数据
   */
  getAllMetadata(): Record<string, any>;

  /**
   * 获取输入
   * @returns 输入数据
   */
  getInput(): any;

  /**
   * 获取已执行节点
   * @returns 已执行节点列表
   */
  getExecutedNodes(): Record<string, any>[];

  /**
   * 获取节点结果
   * @param nodeId 节点ID
   * @returns 节点结果
   */
  getNodeResult(nodeId: string): any;

  /**
   * 获取已执行时间
   * @returns 已执行时间（毫秒）
   */
  getElapsedTime(): number;

  /**
   * 获取工作流
   * @returns 工作流实例
   */
  getWorkflow(): Workflow;
}

/**
 * 执行上下文类型别名，与接口相等
 */
export type ExecutionContext = IExecutionContext;

/**
 * 执行历史项目接口
 */
export interface ExecutionHistoryItem {
  /** 节点ID */
  nodeId: ID;
  
  /** 执行时间 */
  timestamp: Timestamp;
  
  /** 执行结果 */
  result?: any;
  
  /** 执行状态 */
  status: 'success' | 'failure' | 'pending' | 'running';
  
  /** 执行元数据 */
  metadata?: Record<string, any>;
}