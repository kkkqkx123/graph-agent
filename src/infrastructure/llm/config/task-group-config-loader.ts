import { injectable, inject } from 'inversify';
import { ConfigManager } from '../../common/config/config-manager.interface';

/**
 * 任务组配置加载器
 * 
 * 负责加载和验证任务组配置
 */
@injectable()
export class TaskGroupConfigLoader {
  constructor(
    @inject('ConfigManager') private configManager: ConfigManager
  ) {}

  /**
   * 加载任务组配置
   */
  async loadTaskGroupConfig(groupName: string): Promise<Record<string, any>> {
    const llmConfig = this.configManager.getConfigStructure();
    const taskGroups = llmConfig['taskGroups'] || {};
    
    const groupConfig = taskGroups[groupName];
    if (!groupConfig) {
      throw new Error(`任务组配置不存在: ${groupName}`);
    }

    // 验证配置
    this.validateTaskGroupConfig(groupName, groupConfig);

    // 合并默认配置
    return this.mergeWithDefaultConfig(groupConfig);
  }

  /**
   * 加载所有任务组配置
   */
  async loadAllTaskGroupConfigs(): Promise<Record<string, any>> {
    const llmConfig = this.configManager.getConfigStructure();
    const taskGroups = llmConfig['taskGroups'] || {};
    
    const validatedConfigs: Record<string, any> = {};

    for (const [groupName, groupConfig] of Object.entries(taskGroups)) {
      try {
        this.validateTaskGroupConfig(groupName, groupConfig as Record<string, any>);
        validatedConfigs[groupName] = this.mergeWithDefaultConfig(groupConfig as Record<string, any>);
      } catch (error) {
        console.warn(`任务组配置验证失败 ${groupName}:`, error);
      }
    }

    return validatedConfigs;
  }

  /**
   * 验证任务组配置
   */
  private validateTaskGroupConfig(groupName: string, config: Record<string, any>): void {
    const requiredFields = ['name'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`任务组配置缺少必需字段: ${field}`);
      }
    }

    // 验证层级配置
    const echelons = this.extractEchelons(config);
    if (Object.keys(echelons).length === 0) {
      throw new Error(`任务组 ${groupName} 必须配置至少一个层级`);
    }

    // 验证每个层级配置
    for (const [echelonName, echelonConfig] of Object.entries(echelons)) {
      this.validateEchelonConfig(groupName, echelonName, echelonConfig as Record<string, any>);
    }

    // 验证降级配置
    const fallbackConfig = config['fallbackConfig'] || {};
    if (fallbackConfig['strategy']) {
      const validStrategies = ['echelon_down', 'pool_fallback', 'global_fallback'];
      if (!validStrategies.includes(fallbackConfig['strategy'])) {
        throw new Error(`不支持的降级策略: ${fallbackConfig['strategy']}`);
      }
    }
  }

  /**
   * 提取层级配置
   */
  private extractEchelons(config: Record<string, any>): Record<string, any> {
    const echelons: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(config)) {
      if (key.startsWith('echelon') && typeof value === 'object' && value !== null) {
        echelons[key] = value;
      }
    }
    
    return echelons;
  }

  /**
   * 验证层级配置
   */
  private validateEchelonConfig(groupName: string, echelonName: string, config: Record<string, any>): void {
    const requiredFields = ['priority', 'models'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`层级配置 ${groupName}.${echelonName} 缺少必需字段: ${field}`);
      }
    }

    // 验证优先级
    const priority = config['priority'];
    if (typeof priority !== 'number' || priority < 0) {
      throw new Error(`层级 ${groupName}.${echelonName} 的优先级必须是正数`);
    }

    // 验证模型列表
    const models = config['models'] || [];
    if (!Array.isArray(models) || models.length === 0) {
      throw new Error(`层级 ${groupName}.${echelonName} 必须配置至少一个模型`);
    }

    for (const model of models) {
      if (typeof model !== 'string') {
        throw new Error(`层级 ${groupName}.${echelonName} 的模型名称必须是字符串`);
      }
    }
  }

  /**
   * 合并默认配置
   */
  private mergeWithDefaultConfig(config: Record<string, any>): Record<string, any> {
    const defaultConfig = {
      fallbackStrategy: 'echelon_down',
      maxAttempts: 3,
      retryDelay: 1.0,
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTime: 60,
        halfOpenRequests: 1
      }
    };

    return this.deepMerge(defaultConfig, config);
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(target[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * 检查是否为对象
   */
  private isObject(value: any): boolean {
    return value && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * 获取任务组配置状态
   */
  async getTaskGroupConfigStatus(): Promise<Record<string, any>> {
    const llmConfig = this.configManager.getConfigStructure();
    const taskGroups = llmConfig['taskGroups'] || {};
    
    const status: Record<string, any> = {
      totalGroups: Object.keys(taskGroups).length,
      validGroups: 0,
      invalidGroups: 0,
      groups: {}
    };

    for (const [groupName, groupConfig] of Object.entries(taskGroups)) {
      try {
        this.validateTaskGroupConfig(groupName, groupConfig as Record<string, any>);
        status['groups'][groupName] = {
          valid: true,
          echelonCount: Object.keys(this.extractEchelons(groupConfig as Record<string, any>)).length,
          totalModels: this.calculateTotalModels(groupConfig as Record<string, any>),
          hasFallbackConfig: !!(groupConfig as any)['fallbackConfig']
        };
        status['validGroups']++;
      } catch (error) {
        status['groups'][groupName] = {
          valid: false,
          error: error instanceof Error ? error.message : String(error)
        };
        status['invalidGroups']++;
      }
    }

    return status;
  }

  /**
   * 计算总模型数
   */
  private calculateTotalModels(groupConfig: Record<string, any>): number {
    const echelons = this.extractEchelons(groupConfig);
    let totalModels = 0;

    for (const echelonConfig of Object.values(echelons)) {
      const models = (echelonConfig as any)['models'] || [];
      totalModels += models.length;
    }

    return totalModels;
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(): Promise<void> {
    await this.configManager.reload();
  }

  /**
   * 获取配置变更历史
   */
  async getConfigChangeHistory(): Promise<any[]> {
    // TODO: 实现配置变更历史记录
    return [];
  }

  /**
   * 验证配置语法
   */
  async validateConfigSyntax(config: Record<string, any>): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 验证顶层结构
      if (!config['taskGroups']) {
        warnings.push('配置缺少 taskGroups 字段');
      }

      // 验证每个任务组配置
      const taskGroups = config['taskGroups'] || {};
      for (const [groupName, groupConfig] of Object.entries(taskGroups)) {
        try {
          this.validateTaskGroupConfig(groupName, groupConfig as Record<string, any>);
        } catch (error) {
          errors.push(`任务组 ${groupName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`配置语法验证失败: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  /**
   * 获取层级配置
   */
  async getEchelonConfig(groupName: string, echelonName: string): Promise<Record<string, any> | null> {
    try {
      const groupConfig = await this.loadTaskGroupConfig(groupName);
      const echelons = this.extractEchelons(groupConfig);
      return echelons[echelonName] || null;
    } catch {
      return null;
    }
  }

  /**
   * 获取按优先级排序的层级列表
   */
  async getEchelonsByPriority(groupName: string): Promise<Array<[string, number, string[]]>> {
    try {
      const groupConfig = await this.loadTaskGroupConfig(groupName);
      const echelons = this.extractEchelons(groupConfig);
      
      const echelonList: Array<[string, number, string[]]> = [];
      
      for (const [echelonName, echelonConfig] of Object.entries(echelons)) {
        echelonList.push([
          echelonName,
          (echelonConfig as any)['priority'] || 999,
          (echelonConfig as any)['models'] || []
        ]);
      }

      // 按优先级排序（数字越小优先级越高）
      echelonList.sort((a, b) => a[1] - b[1]);
      
      return echelonList;
    } catch {
      return [];
    }
  }

  /**
   * 获取任务组统计信息
   */
  async getTaskGroupStatistics(groupName: string): Promise<Record<string, any>> {
    try {
      const echelons = await this.getEchelonsByPriority(groupName);
      
      return {
        name: groupName,
        totalEchelons: echelons.length,
        totalModels: echelons.reduce((sum, [, , models]) => sum + models.length, 0),
        echelons: echelons.map(([name, priority, models]) => ({
          name,
          priority,
          modelCount: models.length,
          available: models.length > 0
        }))
      };
    } catch {
      return {
        name: groupName,
        totalEchelons: 0,
        totalModels: 0,
        echelons: []
      };
    }
  }
}