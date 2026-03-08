/**
 * 工具辅助函数
 * 仅包含 app 层特有的辅助函数
 */

// 从 common-utils 导入通用工具函数
export { generateToolId, truncateText, formatLineNumbers } from '@modular-agent/common-utils';

/**
 * 解析路径（支持相对路径）
 * app 层特有的文件路径解析逻辑
 */
export function resolvePath(path: string, workspaceDir: string): string {
  if (path.startsWith('/') || path.match(/^[A-Za-z]:\\/)) {
    return path;
  }
  return `${workspaceDir}/${path}`.replace(/\\/g, '/');
}
