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

  /**
   * 注册配置变更监听器
   *
   * 当指定配置键的值发生变化时，触发回调函数
   * 支持通配符监听，如 'llm.*' 监听所有llm开头的配置
   *
   * @param key - 配置键，支持点号分隔的嵌套路径和通配符
   * @param callback - 变更回调函数，接收新值和旧值
   * @returns 取消监听的函数
   *
   * @example
   * ```typescript
   * const unsubscribe = configManager.onChange(
   *   'llm.rateLimit.capacity',
   *   (newValue, oldValue) => {
   *     console.log(`配置变更: ${oldValue} -> ${newValue}`);
   *   }
   * );
   * // 取消监听
   * unsubscribe();
   * ```
   */
  onChange(key: string, callback: (newValue: any, oldValue: any) => void): () => void;

  /**
   * 刷新配置
   *
   * 重新加载配置文件，触发所有匹配的变更监听器
   * 支持热更新，无需重启应用
   *
   * @example
   * ```typescript
   * await configManager.refresh();
   * ```
   */
  refresh(): Promise<void>;

  /**
   * 获取配置版本
   *
   * 返回当前配置的版本号，用于判断配置是否已更新
   *
   * @returns 配置版本号
   *
   * @example
   * ```typescript
   * const version = configManager.getVersion();
   * console.log(`当前配置版本: ${version}`);
   * ```
   */
  getVersion(): string;
}

/**
 * 配置变更事件
 */
export interface ConfigChangeEvent {
  /** 配置键 */
  key: string;
  /** 新值 */
  newValue: any;
  /** 旧值 */
  oldValue: any;
  /** 变更时间戳 */
  timestamp: number;
}