/**
 * Hook工具模块
 * 提供Hook执行所需的辅助函数
 */

export {
  buildHookEvaluationContext,
  convertToEvaluationContext,
  type HookEvaluationContext
} from './context-builder';

export {
  generateHookEventData,
  resolvePayloadTemplate,
  resolveTemplateVariable,
  getVariableValue
} from './payload-generator';

export {
  emitHookEvent
} from './event-emitter';