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

import type { Node } from '@modular-agent/types';
import type { Edge } from '@modular-agent/types';
import type { WorkflowDefinition } from '@modular-agent/types';
import type { NodeTemplate } from '@modular-agent/types';
import type { TriggerTemplate } from '@modular-agent/types';
import type { Script } from '@modular-agent/types';
import type { LLMProfile } from '@modular-agent/types';

/**
 * 配置格式
 */
export type ConfigFormat =
  | 'toml'   /** TOML格式 */
  | 'json';  /** JSON格式 */

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
 * LLM Profile配置文件格式
 *
 * 说明：直接复用 LLMProfile 类型，完全一致
 */
export type LLMProfileConfigFile = LLMProfile;

/**
 * 提示词模板配置文件格式
 */
export interface PromptTemplateConfigFile {
  /** 模板ID */
  id: string;
  /** 模板名称 */
  name?: string;
  /** 模板描述 */
  description?: string;
  /** 模板类别 */
  category?: 'system' | 'rules' | 'user-command' | 'tools' | 'composite';
  /** 模板内容（覆盖默认模板） */
  content?: string;
  /** 变量定义（合并到默认模板） */
  variables?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    required: boolean;
    description?: string;
    defaultValue?: any;
  }>;
  /** 引用的片段ID列表（合并到默认模板） */
  fragments?: string[];
}

/**
 * 配置类型
 */
export type ConfigType =
  | 'workflow'           /** 工作流配置 */
  | 'node_template'      /** 节点模板配置 */
  | 'trigger_template'   /** 触发器模板配置 */
  | 'script'             /** 脚本配置 */
  | 'llm_profile'        /** LLM Profile配置 */
  | 'prompt_template';   /** 提示词模板配置 */

/**
 * 通用配置文件类型
 */
export type ConfigFile =
  | WorkflowConfigFile
  | NodeTemplateConfigFile
  | TriggerTemplateConfigFile
  | ScriptConfigFile
  | LLMProfileConfigFile
  | PromptTemplateConfigFile;

/**
 * 解析后的配置对象（通用版本）
 */
export interface ParsedConfig<T extends ConfigType = ConfigType> {
  /** 配置类型 */
  configType: T;
  /** 配置格式 */
  format: ConfigFormat;
  /** 配置文件内容 */
  config: T extends 'workflow' ? WorkflowConfigFile :
  T extends 'node_template' ? NodeTemplateConfigFile :
  T extends 'trigger_template' ? TriggerTemplateConfigFile :
  T extends 'script' ? ScriptConfigFile :
  T extends 'llm_profile' ? LLMProfileConfigFile :
  T extends 'prompt_template' ? PromptTemplateConfigFile :
  ConfigFile;
  /** 原始内容 */
  rawContent: string;
}

// 向后兼容的类型别名
export type ParsedWorkflowConfig = ParsedConfig<'workflow'>;
export type ParsedNodeTemplateConfig = ParsedConfig<'node_template'>;
export type ParsedTriggerTemplateConfig = ParsedConfig<'trigger_template'>;
export type ParsedScriptConfig = ParsedConfig<'script'>;
export type ParsedLLMProfileConfig = ParsedConfig<'llm_profile'>;
export type ParsedPromptTemplateConfig = ParsedConfig<'prompt_template'>;

/**
 * 配置解析器接口
 *
 * 设计原则：
 * - 只负责配置内容的解析和验证，不涉及文件I/O操作
 * - 文件读取等I/O操作由应用层负责
 */
export interface IConfigParser {
  /**
   * 解析配置文件内容
   * @param content 配置文件内容
   * @param format 配置格式
   * @param configType 配置类型（可选，默认为WORKFLOW）
   * @returns 解析后的配置对象
   */
  parse<T extends ConfigType = 'workflow'>(
    content: string,
    format: ConfigFormat,
    configType?: T
  ): ParsedConfig<T>;

  /**
   * 验证配置的有效性
   * @param config 解析后的配置
   * @returns 验证结果
   */
  validate<T extends ConfigType>(config: ParsedConfig<T>): any;

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
  ): ParsedConfig<T>;
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
