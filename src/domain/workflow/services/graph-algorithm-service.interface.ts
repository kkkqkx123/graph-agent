/**
 * 图算法服务接口
 *
 * 提供各种图算法功能，专注于算法实现：
 * 1. 拓扑排序
 * 2. 循环检测
 * 3. 连通分量分析
 * 4. 路径查找
 * 5. 图复杂度分析
 *
 * 此接口定义图算法的契约，具体实现在基础设施层提供。
 */

import { Workflow } from '../entities/workflow';
import { NodeValueObject } from '../value-objects';
import { ID } from '../../common/value-objects/id';

/**
 * 图复杂度指标
 */
export interface GraphComplexity {
  /** 节点数量 */
  nodeCount: number;
  /** 边数量 */
  edgeCount: number;
  /** 最大路径长度 */
  maxPathLength: number;
  /** 循环数量 */
  cycleCount: number;
  /** 连通分量数量 */
  componentCount: number;
}

/**
 * 图算法服务接口
 */
export interface GraphAlgorithmService {
  /**
   * 获取图的拓扑排序
   * @param workflow 工作流图
   * @returns 拓扑排序的节点列表
   */
  getTopologicalOrder(workflow: Workflow): NodeValueObject[];

  /**
   * 检查图是否包含循环
   * @param workflow 工作流图
   * @returns 是否包含循环
   */
  hasCycle(workflow: Workflow): boolean;

  /**
   * 获取图的连通分量
   * @param workflow 工作流图
   * @returns 连通分量列表
   */
  getConnectedComponents(workflow: Workflow): NodeValueObject[][];

  /**
   * 查找两个节点之间的路径
   * @param workflow 工作流图
   * @param startNodeId 起始节点ID
   * @param endNodeId 结束节点ID
   * @returns 路径节点列表，如果不存在路径则返回空数组
   */
  findPath(workflow: Workflow, startNodeId: ID, endNodeId: ID): NodeValueObject[];

  /**
   * 查找两个节点之间的所有路径
   * @param workflow 工作流图
   * @param startNodeId 起始节点ID
   * @param endNodeId 结束节点ID
   * @returns 所有路径的列表
   */
  findAllPaths(workflow: Workflow, startNodeId: ID, endNodeId: ID): NodeValueObject[][];

  /**
   * 计算图的复杂度
   * @param workflow 工作流图
   * @returns 图复杂度指标
   */
  calculateComplexity(workflow: Workflow): GraphComplexity;
}