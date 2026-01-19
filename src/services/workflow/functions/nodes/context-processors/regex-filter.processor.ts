import { PromptState } from '@/domain/workflow/value-objects/context';
import { BaseContextProcessor } from './base-context-processor';

/**
 * 正则表达式过滤配置接口
 */
export interface RegexFilterConfig {
  /** 正则表达式字符串 */
  pattern: string;
  /** 正则表达式标志（如 'g', 'i', 'm' 等） */
  flags?: string;
  /** 匹配前保留的行数 */
  linesBefore?: number;
  /** 匹配后保留的行数 */
  linesAfter?: number;
  /** 是否在变量中搜索（默认为 true） */
  searchInVariables?: boolean;
  /** 是否在历史记录中搜索（默认为 true） */
  searchInHistory?: boolean;
}

/**
 * 正则表达式过滤上下文处理器
 *
 * 基于正则表达式提取局部上下文内容，支持配置：
 * - 正则表达式内容和标志
 * - 前后保留的行数
 * - 搜索范围（变量、历史记录）
 */
export class RegexFilterProcessor extends BaseContextProcessor {
  readonly name = 'regex_filter';
  readonly description = '基于正则表达式提取局部上下文内容，支持配置前后保留行数';
  override readonly version = '1.0.0';

  /**
    * 默认配置
    */
  private readonly defaultConfig: Required<RegexFilterConfig> = {
    pattern: '',
    flags: 'gim',
    linesBefore: 3,
    linesAfter: 3,
    searchInVariables: true,
    searchInHistory: true,
  };

  /**
     * 验证配置参数
     */
  override validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config['pattern'] || typeof config['pattern'] !== 'string') {
      errors.push('pattern 必须是非空字符串');
    }

    if (config['flags'] !== undefined && typeof config['flags'] !== 'string') {
      errors.push('flags 必须是字符串');
    }

    if (config['linesBefore'] !== undefined && typeof config['linesBefore'] !== 'number') {
      errors.push('linesBefore 必须是数字');
    }

    if (config['linesAfter'] !== undefined && typeof config['linesAfter'] !== 'number') {
      errors.push('linesAfter 必须是数字');
    }

    if (config['searchInVariables'] !== undefined && typeof config['searchInVariables'] !== 'boolean') {
      errors.push('searchInVariables 必须是布尔值');
    }

    if (config['searchInHistory'] !== undefined && typeof config['searchInHistory'] !== 'boolean') {
      errors.push('searchInHistory 必须是布尔值');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 执行上下文处理
   */
  process(
    promptState: PromptState,
    variables: Map<string, unknown>,
    config?: Record<string, unknown>
  ): { promptState: PromptState; variables: Map<string, unknown> } {
    const mergedConfig = this.mergeConfig(config);

    // 提取匹配内容
    const extractedContent = this.extractContent(promptState, variables, mergedConfig);

    // 创建新的PromptState，只包含提取的内容
    let newPromptState = PromptState.create();
    for (const entry of extractedContent.history) {
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
      variables: extractedContent.variables
    };
  }

  /**
   * 合并配置
   */
  private mergeConfig(config?: Record<string, unknown>): Required<RegexFilterConfig> {
    const merged = {
      ...this.defaultConfig,
      ...config,
    };

    // 确保 flags 总是字符串
    return {
      ...merged,
      flags: (merged['flags'] ?? this.defaultConfig.flags) as string,
    } as Required<RegexFilterConfig>;
  }

  /**
   * 提取匹配内容
   */
  private extractContent(
    promptState: PromptState,
    variables: Map<string, unknown>,
    config: Required<RegexFilterConfig>
  ): {
    variables: Map<string, unknown>;
    history: any[];
  } {
    const regex = new RegExp(config.pattern, config.flags);
    const result = {
      variables: new Map<string, unknown>(),
      history: [] as any[],
    };

    // 在变量中搜索
    if (config.searchInVariables) {
      for (const [key, value] of variables.entries()) {
        if (typeof value === 'string') {
          const extracted = this.extractWithContext(value, regex, config);
          if (extracted !== value) {
            result.variables.set(key, extracted);
          }
        } else {
          // 非字符串值直接保留
          result.variables.set(key, value);
        }
      }
    }

    // 在历史记录中搜索
    if (config.searchInHistory) {
      for (const entry of promptState.history) {
        const extractedEntry = this.extractFromHistoryEntry(entry, regex, config);
        if (extractedEntry) {
          result.history.push(extractedEntry);
        }
      }
    }

    return result;
  }

  /**
   * 从字符串中提取匹配内容及其上下文
   */
  private extractWithContext(
    text: string,
    regex: RegExp,
    config: Required<RegexFilterConfig>
  ): string {
    const lines = text.split('\n');
    const matchedLines = new Set<number>();

    // 查找所有匹配的行
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && regex.test(line)) {
        // 添加匹配行及其前后行
        const startLine = Math.max(0, i - config.linesBefore);
        const endLine = Math.min(lines.length - 1, i + config.linesAfter);
        for (let j = startLine; j <= endLine; j++) {
          matchedLines.add(j);
        }
      }
    }

    // 如果没有匹配，返回空字符串
    if (matchedLines.size === 0) {
      return '';
    }

    // 提取匹配的行
    const extractedLines = Array.from(matchedLines)
      .sort((a, b) => a - b)
      .map(lineIndex => lines[lineIndex]);

    return extractedLines.join('\n');
  }

  /**
   * 从历史记录条目中提取匹配内容
   */
  private extractFromHistoryEntry(
    entry: any,
    regex: RegExp,
    config: Required<RegexFilterConfig>
  ): any | null {
    // 检查消息内容
    if (entry.content && typeof entry.content === 'string') {
      const extracted = this.extractWithContext(entry.content, regex, config);
      if (extracted !== entry.content) {
        return {
          ...entry,
          content: extracted,
        };
      }
    }

    // 检查元数据中的字符串字段
    if (entry.metadata) {
      const filteredMetadata: Record<string, unknown> = {};
      let hasMatch = false;

      for (const [key, value] of Object.entries(entry.metadata)) {
        if (typeof value === 'string') {
          const extracted = this.extractWithContext(value, regex, config);
          if (extracted !== value) {
            filteredMetadata[key] = extracted;
            hasMatch = true;
          }
        } else {
          filteredMetadata[key] = value;
        }
      }

      if (hasMatch) {
        return {
          ...entry,
          metadata: filteredMetadata,
        };
      }
    }

    return null;
  }
}

/**
 * 正则表达式过滤处理器实例
 */
export const regexFilterProcessor = new RegexFilterProcessor().toProcessor();