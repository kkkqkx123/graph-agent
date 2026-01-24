import { PromptState } from '@/domain/workflow/value-objects/context';
import { SingletonContextProcessor } from './singleton-context-processor';

/**
 * 人工交互上下文处理器（静态函数）
 *
 * 保留用户交互相关数据
 * 逻辑完全固定，无需配置
 */
export class HumanContextProcessor extends SingletonContextProcessor {
  readonly name = 'human_context';
  readonly description = '保留用户交互相关数据';
  override readonly version = '1.0.0';

  process(
    promptState: PromptState,
    variables: Map<string, unknown>,
    config?: Record<string, unknown>
  ): { promptState: PromptState; variables: Map<string, unknown> } {
    // 保留用户交互相关变量
    const humanVariables = new Map<string, unknown>();
    for (const [key, value] of variables.entries()) {
      if (key.startsWith('user.') || key.startsWith('human.') || key.startsWith('input.')) {
        humanVariables.set(key, value);
      }
    }

    // 保留人工交互相关历史
    const humanHistory = promptState.history.filter((entry: any) => entry.metadata?.['humanInteraction']);

    // 创建新的PromptState
    let newPromptState = PromptState.create();
    for (const entry of humanHistory) {
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
      variables: humanVariables
    };
  }
}

/**
 * 人工交互上下文处理器实例
 */
export const humanContextProcessor = new HumanContextProcessor().toProcessor();
