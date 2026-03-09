/**
 * ToolParametersDescriber - 工具参数描述生成器
 * 提供工具参数 Schema 的描述生成功能
 *
 * 功能：
 * - 生成工具参数 Schema 描述
 * - 解析工具参数的 properties 和 required 字段
 * - 生成参数说明列表
 */

import type { Tool, ToolProperty } from '@modular-agent/types';
import { renderTemplate } from '@modular-agent/common-utils';
import {
  TOOL_PARAMETERS_SCHEMA_TEMPLATE,
  PARAMETER_DESCRIPTION_LINE_TEMPLATE
} from '@modular-agent/prompt-templates';

/**
 * 生成单个参数的描述行
 *
 * @param paramName 参数名称
 * @param paramDef 参数定义
 * @param isRequired 是否必填
 * @returns 参数描述行字符串
 *
 * @example
 * ```ts
 * const paramDef = { type: 'string', description: 'User name' };
 * const line = generateParameterDescriptionLine('name', paramDef, true);
 * // 结果: '- name (string): User name (required)'
 * ```
 */
function generateParameterDescriptionLine(
  paramName: string,
  paramDef: ToolProperty,
  isRequired: boolean
): string {
  const variables = {
    paramName,
    paramType: paramDef.type,
    paramDescription: paramDef.description || 'No description',
    required: isRequired ? '(required)' : '(optional)'
  };

  return renderTemplate(PARAMETER_DESCRIPTION_LINE_TEMPLATE, variables);
}

/**
 * 递归生成参数说明文本
 * 支持嵌套对象和数组类型
 *
 * @param properties 参数属性定义
 * @param required 必填参数列表
 * @param indent 缩进级别
 * @returns 参数说明文本
 */
function generateParametersDescription(
  properties: Record<string, ToolProperty>,
  required: string[],
  indent: number = 0
): string {
  const lines: string[] = [];
  const indentStr = '  '.repeat(indent);

  for (const [paramName, paramDef] of Object.entries(properties)) {
    const isRequired = required.includes(paramName);
    const line = generateParameterDescriptionLine(paramName, paramDef, isRequired);
    lines.push(`${indentStr}${line}`);

    // 处理嵌套对象
    if (paramDef.type === 'object' && paramDef.properties) {
      const nestedDescription = generateParametersDescription(
        paramDef.properties,
        paramDef.required || [],
        indent + 1
      );
      if (nestedDescription) {
        lines.push(nestedDescription);
      }
    }

    // 处理数组类型（如果数组元素是对象）
    if (paramDef.type === 'array' && paramDef.items) {
      const items = paramDef.items;
      if (items.type === 'object' && items.properties) {
        const nestedDescription = generateParametersDescription(
          items.properties,
          items.required || [],
          indent + 1
        );
        if (nestedDescription) {
          lines.push(`${indentStr}Array items:`);
          lines.push(nestedDescription);
        }
      }
    }
  }

  return lines.join('\n');
}

/**
 * 生成工具参数描述
 * 使用 TOOL_PARAMETERS_SCHEMA_TEMPLATE 模板生成参数描述
 *
 * @param tool 工具对象
 * @returns 工具参数描述字符串
 *
 * @example
 * ```ts
 * const tool = {
 *   id: 'tool1',
 *   name: 'Calculator',
 *   description: 'Performs calculations',
 *   parameters: {
 *     properties: {
 *       a: { type: 'number', description: 'First number' },
 *       b: { type: 'number', description: 'Second number' }
 *     },
 *     required: ['a', 'b']
 *   }
 * };
 * const description = generateToolParametersDescription(tool);
 * // 结果包含工具名称、ID、描述、参数Schema和参数说明
 * ```
 */
export function generateToolParametersDescription(tool: Tool): string {
  const parametersSchema = JSON.stringify(tool.parameters, null, 2);
  const parametersDescription = generateParametersDescription(
    tool.parameters.properties,
    tool.parameters.required
  );

  const variables = {
    toolName: tool.name,
    toolId: tool.id,
    toolDescription: tool.description || 'No description',
    parametersSchema,
    parametersDescription
  };

  return renderTemplate(TOOL_PARAMETERS_SCHEMA_TEMPLATE.content, variables);
}

/**
 * 生成简化的参数说明
 * 仅生成参数列表，不包含完整的 Schema
 *
 * @param tool 工具对象
 * @returns 简化的参数说明字符串
 *
 * @example
 * ```ts
 * const description = generateSimpleParametersDescription(tool);
 * // 结果:
 * // - a (number): First number (required)
 * // - b (number): Second number (required)
 * ```
 */
export function generateSimpleParametersDescription(tool: Tool): string {
  return generateParametersDescription(
    tool.parameters.properties,
    tool.parameters.required
  );
}

/**
 * 获取工具的必填参数列表
 *
 * @param tool 工具对象
 * @returns 必填参数名称数组
 */
export function getRequiredParameters(tool: Tool): string[] {
  return tool.parameters.required || [];
}

/**
 * 获取工具的可选参数列表
 *
 * @param tool 工具对象
 * @returns 可选参数名称数组
 */
export function getOptionalParameters(tool: Tool): string[] {
  const allParams = Object.keys(tool.parameters.properties);
  const requiredParams = getRequiredParameters(tool);
  return allParams.filter(param => !requiredParams.includes(param));
}

/**
 * 检查工具是否有参数
 *
 * @param tool 工具对象
 * @returns 是否有参数
 */
export function hasParameters(tool: Tool): boolean {
  return Object.keys(tool.parameters.properties).length > 0;
}
