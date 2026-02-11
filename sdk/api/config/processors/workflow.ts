/**
 * Workflow配置处理函数
 * 提供Workflow配置的验证、转换和导出功能
 * 所有函数都是无状态的纯函数
 */

import type { ParsedConfig } from '../types';
import { ConfigType, ConfigFormat } from '../types';
import type { Result } from '@modular-agent/types/result';
import { ValidationError } from '@modular-agent/types/errors';
import { validateWorkflowConfig } from '../validators/workflow-validator';
import { ConfigTransformer } from '../config-transformer';
import type { WorkflowDefinition } from '@modular-agent/types/workflow';
import { stringifyJson } from '../json-parser';
import { ConfigurationError } from '@modular-agent/types/errors';
import { ok } from '@modular-agent/common-utils/result-utils';

/**
 * 验证Workflow配置
 * @param config 解析后的配置对象
 * @returns 验证结果
 */
export function validateWorkflow(config: ParsedConfig<ConfigType.WORKFLOW>): Result<ParsedConfig<ConfigType.WORKFLOW>, ValidationError[]> {
  const result = validateWorkflowConfig(config.config);
  
  // 使用 andThen 进行类型转换
  return result.andThen(() => ok(config)) as Result<ParsedConfig<ConfigType.WORKFLOW>, ValidationError[]>;
}

/**
 * 转换Workflow配置
 * 处理参数替换和边引用更新
 * @param config 解析后的配置对象
 * @param parameters 运行时参数（可选）
 * @returns 转换后的WorkflowDefinition
 */
export function transformWorkflow(
  config: ParsedConfig<ConfigType.WORKFLOW>,
  parameters?: Record<string, any>
): WorkflowDefinition {
  const transformer = new ConfigTransformer();
  return transformer.transformToWorkflow(config.config, parameters);
}

/**
 * 导出Workflow配置
 * @param workflowDef WorkflowDefinition对象
 * @param format 配置格式
 * @returns 配置文件内容字符串
 */
export function exportWorkflow(workflowDef: WorkflowDefinition, format: ConfigFormat): string {
  const transformer = new ConfigTransformer();
  const configFile = transformer.transformFromWorkflow(workflowDef);

  switch (format) {
    case ConfigFormat.JSON:
      return stringifyJson(configFile, true);
    case ConfigFormat.TOML:
      throw new ConfigurationError(
        'TOML格式不支持导出，请使用JSON格式',
        format,
        { suggestion: '使用 ConfigFormat.JSON 代替' }
      );
    default:
      throw new ConfigurationError(
        `不支持的配置格式: ${format}`,
        format
      );
  }
}