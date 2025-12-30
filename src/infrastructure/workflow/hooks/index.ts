/**
 * 图钩子系统模块
 *
 * 提供图执行过程中的钩子机制，允许在特定节点插入自定义逻辑
 */

// 钩子执行器
export { HookExecutor } from './hook-executor';

// 钩子上下文和执行结果
export type { HookContext } from './hook-context';
export { HookExecutionResult, HookExecutionResultBuilder } from './hook-execution-result';

// 具体Hook实现
export { BeforeExecuteHook, AfterExecuteHook, BeforeNodeExecuteHook, AfterNodeExecuteHook } from './impl/index';

// Hook工厂
export { HookFactory } from './hook-factory';
export type { HookConfig } from './hook-factory';

// Hook插件
export { HookPlugin, HookPluginRegistry, HookPluginExecutor } from './hook-plugin';
export type { HookPluginConfig } from './hook-plugin';