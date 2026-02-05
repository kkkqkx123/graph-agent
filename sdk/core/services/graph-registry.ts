/**
 * GraphRegistry - 图注册器
 * 负责图结构的注册、查询和缓存管理
 * 作为全局单例，提供统一的图访问接口
 */
import type { GraphData } from '../entities/graph-data';
import type { ID } from '../../types/common';

export class GraphRegistry {
  private graphs: Map<string, GraphData> = new Map();
  
  /**
   * 注册图结构
   * @param workflowId 工作流ID
   * @param graph 图数据结构
   */
  register(workflowId: string, graph: GraphData): void {
    // 标记为只读后注册，确保运行时不可修改
    graph.markAsReadOnly();
    this.graphs.set(workflowId, graph);
  }
  
  /**
   * 获取图结构
   * @param workflowId 工作流ID
   * @returns 图数据结构，如果不存在则返回undefined
   */
  get(workflowId: string): GraphData | undefined {
    return this.graphs.get(workflowId);
  }
  
  /**
   * 检查图是否存在
   * @param workflowId 工作流ID
   * @returns 是否存在
   */
  has(workflowId: string): boolean {
    return this.graphs.has(workflowId);
  }
  
  /**
   * 删除指定工作流的图结构
   * @param workflowId 工作流ID
   */
  delete(workflowId: string): void {
    this.graphs.delete(workflowId);
  }

  /**
   * 清空所有图缓存
   */
  clear(): void {
    this.graphs.clear();
  }
}

/**
 * 全局图注册器单例实例
 */
export const graphRegistry = new GraphRegistry();