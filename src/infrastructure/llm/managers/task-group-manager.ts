import { injectable, inject } from 'inversify';
import { ITaskGroupManager } from '../../../domain/llm/interfaces/task-group-manager.interface';
import { ConfigManager } from '../../common/config/config-manager.interface';
import { LLM_DI_IDENTIFIERS } from '../di-identifiers';

/**
 * 任务组管理器
 * 
 * 实现任务组管理的具体逻辑
 */
@injectable()
export class TaskGroupManager implements ITaskGroupManager {
  constructor(
    @inject(LLM_DI_IDENTIFIERS.ConfigManager) private configManager: ConfigManager
  ) {}

  /**
   * 获取组引用对应的模型列表
   */
  async getModelsForGroup(groupReference: string): Promise<string[]> {
    const [groupName, echelonOrTask] = this.parseGroupReference(groupReference);
    
    if (!groupName) {
      return [];
    }

    const taskGroup = await this.getTaskGroup(groupName);
    if (!taskGroup) {
      return [];
    }

    if (echelonOrTask) {
      const echelonConfig = await this.getEchelonConfig(groupName, echelonOrTask);
      if (echelonConfig) {
        return (echelonConfig['models'] as string[]) || [];
      }
    } else {
      // 如果没有指定层级，返回所有层级的模型
      const allModels: string[] = [];
      const echelons = (taskGroup['echelons'] as Record<string, any>) || {};
      
      for (const echelonConfig of Object.values(echelons)) {
        allModels.push(...((echelonConfig as any)['models'] as string[] || []));
      }
      
      return allModels;
    }
    
    return [];
  }

  /**
   * 解析组引用字符串
   */
  parseGroupReference(reference: string): [string, string | null] {
    const parts = reference.split('.');
    const groupName = parts[0] ?? '';
    const echelonOrTask = parts.length > 1 ? parts[1] ?? null : null;
    
    return [groupName, echelonOrTask];
  }

  /**
   * 获取降级组列表
   */
  async getFallbackGroups(groupReference: string): Promise<string[]> {
    const [groupName, echelonOrTask] = this.parseGroupReference(groupReference);
    
    if (!groupName) {
      return [];
    }

    const taskGroup = await this.getTaskGroup(groupName);
    if (!taskGroup) {
      return [];
    }

    // 优先使用任务组特定的降级配置
    const fallbackConfig = taskGroup['fallbackConfig'];
    if (fallbackConfig) {
      return fallbackConfig['fallbackGroups'] || [];
    }

    const fallbackGroups: string[] = [];

    // 根据降级策略生成降级组
    const fallbackStrategy = taskGroup['fallbackStrategy'] || 'echelon_down';
    if (fallbackStrategy === 'echelon_down' && echelonOrTask && echelonOrTask.startsWith('echelon')) {
      // 获取下一层级
      const echelonNum = parseInt(echelonOrTask.replace('echelon', ''));
      const nextEchelon = `echelon${echelonNum + 1}`;
      const nextEchelonConfig = await this.getEchelonConfig(groupName, nextEchelon);
      
      if (nextEchelonConfig) {
        fallbackGroups.push(`${groupName}.${nextEchelon}`);
      }
    }

    return fallbackGroups;
  }

  /**
   * 获取层级配置
   */
  async getEchelonConfig(groupName: string, echelonName: string): Promise<Record<string, any> | null> {
    const taskGroup = await this.getTaskGroup(groupName);
    if (!taskGroup) {
      return null;
    }

    const echelons = taskGroup['echelons'] || {};
    return echelons[echelonName] || null;
  }

  /**
   * 按优先级获取组的模型
   */
  async getGroupModelsByPriority(groupName: string): Promise<Array<[string, number, string[]]>> {
    const taskGroup = await this.getTaskGroup(groupName);
    if (!taskGroup) {
      return [];
    }

    const echelonList: Array<[string, number, string[]]> = [];
    const echelons = taskGroup['echelons'] || {};
    
    for (const [echelonName, echelonConfig] of Object.entries(echelons)) {
      const config = echelonConfig as Record<string, any>;
      echelonList.push([
        echelonName,
        config['priority'] || 999,
        config['models'] || []
      ]);
    }

    // 按优先级排序（数字越小优先级越高）
    echelonList.sort((a, b) => a[1] - b[1]);
    
    return echelonList;
  }

  /**
   * 列出所有任务组名称
   */
  async listTaskGroups(): Promise<string[]> {
    const llmConfig = await this.getLLMConfig();
    const taskGroups = llmConfig['taskGroups'] || {};
    
    return Object.keys(taskGroups);
  }

  /**
   * 验证组引用是否有效
   */
  async validateGroupReference(reference: string): Promise<boolean> {
    const [groupName, echelonOrTask] = this.parseGroupReference(reference);
    
    if (!groupName) {
      return false;
    }

    const taskGroup = await this.getTaskGroup(groupName);
    if (!taskGroup) {
      return false;
    }

    if (echelonOrTask) {
      const echelonConfig = await this.getEchelonConfig(groupName, echelonOrTask);
      return echelonConfig !== null;
    }

    return true;
  }

  /**
   * 获取任务组的降级配置
   */
  async getFallbackConfig(groupName: string): Promise<Record<string, any>> {
    const taskGroup = await this.getTaskGroup(groupName);
    if (!taskGroup) {
      return {};
    }

    const fallbackConfig = taskGroup['fallbackConfig'];
    if (fallbackConfig) {
      return {
        strategy: fallbackConfig['strategy'] || 'echelon_down',
        fallbackGroups: fallbackConfig['fallbackGroups'] || [],
        maxAttempts: fallbackConfig['maxAttempts'] || 3,
        retryDelay: fallbackConfig['retryDelay'] || 1.0,
        circuitBreaker: fallbackConfig['circuitBreaker'] ? {
          failureThreshold: fallbackConfig['circuitBreaker']['failureThreshold'] || 5,
          recoveryTime: fallbackConfig['circuitBreaker']['recoveryTime'] || 60,
          halfOpenRequests: fallbackConfig['circuitBreaker']['halfOpenRequests'] || 1
        } : null
      };
    }

    // 返回默认配置
    return {
      strategy: taskGroup['fallbackStrategy'] || 'echelon_down',
      fallbackGroups: await this.getFallbackGroups(`${groupName}.echelon1`),
      maxAttempts: 3,
      retryDelay: 1.0,
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTime: 60,
        halfOpenRequests: 1
      }
    };
  }

  /**
   * 获取轮询池的降级配置
   */
  async getPollingPoolFallbackConfig(poolName: string): Promise<Record<string, any>> {
    const pollingPool = await this.getPollingPool(poolName);
    if (!pollingPool) {
      return {};
    }

    const fallbackConfig = pollingPool['fallbackConfig'];
    if (fallbackConfig) {
      return {
        strategy: fallbackConfig['strategy'] || 'instance_rotation',
        maxInstanceAttempts: fallbackConfig['maxInstanceAttempts'] || 2
      };
    }

    // 返回默认配置
    return {
      strategy: 'instance_rotation',
      maxInstanceAttempts: 2
    };
  }

  /**
   * 获取全局降级配置
   */
  async getGlobalFallbackConfig(): Promise<Record<string, any>> {
    const llmConfig = await this.getLLMConfig();
    return llmConfig['globalFallback'] || {};
  }

  /**
   * 获取任务组配置
   */
  private async getTaskGroup(groupName: string): Promise<Record<string, any> | null> {
    const llmConfig = await this.getLLMConfig();
    const taskGroups = llmConfig['taskGroups'] || {};
    
    return taskGroups[groupName] || null;
  }

  /**
   * 获取轮询池配置
   */
  private async getPollingPool(poolName: string): Promise<Record<string, any> | null> {
    const llmConfig = await this.getLLMConfig();
    const pollingPools = llmConfig['pollingPools'] || {};
    
    return pollingPools[poolName] || null;
  }

  /**
   * 获取LLM配置
   */
  private async getLLMConfig(): Promise<Record<string, any>> {
    return (this.configManager.get<Record<string, any>>('llm') || {}) as Record<string, any>;
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
    const taskGroups = await this.listTaskGroups();
    const status: Record<string, any> = {};
    
    for (const groupName of taskGroups) {
      status[groupName] = await this.getTaskGroupStatus(groupName);
    }
    
    return status;
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(): Promise<void> {
    await this.configManager.reload();
  }

  /**
   * 获取配置状态
   */
  async getConfigStatus(): Promise<Record<string, any>> {
    const llmConfig = await this.getLLMConfig();
    
    return {
      loaded: true,
      taskGroupsCount: Object.keys(llmConfig['taskGroups'] || {}).length,
      pollingPoolsCount: Object.keys(llmConfig['pollingPools'] || {}).length,
      hasGlobalFallback: Object.keys(llmConfig['globalFallback'] || {}).length > 0,
      hasConcurrencyControl: Object.keys(llmConfig['concurrencyControl'] || {}).length > 0,
      hasRateLimiting: Object.keys(llmConfig['rateLimiting'] || {}).length > 0
    };
  }
}