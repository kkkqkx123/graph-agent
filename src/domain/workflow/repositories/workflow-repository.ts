import { Repository } from '../../common/repositories/repository';
import { Workflow } from '../entities/workflow';
import { ID } from '../../common/value-objects/id';
import { WorkflowStatus } from '../value-objects/workflow-status';
import { WorkflowType } from '../value-objects/workflow-type';
import { QueryOptions, PaginatedResult } from '../../common/repositories/repository';
import { Node } from '../entities/nodes/base/node';
import { Edge } from '../entities/edges/base/edge';
import { NodeType } from '../value-objects/node-type';
import { EdgeType } from '../value-objects/edge-type';

/**
 * 工作流查询选项接口
 */
export interface WorkflowQueryOptions extends QueryOptions {
  /**
   * 名称过滤
   */
  name?: string;

  /**
   * 状态过滤
   */
  status?: string;

  /**
   * 类型过滤
   */
  type?: string;

  /**
   * 标签过滤
   */
  tags?: string[];

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
   * 是否包含已删除的工作流
   */
  includeDeleted?: boolean;

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
   * 最小执行次数
   */
  minExecutionCount?: number;

  /**
   * 最大执行次数
   */
  maxExecutionCount?: number;
}

/**
 * 工作流仓储接口
 * 
 * 定义工作流持久化和查询的契约
 */
export interface WorkflowRepository extends Repository<Workflow, ID> {
  /**
   * 根据名称查找工作流
   * @param name 工作流名称
   * @param options 查询选项
   * @returns 工作流列表
   */
  findByName(name: string, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 根据状态查找工作流
   * @param status 工作流状态
   * @param options 查询选项
   * @returns 工作流列表
   */
  findByStatus(status: WorkflowStatus, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 根据类型查找工作流
   * @param type 工作流类型
   * @param options 查询选项
   * @returns 工作流列表
   */
  findByType(type: WorkflowType, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 根据标签查找工作流
   * @param tags 标签列表
   * @param options 查询选项
   * @returns 工作流列表
   */
  findByTags(tags: string[], options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 根据创建者查找工作流
   * @param createdBy 创建者ID
   * @param options 查询选项
   * @returns 工作流列表
   */
  findByCreatedBy(createdBy: ID, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 查找草稿工作流
   * @param options 查询选项
   * @returns 草稿工作流列表
   */
  findDraftWorkflows(options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 查找活跃工作流
   * @param options 查询选项
   * @returns 活跃工作流列表
   */
  findActiveWorkflows(options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 查找非活跃工作流
   * @param options 查询选项
   * @returns 非活跃工作流列表
   */
  findInactiveWorkflows(options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 查找归档工作流
   * @param options 查询选项
   * @returns 归档工作流列表
   */
  findArchivedWorkflows(options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 根据名称搜索工作流
   * @param name 名称关键词
   * @param options 查询选项
   * @returns 工作流列表
   */
  searchByName(name: string, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 根据描述搜索工作流
   * @param description 描述关键词
   * @param options 查询选项
   * @returns 工作流列表
   */
  searchByDescription(description: string, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 分页查询工作流
   * @param options 查询选项
   * @returns 分页结果
   */
  findWithPagination(options: WorkflowQueryOptions): Promise<PaginatedResult<Workflow>>;

  /**
   * 统计指定状态的工作流数量
   * @param status 工作流状态
   * @param options 查询选项
   * @returns 工作流数量
   */
  countByStatus(status: WorkflowStatus, options?: WorkflowQueryOptions): Promise<number>;

  /**
   * 统计指定类型的工作流数量
   * @param type 工作流类型
   * @param options 查询选项
   * @returns 工作流数量
   */
  countByType(type: WorkflowType, options?: WorkflowQueryOptions): Promise<number>;

  /**
   * 统计指定创建者的工作流数量
   * @param createdBy 创建者ID
   * @param options 查询选项
   * @returns 工作流数量
   */
  countByCreatedBy(createdBy: ID, options?: WorkflowQueryOptions): Promise<number>;

  /**
   * 统计指定标签的工作流数量
   * @param tags 标签列表
   * @param options 查询选项
   * @returns 工作流数量
   */
  countByTags(tags: string[], options?: WorkflowQueryOptions): Promise<number>;

  /**
   * 检查工作流名称是否已存在
   * @param name 工作流名称
   * @param excludeId 排除的工作流ID
   * @returns 是否已存在
   */
  existsByName(name: string, excludeId?: ID): Promise<boolean>;

  /**
   * 获取最活跃的工作流
   * @param limit 限制数量
   * @param options 查询选项
   * @returns 最活跃的工作流列表
   */
  getMostActiveWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 获取最近创建的工作流
   * @param limit 限制数量
   * @param options 查询选项
   * @returns 最近创建的工作流列表
   */
  getRecentlyCreatedWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 获取最复杂的工作流（按节点和边数量）
   * @param limit 限制数量
   * @param options 查询选项
   * @returns 最复杂的工作流列表
   */
  getMostComplexWorkflows(limit: number, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 批量更新工作流状态
   * @param workflowIds 工作流ID列表
   * @param status 新状态
   * @param changedBy 变更者ID
   * @param reason 变更原因
   * @returns 更新的工作流数量
   */
  batchUpdateStatus(
    workflowIds: ID[],
    status: WorkflowStatus,
    changedBy?: ID,
    reason?: string
  ): Promise<number>;

  /**
   * 批量删除工作流
   * @param workflowIds 工作流ID列表
   * @returns 删除的工作流数量
   */
  batchDelete(workflowIds: ID[]): Promise<number>;

  /**
   * 软删除工作流
   * @param workflowId 工作流ID
   */
  softDelete(workflowId: ID): Promise<void>;

  /**
   * 批量软删除工作流
   * @param workflowIds 工作流ID列表
   * @returns 删除的工作流数量
   */
  batchSoftDelete(workflowIds: ID[]): Promise<number>;

  /**
   * 恢复软删除的工作流
   * @param workflowId 工作流ID
   */
  restoreSoftDeleted(workflowId: ID): Promise<void>;

  /**
   * 查找软删除的工作流
   * @param options 查询选项
   * @returns 软删除的工作流列表
   */
  findSoftDeleted(options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 根据节点ID查找包含该节点的工作流
   * @param nodeId 节点ID
   * @param options 查询选项
   * @returns 工作流列表
   */
  findByNodeId(nodeId: ID, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 根据边ID查找包含该边的工作流
   * @param edgeId 边ID
   * @param options 查询选项
   * @returns 工作流列表
   */
  findByEdgeId(edgeId: ID, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 根据节点类型查找工作流
   * @param nodeType 节点类型
   * @param options 查询选项
   * @returns 工作流列表
   */
  findByNodeType(nodeType: NodeType, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 根据边类型查找工作流
   * @param edgeType 边类型
   * @param options 查询选项
   * @returns 工作流列表
   */
  findByEdgeType(edgeType: EdgeType, options?: WorkflowQueryOptions): Promise<Workflow[]>;

  /**
   * 获取工作流标签统计信息
   * @param options 查询选项
   * @returns 标签统计信息
   */
  getWorkflowTagStats(options?: WorkflowQueryOptions): Promise<Record<string, number>>;
}