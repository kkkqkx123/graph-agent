/**
 * 数据分析指令模板
 * 用于定义数据分析的用户指令
 */

import type { PromptTemplate } from '../../types/template.js';

/**
 * 数据分析指令模板
 */
export const DATA_ANALYSIS_TEMPLATE: PromptTemplate = {
  id: 'user_commands.data_analysis',
  name: 'Data Analysis Command',
  description: '数据分析指令',
  category: 'user-command',
  content: `请对以下数据进行分析：

## 分析目标
{{analysisGoal}}

## 数据内容
{{dataContent}}

## 分析要求
1. **数据概览**：提供数据的基本统计信息
2. **趋势分析**：识别数据中的趋势和模式
3. **异常检测**：发现异常值和异常模式
4. **关联分析**：探索变量之间的关系
5. **结论建议**：提供有意义的结论和建议

## 输出格式
- 使用清晰的标题和结构
- 提供可视化建议（如适用）
- 使用简洁明了的语言
- 包含关键发现和洞察
- 提供可操作的建议`,
  variables: [
    { name: 'analysisGoal', type: 'string', required: true, description: '分析目标' },
    { name: 'dataContent', type: 'string', required: true, description: '待分析的数据内容' }
  ]
};