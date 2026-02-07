/**
 * 工作流配置加载器
 * 负责加载和导出工作流配置文件
 */

import type { WorkflowDefinition } from '../../../types/workflow';
import { ConfigFormat } from '../types';
import { ConfigType } from '../types';
import { BaseConfigLoader } from './base-loader';
import { ConfigParser } from '../config-parser';

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
   * 加载并转换为WorkflowDefinition
   * @param filePath 文件路径
   * @param parameters 运行时参数（用于模板替换）
   * @returns WorkflowDefinition
   */
  async loadAndTransform(
    filePath: string,
    parameters?: Record<string, any>
  ): Promise<WorkflowDefinition> {
    return this.workflowParser.loadAndTransform(filePath, parameters);
  }

  /**
   * 从内容加载并转换为WorkflowDefinition
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
   * 导出工作流为配置文件
   * @param workflowDef 工作流定义
   * @param format 配置格式
   * @returns 配置文件内容字符串
   */
  override exportToContent(workflowDef: WorkflowDefinition, format: ConfigFormat): string {
    return this.workflowParser.exportWorkflow(workflowDef, format);
  }

  /**
   * 保存工作流为配置文件
   * @param workflowDef 工作流定义
   * @param filePath 文件路径
   */
  async saveWorkflow(workflowDef: WorkflowDefinition, filePath: string): Promise<void> {
    await this.workflowParser.saveWorkflow(workflowDef, filePath);
  }

  /**
   * 验证工作流配置
   * @param filePath 文件路径
   * @returns 验证结果
   */
  async validate(filePath: string) {
    const parsed = await this.loadFromFile(filePath);
    // 将 ParsedConfigEx 转换为 ParsedConfig
    const parsedConfig = {
      format: parsed.format,
      workflowConfig: parsed.config as WorkflowDefinition,
      rawContent: parsed.rawContent
    };
    return this.workflowParser.validate(parsedConfig);
  }
}