/**
 * 文件读取工具
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { ToolDefinition, ToolResult, ToolRegistryConfig } from '../types.js';
import { formatLineNumbers, truncateText, resolvePath } from '../utils.js';

/**
 * 创建文件读取工具
 */
export function createReadTool(config: ToolRegistryConfig): ToolDefinition {
  return {
    id: 'read_file',
    name: 'read_file',
    type: 'STATELESS',
    description: `Read file contents from the filesystem. Output always includes line numbers in format 'LINE_NUMBER|LINE_CONTENT' (1-indexed). Supports reading partial content by specifying line offset and limit for large files. You can call this tool multiple times in parallel to read different files simultaneously.`,
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file'
        },
        offset: {
          type: 'integer',
          description: 'Starting line number (1-indexed). Use for large files to read from specific line'
        },
        limit: {
          type: 'integer',
          description: 'Number of lines to read. Use with offset for large files to read in chunks'
        }
      },
      required: ['path']
    },
    execute: async (params: Record<string, any>): Promise<ToolResult> => {
      try {
        const { path, offset, limit } = params;
        const filePath = resolvePath(path, config.workspaceDir!);

        if (!existsSync(filePath)) {
          return {
            success: false,
            content: '',
            error: `File not found: ${path}`
          };
        }

        // 读取文件内容
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        // 应用偏移和限制
        const start = offset ? Math.max(0, offset - 1) : 0;
        const end = limit ? Math.min(lines.length, start + limit) : lines.length;
        const selectedLines = lines.slice(start, end);

        // 格式化带行号
        const numberedContent = formatLineNumbers(selectedLines, start + 1);

        // 应用截断
        const truncatedContent = truncateText(numberedContent, 500000);

        return {
          success: true,
          content: truncatedContent
        };
      } catch (error) {
        return {
          success: false,
          content: '',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  };
}
