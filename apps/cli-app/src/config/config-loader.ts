/**
 * 配置加载器
 * 支持多种配置文件格式
 */

import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';

/**
 * 配置模式定义
 */
const ConfigSchema = z.object({
  apiUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  defaultTimeout: z.number().positive().optional(),
  verbose: z.boolean().optional(),
  debug: z.boolean().optional(),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).optional(),
  outputFormat: z.enum(['json', 'table', 'plain']).optional(),
  maxConcurrentThreads: z.number().positive().optional(),
});

/**
 * 配置类型
 */
export type CLIConfig = z.infer<typeof ConfigSchema>;

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Partial<CLIConfig> = {
  defaultTimeout: 30000,
  verbose: false,
  debug: false,
  logLevel: 'warn',
  outputFormat: 'table',
  maxConcurrentThreads: 5,
};

/**
 * 配置加载器类
 */
export class ConfigLoader {
  private explorer: ReturnType<typeof cosmiconfig>;
  private cachedConfig: CLIConfig | null = null;

  constructor() {
    this.explorer = cosmiconfig('modular-agent', {
      searchPlaces: [
        'package.json',
        '.modular-agentrc',
        '.modular-agentrc.json',
        '.modular-agentrc.ts',
        '.modular-agentrc.js',
        'modular-agent.config.js',
        'modular-agent.config.ts',
      ],
    });
  }

  /**
   * 加载配置
   */
  async load(): Promise<CLIConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    try {
      const result = await this.explorer.search();

      if (result?.config) {
        // 验证配置
        const validatedConfig = ConfigSchema.parse(result.config);
        this.cachedConfig = { ...DEFAULT_CONFIG, ...validatedConfig };
        return this.cachedConfig;
      }
    } catch (error) {
      console.warn('配置加载失败，使用默认配置:', error);
    }

    // 返回默认配置
    this.cachedConfig = ConfigSchema.parse(DEFAULT_CONFIG);
    return this.cachedConfig;
  }

  /**
   * 清除缓存的配置
   */
  clearCache(): void {
    this.cachedConfig = null;
  }

  /**
   * 获取特定配置项
   */
  async get<K extends keyof CLIConfig>(key: K): Promise<CLIConfig[K]> {
    const config = await this.load();
    return config[key];
  }

  /**
   * 设置配置项（仅在内存中）
   */
  set<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): void {
    if (!this.cachedConfig) {
      this.cachedConfig = { ...DEFAULT_CONFIG };
    }
    this.cachedConfig[key] = value;
  }
}

/**
 * 全局配置加载器实例
 */
let globalConfigLoader: ConfigLoader | null = null;

/**
 * 获取全局配置加载器实例
 */
export function getConfigLoader(): ConfigLoader {
  if (!globalConfigLoader) {
    globalConfigLoader = new ConfigLoader();
  }
  return globalConfigLoader;
}

/**
 * 加载配置的便捷函数
 */
export async function loadConfig(): Promise<CLIConfig> {
  return getConfigLoader().load();
}