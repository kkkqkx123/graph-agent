import { Repository } from '../../common/repositories/repository';
import { Workflow } from '../entities/workflow';
import { ID } from '../../common/value-objects/id';
import { WorkflowStatus } from '../value-objects/workflow-status';
import { WorkflowType } from '../value-objects/workflow-type';

/**
 * 工作流仓储接口
 *
 * 定义工作流持久化和查询的契约
 * 使用业务导向的方法，避免技术细节泄露
 */
export interface IWorkflowRepository extends Repository<Workflow, ID> {
  /**
   * 根据名称查找工作流
   * @param name 工作流名称
   * @returns 工作流列表
   */
  findByName(name: string): Promise<Workflow[]>;

  /**
   * 根据状态查找工作流
   * @param status 工作流状态
   * @returns 工作流列表
   */
  findByStatus(status: WorkflowStatus): Promise<Workflow[]>;

  /**
   * 根据类型查找工作流
   * @param type 工作流类型
   * @returns 工作流列表
   */
  findByType(type: WorkflowType): Promise<Workflow[]>;

  /**
   * 根据标签查找工作流
   * @param tags 标签列表
   * @returns 工作流列表
   */
  findByTags(tags: string[]): Promise<Workflow[]>;

  /**
   * 根据创建者查找工作流
   * @param createdBy 创建者ID
   * @returns 工作流列表
   */
  findByCreatedBy(createdBy: ID): Promise<Workflow[]>;

  /**
   * 查找草稿工作流
   * @returns 草稿工作流列表
   */
  findDraftWorkflows(): Promise<Workflow[]>;

  /**
   * 查找活跃工作流
   * @returns 活跃工作流列表
   */
  findActiveWorkflows(): Promise<Workflow[]>;

  /**
   * 查找非活跃工作流
   * @returns 非活跃工作流列表
   */
  findInactiveWorkflows(): Promise<Workflow[]>;

  /**
   * 查找归档工作流
   * @returns 归档工作流列表
   */
  findArchivedWorkflows(): Promise<Workflow[]>;

  /**
   * 根据名称搜索工作流
   * @param name 名称关键词
   * @returns 工作流列表
   */
  searchByName(name: string): Promise<Workflow[]>;

  /**
   * 根据描述搜索工作流
   * @param description 描述关键词
   * @returns 工作流列表
   */
  searchByDescription(description: string): Promise<Workflow[]>;

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
   * @returns 最活跃的工作流列表
   */
  getMostActiveWorkflows(limit: number): Promise<Workflow[]>;

  /**
   * 获取最近创建的工作流
   * @param limit 限制数量
   * @returns 最近创建的工作流列表
   */
  getRecentlyCreatedWorkflows(limit: number): Promise<Workflow[]>;

  /**
   * 获取最复杂的工作流（按节点和边数量）
   * @param limit 限制数量
   * @returns 最复杂的工作流列表
   */
  getMostComplexWorkflows(limit: number): Promise<Workflow[]>;

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
   * @returns 软删除的工作流列表
   */
  findSoftDeleted(): Promise<Workflow[]>;

  /**
   * 根据节点ID查找包含该节点的工作流
   * @param nodeId 节点ID
   * @returns 工作流列表
   */
  findByNodeId(nodeId: ID): Promise<Workflow[]>;

  /**
   * 根据边ID查找包含该边的工作流
   * @param edgeId 边ID
   * @returns 工作流列表
   */
  findByEdgeId(edgeId: ID): Promise<Workflow[]>;

  /**
   * 获取工作流标签统计信息
   * @returns 标签统计信息
   */
  getWorkflowTagStats(): Promise<Record<string, number>>;
}
