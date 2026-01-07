import { PromptContext } from '../../../../domain/workflow/value-objects/context/prompt-context';
import { BaseContextProcessor } from './base-context-processor';

/**
 * 系统上下文处理器
 *
 * 保留系统级变量和元数据
 */
export class SystemContextProcessor extends BaseContextProcessor {
  override readonly name = 'system_context';
  override readonly description = '保留系统级变量和元数据';
  override readonly version = '1.0.0';

  process(context: PromptContext, config?: Record<string, unknown>): PromptContext {
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
  }
}

/**
 * 系统上下文处理器实例
 */
export const systemContextProcessor = new SystemContextProcessor().toProcessor();
