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
  content: `The available tools have been updated to: {{scopeName}}
  Available tools list:
  {{toolList}}`,
  variables: [
    { name: 'scopeName', type: 'string', required: true, description: 'Scope name' },
    { name: 'toolList', type: 'string', required: true, description: 'List of available tools' }
  ]
};