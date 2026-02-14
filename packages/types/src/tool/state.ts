/**
 * 工具状态类型定义
 */

/**
 * 工具类型枚举
 */
export enum ToolType {
  /** 无状态工具（应用层提供的纯函数） */
  STATELESS = 'STATELESS',
  /** 有状态工具（应用层提供的类/对象，通过ThreadContext隔离） */
  STATEFUL = 'STATEFUL',
  /** REST API工具 */
  REST = 'REST',
  /** MCP协议工具 */
  MCP = 'MCP'
}