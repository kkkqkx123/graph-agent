import { ID } from '../../common/value-objects';
import { ExecutionHistory } from '../value-objects/workflow-state';

/**
 * 执行历史记录接口
 */
export interface HistoryRecord {
  /** 历史记录ID */
  readonly id: string;
  /** 线程ID */
  readonly threadId: string;
  /** 节点ID */
  readonly nodeId: ID;
  /** 执行时间 */
  readonly timestamp: Date;
  /** 执行结果 */
  readonly result?: any;
  /** 执行状态 */
  readonly status: 'success' | 'failure' | 'pending' | 'running';
  /** 执行元数据 */
  readonly metadata?: Record<string, any>;
}

/**
 * 历史统计信息接口
 */
export interface HistoryStatistics {
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 待执行次数 */
  pendingCount: number;
  /** 运行中次数 */
  runningCount: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime?: number;
}

/**
 * 历史管理器
 *
 * 职责：
 * - 记录工作流执行历史
 * - 查询执行历史
 * - 统计执行历史
 *
 * 特性：
 * - 线程级别的历史隔离
 * - 支持历史记录查询
 * - 支持历史统计
 */
export class HistoryManager {
  private histories: Map<string, HistoryRecord[]>;

  constructor() {
    this.histories = new Map();
  }

  /**
   * 记录执行历史
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @param result 执行结果
   * @param status 执行状态
   * @param metadata 元数据
   * @returns 历史记录ID
   */
  recordExecution(
    threadId: string,
    nodeId: ID,
    result?: any,
    status: 'success' | 'failure' | 'pending' | 'running' = 'success',
    metadata?: Record<string, any>
  ): string {
    const historyId = this.generateHistoryId();
    const timestamp = new Date();

    const record: HistoryRecord = {
      id: historyId,
      threadId,
      nodeId,
      timestamp,
      result,
      status,
      metadata
    };

    // 获取或创建线程的历史记录
    if (!this.histories.has(threadId)) {
      this.histories.set(threadId, []);
    }

    const threadHistory = this.histories.get(threadId)!;
    threadHistory.push(record);

    return historyId;
  }

  /**
   * 获取执行历史
   * @param threadId 线程ID
   * @returns 执行历史数组
   */
  getHistory(threadId: string): HistoryRecord[] {
    const history = this.histories.get(threadId);
    return history ? [...history] : [];
  }

  /**
   * 获取指定节点的执行历史
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @returns 指定节点的执行历史数组
   */
  getNodeHistory(threadId: string, nodeId: ID): HistoryRecord[] {
    const history = this.histories.get(threadId);
    if (!history) {
      return [];
    }

    return history.filter(record => record.nodeId.equals(nodeId));
  }

  /**
   * 获取最新的执行历史
   * @param threadId 线程ID
   * @param limit 限制数量
   * @returns 最新的执行历史数组
   */
  getLatestHistory(threadId: string, limit?: number): HistoryRecord[] {
    const history = this.histories.get(threadId);
    if (!history) {
      return [];
    }

    // 按时间倒序排序
    const sorted = [...history].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * 获取历史统计信息
   * @param threadId 线程ID
   * @returns 历史统计信息
   */
  getHistoryStatistics(threadId: string): HistoryStatistics {
    const history = this.histories.get(threadId);
    if (!history || history.length === 0) {
      return {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        pendingCount: 0,
        runningCount: 0
      };
    }

    const statistics: HistoryStatistics = {
      totalExecutions: history.length,
      successCount: 0,
      failureCount: 0,
      pendingCount: 0,
      runningCount: 0
    };

    for (const record of history) {
      switch (record.status) {
        case 'success':
          statistics.successCount++;
          break;
        case 'failure':
          statistics.failureCount++;
          break;
        case 'pending':
          statistics.pendingCount++;
          break;
        case 'running':
          statistics.runningCount++;
          break;
      }
    }

    return statistics;
  }

  /**
   * 清除执行历史
   * @param threadId 线程ID
   */
  clearHistory(threadId: string): void {
    this.histories.delete(threadId);
  }

  /**
   * 清除所有执行历史
   */
  clearAllHistories(): void {
    this.histories.clear();
  }

  /**
   * 检查是否有执行历史
   * @param threadId 线程ID
   * @returns 是否有执行历史
   */
  hasHistory(threadId: string): boolean {
    const history = this.histories.get(threadId);
    return history !== undefined && history.length > 0;
  }

  /**
   * 获取所有线程ID
   * @returns 线程ID数组
   */
  getAllThreadIds(): string[] {
    return Array.from(this.histories.keys());
  }

  /**
   * 获取历史记录数量
   * @param threadId 线程ID
   * @returns 历史记录数量
   */
  getHistoryCount(threadId: string): number {
    const history = this.histories.get(threadId);
    return history ? history.length : 0;
  }

  /**
   * 生成历史记录ID（私有方法）
   * @returns 历史记录ID
   */
  private generateHistoryId(): string {
    return `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}