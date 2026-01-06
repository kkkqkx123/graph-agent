import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { Echelon } from '../value-objects/echelon';
import { FallbackConfig } from '../interfaces/task-group-manager.interface';

/**
 * 任务组实体
 */
export class TaskGroup extends Entity {
  private echelons: Map<string, Echelon> = new Map();
  private fallbackConfig: FallbackConfig = {
    strategy: 'echelon_down',
    maxAttempts: 3,
    retryDelay: 1.0,
    fallbackGroups: [],
  };

  constructor(
    id: ID,
    public readonly name: string,
    public readonly config: Record<string, any>
  ) {
    super(id, Timestamp.now(), Timestamp.now(), Version.initial());
    this.initializeFromConfig();
  }

  /**
   * 验证任务组有效性
   */
  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('任务组名称不能为空');
    }
    if (!this.config || Object.keys(this.config).length === 0) {
      throw new Error('任务组配置不能为空');
    }
    if (this.echelons.size === 0) {
      throw new Error('任务组至少需要一个层级');
    }
  }

  /**
   * 从配置初始化任务组
   */
  private initializeFromConfig(): void {
    // 初始化层级
    const echelonsConfig = this.config['echelons'] || {};
    for (const [echelonName, echelonConfig] of Object.entries(echelonsConfig)) {
      const config = echelonConfig as Record<string, any>;
      const echelon = new Echelon(
        echelonName,
        config['priority'] || 999,
        config['models'] || [],
        config
      );
      this.echelons.set(echelonName, echelon);
    }

    // 初始化降级配置
    const fallbackConfigData = this.config['fallbackConfig'] || {
      strategy: 'echelon_down',
      maxAttempts: 3,
      retryDelay: 1.0,
    };
    this.fallbackConfig = {
      strategy: fallbackConfigData['strategy'] || 'echelon_down',
      maxAttempts: fallbackConfigData['maxAttempts'] || 3,
      retryDelay: fallbackConfigData['retryDelay'] || 1.0,
      fallbackGroups: fallbackConfigData['fallbackGroups'] || [],
    };
  }

  /**
   * 获取层级配置
   */
  getEchelonConfig(echelonName: string): Echelon | null {
    return this.echelons.get(echelonName) || null;
  }

  /**
   * 获取所有层级
   */
  getAllEchelons(): Echelon[] {
    return Array.from(this.echelons.values());
  }

  /**
   * 按优先级获取层级
   */
  getEchelonsByPriority(): Echelon[] {
    return Array.from(this.echelons.values()).sort((a, b) => a.comparePriority(b));
  }

  /**
   * 获取降级配置
   */
  getFallbackConfig(): FallbackConfig {
    return this.fallbackConfig;
  }

  /**
   * 获取降级组列表
   */
  getFallbackGroups(currentEchelon?: string): string[] {
    const fallbackGroups: string[] = [];
    const strategy = this.fallbackConfig.strategy;

    if (strategy === 'echelon_down' && currentEchelon) {
      // 获取下一层级
      const echelonNum = parseInt(currentEchelon.replace('echelon', ''));
      const nextEchelon = `echelon${echelonNum + 1}`;

      if (this.echelons.has(nextEchelon)) {
        fallbackGroups.push(`${this.name}.${nextEchelon}`);
      }
    }

    // 添加配置中指定的降级组
    if (this.fallbackConfig.fallbackGroups) {
      fallbackGroups.push(...this.fallbackConfig.fallbackGroups);
    }

    return fallbackGroups;
  }

  /**
   * 验证层级引用
   */
  validateEchelonReference(echelonName: string): boolean {
    return this.echelons.has(echelonName);
  }

  /**
   * 获取任务组状态
   */
  getStatus(): Record<string, any> {
    const totalModels = Array.from(this.echelons.values()).reduce(
      (sum, echelon) => sum + echelon.getModelCount(),
      0
    );

    return {
      name: this.name,
      totalEchelons: this.echelons.size,
      totalModels,
      echelons: Array.from(this.echelons.values()).map(echelon => ({
        name: echelon.name,
        priority: echelon.priority,
        modelCount: echelon.getModelCount(),
        available: echelon.isAvailable(),
      })),
    };
  }
}
