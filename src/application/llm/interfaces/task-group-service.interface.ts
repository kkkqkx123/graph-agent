import { 
  ILLMTaskGroupManager, 
  TaskGroupConfig, 
  EchelonConfig 
} from '../../../domain/llm/interfaces/task-group-manager.interface';
import { TaskGroup } from '../../../domain/llm/entities/task-group';
import { TaskGroupStatistics, TaskGroupHealthStatus } from '../services/task-group.service';

/**
 * 任务组服务接口
 * 
 * 扩展领域层的任务组管理器接口，添加应用层特定的功能
 */
export interface ITaskGroupService extends ILLMTaskGroupManager {
  /**
   * 获取所有任务组
   * @returns 任务组列表
   */
  getAllTaskGroups(): Promise<TaskGroup[]>;

  /**
   * 更新任务组配置
   * @param groupName 组名称
   * @param config 新配置
   * @returns 更新后的任务组
   */
  updateTaskGroupConfig(groupName: string, config: Partial<TaskGroupConfig>): Promise<TaskGroup>;

  /**
   * 删除任务组
   * @param groupName 组名称
   * @returns 是否成功
   */
  deleteTaskGroup(groupName: string): Promise<boolean>;

  /**
   * 获取任务组统计信息
   * @param groupName 组名称
   * @returns 统计信息
   */
  getTaskGroupStatistics(groupName: string): Promise<TaskGroupStatistics>;

  /**
   * 执行全局健康检查
   * @returns 所有任务组的健康状态
   */
  globalHealthCheck(): Promise<Record<string, TaskGroupHealthStatus>>;

  /**
   * 获取所有任务组的统计信息
   * @returns 所有任务组的统计信息
   */
  getAllTaskGroupStatistics(): Promise<Record<string, TaskGroupStatistics>>;

  /**
   * 重置任务组统计信息
   * @param groupName 组名称
   */
  resetTaskGroupStatistics(groupName: string): Promise<void>;

  /**
   * 重置所有任务组的统计信息
   */
  resetAllTaskGroupStatistics(): Promise<void>;

  /**
   * 关闭服务
   */
  shutdown(): Promise<void>;
}