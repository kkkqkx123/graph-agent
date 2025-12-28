import { injectable, inject } from 'inversify';
import { TaskGroupManager } from '../../../infrastructure/llm/managers/task-group-manager';
import { TaskGroupNotFoundError } from '../../../domain/llm';

// 导入新的DTO
import {
  TaskGroupDto,
  TaskGroupCreateDto,
  TaskGroupUpdateDto,
  TaskGroupHealthReportDto,
  SystemTaskGroupReportDto,
  OptimalTaskGroupSelectionDto,
  ModelListDto,
  EchelonPriorityDto,
  TaskGroupConverter,
  type TaskGroupDTO,
  type TaskGroupCreateDTO,
  type TaskGroupUpdateDTO,
  type TaskGroupHealthReportDTO,
  type SystemTaskGroupReportDTO,
  type OptimalTaskGroupSelectionDTO,
  type ModelListDTO,
  type EchelonPriorityDTO,
  type GroupReferenceParseDTO,
  type FallbackConfigDTO
} from '../dtos/llm.dto';

import { DtoValidationError } from '../../common/dto/base-dto';

/**
 * 任务组服务
 *
 * 提供任务组管理的应用层服务
 */
@injectable()
export class TaskGroupService {
  private taskGroupDto: TaskGroupDto;
  private taskGroupCreateDto: TaskGroupCreateDto;
  private taskGroupUpdateDto: TaskGroupUpdateDto;
  private taskGroupHealthReportDto: TaskGroupHealthReportDto;
  private systemTaskGroupReportDto: SystemTaskGroupReportDto;
  private optimalTaskGroupSelectionDto: OptimalTaskGroupSelectionDto;
  private modelListDto: ModelListDto;
  private echelonPriorityDto: EchelonPriorityDto;
  private taskGroupConverter: TaskGroupConverter;

  constructor(
    @inject('TaskGroupManager') private taskGroupManager: TaskGroupManager
  ) {
    // 初始化DTO实例
    this.taskGroupDto = new TaskGroupDto();
    this.taskGroupCreateDto = new TaskGroupCreateDto();
    this.taskGroupUpdateDto = new TaskGroupUpdateDto();
    this.taskGroupHealthReportDto = new TaskGroupHealthReportDto();
    this.systemTaskGroupReportDto = new SystemTaskGroupReportDto();
    this.optimalTaskGroupSelectionDto = new OptimalTaskGroupSelectionDto();
    this.modelListDto = new ModelListDto();
    this.echelonPriorityDto = new EchelonPriorityDto();
    this.taskGroupConverter = new TaskGroupConverter();
  }

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
   * 获取任务组（DTO）
   */
  async getTaskGroupWithDto(groupName: string): Promise<TaskGroupDTO | null> {
    try {
      const config = await this.getTaskGroup(groupName);
      const status = await this.getTaskGroupStatus(groupName);

      const taskGroup = {
        name: groupName,
        config: config,
        status: status,
        statistics: await this.getTaskGroupStatistics(groupName)
      };

      return this.taskGroupConverter.toDto(taskGroup);
    } catch (error) {
      return null;
    }
  }

  /**
   * 创建任务组（DTO）
   */
  async createTaskGroup(request: unknown): Promise<TaskGroupDTO> {
    try {
      // 验证创建请求
      const validatedRequest = this.taskGroupCreateDto.validate(request);

      // 创建任务组（简化实现）
      const taskGroup = {
        name: validatedRequest.name,
        config: validatedRequest.config,
        status: {
          totalEchelons: Object.keys(validatedRequest.echelons).length,
          totalModels: Object.values(validatedRequest.echelons).reduce(
            (sum, echelon: any) => sum + echelon.models.length, 0
          ),
          available: true,
          echelons: Object.entries(validatedRequest.echelons).map(([name, echelon]) => ({
            name,
            priority: (echelon as any).priority,
            modelCount: (echelon as any).models.length,
            available: (echelon as any).models.length > 0,
            models: (echelon as any).models
          })),
          lastChecked: new Date().toISOString()
        },
        statistics: {
          name: validatedRequest.name,
          totalEchelons: Object.keys(validatedRequest.echelons).length,
          totalModels: Object.values(validatedRequest.echelons).reduce(
            (sum, echelon: any) => sum + echelon.models.length, 0
          ),
          availabilityRate: 1.0,
          echelonDistribution: Object.entries(validatedRequest.echelons).reduce(
            (dist, [name, echelon]) => {
              dist[name] = {
                priority: (echelon as any).priority,
                modelCount: (echelon as any).models.length,
                availability: (echelon as any).models.length > 0
              };
              return dist;
            }, {} as Record<string, any>)
        }
      };

      return this.taskGroupConverter.toDto(taskGroup);
    } catch (error) {
      if (error instanceof DtoValidationError) {
        throw new Error(`无效的创建请求: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 更新任务组（DTO）
   */
  async updateTaskGroup(groupName: string, request: unknown): Promise<TaskGroupDTO> {
    try {
      // 验证更新请求
      const validatedRequest = this.taskGroupUpdateDto.validate(request);

      // 获取现有任务组
      const existingTaskGroup = await this.getTaskGroupWithDto(groupName);
      if (!existingTaskGroup) {
        throw new TaskGroupNotFoundError(groupName);
      }

      // 更新任务组（简化实现）
      const updatedTaskGroup = {
        ...existingTaskGroup,
        config: validatedRequest.config || existingTaskGroup.config,
        echelons: validatedRequest.echelons || existingTaskGroup.status.echelons
      };

      return this.taskGroupConverter.toDto(updatedTaskGroup);
    } catch (error) {
      if (error instanceof DtoValidationError) {
        throw new Error(`无效的更新请求: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 解析组引用（DTO）
   */
  async parseGroupReference(reference: string): Promise<GroupReferenceParseDTO> {
    const [groupName, echelonOrTask] = this.taskGroupManager.parseGroupReference(reference);

    const result = {
      groupName,
      echelonOrTask,
      isValid: await this.taskGroupManager.validateGroupReference(reference),
      fullReference: reference
    };

    return result;
  }

  /**
   * 获取组引用对应的模型列表（DTO）
   */
  async getModelsForGroup(groupReference: string): Promise<ModelListDTO> {
    const models = await this.taskGroupManager.getModelsForGroup(groupReference);

    const modelList = {
      models,
      totalCount: models.length,
      availableCount: models.length, // 简化实现
      unavailableCount: 0
    };

    return this.modelListDto.validate(modelList);
  }

  /**
   * 获取降级组列表
   */
  async getFallbackGroups(groupReference: string): Promise<string[]> {
    return this.taskGroupManager.getFallbackGroups(groupReference);
  }

  /**
   * 按优先级获取组的模型（DTO）
   */
  async getGroupModelsByPriority(groupName: string): Promise<EchelonPriorityDto[]> {
    const modelsByPriority = await this.taskGroupManager.getGroupModelsByPriority(groupName);

    return modelsByPriority.map(([echelonName, priority, models]) => {
      const echelonPriority = {
        echelonName,
        priority,
        models
      };
      return this.echelonPriorityDto.validate(echelonPriority) as any;
    });
  }

  /**
   * 获取任务组状态
   */
  async getTaskGroupStatus(groupName: string): Promise<Record<string, any>> {
    const modelsByPriorityData = await this.taskGroupManager.getGroupModelsByPriority(groupName);

    return {
      name: groupName,
      totalEchelons: modelsByPriorityData.length,
      totalModels: modelsByPriorityData.reduce((sum, [, , models]) => sum + models.length, 0),
      echelons: modelsByPriorityData.map(([echelonName, priority, models]) => ({
        name: echelonName,
        priority,
        modelCount: models.length,
        available: models.length > 0
      })),
      available: modelsByPriorityData.length > 0
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
   * 获取任务组降级配置（DTO）
   */
  async getFallbackConfig(groupName: string): Promise<FallbackConfigDTO> {
    const config = await this.taskGroupManager.getFallbackConfig(groupName);

    return {
      strategy: (config as any)['strategy'] || 'sequential',
      fallbackGroups: (config as any)['fallbackGroups'] || [],
      maxAttempts: (config as any)['maxAttempts'] || 3,
      retryDelay: (config as any)['retryDelay'] || 1000,
      circuitBreaker: (config as any)['circuitBreaker']
    };
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
   * 获取系统级任务组报告（DTO）
   */
  async getSystemTaskGroupReport(): Promise<SystemTaskGroupReportDTO> {
    const allStatus = await this.getAllTaskGroupsStatus();
    const totalGroups = Object.keys(allStatus).length;
    const totalModels = Object.values(allStatus).reduce(
      (sum, status) => sum + status['totalModels'], 0
    );

    const groups: Record<string, any> = {};
    for (const [groupName, status] of Object.entries(allStatus)) {
      groups[groupName] = await this.getTaskGroupStatistics(groupName);
    }

    const report = {
      totalGroups,
      totalModels,
      groups,
      timestamp: new Date().toISOString()
    };

    return this.systemTaskGroupReportDto.validate(report);
  }

  /**
   * 获取最优任务组选择（DTO）
   */
  async getOptimalTaskGroup(requirements: Record<string, any>): Promise<OptimalTaskGroupSelectionDTO> {
    const taskGroups = await this.taskGroupManager.listTaskGroups();

    // 简化实现：返回第一个可用的任务组
    let selectedGroup: string | null = null;
    const alternatives: string[] = [];

    for (const groupName of taskGroups) {
      if (await this.isTaskGroupAvailable(groupName)) {
        if (!selectedGroup) {
          selectedGroup = groupName;
        } else {
          alternatives.push(groupName);
        }
      }
    }

    const selection = {
      selectedGroup,
      alternatives,
      selectionCriteria: requirements,
      confidence: selectedGroup ? 0.8 : 0.0
    };

    return this.optimalTaskGroupSelectionDto.validate(selection);
  }

  /**
   * 获取任务组健康报告（DTO）
   */
  async getTaskGroupHealthReport(groupName: string): Promise<TaskGroupHealthReportDTO> {
    const status = await this.getTaskGroupStatus(groupName);
    const statistics = await this.getTaskGroupStatistics(groupName);

    const report = {
      groupName,
      status: 'healthy' as const, // 简化实现
      issues: [],
      recommendations: [],
      statistics,
      lastChecked: new Date().toISOString()
    };

    return this.taskGroupHealthReportDto.validate(report);
  }
}