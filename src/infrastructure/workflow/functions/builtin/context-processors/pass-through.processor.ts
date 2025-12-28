import { PromptContext } from '../../../../../domain/workflow/value-objects/context';
import { ContextProcessor } from '../../../../../domain/workflow/services/context-processor-service.interface';

/**
 * 直接传递处理器
 *
 * 不做任何过滤，直接传递上下文
 */
export const passThroughProcessor: ContextProcessor = (
  context: PromptContext,
  config?: Record<string, unknown>
): PromptContext => {
  return context.clone();
};