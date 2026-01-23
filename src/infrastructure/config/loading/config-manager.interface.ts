/**
 * 配置管理器接口
 *
 * 简化后的配置管理接口，仅提供核心功能
 * 符合依赖倒置原则，高层模块依赖此接口而非具体实现
 */

/**
 * 配置读取器接口
 * 提供配置值的只读访问
 */
export interface IConfigReader {
  /**
   * 获取配置值
   *
   * @template T - 返回值的类型
   * @param key - 配置键，支持点号分隔的嵌套路径（如 'llm.rateLimit.capacity'）
   * @param defaultValue - 默认值，当配置不存在时返回
   * @returns 配置值或默认值
   *
   * @example
   * ```typescript
   * const capacity = configManager.get<number>('llm.rateLimit.capacity', 100);
   * const enabled = configManager.get<boolean>('llm.enabled', false);
   * ```
   */
  get<T = any>(key: string, defaultValue?: T): T;
}

/**
 * 配置管理器接口
 * 提供配置读取和刷新功能
 */
export interface IConfigManager extends IConfigReader {
  /**
   * 初始化配置管理器
   *
   * @param basePath - 配置文件基础路径
   *
   * @example
   * ```typescript
   * await configManager.initialize('./configs');
   * ```
   */
  initialize(basePath: string): Promise<void>;

  /**
   * 刷新配置
   *
   * 重新加载配置文件，清空缓存
   * 支持热更新，无需重启应用
   *
   * @example
   * ```typescript
   * await configManager.refresh();
   * ```
   */
  refresh(): Promise<void>;
}