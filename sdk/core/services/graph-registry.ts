/**
 * GraphRegistry - 图注册器
 * 负责图结构的注册、查询和缓存管理
 * 作为全局单例，提供统一的图访问接口
 *
 * 设计说明：
 * - 图在注册后应该是不可变的，由 GraphBuilder 确保构建完成
 * - 运行时不应该修改图结构
 * - 通过架构设计保证不可变性，而非运行时检查
 */
import type { GraphData } from '../entities/graph-data';

export class GraphRegistry {
  private graphs: Map<string, GraphData> = new Map();

  /**
   * 注册图结构
   * @param workflowId 工作流ID
   * @param graph 图数据结构（应该是构建完成的不可变实例）
   */
  register(workflowId: string, graph: GraphData): void {
    // 验证图对象不为空
    if (!graph) {
      throw new Error('Graph cannot be null or undefined');
    }
    // 直接注册图，依赖 GraphBuilder 确保图已构建完成且不可变
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