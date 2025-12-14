import { ID } from '../../common/value-objects/id';

/**
 * 状态检查点
 */
export interface StateCheckpoint {
  checkpointId: string;
  state: any;
  timestamp: Date;
  metadata: Record<string, unknown>;
  size: number;
}

/**
 * 状态转换
 */
export interface StateTransition {
  fromState: any;
  toState: any;
  transitionType: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

/**
 * 状态验证规则
 */
export interface StateValidationRule {
  ruleId: string;
  name: string;
  description: string;
  validate: (state: any) => ValidationResult;
  priority: number;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 状态持久化配置
 */
export interface StatePersistenceConfig {
  enablePersistence: boolean;
  persistenceInterval: number;
  maxCheckpoints: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

/**
 * 状态管理统计信息
 */
export interface StateManagementStats {
  totalStates: number;
  totalCheckpoints: number;
  totalTransitions: number;
  averageStateSize: number;
  persistenceTime: number;
  restorationTime: number;
}

/**
 * 状态管理器接口
 * 
 * 负责管理图执行过程中的状态，包括初始化、更新、持久化和恢复
 */
export interface IStateManager<TState = any> {
  /**
   * 初始化状态
   * 
   * @param input 输入数据
   * @param schema 状态模式
   * @returns 初始状态
   */
  initializeState(input: Record<string, unknown>, schema?: any): Promise<TState>;

  /**
   * 更新状态
   * 
   * @param currentState 当前状态
   * @param updates 更新数据
   * @returns 更新后的状态
   */
  updateState(currentState: TState, updates: Record<string, unknown>): Promise<TState>;

  /**
   * 合并状态
   * 
   * @param currentState 当前状态
   * @param newState 新状态
   * @returns 合并后的状态
   */
  mergeStates(currentState: TState, newState: Partial<TState>): TState;

  /**
   * 创建检查点
   * 
   * @param state 要保存的状态
   * @param metadata 元数据
   * @returns 检查点ID
   */
  createCheckpoint(state: TState, metadata?: Record<string, unknown>): Promise<string>;

  /**
   * 恢复检查点
   * 
   * @param checkpointId 检查点ID
   * @returns 恢复的状态
   */
  restoreCheckpoint(checkpointId: string): Promise<TState>;

  /**
   * 列出所有检查点
   * 
   * @param stateId 状态ID
   * @returns 检查点列表
   */
  listCheckpoints(stateId?: ID): Promise<StateCheckpoint[]>;

  /**
   * 删除检查点
   * 
   * @param checkpointId 检查点ID
   * @returns 是否成功删除
   */
  deleteCheckpoint(checkpointId: string): Promise<boolean>;

  /**
   * 验证状态
   * 
   * @param state 要验证的状态
   * @param rules 验证规则
   * @returns 验证结果
   */
  validateState(state: TState, rules?: StateValidationRule[]): ValidationResult;

  /**
   * 添加验证规则
   * 
   * @param rule 验证规则
   */
  addValidationRule(rule: StateValidationRule): void;

  /**
   * 移除验证规则
   * 
   * @param ruleId 规则ID
   * @returns 是否成功移除
   */
  removeValidationRule(ruleId: string): boolean;

  /**
   * 记录状态转换
   * 
   * @param fromState 转换前状态
   * @param toState 转换后状态
   * @param transitionType 转换类型
   * @param metadata 元数据
   */
  recordTransition(fromState: TState, toState: TState, transitionType: string, metadata?: Record<string, unknown>): void;

  /**
   * 获取状态历史
   * 
   * @param stateId 状态ID
   * @param limit 限制数量
   * @returns 状态转换历史
   */
  getStateHistory(stateId: ID, limit?: number): Promise<StateTransition[]>;

  /**
   * 设置持久化配置
   * 
   * @param config 持久化配置
   */
  setPersistenceConfig(config: StatePersistenceConfig): void;

  /**
   * 获取状态管理统计信息
   * 
   * @returns 统计信息
   */
  getStats(): StateManagementStats;

  /**
   * 清理过期检查点
   * 
   * @param olderThan 清理早于此时间的检查点
   * @returns 清理的检查点数量
   */
  cleanupCheckpoints(olderThan?: Date): Promise<number>;

  /**
   * 导出状态
   * 
   * @param state 要导出的状态
   * @param format 导出格式
   * @returns 导出的数据
   */
  exportState(state: TState, format?: 'json' | 'binary'): Promise<Buffer | string>;

  /**
   * 导入状态
   * 
   * @param data 导入的数据
   * @param format 数据格式
   * @returns 导入的状态
   */
  importState(data: Buffer | string, format?: 'json' | 'binary'): Promise<TState>;

  /**
   * 克隆状态
   * 
   * @param state 要克隆的状态
   * @returns 克隆的状态
   */
  cloneState(state: TState): TState;

  /**
   * 比较状态
   * 
   * @param state1 状态1
   * @param state2 状态2
   * @returns 比较结果
   */
  compareStates(state1: TState, state2: TState): StateComparisonResult;

  /**
   * 销毁状态管理器，释放资源
   */
  destroy(): Promise<void>;
}

/**
 * 状态比较结果
 */
export interface StateComparisonResult {
  areEqual: boolean;
  differences: StateDifference[];
  similarity: number;
}

/**
 * 状态差异
 */
export interface StateDifference {
  path: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'removed' | 'modified';
}