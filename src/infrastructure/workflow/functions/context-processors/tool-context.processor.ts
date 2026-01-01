import { PromptContext } from '../../../../domain/workflow/value-objects/context';
import { ContextProcessor } from '../../services/context-processor-service';

/**
 * 工具上下文处理器
 *
 * 提取工具相关变量
 */
export const toolContextProcessor: ContextProcessor = (
  context: PromptContext,
  config?: Record<string, unknown>
): PromptContext => {
  // 提取工具相关变量
  const toolVariables = new Map<string, unknown>();
  for (const [key, value] of context.variables.entries()) {
    if (key.startsWith('tool.') || key.startsWith('function.')) {
      toolVariables.set(key, value);
    }
  }

  return PromptContext.create(
    context.template,
    toolVariables,
    context.history,
    context.metadata
  );
};