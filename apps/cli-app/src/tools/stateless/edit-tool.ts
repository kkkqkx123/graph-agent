/**
 * 文件编辑工具
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { ToolDefinition, ToolResult, ToolRegistryConfig } from '../types.js';
import { resolvePath } from '../utils.js';

/**
 * 创建文件编辑工具
 */
export function createEditTool(config: ToolRegistryConfig): ToolDefinition {
  return {
    id: 'edit_file',
    name: 'edit_file',
    type: 'STATELESS',
    description: `Perform exact string replacement in a file. The old_str must match exactly and appear uniquely in the file, otherwise the operation will fail. You must read the file first before editing. Preserve exact indentation from the source.`,
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute or relative path to the file'
        },
        old_str: {
          type: 'string',
          description: 'Exact string to find and replace (must be unique in file)'
        },
        new_str: {
          type: 'string',
          description: 'Replacement string (use for refactoring, renaming, etc.)'
        }
      },
      required: ['path', 'old_str', 'new_str']
    },
    execute: async (params: Record<string, any>): Promise<ToolResult> => {
      try {
        const { path, old_str, new_str } = params;
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

        // 检查是否存在要替换的字符串
        if (!content.includes(old_str)) {
          return {
            success: false,
            content: '',
            error: `Text not found in file: ${old_str}`
          };
        }

        // 检查是否唯一
        const occurrences = content.split(old_str).length - 1;
        if (occurrences > 1) {
          return {
            success: false,
            content: '',
            error: `Found ${occurrences} occurrences of old_str. The string must be unique in the file.`
          };
        }

        // 执行替换
        const newContent = content.replace(old_str, new_str);
        await writeFile(filePath, newContent, 'utf-8');

        return {
          success: true,
          content: `Successfully edited ${filePath}`
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
