/**
 * 节点模板配置加载器
 * 负责加载、注册和导出节点模板配置文件
 */

import type { NodeTemplate } from '../../../types/node-template';
import { ConfigFormat } from '../types';
import { ConfigType } from '../types';
import { BaseConfigLoader } from './base-loader';
import { nodeTemplateRegistry } from '../../../core/services/node-template-registry';
import { ConfigurationError } from '../../../types/errors';

/**
 * 节点模板配置加载器
 */
export class NodeTemplateLoader extends BaseConfigLoader<ConfigType.NODE_TEMPLATE> {
  constructor() {
    super(ConfigType.NODE_TEMPLATE);
  }

  /**
   * 加载并注册节点模板
   * @param filePath 文件路径
   * @returns 节点模板
   */
  async loadAndRegister(filePath: string): Promise<NodeTemplate> {
    const config = await this.loadFromFile(filePath);
    const template = config.config as NodeTemplate;

    try {
      nodeTemplateRegistry.register(template);
      return template;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigurationError(
          `注册节点模板失败: ${error.message}`,
          filePath,
          { originalError: error.message }
        );
      }
      throw new ConfigurationError('注册节点模板失败: 未知错误');
    }
  }

  /**
   * 从内容加载并注册节点模板
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 节点模板
   */
  loadAndRegisterFromContent(content: string, format: ConfigFormat): NodeTemplate {
    const config = this.loadFromContent(content, format);
    const template = config.config as NodeTemplate;

    try {
      nodeTemplateRegistry.register(template);
      return template;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigurationError(
          `注册节点模板失败: ${error.message}`,
          undefined,
          { originalError: error.message }
        );
      }
      throw new ConfigurationError('注册节点模板失败: 未知错误');
    }
  }

  /**
   * 批量加载并注册节点模板
   * @param filePaths 文件路径数组
   * @returns 节点模板数组
   */
  async loadBatchAndRegister(filePaths: string[]): Promise<NodeTemplate[]> {
    const templates: NodeTemplate[] = [];
    for (const filePath of filePaths) {
      const template = await this.loadAndRegister(filePath);
      templates.push(template);
    }
    return templates;
  }

  /**
   * 导出节点模板为配置文件
   * @param template 节点模板
   * @param format 配置格式
   * @returns 配置文件内容字符串
   */
  override exportToContent(template: NodeTemplate, format: ConfigFormat): string {
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
   * 从注册表获取节点模板
   * @param name 节点模板名称
   * @returns 节点模板
   */
  getTemplate(name: string): NodeTemplate | null {
    return nodeTemplateRegistry.get(name) ?? null;
  }

  /**
   * 获取所有节点模板
   * @returns 节点模板数组
   */
  getAllTemplates(): NodeTemplate[] {
    return nodeTemplateRegistry.list();
  }

  /**
   * 搜索节点模板
   * @param keyword 搜索关键词
   * @returns 节点模板数组
   */
  searchTemplates(keyword: string): NodeTemplate[] {
    return nodeTemplateRegistry.search(keyword);
  }
}