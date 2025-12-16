import { ID } from '../../../common/value-objects/id';
import { StateValue, StateValueUtils } from './state-value';
import {
  StateKey,
  StateQuery,
  StateStoreResult,
  IStateStore,
  StateChangeEvent,
  StateChangeCallback,
  StateKeyUtils,
  StateQueryUtils
} from './state-store';

/**
 * 状态管理器接口
 */
export interface IStateManager {
  /**
   * 设置状态值
   */
  setState(
    graphId: ID,
    key: string,
    value: any,
    nodeId?: ID,
    namespace?: string
  ): Promise<void>;

  /**
   * 获取状态值
   */
  getState(
    graphId: ID,
    key: string,
    nodeId?: ID,
    namespace?: string
  ): Promise<StateValue | undefined>;

  /**
   * 删除状态值
   */
  deleteState(
    graphId: ID,
    key: string,
    nodeId?: ID,
    namespace?: string
  ): Promise<boolean>;

  /**
   * 检查状态值是否存在
   */
  hasState(
    graphId: ID,
    key: string,
    nodeId?: ID,
    namespace?: string
  ): Promise<boolean>;

  /**
   * 查询状态值
   */
  queryStates(query: StateQuery): Promise<StateStoreResult[]>;

  /**
   * 批量设置状态值
   */
  setStates(
    entries: Array<{
      graphId: ID;
      key: string;
      value: any;
      nodeId?: ID;
      namespace?: string;
    }>
  ): Promise<void>;

  /**
   * 批量获取状态值
   */
  getStates(
    requests: Array<{
      graphId: ID;
      key: string;
      nodeId?: ID;
      namespace?: string;
    }>
  ): Promise<Array<{
    graphId: ID;
    key: string;
    nodeId?: ID;
    namespace?: string;
    stateValue?: StateValue;
  }>>;

  /**
   * 批量删除状态值
   */
  deleteStates(
    requests: Array<{
      graphId: ID;
      key: string;
      nodeId?: ID;
      namespace?: string;
    }>
  ): Promise<number>;

  /**
   * 清空图的所有状态
   */
  clearGraphStates(graphId: ID): Promise<number>;

  /**
   * 清空节点的所有状态
   */
  clearNodeStates(graphId: ID, nodeId: ID): Promise<number>;

  /**
   * 清空命名空间的所有状态
   */
  clearNamespaceStates(graphId: ID, namespace: string): Promise<number>;

  /**
   * 获取状态数量
   */
  getStateCount(query?: StateQuery): Promise<number>;

  /**
   * 获取所有状态键
   */
  getStateKeys(query?: StateQuery): Promise<StateKey[]>;

  /**
   * 获取状态统计信息
   */
  getStateStatistics(query?: StateQuery): Promise<any>;

  /**
   * 创建状态快照
   */
  createStateSnapshot(graphId: ID, description?: string): Promise<string>;

  /**
   * 恢复状态快照
   */
  restoreStateSnapshot(graphId: ID, snapshotId: string): Promise<void>;

  /**
   * 删除状态快照
   */
  deleteStateSnapshot(snapshotId: string): Promise<boolean>;

  /**
   * 获取快照列表
   */
  listStateSnapshots(graphId?: ID): Promise<any[]>;

  /**
   * 导出状态
   */
  exportStates(query?: StateQuery): Promise<string>;

  /**
   * 导入状态
   */
  importStates(data: string, options?: any): Promise<number>;

  /**
   * 订阅状态变化
   */
  subscribeStateChanges(callback: StateChangeCallback): Promise<string>;

  /**
   * 取消订阅状态变化
   */
  unsubscribeStateChanges(subscriptionId: string): Promise<boolean>;

  /**
   * 获取状态历史
   */
  getStateHistory(
    graphId: ID,
    key: string,
    nodeId?: ID,
    namespace?: string,
    limit?: number
  ): Promise<StateValue[]>;

  /**
   * 回滚状态到指定版本
   */
  rollbackState(
    graphId: ID,
    key: string,
    version: number,
    nodeId?: ID,
    namespace?: string
  ): Promise<boolean>;

  /**
   * 合并状态
   */
  mergeStates(
    targetGraphId: ID,
    sourceGraphId: ID,
    options?: MergeOptions
  ): Promise<number>;

  /**
   * 复制状态
   */
  copyStates(
    sourceQuery: StateQuery,
    targetGraphId: ID,
    options?: CopyOptions
  ): Promise<number>;

  /**
   * 验证状态
   */
  validateStates(query: StateQuery, validator: StateValidator): Promise<ValidationResult>;

  /**
   * 修复状态
   */
  repairStates(query: StateQuery, repairer: StateRepairer): Promise<RepairResult>;
}

/**
 * 合并选项接口
 */
export interface MergeOptions {
  /** 是否覆盖现有状态 */
  readonly overwrite?: boolean;
  /** 是否合并对象 */
  readonly mergeObjects?: boolean;
  /** 命名空间映射 */
  readonly namespaceMapping?: Record<string, string>;
  /** 键过滤器 */
  readonly keyFilter?: (key: string) => boolean;
}

/**
 * 复制选项接口
 */
export interface CopyOptions {
  /** 是否覆盖现有状态 */
  readonly overwrite?: boolean;
  /** 目标命名空间 */
  readonly targetNamespace?: string;
  /** 键转换器 */
  readonly keyTransformer?: (key: string) => string;
}

/**
 * 状态验证器类型
 */
export type StateValidator = (stateKey: StateKey, stateValue: StateValue) => ValidationResult;

/**
 * 状态修复器类型
 */
export type StateRepairer = (stateKey: StateKey, stateValue: StateValue) => StateValue | null;

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否有效 */
  readonly valid: boolean;
  /** 错误信息 */
  readonly errors: Array<{
    stateKey: StateKey;
    message: string;
    severity: 'error' | 'warning';
  }>;
  /** 统计信息 */
  readonly statistics: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
    errors: number;
  };
}

/**
 * 修复结果接口
 */
export interface RepairResult {
  /** 修复数量 */
  readonly repairedCount: number;
  /** 失败数量 */
  readonly failedCount: number;
  /** 错误信息 */
  readonly errors: Array<{
    stateKey: StateKey;
    message: string;
  }>;
}

/**
 * 默认状态管理器实现
 */
export class DefaultStateManager implements IStateManager {
  private stateStore: IStateStore;
  private subscriptions: Map<string, StateChangeCallback> = new Map();

  constructor(stateStore: IStateStore) {
    this.stateStore = stateStore;
  }

  /**
   * 设置状态值
   */
  async setState(
    graphId: ID,
    key: string,
    value: any,
    nodeId?: ID,
    namespace?: string
  ): Promise<void> {
    const stateKey = StateKeyUtils.create(graphId, key, nodeId, namespace);
    const oldValue = await this.stateStore.get(stateKey);
    const newValue = StateValueUtils.create(value).build();

    await this.stateStore.set(stateKey, newValue);

    // 触发状态变化事件
    this.emitStateChange({
      type: 'set',
      stateKey,
      oldValue,
      newValue,
      timestamp: new Date(),
      metadata: {}
    });
  }

  /**
   * 获取状态值
   */
  async getState(
    graphId: ID,
    key: string,
    nodeId?: ID,
    namespace?: string
  ): Promise<StateValue | undefined> {
    const stateKey = StateKeyUtils.create(graphId, key, nodeId, namespace);
    return await this.stateStore.get(stateKey);
  }

  /**
   * 删除状态值
   */
  async deleteState(
    graphId: ID,
    key: string,
    nodeId?: ID,
    namespace?: string
  ): Promise<boolean> {
    const stateKey = StateKeyUtils.create(graphId, key, nodeId, namespace);
    const oldValue = await this.stateStore.get(stateKey);

    const deleted = await this.stateStore.delete(stateKey);

    if (deleted && oldValue) {
      // 触发状态变化事件
      this.emitStateChange({
        type: 'delete',
        stateKey,
        oldValue,
        timestamp: new Date(),
        metadata: {}
      });
    }

    return deleted;
  }

  /**
   * 检查状态值是否存在
   */
  async hasState(
    graphId: ID,
    key: string,
    nodeId?: ID,
    namespace?: string
  ): Promise<boolean> {
    const stateKey = StateKeyUtils.create(graphId, key, nodeId, namespace);
    return await this.stateStore.exists(stateKey);
  }

  /**
   * 查询状态值
   */
  async queryStates(query: StateQuery): Promise<StateStoreResult[]> {
    return await this.stateStore.query(query);
  }

  /**
   * 批量设置状态值
   */
  async setStates(
    entries: Array<{
      graphId: ID;
      key: string;
      value: any;
      nodeId?: ID;
      namespace?: string;
    }>
  ): Promise<void> {
    const stateEntries = entries.map(entry => ({
      stateKey: StateKeyUtils.create(
        entry.graphId,
        entry.key,
        entry.nodeId,
        entry.namespace
      ),
      stateValue: StateValueUtils.create(entry.value).build()
    }));

    await this.stateStore.setBatch(stateEntries);

    // 触发批量状态变化事件
    for (const entry of stateEntries) {
      this.emitStateChange({
        type: 'set',
        stateKey: entry.stateKey,
        newValue: entry.stateValue,
        timestamp: new Date(),
        metadata: { batch: true }
      });
    }
  }

  /**
   * 批量获取状态值
   */
  async getStates(
    requests: Array<{
      graphId: ID;
      key: string;
      nodeId?: ID;
      namespace?: string;
    }>
  ): Promise<Array<{
    graphId: ID;
    key: string;
    nodeId?: ID;
    namespace?: string;
    stateValue?: StateValue;
  }>> {
    const stateKeys = requests.map(request =>
      StateKeyUtils.create(
        request.graphId,
        request.key,
        request.nodeId,
        request.namespace
      )
    );

    const results = await this.stateStore.getBatch(stateKeys);

    return results.map((result, index) => {
      const request = requests[index];
      if (!request) {
        throw new Error('请求对象未定义');
      }
      return {
        graphId: request.graphId,
        key: request.key,
        nodeId: request.nodeId,
        namespace: request.namespace,
        stateValue: result.stateValue
      };
    });
  }

  /**
   * 批量删除状态值
   */
  async deleteStates(
    requests: Array<{
      graphId: ID;
      key: string;
      nodeId?: ID;
      namespace?: string;
    }>
  ): Promise<number> {
    const stateKeys = requests.map(request =>
      StateKeyUtils.create(
        request.graphId,
        request.key,
        request.nodeId,
        request.namespace
      )
    );

    const deletedCount = await this.stateStore.deleteBatch(stateKeys);

    // 触发批量状态变化事件
    for (const stateKey of stateKeys) {
      this.emitStateChange({
        type: 'delete',
        stateKey,
        timestamp: new Date(),
        metadata: { batch: true }
      });
    }

    return deletedCount;
  }

  /**
   * 清空图的所有状态
   */
  async clearGraphStates(graphId: ID): Promise<number> {
    return await this.stateStore.clearGraph(graphId);
  }

  /**
   * 清空节点的所有状态
   */
  async clearNodeStates(graphId: ID, nodeId: ID): Promise<number> {
    return await this.stateStore.clearNode(graphId, nodeId);
  }

  /**
   * 清空命名空间的所有状态
   */
  async clearNamespaceStates(graphId: ID, namespace: string): Promise<number> {
    return await this.stateStore.clearNamespace(graphId, namespace);
  }

  /**
   * 获取状态数量
   */
  async getStateCount(query?: StateQuery): Promise<number> {
    return await this.stateStore.count(query);
  }

  /**
   * 获取所有状态键
   */
  async getStateKeys(query?: StateQuery): Promise<StateKey[]> {
    return await this.stateStore.keys(query);
  }

  /**
   * 获取状态统计信息
   */
  async getStateStatistics(query?: StateQuery): Promise<any> {
    return await this.stateStore.getStatistics(query);
  }

  /**
   * 创建状态快照
   */
  async createStateSnapshot(graphId: ID, description?: string): Promise<string> {
    return await this.stateStore.createSnapshot(graphId, description);
  }

  /**
   * 恢复状态快照
   */
  async restoreStateSnapshot(graphId: ID, snapshotId: string): Promise<void> {
    await this.stateStore.restoreSnapshot(graphId, snapshotId);
  }

  /**
   * 删除状态快照
   */
  async deleteStateSnapshot(snapshotId: string): Promise<boolean> {
    return await this.stateStore.deleteSnapshot(snapshotId);
  }

  /**
   * 获取快照列表
   */
  async listStateSnapshots(graphId?: ID): Promise<any[]> {
    return await this.stateStore.listSnapshots(graphId);
  }

  /**
   * 导出状态
   */
  async exportStates(query?: StateQuery): Promise<string> {
    return await this.stateStore.export(query);
  }

  /**
   * 导入状态
   */
  async importStates(data: string, options?: any): Promise<number> {
    return await this.stateStore.import(data, options);
  }

  /**
   * 订阅状态变化
   */
  async subscribeStateChanges(callback: StateChangeCallback): Promise<string> {
    const subscriptionId = await this.stateStore.subscribe(callback);
    this.subscriptions.set(subscriptionId, callback);
    return subscriptionId;
  }

  /**
   * 取消订阅状态变化
   */
  async unsubscribeStateChanges(subscriptionId: string): Promise<boolean> {
    const unsubscribed = await this.stateStore.unsubscribe(subscriptionId);
    if (unsubscribed) {
      this.subscriptions.delete(subscriptionId);
    }
    return unsubscribed;
  }

  /**
   * 获取状态历史
   */
  async getStateHistory(
    graphId: ID,
    key: string,
    nodeId?: ID,
    namespace?: string,
    limit?: number
  ): Promise<StateValue[]> {
    // 这里应该实现状态历史查询逻辑
    // 简化实现，返回当前状态
    const currentState = await this.getState(graphId, key, nodeId, namespace);
    return currentState ? [currentState] : [];
  }

  /**
   * 回滚状态到指定版本
   */
  async rollbackState(
    graphId: ID,
    key: string,
    version: number,
    nodeId?: ID,
    namespace?: string
  ): Promise<boolean> {
    // 这里应该实现状态回滚逻辑
    // 简化实现，总是返回false
    return false;
  }

  /**
   * 合并状态
   */
  async mergeStates(
    targetGraphId: ID,
    sourceGraphId: ID,
    options?: MergeOptions
  ): Promise<number> {
    const sourceQuery = StateQueryUtils.byGraph(sourceGraphId);
    const sourceStates = await this.queryStates(sourceQuery);

    let mergedCount = 0;

    for (const sourceState of sourceStates) {
      const targetKey = StateKeyUtils.create(
        targetGraphId,
        sourceState.stateKey.key,
        sourceState.stateKey.nodeId,
        options?.namespaceMapping?.[sourceState.stateKey.namespace || ''] || sourceState.stateKey.namespace
      );

      // 检查键过滤器
      if (options?.keyFilter && !options.keyFilter(sourceState.stateKey.key)) {
        continue;
      }

      const existingState = await this.stateStore.get(targetKey);

      if (!existingState || options?.overwrite) {
        let finalValue = sourceState.stateValue.value;

        // 合并对象
        if (existingState && options?.mergeObjects &&
          typeof existingState.value === 'object' &&
          typeof sourceState.stateValue.value === 'object') {
          finalValue = { ...existingState.value, ...sourceState.stateValue.value };
        }

        await this.stateStore.set(targetKey, StateValueUtils.create(finalValue).build());
        mergedCount++;
      }
    }

    return mergedCount;
  }

  /**
   * 复制状态
   */
  async copyStates(
    sourceQuery: StateQuery,
    targetGraphId: ID,
    options?: CopyOptions
  ): Promise<number> {
    const sourceStates = await this.queryStates(sourceQuery);
    let copiedCount = 0;

    for (const sourceState of sourceStates) {
      const key = options?.keyTransformer ?
        options.keyTransformer(sourceState.stateKey.key) :
        sourceState.stateKey.key;

      const targetKey = StateKeyUtils.create(
        targetGraphId,
        key,
        sourceState.stateKey.nodeId,
        options?.targetNamespace || sourceState.stateKey.namespace
      );

      const existingState = await this.stateStore.get(targetKey);

      if (!existingState || options?.overwrite) {
        await this.stateStore.set(targetKey, sourceState.stateValue);
        copiedCount++;
      }
    }

    return copiedCount;
  }

  /**
   * 验证状态
   */
  async validateStates(query: StateQuery, validator: StateValidator): Promise<ValidationResult> {
    const states = await this.queryStates(query);
    const errors: Array<{
      stateKey: StateKey;
      message: string;
      severity: 'error' | 'warning';
    }> = [];

    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    for (const state of states) {
      const result = validator(state.stateKey, state.stateValue);

      if (result.valid) {
        validCount++;
      } else {
        for (const error of result.errors) {
          errors.push(error);
          if (error.severity === 'error') {
            errorCount++;
          } else {
            warningCount++;
          }
        }
      }
    }

    return {
      valid: errorCount === 0,
      errors,
      statistics: {
        total: states.length,
        valid: validCount,
        invalid: states.length - validCount,
        warnings: warningCount,
        errors: errorCount
      }
    };
  }

  /**
   * 修复状态
   */
  async repairStates(query: StateQuery, repairer: StateRepairer): Promise<RepairResult> {
    const states = await this.queryStates(query);
    let repairedCount = 0;
    let failedCount = 0;
    const errors: Array<{
      stateKey: StateKey;
      message: string;
    }> = [];

    for (const state of states) {
      try {
        const repairedValue = repairer(state.stateKey, state.stateValue);

        if (repairedValue) {
          await this.stateStore.set(state.stateKey, repairedValue);
          repairedCount++;
        }
      } catch (error) {
        failedCount++;
        errors.push({
          stateKey: state.stateKey,
          message: String(error)
        });
      }
    }

    return {
      repairedCount,
      failedCount,
      errors
    };
  }

  /**
   * 触发状态变化事件
   */
  private emitStateChange(event: StateChangeEvent): void {
    for (const callback of this.subscriptions.values()) {
      try {
        callback(event);
      } catch (error) {
        console.error('状态变化回调执行失败:', error);
      }
    }
  }
}