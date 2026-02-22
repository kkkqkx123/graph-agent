/**
 * 片段类型定义
 * 定义可复用的提示词片段结构
 */

import type { VariableDefinition } from './template.js';

/**
 * 提示词片段
 * 定义可复用的提示词片段，用于组合到完整模板中
 */
export interface PromptFragment {
  /** 片段唯一标识符 */
  id: string;
  /** 片段内容，包含 {{variable}} 占位符 */
  content: string;
  /** 所需变量定义 */
  variables?: VariableDefinition[];
}