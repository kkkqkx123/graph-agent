/**
 * 合并文件组织器
 * 
 * 传统的配置文件合并方式
 * 将多个配置文件深度合并为一个配置对象
 */

import { ConfigFile } from '../loading/types';
import { IFileOrganizer } from './file-organizer.interface';
import { ILogger } from '../../../domain/common/types';

/**
 * 合并文件组织器
 */
export class MergedFileOrganizer implements IFileOrganizer {
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child({ module: 'MergedFileOrganizer' });
  }

  /**
   * 组织配置文件
   * 
   * 使用传统的深度合并方式
   */
  organize(files: ConfigFile[]): Record<string, any> {
    this.logger.debug('组织合并配置文件', { fileCount: files.length });

    // 按优先级排序
    const sortedFiles = files.sort((a, b) => b.priority - a.priority);

    // 深度合并所有配置
    const result = this.deepMergeConfigs(sortedFiles.map(file => file.metadata || {}));

    this.logger.debug('合并配置组织完成');

    return result;
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