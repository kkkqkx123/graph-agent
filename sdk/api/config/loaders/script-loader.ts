/**
 * 脚本配置加载器
 * 负责解析脚本配置
 *
 * 设计原则：
 * - 无状态设计，不持有任何配置数据
 * - 不直接操作注册表
 * - 仅提供配置解析功能
 * - 不涉及文件 I/O，由应用层负责
 */

import type { Script } from '../../../types/code';
import { ConfigFormat } from '../types';
import { ConfigType } from '../types';
import { BaseConfigLoader } from './base-loader';

/**
 * 脚本配置加载器
 */
export class ScriptLoader extends BaseConfigLoader<ConfigType.SCRIPT> {
  constructor() {
    super(ConfigType.SCRIPT);
  }

  /**
   * 从内容解析脚本
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 脚本
   */
  parseScript(content: string, format: ConfigFormat): Script {
    const config = this.parseFromContent(content, format);
    return config.config as Script;
  }

  /**
   * 批量解析脚本
   * @param contents 配置内容数组
   * @param formats 配置格式数组
   * @returns 脚本数组
   */
  parseBatchScripts(contents: string[], formats: ConfigFormat[]): Script[] {
    const configs = this.parseBatch(contents, formats);
    return configs.map(c => c.config as Script);
  }
}