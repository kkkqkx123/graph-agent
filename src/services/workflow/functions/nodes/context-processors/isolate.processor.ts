import { PromptContext } from '@/domain/workflow/value-objects/context/prompt-context';
import { BaseContextProcessor } from './base-context-processor';

/**
 * 隔离上下文处理器
 *
 * 只保留模板，清空其他所有内容
 */
export class IsolateProcessor extends BaseContextProcessor {
  readonly name = 'isolate';
  readonly description = '只保留模板，清空其他所有内容';
  override readonly version = '1.0.0';

  process(context: PromptContext, config?: Record<string, unknown>): PromptContext {
    return PromptContext.create(context.template, new Map(), [], {});
  }
}

/**
 * 隔离上下文处理器实例
 */
export const isolateProcessor = new IsolateProcessor().toProcessor();
