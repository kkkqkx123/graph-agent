import { ID } from '../../../common/value-objects/id';
import {
  ExecutionContext,
  NodeExecutionContext,
  EdgeExecutionContext,
  ExecutionStatus,
  ExecutionMode,
  ExecutionPriority,
  ExecutionConfig,
  ExecutionLog,
  ExecutionError,
  ExecutionContextUtils
} from './execution-context';

/**
 * 执行上下文管理器接口
 */
export interface IExecutionContextManager {
  /**
   * 创建执行上下文
   */
  createContext(
    executionId: string,
    graphId: ID,
    config?: ExecutionConfig
  ): Promise<ExecutionContext>;

  /**
   * 获取执行上下文
   */
  getContext(executionId: string): Promise<ExecutionContext | undefined>;

  /**
   * 更新执行上下文
   */
  updateContext(executionId: string, context: ExecutionContext): Promise<void>;

  /**
   * 删除执行上下文
   */
  deleteContext(executionId: string): Promise<boolean>;

  /**
   * 获取所有执行上下文
   */
  getAllContexts(): Promise<ExecutionContext[]>;

  /**
   * 获取指定图的执行上下文
   */
  getContextsByGraph(graphId: ID): Promise<ExecutionContext[]>;

  /**
   * 获取指定状态的执行上下文
   */
  getContextsByStatus(status: ExecutionStatus): Promise<ExecutionContext[]>;

  /**
   * 获取指定模式的执行上下文
   */
  getContextsByMode(mode: ExecutionMode): Promise<ExecutionContext[]>;

  /**
   * 获取指定优先级的执行上下文
   */
  getContextsByPriority(priority: ExecutionPriority): Promise<ExecutionContext[]>;

  /**
   * 更新执行状态
   */
  updateStatus(executionId: string, status: ExecutionStatus): Promise<void>;

  /**
   * 设置当前节点
   */
  setCurrentNode(executionId: string, nodeId: ID): Promise<void>;

  /**
   * 添加执行日志
   */
  addLog(executionId: string, log: ExecutionLog): Promise<void>;

  /**
   * 添加执行错误
   */
  addError(executionId: string, error: ExecutionError): Promise<void>;

  /**
   * 设置数据
   */
  setData(executionId: string, key: string, value: any): Promise<void>;

  /**
   * 获取数据
   */
  getData(executionId: string, key: string): Promise<any>;

  /**
   * 设置变量
   */
  setVariable(executionId: string, key: string, value: any): Promise<void>;

  /**
   * 获取变量
   */
  getVariable(executionId: string, key: string): Promise<any>;

  /**
   * 创建节点执行上下文
   */
  createNodeContext(
    executionId: string,
    nodeId: ID,
    nodeType: string,
    nodeConfig: Record<string, any>
  ): Promise<NodeExecutionContext>;

  /**
   * 获取节点执行上下文
   */
  getNodeContext(executionId: string, nodeId: ID): Promise<NodeExecutionContext | undefined>;

  /**
   * 更新节点执行上下文
   */
  updateNodeContext(
    executionId: string,
    nodeId: ID,
    context: NodeExecutionContext
  ): Promise<void>;

  /**
   * 创建边执行上下文
   */
  createEdgeContext(
    executionId: string,
    edgeId: ID,
    edgeType: string,
    sourceNodeId: ID,
    targetNodeId: ID,
    edgeConfig: Record<string, any>
  ): Promise<EdgeExecutionContext>;

  /**
   * 获取边执行上下文
   */
  getEdgeContext(executionId: string, edgeId: ID): Promise<EdgeExecutionContext | undefined>;

  /**
   * 更新边执行上下文
   */
  updateEdgeContext(
    executionId: string,
    edgeId: ID,
    context: EdgeExecutionContext
  ): Promise<void>;

  /**
   * 获取执行统计信息
   */
  getExecutionStatistics(): Promise<ExecutionStatistics>;

  /**
   * 清理过期的执行上下文
   */
  cleanupExpiredContexts(maxAge: number): Promise<number>;

  /**
   * 导出执行上下文
   */
  exportContext(executionId: string): Promise<string>;

  /**
   * 导入执行上下文
   */
  importContext(data: string): Promise<string>;

  /**
   * 订阅执行上下文变化
   */
  subscribe(callback: ContextChangeCallback): Promise<string>;

  /**
   * 取消订阅执行上下文变化
   */
  unsubscribe(subscriptionId: string): Promise<boolean>;
}

/**
 * 执行统计信息接口
 */
export interface ExecutionStatistics {
  /** 总执行数 */
  totalExecutions: number;
  /** 按状态分组的执行数 */
  executionsByStatus: Record<ExecutionStatus, number>;
  /** 按模式分组的执行数 */
  executionsByMode: Record<ExecutionMode, number>;
  /** 按优先级分组的执行数 */
  executionsByPriority: Record<ExecutionPriority, number>;
  /** 按图分组的执行数 */
  executionsByGraph: Record<string, number>;
  /** 平均执行时间 */
  averageExecutionTime: number;
  /** 最长执行时间 */
  maxExecutionTime: number;
  /** 最短执行时间 */
  minExecutionTime: number;
  /** 成功率 */
  successRate: number;
  /** 失败率 */
  failureRate: number;
}

/**
 * 上下文变化事件接口
 */
export interface ContextChangeEvent {
  /** 事件类型 */
  readonly type: 'created' | 'updated' | 'deleted';
  /** 执行ID */
  readonly executionId: string;
  /** 上下文数据 */
  readonly context?: ExecutionContext;
  /** 事件时间 */
  readonly timestamp: Date;
  /** 事件元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 上下文变化回调类型
 */
export type ContextChangeCallback = (event: ContextChangeEvent) => void;

/**
 * 内存执行上下文管理器实现
 */
export class MemoryExecutionContextManager implements IExecutionContextManager {
  private contexts: Map<string, ExecutionContext> = new Map();
  private nodeContexts: Map<string, Map<ID, NodeExecutionContext>> = new Map();
  private edgeContexts: Map<string, Map<ID, EdgeExecutionContext>> = new Map();
  private subscriptions: Map<string, ContextChangeCallback> = new Map();

  /**
   * 创建执行上下文
   */
  async createContext(
    executionId: string,
    graphId: ID,
    config: ExecutionConfig = {}
  ): Promise<ExecutionContext> {
    const context = ExecutionContextUtils.create(executionId, graphId)
      .withConfig(config)
      .build();

    this.contexts.set(executionId, context);
    this.nodeContexts.set(executionId, new Map());
    this.edgeContexts.set(executionId, new Map());

    // 触发创建事件
    this.emitContextChange({
      type: 'created',
      executionId,
      context,
      timestamp: new Date(),
      metadata: {}
    });

    return context;
  }

  /**
   * 获取执行上下文
   */
  async getContext(executionId: string): Promise<ExecutionContext | undefined> {
    return this.contexts.get(executionId);
  }

  /**
   * 更新执行上下文
   */
  async updateContext(executionId: string, context: ExecutionContext): Promise<void> {
    const existingContext = this.contexts.get(executionId);
    if (!existingContext) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    this.contexts.set(executionId, context);

    // 触发更新事件
    this.emitContextChange({
      type: 'updated',
      executionId,
      context,
      timestamp: new Date(),
      metadata: {}
    });
  }

  /**
   * 删除执行上下文
   */
  async deleteContext(executionId: string): Promise<boolean> {
    const existed = this.contexts.has(executionId);

    if (existed) {
      this.contexts.delete(executionId);
      this.nodeContexts.delete(executionId);
      this.edgeContexts.delete(executionId);

      // 触发删除事件
      this.emitContextChange({
        type: 'deleted',
        executionId,
        timestamp: new Date(),
        metadata: {}
      });
    }

    return existed;
  }

  /**
   * 获取所有执行上下文
   */
  async getAllContexts(): Promise<ExecutionContext[]> {
    return Array.from(this.contexts.values());
  }

  /**
   * 获取指定图的执行上下文
   */
  async getContextsByGraph(graphId: ID): Promise<ExecutionContext[]> {
    return Array.from(this.contexts.values()).filter(
      context => context.graphId === graphId
    );
  }

  /**
   * 获取指定状态的执行上下文
   */
  async getContextsByStatus(status: ExecutionStatus): Promise<ExecutionContext[]> {
    return Array.from(this.contexts.values()).filter(
      context => context.status === status
    );
  }

  /**
   * 获取指定模式的执行上下文
   */
  async getContextsByMode(mode: ExecutionMode): Promise<ExecutionContext[]> {
    return Array.from(this.contexts.values()).filter(
      context => context.mode === mode
    );
  }

  /**
   * 获取指定优先级的执行上下文
   */
  async getContextsByPriority(priority: ExecutionPriority): Promise<ExecutionContext[]> {
    return Array.from(this.contexts.values()).filter(
      context => context.priority === priority
    );
  }

  /**
   * 更新执行状态
   */
  async updateStatus(executionId: string, status: ExecutionStatus): Promise<void> {
    const context = await this.getContext(executionId);
    if (!context) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    const updatedContext = ExecutionContextUtils.withStatus(context, status);
    await this.updateContext(executionId, updatedContext);
  }

  /**
   * 设置当前节点
   */
  async setCurrentNode(executionId: string, nodeId: ID): Promise<void> {
    const context = await this.getContext(executionId);
    if (!context) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    const updatedContext = ExecutionContextUtils.withCurrentNode(context, nodeId);
    await this.updateContext(executionId, updatedContext);
  }

  /**
   * 添加执行日志
   */
  async addLog(executionId: string, log: ExecutionLog): Promise<void> {
    const context = await this.getContext(executionId);
    if (!context) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    const updatedContext = ExecutionContextUtils.withLog(context, log);
    await this.updateContext(executionId, updatedContext);
  }

  /**
   * 添加执行错误
   */
  async addError(executionId: string, error: ExecutionError): Promise<void> {
    const context = await this.getContext(executionId);
    if (!context) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    const updatedContext = ExecutionContextUtils.withError(context, error);
    await this.updateContext(executionId, updatedContext);
  }

  /**
   * 设置数据
   */
  async setData(executionId: string, key: string, value: any): Promise<void> {
    const context = await this.getContext(executionId);
    if (!context) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    const updatedContext = ExecutionContextUtils.withData(context, key, value);
    await this.updateContext(executionId, updatedContext);
  }

  /**
   * 获取数据
   */
  async getData(executionId: string, key: string): Promise<any> {
    const context = await this.getContext(executionId);
    if (!context) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    return context.data.get(key);
  }

  /**
   * 设置变量
   */
  async setVariable(executionId: string, key: string, value: any): Promise<void> {
    const context = await this.getContext(executionId);
    if (!context) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    const updatedContext = ExecutionContextUtils.withVariable(context, key, value);
    await this.updateContext(executionId, updatedContext);
  }

  /**
   * 获取变量
   */
  async getVariable(executionId: string, key: string): Promise<any> {
    const context = await this.getContext(executionId);
    if (!context) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    return context.variables.get(key);
  }

  /**
   * 创建节点执行上下文
   */
  async createNodeContext(
    executionId: string,
    nodeId: ID,
    nodeType: string,
    nodeConfig: Record<string, any>
  ): Promise<NodeExecutionContext> {
    const nodeContext = ExecutionContextUtils.createNodeContext(nodeId, nodeType)
      .withNodeConfig(nodeConfig)
      .build();

    const nodeContexts = this.nodeContexts.get(executionId);
    if (!nodeContexts) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    nodeContexts.set(nodeId, nodeContext);
    return nodeContext;
  }

  /**
   * 获取节点执行上下文
   */
  async getNodeContext(executionId: string, nodeId: ID): Promise<NodeExecutionContext | undefined> {
    const nodeContexts = this.nodeContexts.get(executionId);
    return nodeContexts?.get(nodeId);
  }

  /**
   * 更新节点执行上下文
   */
  async updateNodeContext(
    executionId: string,
    nodeId: ID,
    context: NodeExecutionContext
  ): Promise<void> {
    const nodeContexts = this.nodeContexts.get(executionId);
    if (!nodeContexts) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    nodeContexts.set(nodeId, context);
  }

  /**
   * 创建边执行上下文
   */
  async createEdgeContext(
    executionId: string,
    edgeId: ID,
    edgeType: string,
    sourceNodeId: ID,
    targetNodeId: ID,
    edgeConfig: Record<string, any>
  ): Promise<EdgeExecutionContext> {
    const edgeContext = ExecutionContextUtils.createEdgeContext(
      edgeId,
      edgeType,
      sourceNodeId,
      targetNodeId
    ).withEdgeConfig(edgeConfig).build();

    const edgeContexts = this.edgeContexts.get(executionId);
    if (!edgeContexts) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    edgeContexts.set(edgeId, edgeContext);
    return edgeContext;
  }

  /**
   * 获取边执行上下文
   */
  async getEdgeContext(executionId: string, edgeId: ID): Promise<EdgeExecutionContext | undefined> {
    const edgeContexts = this.edgeContexts.get(executionId);
    return edgeContexts?.get(edgeId);
  }

  /**
   * 更新边执行上下文
   */
  async updateEdgeContext(
    executionId: string,
    edgeId: ID,
    context: EdgeExecutionContext
  ): Promise<void> {
    const edgeContexts = this.edgeContexts.get(executionId);
    if (!edgeContexts) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    edgeContexts.set(edgeId, context);
  }

  /**
   * 获取执行统计信息
   */
  async getExecutionStatistics(): Promise<ExecutionStatistics> {
    const contexts = Array.from(this.contexts.values());

    // 初始化统计对象
    const executionsByStatus: Record<ExecutionStatus, number> = Object.fromEntries(
      Object.values(ExecutionStatus).map(status => [status, 0])
    ) as Record<ExecutionStatus, number>;
    
    const executionsByMode: Record<ExecutionMode, number> = Object.fromEntries(
      Object.values(ExecutionMode).map(mode => [mode, 0])
    ) as Record<ExecutionMode, number>;
    
    const executionsByPriority: Record<ExecutionPriority, number> = Object.fromEntries(
      Object.values(ExecutionPriority).map(priority => [priority, 0])
    ) as Record<ExecutionPriority, number>;
    
    const executionsByGraph: Record<string, number> = {};

    // 初始化计数器
    for (const status of Object.values(ExecutionStatus)) {
      executionsByStatus[status] = 0;
    }
    for (const mode of Object.values(ExecutionMode)) {
      executionsByMode[mode] = 0;
    }
    for (const priority of Object.values(ExecutionPriority)) {
      executionsByPriority[priority as ExecutionPriority] = 0;
    }

    // 统计执行数据
    let totalExecutionTime = 0;
    let completedExecutions = 0;
    let maxExecutionTime = 0;
    let minExecutionTime = Number.MAX_VALUE;

    for (const context of contexts) {
      // 统计状态
      executionsByStatus[context.status]++;

      // 统计模式
      executionsByMode[context.mode]++;

      // 统计优先级
      executionsByPriority[context.priority]++;

      // 统计图
      const graphIdStr = context.graphId.toString();
      executionsByGraph[graphIdStr] = (executionsByGraph[graphIdStr] || 0) + 1;

      // 统计执行时间
      if (context.duration) {
        totalExecutionTime += context.duration;

        if (context.status === ExecutionStatus.COMPLETED) {
          completedExecutions++;
          maxExecutionTime = Math.max(maxExecutionTime, context.duration);
          minExecutionTime = Math.min(minExecutionTime, context.duration);
        }
      }
    }

    const totalExecutions = contexts.length;
    const averageExecutionTime = completedExecutions > 0 ? totalExecutionTime / completedExecutions : 0;
    const successRate = totalExecutions > 0 ? executionsByStatus[ExecutionStatus.COMPLETED] / totalExecutions : 0;
    const failureRate = totalExecutions > 0 ? (executionsByStatus[ExecutionStatus.FAILED] + executionsByStatus[ExecutionStatus.TIMEOUT]) / totalExecutions : 0;

    return {
      totalExecutions,
      executionsByStatus,
      executionsByMode,
      executionsByPriority,
      executionsByGraph,
      averageExecutionTime,
      maxExecutionTime: maxExecutionTime === Number.MAX_VALUE ? 0 : maxExecutionTime,
      minExecutionTime: minExecutionTime === Number.MAX_VALUE ? 0 : minExecutionTime,
      successRate,
      failureRate
    };
  }

  /**
   * 清理过期的执行上下文
   */
  async cleanupExpiredContexts(maxAge: number): Promise<number> {
    const now = new Date();
    const expiredIds: string[] = [];

    for (const [executionId, context] of this.contexts) {
      const age = now.getTime() - context.startTime.getTime();
      if (age > maxAge) {
        expiredIds.push(executionId);
      }
    }

    for (const executionId of expiredIds) {
      await this.deleteContext(executionId);
    }

    return expiredIds.length;
  }

  /**
   * 导出执行上下文
   */
  async exportContext(executionId: string): Promise<string> {
    const context = await this.getContext(executionId);
    if (!context) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    const nodeContexts = this.nodeContexts.get(executionId) || new Map();
    const edgeContexts = this.edgeContexts.get(executionId) || new Map();

    const exportData = {
      context,
      nodeContexts: Array.from(nodeContexts.entries()),
      edgeContexts: Array.from(edgeContexts.entries())
    };

    return JSON.stringify(exportData);
  }

  /**
   * 导入执行上下文
   */
  async importContext(data: string): Promise<string> {
    const importData = JSON.parse(data);
    const { context, nodeContexts, edgeContexts } = importData;

    // 导入主上下文
    this.contexts.set(context.executionId, context);
    this.nodeContexts.set(context.executionId, new Map(nodeContexts));
    this.edgeContexts.set(context.executionId, new Map(edgeContexts));

    return context.executionId;
  }

  /**
   * 订阅执行上下文变化
   */
  async subscribe(callback: ContextChangeCallback): Promise<string> {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscriptions.set(subscriptionId, callback);
    return subscriptionId;
  }

  /**
   * 取消订阅执行上下文变化
   */
  async unsubscribe(subscriptionId: string): Promise<boolean> {
    return this.subscriptions.delete(subscriptionId);
  }

  /**
   * 触发上下文变化事件
   */
  private emitContextChange(event: ContextChangeEvent): void {
    for (const callback of this.subscriptions.values()) {
      try {
        callback(event);
      } catch (error) {
        console.error('上下文变化回调执行失败:', error);
      }
    }
  }
}