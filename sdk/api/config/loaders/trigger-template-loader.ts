/**
 * 触发器模板配置加载器
 * 负责加载、注册和导出触发器模板配置文件
 */

import type { TriggerTemplate } from '../../../types/trigger-template';
import { ConfigFormat } from '../types';
import { ConfigType } from '../types';
import { BaseConfigLoader } from './base-loader';
import { triggerTemplateRegistry } from '../../../core/services/trigger-template-registry';
import { ConfigurationError } from '../../../types/errors';

/**
 * 触发器模板配置加载器
 */
export class TriggerTemplateLoader extends BaseConfigLoader<ConfigType.TRIGGER_TEMPLATE> {
  constructor() {
    super(ConfigType.TRIGGER_TEMPLATE);
  }

  /**
   * 加载并注册触发器模板
   * @param filePath 文件路径
   * @returns 触发器模板
   */
  async loadAndRegister(filePath: string): Promise<TriggerTemplate> {
    const config = await this.loadFromFile(filePath);
    const template = config.config as TriggerTemplate;

    try {
      triggerTemplateRegistry.register(template);
      return template;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigurationError(
          `注册触发器模板失败: ${error.message}`,
          filePath,
          { originalError: error.message }
        );
      }
      throw new ConfigurationError('注册触发器模板失败: 未知错误');
    }
  }

  /**
   * 从内容加载并注册触发器模板
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 触发器模板
   */
  loadAndRegisterFromContent(content: string, format: ConfigFormat): TriggerTemplate {
    const config = this.loadFromContent(content, format);
    const template = config.config as TriggerTemplate;

    try {
      triggerTemplateRegistry.register(template);
      return template;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigurationError(
          `注册触发器模板失败: ${error.message}`,
          undefined,
          { originalError: error.message }
        );
      }
      throw new ConfigurationError('注册触发器模板失败: 未知错误');
    }
  }

  /**
   * 批量加载并注册触发器模板
   * @param filePaths 文件路径数组
   * @returns 触发器模板数组
   */
  async loadBatchAndRegister(filePaths: string[]): Promise<TriggerTemplate[]> {
    const templates: TriggerTemplate[] = [];
    for (const filePath of filePaths) {
      const template = await this.loadAndRegister(filePath);
      templates.push(template);
    }
    return templates;
  }

  /**
   * 导出触发器模板为配置文件
   * @param template 触发器模板
   * @param format 配置格式
   * @returns 配置文件内容字符串
   */
  override exportToContent(template: TriggerTemplate, format: ConfigFormat): string {
    switch (format) {
      case ConfigFormat.JSON:
        return JSON.stringify(template, null, 2);
      case ConfigFormat.TOML:
        throw new ConfigurationError(
          'TOML格式不支持导出，请使用JSON格式',
          format,
          { suggestion: '使用 ConfigFormat.JSON 代替' }
        );
      default:
        throw new ConfigurationError(
          `不支持的配置格式: ${format}`,
          format
        );
    }
  }

  /**
   * 从注册表获取触发器模板
   * @param name 触发器模板名称
   * @returns 触发器模板
   */
  getTemplate(name: string): TriggerTemplate | null {
    return triggerTemplateRegistry.get(name) ?? null;
  }

  /**
   * 获取所有触发器模板
   * @returns 触发器模板数组
   */
  getAllTemplates(): TriggerTemplate[] {
    return triggerTemplateRegistry.list();
  }

  /**
   * 搜索触发器模板
   * @param keyword 搜索关键词
   * @returns 触发器模板数组
   */
  searchTemplates(keyword: string): TriggerTemplate[] {
    return triggerTemplateRegistry.search(keyword);
  }
}