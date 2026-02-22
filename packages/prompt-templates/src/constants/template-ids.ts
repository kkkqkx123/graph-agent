/**
 * 模板ID常量
 * 定义所有模板的唯一标识符，避免硬编码字符串
 */

/**
 * 模板ID常量集合
 */
export const TEMPLATE_IDS = {
  /** 系统提示词模板ID */
  SYSTEM: {
    /** 程序员系统提示词 */
    CODER: 'system.coder',
    /** 助手系统提示词 */
    ASSISTANT: 'system.assistant',
  },
  /** 规则模板ID */
  RULES: {
    /** 格式规则 */
    FORMAT: 'rules.format',
    /** 安全规则 */
    SAFETY: 'rules.safety',
  },
  /** 用户指令模板ID */
  USER_COMMANDS: {
    /** 代码审查指令 */
    CODE_REVIEW: 'user_commands.code_review',
    /** 数据分析指令 */
    DATA_ANALYSIS: 'user_commands.data_analysis',
  },
  /** 工具相关模板ID */
  TOOLS: {
    /** 工具可见性声明 */
    VISIBILITY_DECLARATION: 'tools.visibility.declaration',
    /** 工具描述表格格式 */
    DESCRIPTION_TABLE: 'tools.description.table',
    /** 工具参数Schema描述 */
    PARAMETERS_SCHEMA: 'tools.parameters.schema',
  },
  /** 片段ID */
  FRAGMENTS: {
    /** 工具可见性片段 */
    TOOL_VISIBILITY: 'fragment.tool_visibility',
  }
} as const;

/**
 * 模板ID类型
 */
export type TemplateId = typeof TEMPLATE_IDS[keyof typeof TEMPLATE_IDS];