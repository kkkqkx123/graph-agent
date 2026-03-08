/**
 * Hook工具模块
 * 提供Hook执行所需的辅助函数
 */

export {
  buildHookEvaluationContext,
  convertToEvaluationContext,
  type HookEvaluationContext
} from './context-builder.js';

export {
  generateHookEventData,
  resolvePayloadTemplate
} from './payload-generator.js';

export {
  emitHookEvent
} from './event-emitter.js';