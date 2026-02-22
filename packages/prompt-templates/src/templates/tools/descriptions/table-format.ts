/**
 * 工具描述表格格式模板
 * 用于生成表格格式的工具描述
 */

import type { PromptTemplate } from '../../../types/template.js';

/**
 * 工具描述表格格式模板
 */
export const TOOL_DESCRIPTION_TABLE_TEMPLATE: PromptTemplate = {
  id: 'tools.description.table',
  name: 'Tool Description Table Format',
  description: '工具描述表格格式模板',
  category: 'tools',
  content: '| {{toolName}} | {{toolId}} | {{toolDescription}} |',
  variables: [
    { name: 'toolName', type: 'string', required: true, description: '工具名称' },
    { name: 'toolId', type: 'string', required: true, description: '工具ID' },
    { name: 'toolDescription', type: 'string', required: true, description: '工具描述' }
  ]
};