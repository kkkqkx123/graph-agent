/**
 * 触发器系统模块
 *
 * 提供工作流触发机制，支持时间、事件、状态等多种触发方式
 */

// 触发器执行器
export { TriggerExecutor } from './trigger-executor';

// 触发器执行上下文和执行结果
// 注意：这些是 TriggerExecutor 使用的接口，与 domain 层的接口不同
export type { TriggerExecutionContext } from './trigger-context';
export {
  TriggerExecutorResult,
  TriggerExecutorResultBuilder,
  TriggerExecutorResultUtils,
} from './trigger-execution-result';
