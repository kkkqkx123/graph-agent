/**
 * 配置函数式接口
 *
 * 提供纯函数式的配置访问方式，避免依赖注入的复杂性
 * 配置管理器作为内部单例，对外只暴露简单的函数接口
 */

import { ConfigLoadingModule } from './loading/config-loading-module';
import { ILogger } from '../../domain/common/types';

/**
 * 内部配置管理器实例
 */
let _configManager: ConfigLoadingModule | null = null;
let _logger: ILogger | null = null;

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

  logger.info('配置系统初始化完成', { basePath });
}

/**
 * 获取配置值
 *
 * 支持点号分隔的嵌套路径访问
 *
 * @template T - 返回值的类型
 * @param key - 配置键，支持点号分隔的嵌套路径（如 'llm.rateLimit.capacity'）
 * @param defaultValue - 默认值，当配置不存在时返回
 * @returns 配置值或默认值
 *
 * @example
 * ```typescript
 * const capacity = getConfig<number>('llm.rateLimit.capacity', 100);
 * const enabled = getConfig<boolean>('llm.enabled', false);
 * ```
 *
 * @throws {Error} 如果配置管理器未初始化
 */
export function getConfig<T = any>(key: string, defaultValue?: T): T {
  if (!_configManager) {
    throw new Error(
      '配置管理器未初始化。请确保在应用启动时调用了 initConfig() 方法。'
    );
  }
  return _configManager.get(key, defaultValue);
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
 * @throws {Error} 如果配置管理器未初始化
 */
export async function refreshConfig(): Promise<void> {
  if (!_configManager) {
    throw new Error(
      '配置管理器未初始化。请确保在应用启动时调用了 initConfig() 方法。'
    );
  }

  if (!_logger) {
    throw new Error('日志记录器未初始化');
  }

  _logger.info('开始刷新配置');
  await _configManager.refresh();
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
}

/**
 * 检查配置管理器是否已初始化
 *
 * @returns 如果已初始化返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * if (isConfigInitialized()) {
 *   const value = getConfig('some.key');
 * }
 * ```
 */
export function isConfigInitialized(): boolean {
  return _configManager !== null;
}