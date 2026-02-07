/**
 * 配置模块入口文件
 * 导出所有配置解析相关的类和类型
 *
 * 设计原则：
 * - 配置验证使用 sdk/core/validation 中的 WorkflowValidator
 * - 本模块只负责配置文件的解析和转换
 * - 支持多种配置类型：工作流、节点模板、触发器模板、脚本
 */

// 类型定义
export {
  ConfigFormat,
  ConfigType,
  NodeConfigFile,
  EdgeConfigFile,
  WorkflowConfigFile,
  NodeTemplateConfigFile,
  TriggerTemplateConfigFile,
  ScriptConfigFile,
  ConfigFile,
  ParsedConfig,
  ParsedWorkflowConfig,
  ParsedNodeTemplateConfig,
  ParsedTriggerTemplateConfig,
  ParsedScriptConfig,
  IConfigParser,
  IConfigTransformer
} from './types';

// 解析器
export { ConfigParser } from './config-parser';

// JSON解析函数
export {
  parseJson,
  stringifyJson,
  validateJsonSyntax,
  loadJsonFromFile,
  saveJsonToFile
} from './json-parser';

// TOML解析函数
export {
  parseToml,
  validateTomlSyntax
} from './toml-parser';

// 转换器
export { ConfigTransformer } from './config-transformer';

// 配置管理器
export { ConfigManager, configManager } from './config-manager';
export type { LoadFromDirectoryOptions, LoadFromDirectoryResult } from './config-manager';

// 加载器
export { BaseConfigLoader } from './loaders/base-loader';
export { WorkflowLoader } from './loaders/workflow-loader';
export { NodeTemplateLoader } from './loaders/node-template-loader';
export { TriggerTemplateLoader } from './loaders/trigger-template-loader';
export { ScriptLoader } from './loaders/script-loader';

// 验证器
// 验证工具函数导出
export {
  validateRequiredFields,
  validateStringField,
  validateNumberField,
  validateBooleanField,
  validateArrayField,
  validateObjectField,
  validateEnumField
} from './validators/base-validator';

// 配置验证函数导出
export { validateWorkflowConfig } from './validators/workflow-validator';
export { validateNodeTemplateConfig } from './validators/node-template-validator';
export { validateTriggerTemplateConfig } from './validators/trigger-template-validator';
export { validateScriptConfig } from './validators/script-validator';