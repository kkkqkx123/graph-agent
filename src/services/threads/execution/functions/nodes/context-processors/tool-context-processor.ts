import { PromptState } from '@/domain/workflow/value-objects/context';
import { SingletonContextProcessor } from './singleton-context-processor';

/**
 * 工具上下文处理器（静态函数）
 *
 * 提取工具相关变量
 * 逻辑完全固定，无需配置
 */
export class ToolContextProcessor extends SingletonContextProcessor {
  readonly name = 'tool_context';
  readonly description = '提取工具相关变量';
  override readonly version = '1.0.0';

  process(
    promptState: PromptState,
    variables: Map<string, unknown>,
    config?: Record<string, unknown>
  ): { promptState: PromptState; variables: Map<string, unknown> } {
    // 提取工具相关变量
    const toolVariables = new Map<string, unknown>();
    for (const [key, value] of variables.entries()) {
      if (key.startsWith('tool.') || key.startsWith('function.')) {
        toolVariables.set(key, value);
      }
    }

    return {
      promptState: PromptState.fromProps(promptState),
      variables: toolVariables
    };
  }
}

/**
 * 工具上下文处理器实例
 */
export const toolContextProcessor = new ToolContextProcessor().toProcessor();
