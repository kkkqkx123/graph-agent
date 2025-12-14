import { ID } from '../../common/value-objects/id';
import { StateValue, StateValueUtils } from './state-value';
import { 
  StateKey, 
  StateQuery, 
  StateStoreResult,
  StateKeyUtils,
  StateQueryUtils
} from './state-store';

/**
 * 状态工具类
 */
export class StateUtils {
  /**
   * 创建状态键
   */
  static createStateKey(
    graphId: ID,
    key: string,
    nodeId?: ID,
    namespace?: string
  ): StateKey {
    return StateKeyUtils.create(graphId, key, nodeId, namespace);
  }

  /**
   * 创建图级别状态键
   */
  static createGraphStateKey(
    graphId: ID,
    key: string,
    namespace?: string
  ): StateKey {
    return StateKeyUtils.createGraphKey(graphId, key, namespace);
  }

  /**
   * 创建节点级别状态键
   */
  static createNodeStateKey(
    graphId: ID,
    nodeId: ID,
    key: string,
    namespace?: string
  ): StateKey {
    return StateKeyUtils.createNodeKey(graphId, nodeId, key, namespace);
  }

  /**
   * 创建状态值
   */
  static createStateValue(value: any): StateValue {
    return StateValueUtils.create(value).build();
  }

  /**
   * 创建状态查询
   */
  static createStateQuery(
    graphId?: ID,
    nodeId?: ID,
    namespace?: string,
    keyPattern?: string
  ): StateQuery {
    return StateQueryUtils.merge(
      graphId ? StateQueryUtils.byGraph(graphId) : {},
      nodeId ? { nodeId } : {},
      namespace ? { namespace } : {},
      keyPattern ? { keyPattern } : {}
    );
  }

  /**
   * 创建图状态查询
   */
  static createGraphStateQuery(
    graphId: ID,
    namespace?: string,
    keyPattern?: string
  ): StateQuery {
    return this.createStateQuery(graphId, undefined, namespace, keyPattern);
  }

  /**
   * 创建节点状态查询
   */
  static createNodeStateQuery(
    graphId: ID,
    nodeId: ID,
    namespace?: string,
    keyPattern?: string
  ): StateQuery {
    return this.createStateQuery(graphId, nodeId, namespace, keyPattern);
  }

  /**
   * 创建命名空间状态查询
   */
  static createNamespaceStateQuery(
    graphId: ID,
    namespace: string,
    keyPattern?: string
  ): StateQuery {
    return this.createStateQuery(graphId, undefined, namespace, keyPattern);
  }

  /**
   * 创建时间范围状态查询
   */
  static createTimeRangeStateQuery(
    graphId: ID,
    timeRange: 'created' | 'updated',
    start?: Date,
    end?: Date,
    namespace?: string
  ): StateQuery {
    return StateQueryUtils.merge(
      StateQueryUtils.byTimeRange(graphId, timeRange, start, end),
      namespace ? { namespace } : {}
    );
  }

  /**
   * 创建版本范围状态查询
   */
  static createVersionRangeStateQuery(
    graphId: ID,
    minVersion?: number,
    maxVersion?: number,
    namespace?: string
  ): StateQuery {
    return StateQueryUtils.merge(
      StateQueryUtils.byVersionRange(graphId, minVersion, maxVersion),
      namespace ? { namespace } : {}
    );
  }

  /**
   * 创建元数据过滤状态查询
   */
  static createMetadataStateQuery(
    graphId: ID,
    metadataFilter: Record<string, any>,
    namespace?: string
  ): StateQuery {
    return StateQueryUtils.merge(
      StateQueryUtils.byMetadata(graphId, metadataFilter),
      namespace ? { namespace } : {}
    );
  }

  /**
   * 序列化状态键
   */
  static serializeStateKey(stateKey: StateKey): string {
    return StateKeyUtils.serialize(stateKey);
  }

  /**
   * 反序列化状态键
   */
  static deserializeStateKey(serializedKey: string): StateKey {
    return StateKeyUtils.deserialize(serializedKey);
  }

  /**
   * 比较状态键
   */
  static compareStateKeys(key1: StateKey, key2: StateKey): boolean {
    return StateKeyUtils.equals(key1, key2);
  }

  /**
   * 获取状态键的显示名称
   */
  static getStateKeyDisplayName(stateKey: StateKey): string {
    return StateKeyUtils.getDisplayName(stateKey);
  }

  /**
   * 检查状态键是否匹配查询
   */
  static matchesStateQuery(stateKey: StateKey, query: StateQuery): boolean {
    return StateKeyUtils.matchesQuery(stateKey, query);
  }

  /**
   * 克隆状态值
   */
  static cloneStateValue(stateValue: StateValue): StateValue {
    return StateValueUtils.clone(stateValue);
  }

  /**
   * 更新状态值
   */
  static updateStateValue(stateValue: StateValue, newValue: any): StateValue {
    return StateValueUtils.update(stateValue, newValue);
  }

  /**
   * 比较状态值
   */
  static compareStateValues(value1: StateValue, value2: StateValue): boolean {
    return StateValueUtils.equals(value1, value2);
  }

  /**
   * 序列化状态值
   */
  static serializeStateValue(stateValue: StateValue): string {
    return StateValueUtils.serialize(stateValue);
  }

  /**
   * 反序列化状态值
   */
  static deserializeStateValue(data: string): StateValue {
    return StateValueUtils.deserialize(data);
  }

  /**
   * 获取状态值的摘要
   */
  static getStateValueSummary(stateValue: StateValue): string {
    return StateValueUtils.getSummary(stateValue);
  }

  /**
   * 检查状态值是否过期
   */
  static isStateValueExpired(stateValue: StateValue, maxAge: number): boolean {
    return StateValueUtils.isExpired(stateValue, maxAge);
  }

  /**
   * 获取状态值的年龄
   */
  static getStateValueAge(stateValue: StateValue): number {
    return StateValueUtils.getAge(stateValue);
  }

  /**
   * 获取状态值的最后更新时间
   */
  static getStateValueTimeSinceLastUpdate(stateValue: StateValue): number {
    return StateValueUtils.getTimeSinceLastUpdate(stateValue);
  }

  /**
   * 转换状态值类型
   */
  static convertStateValueType(value: any, targetType: string): any {
    return StateValueUtils.convertType(value, targetType as any);
  }

  /**
   * 检查状态值类型是否匹配
   */
  static isStateValueTypeMatch(value: any, expectedType: string): boolean {
    return StateValueUtils.isTypeMatch(value, expectedType as any);
  }

  /**
   * 检测状态值类型
   */
  static detectStateValueType(value: any): string {
    return StateValueUtils.detectType(value);
  }

  /**
   * 创建状态存储结果
   */
  static createStateStoreResult(
    stateKey: StateKey,
    stateValue: StateValue
  ): StateStoreResult {
    return { stateKey, stateValue };
  }

  /**
   * 批量创建状态存储结果
   */
  static batchCreateStateStoreResult(
    entries: Array<{ stateKey: StateKey; stateValue: StateValue }>
  ): StateStoreResult[] {
    return entries.map(entry => this.createStateStoreResult(entry.stateKey, entry.stateValue));
  }

  /**
   * 按图分组状态存储结果
   */
  static groupStateStoreResultsByGraph(results: StateStoreResult[]): Record<string, StateStoreResult[]> {
    const grouped: Record<string, StateStoreResult[]> = {};
    
    for (const result of results) {
      const graphId = result.stateKey.graphId;
      const graphIdStr = graphId.toString();
      if (!grouped[graphIdStr]) {
        grouped[graphIdStr] = [];
      }
      grouped[graphIdStr].push(result);
    }
    
    return grouped;
  }

  /**
   * 按节点分组状态存储结果
   */
  static groupStateStoreResultsByNode(results: StateStoreResult[]): Record<string, StateStoreResult[]> {
    const grouped: Record<string, StateStoreResult[]> = {};
    
    for (const result of results) {
      const nodeId = result.stateKey.nodeId || 'graph';
      const nodeIdStr = nodeId.toString();
      if (!grouped[nodeIdStr]) {
        grouped[nodeIdStr] = [];
      }
      grouped[nodeIdStr].push(result);
    }
    
    return grouped;
  }

  /**
   * 按命名空间分组状态存储结果
   */
  static groupStateStoreResultsByNamespace(results: StateStoreResult[]): Record<string, StateStoreResult[]> {
    const grouped: Record<string, StateStoreResult[]> = {};
    
    for (const result of results) {
      const namespace = result.stateKey.namespace || 'default';
      if (!grouped[namespace]) {
        grouped[namespace] = [];
      }
      grouped[namespace].push(result);
    }
    
    return grouped;
  }

  /**
   * 过滤状态存储结果
   */
  static filterStateStoreResults(
    results: StateStoreResult[],
    filter: (result: StateStoreResult) => boolean
  ): StateStoreResult[] {
    return results.filter(filter);
  }

  /**
   * 按键过滤状态存储结果
   */
  static filterStateStoreResultsByKey(
    results: StateStoreResult[],
    keyPattern: string
  ): StateStoreResult[] {
    const pattern = new RegExp(keyPattern);
    return this.filterStateStoreResults(results, result => 
      pattern.test(result.stateKey.key)
    );
  }

  /**
   * 按值类型过滤状态存储结果
   */
  static filterStateStoreResultsByType(
    results: StateStoreResult[],
    valueType: string
  ): StateStoreResult[] {
    return this.filterStateStoreResults(results, result => 
      result.stateValue.type === valueType
    );
  }

  /**
   * 按时间范围过滤状态存储结果
   */
  static filterStateStoreResultsByTimeRange(
    results: StateStoreResult[],
    timeRange: 'created' | 'updated',
    start?: Date,
    end?: Date
  ): StateStoreResult[] {
    return this.filterStateStoreResults(results, result => {
      const time = timeRange === 'created' ? 
        result.stateValue.createdAt : 
        result.stateValue.updatedAt;
      
      if (start && time < start) return false;
      if (end && time > end) return false;
      
      return true;
    });
  }

  /**
   * 按版本范围过滤状态存储结果
   */
  static filterStateStoreResultsByVersionRange(
    results: StateStoreResult[],
    minVersion?: number,
    maxVersion?: number
  ): StateStoreResult[] {
    return this.filterStateStoreResults(results, result => {
      const version = result.stateValue.version;
      
      if (minVersion !== undefined && version < minVersion) return false;
      if (maxVersion !== undefined && version > maxVersion) return false;
      
      return true;
    });
  }

  /**
   * 排序状态存储结果
   */
  static sortStateStoreResults(
    results: StateStoreResult[],
    sortBy: 'key' | 'createdAt' | 'updatedAt' | 'version',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): StateStoreResult[] {
    return [...results].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case 'key':
          aValue = a.stateKey.key;
          bValue = b.stateKey.key;
          break;
        case 'createdAt':
          aValue = a.stateValue.createdAt.getTime();
          bValue = b.stateValue.createdAt.getTime();
          break;
        case 'updatedAt':
          aValue = a.stateValue.updatedAt.getTime();
          bValue = b.stateValue.updatedAt.getTime();
          break;
        case 'version':
          aValue = a.stateValue.version;
          bValue = b.stateValue.version;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * 限制状态存储结果数量
   */
  static limitStateStoreResults(results: StateStoreResult[], limit: number): StateStoreResult[] {
    return results.slice(0, limit);
  }

  /**
   * 转换状态存储结果为键值对
   */
  static stateStoreResultsToMap(results: StateStoreResult[]): Map<string, StateValue> {
    const map = new Map<string, StateValue>();
    
    for (const result of results) {
      const key = this.serializeStateKey(result.stateKey);
      map.set(key, result.stateValue);
    }
    
    return map;
  }

  /**
   * 从键值对创建状态存储结果
   */
  static mapToStateStoreResults(map: Map<string, StateValue>): StateStoreResult[] {
    const results: StateStoreResult[] = [];
    
    for (const [serializedKey, stateValue] of map) {
      const stateKey = this.deserializeStateKey(serializedKey);
      results.push(this.createStateStoreResult(stateKey, stateValue));
    }
    
    return results;
  }

  /**
   * 计算状态存储结果的统计信息
   */
  static calculateStateStoreResultsStatistics(results: StateStoreResult[]): {
    totalCount: number;
    countByGraph: Record<string, number>;
    countByNode: Record<string, number>;
    countByNamespace: Record<string, number>;
    countByType: Record<string, number>;
    averageVersion: number;
    oldestStateTime: Date | undefined;
    newestStateTime: Date | undefined;
  } {
    const countByGraph: Record<string, number> = {};
    const countByNode: Record<string, number> = {};
    const countByNamespace: Record<string, number> = {};
    const countByType: Record<string, number> = {};
    
    let totalVersion = 0;
    let oldestTime: Date | undefined;
    let newestTime: Date | undefined;
    
    for (const result of results) {
      // 统计图
      const graphId = result.stateKey.graphId.toString();
      countByGraph[graphId] = (countByGraph[graphId] || 0) + 1;
      
      // 统计节点
      const nodeId = result.stateKey.nodeId?.toString() || 'graph';
      countByNode[nodeId] = (countByNode[nodeId] || 0) + 1;
      
      // 统计命名空间
      const namespace = result.stateKey.namespace || 'default';
      countByNamespace[namespace] = (countByNamespace[namespace] || 0) + 1;
      
      // 统计类型
      const type = result.stateValue.type;
      countByType[type] = (countByType[type] || 0) + 1;
      
      // 统计版本
      totalVersion += result.stateValue.version;
      
      // 统计时间
      const createdTime = result.stateValue.createdAt;
      if (!oldestTime || createdTime < oldestTime) {
        oldestTime = createdTime;
      }
      if (!newestTime || createdTime > newestTime) {
        newestTime = createdTime;
      }
    }
    
    return {
      totalCount: results.length,
      countByGraph,
      countByNode,
      countByNamespace,
      countByType,
      averageVersion: results.length > 0 ? totalVersion / results.length : 0,
      oldestStateTime: oldestTime,
      newestStateTime: newestTime
    };
  }

  /**
   * 创建状态验证器
   */
  static createStateValidator(
    rules: Array<{
      name: string;
      validate: (stateKey: StateKey, stateValue: StateValue) => boolean;
      message: string;
      severity: 'error' | 'warning';
    }>
  ): (stateKey: StateKey, stateValue: StateValue) => any {
    return (stateKey: StateKey, stateValue: StateValue) => {
      const errors: Array<{
        stateKey: StateKey;
        message: string;
        severity: 'error' | 'warning';
      }> = [];
      
      for (const rule of rules) {
        if (!rule.validate(stateKey, stateValue)) {
          errors.push({
            stateKey,
            message: `[${rule.name}] ${rule.message}`,
            severity: rule.severity
          });
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    };
  }

  /**
   * 创建状态修复器
   */
  static createStateRepairer(
    repairs: Array<{
      condition: (stateKey: StateKey, stateValue: StateValue) => boolean;
      repair: (stateKey: StateKey, stateValue: StateValue) => StateValue;
    }>
  ): (stateKey: StateKey, stateValue: StateValue) => StateValue | null {
    return (stateKey: StateKey, stateValue: StateValue) => {
      for (const repair of repairs) {
        if (repair.condition(stateKey, stateValue)) {
          return repair.repair(stateKey, stateValue);
        }
      }
      return null;
    };
  }

  /**
   * 创建常用状态验证规则
   */
  static createCommonStateValidationRules(): Array<{
    name: string;
    validate: (stateKey: StateKey, stateValue: StateValue) => boolean;
    message: string;
    severity: 'error' | 'warning';
  }> {
    return [
      {
        name: 'key_format',
        validate: (stateKey, _) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(stateKey.key),
        message: '键名格式无效，应以字母或下划线开头，只包含字母、数字和下划线',
        severity: 'error'
      },
      {
        name: 'value_not_null',
        validate: (_, stateValue) => stateValue.value !== null,
        message: '状态值不能为null',
        severity: 'warning'
      },
      {
        name: 'version_positive',
        validate: (_, stateValue) => stateValue.version > 0,
        message: '版本号必须为正数',
        severity: 'error'
      },
      {
        name: 'timestamp_valid',
        validate: (_, stateValue) => 
          stateValue.createdAt <= stateValue.updatedAt,
        message: '创建时间不能晚于更新时间',
        severity: 'error'
      }
    ];
  }

  /**
   * 创建常用状态修复规则
   */
  static createCommonStateRepairRules(): Array<{
    condition: (stateKey: StateKey, stateValue: StateValue) => boolean;
    repair: (stateKey: StateKey, stateValue: StateValue) => StateValue;
  }> {
    return [
      {
        condition: (_, stateValue) => stateValue.version <= 0,
        repair: (_, stateValue) => StateValueUtils.update(stateValue, stateValue.value)
      },
      {
        condition: (_, stateValue) => stateValue.createdAt > stateValue.updatedAt,
        repair: (_, stateValue) => ({
          ...stateValue,
          updatedAt: stateValue.createdAt
        })
      }
    ];
  }
}