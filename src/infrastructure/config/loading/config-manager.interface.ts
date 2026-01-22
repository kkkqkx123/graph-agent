/**
 * 配置管理器接口
 * 
 * 定义配置管理的标准接口，提供类型安全的配置访问
 * 符合依赖倒置原则，高层模块依赖此接口而非具体实现
 */

/**
 * 配置管理器接口
 */
export interface IConfigManager {
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

  /**
   * 检查配置键是否存在
   * 
   * @param key - 配置键，支持点号分隔的嵌套路径
   * @returns 如果配置存在且不为 undefined，返回 true
   * 
   * @example
   * ```typescript
   * if (configManager.has('llm.rateLimit')) {
   *   // 配置存在
   * }
   * ```
   */
  has(key: string): boolean;

  /**
   * 获取所有配置
   * 
   * @returns 所有配置的浅拷贝对象
   * 
   * @example
   * ```typescript
   * const allConfigs = configManager.getAll();
   * console.log(allConfigs);
   * ```
   */
  getAll(): Record<string, any>;

  /**
   * 设置配置值
   * 
   * @param key - 配置键，支持点号分隔的嵌套路径
   * @param value - 要设置的值
   * 
   * @example
   * ```typescript
   * configManager.set('llm.rateLimit.capacity', 200);
   * ```
   */
  set(key: string, value: any): void;
}