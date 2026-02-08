/**
 * 工作流配置加载器
 * 负责解析和转换工作流配置
 *
 * 设计原则：
 * - 无状态设计，不持有任何配置数据
 * - 不直接操作注册表
 * - 仅提供配置解析和转换功能
 * - 不涉及文件 I/O，由应用层负责
 */

import type { WorkflowDefinition } from '../../../types/workflow';
import { ConfigFormat } from '../types';
import { ConfigType } from '../types';
import { BaseConfigLoader } from './base-loader';
import { ConfigParser } from '../config-parser';
import type { ParsedConfig } from '../types';

/**
 * 工作流配置加载器
 */
export class WorkflowLoader extends BaseConfigLoader<ConfigType.WORKFLOW> {
  private workflowParser: ConfigParser;

  constructor() {
    super(ConfigType.WORKFLOW);
    this.workflowParser = new ConfigParser();
  }

  /**
   * 从内容解析并转换为WorkflowDefinition
   * @param content 配置文件内容
   * @param format 配置格式
   * @param parameters 运行时参数（用于模板替换）
   * @returns WorkflowDefinition
   */
  parseAndTransform(
    content: string,
    format: ConfigFormat,
    parameters?: Record<string, any>
  ): WorkflowDefinition {
    return this.workflowParser.parseAndTransform(content, format, parameters);
  }

  /**
   * 验证工作流配置
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 验证结果
   */
  validate(content: string, format: ConfigFormat) {
    const parsed = this.parseFromContent(content, format);
    return this.workflowParser.validate(parsed);
  }

  /**
   * 从内容解析配置
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 解析后的配置对象
   */
  parse(content: string, format: ConfigFormat): ParsedConfig<ConfigType.WORKFLOW> {
    return this.parseFromContent(content, format);
  }
}