/**
 * 文件组织器接口
 * 
 * 负责将多个配置文件组织为一个配置对象
 * 与ConfigProcessor不同，FileOrganizer只处理文件组织，不处理配置内容转换
 */

import { ConfigFile } from '../loading/types';

/**
 * 文件组织器接口
 */
export interface IFileOrganizer {
  /**
   * 组织配置文件
   * 
   * @param files - 配置文件列表
   * @returns 组织后的配置对象
   */
  organize(files: ConfigFile[]): Record<string, any>;
}