import { injectable, inject } from 'inversify';
import { ITaskGroupManager } from '../../../domain/llm/interfaces/task-group-manager.interface';
import { TaskGroupNotFoundError } from '../../../domain/llm/exceptions/task-group-exceptions';

/**
 * 任务组服务
 * 
 * 提供任务组管理的应用层服务
 */
@injectable()
export class TaskGroupService {
  constructor(
    @inject('ITaskGroupManager') private taskGroupManager: ITaskGroupManager
  ) {}

  /**
   * 获取任务组配置
   */
  async getTaskGroup(groupName: string): Promise<Record<string, any>> {
    const config = await this.taskGroupManager.getEchelonConfig(groupName, 'echelon1');
    
    if (!config) {
      throw new TaskGroupNotFoundError(groupName);
    }
    
    return config;
  }

  /**
   * 解析组引用
   */
  async parseGroupReference(reference: string): Promise<Record<string, any>> {
    const [groupName, echelonOrTask] = this.taskGroupManager.parseGroupReference(reference);
    
    return {
      groupName,
      echelonOrTask,
      isValid: await this.taskGroupManager.validateGroupReference(reference)
    };
  }

  /**
   * 获取组引用对应的模型列表
   */
  async getModelsForGroup(groupReference: string): Promise<string[]> {
    return this.taskGroupManager.getModelsForGroup(groupReference);
  }

  /**
   * 获取降级组列表
   */
  async getFallbackGroups(groupReference: string): Promise<string[]> {
    return this.taskGroupManager.getFallbackGroups(groupReference);
  }

  /**
   * 按优先级获取组的模型
   */
  async getGroupModelsByPriority(groupName: string): Promise<Array<[string, number, string[]]>> {
    return this.taskGroupManager.getGroupModelsByPriority(groupName);
  }

  /**
   * 获取任务组状态
   */
  async getTaskGroupStatus(groupName: string): Promise<Record<string, any>> {
    const modelsByPriority = await this.getGroupModelsByPriority(groupName);
    
    return {
      name: groupName,
      totalEchelons: modelsByPriority.length,
      totalModels: modelsByPriority.reduce((sum, [, , models]) => sum + models.length, 0),
      echelons: modelsByPriority.map(([echelonName, priority, models]) => ({
        name: echelonName,
        priority,
        modelCount: models.length,
        available: models.length > 0
      })),
      available: modelsByPriority.length > 0
    };
  }

  /**
   * 获取所有任务组状态
   */
  async getAllTaskGroupsStatus(): Promise<Record<string, any>> {
    const taskGroups = await this.taskGroupManager.listTaskGroups();
    const status: Record<string, any> = {};
    
    for (const groupName of taskGroups) {
      status[groupName] = await this.getTaskGroupStatus(groupName);
    }
    
    return status;
  }

  /**
   * 检查任务组是否可用
   */
  async isTaskGroupAvailable(groupName: string): Promise<boolean> {
    try {
      const status = await this.getTaskGroupStatus(groupName);
      return status['available'];
    } catch {
      return false;
    }
  }

  /**
   * 获取任务组降级配置
   */
  async getFallbackConfig(groupName: string): Promise<Record<string, any>> {
    return this.taskGroupManager.getFallbackConfig(groupName);
  }

  /**
   * 获取轮询池降级配置
   */
  async getPollingPoolFallbackConfig(poolName: string): Promise<Record<string, any>> {
    return this.taskGroupManager.getPollingPoolFallbackConfig(poolName);
  }

  /**
   * 获取全局降级配置
   */
  async getGlobalFallbackConfig(): Promise<Record<string, any>> {
    return this.taskGroupManager.getGlobalFallbackConfig();
  }

  /**
   * 验证组引用
   */
  async validateGroupReference(reference: string): Promise<boolean> {
    return this.taskGroupManager.validateGroupReference(reference);
  }

  /**
   * 获取任务组统计信息
   */
  async getTaskGroupStatistics(groupName: string): Promise<Record<string, any>> {
    const status = await this.getTaskGroupStatus(groupName);
    
    return {
      name: groupName,
      totalEchelons: status['totalEchelons'],
      totalModels: status['totalModels'],
      availabilityRate: status['totalModels'] > 0 ? 1.0 : 0,
      echelonDistribution: status['echelons'].reduce((dist: Record<string, any>, echelon: any) => {
        dist[echelon.name] = {
          priority: echelon.priority,
          modelCount: echelon.modelCount,
          availability: echelon.available
        };
        return dist;
      }, {} as Record<string, any>)
    };
  }

  /**
   * 获取系统级任务组报告
   */
  async getSystemTaskGroupReport(): Promise<Record<string, any>> {
    const allStatus = await this.getAllTaskGroupsStatus();
    const totalGroups = Object.keys(allStatus).length;
    const totalModels = Object.values(allStatus).reduce(
      (sum, status) => sum + status['totalModels'], 0
    );
    
    return {
      totalGroups,
      totalModels,
      groups: allStatus,
      timestamp: new Date()
    };
  }

  /**
   * 获取最优任务组选择
   */
  async getOptimalTaskGroup(requirements: Record<string, any>): Promise<string | null> {
    const taskGroups = await this.taskGroupManager.listTaskGroups();
    
    // 简化实现：返回第一个可用的任务组
    for (const groupName of taskGroups) {
      if (await this.isTaskGroupAvailable(groupName)) {
        return groupName;
      }
    }
    
    return null;
  }

  /**
   * 获取任务组健康报告
   */
  async getTaskGroupHealthReport(groupName: string): Promise<Record<string, any>> {
    const status = await this.getTaskGroupStatus(groupName);
    const statistics = await this.getTaskGroupStatistics(groupName);
    
    return {
      groupName,
      status: 'healthy', // 简化实现
      issues: [],
      recommendations: [],
      statistics,
      lastChecked: new Date()
    };
  }
}