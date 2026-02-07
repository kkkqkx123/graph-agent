/**
 * 配置模块类型定义
 * 定义配置文件解析和转换相关的类型
 * 
 * 设计原则：
 * - 完全复用 sdk/types 中的核心类型定义
 * - 配置文件格式与 WorkflowDefinition 保持完全一致
 * - 所有字段都是静态定义，无需移除任何字段
 * - 避免重复定义，确保类型安全
 * 
 * 说明：
 * - WorkflowDefinition 是配置文件解析后的静态定义
 * - 配置文件直接映射到 WorkflowDefinition，类型完全一致
 * - 不需要任何类型转换或字段移除
 */

import type { Node } from '../../types/node';
import type { Edge } from '../../types/edge';
import type { WorkflowDefinition } from '../../types/workflow';

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