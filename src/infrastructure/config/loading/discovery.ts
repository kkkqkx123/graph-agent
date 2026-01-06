/**
 * 配置发现器实现
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { minimatch } from 'minimatch';
import { IConfigDiscovery, ConfigFile } from './types';
import { ILogger } from '../../../domain/common/types';

/**
 * 配置发现器选项
 */
export interface ConfigDiscoveryOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
  fileExtensions?: string[];
}

/**
 * 配置发现器实现
 */
export class ConfigDiscovery implements IConfigDiscovery {
  private readonly includePatterns: string[];
  private readonly excludePatterns: string[];
  private readonly fileExtensions: string[];
  private readonly logger: ILogger;

  constructor(options: ConfigDiscoveryOptions = {}, logger: ILogger) {
    this.includePatterns = options.includePatterns || ['**/*.toml'];
    this.excludePatterns = options.excludePatterns = [
      '**/_*',
      '**/__*',
      '**/test_*',
      '**/*.test.*',
    ];
    this.fileExtensions = options.fileExtensions || ['.toml'];
    this.logger = logger.child({ module: 'ConfigDiscovery' });
  }

  /**
   * 发现所有配置文件
   */
  async discoverConfigs(basePath: string): Promise<ConfigFile[]> {
    this.logger.debug('开始发现配置文件', { basePath });

    try {
      const files = await this.scanDirectory(basePath);
      const configFiles = await this.processFiles(files, basePath);

      this.logger.debug('配置文件发现完成', { count: configFiles.length });
      return configFiles;
    } catch (error) {
      this.logger.error('配置文件发现失败', error as Error);
      throw error;
    }
  }

  /**
   * 发现特定模块的配置文件
   */
  async discoverModuleConfigs(modulePath: string, moduleType: string): Promise<ConfigFile[]> {
    this.logger.debug('发现模块配置文件', { modulePath, moduleType });

    try {
      const files = await this.scanDirectory(modulePath);
      const configFiles = await this.processFiles(files, path.dirname(modulePath));

      // 过滤出属于指定模块类型的文件
      const moduleFiles = configFiles.filter(file => file.moduleType === moduleType);

      this.logger.debug('模块配置文件发现完成', {
        moduleType,
        count: moduleFiles.length,
      });

      return moduleFiles;
    } catch (error) {
      this.logger.error('模块配置文件发现失败', error as Error, {
        modulePath,
        moduleType,
      });
      throw error;
    }
  }

  /**
   * 扫描目录获取所有文件
   */
  private async scanDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(currentPath: string): Promise<void> {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            await scan(fullPath);
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    }

    await scan(dirPath);
    return files;
  }

  /**
   * 处理文件列表，转换为ConfigFile对象
   */
  private async processFiles(files: string[], basePath: string): Promise<ConfigFile[]> {
    const configFiles: ConfigFile[] = [];

    for (const filePath of files) {
      const relativePath = path.relative(basePath, filePath);

      // 检查文件扩展名
      if (!this.isValidExtension(filePath)) {
        continue;
      }

      // 检查包含模式
      if (!this.matchesIncludePatterns(relativePath)) {
        continue;
      }

      // 检查排除模式
      if (this.matchesExcludePatterns(relativePath)) {
        continue;
      }

      const configFile = await this.createConfigFile(filePath, relativePath, basePath);
      configFiles.push(configFile);
    }

    return configFiles;
  }

  /**
   * 检查文件扩展名是否有效
   */
  private isValidExtension(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.fileExtensions.includes(ext);
  }

  /**
   * 检查是否匹配包含模式
   */
  private matchesIncludePatterns(relativePath: string): boolean {
    return this.includePatterns.some(pattern => minimatch(relativePath, pattern));
  }

  /**
   * 检查是否匹配排除模式
   */
  private matchesExcludePatterns(relativePath: string): boolean {
    return this.excludePatterns.some(pattern => minimatch(relativePath, pattern));
  }

  /**
   * 创建ConfigFile对象
   */
  private async createConfigFile(
    filePath: string,
    relativePath: string,
    basePath: string
  ): Promise<ConfigFile> {
    const ext = path.extname(filePath).toLowerCase();
    const moduleType = this.detectModuleType(relativePath);
    const priority = this.calculatePriority(relativePath, moduleType);

    return {
      path: filePath,
      type: ext.substring(1), // 移除点号
      moduleType,
      priority,
      metadata: {
        relativePath,
        size: (await fs.stat(filePath)).size,
        modified: (await fs.stat(filePath)).mtime.toISOString(),
      },
    };
  }

  /**
   * 检测模块类型
   */
  private detectModuleType(relativePath: string): string {
    const parts = relativePath.split(path.sep);
    const firstDir = parts[0];

    if (!firstDir) {
      return 'unknown';
    }

    // 预定义的目录到模块类型映射
    const MODULE_MAPPING: Record<string, string> = {
      global: 'global',
      environments: 'global',
      llms: 'llms',
      tools: 'tools',
      workflows: 'workflows',
      nodes: 'nodes',
      edges: 'edges',
      prompts: 'prompts',
      storage: 'storage',
      history: 'history',
      plugins: 'plugins',
      trigger_compositions: 'triggers',
      trigger_functions: 'triggers',
    };

    return MODULE_MAPPING[firstDir] || 'unknown';
  }

  /**
   * 计算文件优先级
   */
  private calculatePriority(relativePath: string, moduleType: string): number {
    let priority = 100;

    // 基础配置文件优先级更高
    if (relativePath.includes('global')) {
      priority += 1000;
    }

    // 环境配置优先级较高
    if (relativePath.includes('environments')) {
      priority += 800;
    }

    // 注册表文件优先级较高
    if (relativePath.includes('__registry__')) {
      priority += 600;
    }

    // 通用配置文件优先级较高
    if (relativePath.includes('common')) {
      priority += 500;
    }

    // 分组配置文件优先级较高
    if (relativePath.includes('_group')) {
      priority += 400;
    }

    // 提供商配置优先级中等
    if (relativePath.includes('provider')) {
      priority += 300;
    }

    // 示例配置优先级较低
    if (relativePath.includes('examples')) {
      priority -= 200;
    }

    // 测试配置优先级最低
    if (relativePath.includes('test')) {
      priority -= 400;
    }

    return priority;
  }
}
