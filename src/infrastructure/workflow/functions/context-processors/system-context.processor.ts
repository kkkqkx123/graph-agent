import { PromptContext } from '../../../../domain/workflow/value-objects/context';
import { ContextProcessor } from '../../services/context-processor-service';

/**
 * 系统上下文处理器
 *
 * 保留系统级变量和元数据
 */
export const systemContextProcessor: ContextProcessor = (
  context: PromptContext,
  config?: Record<string, unknown>
): PromptContext => {
  // 保留系统级变量
  const systemVariables = new Map<string, unknown>();
  for (const [key, value] of context.variables.entries()) {
    if (key.startsWith('system.') || key.startsWith('config.') || key.startsWith('env.')) {
      systemVariables.set(key, value);
    }
  }

  // 保留系统元数据
  const systemMetadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context.metadata)) {
    if (key.startsWith('system.') || key.startsWith('config.')) {
      systemMetadata[key] = value;
    }
  }

  return PromptContext.create(context.template, systemVariables, [], systemMetadata);
};
