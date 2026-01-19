import { PromptState } from '@/domain/workflow/value-objects/context';
import { SingletonContextProcessor } from './singleton-context-processor';

/**
 * LLM上下文处理器（静态函数）
 *
 * 过滤掉工具调用历史，只保留LLM相关变量
 * 逻辑完全固定，无需配置
 */
export class LlmContextProcessor extends SingletonContextProcessor {
  readonly name = 'llm_context';
  readonly description = '过滤掉工具调用历史，只保留LLM相关变量';
  override readonly version = '1.0.0';

  process(
    promptState: PromptState,
    variables: Map<string, unknown>,
    config?: Record<string, unknown>
  ): { promptState: PromptState; variables: Map<string, unknown> } {
    // 过滤掉工具调用历史
    const filteredHistory = promptState.history.filter((entry: any) => !entry.metadata?.['toolCall']);

    // 只保留LLM相关变量
    const filteredVariables = new Map<string, unknown>();
    for (const [key, value] of variables.entries()) {
      if (key.startsWith('llm.') || key.startsWith('prompt.') || key.startsWith('model.')) {
        filteredVariables.set(key, value);
      }
    }

    // 创建新的PromptState
    let newPromptState = PromptState.create();
    for (const entry of filteredHistory) {
      newPromptState = newPromptState.addMessage(
        entry.role,
        entry.content,
        entry.toolCalls,
        entry.toolCallId,
        entry.metadata
      );
    }

    return {
      promptState: newPromptState,
      variables: filteredVariables
    };
  }
}

/**
 * LLM上下文处理器实例
 */
export const llmContextProcessor = new LlmContextProcessor().toProcessor();
