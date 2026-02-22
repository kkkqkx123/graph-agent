/**
 * 模板类型定义
 * 定义提示词模板的核心数据结构
 */

/**
 * 变量定义
 * 描述模板中使用的变量及其类型和约束
 */
export interface VariableDefinition {
  /** 变量名称 */
  name: string;
  /** 变量类型 */
  type: 'string' | 'number' | 'boolean' | 'object';
  /** 是否必填 */
  required: boolean;
  /** 变量描述 */
  description?: string;
  /** 默认值 */
  defaultValue?: any;
}

/**
 * 提示词模板
 * 定义完整的提示词模板结构
 */
export interface PromptTemplate {
  /** 模板唯一标识符 */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 模板类别 */
  category: 'system' | 'rules' | 'user-command' | 'tools' | 'composite';
  /** 模板内容，包含 {{variable}} 占位符 */
  content: string;
  /** 所需变量定义 */
  variables?: VariableDefinition[];
  /** 引用的片段ID列表 */
  fragments?: string[];
}

/**
 * 模板填充规则
 * 定义如何将上下文数据填充到模板中
 */
export interface TemplateFillRule {
  /** 模板ID */
  templateId: string;
  /** 变量名到上下文路径的映射 */
  variableMapping: Record<string, string>;
  /** 片段ID到实际内容的映射 */
  fragmentMapping?: Record<string, string>;
}