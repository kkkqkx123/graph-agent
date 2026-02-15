/**
 * 工具结果处理器
 * 提供灵活的工具结果处理能力
 */

import type { ToolExecutionResult } from '@modular-agent/types';

/**
 * 工具结果处理器类
 * 
 * 职责：
 * - 处理工具执行结果
 * - 格式化工具结果
 * - 支持多种结果类型
 */
export class ToolResultProcessor {
  /**
   * 处理工具执行结果
   * @param result 工具执行结果
   * @returns 处理后的结果字符串
   */
  static processResult(result: ToolExecutionResult): string {
    if (!result.success) {
      return JSON.stringify({ error: result.error });
    }

    // 根据结果类型进行不同的处理
    if (typeof result.result === 'string') {
      return result.result;
    }

    if (result.result instanceof Buffer) {
      // 处理二进制数据
      return `[Binary data: ${result.result.length} bytes]`;
    }

    if (result.result instanceof ReadableStream) {
      // 处理流式数据
      return `[Stream data]`;
    }

    // 默认JSON序列化
    return JSON.stringify(result.result);
  }

  /**
   * 格式化工具结果用于显示
   * @param result 工具执行结果
   * @returns 格式化后的显示字符串
   */
  static formatForDisplay(result: ToolExecutionResult): string {
    if (!result.success) {
      return `❌ Error: ${result.error}`;
    }

    const content = this.processResult(result);
    const truncated = content.length > 300
      ? content.substring(0, 300) + '...'
      : content;

    return `✓ Result: ${truncated}`;
  }

  /**
   * 处理二进制数据
   * @param data 二进制数据
   * @returns 处理后的字符串
   */
  private static processBinaryData(data: Buffer): string {
    return `[Binary data: ${data.length} bytes]`;
  }

  /**
   * 处理流式数据
   * @param stream 流式数据
   * @returns 处理后的字符串
   */
  private static processStreamData(stream: ReadableStream): string {
    return `[Stream data]`;
  }
}