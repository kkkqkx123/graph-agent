import { PromptContext } from '../../../../../domain/workflow/value-objects/context';
import { ContextProcessor } from '../../../../../domain/workflow/services/context-processor-service.interface';

/**
 * 隔离上下文处理器
 *
 * 只保留模板，清空其他所有内容
 */
export const isolateProcessor: ContextProcessor = (
  context: PromptContext,
  config?: Record<string, unknown>
): PromptContext => {
  return PromptContext.create(context.template, new Map(), [], {});
};