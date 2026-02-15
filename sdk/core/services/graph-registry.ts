/**
 * 图注册表
 * 管理预处理后的图
 *
 * 本模块只导出类定义，不导出实例
 * 实例通过 SingletonRegistry 统一管理
 */

import type { PreprocessedGraph, ID } from '@modular-agent/types';

/**
 * 图注册表类
 * 负责管理预处理后的图
 */
export class GraphRegistry {
  private graphs: Map<ID, PreprocessedGraph> = new Map();
  
  /**
   * 注册预处理后的图
   * @param graph 预处理后的图
   */
  register(graph: PreprocessedGraph): void {
    this.graphs.set(graph.workflowId, graph);
  }
  
  /**
   * 获取预处理后的图
   * @param workflowId 工作流ID
   * @returns 预处理后的图，如果不存在则返回undefined
   */
  get(workflowId: ID): PreprocessedGraph | undefined {
    return this.graphs.get(workflowId);
  }
  
  /**
   * 检查图是否存在
   * @param workflowId 工作流ID
   * @returns 是否存在
   */
  has(workflowId: ID): boolean {
    return this.graphs.has(workflowId);
  }
  
  /**
   * 移除图
   * @param workflowId 工作流ID
   */
  unregister(workflowId: ID): void {
    this.graphs.delete(workflowId);
  }
  
  /**
   * 清空所有图
   */
  clear(): void {
    this.graphs.clear();
  }
  
  /**
   * 获取所有工作流ID
   * @returns 工作流ID数组
   */
  getAllWorkflowIds(): ID[] {
    return Array.from(this.graphs.keys());
  }
  
  /**
   * 获取图数量
   * @returns 图数量
   */
  size(): number {
    return this.graphs.size;
  }
  
  /**
   * 批量注册图
   * @param graphs 预处理后的图数组
   */
  registerBatch(graphs: PreprocessedGraph[]): void {
    for (const graph of graphs) {
      this.register(graph);
    }
  }
  
  /**
   * 批量移除图
   * @param workflowIds 工作流ID数组
   */
  unregisterBatch(workflowIds: ID[]): void {
    for (const workflowId of workflowIds) {
      this.unregister(workflowId);
    }
  }
}