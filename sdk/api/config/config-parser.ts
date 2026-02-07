/**
 * 配置解析器主类
 * 整合TOML/JSON解析、验证和转换功能
 */

import type { ParsedConfig, IConfigParser, ValidationResult } from './types';
import { ConfigFormat } from './types';
import type { WorkflowDefinition } from '../../types/workflow';
import { TomlParser } from './toml-parser';
import { JsonParser } from './json-parser';
import { ConfigValidator } from './config-validator';
import { ConfigTransformer } from './config-transformer';
import * as path from 'path';

/**
 * 配置解析器类
 */
export class ConfigParser implements IConfigParser {
  private tomlParser: TomlParser;
  private jsonParser: JsonParser;
  private validator: ConfigValidator;
  private transformer: ConfigTransformer;

  constructor() {
    this.tomlParser = new TomlParser();
    this.jsonParser = new JsonParser();
    this.validator = new ConfigValidator();
    this.transformer = new ConfigTransformer();
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
        workflowConfig = this.tomlParser.parse(content);
        break;
      case ConfigFormat.JSON:
        workflowConfig = this.jsonParser.parse(content);
        break;
      default:
        throw new Error(`不支持的配置格式: ${format}`);
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
      if (error instanceof Error) {
        throw new Error(`加载配置文件失败: ${error.message}`);
      }
      throw new Error('加载配置文件失败: 未知错误');
    }
  }

  /**
   * 验证配置的有效性
   * @param config 解析后的配置
   * @returns 验证结果
   */
  validate(config: ParsedConfig): ValidationResult {
    return this.validator.validate(config);
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
    if (!validationResult.valid) {
      throw new Error(`配置验证失败:\n${validationResult.errors.join('\n')}`);
    }

    // 输出警告信息
    if (validationResult.warnings.length > 0) {
      console.warn('配置警告:');
      validationResult.warnings.forEach(warning => {
        console.warn(`  - ${warning}`);
      });
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
    if (!validationResult.valid) {
      throw new Error(`配置验证失败:\n${validationResult.errors.join('\n')}`);
    }

    // 输出警告信息
    if (validationResult.warnings.length > 0) {
      console.warn('配置警告:');
      validationResult.warnings.forEach(warning => {
        console.warn(`  - ${warning}`);
      });
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
        return this.jsonParser.stringify(configFile, true);
      case ConfigFormat.TOML:
        return this.tomlParser.stringify(configFile);
      default:
        throw new Error(`不支持的配置格式: ${format}`);
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
      if (error instanceof Error) {
        throw new Error(`保存配置文件失败: ${error.message}`);
      }
      throw new Error('保存配置文件失败: 未知错误');
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
        throw new Error(`无法识别的配置文件扩展名: ${ext}`);
    }
  }

  /**
   * 获取TOML解析器实例
   * @returns TOML解析器
   */
  getTomlParser(): TomlParser {
    return this.tomlParser;
  }

  /**
   * 获取JSON解析器实例
   * @returns JSON解析器
   */
  getJsonParser(): JsonParser {
    return this.jsonParser;
  }

  /**
   * 获取验证器实例
   * @returns 配置验证器
   */
  getValidator(): ConfigValidator {
    return this.validator;
  }

  /**
   * 获取转换器实例
   * @returns 配置转换器
   */
  getTransformer(): ConfigTransformer {
    return this.transformer;
  }
}