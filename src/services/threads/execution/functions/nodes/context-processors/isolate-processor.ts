import { PromptState } from '@/domain/workflow/value-objects/context';
import { BaseContextProcessor } from './base-context-processor';

/**
 * 隔离上下文处理器
 *
 * 清空所有内容
 */
export class IsolateProcessor extends BaseContextProcessor {
  readonly name = 'isolate';
  readonly description = '清空所有内容';
  override readonly version = '1.0.0';

  process(
    promptState: PromptState,
    variables: Map<string, unknown>,
    config?: Record<string, unknown>
  ): { promptState: PromptState; variables: Map<string, unknown> } {
    return {
      promptState: PromptState.create(),
      variables: new Map()
    };
  }
}

/**
 * 隔离上下文处理器实例
 */
export const isolateProcessor = new IsolateProcessor().toProcessor();
