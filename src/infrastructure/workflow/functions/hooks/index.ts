/**
 * Hook函数模块
 *
 * 提供纯执行逻辑的函数实现，不定义具体的hook点。
 * 这些函数可以被Hook实体复用，实现可组合的执行逻辑。
 *
 * 注意：Hook函数通过统一的FunctionRegistry进行注册和管理
 */

// 基类和接口导出
export { BaseHookFunction, HookFunctionMetadata, HookFunctionResult, createHookFunctionResult } from './base-hook-function';

// Hook函数实现导出
export { LoggingHookFunction } from './logging-hook-function';
export { ValidationHookFunction } from './validation-hook-function';
export { TransformationHookFunction } from './transformation-hook-function';