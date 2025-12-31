import { ID } from '../../common/value-objects';
import { WorkflowState, ExecutionHistory } from '../value-objects/workflow-state';

/**
 * 状态更新选项接口
 */
export interface StateUpdateOptions {
  /** 是否添加到执行历史 */
  addToHistory?: boolean;
  /** 历史记录的节点ID */
  historyNodeId?: ID;
  /** 历史记录的结果 */
  historyResult?: any;
  /** 历史记录的状态 */
  historyStatus?: 'success' | 'failure' | 'pending' | 'running';
  /** 历史记录的元数据 */
  historyMetadata?: Record<string, any>;
}

/**
 * 状态管理器
 *
 * 职责：
 * - 管理工作流执行状态
 * - 提供状态的初始化、获取、更新、清除操作
 * - 支持状态快照和恢复
 * - 支持执行历史记录
 *
 * 特性：
 * - 线程安全的状态管理
 * - 不可变的状态更新
 * - 支持状态缓存
 * - 支持执行历史追踪
 */
export class StateManager {
  private states: Map<string, WorkflowState>;
  private maxCacheSize: number;

  constructor(maxCacheSize: number = 1000) {
    this.states = new Map();
    this.maxCacheSize = maxCacheSize;
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
   * @param options 更新选项
   * @returns 更新后的状态
   */
  updateState(
    threadId: string,
    updates: Record<string, any>,
    options: StateUpdateOptions = {}
  ): WorkflowState {
    const currentState = this.states.get(threadId);
    
    if (!currentState) {
      throw new Error(`线程 ${threadId} 的状态不存在`);
    }

    // 更新状态数据
    let updatedState = this.updateStateData(currentState, updates);

    // 添加到执行历史
    if (options.addToHistory && options.historyNodeId) {
      updatedState = this.addToExecutionHistory(
        updatedState,
        options.historyNodeId,
        options.historyResult,
        options.historyStatus || 'success',
        options.historyMetadata
      );
    }

    // 更新当前节点ID
    if (options.historyNodeId) {
      updatedState = this.updateCurrentNodeId(updatedState, options.historyNodeId);
    }

    // 检查缓存大小
    this.checkCacheSize();

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
   * 获取执行历史
   * @param threadId 线程ID
   * @returns 执行历史数组
   */
  getHistory(threadId: string): ExecutionHistory[] {
    const state = this.states.get(threadId);
    
    if (!state) {
      throw new Error(`线程 ${threadId} 的状态不存在`);
    }

    return state.history;
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
   * 获取状态快照
   * @param threadId 线程ID
   * @returns 状态快照（JSON字符串）
   */
  getSnapshot(threadId: string): string {
    const state = this.states.get(threadId);
    
    if (!state) {
      throw new Error(`线程 ${threadId} 的状态不存在`);
    }

    return JSON.stringify(state.toProps());
  }

  /**
   * 从快照恢复状态
   * @param threadId 线程ID
   * @param snapshot 状态快照（JSON字符串）
   */
  restoreFromSnapshot(threadId: string, snapshot: string): void {
    const props = JSON.parse(snapshot);
    const state = WorkflowState.fromProps(props);
    
    this.states.set(threadId, state);
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
   * 添加到执行历史（私有方法）
   * @param state 当前状态
   * @param nodeId 节点ID
   * @param result 执行结果
   * @param status 执行状态
   * @param metadata 元数据
   * @returns 更新后的状态
   */
  private addToExecutionHistory(
    state: WorkflowState,
    nodeId: ID,
    result?: any,
    status: 'success' | 'failure' | 'pending' | 'running' = 'success',
    metadata?: Record<string, any>
  ): WorkflowState {
    const historyEntry: ExecutionHistory = {
      nodeId,
      timestamp: require('../../common/value-objects/timestamp').Timestamp.now(),
      result,
      status,
      metadata
    };

    const newHistory = [...state.history, historyEntry];

    return WorkflowState.fromProps({
      ...state.toProps(),
      history: newHistory,
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

  /**
   * 检查缓存大小（私有方法）
   */
  private checkCacheSize(): void {
    if (this.states.size > this.maxCacheSize) {
      // 删除最旧的状态（FIFO）
      const firstKey = this.states.keys().next().value;
      if (firstKey) {
        this.states.delete(firstKey);
      }
    }
  }
}