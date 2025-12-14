import { Repository } from '../../common/repositories/repository';
import { Graph } from '../entities/graph';
import { Node } from '../entities/node';
import { Edge } from '../entities/edge';
import { ID } from '../../common/value-objects/id';
import { NodeType } from '../value-objects/node-type';
import { EdgeType } from '../value-objects/edge-type';
import { QueryOptions, PaginatedResult } from '../../common/repositories/repository';

/**
 * 图查询选项接口
 */
export interface GraphQueryOptions extends QueryOptions {
  /**
   * 名称过滤
   */
  name?: string;

  /**
   * 创建者过滤
   */
  createdBy?: string;

  /**
   * 创建时间范围过滤
   */
  createdAfter?: Date;
  createdBefore?: Date;

  /**
   * 最小节点数量
   */
  minNodeCount?: number;

  /**
   * 最大节点数量
   */
  maxNodeCount?: number;

  /**
   * 最小边数量
   */
  minEdgeCount?: number;

  /**
   * 最大边数量
   */
  maxEdgeCount?: number;

  /**
   * 是否包含已删除的图
   */
  includeDeleted?: boolean;
}

/**
 * 节点查询选项接口
 */
export interface NodeQueryOptions extends QueryOptions {
  /**
   * 图ID过滤
   */
  graphId?: string;

  /**
   * 节点类型过滤
   */
  nodeType?: string;

  /**
   * 节点名称过滤
   */
  nodeName?: string;

  /**
   * 创建时间范围过滤
   */
  createdAfter?: Date;
  createdBefore?: Date;

  /**
   * 是否包含已删除的节点
   */
  includeDeleted?: boolean;
}

/**
 * 边查询选项接口
 */
export interface EdgeQueryOptions extends QueryOptions {
  /**
   * 图ID过滤
   */
  graphId?: string;

  /**
   * 边类型过滤
   */
  edgeType?: string;

  /**
   * 源节点ID过滤
   */
  fromNodeId?: string;

  /**
   * 目标节点ID过滤
   */
  toNodeId?: string;

  /**
   * 创建时间范围过滤
   */
  createdAfter?: Date;
  createdBefore?: Date;

  /**
   * 是否包含已删除的边
   */
  includeDeleted?: boolean;
}

/**
 * 图仓储接口
 * 
 * 定义图持久化和查询的契约
 */
export interface GraphRepository extends Repository<Graph, ID> {
  /**
   * 根据名称查找图
   * @param name 图名称
   * @param options 查询选项
   * @returns 图列表
   */
  findByName(name: string, options?: GraphQueryOptions): Promise<Graph[]>;

  /**
   * 根据创建者查找图
   * @param createdBy 创建者ID
   * @param options 查询选项
   * @returns 图列表
   */
  findByCreatedBy(createdBy: ID, options?: GraphQueryOptions): Promise<Graph[]>;

  /**
   * 根据名称搜索图
   * @param name 名称关键词
   * @param options 查询选项
   * @returns 图列表
   */
  searchByName(name: string, options?: GraphQueryOptions): Promise<Graph[]>;

  /**
   * 分页查询图
   * @param options 查询选项
   * @returns 分页结果
   */
  findWithPagination(options: GraphQueryOptions): Promise<PaginatedResult<Graph>>;

  /**
   * 统计指定创建者的图数量
   * @param createdBy 创建者ID
   * @param options 查询选项
   * @returns 图数量
   */
  countByCreatedBy(createdBy: ID, options?: GraphQueryOptions): Promise<number>;

  /**
   * 检查图名称是否已存在
   * @param name 图名称
   * @param excludeId 排除的图ID
   * @returns 是否已存在
   */
  existsByName(name: string, excludeId?: ID): Promise<boolean>;

  /**
   * 获取最近创建的图
   * @param limit 限制数量
   * @param options 查询选项
   * @returns 最近创建的图列表
   */
  getRecentlyCreatedGraphs(limit: number, options?: GraphQueryOptions): Promise<Graph[]>;

  /**
   * 获取最复杂的图（按节点和边数量）
   * @param limit 限制数量
   * @param options 查询选项
   * @returns 最复杂的图列表
   */
  getMostComplexGraphs(limit: number, options?: GraphQueryOptions): Promise<Graph[]>;

  /**
   * 批量删除图
   * @param graphIds 图ID列表
   * @returns 删除的图数量
   */
  batchDelete(graphIds: ID[]): Promise<number>;

  /**
   * 软删除图
   * @param graphId 图ID
   */
  softDelete(graphId: ID): Promise<void>;

  /**
   * 批量软删除图
   * @param graphIds 图ID列表
   * @returns 删除的图数量
   */
  batchSoftDelete(graphIds: ID[]): Promise<number>;

  /**
   * 恢复软删除的图
   * @param graphId 图ID
   */
  restoreSoftDeleted(graphId: ID): Promise<void>;

  /**
   * 查找软删除的图
   * @param options 查询选项
   * @returns 软删除的图列表
   */
  findSoftDeleted(options?: GraphQueryOptions): Promise<Graph[]>;
}

/**
 * 节点仓储接口
 * 
 * 定义节点持久化和查询的契约
 */
export interface NodeRepository extends Repository<Node, ID> {
  /**
   * 根据图ID查找节点
   * @param graphId 图ID
   * @param options 查询选项
   * @returns 节点列表
   */
  findByGraphId(graphId: ID, options?: NodeQueryOptions): Promise<Node[]>;

  /**
   * 根据节点类型查找节点
   * @param nodeType 节点类型
   * @param options 查询选项
   * @returns 节点列表
   */
  findByNodeType(nodeType: NodeType, options?: NodeQueryOptions): Promise<Node[]>;

  /**
   * 根据节点名称查找节点
   * @param nodeName 节点名称
   * @param options 查询选项
   * @returns 节点列表
   */
  findByNodeName(nodeName: string, options?: NodeQueryOptions): Promise<Node[]>;

  /**
   * 根据图ID和节点类型查找节点
   * @param graphId 图ID
   * @param nodeType 节点类型
   * @param options 查询选项
   * @returns 节点列表
   */
  findByGraphIdAndNodeType(
    graphId: ID,
    nodeType: NodeType,
    options?: NodeQueryOptions
  ): Promise<Node[]>;

  /**
   * 查找开始节点
   * @param graphId 图ID
   * @param options 查询选项
   * @returns 开始节点列表
   */
  findStartNodes(graphId: ID, options?: NodeQueryOptions): Promise<Node[]>;

  /**
   * 查找结束节点
   * @param graphId 图ID
   * @param options 查询选项
   * @returns 结束节点列表
   */
  findEndNodes(graphId: ID, options?: NodeQueryOptions): Promise<Node[]>;

  /**
   * 查找任务节点
   * @param graphId 图ID
   * @param options 查询选项
   * @returns 任务节点列表
   */
  findTaskNodes(graphId: ID, options?: NodeQueryOptions): Promise<Node[]>;

  /**
   * 查找决策节点
   * @param graphId 图ID
   * @param options 查询选项
   * @returns 决策节点列表
   */
  findDecisionNodes(graphId: ID, options?: NodeQueryOptions): Promise<Node[]>;

  /**
   * 分页查询节点
   * @param options 查询选项
   * @returns 分页结果
   */
  findWithPagination(options: NodeQueryOptions): Promise<PaginatedResult<Node>>;

  /**
   * 统计指定图的节点数量
   * @param graphId 图ID
   * @param options 查询选项
   * @returns 节点数量
   */
  countByGraphId(graphId: ID, options?: NodeQueryOptions): Promise<number>;

  /**
   * 统计指定节点类型的节点数量
   * @param nodeType 节点类型
   * @param options 查询选项
   * @returns 节点数量
   */
  countByNodeType(nodeType: NodeType, options?: NodeQueryOptions): Promise<number>;

  /**
   * 批量删除节点
   * @param nodeIds 节点ID列表
   * @returns 删除的节点数量
   */
  batchDelete(nodeIds: ID[]): Promise<number>;

  /**
   * 软删除节点
   * @param nodeId 节点ID
   */
  softDelete(nodeId: ID): Promise<void>;

  /**
   * 批量软删除节点
   * @param nodeIds 节点ID列表
   * @returns 删除的节点数量
   */
  batchSoftDelete(nodeIds: ID[]): Promise<number>;

  /**
   * 恢复软删除的节点
   * @param nodeId 节点ID
   */
  restoreSoftDeleted(nodeId: ID): Promise<void>;

  /**
   * 查找软删除的节点
   * @param options 查询选项
   * @returns 软删除的节点列表
   */
  findSoftDeleted(options?: NodeQueryOptions): Promise<Node[]>;
}

/**
 * 边仓储接口
 * 
 * 定义边持久化和查询的契约
 */
export interface EdgeRepository extends Repository<Edge, ID> {
  /**
   * 根据图ID查找边
   * @param graphId 图ID
   * @param options 查询选项
   * @returns 边列表
   */
  findByGraphId(graphId: ID, options?: EdgeQueryOptions): Promise<Edge[]>;

  /**
   * 根据边类型查找边
   * @param edgeType 边类型
   * @param options 查询选项
   * @returns 边列表
   */
  findByEdgeType(edgeType: EdgeType, options?: EdgeQueryOptions): Promise<Edge[]>;

  /**
   * 根据源节点ID查找边
   * @param fromNodeId 源节点ID
   * @param options 查询选项
   * @returns 边列表
   */
  findByFromNodeId(fromNodeId: ID, options?: EdgeQueryOptions): Promise<Edge[]>;

  /**
   * 根据目标节点ID查找边
   * @param toNodeId 目标节点ID
   * @param options 查询选项
   * @returns 边列表
   */
  findByToNodeId(toNodeId: ID, options?: EdgeQueryOptions): Promise<Edge[]>;

  /**
   * 根据图ID和边类型查找边
   * @param graphId 图ID
   * @param edgeType 边类型
   * @param options 查询选项
   * @returns 边列表
   */
  findByGraphIdAndEdgeType(
    graphId: ID,
    edgeType: EdgeType,
    options?: EdgeQueryOptions
  ): Promise<Edge[]>;

  /**
   * 查找条件边
   * @param graphId 图ID
   * @param options 查询选项
   * @returns 条件边列表
   */
  findConditionalEdges(graphId: ID, options?: EdgeQueryOptions): Promise<Edge[]>;

  /**
   * 查找默认边
   * @param graphId 图ID
   * @param options 查询选项
   * @returns 默认边列表
   */
  findDefaultEdges(graphId: ID, options?: EdgeQueryOptions): Promise<Edge[]>;

  /**
   * 查找异常处理边
   * @param graphId 图ID
   * @param options 查询选项
   * @returns 异常处理边列表
   */
  findExceptionHandlingEdges(graphId: ID, options?: EdgeQueryOptions): Promise<Edge[]>;

  /**
   * 分页查询边
   * @param options 查询选项
   * @returns 分页结果
   */
  findWithPagination(options: EdgeQueryOptions): Promise<PaginatedResult<Edge>>;

  /**
   * 统计指定图的边数量
   * @param graphId 图ID
   * @param options 查询选项
   * @returns 边数量
   */
  countByGraphId(graphId: ID, options?: EdgeQueryOptions): Promise<number>;

  /**
   * 统计指定边类型的边数量
   * @param edgeType 边类型
   * @param options 查询选项
   * @returns 边数量
   */
  countByEdgeType(edgeType: EdgeType, options?: EdgeQueryOptions): Promise<number>;

  /**
   * 批量删除边
   * @param edgeIds 边ID列表
   * @returns 删除的边数量
   */
  batchDelete(edgeIds: ID[]): Promise<number>;

  /**
   * 软删除边
   * @param edgeId 边ID
   */
  softDelete(edgeId: ID): Promise<void>;

  /**
   * 批量软删除边
   * @param edgeIds 边ID列表
   * @returns 删除的边数量
   */
  batchSoftDelete(edgeIds: ID[]): Promise<number>;

  /**
   * 恢复软删除的边
   * @param edgeId 边ID
   */
  restoreSoftDeleted(edgeId: ID): Promise<void>;

  /**
   * 查找软删除的边
   * @param options 查询选项
   * @returns 软删除的边列表
   */
  findSoftDeleted(options?: EdgeQueryOptions): Promise<Edge[]>;
}