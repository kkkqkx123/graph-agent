/**
 * 工具可见性片段
 * 可复用的工具可见性声明片段
 */

import type { PromptFragment } from '../types/fragment.js';

/**
 * 工具可见性片段
 */
export const TOOL_VISIBILITY_FRAGMENT: PromptFragment = {
  id: 'fragment.tool_visibility',
  content: `当前可用工具范围已更新为: {{scopeName}}
可用工具列表:
{{toolList}}`,
  variables: [
    { name: 'scopeName', type: 'string', required: true, description: '作用域名称' },
    { name: 'toolList', type: 'string', required: true, description: '工具列表' }
  ]
};