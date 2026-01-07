import { PromptContext } from '../../../../domain/workflow/value-objects/context/prompt-context';
import { BaseContextProcessor } from './base-context-processor';

/**
 * 工具上下文处理器
 *
 * 提取工具相关变量
 */
export class ToolContextProcessor extends BaseContextProcessor {
  override readonly name = 'tool_context';
  override readonly description = '提取工具相关变量';
  override readonly version = '1.0.0';

  process(context: PromptContext, config?: Record<string, unknown>): PromptContext {
    // 提取工具相关变量
    const toolVariables = new Map<string, unknown>();
    for (const [key, value] of context.variables.entries()) {
      if (key.startsWith('tool.') || key.startsWith('function.')) {
        toolVariables.set(key, value);
      }
    }

    return PromptContext.create(context.template, toolVariables, context.history, context.metadata);
  }
}

/**
 * 工具上下文处理器实例
 */
export const toolContextProcessor = new ToolContextProcessor().toProcessor();
