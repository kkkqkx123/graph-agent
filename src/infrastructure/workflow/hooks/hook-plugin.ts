import { HookContext } from './hook-context';
import { HookExecutionResult } from './hook-execution-result';

/**
 * Hook插件接口
 * 
 * 插件用于定义可复用的函数式执行逻辑，可以被Hook类使用
 * 插件不定义hook点，只提供执行逻辑的实现
 */
export interface HookPlugin {
  /**
   * 插件唯一标识
   */
  readonly id: string;

  /**
   * 插件名称
   */
  readonly name: string;

  /**
   * 插件描述
   */
  readonly description?: string;

  /**
   * 插件版本
   */
  readonly version: string;

  /**
   * 执行插件逻辑
   * @param context Hook上下文
   * @param config 插件配置
   * @returns 执行结果
   */
  execute(context: HookContext, config: Record<string, any>): Promise<HookExecutionResult>;

  /**
   * 验证插件配置
   * @param config 插件配置
   * @returns 验证结果
   */
  validateConfig?(config: Record<string, any>): { valid: boolean; errors: string[] };
}

/**
 * Hook插件配置接口
 */
export interface HookPluginConfig {
  /**
   * 插件ID
   */
  readonly pluginId: string;

  /**
   * 插件配置
   */
  readonly config: Record<string, any>;

  /**
   * 是否启用
   */
  readonly enabled?: boolean;
}

/**
 * Hook插件注册表
 * 
 * 管理所有可用的Hook插件
 */
export class HookPluginRegistry {
  private static instance: HookPluginRegistry;
  private plugins: Map<string, HookPlugin> = new Map();

  private constructor() {}

  /**
   * 获取插件注册表单例实例
   * @returns 插件注册表实例
   */
  public static getInstance(): HookPluginRegistry {
    if (!HookPluginRegistry.instance) {
      HookPluginRegistry.instance = new HookPluginRegistry();
    }
    return HookPluginRegistry.instance;
  }

  /**
   * 注册插件
   * @param plugin 插件实例
   */
  public register(plugin: HookPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`插件 ${plugin.id} 已存在`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * 注销插件
   * @param pluginId 插件ID
   */
  public unregister(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  /**
   * 获取插件
   * @param pluginId 插件ID
   * @returns 插件实例
   */
  public get(pluginId: string): HookPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 检查插件是否存在
   * @param pluginId 插件ID
   * @returns 是否存在
   */
  public has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * 获取所有插件
   * @returns 所有插件
   */
  public getAll(): HookPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 清空所有插件
   */
  public clear(): void {
    this.plugins.clear();
  }
}

/**
 * Hook插件执行器
 * 
 * 负责执行插件逻辑
 */
export class HookPluginExecutor {
  private registry: HookPluginRegistry;

  constructor() {
    this.registry = HookPluginRegistry.getInstance();
  }

  /**
   * 执行插件
   * @param pluginConfig 插件配置
   * @param context Hook上下文
   * @returns 执行结果
   */
  async execute(pluginConfig: HookPluginConfig, context: HookContext): Promise<HookExecutionResult> {
    const plugin = this.registry.get(pluginConfig.pluginId);
    
    if (!plugin) {
      throw new Error(`插件 ${pluginConfig.pluginId} 不存在`);
    }

    if (pluginConfig.enabled === false) {
      return {
        hookId: plugin.id,
        success: true,
        executionTime: 0,
        shouldContinue: true,
        metadata: { skipped: true, reason: 'plugin is disabled' }
      };
    }

    // 验证插件配置
    if (plugin.validateConfig) {
      const validation = plugin.validateConfig(pluginConfig.config);
      if (!validation.valid) {
        return {
          hookId: plugin.id,
          success: false,
          error: `插件配置验证失败: ${validation.errors.join(', ')}`,
          executionTime: 0,
          shouldContinue: true
        };
      }
    }

    // 执行插件
    return await plugin.execute(context, pluginConfig.config);
  }

  /**
   * 批量执行插件
   * @param pluginConfigs 插件配置列表
   * @param context Hook上下文
   * @returns 执行结果列表
   */
  async executeBatch(pluginConfigs: HookPluginConfig[], context: HookContext): Promise<HookExecutionResult[]> {
    const results: HookExecutionResult[] = [];

    for (const pluginConfig of pluginConfigs) {
      try {
        const result = await this.execute(pluginConfig, context);
        results.push(result);

        // 如果插件要求停止执行，则中断后续插件
        if (!result.shouldContinue) {
          break;
        }
      } catch (error) {
        results.push({
          hookId: pluginConfig.pluginId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime: 0,
          shouldContinue: true
        });
      }
    }

    return results;
  }
}