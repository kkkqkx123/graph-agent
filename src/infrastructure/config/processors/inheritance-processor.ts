/**
 * 配置继承处理器实现
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseToml } from 'toml';
import * as yaml from 'yaml';
import { IConfigProcessor, InheritanceProcessorOptions } from '@shared/types/config';
import { ILogger } from '@shared/types/logger';

/**
 * 配置继承接口
 */
interface ConfigInheritance {
  inherits_from?: string[];
  [key: string]: any;
}

/**
 * 配置继承处理器
 * 处理配置文件之间的继承关系
 */
export class InheritanceProcessor implements IConfigProcessor {
  private readonly separator: string;
  private readonly maxDepth: number;
  private readonly logger: ILogger;
  private readonly loadingCache: Map<string, Record<string, any>> = new Map();

  constructor(
    options: InheritanceProcessorOptions = {},
    logger: ILogger
  ) {
    this.separator = options.separator || '.';
    this.maxDepth = options.maxDepth || 10;
    this.logger = logger.child({ module: 'InheritanceProcessor' });
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
          path: parentPath
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
  private loadParentConfig(
    parentPath: string, 
    visited: Set<string>
  ): Record<string, any> {
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
   */
  private resolvePath(parentPath: string): string {
    // 如果是相对路径，相对于当前工作目录
    if (path.isAbsolute(parentPath)) {
      return parentPath;
    }
    
    return path.resolve(process.cwd(), parentPath);
  }

  /**
   * 解析文件内容
   */
  private parseContent(content: string, filePath: string): Record<string, any> {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      switch (ext) {
        case '.toml':
          return parseToml(content);
        case '.yaml':
        case '.yml':
          return yaml.parse(content);
        case '.json':
          return JSON.parse(content);
        default:
          throw new Error(`不支持的配置文件格式: ${ext}`);
      }
    } catch (error) {
      throw new Error(`解析配置文件失败 ${filePath}: ${(error as Error).message}`);
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