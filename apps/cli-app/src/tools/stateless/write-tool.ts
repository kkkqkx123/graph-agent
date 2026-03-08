/**
 * 文件写入工具
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { ToolDefinition, ToolResult, ToolRegistryConfig } from '../types.js';
import { resolvePath } from '../utils.js';

/**
 * 创建文件写入工具
 */
export function createWriteTool(config: ToolRegistryConfig): ToolDefinition {
  return {
    id: 'write_file',
    name: 'write_file',
    type: 'STATELESS',
    description: `Write content to a file. Will overwrite existing files completely. For existing files, you should read the file first using read_file. Prefer editing existing files over creating new ones unless explicitly needed.`,
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file'
        },
        content: {
          type: 'string',
          description: 'Complete content to write (will replace existing content)'
        }
      },
      required: ['path', 'content']
    },
    execute: async (params: Record<string, any>): Promise<ToolResult> => {
      try {
        const { path, content } = params;
        const filePath = resolvePath(path, config.workspaceDir!);

        // 创建父目录
        const dir = dirname(filePath);
        await mkdir(dir, { recursive: true });

        // 写入文件
        await writeFile(filePath, content, 'utf-8');

        return {
          success: true,
          content: `Successfully wrote to ${filePath}`
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
