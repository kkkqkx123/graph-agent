import { PromptContext } from '../../../../domain/workflow/value-objects/context';
import { ContextProcessor } from '../../services/context-processor-service';

/**
 * 人工交互上下文处理器
 *
 * 保留用户交互相关数据
 */
export const humanContextProcessor: ContextProcessor = (
  context: PromptContext,
  config?: Record<string, unknown>
): PromptContext => {
  // 保留用户交互相关变量
  const humanVariables = new Map<string, unknown>();
  for (const [key, value] of context.variables.entries()) {
    if (
      key.startsWith('user.') ||
      key.startsWith('human.') ||
      key.startsWith('input.')
    ) {
      humanVariables.set(key, value);
    }
  }

  // 保留人工交互相关历史
  const humanHistory = context.history.filter(
    entry => entry.metadata?.['humanInteraction']
  );

  return PromptContext.create(
    context.template,
    humanVariables,
    humanHistory,
    context.metadata
  );
};