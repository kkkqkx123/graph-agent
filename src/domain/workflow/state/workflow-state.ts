import { ID } from '@domain/common/value-objects/id';
import { Timestamp } from '@domain/common/value-objects/timestamp';

/**
 * 工作流状态接口
 *
 * 表示工作流执行过程中的状态信息
 */
export interface WorkflowState {
  /** 工作流ID */
  workflowId: ID;

  /** 当前节点ID */
  currentNodeId?: ID;

  /** 执行上下文数据 */
  data: Record<string, any>;

  /** 执行历史 */
  history: ExecutionHistory[];

  /** 执行元数据 */
  metadata: Record<string, any>;

  /** 创建时间 */
  createdAt: Timestamp;

  /** 更新时间 */
  updatedAt: Timestamp;

  /**
   * 获取数据
   * @param key 键名
   * @returns 键对应的值
   */
  getData: (key?: string) => any;

  /**
   * 设置数据
   * @param key 键名
   * @param value 键值
   * @returns 新的工作流状态
   */
  setData: (key: string, value: any) => WorkflowState;
}

/**
 * 执行历史记录接口
 */
export interface ExecutionHistory {
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