/**
 * 代码审查指令模板
 * 用于定义代码审查的用户指令
 */

import type { PromptTemplate } from '../../types/template.js';

/**
 * 代码审查指令模板
 */
export const CODE_REVIEW_TEMPLATE: PromptTemplate = {
  id: 'user_commands.code_review',
  name: 'Code Review Command',
  description: '代码审查指令',
  category: 'user-command',
  content: `请对以下代码进行审查：

## 审查要点
1. **代码质量**：检查代码的可读性、可维护性
2. **功能正确性**：验证代码逻辑是否正确
3. **性能问题**：识别潜在的性能瓶颈
4. **安全性**：检查是否存在安全漏洞
5. **最佳实践**：评估是否符合编码规范和最佳实践

## 审查内容
{{codeContent}}

## 审查要求
- 提供具体的改进建议
- 标注潜在的问题和风险
- 给出优先级排序
- 提供修复示例（如适用）
- 保持建设性和客观性`,
  variables: [
    { name: 'codeContent', type: 'string', required: true, description: '待审查的代码内容' }
  ]
};