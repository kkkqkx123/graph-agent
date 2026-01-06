/**
 * 配置处理器
 * 
 * 负责处理配置的合并、拆分等逻辑
 * 将配置处理逻辑从ConfigLoadingModule中分离出来
 */

import * as path from 'path';
import { ConfigFile } from '../loading/types';
import { ILogger } from '../../../domain/common/types';

/**
 * 配置处理器选项
 */
export interface ConfigProcessorOptions {
  /**
   * 是否启用配置拆分
   */
  enableSplit?: boolean;
  
  /**
   * 拆分配置的目录映射
   * key: 模块类型
   * value: 配置键（如 'pools' 或 'taskGroups'）
   */
  splitDirectories?: Record<string, string>;
}

/**
 * 配置处理器
 */
export class ConfigProcessor {
  private readonly logger: ILogger;
  private readonly options: ConfigProcessorOptions;

  constructor(logger: ILogger, options: ConfigProcessorOptions = {}) {
    this.logger = logger.child({ module: 'ConfigProcessor' });
    this.options = {
      enableSplit: true,
      splitDirectories: {
        'llms': 'pools',  // llms模块的pools目录
      },
      ...options,
    };
  }

  /**
   * 处理配置文件列表
   * 
   * 根据配置决定是合并还是拆分配置
   */
  async processConfigFiles(
    moduleType: string,
    files: ConfigFile[],
    loadFileContent: (file: ConfigFile) => Promise<Record<string, any>>
  ): Promise<Record<string, any>> {
    this.logger.debug('处理配置文件', { moduleType, fileCount: files.length });

    // 检查是否需要拆分配置
    if (this.shouldSplitConfig(moduleType, files)) {
      return this.processSplitConfig(moduleType, files, loadFileContent);
    } else {
      return this.processMergedConfig(files, loadFileContent);
    }
  }

  /**
   * 检查是否需要拆分配置
   */
  private shouldSplitConfig(moduleType: string, files: ConfigFile[]): boolean {
    if (!this.options.enableSplit) {
      return false;
    }

    // 检查文件路径是否包含拆分配置的目录
    return files.some(file => {
      const relativePath = file.path.toLowerCase();
      return Object.values(this.options.splitDirectories || {}).some(dir =>
        relativePath.includes(`/${dir}/`) || relativePath.includes(`\\${dir}\\`)
      );
    });
  }

  /**
   * 处理拆分配置
   * 
   * 从文件名中提取配置键，将多个文件合并为一个配置对象
   */
  private async processSplitConfig(
    moduleType: string,
    files: ConfigFile[],
    loadFileContent: (file: ConfigFile) => Promise<Record<string, any>>
  ): Promise<Record<string, any>> {
    this.logger.debug('处理拆分配置', { moduleType });

    const result: Record<string, any> = {};
    const pools: Record<string, any> = {};
    const taskGroups: Record<string, any> = {};

    for (const file of files) {
      try {
        const content = await loadFileContent(file);
        const configKey = this.extractConfigKey(file.path);

        // 根据文件路径确定配置类型
        if (file.path.includes('/pools/') || file.path.includes('\\pools\\')) {
          pools[configKey] = content;
          this.logger.debug('添加池配置', { configKey });
        } else if (file.path.includes('/task_groups/') || file.path.includes('\\task_groups\\')) {
          taskGroups[configKey] = content;
          this.logger.debug('添加任务组配置', { configKey });
        }
      } catch (error) {
        this.logger.warn('配置文件处理失败，跳过', {
          path: file.path,
          error: (error as Error).message,
        });
      }
    }

    // 构建最终配置
    if (Object.keys(pools).length > 0) {
      result['pools'] = pools;
    }
    if (Object.keys(taskGroups).length > 0) {
      result['taskGroups'] = taskGroups;
    }

    this.logger.debug('拆分配置处理完成', {
      poolsCount: Object.keys(pools).length,
      taskGroupsCount: Object.keys(taskGroups).length,
    });

    return result;
  }

  /**
   * 处理合并配置
   * 
   * 传统的配置合并方式
   */
  private async processMergedConfig(
    files: ConfigFile[],
    loadFileContent: (file: ConfigFile) => Promise<Record<string, any>>
  ): Promise<Record<string, any>> {
    this.logger.debug('处理合并配置');

    const configs: Record<string, any>[] = [];
    
    for (const file of files) {
      try {
        const content = await loadFileContent(file);
        configs.push(content);
      } catch (error) {
        this.logger.warn('配置文件处理失败，跳过', {
          path: file.path,
          error: (error as Error).message,
        });
      }
    }

    // 合并配置
    const result = this.deepMergeConfigs(configs);
    
    this.logger.debug('合并配置处理完成', { configCount: configs.length });

    return result;
  }

  /**
   * 从文件路径中提取配置键
   * 
   * 例如：configs/llms/pools/fast_pool.toml -> fast_pool
   */
  private extractConfigKey(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName;
  }

  /**
   * 深度合并配置对象
   */
  private deepMergeConfigs(configs: Record<string, any>[]): Record<string, any> {
    let result: Record<string, any> = {};

    for (const config of configs) {
      result = this.deepMerge(result, config);
    }

    return result;
  }

  /**
   * 深度合并两个对象
   */
  private deepMerge(target: any, source: any): any {
    if (source === null || source === undefined) {
      return target;
    }

    if (typeof source !== 'object' || Array.isArray(source)) {
      return source;
    }

    if (typeof target !== 'object' || Array.isArray(target)) {
      target = {};
    }

    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (
        typeof value === 'object' &&
        !Array.isArray(value) &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = this.deepMerge(result[key], value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}