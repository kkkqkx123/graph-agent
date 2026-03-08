/**
 * 工具描述片段
 * 可复用的工具描述片段
 */

import type { PromptFragment } from '../types/fragment.js';

/**
 * 工具描述片段
 */
export const TOOL_DESCRIPTION_FRAGMENT: PromptFragment = {
  id: 'fragment.tool_descriptions',
  content: `Available tools:
{{toolDescriptions}}`,
  variables: [
    { name: 'toolDescriptions', type: 'string', required: true, description: 'Tool description text' }
  ]
};