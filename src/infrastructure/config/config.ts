/**
 * 配置函数式接口
 *
 * 提供纯函数式的配置访问方式，避免依赖注入的复杂性
 * 配置管理器作为内部单例，对外只暴露简单的函数接口
 * 支持类型安全的配置访问（编译时类型检查）
 */

import { ConfigLoadingModule } from './loading/config-loading-module';
import { ILogger } from '../../domain/common/types';
import { AppConfig, AppConfigSchema } from './types';
import { PathOf, ValueAtPath, IConfigAccessor } from './path-types';

/**
 * 内部配置管理器实例
 */
let _configManager: ConfigLoadingModule | null = null;
let _logger: ILogger | null = null;

/**
 * 类型安全的配置访问器类
 * 
 * 提供编译时类型检查的配置访问
 * 
 * @example
 * const config = getConfig();
 * const apiKey = config.get('llm_runtime.openai.api_key'); // 类型: string
 * const timeout = config.get('http.timeout'); // 类型: number
 */
export class TypedConfigAccessor implements IConfigAccessor<AppConfig> {
  constructor(private config: AppConfig) {}

  /**
   * 获取配置值（类型安全）
   *
   * @param path - 配置路径，支持点号分隔
   * @returns 配置值，类型由路径自动推导
   *
   * @example
   * config.get('llm_runtime.openai.api_key') // 返回 string 类型
   * config.get('http.rate_limit.capacity') // 返回 number 类型
   */
  get<P extends PathOf<AppConfig>>(path: P): ValueAtPath<AppConfig, P> {
    const keys = path.split('.') as (keyof any)[];
    let value: any = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        throw new Error(`配置路径不存在: ${path}`);
      }
    }

    return value as ValueAtPath<AppConfig, P>;
  }

  /**
   * 获取配置值（带默认值）
   *
   * @param path - 配置路径
   * @param defaultValue - 默认值
   * @returns 配置值或默认值
   */
  getOrDefault<P extends PathOf<AppConfig>>(
    path: P,
    defaultValue: ValueAtPath<AppConfig, P>
  ): ValueAtPath<AppConfig, P> {
    try {
      return this.get(path);
    } catch {
      return defaultValue;
    }
  }

  /**
   * 获取配置值（动态路径，用于运行时生成的路径）
   *
   * @param path - 配置路径，支持点号分隔
   * @param defaultValue - 默认值
   * @returns 配置值或默认值
   *
   * @example
   * config.getDynamic('functions.MyFunction', {})
   */
  getDynamic<T = any>(path: string, defaultValue?: T): T {
    const keys = path.split('.') as (keyof any)[];
    let value: any = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue as T;
      }
    }

    return value as T;
  }

  /**
   * 检查配置路径是否存在
   *
   * @param path - 配置路径
   * @returns 是否存在
   */
  has<P extends PathOf<AppConfig>>(path: P): boolean {
    try {
      this.get(path);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 全局配置访问器实例
 */
let _configAccessor: TypedConfigAccessor | null = null;

/**
 * 初始化配置系统
 *
 * 在应用启动时调用，加载所有配置文件
 *
 * @param basePath - 配置文件基础路径
 * @param logger - 日志记录器
 *
 * @example
 * ```typescript
 * await initConfig('./configs', logger);
 * ```
 */
export async function initConfig(basePath: string, logger: ILogger): Promise<void> {
  if (_configManager) {
    logger.warn('配置管理器已经初始化，跳过重复初始化');
    return;
  }

  _logger = logger;
  _configManager = new ConfigLoadingModule(logger);
  await _configManager.initialize(basePath);

  // 获取所有配置数据
  const configData = _configManager.getAllConfigs();

  // 验证配置
  const result = AppConfigSchema.safeParse(configData);
  if (!result.success) {
    throw new Error(`配置验证失败: ${result.error.message}`);
  }

  // 创建类型安全的配置访问器
  _configAccessor = new TypedConfigAccessor(result.data);

  logger.info('配置系统初始化完成', { basePath });
}

/**
 * 获取类型安全的配置访问器
 *
 * @returns 类型安全的配置访问器实例
 *
 * @example
 * ```typescript
 * const config = getConfig();
 * const apiKey = config.get('llm_runtime.openai.api_key'); // 类型: string
 * const timeout = config.get('http.timeout'); // 类型: number
 * ```
 *
 * @throws {Error} 如果配置系统未初始化
 */
export function getConfig(): TypedConfigAccessor {
  if (!_configAccessor) {
    throw new Error(
      '配置系统未初始化。请确保在应用启动时调用了 initConfig() 方法。'
    );
  }
  return _configAccessor;
}

/**
 * 刷新配置
 *
 * 重新加载配置文件，清空缓存
 * 支持热更新，无需重启应用
 *
 * @example
 * ```typescript
 * await refreshConfig();
 * ```
 *
 * @throws {Error} 如果配置系统未初始化
 */
export async function refreshConfig(): Promise<void> {
  if (!_configManager) {
    throw new Error(
      '配置系统未初始化。请确保在应用启动时调用了 initConfig() 方法。'
    );
  }

  if (!_logger) {
    throw new Error('日志记录器未初始化');
  }

  _logger.info('开始刷新配置');
  await _configManager.refresh();

  // 获取刷新后的配置数据
  const configData = _configManager.getAllConfigs();

  // 验证配置
  const result = AppConfigSchema.safeParse(configData);
  if (!result.success) {
    throw new Error(`配置验证失败: ${result.error.message}`);
  }

  // 更新类型安全的配置访问器
  _configAccessor = new TypedConfigAccessor(result.data);

  _logger.info('配置刷新完成');
}

/**
 * 获取配置管理器实例
 *
 * 供需要直接访问配置管理器的特殊场景使用
 * 大多数情况下应该使用 getConfig() 函数
 *
 * @returns 配置管理器实例
 *
 * @throws {Error} 如果配置管理器未初始化
 *
 * @example
 * ```typescript
 * const configManager = getConfigManager();
 * // 直接访问配置管理器的方法
 * ```
 */
export function getConfigManager(): ConfigLoadingModule {
  if (!_configManager) {
    throw new Error(
      '配置管理器未初始化。请确保在应用启动时调用了 initConfig() 方法。'
    );
  }
  return _configManager;
}

/**
 * 设置配置管理器实例
 *
 * 用于测试场景，可以注入mock的配置管理器
 *
 * @param configManager - 配置管理器实例
 *
 * @example
 * ```typescript
 * const mockConfigManager = new MockConfigLoadingModule();
 * setConfigManager(mockConfigManager);
 * ```
 */
export function setConfigManager(configManager: ConfigLoadingModule): void {
  _configManager = configManager;
}

/**
 * 重置配置管理器
 *
 * 用于测试场景，清理测试状态
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   resetConfigManager();
 * });
 * ```
 */
export function resetConfigManager(): void {
  _configManager = null;
  _logger = null;
  _configAccessor = null;
}

/**
 * 检查配置管理器是否已初始化
 *
 * @returns 如果已初始化返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * if (isConfigInitialized()) {
 *   const config = getConfig();
 *   const value = config.get('some.key');
 * }
 * ```
 */
export function isConfigInitialized(): boolean {
  return _configManager !== null && _configAccessor !== null;
}