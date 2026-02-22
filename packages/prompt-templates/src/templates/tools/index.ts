/**
 * 工具相关模板统一导出
 */

// 可见性相关模板
export {
  TOOL_VISIBILITY_DECLARATION_TEMPLATE,
  TOOL_TABLE_ROW_TEMPLATE,
  VISIBILITY_CHANGE_TYPE_TEXTS
} from './visibility/declaration.js';
export type { VisibilityChangeType } from './visibility/declaration.js';

// 描述相关模板
export {
  TOOL_DESCRIPTION_TABLE_TEMPLATE,
  TOOL_DESCRIPTION_SINGLE_LINE_TEMPLATE,
  TOOL_DESCRIPTION_LIST_TEMPLATE
} from './descriptions/index.js';

// 参数相关模板
export {
  TOOL_PARAMETERS_SCHEMA_TEMPLATE,
  PARAMETER_DESCRIPTION_LINE_TEMPLATE
} from './parameters/schema.js';