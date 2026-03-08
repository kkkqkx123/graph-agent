/**
 * 工具相关通用辅助函数
 */

import { createHash } from 'crypto';

/**
 * 生成工具ID
 * @param name 工具名称
 * @returns 格式为 `${name}_${hash8}` 的唯一ID
 */
export function generateToolId(name: string): string {
  const hash = createHash('md5').update(name).digest('hex').slice(0, 8);
  return `${name}_${hash}`;
}

/**
 * 截断文本（保留首尾）
 * @param text 原始文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const halfLength = Math.floor(maxLength / 2) - 50;
  const head = text.slice(0, halfLength);
  const tail = text.slice(-halfLength);

  return `${head}\n\n... [Content truncated: ${text.length} chars -> ${maxLength} limit] ...\n\n${tail}`;
}

/**
 * 格式化行号
 * @param lines 文本行数组
 * @param startLine 起始行号（默认1）
 * @returns 带行号的格式化文本
 */
export function formatLineNumbers(lines: string[], startLine: number = 1): string {
  return lines
    .map((line, index) => `${(startLine + index).toString().padStart(6, ' ')}|${line}`)
    .join('\n');
}
