/**
 * 配置模块类型定义
 * 定义配置文件解析和转换相关的类型
 */

import type { NodeType } from '../../types/node';
import type { WorkflowVariable, WorkflowConfig, WorkflowMetadata } from '../../types/workflow';
import type { WorkflowTrigger } from '../../types/trigger';
import type { TriggerReference } from '../../types/trigger-template';

/**
 * 配置格式枚举
 */
export enum ConfigFormat {
  TOML = 'toml',
  JSON = 'json'
}

/**
 * 参数定义类型
 */
export interface ParameterDefinition {
  /** 参数类型 */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** 默认值 */
  default?: any;
  /** 是否必需 */
  required?: boolean;
  /** 参数描述 */
  description?: string;
}

/**
 * 节点配置文件格式
 */
export interface NodeConfigFile {
  /** 节点ID */
  id: string;
  /** 节点类型 */
  type: NodeType;
  /** 节点名称 */
  name: string;
  /** 节点配置 */
  config: Record<string, any>;
}

/**
 * 边配置文件格式
 */
export interface EdgeConfigFile {
  /** 源节点ID */
  from: string;
  /** 目标节点ID */
  to: string;
  /** 条件表达式（可选） */
  condition?: string;
}

/**
 * 工作流配置文件格式
 */
export interface WorkflowConfigFile {
  /** 工作流配置 */
  workflow: {
    /** 工作流ID */
    id: string;
    /** 工作流名称 */
    name: string;
    /** 工作流描述 */
    description?: string;
    /** 工作流版本 */
    version: string;
    /** 工作流类型 */
    type?: 'base' | 'feature' | 'business';
    /** 参数定义 */
    parameters?: Record<string, ParameterDefinition>;
    /** 节点数组 */
    nodes: NodeConfigFile[];
    /** 边数组 */
    edges: EdgeConfigFile[];
    /** 工作流变量 */
    variables?: WorkflowVariable[];
    /** 触发器 */
    triggers?: (WorkflowTrigger | TriggerReference)[];
    /** 工作流配置 */
    config?: WorkflowConfig;
    /** 工作流元数据 */
    metadata?: WorkflowMetadata;
  };
}

/**
 * 解析后的配置对象
 */
export interface ParsedConfig {
  /** 配置格式 */
  format: ConfigFormat;
  /** 工作流配置文件 */
  workflowConfig: WorkflowConfigFile;
  /** 原始内容 */
  rawContent: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings: string[];
}

/**
 * 配置解析器接口
 */
export interface IConfigParser {
  /**
   * 解析配置文件内容
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 解析后的配置对象
   */
  parse(content: string, format: ConfigFormat): ParsedConfig;

  /**
   * 从文件路径加载并解析配置
   * @param filePath 文件路径
   * @returns 解析后的配置对象
   */
  loadFromFile(filePath: string): Promise<ParsedConfig>;

  /**
   * 验证配置的有效性
   * @param config 解析后的配置
   * @returns 验证结果
   */
  validate(config: ParsedConfig): ValidationResult;
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
  ): any;
}