/**
 * 触发器系统模块
 *
 * 提供工作流触发机制，支持时间、事件、状态等多种触发方式
 */

// 触发器执行器
export { TriggerExecutor } from './trigger-executor';

// 触发器上下文和执行结果
export type { TriggerContext } from './trigger-context';
export {
  TriggerExecutionResult,
  TriggerExecutionResultBuilder,
  TriggerExecutionResultUtils,
} from './trigger-execution-result';
