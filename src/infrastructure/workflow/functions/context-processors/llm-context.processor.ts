import { PromptContext } from '../../../../domain/workflow/value-objects/context/prompt-context';
import { BaseContextProcessor } from './base-context-processor';

/**
 * LLM上下文处理器
 *
 * 过滤掉工具调用历史，只保留LLM相关变量
 */
export class LlmContextProcessor extends BaseContextProcessor {
  override readonly name = 'llm_context';
  override readonly description = '过滤掉工具调用历史，只保留LLM相关变量';
  override readonly version = '1.0.0';

  process(context: PromptContext, config?: Record<string, unknown>): PromptContext {
    // 过滤掉工具调用历史
    const filteredHistory = context.history.filter(entry => !entry.metadata?.['toolCall']);

    // 只保留LLM相关变量
    const filteredVariables = new Map<string, unknown>();
    for (const [key, value] of context.variables.entries()) {
      if (key.startsWith('llm.') || key.startsWith('prompt.') || key.startsWith('model.')) {
        filteredVariables.set(key, value);
      }
    }

    return PromptContext.create(
      context.template,
      filteredVariables,
      filteredHistory,
      context.metadata
    );
  }
}

/**
 * LLM上下文处理器实例
 */
export const llmContextProcessor = new LlmContextProcessor().toProcessor();
