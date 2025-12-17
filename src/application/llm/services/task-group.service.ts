import { 
  ILLMTaskGroupManager, 
  TaskGroupConfig, 
  EchelonConfig 
} from '../../../domain/llm/interfaces/task-group-manager.interface';
import { TaskGroup, TaskGroupId } from '../../../domain/llm/entities/task-group';
import { 
  TaskGroupNotFoundException, 
  TaskGroupAlreadyExistsException,
  TaskGroupConfigurationException,
  EchelonNotFoundException
} from '../../../domain/llm/exceptions';
import { ILogger } from '@shared/types/logger';

/**
 * 任务组服务接口
 */
export interface ITaskGroupService extends ILLMTaskGroupManager {
  getAllTaskGroups(): Promise<TaskGroup[]>;
  updateTaskGroupConfig(groupName: string, config: Partial<TaskGroupConfig>): Promise<TaskGroup>;
  deleteTaskGroup(groupName: string): Promise<boolean>;
  getTaskGroupStatistics(groupName: string): Promise<TaskGroupStatistics>;
  globalHealthCheck(): Promise<Record<string, TaskGroupHealthStatus>>;
}

/**
 * 任务组服务实现
 * 
 * 提供任务组的业务逻辑管理
 */
export class TaskGroupService implements ITaskGroupService {
  private readonly taskGroups: Map<string, TaskGroup> = new Map();

  constructor(
    private readonly logger: ILogger
  ) {
    this.logger = logger.child({ service: 'TaskGroupService' });
  }

  /**
   * 获取任务组
   */
  public async getTaskGroup(groupName: string): Promise<TaskGroup | null> {
    const taskGroup = this.taskGroups.get(groupName);
    return taskGroup || null;
  }

  /**
   * 创建任务组
   */
  public async createTaskGroup(groupConfig: TaskGroupConfig): Promise<TaskGroup> {
    this.logger.info('创建任务组', { groupName: groupConfig.name });

    // 检查任务组是否已存在
    if (this.taskGroups.has(groupConfig.name)) {
      throw new TaskGroupAlreadyExistsException(groupConfig.name);
    }

    // 验证配置
    this.validateTaskGroupConfig(groupConfig);

    // 创建任务组实例
    const taskGroup = TaskGroup.create(groupConfig);

    // 保存任务组
    this.taskGroups.set(groupConfig.name, taskGroup);

    this.logger.info('任务组创建成功', { 
      groupName: groupConfig.name,
      echelonCount: Object.keys(groupConfig.echelons).length
    });

    return taskGroup;
  }

  /**
   * 获取组中的模型列表
   */
  public async getModelsForGroup(groupName: string, echelon?: string): Promise<string[]> {
    const taskGroup = await this.getTaskGroup(groupName);
    if (!taskGroup) {
      throw new TaskGroupNotFoundException(groupName);
    }

    if (echelon) {
      return taskGroup.getModelsForEchelon(echelon);
    }

    return taskGroup.getAvailableModels();
  }

  /**
   * 解析组引用
   */
  public parseGroupReference(reference: string): [string, string] | null {
    // 支持格式：group_name 或 group_name.echelon_name
    const parts = reference.split('.');
    
    if (parts.length === 1) {
      return [parts[0], ''];
    } else if (parts.length === 2) {
      return [parts[0], parts[1]];
    }

    return null;
  }

  /**
   * 获取层级配置
   */
  public async getEchelonConfig(groupName: string, echelon: string): Promise<EchelonConfig | null> {
    const taskGroup = await this.getTaskGroup(groupName);
    if (!taskGroup) {
      throw new TaskGroupNotFoundException(groupName);
    }

    const echelonEntity = taskGroup.getEchelon(echelon);
    if (!echelonEntity) {
      throw new EchelonNotFoundException(groupName, echelon);
    }

    // 将实体转换为配置对象
    return {
      models: echelonEntity.getModels(),
      concurrencyLimit: echelonEntity.getConcurrencyLimit(),
      rpmLimit: echelonEntity.getRpmLimit(),
      priority: echelonEntity.getPriority(),
      timeout: echelonEntity.getTimeout(),
      maxRetries: echelonEntity.getMaxRetries(),
      temperature: echelonEntity.getTemperature(),
      maxTokens: echelonEntity.getMaxTokens(),
      modelType: echelonEntity.getModelType(),
      apiKey: echelonEntity.getApiKey(),
      baseUrl: echelonEntity.getBaseUrl(),
      functionCalling: echelonEntity.getFunctionCalling()
    };
  }

  /**
   * 获取降级组列表
   */
  public async getFallbackGroups(groupName: string): Promise<string[]> {
    const taskGroup = await this.getTaskGroup(groupName);
    if (!taskGroup) {
      throw new TaskGroupNotFoundException(groupName);
    }

    return taskGroup.getFallbackConfig().fallbackGroups;
  }

  /**
   * 获取所有任务组
   */
  public async getAllTaskGroups(): Promise<TaskGroup[]> {
    return Array.from(this.taskGroups.values());
  }

  /**
   * 更新任务组配置
   */
  public async updateTaskGroupConfig(groupName: string, config: Partial<TaskGroupConfig>): Promise<TaskGroup> {
    const existingTaskGroup = await this.getTaskGroup(groupName);
    if (!existingTaskGroup) {
      throw new TaskGroupNotFoundException(groupName);
    }

    this.logger.info('更新任务组配置', { groupName });

    // 创建新的任务组配置
    const currentConfig = this.extractConfigFromTaskGroup(existingTaskGroup);
    const newConfig = { ...currentConfig, ...config };

    // 验证新配置
    this.validateTaskGroupConfig(newConfig);

    // 创建新任务组实例
    const newTaskGroup = existingTaskGroup.updateConfig(config);

    // 更新任务组
    this.taskGroups.set(groupName, newTaskGroup);

    this.logger.info('任务组配置更新成功', { groupName });

    return newTaskGroup;
  }

  /**
   * 删除任务组
   */
  public async deleteTaskGroup(groupName: string): Promise<boolean> {
    const taskGroup = this.taskGroups.get(groupName);
    if (!taskGroup) {
      return false;
    }

    this.logger.info('删除任务组', { groupName });

    // 从映射中移除
    this.taskGroups.delete(groupName);

    this.logger.info('任务组删除成功', { groupName });

    return true;
  }

  /**
   * 获取任务组统计信息
   */
  public async getTaskGroupStatistics(groupName: string): Promise<TaskGroupStatistics> {
    const taskGroup = await this.getTaskGroup(groupName);
    if (!taskGroup) {
      throw new TaskGroupNotFoundException(groupName);
    }

    return taskGroup.getStatistics();
  }

  /**
   * 执行全局健康检查
   */
  public async globalHealthCheck(): Promise<Record<string, TaskGroupHealthStatus>> {
    const results: Record<string, TaskGroupHealthStatus> = {};

    for (const [groupName, taskGroup] of this.taskGroups.entries()) {
      try {
        const stats = taskGroup.getStatistics();
        results[groupName] = {
          healthy: stats.activeEchelons > 0,
          activeEchelons: stats.activeEchelons,
          totalEchelons: stats.totalEchelons,
          lastExecution: stats.lastExecution,
          executionCount: stats.executionCount,
          circuitBreakerState: stats.circuitBreakerState,
          errors: []
        };
      } catch (error) {
        this.logger.error('任务组健康检查失败', error as Error, { groupName });
        results[groupName] = {
          healthy: false,
          activeEchelons: 0,
          totalEchelons: 0,
          lastExecution: null,
          executionCount: 0,
          circuitBreakerState: 'open',
          errors: [(error as Error).message]
        };
      }
    }

    return results;
  }

  /**
   * 获取所有任务组的统计信息
   */
  public async getAllTaskGroupStatistics(): Promise<Record<string, TaskGroupStatistics>> {
    const results: Record<string, TaskGroupStatistics> = {};

    for (const [groupName, taskGroup] of this.taskGroups.entries()) {
      try {
        results[groupName] = taskGroup.getStatistics();
      } catch (error) {
        this.logger.error('获取任务组统计信息失败', error as Error, { groupName });
      }
    }

    return results;
  }

  /**
   * 重置任务组统计信息
   */
  public async resetTaskGroupStatistics(groupName: string): Promise<void> {
    const taskGroup = await this.getTaskGroup(groupName);
    if (!taskGroup) {
      throw new TaskGroupNotFoundException(groupName);
    }

    // 这里应该重置任务组的统计信息
    // 暂时跳过具体实现
    this.logger.info('重置任务组统计信息', { groupName });
  }

  /**
   * 重置所有任务组的统计信息
   */
  public async resetAllTaskGroupStatistics(): Promise<void> {
    for (const groupName of this.taskGroups.keys()) {
      try {
        await this.resetTaskGroupStatistics(groupName);
      } catch (error) {
        this.logger.error('重置任务组统计信息失败', error as Error, { groupName });
      }
    }
  }

  /**
   * 关闭服务
   */
  public async shutdown(): Promise<void> {
    this.logger.info('关闭任务组服务');

    // 清理所有任务组
    this.taskGroups.clear();

    this.logger.info('任务组服务已关闭');
  }

  private validateTaskGroupConfig(config: TaskGroupConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new TaskGroupConfigurationException('任务组名称不能为空');
    }

    if (!config.echelons || Object.keys(config.echelons).length === 0) {
      throw new TaskGroupConfigurationException('任务组必须包含至少一个层级');
    }

    // 验证每个层级配置
    for (const [echelonName, echelonConfig] of Object.entries(config.echelons)) {
      this.validateEchelonConfig(echelonName, echelonConfig);
    }

    // 验证降级策略
    if (!config.fallbackStrategy || !config.fallbackStrategy.type) {
      throw new TaskGroupConfigurationException('降级策略配置无效');
    }

    // 验证熔断器配置
    if (!config.circuitBreaker) {
      throw new TaskGroupConfigurationException('熔断器配置无效');
    }

    if (config.circuitBreaker.failureThreshold <= 0) {
      throw new TaskGroupConfigurationException('熔断器故障阈值必须大于0');
    }

    if (config.circuitBreaker.recoveryTime <= 0) {
      throw new TaskGroupConfigurationException('熔断器恢复时间必须大于0');
    }

    if (config.circuitBreaker.halfOpenRequests <= 0) {
      throw new TaskGroupConfigurationException('熔断器半开请求数必须大于0');
    }
  }

  private validateEchelonConfig(echelonName: string, config: EchelonConfig): void {
    if (!config.models || config.models.length === 0) {
      throw new TaskGroupConfigurationException(`层级 ${echelonName} 必须包含至少一个模型`);
    }

    if (config.concurrencyLimit <= 0) {
      throw new TaskGroupConfigurationException(`层级 ${echelonName} 并发限制必须大于0`);
    }

    if (config.rpmLimit <= 0) {
      throw new TaskGroupConfigurationException(`层级 ${echelonName} RPM限制必须大于0`);
    }

    if (config.priority <= 0) {
      throw new TaskGroupConfigurationException(`层级 ${echelonName} 优先级必须大于0`);
    }

    if (config.timeout <= 0) {
      throw new TaskGroupConfigurationException(`层级 ${echelonName} 超时时间必须大于0`);
    }

    if (config.maxRetries < 0) {
      throw new TaskGroupConfigurationException(`层级 ${echelonName} 最大重试次数不能为负数`);
    }

    if (config.temperature < 0 || config.temperature > 2) {
      throw new TaskGroupConfigurationException(`层级 ${echelonName} 温度参数必须在0到2之间`);
    }

    if (config.maxTokens <= 0) {
      throw new TaskGroupConfigurationException(`层级 ${echelonName} 最大Token数必须大于0`);
    }
  }

  private extractConfigFromTaskGroup(taskGroup: TaskGroup): TaskGroupConfig {
    const echelons: Record<string, EchelonConfig> = {};
    
    for (const [echelonName, echelon] of taskGroup.getEchelons().entries()) {
      echelons[echelonName] = {
        models: echelon.getModels(),
        concurrencyLimit: echelon.getConcurrencyLimit(),
        rpmLimit: echelon.getRpmLimit(),
        priority: echelon.getPriority(),
        timeout: echelon.getTimeout(),
        maxRetries: echelon.getMaxRetries(),
        temperature: echelon.getTemperature(),
        maxTokens: echelon.getMaxTokens(),
        modelType: echelon.getModelType(),
        apiKey: echelon.getApiKey(),
        baseUrl: echelon.getBaseUrl(),
        functionCalling: echelon.getFunctionCalling()
      };
    }

    return {
      name: taskGroup.getName(),
      description: taskGroup.getDescription(),
      echelons,
      fallbackStrategy: taskGroup.getFallbackStrategy(),
      circuitBreaker: taskGroup.getCircuitBreaker().getConfig(),
      fallbackConfig: taskGroup.getFallbackConfig()
    };
  }
}

/**
 * 任务组健康状态接口
 */
export interface TaskGroupHealthStatus {
  healthy: boolean;
  activeEchelons: number;
  totalEchelons: number;
  lastExecution: Date | null;
  executionCount: number;
  circuitBreakerState: string;
  errors: string[];
}

/**
 * 任务组统计信息接口
 */
export interface TaskGroupStatistics {
  groupName: string;
  status: string;
  totalEchelons: number;
  activeEchelons: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastExecution: Date | null;
  executionCount: number;
  circuitBreakerState: string;
  echelonStatistics: Array<{
    echelonName: string;
    models: string[];
    concurrencyLimit: number;
    currentConcurrency: number;
    rpmLimit: number;
    currentRpm: number;
    isAvailable: boolean;
    statistics: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
    };
  }>;
}