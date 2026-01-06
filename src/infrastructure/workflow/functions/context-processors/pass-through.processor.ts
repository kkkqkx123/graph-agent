import { PromptContext } from '../../../../domain/workflow/value-objects/context';
import { ContextProcessor } from '../../services/context-processor-service';

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
