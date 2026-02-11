/**
 * 配置模块入口文件
 * 导出所有配置解析相关的类和类型
 *
 * 设计原则：
 * - 无状态设计，所有函数都是纯函数
 * - 配置验证使用 sdk/core/validation 中的验证器
 * - 本模块只负责配置内容的解析和转换
 * - 不涉及文件 I/O，文件读取由应用层负责
 * - 不直接操作注册表，配置注册由应用层负责
 * - 支持多种配置类型：工作流、节点模板、触发器模板、脚本、LLM Profile
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
  LLMProfileConfigFile,
  ConfigFile,
  ParsedConfig,
  ParsedWorkflowConfig,
  ParsedNodeTemplateConfig,
  ParsedTriggerTemplateConfig,
  ParsedScriptConfig,
  ParsedLLMProfileConfig,
  IConfigParser,
  IConfigTransformer
} from '@modular-agent/types';

// 解析器
export { ConfigParser } from './config-parser';

// 配置工具函数
export {
  detectConfigFormat,
  readConfigFile,
  loadConfigContent
} from './config-utils';

// JSON解析函数
export {
  parseJson,
  stringifyJson,
  validateJsonSyntax
} from './json-parser';

// TOML解析函数
export {
  parseToml,
  validateTomlSyntax
} from './toml-parser';

// 转换器
export { ConfigTransformer } from './config-transformer';

// 配置解析函数（推荐使用）
export {
  parseWorkflow,
  validateWorkflow as validateWorkflowContent,
  parseWorkflowConfig,
  parseBatchWorkflows,
  parseNodeTemplate,
  parseBatchNodeTemplates,
  parseTriggerTemplate,
  parseBatchTriggerTemplates,
  parseScript,
  parseBatchScripts
} from './parsers';

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
export { validateLLMProfileConfig } from './validators/llm-profile-validator';

// 批量验证函数导出
export {
  validateBatchWorkflows,
  validateBatchNodeTemplates,
  validateBatchTriggerTemplates,
  validateBatchScripts
} from './validators/batch-validators';

// 配置处理函数导出（纯函数）
export {
  validateWorkflow,
  transformWorkflow,
  exportWorkflow,
  validateNodeTemplate,
  validateScript,
  validateTriggerTemplate,
  validateLLMProfile
} from './processors';