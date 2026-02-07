/**
 * 配置模块入口文件
 * 导出所有配置解析相关的类和类型
 *
 * 设计原则：
 * - 配置验证使用 sdk/core/validation 中的 WorkflowValidator
 * - 本模块只负责配置文件的解析和转换
 */

// 类型定义
export {
  ConfigFormat,
  NodeConfigFile,
  EdgeConfigFile,
  WorkflowConfigFile,
  ParsedConfig,
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