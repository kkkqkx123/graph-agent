/**
 * 配置解析器主类
 * 整合TOML/JSON解析、验证功能
 *
 * 设计原则：
 * - 使用纯函数处理器架构，所有处理逻辑都是无状态的纯函数
 * - api/config 层只负责配置内容的解析，不实现文件I/O操作
 * - 验证逻辑委托给processors中的纯函数，纯函数再委托给core层的验证器
 * - ConfigParser是通用模块，不包含任何特定配置类型的业务逻辑
 * - 支持多种配置类型：WORKFLOW, NODE_TEMPLATE, TRIGGER_TEMPLATE, SCRIPT, LLM_PROFILE
 */

import type { ParsedConfig, IConfigParser } from './types';
import { ConfigFormat, ConfigType } from './types';
import type { WorkflowDefinition } from '@modular-agent/types';
import { parseToml } from './toml-parser';
import { parseJson } from './json-parser';
import { ConfigurationError } from '@modular-agent/types';
import {
  validateWorkflow,
  validateNodeTemplate,
  validateScript,
  validateTriggerTemplate,
  validateLLMProfile
} from './processors';

/**
 * 配置解析器类
 */
export class ConfigParser implements IConfigParser {
  constructor() {
    // Handler通过注册表管理，无需在构造函数中初始化
  }

  /**
   * 解析配置文件内容
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 解析后的配置对象
   */
  parse<T extends ConfigType = ConfigType.WORKFLOW>(
    content: string,
    format: ConfigFormat,
    configType?: T
  ): ParsedConfig<T> {
    let config;

    // 根据格式选择解析器
    switch (format) {
      case ConfigFormat.TOML:
        config = parseToml(content);
        break;
      case ConfigFormat.JSON:
        config = parseJson(content);
        break;
      default:
        throw new ConfigurationError(
          `不支持的配置格式: ${format}`,
          format
        );
    }

    return {
      configType: (configType || ConfigType.WORKFLOW) as T,
      format,
      config: config as any,
      rawContent: content
    };
  }

  /**
   * 验证配置的有效性
   * 使用对应的纯函数进行验证
   * @param config 解析后的配置
   * @returns 验证结果
   */
  validate<T extends ConfigType>(config: ParsedConfig<T>) {
    switch (config.configType) {
      case ConfigType.WORKFLOW:
        return validateWorkflow(config as ParsedConfig<ConfigType.WORKFLOW>);
      case ConfigType.NODE_TEMPLATE:
        return validateNodeTemplate(config as ParsedConfig<ConfigType.NODE_TEMPLATE>);
      case ConfigType.SCRIPT:
        return validateScript(config as ParsedConfig<ConfigType.SCRIPT>);
      case ConfigType.TRIGGER_TEMPLATE:
        return validateTriggerTemplate(config as ParsedConfig<ConfigType.TRIGGER_TEMPLATE>);
      case ConfigType.LLM_PROFILE:
        return validateLLMProfile(config as ParsedConfig<ConfigType.LLM_PROFILE>);
      default:
        throw new ConfigurationError(
          `未找到配置类型 ${config.configType} 的处理器`,
          config.configType
        );
    }
  }

  /**
   * 解析并验证配置（通用方法）
   * @param content 配置文件内容
   * @param format 配置格式
   * @param configType 配置类型
   * @returns 验证后的配置对象
   */
  parseAndValidate<T extends ConfigType>(
    content: string,
    format: ConfigFormat,
    configType: T
  ): ParsedConfig<T> {
    // 解析配置
    const parsedConfig = this.parse(content, format, configType);

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

    return parsedConfig;
  }

  /**
   * 解析并转换配置为WorkflowDefinition
   * @param content 配置文件内容
   * @param format 配置格式
   * @param parameters 运行时参数（可选）
   * @returns WorkflowDefinition
   */
  parseAndTransform(
    content: string,
    format: ConfigFormat,
    parameters?: Record<string, any>
  ): WorkflowDefinition {
    const { ConfigTransformer } = require('./config-transformer');
    const { transformWorkflow } = require('./processors/workflow');
    
    // 解析配置
    const parsedConfig = this.parse(content, format, ConfigType.WORKFLOW);
    
    // 转换为WorkflowDefinition
    return transformWorkflow(parsedConfig, parameters);
  }

}
