/**
 * 工具参数 Schema 描述模板
 * 用于生成工具参数的 Schema 描述
 */

import type { PromptTemplate } from '../../../types/template.js';

/**
 * 工具参数 Schema 描述模板
 */
export const TOOL_PARAMETERS_SCHEMA_TEMPLATE: PromptTemplate = {
  id: 'tools.parameters.schema',
  name: 'Tool Parameters Schema Description',
  description: '工具参数Schema描述模板',
  category: 'tools',
  content: `工具名称: {{toolName}}
工具ID: {{toolId}}
工具描述: {{toolDescription}}

参数Schema:
\`\`\`json
{{parametersSchema}}
\`\`\`

参数说明:
{{parametersDescription}}`,
  variables: [
    { name: 'toolName', type: 'string', required: true, description: '工具名称' },
    { name: 'toolId', type: 'string', required: true, description: '工具ID' },
    { name: 'toolDescription', type: 'string', required: true, description: '工具描述' },
    { name: 'parametersSchema', type: 'string', required: true, description: '参数Schema JSON字符串' },
    { name: 'parametersDescription', type: 'string', required: false, description: '参数说明文本' }
  ]
};

/**
 * 参数描述行模板（字符串常量）
 */
export const PARAMETER_DESCRIPTION_LINE_TEMPLATE = '- {{paramName}} ({{paramType}}): {{paramDescription}} {{required}}';