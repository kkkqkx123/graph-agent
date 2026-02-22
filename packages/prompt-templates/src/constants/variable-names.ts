/**
 * 变量名称常量
 * 定义模板中使用的变量名称，避免硬编码字符串
 */

/**
 * 变量名称常量集合
 */
export const VARIABLE_NAMES = {
  /** 工具相关变量 */
  TOOL: {
    /** 工具名称 */
    NAME: 'toolName',
    /** 工具ID */
    ID: 'toolId',
    /** 工具描述 */
    DESCRIPTION: 'toolDescription',
  },
  /** 可见性相关变量 */
  VISIBILITY: {
    /** 生效时间 */
    TIMESTAMP: 'timestamp',
    /** 作用域类型 */
    SCOPE: 'scope',
    /** 作用域ID */
    SCOPE_ID: 'scopeId',
    /** 变更类型文本 */
    CHANGE_TYPE_TEXT: 'changeTypeText',
    /** 工具描述表格行 */
    TOOL_DESCRIPTIONS: 'toolDescriptions',
  },
  /** 参数相关变量 */
  PARAMETERS: {
    /** 参数名称 */
    NAME: 'paramName',
    /** 参数类型 */
    TYPE: 'paramType',
    /** 参数描述 */
    DESCRIPTION: 'paramDescription',
    /** 参数Schema */
    SCHEMA: 'parametersSchema',
    /** 参数说明 */
    DESCRIPTION_TEXT: 'parametersDescription',
  },
  /** 用户输入变量 */
  USER: {
    /** 用户输入 */
    INPUT: 'user_input',
  }
} as const;

/**
 * 变量名称类型
 */
export type VariableName = typeof VARIABLE_NAMES[keyof typeof VARIABLE_NAMES];