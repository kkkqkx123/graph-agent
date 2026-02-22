/**
 * 工具可见性声明模板
 * 用于生成工具可见性变更的声明消息
 */

import type { PromptTemplate } from '../../../types/template.js';

/**
 * 工具可见性声明主模板
 */
export const TOOL_VISIBILITY_DECLARATION_TEMPLATE: PromptTemplate = {
  id: 'tools.visibility.declaration',
  name: 'Tool Visibility Declaration',
  description: '工具可见性声明主模板',
  category: 'tools',
  content: `## 工具可见性声明

**生效时间**: {{timestamp}}
**当前作用域**: {{scope}}({{scopeId}})
**变更类型**: {{changeTypeText}}

### 当前可用工具清单

| 工具名称 | 工具ID | 说明 |
|----------|--------|------|
{{toolDescriptions}}

### 重要提示

1. **仅可使用上述清单中的工具**，其他工具调用将被拒绝
2. 工具参数必须符合schema定义
3. 如需更多工具，请完成当前任务后退出当前作用域`,
  variables: [
    { name: 'timestamp', type: 'string', required: true, description: '生效时间' },
    { name: 'scope', type: 'string', required: true, description: '作用域类型' },
    { name: 'scopeId', type: 'string', required: true, description: '作用域ID' },
    { name: 'changeTypeText', type: 'string', required: true, description: '变更类型文本' },
    { name: 'toolDescriptions', type: 'string', required: true, description: '工具描述表格行' }
  ]
};

/**
 * 工具表格行模板（字符串常量）
 */
export const TOOL_TABLE_ROW_TEMPLATE = '| {{toolName}} | {{toolId}} | {{toolDescription}} |';

/**
 * 可见性变更类型文本映射
 */
export const VISIBILITY_CHANGE_TYPE_TEXTS = {
  init: '初始化',
  enter_scope: '进入作用域',
  add_tools: '新增工具',
  exit_scope: '退出作用域',
  refresh: '刷新声明'
} as const;

/**
 * 变更类型文本类型
 */
export type VisibilityChangeType = keyof typeof VISIBILITY_CHANGE_TYPE_TEXTS;