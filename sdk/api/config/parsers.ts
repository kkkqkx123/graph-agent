/**
 * 配置解析器函数
 * 提供纯函数式的配置解析接口
 * 
 * 设计原则：
 * - 所有函数都是纯函数
 * - 不持有任何状态
 * - 不涉及文件 I/O
 * - 不操作注册表
 */

import type { WorkflowDefinition } from '../../types/workflow';
import type { NodeTemplate } from '../../types/node-template';
import type { TriggerTemplate } from '../../types/trigger-template';
import type { Script } from '../../types/code';
import { ConfigFormat, ConfigType } from './types';
import type { ParsedConfig } from './types';
import { ConfigParser } from './config-parser';

// 共享的 ConfigParser 实例
const workflowParser = new ConfigParser();
const nodeTemplateParser = new ConfigParser();
const triggerTemplateParser = new ConfigParser();
const scriptParser = new ConfigParser();

/**
 * 解析工作流配置
 * @param content 配置文件内容
 * @param format 配置格式
 * @param parameters 运行时参数（用于模板替换）
 * @returns WorkflowDefinition
 */
export function parseWorkflow(
  content: string,
  format: ConfigFormat,
  parameters?: Record<string, any>
): WorkflowDefinition {
  return workflowParser.parseAndTransform(content, format, parameters);
}

/**
 * 验证工作流配置
 * @param content 配置文件内容
 * @param format 配置格式
 * @returns 验证结果
 */
export function validateWorkflow(content: string, format: ConfigFormat) {
  const parsed = workflowParser.parse(content, format, ConfigType.WORKFLOW);
  return workflowParser.validate(parsed);
}

/**
 * 解析工作流配置（不转换）
 * @param content 配置文件内容
 * @param format 配置格式
 * @returns 解析后的配置对象
 */
export function parseWorkflowConfig(
  content: string,
  format: ConfigFormat
): ParsedConfig<ConfigType.WORKFLOW> {
  return workflowParser.parse(content, format, ConfigType.WORKFLOW);
}

/**
 * 批量解析工作流配置
 * @param contents 配置内容数组
 * @param formats 配置格式数组
 * @param parameters 运行时参数数组
 * @returns WorkflowDefinition 数组
 */
export function parseBatchWorkflows(
  contents: string[],
  formats: ConfigFormat[],
  parameters?: Record<string, any>[]
): WorkflowDefinition[] {
  if (contents.length !== formats.length) {
    throw new Error('contents 和 formats 数组长度必须一致');
  }
  return contents.map((content, index) => 
    parseWorkflow(content, formats[index], parameters?.[index])
  );
}

/**
 * 解析节点模板配置
 * @param content 配置文件内容
 * @param format 配置格式
 * @returns NodeTemplate
 */
export function parseNodeTemplate(
  content: string,
  format: ConfigFormat
): NodeTemplate {
  const config = nodeTemplateParser.parse(content, format, ConfigType.NODE_TEMPLATE);
  return config.config as NodeTemplate;
}

/**
 * 批量解析节点模板配置
 * @param contents 配置内容数组
 * @param formats 配置格式数组
 * @returns NodeTemplate 数组
 */
export function parseBatchNodeTemplates(
  contents: string[],
  formats: ConfigFormat[]
): NodeTemplate[] {
  if (contents.length !== formats.length) {
    throw new Error('contents 和 formats 数组长度必须一致');
  }
  return contents.map((content, index) => 
    parseNodeTemplate(content, formats[index])
  );
}

/**
 * 解析触发器模板配置
 * @param content 配置文件内容
 * @param format 配置格式
 * @returns TriggerTemplate
 */
export function parseTriggerTemplate(
  content: string,
  format: ConfigFormat
): TriggerTemplate {
  const config = triggerTemplateParser.parse(content, format, ConfigType.TRIGGER_TEMPLATE);
  return config.config as TriggerTemplate;
}

/**
 * 批量解析触发器模板配置
 * @param contents 配置内容数组
 * @param formats 配置格式数组
 * @returns TriggerTemplate 数组
 */
export function parseBatchTriggerTemplates(
  contents: string[],
  formats: ConfigFormat[]
): TriggerTemplate[] {
  if (contents.length !== formats.length) {
    throw new Error('contents 和 formats 数组长度必须一致');
  }
  return contents.map((content, index) => 
    parseTriggerTemplate(content, formats[index])
  );
}

/**
 * 解析脚本配置
 * @param content 配置文件内容
 * @param format 配置格式
 * @returns Script
 */
export function parseScript(
  content: string,
  format: ConfigFormat
): Script {
  const config = scriptParser.parse(content, format, ConfigType.SCRIPT);
  return config.config as Script;
}

/**
 * 批量解析脚本配置
 * @param contents 配置内容数组
 * @param formats 配置格式数组
 * @returns Script 数组
 */
export function parseBatchScripts(
  contents: string[],
  formats: ConfigFormat[]
): Script[] {
  if (contents.length !== formats.length) {
    throw new Error('contents 和 formats 数组长度必须一致');
  }
  return contents.map((content, index) => 
    parseScript(content, formats[index])
  );
}