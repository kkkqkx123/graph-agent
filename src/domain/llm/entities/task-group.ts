import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';

/**
 * 任务组实体
 */
export class TaskGroup extends Entity {
  private echelons: Map<string, TaskGroupEchelon> = new Map();
  private fallbackConfig: Record<string, any> = {};

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
      const echelon = new TaskGroupEchelon(
        ID.generate(),
        echelonName,
        echelonConfig as Record<string, any>
      );
      this.echelons.set(echelonName, echelon);
    }

    // 初始化降级配置
    this.fallbackConfig = this.config['fallbackConfig'] || {
      strategy: 'echelon_down',
      maxAttempts: 3,
      retryDelay: 1.0
    };
  }

  /**
   * 获取层级配置
   */
  getEchelonConfig(echelonName: string): TaskGroupEchelon | null {
    return this.echelons.get(echelonName) || null;
  }

  /**
   * 获取所有层级
   */
  getAllEchelons(): TaskGroupEchelon[] {
    return Array.from(this.echelons.values());
  }

  /**
   * 按优先级获取层级
   */
  getEchelonsByPriority(): TaskGroupEchelon[] {
    return Array.from(this.echelons.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * 获取降级配置
   */
  getFallbackConfig(): Record<string, any> {
    return this.fallbackConfig;
  }

  /**
   * 获取降级组列表
   */
  getFallbackGroups(currentEchelon?: string): string[] {
    const fallbackGroups: string[] = [];
    const strategy = this.fallbackConfig['strategy'] || 'echelon_down';

    if (strategy === 'echelon_down' && currentEchelon) {
      // 获取下一层级
      const echelonNum = parseInt(currentEchelon.replace('echelon', ''));
      const nextEchelon = `echelon${echelonNum + 1}`;
      
      if (this.echelons.has(nextEchelon)) {
        fallbackGroups.push(`${this.name}.${nextEchelon}`);
      }
    }

    // 添加配置中指定的降级组
    const configuredGroups = this.fallbackConfig['fallbackGroups'] || [];
    fallbackGroups.push(...configuredGroups);

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
    const totalModels = Array.from(this.echelons.values())
      .reduce((sum, echelon) => sum + echelon.models.length, 0);

    return {
      name: this.name,
      totalEchelons: this.echelons.size,
      totalModels,
      echelons: Array.from(this.echelons.entries()).map(([name, echelon]) => ({
        name,
        priority: echelon.priority,
        modelCount: echelon.models.length
      }))
    };
  }
}

/**
 * 层级实体
 */
export class TaskGroupEchelon extends Entity {
  constructor(
    id: ID,
    public readonly name: string,
    public readonly config: Record<string, any>
  ) {
    super(id, Timestamp.now(), Timestamp.now(), Version.initial());
  }

  /**
   * 验证层级有效性
   */
  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('层级名称不能为空');
    }
    if (!this.config || Object.keys(this.config).length === 0) {
      throw new Error('层级配置不能为空');
    }
  }

  /**
   * 获取优先级
   */
  get priority(): number {
    return (this.config['priority'] as number) || 999;
  }

  /**
   * 获取模型列表
   */
  get models(): string[] {
    return (this.config['models'] as string[]) || [];
  }

  /**
   * 获取层级配置
   */
  getConfig(): Record<string, any> {
    return {
      name: this.name,
      priority: this.priority,
      models: this.models,
      ...this.config
    };
  }

  /**
   * 检查层级是否可用
   */
  isAvailable(): boolean {
    return this.models.length > 0;
  }

  /**
   * 获取层级状态
   */
  getStatus(): Record<string, any> {
    return {
      name: this.name,
      priority: this.priority,
      modelCount: this.models.length,
      available: this.isAvailable()
    };
  }
}