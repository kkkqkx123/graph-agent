/**
 * 配置模块类型定义
 * 定义配置文件解析和转换相关的类型
 *
 * 设计原则：
 * - 完全复用 sdk/types 中的核心类型定义
 * - 配置文件格式与对应的类型定义保持完全一致
 * - 所有字段都是静态定义，无需移除任何字段
 * - 避免重复定义，确保类型安全
 *
 * 说明：
 * - WorkflowDefinition 是配置文件解析后的静态定义
 * - 配置文件直接映射到对应的类型，类型完全一致
 * - 不需要任何类型转换或字段移除
 * - 支持多种配置类型：工作流、节点模板、触发器模板、脚本
 */

import type { Node } from '../../types/node';
import type { Edge } from '../../types/edge';
import type { WorkflowDefinition } from '../../types/workflow';
import type { NodeTemplate } from '../../types/node-template';
import type { TriggerTemplate } from '../../types/trigger-template';
import type { Script } from '../../types/code';

/**
 * 配置格式枚举
 */
export enum ConfigFormat {
  TOML = 'toml',
  JSON = 'json'
}

/**
 * 节点配置文件格式
 * 
 * 说明：直接复用 Node 类型，完全一致
 */
export type NodeConfigFile = Node;

/**
 * 边配置文件格式
 * 
 * 说明：直接复用 Edge 类型，完全一致
 */
export type EdgeConfigFile = Edge;

/**
 * 工作流配置文件格式
 *
 * 说明：直接复用 WorkflowDefinition 类型，完全一致
 */
export type WorkflowConfigFile = WorkflowDefinition;

/**
 * 节点模板配置文件格式
 *
 * 说明：直接复用 NodeTemplate 类型，完全一致
 */
export type NodeTemplateConfigFile = NodeTemplate;

/**
 * 触发器模板配置文件格式
 *
 * 说明：直接复用 TriggerTemplate 类型，完全一致
 */
export type TriggerTemplateConfigFile = TriggerTemplate;

/**
 * 脚本配置文件格式
 *
 * 说明：直接复用 Script 类型，完全一致
 */
export type ScriptConfigFile = Script;

/**
 * 配置类型枚举
 */
export enum ConfigType {
  WORKFLOW = 'workflow',
  NODE_TEMPLATE = 'node_template',
  TRIGGER_TEMPLATE = 'trigger_template',
  SCRIPT = 'script'
}

/**
 * 通用配置文件类型
 */
export type ConfigFile =
  | WorkflowConfigFile
  | NodeTemplateConfigFile
  | TriggerTemplateConfigFile
  | ScriptConfigFile;

/**
 * 解析后的配置对象（通用版本）
 */
export interface ParsedConfig<T extends ConfigType = ConfigType> {
  /** 配置类型 */
  configType: T;
  /** 配置格式 */
  format: ConfigFormat;
  /** 配置文件内容 */
  config: T extends ConfigType.WORKFLOW ? WorkflowConfigFile :
           T extends ConfigType.NODE_TEMPLATE ? NodeTemplateConfigFile :
           T extends ConfigType.TRIGGER_TEMPLATE ? TriggerTemplateConfigFile :
           T extends ConfigType.SCRIPT ? ScriptConfigFile :
           ConfigFile;
  /** 原始内容 */
  rawContent: string;
}

// 向后兼容的类型别名
export type ParsedWorkflowConfig = ParsedConfig<ConfigType.WORKFLOW>;
export type ParsedNodeTemplateConfig = ParsedConfig<ConfigType.NODE_TEMPLATE>;
export type ParsedTriggerTemplateConfig = ParsedConfig<ConfigType.TRIGGER_TEMPLATE>;
export type ParsedScriptConfig = ParsedConfig<ConfigType.SCRIPT>;

/**
 * 配置解析器接口
 */
export interface IConfigParser {
  /**
   * 解析配置文件内容
   * @param content 配置文件内容
   * @param format 配置格式
   * @param configType 配置类型（可选，默认为WORKFLOW）
   * @returns 解析后的配置对象
   */
  parse<T extends ConfigType = ConfigType.WORKFLOW>(
    content: string,
    format: ConfigFormat,
    configType?: T
  ): ParsedConfig<T>;

  /**
   * 从文件路径加载并解析配置
   * @param filePath 文件路径
   * @param configType 配置类型（可选，默认为WORKFLOW）
   * @returns 解析后的配置对象
   */
  loadFromFile<T extends ConfigType = ConfigType.WORKFLOW>(
    filePath: string,
    configType?: T
  ): Promise<ParsedConfig<T>>;
}

/**
 * 配置转换器接口
 */
export interface IConfigTransformer {
  /**
   * 将配置文件格式转换为WorkflowDefinition
   * @param configFile 解析后的配置文件
   * @param parameters 运行时参数（用于模板替换）
   * @returns WorkflowDefinition
   */
  transformToWorkflow(
    configFile: WorkflowConfigFile,
    parameters?: Record<string, any>
  ): WorkflowDefinition;
}