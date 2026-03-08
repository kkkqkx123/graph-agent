/**
 * 工具辅助函数
 */

import { createHash } from 'crypto';

/**
 * 生成工具ID
 */
export function generateToolId(name: string): string {
  const hash = createHash('md5').update(name).digest('hex').slice(0, 8);
  return `${name}_${hash}`;
}

/**
 * 截断文本（按字符数）
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
 */
export function formatLineNumbers(lines: string[], startLine: number = 1): string {
  return lines
    .map((line, index) => `${(startLine + index).toString().padStart(6, ' ')}|${line}`)
    .join('\n');
}

/**
 * 解析路径（支持相对路径）
 */
export function resolvePath(path: string, workspaceDir: string): string {
  if (path.startsWith('/') || path.match(/^[A-Za-z]:\\/)) {
    return path;
  }
  return `${workspaceDir}/${path}`.replace(/\\/g, '/');
}
