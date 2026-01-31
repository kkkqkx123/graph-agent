/**
 * Hook处理器模块（简化版）
 * 提供Hook执行的统一接口
 */

// 导出主执行函数和类型
export { executeHook, type HookExecutionContext } from './hook-handler';

// 导出工具函数
export * from './utils';