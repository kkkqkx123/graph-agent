/**
 * 配置解析器主类
 * 整合TOML/JSON解析、验证和转换功能
 *
 * 设计原则：
 * - 配置验证直接使用 sdk/core/validation 中的 WorkflowValidator
 * - api/config 层只负责配置文件的解析和转换，不实现新的验证逻辑
 */

import type { ParsedConfig, IConfigParser } from './types';
import { ConfigFormat } from './types';
import type { WorkflowDefinition } from '../../types/workflow';
import { parseToml } from './toml-parser';
import { parseJson, stringifyJson } from './json-parser';
import { ConfigTransformer } from './config-transformer';
import { ConfigurationError } from '../../types/errors';
import { WorkflowValidator } from '../../core/validation/workflow-validator';
import * as path from 'path';

/**
 * 配置解析器类
 */
export class ConfigParser implements IConfigParser {
  private transformer: ConfigTransformer;
  private workflowValidator: WorkflowValidator;

  constructor() {
    this.transformer = new ConfigTransformer();
    this.workflowValidator = new WorkflowValidator();
  }

  /**
   * 解析配置文件内容
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 解析后的配置对象
   */
  parse(content: string, format: ConfigFormat): ParsedConfig {
    let workflowConfig;

    // 根据格式选择解析器
    switch (format) {
      case ConfigFormat.TOML:
        workflowConfig = parseToml(content);
        break;
      case ConfigFormat.JSON:
        workflowConfig = parseJson(content);
        break;
      default:
        throw new ConfigurationError(
          `不支持的配置格式: ${format}`,
          format
        );
    }

    return {
      format,
      workflowConfig,
      rawContent: content
    };
  }

  /**
   * 从文件路径加载并解析配置
   * @param filePath 文件路径
   * @returns 解析后的配置对象
   */
  async loadFromFile(filePath: string): Promise<ParsedConfig> {
    const fs = await import('fs/promises');

    try {
      // 读取文件内容
      const content = await fs.readFile(filePath, 'utf-8');

      // 根据文件扩展名检测格式
      const format = this.detectFormat(filePath);

      // 解析配置
      return this.parse(content, format);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ConfigurationError(
          `加载配置文件失败: ${error.message}`,
          filePath,
          { originalError: error.message }
        );
      }
      throw new ConfigurationError('加载配置文件失败: 未知错误');
    }
  }

  /**
   * 验证配置的有效性
   * 使用 WorkflowValidator 进行验证
   * @param config 解析后的配置
   * @returns 验证结果
   */
  validate(config: ParsedConfig) {
    return this.workflowValidator.validate(config.workflowConfig);
  }

  /**
   * 解析并转换为WorkflowDefinition
   * @param content 配置文件内容
   * @param format 配置格式
   * @param parameters 运行时参数
   * @returns WorkflowDefinition
   */
  parseAndTransform(
    content: string,
    format: ConfigFormat,
    parameters?: Record<string, any>
  ): WorkflowDefinition {
    // 解析配置
    const parsedConfig = this.parse(content, format);

    // 验证配置
    const validationResult = this.validate(parsedConfig);
    if (validationResult.isErr()) {
      const errorMessages = validationResult.error.map(err => err.message).join('\n');
      throw new ConfigurationError(
        `配置验证失败:\n${errorMessages}`,
        undefined,
        { errors: validationResult.error }
      );
    }

    // 转换为WorkflowDefinition
    return this.transformer.transformToWorkflow(parsedConfig.workflowConfig, parameters);
  }

  /**
   * 从文件加载并转换为WorkflowDefinition
   * @param filePath 文件路径
   * @param parameters 运行时参数
   * @returns WorkflowDefinition
   */
  async loadAndTransform(
    filePath: string,
    parameters?: Record<string, any>
  ): Promise<WorkflowDefinition> {
    // 加载配置
    const parsedConfig = await this.loadFromFile(filePath);

    // 验证配置
    const validationResult = this.validate(parsedConfig);
    if (validationResult.isErr()) {
      const errorMessages = validationResult.error.map(err => err.message).join('\n');
      throw new ConfigurationError(
        `配置验证失败:\n${errorMessages}`,
        undefined,
        { errors: validationResult.error }
      );
    }

    // 转换为WorkflowDefinition
    return this.transformer.transformToWorkflow(parsedConfig.workflowConfig, parameters);
  }

  /**
   * 将WorkflowDefinition导出为配置文件
   * @param workflowDef 工作流定义
   * @param format 配置格式
   * @returns 配置文件内容字符串
   */
  exportWorkflow(workflowDef: WorkflowDefinition, format: ConfigFormat): string {
    // 转换为配置文件格式
    const configFile = this.transformer.transformFromWorkflow(workflowDef);

    // 根据格式序列化
    switch (format) {
      case ConfigFormat.JSON:
        return stringifyJson(configFile, true);
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
   * 将WorkflowDefinition保存为配置文件
   * @param workflowDef 工作流定义
   * @param filePath 文件路径
   */
  async saveWorkflow(workflowDef: WorkflowDefinition, filePath: string): Promise<void> {
    const fs = await import('fs/promises');

    try {
      // 根据文件扩展名检测格式
      const format = this.detectFormat(filePath);

      // 导出配置
      const content = this.exportWorkflow(workflowDef, format);

      // 保存文件
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ConfigurationError(
          `保存配置文件失败: ${error.message}`,
          filePath,
          { originalError: error.message }
        );
      }
      throw new ConfigurationError('保存配置文件失败: 未知错误');
    }
  }

  /**
   * 根据文件扩展名检测配置格式
   * @param filePath 文件路径
   * @returns 配置格式
   */
  private detectFormat(filePath: string): ConfigFormat {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.toml':
        return ConfigFormat.TOML;
      case '.json':
        return ConfigFormat.JSON;
      default:
        throw new ConfigurationError(
          `无法识别的配置文件扩展名: ${ext}`,
          ext
        );
    }
  }

  /**
   * 获取转换器实例
   * @returns 配置转换器
   */
  getTransformer(): ConfigTransformer {
    return this.transformer;
  }
}