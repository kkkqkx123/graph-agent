/**
 * 工具模块导出
 *
 * 注意：SDK只提供工具注册和管理功能，具体的工具执行器实现请使用 @modular-agent/tool-executors 包
 */

// 工具注册表
export { ToolRegistry } from './tool-registry';

// 类型定义（从types包导入）
export type { ToolExecutionOptions, ToolExecutionResult } from '@modular-agent/types/tool';
export type { IToolExecutor } from '@modular-agent/types/tool';