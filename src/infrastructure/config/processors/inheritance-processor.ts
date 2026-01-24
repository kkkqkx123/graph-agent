/**
 * 配置继承处理器实现
 * 统一使用TOML格式，移除JSON和YAML支持
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseToml } from 'toml';
import {
  IConfigProcessor,
  InheritanceProcessorOptions,
  ILogger,
} from '../../../domain/common/types';
import { ParameterValidationError, InvalidConfigurationError } from '../../../domain/common/exceptions';

/**
 * 配置继承处理器
 * 处理配置文件之间的继承关系
 */
export class InheritanceProcessor implements IConfigProcessor {
  private readonly separator: string;
  private readonly maxDepth: number;
  private readonly logger: ILogger;
  private readonly loadingCache: Map<string, Record<string, any>> = new Map();
  private readonly basePath: string;

  constructor(options: InheritanceProcessorOptions = {}, logger: ILogger, basePath: string) {
    if (!basePath) {
      throw new ParameterValidationError('basePath', 'InheritanceProcessor必须提供basePath参数');
    }

    this.separator = options.separator || '.';
    this.maxDepth = options.maxDepth || 10;
    this.logger = logger;
    this.basePath = basePath;
  }

  /**
   * 处理配置继承
   */
  process(config: Record<string, any>): Record<string, any> {
    this.logger.debug('开始处理配置继承');

    // 清空缓存
    this.loadingCache.clear();

    const processed = this.processInheritance(config, new Set<string>());

    this.logger.debug('配置继承处理完成');
    return processed;
  }

  /**
   * 递归处理继承关系
   */
  private processInheritance(
    config: Record<string, any>,
    visited: Set<string>
  ): Record<string, any> {
    // 检查是否包含继承信息
    if (!config['inherits_from'] || !Array.isArray(config['inherits_from'])) {
      return config;
    }

    // 检查深度限制
    if (visited.size >= this.maxDepth) {
      this.logger.warn('继承深度超过限制', { depth: visited.size, maxDepth: this.maxDepth });
      return config;
    }

    let result: Record<string, any> = {};

    // 按顺序加载父配置
    for (const parentPath of config['inherits_from']) {
      // 检查循环继承
      if (visited.has(parentPath)) {
        this.logger.warn('检测到循环继承', { path: parentPath, visited: Array.from(visited) });
        continue;
      }

      try {
        this.logger.debug('加载父配置', { path: parentPath });

        const parentConfig = this.loadParentConfig(parentPath, visited);
        result = this.mergeConfigs(result, parentConfig);
      } catch (error) {
        this.logger.error('加载父配置失败', error as Error, {
          path: parentPath,
        });
        // 继续处理其他父配置
      }
    }

    // 移除继承信息并合并当前配置
    const { ['inherits_from']: _, ...currentConfig } = config;
    result = this.mergeConfigs(result, currentConfig);

    return result;
  }

  /**
   * 加载父配置文件
   */
  private loadParentConfig(parentPath: string, visited: Set<string>): Record<string, any> {
    // 检查缓存
    if (this.loadingCache.has(parentPath)) {
      return this.loadingCache.get(parentPath)!;
    }

    // 解析路径
    const resolvedPath = this.resolvePath(parentPath);

    // 读取文件
    const content = require('fs').readFileSync(resolvedPath, 'utf8');
    const config = this.parseContent(content, resolvedPath);

    // 递归处理继承
    const newVisited = new Set(visited);
    newVisited.add(parentPath);

    const processedConfig = this.processInheritance(config, newVisited);

    // 缓存结果
    this.loadingCache.set(parentPath, processedConfig);

    return processedConfig;
  }

  /**
   * 解析文件路径
   * 基于配置文件所在目录解析相对路径
   */
  private resolvePath(parentPath: string): string {
    // 如果是绝对路径，直接返回
    if (path.isAbsolute(parentPath)) {
      return parentPath;
    }

    // 相对路径基于配置文件所在目录（basePath）
    return path.resolve(this.basePath, parentPath);
  }

  /**
   * 解析文件内容
   *
   * 统一使用TOML格式，移除JSON和YAML支持
   */
  private parseContent(content: string, filePath: string): Record<string, any> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext !== '.toml') {
      throw new InvalidConfigurationError('format', `不支持的配置文件格式: ${ext}，仅支持TOML格式`);
    }

    try {
      return parseToml(content);
    } catch (error) {
      throw new InvalidConfigurationError('content', `解析配置文件失败 ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * 深度合并配置对象
   */
  private mergeConfigs(
    target: Record<string, any>,
    source: Record<string, any>
  ): Record<string, any> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (this.isObject(value) && this.isObject(result[key])) {
        result[key] = this.mergeConfigs(result[key], value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 检查是否为对象
   */
  private isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
