/**
 * 工具 JSON 格式模板
 * 用于将工具定义转换为 JSON 文本格式（适用于不支持 Function Call 的模型）
 */

import type { PromptTemplate } from '../../../types/template.js';

/**
 * 单个工具 JSON 格式模板
 */
export const TOOL_JSON_FORMAT_TEMPLATE: PromptTemplate = {
  id: 'tools.formatters.json',
  name: 'Tool JSON Format',
  description: '工具 JSON 格式模板',
  category: 'tools',
  content: `### {{toolName}}

{{toolDescription}}

Parameters:
{{parametersDescription}}`,
  variables: [
    { name: 'toolName', type: 'string', required: true, description: 'Tool name' },
    { name: 'toolDescription', type: 'string', required: true, description: 'Tool description' },
    { name: 'parametersDescription', type: 'string', required: false, description: 'Parameters description' }
  ]
};

/**
 * 工具列表 JSON 格式模板
 */
export const TOOLS_JSON_LIST_TEMPLATE: PromptTemplate = {
  id: 'tools.formatters.json_list',
  name: 'Tools JSON List',
  description: '工具列表 JSON 格式模板',
  category: 'tools',
  content: `## Available Tools

{{toolsJson}}

### Tool Call Format

Use the following format to call tools:

\`\`\`
<<<TOOL_CALL>>>
{"tool": "tool_name", "parameters": {"parameter_name": "parameter_value"}}
<<<END_TOOL_CALL>>>
\`\`\``,
  variables: [
    { name: 'toolsJson', type: 'string', required: true, description: 'JSON list of tools' }
  ]
};

/**
 * 工具调用 JSON 参数行模板
 */
export const TOOL_JSON_PARAMETER_LINE_TEMPLATE: PromptTemplate = {
  id: 'tools.formatters.json_parameter_line',
  name: 'Tool JSON Parameter Line',
  description: '工具 JSON 参数行模板',
  category: 'tools',
  content: `- {{paramName}} ({{paramType}}){{required}}: {{paramDescription}}`,
  variables: [
    { name: 'paramName', type: 'string', required: true, description: 'Parameter name' },
    { name: 'paramType', type: 'string', required: true, description: 'Parameter type' },
    { name: 'required', type: 'string', required: false, description: 'Required flag' },
    { name: 'paramDescription', type: 'string', required: false, description: 'Parameter description' }
  ]
};
