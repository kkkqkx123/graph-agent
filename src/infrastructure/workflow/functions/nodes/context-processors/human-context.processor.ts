import { PromptContext } from '../../../../../domain/workflow/value-objects/context/prompt-context';
import { SingletonContextProcessor } from './singleton-context-processor';

/**
 * 人工交互上下文处理器（静态函数）
 *
 * 保留用户交互相关数据
 * 逻辑完全固定，无需配置
 */
export class HumanContextProcessor extends SingletonContextProcessor {
  override readonly name = 'human_context';
  override readonly description = '保留用户交互相关数据';
  override readonly version = '1.0.0';

  process(context: PromptContext, config?: Record<string, unknown>): PromptContext {
    // 保留用户交互相关变量
    const humanVariables = new Map<string, unknown>();
    for (const [key, value] of context.variables.entries()) {
      if (key.startsWith('user.') || key.startsWith('human.') || key.startsWith('input.')) {
        humanVariables.set(key, value);
      }
    }

    // 保留人工交互相关历史
    const humanHistory = context.history.filter(entry => entry.metadata?.['humanInteraction']);

    return PromptContext.create(context.template, humanVariables, humanHistory, context.metadata);
  }
}

/**
 * 人工交互上下文处理器实例
 */
export const humanContextProcessor = new HumanContextProcessor().toProcessor();
