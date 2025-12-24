import { Workflow, NodeData, EdgeData } from '../entities/workflow';
import { ID } from '../../common/value-objects/id';

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
export interface GraphAlgorithmService {
  /**
   * 获取图的拓扑排序
   * @param graph 工作流图
   * @returns 拓扑排序的节点列表
   */
  getTopologicalOrder(workflow: Workflow): NodeData[];

  /**
   * 检查图是否包含循环
   * @param graph 工作流图
   * @returns 是否包含循环
   */
  hasCycle(workflow: Workflow): boolean;

  /**
   * 获取图的连通分量
   * @param graph 工作流图
   * @returns 连通分量列表
   */
  getConnectedComponents(workflow: Workflow): NodeData[][];

  /**
   * 查找两个节点之间的路径
   * @param graph 工作流图
   * @param startNodeId 起始节点ID
   * @param endNodeId 结束节点ID
   * @returns 路径节点列表，如果不存在路径则返回空数组
   */
  findPath(workflow: Workflow, startNodeId: ID, endNodeId: ID): NodeData[];

  /**
   * 查找两个节点之间的所有路径
   * @param graph 工作流图
   * @param startNodeId 起始节点ID
   * @param endNodeId 结束节点ID
   * @returns 所有路径的节点列表
   */
  findAllPaths(workflow: Workflow, startNodeId: ID, endNodeId: ID): NodeData[][];

  /**
   * 获取节点的相邻节点
   * @param graph 工作流图
   * @param nodeId 节点ID
   * @returns 相邻节点列表
   */
  getAdjacentNodes(workflow: Workflow, nodeId: ID): NodeData[];

  /**
   * 分析图的复杂度
   * @param graph 工作流图
   * @returns 图复杂度分析结果
   */
  analyzeGraphComplexity(workflow: Workflow): GraphComplexity;

  /**
   * 获取图的入度统计
   * @param graph 工作流图
   * @returns 节点入度映射
   */
  getInDegreeStatistics(workflow: Workflow): Map<string, number>;

  /**
   * 获取图的出度统计
   * @param graph 工作流图
   * @returns 节点出度映射
   */
  getOutDegreeStatistics(workflow: Workflow): Map<string, number>;
}

/**
 * 图复杂度分析结果
 */
export interface GraphComplexity {
  /** 节点数量 */
  nodeCount: number;
  /** 边数量 */
  edgeCount: number;
  /** 平均度 */
  averageDegree: number;
  /** 最大入度 */
  maxInDegree: number;
  /** 最大出度 */
  maxOutDegree: number;
  /** 连通分量数量 */
  connectedComponentCount: number;
  /** 是否包含循环 */
  hasCycle: boolean;
  /** 图深度（最长路径长度） */
  depth: number;
  /** 图宽度（最大并行分支数） */
  width: number;
  /** 复杂度评分（0-100） */
  complexityScore: number;
}