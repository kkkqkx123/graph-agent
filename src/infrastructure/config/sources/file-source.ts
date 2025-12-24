/**
 * 文件配置源实现
 */

import { promises as fs, watch as fsWatch } from 'fs';
import * as path from 'path';
import { parse as parseToml } from 'toml';
import * as yaml from 'yaml';
import { IConfigSource, ConfigSourceType, FileConfigSourceOptions } from '../../domain/common/types';
import { ILogger } from '../../../domain/common/types';

/**
 * 文件配置源
 */
export class FileConfigSource implements IConfigSource {
  readonly type = ConfigSourceType.FILE;
  readonly priority: number;
  
  private readonly filePath: string;
  private readonly format: 'toml' | 'yaml' | 'json';
  private readonly encoding: string;
  private readonly shouldWatch: boolean;
  private readonly logger: ILogger;
  private watcher?: ReturnType<typeof fsWatch>;

  constructor(
    options: FileConfigSourceOptions,
    priority: number,
    logger: ILogger
  ) {
    this.filePath = options.path;
    this.format = (options.format as any) || this.detectFormat(options.path);
    this.encoding = options.encoding || 'utf8';
    this.shouldWatch = options.watch || false;
    this.priority = priority;
    this.logger = logger.child({ module: 'FileConfigSource', path: this.filePath });
  }

  /**
   * 加载配置文件
   */
  async load(): Promise<Record<string, any>> {
    try {
      this.logger.debug('正在加载配置文件', { path: this.filePath });
      
      const content = await fs.readFile(this.filePath, { encoding: this.encoding as BufferEncoding });
      const config = this.parseContent(content);
      
      this.logger.debug('配置文件加载成功', { keys: Object.keys(config) });
      return config;
    } catch (error) {
      this.logger.error('配置文件加载失败', error as Error, { stack: (error as Error).stack });
      throw new Error(`无法加载配置文件 ${this.filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * 监听文件变更
   */
  watch(callback: (config: Record<string, any>) => void): void {
    if (!this.shouldWatch) {
      this.logger.warn('文件监控未启用');
      return;
    }

    if (this.watcher) {
      this.logger.warn('文件监控已存在');
      return;
    }

    this.logger.debug('开始监控文件变更', { path: this.filePath });
    
    this.watcher = fsWatch(this.filePath, async (eventType: string) => {
      if (eventType === 'change') {
        try {
          this.logger.debug('检测到文件变更，重新加载配置');
          const config = await this.load();
          callback(config);
        } catch (error) {
          this.logger.error('重新加载配置失败', error as Error, { stack: (error as Error).stack });
        }
      }
    });
  }

  /**
   * 停止监听文件变更
   */
  unwatch(): void {
    if (this.watcher) {
      this.logger.debug('停止监控文件变更', { path: this.filePath });
      this.watcher.close();
      this.watcher = undefined as any;
    }
  }

  /**
   * 解析文件内容
   */
  private parseContent(content: string): Record<string, any> {
    switch (this.format) {
      case 'toml':
        return parseToml(content);
      case 'yaml':
        return yaml.parse(content);
      case 'json':
        return JSON.parse(content);
      default:
        throw new Error(`不支持的配置文件格式: ${this.format}`);
    }
  }

  /**
   * 根据文件扩展名检测格式
   */
  private detectFormat(filePath: string): 'toml' | 'yaml' | 'json' {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.toml':
        return 'toml';
      case '.yaml':
      case '.yml':
        return 'yaml';
      case '.json':
        return 'json';
      default:
        throw new Error(`无法从文件扩展名检测格式: ${ext}`);
    }
  }
}
