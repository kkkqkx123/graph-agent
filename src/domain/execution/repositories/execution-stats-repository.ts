import { ID } from '../../common/value-objects/id';
import { ExecutionStats } from '../services/execution-stats-service';

/**
 * 执行统计仓储接口
 */
export interface ExecutionStatsRepository {
  /**
   * 保存执行统计
   * @param stats 执行统计
   * @returns 保存后的执行统计
   */
  save(stats: ExecutionStats): Promise<ExecutionStats>;

  /**
   * 根据ID查找执行统计
   * @param id 统计ID
   * @returns 执行统计或null
   */
  findById(id: ID): Promise<ExecutionStats | null>;

  /**
   * 根据工作流ID查找执行统计
   * @param workflowId 工作流ID
   * @returns 执行统计或null
   */
  findByWorkflowId(workflowId: ID): Promise<ExecutionStats | null>;

  /**
   * 检查工作流是否有执行统计
   * @param workflowId 工作流ID
   * @returns 是否存在
   */
  existsByWorkflowId(workflowId: ID): Promise<boolean>;

  /**
   * 根据工作流ID删除执行统计
   * @param workflowId 工作流ID
   * @returns 是否成功
   */
  deleteByWorkflowId(workflowId: ID): Promise<boolean>;
}