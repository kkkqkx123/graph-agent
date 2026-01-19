import { PromptState } from '@/domain/workflow/value-objects/context';
import { BaseContextProcessor } from './base-context-processor';

/**
 * 直接传递处理器
 *
 * 不做任何过滤，直接传递上下文
 */
export class PassThroughProcessor extends BaseContextProcessor {
  readonly name = 'pass_through';
  readonly description = '不做任何过滤，直接传递上下文';
  override readonly version = '1.0.0';

  process(
    promptState: PromptState,
    variables: Map<string, unknown>,
    config?: Record<string, unknown>
  ): { promptState: PromptState; variables: Map<string, unknown> } {
    return {
      promptState: PromptState.fromProps(promptState),
      variables: new Map(variables)
    };
  }
}

/**
 * 直接传递处理器实例
 */
export const passThroughProcessor = new PassThroughProcessor().toProcessor();
