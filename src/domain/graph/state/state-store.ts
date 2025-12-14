import { GraphId } from '../entities/graph';
import { NodeId } from '../entities/node';
import { StateValue } from './state-value';

/**
 * 状态键接口
 */
export interface StateKey {
  /** 图ID */
  readonly graphId: GraphId;
  /** 节点ID（可选，用于节点级别状态） */
  readonly nodeId?: NodeId;
  /** 键名 */
  readonly key: string;
  /** 命名空间（可选，用于状态分组） */
  readonly namespace?: string;
}

/**
 * 状态查询条件接口
 */
export interface StateQuery {
  /** 图ID */
  readonly graphId?: GraphId;
  /** 节点ID */
  readonly nodeId?: NodeId;
  /** 键名模式 */
  readonly keyPattern?: string;
  /** 命名空间 */
  readonly namespace?: string;
  /** 值类型过滤 */
  readonly valueType?: string;
  /** 创建时间范围 */
  readonly createdTimeRange?: {
    start?: Date;
    end?: Date;
  };
  /** 更新时间范围 */
  readonly updatedTimeRange?: {
    start?: Date;
    end?: Date;
  };
  /** 版本范围 */
  readonly versionRange?: {
    min?: number;
    max?: number;
  };
  /** 元数据过滤 */
  readonly metadataFilter?: Record<string, any>;
  /** 限制数量 */
  readonly limit?: number;
  /** 排序方式 */
  readonly sortBy?: 'key' | 'createdAt' | 'updatedAt' | 'version';
  /** 排序方向 */
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * 状态存储结果接口
 */
export interface StateStoreResult {
  /** 状态值 */
  readonly stateValue: StateValue;
  /** 状态键 */
  readonly stateKey: StateKey;
}

/**
 * 状态存储接口
 */
export interface IStateStore {
  /**
   * 设置状态值
   */
  set(stateKey: StateKey, stateValue: StateValue): Promise<void>;

  /**
   * 获取状态值
   */
  get(stateKey: StateKey): Promise<StateValue | undefined>;

  /**
   * 删除状态值
   */
  delete(stateKey: StateKey): Promise<boolean>;

  /**
   * 检查状态值是否存在
   */
  exists(stateKey: StateKey): Promise<boolean>;

  /**
   * 查询状态值
   */
  query(query: StateQuery): Promise<StateStoreResult[]>;

  /**
   * 批量设置状态值
   */
  setBatch(entries: Array<{ stateKey: StateKey; stateValue: StateValue }>): Promise<void>;

  /**
   * 批量获取状态值
   */
  getBatch(stateKeys: StateKey[]): Promise<Array<{ stateKey: StateKey; stateValue: StateValue | undefined }>>;

  /**
   * 批量删除状态值
   */
  deleteBatch(stateKeys: StateKey[]): Promise<number>;

  /**
   * 清空指定图的所有状态
   */
  clearGraph(graphId: GraphId): Promise<number>;

  /**
   * 清空指定节点的所有状态
   */
  clearNode(graphId: GraphId, nodeId: NodeId): Promise<number>;

  /**
   * 清空指定命名空间的所有状态
   */
  clearNamespace(graphId: GraphId, namespace: string): Promise<number>;

  /**
   * 获取状态数量
   */
  count(query?: StateQuery): Promise<number>;

  /**
   * 获取所有键
   */
  keys(query?: StateQuery): Promise<StateKey[]>;

  /**
   * 获取状态统计信息
   */
  getStatistics(query?: StateQuery): Promise<StateStoreStatistics>;

  /**
   * 创建状态快照
   */
  createSnapshot(graphId: GraphId, description?: string): Promise<string>;

  /**
   * 恢复状态快照
   */
  restoreSnapshot(graphId: GraphId, snapshotId: string): Promise<void>;

  /**
   * 删除状态快照
   */
  deleteSnapshot(snapshotId: string): Promise<boolean>;

  /**
   * 获取快照列表
   */
  listSnapshots(graphId?: GraphId): Promise<StateSnapshot[]>;

  /**
   * 导出状态
   */
  export(query?: StateQuery): Promise<string>;

  /**
   * 导入状态
   */
  import(data: string, options?: ImportOptions): Promise<number>;

  /**
   * 订阅状态变化
   */
  subscribe(callback: StateChangeCallback): Promise<string>;

  /**
   * 取消订阅状态变化
   */
  unsubscribe(subscriptionId: string): Promise<boolean>;
}

/**
 * 状态存储统计信息接口
 */
export interface StateStoreStatistics {
  /** 总状态数量 */
  totalCount: number;
  /** 按图分组统计 */
  countByGraph: Record<GraphId, number>;
  /** 按节点分组统计 */
  countByNode: Record<string, number>;
  /** 按命名空间分组统计 */
  countByNamespace: Record<string, number>;
  /** 按类型分组统计 */
  countByType: Record<string, number>;
  /** 平均版本号 */
  averageVersion: number;
  /** 最旧状态时间 */
  oldestStateTime: Date | undefined;
  /** 最新状态时间 */
  newestStateTime: Date | undefined;
}

/**
 * 状态快照接口
 */
export interface StateSnapshot {
  /** 快照ID */
  readonly id: string;
  /** 图ID */
  readonly graphId: GraphId;
  /** 描述 */
  readonly description?: string;
  /** 创建时间 */
  readonly createdAt: Date;
  /** 状态数量 */
  readonly stateCount: number;
  /** 快照大小（字节） */
  readonly size: number;
  /** 元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 导入选项接口
 */
export interface ImportOptions {
  /** 是否覆盖现有状态 */
  readonly overwrite?: boolean;
  /** 是否跳过错误 */
  readonly skipErrors?: boolean;
  /** 批处理大小 */
  readonly batchSize?: number;
  /** 命名空间映射 */
  readonly namespaceMapping?: Record<string, string>;
  /** 图ID映射 */
  readonly graphIdMapping?: Record<string, string>;
}

/**
 * 状态变化事件接口
 */
export interface StateChangeEvent {
  /** 事件类型 */
  readonly type: 'set' | 'delete' | 'clear';
  /** 状态键 */
  readonly stateKey: StateKey;
  /** 旧值（删除时为undefined） */
  readonly oldValue?: StateValue;
  /** 新值（删除时为undefined） */
  readonly newValue?: StateValue;
  /** 事件时间 */
  readonly timestamp: Date;
  /** 事件元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 状态变化回调类型
 */
export type StateChangeCallback = (event: StateChangeEvent) => void;

/**
 * 状态键工具类
 */
export class StateKeyUtils {
  /**
   * 创建状态键
   */
  static create(
    graphId: GraphId,
    key: string,
    nodeId?: NodeId,
    namespace?: string
  ): StateKey {
    return {
      graphId,
      nodeId,
      key,
      namespace
    };
  }

  /**
   * 创建图级别状态键
   */
  static createGraphKey(
    graphId: GraphId,
    key: string,
    namespace?: string
  ): StateKey {
    return this.create(graphId, key, undefined, namespace);
  }

  /**
   * 创建节点级别状态键
   */
  static createNodeKey(
    graphId: GraphId,
    nodeId: NodeId,
    key: string,
    namespace?: string
  ): StateKey {
    return this.create(graphId, key, nodeId, namespace);
  }

  /**
   * 序列化状态键
   */
  static serialize(stateKey: StateKey): string {
    const parts = [
      stateKey.graphId,
      stateKey.nodeId || '',
      stateKey.namespace || '',
      stateKey.key
    ];
    return parts.join('::');
  }

  /**
   * 反序列化状态键
   */
  static deserialize(serializedKey: string): StateKey {
    const parts = serializedKey.split('::');
    if (parts.length < 4) {
      throw new Error(`无效的序列化状态键: ${serializedKey}`);
    }

    return {
      graphId: parts[0],
      nodeId: parts[1] || undefined,
      namespace: parts[2] || undefined,
      key: parts[3]
    };
  }

  /**
   * 比较两个状态键
   */
  static equals(key1: StateKey, key2: StateKey): boolean {
    return (
      key1.graphId === key2.graphId &&
      key1.nodeId === key2.nodeId &&
      key1.namespace === key2.namespace &&
      key1.key === key2.key
    );
  }

  /**
   * 获取状态键的哈希值
   */
  static getHash(stateKey: StateKey): string {
    return this.serialize(stateKey);
  }

  /**
   * 检查状态键是否匹配查询条件
   */
  static matchesQuery(stateKey: StateKey, query: StateQuery): boolean {
    if (query.graphId && stateKey.graphId !== query.graphId) {
      return false;
    }

    if (query.nodeId && stateKey.nodeId !== query.nodeId) {
      return false;
    }

    if (query.namespace && stateKey.namespace !== query.namespace) {
      return false;
    }

    if (query.keyPattern) {
      const pattern = new RegExp(query.keyPattern);
      if (!pattern.test(stateKey.key)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取状态键的显示名称
   */
  static getDisplayName(stateKey: StateKey): string {
    const parts = [];
    
    if (stateKey.namespace) {
      parts.push(`[${stateKey.namespace}]`);
    }
    
    if (stateKey.nodeId) {
      parts.push(`node:${stateKey.nodeId}`);
    }
    
    parts.push(stateKey.key);
    
    return `${stateKey.graphId}:${parts.join('.')}`;
  }
}

/**
 * 状态查询工具类
 */
export class StateQueryUtils {
  /**
   * 创建空查询
   */
  static empty(): StateQuery {
    return {};
  }

  /**
   * 创建图查询
   */
  static byGraph(graphId: GraphId): StateQuery {
    return { graphId };
  }

  /**
   * 创建节点查询
   */
  static byNode(graphId: GraphId, nodeId: NodeId): StateQuery {
    return { graphId, nodeId };
  }

  /**
   * 创建命名空间查询
   */
  static byNamespace(graphId: GraphId, namespace: string): StateQuery {
    return { graphId, namespace };
  }

  /**
   * 创建键模式查询
   */
  static byKeyPattern(graphId: GraphId, keyPattern: string): StateQuery {
    return { graphId, keyPattern };
  }

  /**
   * 创建时间范围查询
   */
  static byTimeRange(
    graphId: GraphId,
    timeRange: 'created' | 'updated',
    start?: Date,
    end?: Date
  ): StateQuery {
    const query: StateQuery = { graphId };
    
    if (timeRange === 'created') {
      query.createdTimeRange = { start, end };
    } else {
      query.updatedTimeRange = { start, end };
    }
    
    return query;
  }

  /**
   * 创建版本范围查询
   */
  static byVersionRange(
    graphId: GraphId,
    minVersion?: number,
    maxVersion?: number
  ): StateQuery {
    return {
      graphId,
      versionRange: { min: minVersion, max: maxVersion }
    };
  }

  /**
   * 创建元数据过滤查询
   */
  static byMetadata(
    graphId: GraphId,
    metadataFilter: Record<string, any>
  ): StateQuery {
    return {
      graphId,
      metadataFilter
    };
  }

  /**
   * 合并查询条件
   */
  static merge(...queries: StateQuery[]): StateQuery {
    const merged: StateQuery = {};
    
    for (const query of queries) {
      Object.assign(merged, query);
    }
    
    return merged;
  }

  /**
   * 添加排序条件
   */
  static withSort(
    query: StateQuery,
    sortBy: 'key' | 'createdAt' | 'updatedAt' | 'version',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): StateQuery {
    return {
      ...query,
      sortBy,
      sortOrder
    };
  }

  /**
   * 添加限制条件
   */
  static withLimit(query: StateQuery, limit: number): StateQuery {
    return {
      ...query,
      limit
    };
  }
}