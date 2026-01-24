/**
 * 配置发现器实现
 */

import * as fs from 'fs/promises';
import * as path from 'path';
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
    this.excludePatterns = options.excludePatterns || [
      '**/_*',
      '**/__*',
      '**/test_*',
      '**/*.test.*',
    ];
    this.fileExtensions = options.fileExtensions || ['.toml'];
    this.logger = logger;
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
    return this.includePatterns.some(pattern => this.matchPattern(relativePath, pattern));
  }

  /**
   * 检查是否匹配排除模式
   */
  private matchesExcludePatterns(relativePath: string): boolean {
    return this.excludePatterns.some(pattern => this.matchPattern(relativePath, pattern));
  }

  /**
   * 简单的模式匹配实现
   * 支持 glob 模式匹配
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    // 规范化路径分隔符
    const normalizedPath = filePath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // 处理 **/*.test.* 模式（优先处理）
    if (normalizedPattern.startsWith('**/') && normalizedPattern.includes('.test.')) {
      return normalizedPath.includes('.test.');
    }

    // 处理 **/*.ext 模式
    if (normalizedPattern.startsWith('**/') && normalizedPattern.includes('*.')) {
      const ext = normalizedPattern.substring(normalizedPattern.lastIndexOf('.'));
      return normalizedPath.endsWith(ext);
    }

    // 处理 **/prefix* 模式
    if (normalizedPattern.startsWith('**/')) {
      const suffix = normalizedPattern.substring(3);
      if (suffix.includes('*')) {
        const parts = suffix.split('*');
        return parts.every(part => normalizedPath.includes(part));
      }
      return normalizedPath.includes(suffix);
    }

    // 精确匹配
    return normalizedPath === normalizedPattern;
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
      type: ext.substring(1),
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
    // 规范化路径分隔符，统一使用 /
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/').filter(p => p);

    if (parts.length === 0) {
      return 'unknown';
    }

    // 特殊文件优先处理（检查所有路径段，包括文件名）
    const hasRegistry = parts.some(part => part === '__registry__' || part.startsWith('__registry__'));
    if (hasRegistry) {
      return 'registry';
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
      history: 'history',
      trigger_compositions: 'triggers',
      trigger_functions: 'triggers',
      database: 'database',
      threads: 'threads',
    };

    // 检查第一级目录或文件名
    const firstPart = parts[0];
    if (!firstPart) {
      return 'unknown';
    }
    
    // 提取目录名（如果是文件名，去掉扩展名）
    const firstDir = firstPart.includes('.') ? firstPart.substring(0, firstPart.lastIndexOf('.')) : firstPart;
    
    if (MODULE_MAPPING[firstDir]) {
      return MODULE_MAPPING[firstDir];
    }

    // 检查是否在 examples 目录下
    if (firstDir === 'examples') {
      return 'example';
    }

    return 'unknown';
  }

  /**
   * 计算文件优先级
   */
  private calculatePriority(relativePath: string, moduleType: string): number {
    let priority = 100;
    // 规范化路径分隔符，统一使用 /
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/').filter(p => p);

    // 注册表文件优先级最高（检查所有路径段，包括文件名）
    if (pathParts.some(part => part === '__registry__' || part.startsWith('__registry__'))) {
      priority += 600;
    }

    // 通用配置文件优先级较高（检查目录名，不包括文件名）
    const dirParts = pathParts.slice(0, -1);
    const hasCommon = dirParts.some(part => part === 'common');
    if (hasCommon) {
      priority += 500;
    }

    // 分组配置文件优先级较高（检查路径段是否包含 _group）
    if (pathParts.some(part => part.includes('_group'))) {
      priority += 400;
    }

    // 提供商配置优先级中等（检查目录名，不包括文件名）
    const hasProvider = dirParts.some(part => part === 'provider');
    if (hasProvider) {
      priority += 300;
    }

    // 基础配置文件优先级更高（精确匹配第一级目录或文件名）
    const firstPart = pathParts[0];
    if (firstPart) {
      const firstDir = firstPart.includes('.') ? firstPart.substring(0, firstPart.lastIndexOf('.')) : firstPart;
      
      if (firstDir === 'global') {
        priority += 1000;
      }

      // 环境配置优先级较高（精确匹配第一级目录）
      if (firstDir === 'environments') {
        priority += 800;
      }

      // 示例配置优先级较低（精确匹配第一级目录）
      if (firstDir === 'examples') {
        priority -= 200;
      }
    }

    // 测试配置优先级最低（检查目录名和文件名）
    const hasTest = pathParts.some(part => part.includes('test'));
    if (hasTest) {
      priority -= 400;
    }

    return priority;
  }
}