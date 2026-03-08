/**
 * ToolSchemaFormatter - 工具 Schema 格式转换器
 * 提供工具定义到不同格式的转换功能
 *
 * 功能：
 * - 转换为 Function Call 格式（标准 JSON Schema）
 * - 转换为 XML 格式（适用于不支持 Function Call 的模型）
 * - 转换为 JSON 文本格式（适用于不支持 Function Call 的模型）
 * - 支持批量转换
 */

import type { Tool, ToolParameters } from '@modular-agent/types';
import { renderTemplate } from '@modular-agent/common-utils';
import {
  TOOL_XML_FORMAT_TEMPLATE,
  TOOLS_XML_LIST_TEMPLATE,
  TOOL_XML_PARAMETER_LINE_TEMPLATE,
  TOOL_JSON_FORMAT_TEMPLATE,
  TOOLS_JSON_LIST_TEMPLATE,
  TOOL_JSON_PARAMETER_LINE_TEMPLATE
} from '@modular-agent/prompt-templates';
import { generateSimpleParametersDescription } from './tool-parameters-describer.js';

/**
 * LLM 工具 Schema 格式（Function Call 模式）
 */
export interface LLMToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolParameters;
  };
}

/**
 * 工具格式类型
 */
export type ToolFormatType = 'function_call' | 'xml' | 'json';

/**
 * 将单个工具转换为 Function Call Schema 格式
 *
 * @param tool 工具对象
 * @returns LLM 工具 Schema
 *
 * @example
 * ```ts
 * const tool = {
 *   id: 'calculator',
 *   name: 'calculator',
 *   description: 'Performs calculations',
 *   parameters: { properties: {...}, required: [...] }
 * };
 * const schema = toFunctionCallSchema(tool);
 * // 结果:
 * // {
 * //   type: 'function',
 * //   function: {
 * //     name: 'calculator',
 * //     description: 'Performs calculations',
 * //     parameters: {...}
 * //   }
 * // }
 * ```
 */
export function toFunctionCallSchema(tool: Tool): LLMToolSchema {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  };
}

/**
 * 将工具列表转换为 Function Call Schema 格式
 *
 * @param tools 工具数组
 * @returns LLM 工具 Schema 数组
 */
export function toFunctionCallSchemas(tools: Tool[]): LLMToolSchema[] {
  return tools.map(toFunctionCallSchema);
}

/**
 * 生成 XML 格式的参数描述
 *
 * @param tool 工具对象
 * @returns XML 格式的参数描述
 */
function generateXMLParametersDescription(tool: Tool): string {
  if (!tool.parameters || Object.keys(tool.parameters.properties).length === 0) {
    return 'No parameters';
  }

  const lines: string[] = [];
  const properties = tool.parameters.properties;
  const required = tool.parameters.required || [];

  for (const [paramName, paramDef] of Object.entries(properties)) {
    const isRequired = required.includes(paramName);
    const variables = {
      paramName,
      paramType: paramDef.type,
      paramDescription: paramDef.description || 'No description',
      required: isRequired ? ' [required]' : ''
    };
    lines.push(renderTemplate(TOOL_XML_PARAMETER_LINE_TEMPLATE.content, variables));
  }

  return lines.join('\n');
}

/**
 * 将单个工具转换为 XML 格式
 *
 * @param tool 工具对象
 * @returns XML 格式的工具描述
 *
 * @example
 * ```ts
 * const tool = {
 *   id: 'calculator',
 *   name: 'calculator',
 *   description: 'Performs calculations',
 *   parameters: {...}
 * };
 * const xml = toXMLFormat(tool);
 * // 结果:
 * // <tool name="calculator">
 * // <description>Performs calculations</description>
 * // <parameters>
 * // - a (number) [required]: First number
 * // - b (number) [required]: Second number
 * // </parameters>
 * // </tool>
 * ```
 */
export function toXMLFormat(tool: Tool): string {
  const variables = {
    toolName: tool.name,
    toolDescription: tool.description,
    parametersDescription: generateXMLParametersDescription(tool)
  };

  return renderTemplate(TOOL_XML_FORMAT_TEMPLATE.content, variables);
}

/**
 * 将工具列表转换为 XML 格式（包含调用格式说明）
 *
 * @param tools 工具数组
 * @returns XML 格式的工具列表描述
 */
export function toXMLFormatBatch(tools: Tool[]): string {
  if (!tools || tools.length === 0) {
    return 'No tools available';
  }

  const toolsXml = tools.map(toXMLFormat).join('\n\n');

  return renderTemplate(TOOLS_XML_LIST_TEMPLATE.content, { toolsXml });
}

/**
 * 生成 JSON 格式的参数描述
 *
 * @param tool 工具对象
 * @returns JSON 格式的参数描述
 */
function generateJSONParametersDescription(tool: Tool): string {
  if (!tool.parameters || Object.keys(tool.parameters.properties).length === 0) {
    return 'No parameters';
  }

  const lines: string[] = [];
  const properties = tool.parameters.properties;
  const required = tool.parameters.required || [];

  for (const [paramName, paramDef] of Object.entries(properties)) {
    const isRequired = required.includes(paramName);
    const variables = {
      paramName,
      paramType: paramDef.type,
      paramDescription: paramDef.description || 'No description',
      required: isRequired ? ' [required]' : ''
    };
    lines.push(renderTemplate(TOOL_JSON_PARAMETER_LINE_TEMPLATE.content, variables));
  }

  return lines.join('\n');
}

/**
 * 将单个工具转换为 JSON 文本格式
 *
 * @param tool 工具对象
 * @returns JSON 文本格式的工具描述
 *
 * @example
 * ```ts
 * const tool = {
 *   id: 'calculator',
 *   name: 'calculator',
 *   description: 'Performs calculations',
 *   parameters: {...}
 * };
 * const json = toJSONFormat(tool);
 * // 结果:
 * // ### calculator
 * //
 * // Performs calculations
 * //
 * // 参数:
 * // - a (number) [required]: First number
 * // - b (number) [required]: Second number
 * ```
 */
export function toJSONFormat(tool: Tool): string {
  const variables = {
    toolName: tool.name,
    toolDescription: tool.description,
    parametersDescription: generateJSONParametersDescription(tool)
  };

  return renderTemplate(TOOL_JSON_FORMAT_TEMPLATE.content, variables);
}

/**
 * 将工具列表转换为 JSON 文本格式（包含调用格式说明）
 *
 * @param tools 工具数组
 * @returns JSON 文本格式的工具列表描述
 */
export function toJSONFormatBatch(tools: Tool[]): string {
  if (!tools || tools.length === 0) {
    return 'No tools available';
  }

  const toolsJson = tools.map(toJSONFormat).join('\n\n');

  return renderTemplate(TOOLS_JSON_LIST_TEMPLATE.content, { toolsJson });
}

/**
 * 根据格式类型转换工具
 *
 * @param tool 工具对象
 * @param format 格式类型
 * @returns 转换后的格式
 */
export function formatTool(tool: Tool, format: ToolFormatType): string | LLMToolSchema {
  switch (format) {
    case 'function_call':
      return toFunctionCallSchema(tool);
    case 'xml':
      return toXMLFormat(tool);
    case 'json':
      return toJSONFormat(tool);
    default:
      return toFunctionCallSchema(tool);
  }
}

/**
 * 根据格式类型批量转换工具
 *
 * @param tools 工具数组
 * @param format 格式类型
 * @returns 转换后的格式
 */
export function formatTools(
  tools: Tool[],
  format: ToolFormatType
): LLMToolSchema[] | string {
  switch (format) {
    case 'function_call':
      return toFunctionCallSchemas(tools);
    case 'xml':
      return toXMLFormatBatch(tools);
    case 'json':
      return toJSONFormatBatch(tools);
    default:
      return toFunctionCallSchemas(tools);
  }
}
