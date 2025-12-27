/**
 * 图钩子系统模块
 * 
 * 提供图执行过程中的钩子机制，允许在特定节点插入自定义逻辑
 */

// 基础钩子类
export { BaseHook } from './base-hook';

// 钩子上下文
export { HookContext, HookContextBuilder, HookContextUtils } from './hook-context';

// 钩子执行结果
export { HookExecutionResult, HookExecutionResultBuilder } from './hook-execution-result';

// 钩子链
export { 
  HookChain, 
  HookChainBuilder, 
  HookChainUtils,
  HookChainExecutionResult,
  HookChainExecutionMode,
  HookChainErrorHandlingStrategy
} from './hook-chain';

// 钩子执行管理器
export {
  HookExecutionManager
} from './hook-execution-manager';

// 预定义钩子类型
export { 
  LoggingHook,
  ValidationHook,
  CacheHook,
  PerformanceHook,
  TransformHook,
  FilterHook
} from './predefined-hooks';

// 钩子工具类
export { HookUtils } from './hook-utils';