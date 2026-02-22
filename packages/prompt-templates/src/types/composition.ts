/**
 * 组合类型定义
 * 定义模板组合和覆盖规则
 */

import type { PromptTemplate } from './template.js';

/**
 * 模板组合
 * 定义如何基于基础模板创建新的组合模板
 */
export interface TemplateComposition {
  /** 基础模板ID */
  baseTemplateId: string;
  /** 覆盖的字段 */
  overrides: Partial<PromptTemplate>;
  /** 片段替换映射 */
  fragmentReplacements?: Record<string, string>;
}