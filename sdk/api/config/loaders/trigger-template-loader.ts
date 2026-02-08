/**
 * 触发器模板配置加载器
 * 负责解析触发器模板配置
 *
 * 设计原则：
 * - 无状态设计，不持有任何配置数据
 * - 不直接操作注册表
 * - 仅提供配置解析功能
 * - 不涉及文件 I/O，由应用层负责
 */

import type { TriggerTemplate } from '../../../types/trigger-template';
import { ConfigFormat } from '../types';
import { ConfigType } from '../types';
import { BaseConfigLoader } from './base-loader';

/**
 * 触发器模板配置加载器
 */
export class TriggerTemplateLoader extends BaseConfigLoader<ConfigType.TRIGGER_TEMPLATE> {
  constructor() {
    super(ConfigType.TRIGGER_TEMPLATE);
  }

  /**
   * 从内容解析触发器模板
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 触发器模板
   */
  parseTemplate(content: string, format: ConfigFormat): TriggerTemplate {
    const config = this.parseFromContent(content, format);
    return config.config as TriggerTemplate;
  }

  /**
   * 批量解析触发器模板
   * @param contents 配置内容数组
   * @param formats 配置格式数组
   * @returns 触发器模板数组
   */
  parseBatchTemplates(contents: string[], formats: ConfigFormat[]): TriggerTemplate[] {
    const configs = this.parseBatch(contents, formats);
    return configs.map(c => c.config as TriggerTemplate);
  }
}