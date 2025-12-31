import { ID } from '../../common/value-objects';
import { WorkflowState } from '../value-objects/workflow-state';

/**
 * 状态管理器
 *
 * 职责：
 * - 管理工作流执行状态
 * - 提供状态的初始化、获取、更新、清除操作
 *
 * 特性：
 * - 不可变的状态更新
 * - 线程级别的状态隔离
 *
 * 不负责：
 * - 状态快照和恢复（由 CheckpointManager 负责）
 * - 执行历史记录（由 HistoryManager 负责）
 * - 状态缓存管理（由基础设施层负责）
 */
export class StateManager {
  private states: Map<string, WorkflowState>;

  constructor() {
    this.states = new Map();
  }

  /**
   * 初始化状态
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @param initialState 初始状态数据
   */
  initialize(
    threadId: string,
    workflowId: ID,
    initialState: Record<string, any> = {}
  ): void {
    const state = WorkflowState.initial(workflowId);
    
    // 合并初始数据
    const updatedState = this.updateStateData(state, initialState);
    
    this.states.set(threadId, updatedState);
  }

  /**
   * 获取状态
   * @param threadId 线程ID
   * @returns 工作流状态，如果不存在则返回 null
   */
  getState(threadId: string): WorkflowState | null {
    return this.states.get(threadId) || null;
  }

  /**
   * 更新状态
   * @param threadId 线程ID
   * @param updates 状态更新数据
   * @returns 更新后的状态
   */
  updateState(
    threadId: string,
    updates: Record<string, any>
  ): WorkflowState {
    const currentState = this.states.get(threadId);
    
    if (!currentState) {
      throw new Error(`线程 ${threadId} 的状态不存在`);
    }

    // 更新状态数据
    const updatedState = this.updateStateData(currentState, updates);

    // 保存更新后的状态
    this.states.set(threadId, updatedState);

    return updatedState;
  }

  /**
   * 设置当前节点ID
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @returns 更新后的状态
   */
  setCurrentNodeId(threadId: string, nodeId: ID): WorkflowState {
    const currentState = this.states.get(threadId);
    
    if (!currentState) {
      throw new Error(`线程 ${threadId} 的状态不存在`);
    }

    const updatedState = this.updateCurrentNodeId(currentState, nodeId);
    this.states.set(threadId, updatedState);

    return updatedState;
  }

  /**
   * 获取状态数据
   * @param threadId 线程ID
   * @param key 数据键（可选）
   * @returns 数据值或所有数据
   */
  getData(threadId: string, key?: string): any {
    const state = this.states.get(threadId);
    
    if (!state) {
      throw new Error(`线程 ${threadId} 的状态不存在`);
    }

    return state.getData(key);
  }

  /**
   * 清除状态
   * @param threadId 线程ID
   */
  clearState(threadId: string): void {
    this.states.delete(threadId);
  }

  /**
   * 清除所有状态
   */
  clearAllStates(): void {
    this.states.clear();
  }

  /**
   * 检查状态是否存在
   * @param threadId 线程ID
   * @returns 是否存在
   */
  hasState(threadId: string): boolean {
    return this.states.has(threadId);
  }

  /**
   * 获取所有线程ID
   * @returns 线程ID数组
   */
  getAllThreadIds(): string[] {
    return Array.from(this.states.keys());
  }

  /**
   * 获取状态数量
   * @returns 状态数量
   */
  getStateCount(): number {
    return this.states.size;
  }

  /**
   * 更新状态数据（私有方法）
   * @param state 当前状态
   * @param updates 更新数据
   * @returns 更新后的状态
   */
  private updateStateData(state: WorkflowState, updates: Record<string, any>): WorkflowState {
    const currentData = state.data;
    const newData = { ...currentData, ...updates };

    return WorkflowState.fromProps({
      ...state.toProps(),
      data: newData,
      updatedAt: require('../../common/value-objects/timestamp').Timestamp.now()
    });
  }

  /**
   * 更新当前节点ID（私有方法）
   * @param state 当前状态
   * @param nodeId 节点ID
   * @returns 更新后的状态
   */
  private updateCurrentNodeId(state: WorkflowState, nodeId: ID): WorkflowState {
    return WorkflowState.fromProps({
      ...state.toProps(),
      currentNodeId: nodeId,
      updatedAt: require('../../common/value-objects/timestamp').Timestamp.now()
    });
  }
}