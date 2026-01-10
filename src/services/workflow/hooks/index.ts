/**
 * 图钩子系统模块
 *
 * 提供图执行过程中的钩子机制，允许在特定节点插入自定义逻辑
 */

// 钩子执行器
export { HookExecutor } from './hook-executor';

// 钩子上下文和执行结果（从领域层导出）
export { HookContextValue, HookExecutionResultValue } from '../../../domain/workflow/value-objects/hook';

// 具体Hook实现
export {
  BeforeExecuteHook,
  AfterExecuteHook,
  BeforeNodeExecuteHook,
  AfterNodeExecuteHook,
} from './impl/index';

// Hook工厂
export { HookFactory } from './hook-factory';
export type { HookConfig } from './hook-factory';

