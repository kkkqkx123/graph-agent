/**
 * 拆分文件组织器
 * 
 * 从文件名中提取配置键，将多个配置文件合并为一个配置对象
 * 例如：fast_pool.toml -> { pools: { fast_pool: {...} } }
 */

import * as path from 'path';
import { ConfigFile } from '../loading/types';
import { IFileOrganizer } from './file-organizer.interface';
import { ILogger } from '../../../domain/common/types';

/**
 * 拆分文件组织器选项
 */
export interface SplitFileOrganizerOptions {
  /**
   * 拆分配置的目录映射
   * key: 配置键（如 'pools' 或 'taskGroups'）
   * value: 目录名称（如 'pools' 或 'task_groups'）
   */
  directoryMapping?: Record<string, string>;
}

/**
 * 拆分文件组织器
 */
export class SplitFileOrganizer implements IFileOrganizer {
  private readonly logger: ILogger;
  private readonly directoryMapping: Record<string, string>;

  constructor(logger: ILogger, options: SplitFileOrganizerOptions = {}) {
    this.logger = logger;
    this.directoryMapping = options.directoryMapping || {
      'pools': 'pools',
      'taskGroups': 'task_groups',
    };
  }

  /**
   * 组织配置文件
   * 
   * 从文件名中提取配置键，将多个文件合并为一个配置对象
   */
  organize(files: ConfigFile[]): Record<string, any> {
    this.logger.debug('组织拆分配置文件', { fileCount: files.length });

    const result: Record<string, any> = {};
    const organizedFiles: Record<string, Record<string, any>> = {};

    // 初始化配置对象
    for (const configKey of Object.keys(this.directoryMapping)) {
      organizedFiles[configKey] = {};
    }

    // 按配置键分组文件
    for (const file of files) {
      const configKey = this.getConfigKey(file.path);
      if (configKey) {
        const fileKey = this.extractFileKey(file.path);
        if (fileKey) {
          // 从file.metadata.content中提取配置内容
          const content = (file.metadata as any)?.content || {};
          if (!organizedFiles[configKey]) {
            organizedFiles[configKey] = {};
          }
          organizedFiles[configKey][fileKey] = content;
          this.logger.debug('添加文件到配置', { configKey, fileKey });
        }
      }
    }

    // 构建最终配置
    for (const [configKey, filesMap] of Object.entries(organizedFiles)) {
      if (Object.keys(filesMap).length > 0) {
        result[configKey] = filesMap;
        this.logger.debug('配置组织完成', { configKey, count: Object.keys(filesMap).length });
      }
    }

    return result;
  }

  /**
   * 从文件路径获取配置键
   * 
   * 例如：configs/llms/pools/fast_pool.toml -> 'pools'
   */
  private getConfigKey(filePath: string): string | null {
    const lowerPath = filePath.toLowerCase();
    
    for (const [configKey, dirName] of Object.entries(this.directoryMapping)) {
      if (lowerPath.includes(`/${dirName}/`) || lowerPath.includes(`\\${dirName}\\`)) {
        return configKey;
      }
    }
    
    return null;
  }

  /**
   * 从文件路径提取文件键
   * 
   * 例如：configs/llms/pools/fast_pool.toml -> 'fast_pool'
   */
  private extractFileKey(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }
}