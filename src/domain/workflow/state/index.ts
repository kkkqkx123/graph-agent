import { ID } from '@domain/common/value-objects/id';
import { WorkflowState } from '../state/workflow-state';

/**
 * 状态管理器接口
 */
export interface IStateManager {
  /** 获取状态 */
  getState(workflowId: ID, executionId: string): Promise<WorkflowState | undefined>;
  
  /** 设置状态 */
  setState(workflowId: ID, executionId: string, state: WorkflowState): Promise<void>;
  
  /** 更新状态 */
  updateState(workflowId: ID, executionId: string, updates: Partial<WorkflowState>): Promise<void>;
  
  /** 删除状态 */
  deleteState(workflowId: ID, executionId: string): Promise<void>;
  
  /** 检查状态是否存在 */
  hasState(workflowId: ID, executionId: string): Promise<boolean>;
}